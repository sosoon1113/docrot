import path from "node:path";
import { describe, expect, it } from "vitest";
import { isExternal, parseTarget, relativePosix, resolveLinkPath } from "../src/resolve.js";

describe("isExternal", () => {
  it.each([
    "https://example.com",
    "http://localhost:3000",
    "mailto:me@example.com",
    "ftp://files.example.com",
    "//cdn.example.com/lib.js",
    "vscode://file/x",
  ])("%s is external", (target) => {
    expect(isExternal(target)).toBe(true);
  });

  it.each(["docs/a.md", "./a.md", "../a.md", "/docs/a.md", "#anchor", "a.md#x:y"])(
    "%s is local",
    (target) => {
      expect(isExternal(target)).toBe(false);
    },
  );
});

describe("parseTarget", () => {
  it.each([
    ["docs/a.md", { path: "docs/a.md", fragment: null }],
    ["docs/a.md#usage", { path: "docs/a.md", fragment: "usage" }],
    ["#usage", { path: "", fragment: "usage" }],
    ["a.md?plain=1#L10", { path: "a.md", fragment: "L10" }],
    ["my%20notes.md", { path: "my notes.md", fragment: null }],
    ["a.md#caf%C3%A9", { path: "a.md", fragment: "café" }],
    ["100%.md", { path: "100%.md", fragment: null }],
    ["a.md#", { path: "a.md", fragment: "" }],
  ])("%s", (target, expected) => {
    expect(parseTarget(target)).toEqual(expected);
  });
});

describe("resolveLinkPath", () => {
  const root = path.resolve("/repo");
  const from = path.join(root, "docs", "guide.md");

  it("resolves relative to the linking file", () => {
    expect(resolveLinkPath(from, "setup.md", root)).toBe(path.join(root, "docs", "setup.md"));
    expect(resolveLinkPath(from, "../README.md", root)).toBe(path.join(root, "README.md"));
  });

  it("resolves a leading slash against the project root", () => {
    expect(resolveLinkPath(from, "/LICENSE", root)).toBe(path.join(root, "LICENSE"));
  });
});

it("relativePosix always uses forward slashes", () => {
  const root = path.resolve("/repo");
  expect(relativePosix(root, path.join(root, "docs", "a.md"))).toBe("docs/a.md");
});
