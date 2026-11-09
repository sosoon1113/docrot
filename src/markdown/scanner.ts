/**
 * A small, line-oriented Markdown scanner.
 *
 * It extracts only what docrot needs (headings, links, images, reference
 * definitions and HTML anchors) together with their positions. Fenced code
 * blocks and YAML front matter are skipped. It is deliberately not a full
 * CommonMark parser.
 */

import { Slugger } from "./slug.js";

export interface Heading {
  /** Heading text with inline Markdown removed. */
  text: string;
  /** The anchor GitHub generates for this heading, e.g. `getting-started`. */
  slug: string;
  level: number;
  line: number;
}

/**
 * A link or image. Reference definitions (`[label]: target`) are reported as
 * links at the definition, so each target is checked once however often it's
 * used.
 */
export interface Link {
  /** Link text, the alt text of an image, or the label of a definition. */
  text: string;
  /** Destination as written, e.g. `docs/setup.md#install`. */
  target: string;
  image: boolean;
  line: number;
  column: number;
  /** Set for reference definitions: the normalized label. */
  definition?: string;
}

/** A use of a reference-style link: `[text][label]` or `[label][]`. */
export interface Reference {
  /** Normalized label (trimmed, lowercase, single spaces). */
  label: string;
  image: boolean;
  line: number;
  column: number;
}

/** Inline code such as `src/index.ts`. */
export interface CodeSpan {
  /** Contents without the backticks. */
  text: string;
  line: number;
  /** Column of the opening backtick. */
  column: number;
}

