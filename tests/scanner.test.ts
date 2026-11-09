import { describe, expect, it } from "vitest";
import { scanMarkdown, stripInlineMarkdown } from "../src/markdown/scanner.js";

const md = (...lines: string[]) => lines.join("\n");

describe("headings", () => {
  it("finds ATX headings with their level and line", () => {
    const { headings } = scanMarkdown(md("# Title", "", "text", "### Deep ###"));
    expect(headings).toEqual([
      { text: "Title", slug: "title", level: 1, line: 1 },
      { text: "Deep", slug: "deep", level: 3, line: 4 },
    ]);
  });

  it("finds setext headings", () => {
    const { headings } = scanMarkdown(md("Main title", "==========", "", "Section", "---"));
    expect(headings.map((h) => [h.text, h.level, h.line])).toEqual([
      ["Main title", 1, 1],
      ["Section", 2, 4],
    ]);
  });

  it("does not treat a horizontal rule after a list as a heading", () => {
    expect(scanMarkdown(md("- item", "---")).headings).toEqual([]);
    expect(scanMarkdown(md("", "---")).headings).toEqual([]);
  });

  it("ignores things that only look like headings", () => {
    expect(scanMarkdown(md("#hashtag", "####### seven", "    # indented code")).headings).toEqual(
      [],
    );
  });

  it("gives repeated headings unique slugs", () => {
    const { headings } = scanMarkdown(md("## Options", "## Options", "Options", "-------"));
    expect(headings.map((h) => h.slug)).toEqual(["options", "options-1", "options-2"]);
  });

  it("strips inline Markdown from heading text", () => {
    const { headings } = scanMarkdown("## Use `docrot` with **[CI](ci.md)** <sup>new</sup>");
    expect(headings[0]?.text).toBe("Use docrot with CI new");
  });
});

describe("stripInlineMarkdown", () => {
  it.each([
    ["*emphasis* and __strong__", "emphasis and strong"],
    ["![logo](logo.png) Project", "logo Project"],
    ["snake_case_name stays", "snake_case_name stays"],
    ["_wrapped_ word", "wrapped word"],
    ["~~old~~ new", "old new"],
    ["``a `tick` b``", "a `tick` b"],
  ])("%s", (input, expected) => {
    expect(stripInlineMarkdown(input)).toBe(expected);
  });
});

describe("links", () => {
  it("finds inline links with position", () => {
    const { links } = scanMarkdown(md("intro", "See [the guide](docs/guide.md) and [API](api.md)."));
    expect(links).toEqual([
      { text: "the guide", target: "docs/guide.md", image: false, line: 2, column: 5 },
      { text: "API", target: "api.md", image: false, line: 2, column: 36 },
    ]);
  });

  it("finds images", () => {
    const { links } = scanMarkdown("![Logo](assets/logo.png)");
    expect(links).toEqual([
      { text: "Logo", target: "assets/logo.png", image: true, line: 1, column: 1 },
    ]);
  });

  it("finds images nested inside links (badges)", () => {
    const { links } = scanMarkdown("[![CI](badge.svg)](https://ci.example.com)");
    expect(links.map((l) => [l.target, l.image])).toEqual([
      ["https://ci.example.com", false],
      ["badge.svg", true],
    ]);
  });

  it.each([
    ['[a](file.md "Title")', "file.md"],
    ["[a](file.md 'Title')", "file.md"],
    ["[a](<docs/my file.md>)", "docs/my file.md"],
    ["[a](https://en.wikipedia.org/wiki/Cron_(Unix))", "https://en.wikipedia.org/wiki/Cron_(Unix)"],
    ["[a](#anchor)", "#anchor"],
    ["[a]()", ""],
  ])("parses the destination of %s", (line, target) => {
    expect(scanMarkdown(line).links[0]?.target).toBe(target);
  });

  it("ignores escaped brackets, footnotes and task lists", () => {
    expect(scanMarkdown(md("\\[not](a.md)", "Note[^1]", "- [ ] todo", "- [x] done")).links).toEqual(
      [],
    );
  });

  it("ignores links in fenced code blocks", () => {
    const source = md("```md", "[a](a.md)", "```", "~~~", "[b](b.md)", "~~~", "[c](c.md)");
    expect(scanMarkdown(source).links.map((l) => l.target)).toEqual(["c.md"]);
  });

  it("only closes a fence with a matching marker", () => {
    const source = md("````", "```", "[a](a.md)", "````", "[b](b.md)");
    expect(scanMarkdown(source).links.map((l) => l.target)).toEqual(["b.md"]);
  });

  it("treats an unclosed fence as running to the end of the file", () => {
    expect(scanMarkdown(md("```", "[a](a.md)")).links).toEqual([]);
  });
});

describe("front matter", () => {
  it("is skipped while keeping line numbers", () => {
    const { headings, links } = scanMarkdown(md("---", "title: x", "---", "# Hello", "[a](a.md)"));
    expect(headings).toEqual([{ text: "Hello", slug: "hello", level: 1, line: 4 }]);
    expect(links[0]?.line).toBe(5);
  });
});

describe("HTML anchors", () => {
  it("collects id and name attributes", () => {
    const { anchors } = scanMarkdown(md('<a name="faq"></a>', '<h2 id="setup">Setup</h2>'));
    expect(anchors).toEqual(["faq", "setup"]);
  });
});

it("handles Windows line endings", () => {
  const { headings, links } = scanMarkdown("# One\r\n[a](a.md)\r\n");
  expect(headings[0]?.text).toBe("One");
  expect(links[0]?.line).toBe(2);
});
