import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig, loadConfig, parseConfig, starterConfig } from "../src/config.js";
import { DocrotError } from "../src/errors.js";
import { globToRegExp } from "../src/util/glob.js";

describe("parseConfig", () => {
  it("fills in defaults", () => {
    expect(parseConfig({})).toEqual(defaultConfig());
    expect(parseConfig({ exclude: ["CHANGELOG.md"] }).include).toEqual([
      "**/*.md",
      "**/*.markdown",
    ]);
  });

  it("accepts every option", () => {
    const config = parseConfig({
      $schema: "ignored",
      include: ["docs/**/*.md"],
      exclude: ["docs/archive/**"],
      ignoreTargets: ["/generated/**"],
      rules: { "missing-image": "warning", "undefined-reference": "off" },
    });
    expect(config).toEqual({
      include: ["docs/**/*.md"],
      exclude: ["docs/archive/**"],
      ignoreTargets: ["/generated/**"],
      rules: { "missing-image": "warning", "undefined-reference": "off" },
    });
  });

  it.each([
    [[], "expected a JSON object"],
    [{ exlude: [] }, "unknown option 'exlude' (did you mean 'exclude'?)"],
    [{ include: "docs" }, "'include' must be an array of strings"],
    [{ ignoreTargets: [1] }, "'ignoreTargets' must be an array of strings"],
    [{ rules: [] }, "'rules' must be an object"],
    [
      { rules: { "broken-links": "off" } },
      "unknown rule 'broken-links' (did you mean 'broken-link'?)",
    ],
    [
      { rules: { "broken-link": "fatal" } },
      'rule \'broken-link\' must be "error", "warning" or "off"',
    ],
  ])("rejects %j", (value, message) => {
    expect(() => parseConfig(value, ".docrotrc.json")).toThrow(`.docrotrc.json: ${message}`);
  });
});

describe("loadConfig", () => {
  let root = "";
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "docrot-config-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("uses the defaults when there is no config file", () => {
    expect(loadConfig(root)).toEqual({ config: defaultConfig(), path: null });
  });

  it("finds .docrotrc.json, then docrot.config.json", () => {
    writeFileSync(path.join(root, "docrot.config.json"), '{"exclude": ["b"]}');
    expect(loadConfig(root).config.exclude).toEqual(["b"]);
    writeFileSync(path.join(root, ".docrotrc.json"), '{"exclude": ["a"]}');
    expect(loadConfig(root)).toMatchObject({
      config: { exclude: ["a"] },
      path: path.join(root, ".docrotrc.json"),
    });
  });

  it("loads an explicit path", () => {
    const file = path.join(root, "custom.json");
    writeFileSync(file, '{"rules": {"broken-link": "warning"}}');
    expect(loadConfig(root, file).config.rules).toEqual({ "broken-link": "warning" });
  });

  it("explains unreadable and invalid files", () => {
    expect(() => loadConfig(root, path.join(root, "missing.json"))).toThrow(
      "cannot read config file 'missing.json'",
    );
    writeFileSync(path.join(root, ".docrotrc.json"), "{ include: [] }");
    expect(() => loadConfig(root)).toThrow(DocrotError);
    expect(() => loadConfig(root)).toThrow(/^\.docrotrc\.json is not valid JSON/);
  });
});

it("starterConfig lists every rule with its default severity", () => {
  expect(starterConfig().rules).toEqual({
    "broken-link": "error",
    "missing-anchor": "error",
    "missing-image": "error",
    "undefined-reference": "error",
    "stale-code-path": "warning",
  });
});

describe("globToRegExp", () => {
  it.each([
    ["docs/*.md", "docs/a.md", true],
    ["docs/*.md", "docs/sub/a.md", false],
    ["docs/**", "docs/sub/a.md", true],
    ["docs/**/x.md", "docs/x.md", true],
    ["docs/**/x.md", "docs/a/b/x.md", true],
    ["docs/**/x.md", "docs/ax.md", false],
    ["v?.md", "v1.md", true],
    ["/generated/*", "/generated/api.md", true],
    ["a+b.md", "a+b.md", true],
    ["a+b.md", "aab.md", false],
  ])("%s matches %s: %s", (pattern, value, expected) => {
    expect(globToRegExp(pattern).test(value)).toBe(expected);
  });
});