export interface MarkdownDocument {
  headings: Heading[];
  links: Link[];
  references: Reference[];
  /** Normalized labels of every `[label]: target` definition. */
  definitions: Set<string>;
  codeSpans: CodeSpan[];
  /** Ids declared in HTML, e.g. `<a name="faq">` or `<h2 id="faq">`. */
  anchors: string[];
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const NOT_PARAGRAPH = /^ {0,3}(?:[-*+][ \t]|\d+[.)][ \t]|>|\||<|#)/;
const HTML_ID = /<[a-z][^>]*?\s(?:id|name)\s*=\s*["']([^"']+)["']/gi;
const DEFINITION =
  /^( {0,3})\[([^\]^][^\]]*)\]:[ \t]*(<[^>]*>|\S+)(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/;

export function scanMarkdown(source: string): MarkdownDocument {
  const lines = source.split(/\r?\n/);
  const doc: MarkdownDocument = {
    headings: [],
    links: [],
    references: [],
    definitions: new Set(),
    codeSpans: [],
    anchors: [],
  };
  const slugger = new Slugger();
  const addHeading = (text: string, level: number, line: number) => {
    doc.headings.push({ text, slug: slugger.slug(text), level, line });
  };

  let fence: { char: string; length: number } | null = null;
  let inComment = false; // inside a multi-line <!-- HTML comment -->
  let previous: string | null = null; // last paragraph line, for setext headings

  for (let index = frontMatterEnd(lines); index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const lineNumber = index + 1;

    if (fence) {
      const close = FENCE_CLOSE.exec(raw)?.[1];
      if (close && close[0] === fence.char && close.length >= fence.length) {
        fence = null;
      }
      continue;
    }

    const open = inComment ? undefined : FENCE_OPEN.exec(raw)?.[1];
    if (open) {
      fence = { char: open[0] ?? "`", length: open.length };
      previous = null;
      continue;
    }

    // Blank out comments (keeping columns) so commented-out links and headings are ignored.
    const masked = maskComments(raw, inComment);
    inComment = masked.inComment;
    const line = masked.text;

    if (line.trim() === "") {
      previous = null;
      continue;
    }

    const atx = ATX_HEADING.exec(line);
    if (atx) {
      addHeading(stripInlineMarkdown(atx[2] ?? ""), atx[1]?.length ?? 1, lineNumber);
      collectInline(line, lineNumber, doc);
      previous = null;
      continue;
    }

    const underline = SETEXT_UNDERLINE.exec(line)?.[1];
    if (underline && previous !== null) {
      addHeading(stripInlineMarkdown(previous), underline.startsWith("=") ? 1 : 2, lineNumber - 1);
      previous = null;
      continue;
    }

    const definition = DEFINITION.exec(line);
    if (definition) {
      const [, indent = "", label = "", rawTarget = ""] = definition;
      const normalized = normalizeLabel(label);
      if (!doc.definitions.has(normalized)) {
        // The first definition of a label wins, as in CommonMark.
        doc.definitions.add(normalized);
        doc.links.push({
          text: label,
          target: rawTarget.replace(/^<(.*)>$/, "$1"),
          image: false,
          line: lineNumber,
          column: indent.length + 1,
          definition: normalized,
        });
      }
      previous = null;
      continue;
    }

    collectInline(line, lineNumber, doc);
    previous = NOT_PARAGRAPH.test(line) ? null : line;
  }

  // A definition used by an image is checked as an image.
  const imageLabels = new Set(doc.references.filter((r) => r.image).map((r) => r.label));
  for (const link of doc.links) {
    if (link.definition !== undefined && imageLabels.has(link.definition)) link.image = true;
  }

  return doc;
}

/** Normalize a reference label the way CommonMark matches them. */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Remove inline Markdown and HTML so only the visible heading text is left. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(`+)(.*?)\1/g, "$2")
    .replace(/(\*\*|__|\*|~~)(?=\S)(.+?)(?<=\S)\1/g, "$2")
    .replace(/(^|\W)_(?=\S)(.+?)(?<=\S)_(?=\W|$)/g, "$1$2")
    .trim();
}

function frontMatterEnd(lines: string[]): number {
  if (lines[0]?.trim() !== "---") return 0;
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index]?.trim();
    if (line === "---" || line === "...") return index + 1;
  }
  return 0; // unterminated: treat the whole file as Markdown
}

/**
 * Replace the parts of `line` inside `<!-- -->` comments with spaces.
 * `inComment` says whether the line starts inside a comment opened earlier.
 * Comment markers inside code spans don't count.
 */
function maskComments(line: string, inComment: boolean): { text: string; inComment: boolean } {
  if (!inComment && !line.includes("<!--")) return { text: line, inComment };

  const spans = codeSpans(line);
  const inCode = (index: number) => spans.some((s) => index >= s.start && index < s.end);
  let text = "";
  let position = 0;
  let open = inComment;

  while (position < line.length) {
    if (open) {
      const end = line.indexOf("-->", position);
      const stop = end === -1 ? line.length : end + 3;
      text += " ".repeat(stop - position);
      position = stop;
      open = end === -1;
      if (open) break;
    } else {
      let start = line.indexOf("<!--", position);
      while (start !== -1 && inCode(start)) start = line.indexOf("<!--", start + 4);
      if (start === -1) {
        text += line.slice(position);
        break;
      }
      text += line.slice(position, start);
      position = start;
      open = true;
    }
  }
  return { text, inComment: open };
}

function collectInline(line: string, lineNumber: number, doc: MarkdownDocument): void {
  // Links and anchors are looked for in a copy with code spans blanked out,
  // so `[text](path.md)` written as an example is not treated as a link.
  let scanned = line;
  for (const span of codeSpans(line)) {
    doc.codeSpans.push({ text: span.text, line: lineNumber, column: span.start + 1 });
    scanned =
      scanned.slice(0, span.start) + " ".repeat(span.end - span.start) + scanned.slice(span.end);
  }
  for (const match of scanned.matchAll(HTML_ID)) {
    if (match[1]) doc.anchors.push(match[1]);
  }
  collectLinks(line, scanned, lineNumber, doc);
}

/** Find links in `scanned` (code masked) and take their text from the original `line`. */
function collectLinks(
  line: string,
  scanned: string,
  lineNumber: number,
  doc: MarkdownDocument,
): void {
  let position = 0;
  while (position < scanned.length) {
    const open = scanned.indexOf("[", position);
    if (open === -1) break;
    position = open + 1; // keep scanning inside the text so nested images are found

    if (isEscaped(scanned, open)) continue;
    const close = matchingBracket(scanned, open);
    if (close === -1) continue;

    const image = open > 0 && scanned[open - 1] === "!" && !isEscaped(scanned, open - 1);
    const text = line.slice(open + 1, close);
    const column = image ? open : open + 1;

    if (scanned[close + 1] === "(") {
      const destination = parseDestination(scanned, close + 2);
      if (destination) {
        doc.links.push({ text, target: destination.target, image, line: lineNumber, column });
      }
      continue;
    }

    if (scanned[close + 1] === "[") {
      // `[text][label]` or collapsed `[label][]`. Skip `matrix[i][j]`-style prose.
      const labelEnd = scanned.indexOf("]", close + 2);
      const before = scanned[image ? open - 2 : open - 1] ?? "";
      if (labelEnd === -1 || /\w/.test(before)) continue;
      const label = normalizeLabel(line.slice(close + 2, labelEnd) || text);
      if (label) doc.references.push({ label, image, line: lineNumber, column });
    }
  }
}

/**
 * Code spans on one line. As in CommonMark, a span opens with a run of
 * backticks and closes with a run of the same length; one surrounding space
 * is stripped when the content has a space on both sides.
 */
function codeSpans(line: string): { start: number; end: number; text: string }[] {
  const spans: { start: number; end: number; text: string }[] = [];
  let position = 0;
  while (position < line.length) {
    const start = line.indexOf("`", position);
    if (start === -1) break;
    let ticks = 1;
    while (line[start + ticks] === "`") ticks++;
    if (isEscaped(line, start)) {
      position = start + ticks;
      continue;
    }

    let close = -1;
    for (let i = line.indexOf("`", start + ticks); i !== -1; i = line.indexOf("`", i)) {
      let run = 1;
      while (line[i + run] === "`") run++;
      if (run === ticks) {
        close = i;
        break;
      }
      i += run;
    }
    if (close === -1) {
      position = start + ticks; // unmatched backticks are literal text
      continue;
    }

    let text = line.slice(start + ticks, close);
    if (text.length > 2 && text.startsWith(" ") && text.endsWith(" ") && text.trim() !== "") {
      text = text.slice(1, -1);
    }
    spans.push({ start, end: close + ticks, text });
    position = close + ticks;
  }
  return spans;
}

