import { closestMatch } from "../util/suggest.js";
import { localLinks } from "./links.js";
import type { Report, Rule } from "./types.js";

const MARKDOWN_FILE = /\.(?:md|markdown|mdx)$/i;

/** Browsers scroll to the top for `#top` even without a matching element. */
const IMPLICIT_ANCHORS = new Set(["top"]);

export const missingAnchor: Rule = {
  id: "missing-anchor",
  description:
    "Links to #fragments must match a heading or HTML anchor in the target Markdown file.",
  defaultSeverity: "error",
  check(context) {
    const reports: Report[] = [];
    for (const { link, target, resolved } of localLinks(context, false)) {
      if (!target.fragment) continue; // no fragment, or a bare "#"

      const file = resolved ?? context.file;
      // Only Markdown has heading anchors; `src/app.ts#L10` is GitHub's line syntax.
      if (!MARKDOWN_FILE.test(file)) continue;

      const anchors = context.project.anchors(file);
      if (anchors === null) continue; // a missing file is broken-link's job

      const wanted = target.fragment.toLowerCase();
      if (anchors.has(wanted) || IMPLICIT_ANCHORS.has(wanted)) continue;

      const where = resolved === null ? "this file" : `'${target.path}'`;
      const suggestion = closestMatch(wanted, anchors);
      reports.push({
        line: link.line,
        column: link.column,
        message:
          `no heading matches '#${target.fragment}' in ${where}` +
          (suggestion ? ` (did you mean '#${suggestion}'?)` : ""),
      });
    }
    return reports;
  },
};
