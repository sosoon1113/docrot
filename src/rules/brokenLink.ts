import { localLinks } from "./links.js";
import type { Report, Rule } from "./types.js";

export const brokenLink: Rule = {
  id: "broken-link",
  description: "Relative links must point to a file or directory that exists, with matching case.",
  defaultSeverity: "error",
  check(context) {
    const reports: Report[] = [];
    for (const { link, target, resolved } of localLinks(context, false)) {
      if (resolved === null) continue;
      const position = { line: link.line, column: link.column };

      const actual = context.project.caseMismatch(resolved);
      if (actual !== null) {
        reports.push({
          ...position,
          message: `link target '${target.path}' differs in letter case from '${actual}'`,
        });
      } else if (!context.project.exists(resolved)) {
        reports.push({ ...position, message: `link target '${target.path}' does not exist` });
      }
    }
    return reports;
  },
};
