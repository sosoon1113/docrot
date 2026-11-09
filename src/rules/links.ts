import type { Link } from "../markdown/scanner.js";
import { isExternal, type LinkTarget, parseTarget, resolveLinkPath } from "../resolve.js";
import type { RuleContext } from "./types.js";

export interface LocalLink {
  link: Link;
  target: LinkTarget;
  /** Absolute path the link points to, or `null` for same-page anchors like `#usage`. */
  resolved: string | null;
}

/** Links (or images) in the document that point inside the project. */
export function* localLinks(context: RuleContext, images: boolean): Generator<LocalLink> {
  for (const link of context.document.links) {
    if (link.image !== images || link.target === "" || isExternal(link.target)) continue;
    if (context.isIgnored(link.target)) continue;
    const target = parseTarget(link.target);
    const resolved =
      target.path === "" ? null : resolveLinkPath(context.file, target.path, context.project.root);
    yield { link, target, resolved };
  }
}
