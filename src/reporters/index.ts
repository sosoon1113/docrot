import type { Finding } from "../types.js";
import { formatGithub } from "./github.js";
import { formatJson } from "./json.js";
import { formatPretty, type ReportSummary } from "./pretty.js";

export const FORMATS = ["pretty", "json", "github"] as const;
export type Format = (typeof FORMATS)[number];

export type { ReportSummary } from "./pretty.js";

export function formatReport(
  format: Format,
  findings: readonly Finding[],
  summary: ReportSummary,
  options: { color?: boolean } = {},
): string {
  switch (format) {
    case "json":
      return formatJson(findings, summary);
    case "github":
      return formatGithub(findings, summary);
    case "pretty":
      return formatPretty(findings, summary, options);
  }
}
