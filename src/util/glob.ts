/**
 * Convert a simple glob to a regular expression matching whole strings.
 * Supports `**` (anything, including `/`), `*` (anything but `/`) and `?`.
 */
export function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i] ?? "";
    if (char === "*" && pattern[i + 1] === "*" && pattern[i + 2] === "/") {
      source += "(?:.*/)?"; // "**/" matches zero or more directories
      i += 2;
    } else if (char === "*" && pattern[i + 1] === "*") {
      source += ".*";
      i++;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

/** A predicate that is true when `value` matches any of `patterns`. */
export function matcher(patterns: readonly string[]): (value: string) => boolean {
  const expressions = patterns.map(globToRegExp);
  return (value) => expressions.some((expression) => expression.test(value));
}
