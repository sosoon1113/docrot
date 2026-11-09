import { readFileSync, statSync } from "node:fs";
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

  relative(file: string): string {
    return relativePosix(this.root, file);
  }
}
