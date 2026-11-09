import { statSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { DocrotError } from "./errors.js";
import { relativePosix } from "./resolve.js";

/** Files checked when no `include` patterns are configured. */
export const DEFAULT_INCLUDE = ["**/*.md", "**/*.markdown"];

/** Never worth scanning, whatever the configuration says. */
export const ALWAYS_EXCLUDE = ["**/node_modules/**", "**/.git/**"];

export interface FindOptions {
  /** Project root; `include` and `exclude` patterns are relative to it. */
  root: string;
  /** Absolute files or directories to look in. Defaults to the whole root. */
  paths?: readonly string[];
  include?: readonly string[];
  exclude?: readonly string[];
}

/**
 * Collect the Markdown files to check, as sorted absolute paths. Files given
 * explicitly are always included; directories are searched with the
 * include/exclude patterns.
 */
export function findMarkdownFiles(options: FindOptions): string[] {
  const root = path.resolve(options.root);
  const include = options.include ?? DEFAULT_INCLUDE;
  const ignore = [...ALWAYS_EXCLUDE, ...(options.exclude ?? [])];
  const targets = options.paths?.length ? options.paths : [root];
  const found = new Set<string>();

  for (const target of targets) {
    const stats = statSync(target, { throwIfNoEntry: false });
    if (!stats) {
      throw new DocrotError(`no such file or directory: '${relativePosix(root, target)}'`);
    }
    if (stats.isFile()) {
      found.add(path.resolve(target));
      continue;
    }

    const prefix = relativePosix(root, target);
    const insideRoot = !prefix.startsWith("..") && !path.isAbsolute(prefix);
    const patterns =
      insideRoot && prefix !== ""
        ? include.map((pattern) => `${fg.escapePath(prefix)}/${pattern}`)
        : [...include];
    const matches = fg.sync(patterns, {
      cwd: insideRoot ? root : target,
      ignore,
      absolute: true,
      onlyFiles: true,
    });
    for (const file of matches) found.add(path.resolve(file));
  }

  return [...found].sort();
}
