import type { Finding } from "../types.js";
import type { ReportSummary } from "./pretty.js";

/**
 * GitHub Actions workflow commands, which show up as annotations on the
 * changed lines of a pull request:
 *
 *     ::error file=README.md,line=7,col=22,title=docrot (broken-link)::link target ...
 *
 * Paths are relative to the project root, so run docrot from the repository root.
 */
export function formatGithub(findings: readonly Finding[], summary: ReportSummary): string {
  const lines = findings.map((finding) => {
    const properties = [
      `file=${escapeProperty(finding.file)}`,
      `line=${finding.line}`,
      `col=${finding.column}`,
      `title=${escapeProperty(`docrot (${finding.rule})`)}`,
    ].join(",");
    return `::${finding.severity} ${properties}::${escapeData(finding.message)}`;
  });

  const errors = findings.filter((f) => f.severity === "error").length;
  lines.push(
    `docrot: ${errors} error(s), ${findings.length - errors} warning(s) in ${summary.filesChecked} file(s) checked`,
  );
  return `${lines.join("\n")}\n`;
}

function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
