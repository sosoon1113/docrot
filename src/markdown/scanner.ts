/**
 * A small, line-oriented Markdown scanner.
 *
 * It extracts only what docrot needs (headings, links, images and HTML
 * anchors) together with their positions. Fenced code blocks and YAML front
 * matter are skipped. It is deliberately not a full CommonMark parser.
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

export interface Link {
  /** Link text, or the alt text of an image. */
  text: string;
  /** Destination as written, e.g. `docs/setup.md#install`. */
  target: string;
  image: boolean;
  line: number;
  column: number;
}

export interface MarkdownDocument {
  headings: Heading[];
  links: Link[];
  /** Ids declared in HTML, e.g. `<a name="faq">` or `<h2 id="faq">`. */
  anchors: string[];
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const NOT_PARAGRAPH = /^ {0,3}(?:[-*+][ \t]|\d+[.)][ \t]|>|\||<|#)/;
const HTML_ID = /<[a-z][^>]*?\s(?:id|name)\s*=\s*["']([^"']+)["']/gi;

export function scanMarkdown(source: string): MarkdownDocument {
  const lines = source.split(/\r?\n/);
  const doc: MarkdownDocument = { headings: [], links: [], anchors: [] };
  const slugger = new Slugger();
  const addHeading = (text: string, level: number, line: number) => {
    doc.headings.push({ text, slug: slugger.slug(text), level, line });
  };

  let fence: { char: string; length: number } | null = null;
  let previous: string | null = null; // last paragraph line, for setext headings

  for (let index = frontMatterEnd(lines); index < lines.length; index++) {
    const line = lines[index] ?? "";
    const lineNumber = index + 1;

    if (fence) {
      const close = FENCE_CLOSE.exec(line)?.[1];
      if (close && close[0] === fence.char && close.length >= fence.length) {
        fence = null;
      }
      continue;
    }

    const open = FENCE_OPEN.exec(line)?.[1];
    if (open) {
      fence = { char: open[0] ?? "`", length: open.length };
      previous = null;
      continue;
    }

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

    collectInline(line, lineNumber, doc);
    previous = NOT_PARAGRAPH.test(line) ? null : line;
  }

  return doc;
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

function collectInline(line: string, lineNumber: number, doc: MarkdownDocument): void {
  for (const match of line.matchAll(HTML_ID)) {
    if (match[1]) doc.anchors.push(match[1]);
  }

  let position = 0;
  while (position < line.length) {
    const open = line.indexOf("[", position);
    if (open === -1) break;
    position = open + 1; // keep scanning inside the text so nested images are found

    if (isEscaped(line, open)) continue;
    const close = matchingBracket(line, open);
    if (close === -1 || line[close + 1] !== "(") continue;

    const destination = parseDestination(line, close + 2);
    if (!destination) continue;

    const image = open > 0 && line[open - 1] === "!" && !isEscaped(line, open - 1);
    doc.links.push({
      text: line.slice(open + 1, close),
      target: destination.target,
      image,
      line: lineNumber,
      column: image ? open : open + 1,
    });
  }
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
