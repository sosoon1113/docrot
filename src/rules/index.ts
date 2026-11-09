import { brokenLink } from "./brokenLink.js";
import { missingAnchor } from "./missingAnchor.js";
import { missingImage } from "./missingImage.js";
import { staleCodePath } from "./staleCodePath.js";
import type { Rule } from "./types.js";
import { undefinedReference } from "./undefinedReference.js";

export type { Report, Rule, RuleContext } from "./types.js";

/** Every built-in rule, in the order they run. */
export const rules: readonly Rule[] = [
  brokenLink,
  missingAnchor,
  missingImage,
  undefinedReference,
  staleCodePath,
];
