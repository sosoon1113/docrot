import { describe, expect, it } from "vitest";
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
    expect(stdout).toMatch(/11 problems \(11 errors, 0 warnings\) in 3 files, 4 files checked\n$/);
  });

  it("prints findings grouped by file with aligned positions", async () => {
    const { stdout } = await run(["docs/guide.md"]);
    expect(stdout).toBe(
      [
        "docs/guide.md",
        "  7:12  error    link target './setup.md' does not exist  broken-link",
        "",
        "1 problem (1 error, 0 warnings) in 1 file, 1 file checked",
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

  it("prints the version and help", async () => {
    expect(await run(["--version"])).toMatchObject({ code: 0, stdout: `${VERSION}\n` });
    const help = await run(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Usage: docrot [options] [paths...]");
  });
});
