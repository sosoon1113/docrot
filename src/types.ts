/** How serious a finding is. Errors fail the run by default; warnings don't. */
export type Severity = "error" | "warning";

export type RuleId = "broken-link" | "missing-anchor" | "missing-image" | "undefined-reference";

/** A problem found in a Markdown file. */
export interface Finding {
  /** Identifier of the rule that produced the finding. */
  rule: RuleId;
  severity: Severity;
  /** File path relative to the project root, always with `/` separators. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
  message: string;
}
