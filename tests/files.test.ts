import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DocrotError } from "../src/errors.js";
import { findMarkdownFiles } from "../src/files.js";
import { relativePosix } from "../src/resolve.js";
import { fixtureRoot } from "./helpers.js";

const relative = (root: string, files: string[]) => files.map((f) => relativePosix(root, f));

describe("findMarkdownFiles", () => {
  it("finds every Markdown file under the root by default", () => {
    expect(relative(fixtureRoot, findMarkdownFiles({ root: fixtureRoot }))).toEqual([
      "README.md",
      "docs/guide.md",
      "docs/my notes.md",
      "docs/references.md",
    ]);
  });

  it("limits the search to the given directories", () => {
    const files = findMarkdownFiles({ root: fixtureRoot, paths: [path.join(fixtureRoot, "docs")] });
    expect(relative(fixtureRoot, files)).toEqual([
      "docs/guide.md",
      "docs/my notes.md",
      "docs/references.md",
    ]);
  });

  it("applies exclude patterns relative to the root", () => {
    const files = findMarkdownFiles({ root: fixtureRoot, exclude: ["docs/*notes*"] });
    expect(relative(fixtureRoot, files)).not.toContain("docs/my notes.md");
  });

  it("always includes explicitly named files", () => {
    const file = path.join(fixtureRoot, "LICENSE.txt");
    expect(findMarkdownFiles({ root: fixtureRoot, paths: [file], exclude: ["**"] })).toEqual([file]);
  });

  it("rejects paths that don't exist", () => {
    const missing = path.join(fixtureRoot, "nope");
    expect(() => findMarkdownFiles({ root: fixtureRoot, paths: [missing] })).toThrow(DocrotError);
  });

  describe("in a scratch project", () => {
    let root = "";
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it("skips node_modules and .git and supports custom includes", () => {
      root = mkdtempSync(path.join(tmpdir(), "docrot-"));
      for (const file of ["a.md", "b.mdx", "node_modules/pkg/README.md", ".git/x.md", "sub/c.md"]) {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        writeFileSync(path.join(root, file), "# x\n");
      }
      expect(relative(root, findMarkdownFiles({ root }))).toEqual(["a.md", "sub/c.md"]);
      expect(relative(root, findMarkdownFiles({ root, include: ["**/*.mdx"] }))).toEqual(["b.mdx"]);
    });
  });
});
