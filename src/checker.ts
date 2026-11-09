import path from "node:path";
import type { RuleSettings } from "./config.js";
import { DocrotError } from "./errors.js";
import { Project } from "./project.js";
import { type Rule, rules as builtInRules } from "./rules/index.js";
import type { Finding } from "./types.js";
import { matcher } from "./util/glob.js";

export interface CheckOptions {
  /** Markdown files to check, absolute or relative to `root`. */
  files: readonly string[];
  /** Project root. Links starting with `/` resolve against it. Defaults to the cwd. */
  root?: string;
  /** Rules to run. Defaults to every built-in rule. */
  rules?: readonly Rule[];
  /** Per-rule severity overrides; `"off"` skips the rule. */
  settings?: RuleSettings;
  /** Link targets to skip, as globs matched against the target as written. */
  ignoreTargets?: readonly string[];
}

export interface CheckResult {
  findings: Finding[];
  filesChecked: number;
}

export function check(options: CheckOptions): CheckResult {
  const project = new Project(options.root ?? process.cwd());
  const isIgnored = matcher(options.ignoreTargets ?? []);
  const active = (options.rules ?? builtInRules).flatMap((rule) => {
    const severity = options.settings?.[rule.id] ?? rule.defaultSeverity;
    return severity === "off" ? [] : [{ rule, severity }];
  });
  const findings: Finding[] = [];

  for (const input of options.files) {
    const file = path.resolve(project.root, input);
    const document = project.document(file);
    if (document === null) {
      throw new DocrotError(`cannot read '${input}'`);
    }
    for (const { rule, severity } of active) {
      for (const report of rule.check({ project, file, document, isIgnored })) {
        findings.push({ rule: rule.id, severity, file: project.relative(file), ...report });
      }
    }
  }

  findings.sort(compareFindings);
  return { findings, filesChecked: options.files.length };
}

function compareFindings(a: Finding, b: Finding): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  return a.line - b.line || a.column - b.column;
}
