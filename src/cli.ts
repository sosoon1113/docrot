import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Command, CommanderError } from "commander";
import { check } from "./checker.js";
import { CONFIG_FILES, loadConfig, starterConfig } from "./config.js";
import { DocrotError } from "./errors.js";
import { findMarkdownFiles } from "./files.js";
import { createColors, supportsColor } from "./reporters/colors.js";
import { formatPretty } from "./reporters/pretty.js";
import { rules } from "./rules/index.js";

export const VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

/** Where the CLI reads and writes; swapped out in tests. */
export interface CliIo {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  color: boolean;
}

interface CheckFlags {
  root: string;
  config?: string;
  quiet?: boolean;
}

export const EXIT_OK = 0;
export const EXIT_PROBLEMS = 1;
export const EXIT_USAGE = 2;

/** Run docrot with `argv` (without the node/script prefix) and return the exit code. */
export async function main(argv: readonly string[], io: CliIo = processIo()): Promise<number> {
  let exitCode = EXIT_OK;

  const program = new Command("docrot")
    .description("Find stale documentation: broken links, missing anchors and outdated paths.")
    .version(VERSION, "-v, --version")
    .argument("[paths...]", "Markdown files or directories to check (default: whole project)")
    .option("--root <dir>", "project root; links starting with / resolve against it", ".")
    .option("-c, --config <file>", `config file (default: ${CONFIG_FILES.join(" or ")} in the root)`)
    .option("-q, --quiet", "only report errors, not warnings")
    .showHelpAfterError("(run docrot --help for usage)")
    .exitOverride()
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr })
    .action((paths: string[], flags: CheckFlags) => {
      exitCode = runCheck(paths, flags, io);
    });

  program
    .command("init")
    .description(`write a starter ${CONFIG_FILES[0]} to the current directory`)
    .option("-f, --force", "overwrite an existing config file")
    .action((flags: { force?: boolean }) => {
      exitCode = runInit(flags, io);
    });

  program
    .command("rules")
    .description("list the available rules")
    .action(() => {
      exitCode = runRules(io);
    });

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? EXIT_OK : EXIT_USAGE;
    }
    if (error instanceof DocrotError) {
      io.stderr(`docrot: ${error.message}\n`);
      return EXIT_USAGE;
    }
    throw error;
  }
  return exitCode;
}

function runCheck(paths: string[], flags: CheckFlags, io: CliIo): number {
  const root = path.resolve(io.cwd, flags.root);
  const { config } = loadConfig(root, flags.config && path.resolve(io.cwd, flags.config));
  const files = findMarkdownFiles({
    root,
    paths: paths.map((p) => path.resolve(io.cwd, p)),
    include: config.include,
    exclude: config.exclude,
  });
  if (files.length === 0) {
    throw new DocrotError("no Markdown files found");
  }

  const result = check({
    root,
    files,
    settings: config.rules,
    ignoreTargets: config.ignoreTargets,
  });
  const shown = flags.quiet ? result.findings.filter((f) => f.severity === "error") : result.findings;
  io.stdout(formatPretty(shown, { filesChecked: result.filesChecked }, { color: io.color }));

  return result.findings.some((f) => f.severity === "error") ? EXIT_PROBLEMS : EXIT_OK;
}

function runInit(flags: { force?: boolean }, io: CliIo): number {
  const file = path.join(io.cwd, CONFIG_FILES[0]);
  if (existsSync(file) && !flags.force) {
    throw new DocrotError(`${CONFIG_FILES[0]} already exists (use --force to overwrite)`);
  }
  writeFileSync(file, `${JSON.stringify(starterConfig(), null, 2)}\n`);
  io.stdout(`Wrote ${CONFIG_FILES[0]}\n`);
  return EXIT_OK;
}

function runRules(io: CliIo): number {
  const c = createColors(io.color);
  const width = Math.max(...rules.map((rule) => rule.id.length));
  for (const rule of rules) {
    const severity = rule.defaultSeverity.padEnd(7);
    io.stdout(`${c.bold(rule.id.padEnd(width))}  ${c.dim(severity)}  ${rule.description}\n`);
  }
  return EXIT_OK;
}

function processIo(): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    color: supportsColor(process.stdout),
  };
}
