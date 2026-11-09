export { type CheckOptions, type CheckResult, check } from "./checker.js";
export { DocrotError } from "./errors.js";
export { type FindOptions, findMarkdownFiles } from "./files.js";
export type {
  CodeSpan,
  Heading,
  Link,
  MarkdownDocument,
  Reference,
} from "./markdown/scanner.js";
export { normalizeLabel, scanMarkdown } from "./markdown/scanner.js";
export { Slugger, slugify } from "./markdown/slug.js";
export { formatGithub } from "./reporters/github.js";
export { FORMATS, type Format, formatReport, type ReportSummary } from "./reporters/index.js";
export { formatJson } from "./reporters/json.js";
export { formatPretty } from "./reporters/pretty.js";
export { type Rule, type RuleContext, rules } from "./rules/index.js";
export type { Finding, RuleId, Severity } from "./types.js";
