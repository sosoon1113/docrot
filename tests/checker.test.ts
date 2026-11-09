import { describe, expect, it } from "vitest";
import { check, DocrotError } from "../src/checker.js";
import { brokenLink } from "../src/rules/brokenLink.js";
import { checkFixture, fixtureRoot } from "./helpers.js";

describe("broken-link and missing-image", () => {
  it("reports only the targets that don't exist", () => {
    expect(checkFixture("README.md").slice(0, 4)).toEqual([
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
    expect(files.at(-1)).toBe("docs/guide.md");
    expect(files.filter((file) => file === "README.md")).toHaveLength(files.length - 1);
  });
});

describe("missing-anchor", () => {
  const anchorFindings = () =>
    checkFixture("README.md").filter((line) => line.includes("missing-anchor"));

  it("checks same-file and cross-file anchors", () => {
    expect(anchorFindings()).toEqual([
      "README.md:18:45 missing-anchor no heading matches '#instalation' in this file (did you mean '#installation'?)",
      "README.md:22:52 missing-anchor no heading matches '#configuration' in 'docs/guide.md'",
    ]);
  });

  it("checks anchors in reference definitions", () => {
    expect(checkFixture("docs/references.md")).toContain(
      "docs/references.md:8:1 missing-anchor no heading matches '#faq' in '../README.md'",
    );
  });

  it("accepts #top, HTML anchors, encoded paths, any case and non-Markdown line anchors", () => {
    // Lines 18 (#usage, #top), 22 (#installation) and 23-25 only contain valid anchors.
    const positions = anchorFindings().map((line) => line.split(" ")[0]);
    expect(positions).toEqual(["README.md:18:45", "README.md:22:52"]);
  });
});

describe("reference-style links", () => {
  it("checks each definition once and flags undefined labels", () => {
    expect(checkFixture("docs/references.md")).toEqual([
      "docs/references.md:3:64 undefined-reference reference '[issues]' is not defined",
      "docs/references.md:8:1 missing-anchor no heading matches '#faq' in '../README.md'",
      "docs/references.md:10:1 missing-image image 'img/build.svg' does not exist",
      "docs/references.md:11:3 broken-link link target 'missing.md' does not exist",
    ]);
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
