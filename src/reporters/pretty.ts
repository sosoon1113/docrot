import type { Finding } from "../types.js";
import { createColors } from "./colors.js";

export interface ReportSummary {
  filesChecked: number;
}

export interface PrettyOptions {
  color?: boolean;
}

/**
 * Human-friendly output, grouped by file:
 *
 *     README.md
 *       7:22  error  link target 'docs/setup.md' does not exist  broken-link
 */
export function formatPretty(
  findings: readonly Finding[],
  summary: ReportSummary,
  options: PrettyOptions = {},
): string {
  const c = createColors(options.color ?? false);
  const files = `${summary.filesChecked} ${plural(summary.filesChecked, "file")}`;

  if (findings.length === 0) {
    return `${c.green(`No problems found in ${files}.`)}\n`;
  }

  const byFile = new Map<string, Finding[]>();
  for (const finding of findings) {
    const group = byFile.get(finding.file) ?? [];
    group.push(finding);
    byFile.set(finding.file, group);
  }

  const out: string[] = [];
  for (const [file, group] of byFile) {
    const positions = group.map((f) => `${f.line}:${f.column}`);
    const width = Math.max(...positions.map((p) => p.length));
    out.push(c.underline(file));
    group.forEach((finding, index) => {
      const severity =
        finding.severity === "error" ? c.red("error  ") : c.yellow("warning");
      const position = c.dim((positions[index] ?? "").padEnd(width));
      out.push(`  ${position}  ${severity}  ${finding.message}  ${c.dim(finding.rule)}`);
    });
    out.push("");
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;
  const problems =
    `${findings.length} ${plural(findings.length, "problem")} ` +
    `(${errors} ${plural(errors, "error")}, ${warnings} ${plural(warnings, "warning")}) ` +
    `in ${byFile.size} ${plural(byFile.size, "file")}`;
  const style = errors > 0 ? c.red : c.yellow;
  out.push(`${c.bold(style(problems))}${c.dim(`, ${files} checked`)}`);
  return `${out.join("\n")}\n`;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
