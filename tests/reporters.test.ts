import { describe, expect, it } from "vitest";
import { formatReport } from "../src/reporters/index.js";
import type { Finding } from "../src/types.js";

const findings: Finding[] = [
  {
    rule: "broken-link",
    severity: "error",
    file: "docs/a,b.md",
    line: 3,
    column: 7,
    message: "link target 'x.md' does not exist",
  },
  {
    rule: "stale-code-path",
    severity: "warning",
    file: "README.md",
    line: 10,
    column: 1,
    message: "100% stale\nreally",
  },
];

describe("json", () => {
  it("includes counts and every finding", () => {
    const report = JSON.parse(formatReport("json", findings, { filesChecked: 4 }));
    expect(report).toEqual({
      version: 1,
      filesChecked: 4,
      errorCount: 1,
      warningCount: 1,
      findings,
    });
  });

  it("is valid JSON when there is nothing to report", () => {
    expect(JSON.parse(formatReport("json", [], { filesChecked: 0 })).findings).toEqual([]);
  });
});

describe("github", () => {
  it("emits one workflow command per finding plus a summary", () => {
    expect(formatReport("github", findings, { filesChecked: 4 }).split("\n")).toEqual([
      "::error file=docs/a%2Cb.md,line=3,col=7,title=docrot (broken-link)::link target 'x.md' does not exist",
      "::warning file=README.md,line=10,col=1,title=docrot (stale-code-path)::100%25 stale%0Areally",
      "docrot: 1 error(s), 1 warning(s) in 4 file(s) checked",
      "",
    ]);
  });
});

it("pretty output never contains ANSI codes unless color is on", () => {
  expect(formatReport("pretty", findings, { filesChecked: 4 })).not.toContain("\u001b[");
  expect(formatReport("pretty", findings, { filesChecked: 4 }, { color: true })).toContain("\u001b[");
});
