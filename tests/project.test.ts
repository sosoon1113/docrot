import path from "node:path";
import { describe, expect, it } from "vitest";
import { Project } from "../src/project.js";
import { checkFixture, fixtureRoot } from "./helpers.js";

describe("Project.caseMismatch", () => {
  const project = new Project(fixtureRoot);
  const at = (...segments: string[]) => path.join(fixtureRoot, ...segments);

  it("returns the real path when only letter case differs", () => {
    expect(project.caseMismatch(at("Docs", "Guide.md"))).toBe("docs/guide.md");
    expect(project.caseMismatch(at("docs", "IMG"))).toBe("docs/img");
  });

  it("returns null for exact matches, missing files and paths outside the root", () => {
    expect(project.caseMismatch(at("docs", "guide.md"))).toBeNull();
    expect(project.caseMismatch(at("docs", "nope.md"))).toBeNull();
    expect(project.caseMismatch(at("Docs", "nope.md"))).toBeNull();
    expect(project.caseMismatch(fixtureRoot)).toBeNull();
    expect(project.caseMismatch(path.join(fixtureRoot, "..", "OTHER.md"))).toBeNull();
  });
});

it("reports wrong letter case in links, images and inline code on every OS", () => {
  expect(checkFixture("README.md").filter((line) => line.startsWith("README.md:27:"))).toEqual([
    "README.md:27:32 broken-link link target 'Docs/Guide.md' differs in letter case from 'docs/guide.md'",
    "README.md:27:56 missing-image image 'docs/img/Logo.svg' differs in letter case from 'docs/img/logo.svg'",
    "README.md:27:84 stale-code-path 'SRC/index.ts' in inline code differs in letter case from 'src/index.ts'",
  ]);
});
