import type { Finding } from "../types.js";
import type { ReportSummary } from "./pretty.js";

/** Machine-readable output. `version` changes only on breaking schema changes. */
export function formatJson(findings: readonly Finding[], summary: ReportSummary): string {
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const report = {
    version: 1,
    filesChecked: summary.filesChecked,
    errorCount,
    warningCount: findings.length - errorCount,
    findings,
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}
