import type { MarkdownDocument } from "../markdown/scanner.js";
import type { Project } from "../project.js";
import type { RuleId, Severity } from "../types.js";

export interface RuleContext {
  project: Project;
  /** Absolute path of the document being checked. */
  file: string;
  document: MarkdownDocument;
  /** True for link targets the user asked to skip (`ignoreTargets`). */
  isIgnored(target: string): boolean;
}

/** What a rule reports; the checker adds the rule id, severity and file. */
export interface Report {
  line: number;
  column: number;
  message: string;
}

export interface Rule {
  id: RuleId;
  description: string;
  defaultSeverity: Severity;
  check(context: RuleContext): Report[];
}
