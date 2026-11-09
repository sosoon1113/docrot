import { localLinks } from "./links.js";
import type { Report, Rule } from "./types.js";

export const missingImage: Rule = {
  id: "missing-image",
  description: "Images must point to a file that exists, with matching case.",
  defaultSeverity: "error",
  check(context) {
    const reports: Report[] = [];
    for (const { link, target, resolved } of localLinks(context, true)) {
      if (resolved === null) continue;
      const position = { line: link.line, column: link.column };

      const actual = context.project.caseMismatch(resolved);
      if (actual !== null) {
        reports.push({
          ...position,
          message: `image '${target.path}' differs in letter case from '${actual}'`,
        });
      } else if (context.project.kind(resolved) !== "file") {
        reports.push({ ...position, message: `image '${target.path}' does not exist` });
      }
    }
    return reports;
  },
};
