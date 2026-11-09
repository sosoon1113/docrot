import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main, VERSION } from "../src/cli.js";
import { fixtureRoot } from "./helpers.js";

async function run(args: string[], options: { color?: boolean; cwd?: string } = {}) {
  let stdout = "";
  let stderr = "";
  const code = await main(args, {
    cwd: options.cwd ?? fixtureRoot,
    color: options.color ?? false,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

describe("docrot CLI", () => {
  it("checks the whole project by default", async () => {
    const { code, stdout } = await run([]);
    expect(code).toBe(1);
    expect(stdout).toContain("README.md\n");
    expect(stdout).toContain("docs/references.md\n");
    expect(stdout).toMatch(/13 problems \(11 errors, 2 warnings\) in 3 files, 4 files checked\n$/);
  });

  it("prints findings grouped by file with aligned positions", async () => {
    const { stdout } = await run(["docs/guide.md"]);
    expect(stdout).toBe(
      [
        "docs/guide.md",
        "  7:12   error    link target './setup.md' does not exist  broken-link",
        "  15:19  warning  'lib/legacy.js' is mentioned in inline code but does not exist  stale-code-path",
        "  15:39  warning  '../tools/build.sh' is mentioned in inline code but does not exist  stale-code-path",
        "",
        "3 problems (1 error, 2 warnings) in 1 file, 1 file checked",
        "",
      ].join("\n"),
    );
  });

  it("exits 0 when nothing is wrong", async () => {
    const { code, stdout } = await run(["docs/my notes.md"]);
    expect(code).toBe(0);
    expect(stdout).toBe("No problems found in 1 file.\n");
  });

  it("accepts directories", async () => {
    const { stdout } = await run(["docs"]);
    expect(stdout).toContain("3 files checked");
    expect(stdout).not.toContain("README.md\n");
  });

  it("uses --root for links starting with /", async () => {
    const { stdout } = await run(["README.md", "--root", "docs"]);
    expect(stdout).toContain("link target '/LICENSE.txt' does not exist");
  });

  it("colors output when asked to", async () => {
    const { stdout } = await run(["docs/guide.md"], { color: true });
    expect(stdout).toContain("\u001b[31merror  \u001b[39m");
  });

  it("reports usage errors with exit code 2", async () => {
    const missing = await run(["nope.md"]);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toBe("docrot: no such file or directory: 'nope.md'\n");

    const badOption = await run(["--frobnicate"]);
    expect(badOption.code).toBe(2);
    expect(badOption.stderr).toContain("unknown option '--frobnicate'");
  });

  it("lists the rules", async () => {
    const { code, stdout } = await run(["rules"]);
    expect(code).toBe(0);
    // Ids are padded to the longest one ("undefined-reference").
    expect(stdout.split("\n")[0]).toMatch(/^broken-link {10}error {4}Relative links must point/);
  });

  it("prints the version and help", async () => {
    expect(await run(["--version"])).toMatchObject({ code: 0, stdout: `${VERSION}\n` });
    const help = await run(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Usage: docrot [options] [command] [paths...]");
  });
});

describe("configuration", () => {
  let root = "";
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "docrot-cli-"));
    writeFileSync(path.join(root, "README.md"), "# Readme\n\n![shot](shot.png) [old](old.md)\n");
    writeFileSync(path.join(root, "CHANGELOG.md"), "[gone](gone.md)\n");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const writeConfig = (name: string, config: object) =>
    writeFileSync(path.join(root, name), JSON.stringify(config));

  it("reads .docrotrc.json from the root", async () => {
    writeConfig(".docrotrc.json", {
      exclude: ["CHANGELOG.md"],
      rules: { "missing-image": "warning" },
      ignoreTargets: ["old.md"],
    });
    const { code, stdout } = await run([], { cwd: root });
    expect(code).toBe(0); // only a warning is left
    expect(stdout).toContain("warning  image 'shot.png' does not exist");
    expect(stdout).toContain("1 file checked");
  });

  it("hides warnings with --quiet", async () => {
    writeConfig(".docrotrc.json", { rules: { "missing-image": "warning", "broken-link": "off" } });
    expect((await run(["--quiet"], { cwd: root })).stdout).toBe("No problems found in 2 files.\n");
  });

  it("accepts --config", async () => {
    writeConfig("strict.json", { rules: { "broken-link": "off", "missing-image": "off" } });
    const { code } = await run(["--config", "strict.json"], { cwd: root });
    expect(code).toBe(0);
  });

  it("reports config errors with exit code 2", async () => {
    writeConfig(".docrotrc.json", { rulez: {} });
    const { code, stderr } = await run([], { cwd: root });
    expect(code).toBe(2);
    expect(stderr).toBe("docrot: .docrotrc.json: unknown option 'rulez' (did you mean 'rules'?)\n");
  });

  it("writes a starter config with init", async () => {
    expect(await run(["init"], { cwd: root })).toMatchObject({ code: 0, stdout: "Wrote .docrotrc.json\n" });
    const config = JSON.parse(readFileSync(path.join(root, ".docrotrc.json"), "utf8"));
    expect(config.rules["broken-link"]).toBe("error");

    const again = await run(["init"], { cwd: root });
    expect(again.code).toBe(2);
    expect(again.stderr).toContain("already exists (use --force to overwrite)");
    expect((await run(["init", "--force"], { cwd: root })).code).toBe(0);
  });
});
