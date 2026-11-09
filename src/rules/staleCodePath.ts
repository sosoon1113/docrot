import path from "node:path";
import type { Report, Rule } from "./types.js";

/**
 * Inline code that is very likely a path inside the project: it contains a
 * `/`, has no spaces, globs, URLs or shell variables, and either starts with
 * `./` or `../` or ends in a file extension (`src/app.ts`, `docs/setup.md`).
 */
const PATH_CHARS = /^[\w@./-]+$/;
const FILE_EXTENSION = /\.[A-Za-z][A-Za-z0-9]{0,9}$/;
const LINE_SUFFIX = /:\d+(?::\d+)?$/;

export function looksLikeProjectPath(text: string): boolean {
  if (!text.includes("/") || !PATH_CHARS.test(text)) return false;
  if (text.startsWith("/") || text.includes("//")) return false; // absolute or URL-ish
  const relative = text.startsWith("./") || text.startsWith("../");
  return relative || FILE_EXTENSION.test(text);
}

export const staleCodePath: Rule = {
  id: "stale-code-path",
  description:
    "File paths written in inline code (like `src/app.ts`) should still exist in the project.",
  defaultSeverity: "warning",
  check({ project, file, document, isIgnored }) {
    const reports: Report[] = [];
    for (const span of document.codeSpans) {
      // Allow editor-style `src/app.ts:42` references.
      const candidate = span.text.replace(LINE_SUFFIX, "");
      if (!looksLikeProjectPath(candidate) || isIgnored(candidate)) continue;

      // Docs refer to paths either from where they live or from the repo root.
      const places = [
        path.resolve(path.dirname(file), candidate),
        path.resolve(project.root, candidate),
      ];
      const matchesExactly = (place: string) =>
        project.exists(place) && project.caseMismatch(place) === null;
      if (places.some(matchesExactly)) continue;

      const actual = places.map((place) => project.caseMismatch(place)).find((p) => p !== null);
      reports.push({
        line: span.line,
        column: span.column,
        message: actual
          ? `'${candidate}' in inline code differs in letter case from '${actual}'`
          : `'${candidate}' is mentioned in inline code but does not exist`,
      });
    }
    return reports;
  },
};
