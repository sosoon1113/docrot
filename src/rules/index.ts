import { brokenLink } from "./brokenLink.js";
import { missingImage } from "./missingImage.js";
import type { Rule } from "./types.js";

export type { Report, Rule, RuleContext } from "./types.js";

/** Every built-in rule, in the order they run. */
export const rules: readonly Rule[] = [brokenLink, missingImage];
