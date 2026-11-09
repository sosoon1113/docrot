import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DocrotError } from "./errors.js";
import { DEFAULT_INCLUDE } from "./files.js";
import { rules } from "./rules/index.js";
import type { RuleId, Severity } from "./types.js";
import { closestMatch } from "./util/suggest.js";

export type RuleSetting = Severity | "off";
export type RuleSettings = Partial<Record<RuleId, RuleSetting>>;

export interface Config {
  /** Globs (relative to the root) of files to check. */
  include: string[];
  /** Globs (relative to the root) of files to skip. */
  exclude: string[];
  /** Link targets to skip, matched as written, e.g. `docs/api/**` or `/generated/*`. */
  ignoreTargets: string[];
  /** Severity overrides per rule; `"off"` disables a rule. */
  rules: RuleSettings;
}

/** Looked up, in this order, in the project root. */
export const CONFIG_FILES = [".docrotrc.json", "docrot.config.json"] as const;

export function defaultConfig(): Config {
  return { include: [...DEFAULT_INCLUDE], exclude: [], ignoreTargets: [], rules: {} };
}

export interface LoadedConfig {
  config: Config;
  /** File the config came from, or `null` when the defaults are used. */
  path: string | null;
}

/** Load the config from `explicitPath`, or from a config file in `root` if there is one. */
export function loadConfig(root: string, explicitPath?: string): LoadedConfig {
  const file =
    explicitPath ??
    CONFIG_FILES.map((name) => path.join(root, name)).find((candidate) => existsSync(candidate));
  if (file === undefined) return { config: defaultConfig(), path: null };

  const name = path.basename(file);
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new DocrotError(`cannot read config file '${name}'`);
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new DocrotError(`${name} is not valid JSON: ${reason}`);
  }
  return { config: parseConfig(value, name), path: file };
}

const KEYS = ["include", "exclude", "ignoreTargets", "rules"] as const;
const SETTINGS: readonly RuleSetting[] = ["error", "warning", "off"];

/** Validate a parsed config object and fill in defaults. */
export function parseConfig(value: unknown, source = "config"): Config {
  const fail = (message: string): never => {
    throw new DocrotError(`${source}: ${message}`);
  };
  if (!isRecord(value)) fail("expected a JSON object");
  const input = value as Record<string, unknown>;

  for (const key of Object.keys(input)) {
    if (key === "$schema" || (KEYS as readonly string[]).includes(key)) continue;
    const suggestion = closestMatch(key, KEYS);
    fail(`unknown option '${key}'${suggestion ? ` (did you mean '${suggestion}'?)` : ""}`);
  }

  const config = defaultConfig();
  for (const key of ["include", "exclude", "ignoreTargets"] as const) {
    const list = input[key];
    if (list === undefined) continue;
    if (!Array.isArray(list) || !list.every((item) => typeof item === "string")) {
      fail(`'${key}' must be an array of strings`);
    }
    config[key] = [...(list as string[])];
  }

  if (input.rules !== undefined) {
    if (!isRecord(input.rules)) fail("'rules' must be an object");
    const ids = rules.map((rule) => rule.id);
    for (const [id, setting] of Object.entries(input.rules as Record<string, unknown>)) {
      if (!(ids as string[]).includes(id)) {
        const suggestion = closestMatch(id, ids);
        fail(`unknown rule '${id}'${suggestion ? ` (did you mean '${suggestion}'?)` : ""}`);
      }
      if (!SETTINGS.includes(setting as RuleSetting)) {
        fail(`rule '${id}' must be "error", "warning" or "off"`);
      }
      config.rules[id as RuleId] = setting as RuleSetting;
    }
  }

  return config;
}

/** The config `docrot init` writes: defaults with every rule spelled out. */
export function starterConfig(): Config {
  const config = defaultConfig();
  for (const rule of rules) config.rules[rule.id] = rule.defaultSeverity;
  return config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
