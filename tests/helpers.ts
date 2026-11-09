import { fileURLToPath } from "node:url";
import { check } from "../src/checker.js";
import type { Finding } from "../src/types.js";

/** Absolute path of the sample project used by most tests. */
export const fixtureRoot = fileURLToPath(new URL("./fixtures/project/", import.meta.url));

/** Run docrot on fixture files and return compact `file:line:col rule message` strings. */
export function checkFixture(...files: string[]): string[] {
  return check({ root: fixtureRoot, files }).findings.map(format);
}

export function format(finding: Finding): string {
  return `${finding.file}:${finding.line}:${finding.column} ${finding.rule} ${finding.message}`;
}
