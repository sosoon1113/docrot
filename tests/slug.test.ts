import { describe, expect, it } from "vitest";
import { Slugger, slugify } from "../src/markdown/slug.js";

describe("slugify", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["API Reference (v2)", "api-reference-v2"],
    ["What's new?", "whats-new"],
    ["C++ & Rust", "c--rust"],
    ["snake_case_name", "snake_case_name"],
    ["Already-hyphenated", "already-hyphenated"],
    ["Ünïcödé Heading", "ünïcödé-heading"],
    ["日本語の見出し", "日本語の見出し"],
    ["🎉 Release party", "-release-party"],
    ["v1.2.3: notes", "v123-notes"],
  ])("%s -> %s", (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });
});

describe("Slugger", () => {
  it("numbers duplicate headings", () => {
    const slugger = new Slugger();
    expect(["Usage", "Usage", "Usage"].map((t) => slugger.slug(t))).toEqual([
      "usage",
      "usage-1",
      "usage-2",
    ]);
  });

  it("skips suffixes that are already taken", () => {
    const slugger = new Slugger();
    expect(["Usage 1", "Usage", "Usage"].map((t) => slugger.slug(t))).toEqual([
      "usage-1",
      "usage",
      "usage-2",
    ]);
  });

  it("keeps state per instance", () => {
    expect(new Slugger().slug("Intro")).toBe("intro");
    expect(new Slugger().slug("Intro")).toBe("intro");
  });
});
