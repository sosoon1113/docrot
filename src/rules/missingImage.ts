import { localLinks } from "./links.js";
import type { Report, Rule } from "./types.js";

export const missingImage: Rule = {
  id: "missing-image",
  description: "Images must point to a file that exists.",
  defaultSeverity: "error",
  check(context) {
    const reports: Report[] = [];
    for (const { link, target, resolved } of localLinks(context, true)) {
      if (resolved !== null && context.project.kind(resolved) !== "file") {
        reports.push({
          line: link.line,
          column: link.column,
          message: `image '${target.path}' does not exist`,
        });
      }
    }
    return reports;
  },
};