function isEscaped(line: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && line[i] === "\\"; i--) backslashes++;
  return backslashes % 2 === 1;
}

function matchingBracket(line: string, open: number): number {
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    const char = line[i];
    if ((char === "[" || char === "]") && isEscaped(line, i)) continue;
    if (char === "[") depth++;
    if (char === "]" && --depth === 0) return i;
  }
  return -1;
}

/**
 * Parse a link destination starting right after `(`.
 * Returns the target and the index just past the closing `)`.
 */
function parseDestination(line: string, start: number): { target: string; end: number } | null {
  let i = skipSpaces(line, start);
  let target: string;

  if (line[i] === "<") {
    const close = line.indexOf(">", i + 1);
    if (close === -1) return null;
    target = line.slice(i + 1, close);
    i = close + 1;
  } else {
    let depth = 0;
    const from = i;
    for (; i < line.length; i++) {
      const char = line[i];
      if (char === " " || char === "\t") break;
      if (char === "(" && !isEscaped(line, i)) depth++;
      if (char === ")" && !isEscaped(line, i)) {
        if (depth === 0) break;
        depth--;
      }
    }
    target = line.slice(from, i);
  }

  i = skipSpaces(line, i);
  const quote = line[i];
  if (quote === '"' || quote === "'" || quote === "(") {
    const closing = quote === "(" ? ")" : quote;
    const end = line.indexOf(closing, i + 1);
    if (end === -1) return null;
    i = skipSpaces(line, end + 1);
  }

  return line[i] === ")" ? { target, end: i + 1 } : null;
}

function skipSpaces(line: string, index: number): number {
  let i = index;
  while (line[i] === " " || line[i] === "\t") i++;
  return i;
}
