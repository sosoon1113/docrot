import path from "node:path";

/** A link destination split into its parts. */
export interface LinkTarget {
  /** Decoded path without query string or fragment. Empty for same-page anchors. */
  path: string;
  /** Decoded fragment without the `#`, or `null` when there is none. */
  fragment: string | null;
}

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** URLs with a scheme (`https:`, `mailto:`...) and protocol-relative URLs are not checked. */
export function isExternal(target: string): boolean {
  return SCHEME.test(target) || target.startsWith("//");
}

export function parseTarget(target: string): LinkTarget {
  const hash = target.indexOf("#");
  const beforeHash = hash === -1 ? target : target.slice(0, hash);
  const query = beforeHash.indexOf("?");
  const rawPath = query === -1 ? beforeHash : beforeHash.slice(0, query);
  return {
    path: decode(rawPath),
    fragment: hash === -1 ? null : decode(target.slice(hash + 1)),
  };
}

/**
 * Absolute path a link points to. Like on GitHub, a leading `/` means the
 * project root rather than the filesystem root.
 */
export function resolveLinkPath(fromFile: string, linkPath: string, root: string): string {
  return linkPath.startsWith("/")
    ? path.join(root, linkPath)
    : path.resolve(path.dirname(fromFile), linkPath);
}

/** `file` relative to `root`, always using `/` separators. */
export function relativePosix(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // malformed escapes: use the text as written
  }
}
