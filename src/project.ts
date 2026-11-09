import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { type MarkdownDocument, scanMarkdown } from "./markdown/scanner.js";
import { relativePosix } from "./resolve.js";

type EntryKind = "file" | "directory";

/**
 * The project being checked. Caches filesystem lookups and parsed documents,
 * since many links usually point at the same few files.
 */
export class Project {
  readonly root: string;
  readonly #kinds = new Map<string, EntryKind | null>();
  readonly #documents = new Map<string, MarkdownDocument | null>();
  readonly #anchors = new Map<string, ReadonlySet<string> | null>();
  readonly #listings = new Map<string, readonly string[] | null>();

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Whether `file` is a file, a directory, or missing. */
  kind(file: string): EntryKind | null {
    let kind = this.#kinds.get(file);
    if (kind === undefined) {
      const stats = statSync(file, { throwIfNoEntry: false });
      kind = stats?.isDirectory() ? "directory" : stats ? "file" : null;
      this.#kinds.set(file, kind);
    }
    return kind;
  }

  exists(file: string): boolean {
    return this.kind(file) !== null;
  }

  /** The parsed Markdown at `file`, or `null` if it can't be read. */
  document(file: string): MarkdownDocument | null {
    let document = this.#documents.get(file);
    if (document === undefined) {
      document = this.kind(file) === "file" ? scanMarkdown(readFileSync(file, "utf8")) : null;
      this.#documents.set(file, document);
    }
    return document;
  }

  /**
   * Lowercased anchors a link into `file` can target: heading slugs plus ids
   * declared in HTML. `null` if the file can't be read.
   */
  anchors(file: string): ReadonlySet<string> | null {
    let anchors = this.#anchors.get(file);
    if (anchors === undefined) {
      const document = this.document(file);
      anchors = document
        ? new Set([
            ...document.headings.map((heading) => heading.slug),
            ...document.anchors.map((anchor) => anchor.toLowerCase()),
          ])
        : null;
      this.#anchors.set(file, anchors);
    }
    return anchors;
  }

  /**
   * If `file` matches an entry under the root only when letter case is
   * ignored, return the entry's real path (relative to the root, e.g.
   * `docs/guide.md` for `Docs/Guide.md`). Returns `null` when the case is
   * already right, nothing matches, or `file` is outside the root.
   *
   * Case-insensitive filesystems (Windows, macOS) happily open such paths,
   * but they break on GitHub and Linux, so this gives the same answer everywhere.
   */
  caseMismatch(file: string): string | null {
    const relative = path.relative(this.root, file);
    if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return null;

    let actual = this.root;
    let mismatched = false;
    for (const segment of relative.split(path.sep)) {
      const entries = this.#list(actual);
      if (entries === null) return null;
      if (entries.includes(segment)) {
        actual = path.join(actual, segment);
        continue;
      }
      const lower = segment.toLowerCase();
      const match = entries.find((entry) => entry.toLowerCase() === lower);
      if (match === undefined) return null;
      actual = path.join(actual, match);
      mismatched = true;
    }
    return mismatched ? this.relative(actual) : null;
  }

  relative(file: string): string {
    return relativePosix(this.root, file);
  }

  #list(directory: string): readonly string[] | null {
    let entries = this.#listings.get(directory);
    if (entries === undefined) {
      try {
        entries = readdirSync(directory);
      } catch {
        entries = null;
      }
      this.#listings.set(directory, entries);
    }
    return entries;
  }
}
