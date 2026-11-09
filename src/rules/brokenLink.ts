import { localLinks } from "./links.js";
import type { Report, Rule } from "./types.js";

export const brokenLink: Rule = {
  id: "broken-link",
  description: "Relative links must point to a file or directory that exists.",
  defaultSeverity: "error",
  check(context) {
    const reports: Report[] = [];
    for (const { link, target, resolved } of localLinks(context, false)) {
      if (resolved !== null && !context.project.exists(resolved)) {
        reports.push({
          line: link.line,
          column: link.column,
          message: `link target '${target.path}' does not exist`,
        });
      }
    }
    return reports;
  },
};
