import { describe, expect, it } from "vitest";
import { check, DocrotError } from "../src/checker.js";
import { brokenLink } from "../src/rules/brokenLink.js";
import { checkFixture, fixtureRoot } from "./helpers.js";

describe("broken-link and missing-image", () => {
  it("reports only the targets that don't exist", () => {
    expect(checkFixture("README.md")).toEqual([
      "README.md:7:22 broken-link link target 'docs/setup.md' does not exist",
      "README.md:8:17 broken-link link target 'api/v1.md' does not exist",
      "README.md:11:1 missing-image image 'docs/img/screenshot.png' does not exist",
      "README.md:12:1 missing-image image 'docs/img' does not exist",
    ]);
  });

  it("resolves links relative to the file that contains them", () => {
    expect(checkFixture("docs/guide.md")).toEqual([
      "docs/guide.md:7:12 broken-link link target './setup.md' does not exist",
    ]);
  });

  it("sorts findings by file and position", () => {
    const files = checkFixture("docs/guide.md", "README.md").map((line) => line.split(":")[0]);
    expect(files).toEqual(["README.md", "README.md", "README.md", "README.md", "docs/guide.md"]);
  });
});

describe("check", () => {
  it("reports how many files were checked", () => {
    const result = check({ root: fixtureRoot, files: ["README.md", "docs/guide.md"] });
    expect(result.filesChecked).toBe(2);
  });

  it("can run a subset of rules", () => {
    const result = check({ root: fixtureRoot, files: ["README.md"], rules: [brokenLink] });
    expect(new Set(result.findings.map((f) => f.rule))).toEqual(new Set(["broken-link"]));
  });

  it("accepts absolute file paths", () => {
    const result = check({ root: fixtureRoot, files: [`${fixtureRoot}/docs/guide.md`] });
    expect(result.findings[0]?.file).toBe("docs/guide.md");
  });

  it("fails clearly on unreadable files", () => {
    expect(() => check({ root: fixtureRoot, files: ["nope.md"] })).toThrow(DocrotError);
    expect(() => check({ root: fixtureRoot, files: ["docs"] })).toThrow("cannot read 'docs'");
  });
});
