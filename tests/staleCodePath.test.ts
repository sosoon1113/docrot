import { describe, expect, it } from "vitest";
import { looksLikeProjectPath } from "../src/rules/staleCodePath.js";
import { checkFixture } from "./helpers.js";

describe("looksLikeProjectPath", () => {
  it.each([
    "src/index.ts",
    "docs/setup.md",
    "./scripts/release",
    "../shared/",
    "packages/@scope/pkg/index.d.ts",
  ])("%s looks like a path", (text) => {
    expect(looksLikeProjectPath(text)).toBe(true);
  });

  it.each([
    "npm test",
    "index.ts",
    "and/or",
    "text/html",
    "@types/node",
    "/etc/hosts",
    "~/.bashrc",
    "https://example.com/a.js",
    "src/**/*.ts",
    "$HOME/bin/tool.sh",
    "a//b.md",
    "v1.2/v1.3",
  ])("%s does not", (text) => {
    expect(looksLikeProjectPath(text)).toBe(false);
  });
});

describe("stale-code-path", () => {
  it("warns about paths in inline code that no longer exist", () => {
    expect(checkFixture("docs/guide.md").filter((line) => line.includes("stale-code-path"))).toEqual([
      "docs/guide.md:15:19 stale-code-path 'lib/legacy.js' is mentioned in inline code but does not exist",
      "docs/guide.md:15:39 stale-code-path '../tools/build.sh' is mentioned in inline code but does not exist",
    ]);
  });

  it("accepts paths relative to the document or the root, with :line suffixes", () => {
    // Line 13 mentions `src/index.ts` and `config/app.json:12`, line 14 `docs/guide.md`.
    const lines = checkFixture("docs/guide.md")
      .filter((line) => line.includes("stale-code-path"))
      .map((line) => line.split(":")[1]);
    expect(lines).toEqual(["15", "15"]);
  });

  it("is a warning by default", async () => {
    const { check } = await import("../src/checker.js");
    const { fixtureRoot } = await import("./helpers.js");
    const { findings } = check({ root: fixtureRoot, files: ["docs/guide.md"] });
    expect(findings.filter((f) => f.rule === "stale-code-path").map((f) => f.severity)).toEqual([
      "warning",
      "warning",
    ]);
  });
});
