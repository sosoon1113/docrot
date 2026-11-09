import { closestMatch } from "../util/suggest.js";
import type { Report, Rule } from "./types.js";

export const undefinedReference: Rule = {
  id: "undefined-reference",
  description: "Reference-style links like [text][label] need a matching [label]: definition.",
  defaultSeverity: "error",
  check({ document }) {
    const reports: Report[] = [];
    for (const reference of document.references) {
      if (document.definitions.has(reference.label)) continue;
      const suggestion = closestMatch(reference.label, document.definitions);
      reports.push({
        line: reference.line,
        column: reference.column,
        message:
          `reference '[${reference.label}]' is not defined` +
          (suggestion ? ` (did you mean '[${suggestion}]'?)` : ""),
      });
    }
    return reports;
  },
};
