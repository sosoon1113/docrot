import { describe, expect, it } from "vitest";
import { closestMatch, editDistance } from "../src/util/suggest.js";

describe("editDistance", () => {
  it.each([
    ["", "", 0],
    ["abc", "abc", 0],
    ["", "abc", 3],
    ["kitten", "sitting", 3],
    ["instalation", "installation", 1],
  ])("%s -> %s = %i", (a, b, distance) => {
    expect(editDistance(a, b)).toBe(distance);
    expect(editDistance(b, a)).toBe(distance);
  });
});

describe("closestMatch", () => {
  it("suggests a likely typo fix", () => {
    expect(closestMatch("instalation", ["usage", "installation", "license"])).toBe("installation");
  });

  it("prefers the closest candidate", () => {
    expect(closestMatch("usage", ["usages", "usage-1"])).toBe("usages");
  });

  it("returns nothing when no candidate is close", () => {
    expect(closestMatch("configuration", ["guide", "installation"])).toBeUndefined();
    expect(closestMatch("x", [])).toBeUndefined();
  });
});
