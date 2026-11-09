# docrot

[![CI](https://github.com/sosoon1113/docrot/actions/workflows/ci.yml/badge.svg)](https://github.com/sosoon1113/docrot/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22.12-339933)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Find stale documentation before your readers do.**

Code moves, files get renamed, headings get reworded, and the docs quietly rot. `docrot`
scans your Markdown and reports links to files that are gone, `#anchors` that no longer
match a heading, missing images, undefined reference links, and file paths in inline code
that no longer exist. It is fast, has no network access, and fits straight into CI.

```console
$ docrot README.md docs/guide.md
README.md
  7:22   error    link target 'docs/setup.md' does not exist  broken-link
  8:17   error    link target 'api/v1.md' does not exist  broken-link
  11:1   error    image 'docs/img/screenshot.png' does not exist  missing-image
  12:1   error    image 'docs/img' does not exist  missing-image
  18:45  error    no heading matches '#instalation' in this file (did you mean '#installation'?)  missing-anchor
  22:52  error    no heading matches '#configuration' in 'docs/guide.md'  missing-anchor
  27:32  error    link target 'Docs/Guide.md' differs in letter case from 'docs/guide.md'  broken-link
  27:56  error    image 'docs/img/Logo.svg' differs in letter case from 'docs/img/logo.svg'  missing-image
  27:84  warning  'SRC/index.ts' in inline code differs in letter case from 'src/index.ts'  stale-code-path

docs/guide.md
  7:12   error    link target './setup.md' does not exist  broken-link
  15:19  warning  'lib/legacy.js' is mentioned in inline code but does not exist  stale-code-path
  15:39  warning  '../tools/build.sh' is mentioned in inline code but does not exist  stale-code-path

12 problems (9 errors, 3 warnings) in 2 files, 2 files checked
```

That is the real output for the sample project used in docrot's own tests.

## What it checks

| Rule                  | Default | Catches                                                                              |
| --------------------- | ------- | ------------------------------------------------------------------------------------ |
| `broken-link`         | error   | `[guide](docs/setup.md)` where the file or folder no longer exists                   |
| `missing-anchor`      | error   | `[usage](#usage)` or `[x](guide.md#install)` with no matching heading or HTML anchor |
| `missing-image`       | error   | `![logo](img/logo.png)` pointing at a missing file                                   |
| `undefined-reference` | error   | `[text][label]` with no `[label]: target` definition                                 |
| `stale-code-path`     | warning | Paths written in inline code that no longer exist                                    |

A few details that keep the results accurate:

- **GitHub-compatible anchors.** Heading slugs follow GitHub's rules: lowercase, punctuation
  dropped, Unicode kept, and `-1`, `-2` suffixes for repeated headings. `<a name="...">` and
  `id="..."` anchors count too, and `#top` is always valid.
- **Letter case is checked on every OS.** A link to Docs/Guide.md opens docs/guide.md on
  Windows and macOS but breaks on GitHub and Linux. docrot compares paths with the real directory listing, so
  you see the problem locally, not after you deploy.
- **Typos get suggestions.** Missing anchors and undefined references suggest the closest match.
- **No false alarms from examples.** Fenced code blocks, inline code (`` `[text](path.md)` ``),
  HTML comments and front matter are skipped. External URLs (`https:`, `mailto:`) are never
  fetched.
- **Paths work the GitHub way.** Targets are percent-decoded, `?query` strings are ignored, a
  leading `/` means the repository root, and links to folders are fine.

## Installation

docrot needs Node.js 22.12 or newer.

```bash
# run it once without installing
npx github:sosoon1113/docrot

# or install the command globally
npm install -g github:sosoon1113/docrot

# or add it to a project
npm install --save-dev github:sosoon1113/docrot
```

## Usage

```text
docrot [options] [command] [paths...]

Arguments:
  paths                  Markdown files or directories to check (default: whole project)

Options:
  -v, --version          output the version number
  --root <dir>           project root; links starting with / resolve against it (default: ".")
  -c, --config <file>    config file (default: .docrotrc.json or docrot.config.json in the root)
  -f, --format <format>  output format (choices: "pretty", "json", "github", default: "pretty")
  -q, --quiet            only report errors, not warnings
  -h, --help             display help for command

Commands:
  init [options]         write a starter .docrotrc.json to the current directory
  rules                  list the available rules
```

```bash
docrot                    # every *.md and *.markdown file in the project
docrot README.md docs/    # specific files and folders
docrot --quiet            # errors only
docrot rules              # what each rule does
```

| Exit code | Meaning                                        |
| --------- | ---------------------------------------------- |
| `0`       | No errors (warnings are allowed)               |
| `1`       | At least one error was found                   |
| `2`       | Usage problem: bad path, option or config file |

`node_modules` and `.git` are never scanned.

## Configuration

Run `docrot init` to create a `.docrotrc.json` in the project root, or write one by hand.
`docrot.config.json` works too, as does `--config <file>`.

```json
{
  "include": ["**/*.md"],
  "exclude": ["CHANGELOG.md", "docs/archive/**"],
  "ignoreTargets": ["/generated/**", "*.pdf"],
  "rules": {
    "stale-code-path": "error",
    "undefined-reference": "warning",
    "missing-image": "off"
  }
}
```

| Option          | Default                        | Description                                                 |
| --------------- | ------------------------------ | ----------------------------------------------------------- |
| `include`       | `["**/*.md", "**/*.markdown"]` | Globs of files to check, relative to the root               |
| `exclude`       | `[]`                           | Globs of files to skip                                      |
| `ignoreTargets` | `[]`                           | Link targets to skip, matched against the target as written |
| `rules`         | all defaults                   | Set a rule to `"error"`, `"warning"` or `"off"`             |

Globs support `*`, `**` and `?`. Typos in option names or rule ids are reported with a
suggestion, for example "unknown option 'exlude' (did you mean 'exclude'?)".

## Using it in CI

With `--format github`, findings show up as annotations on the pull request diff:

```yaml
# .github/workflows/docs.yml
name: Docs
on: [push, pull_request]
jobs:
  docrot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - run: npx github:sosoon1113/docrot --format github
```

This repository does the same: its CI runs docrot on its own docs.

For other tools, `--format json` prints a stable, versioned report:

```json
{
  "version": 1,
  "filesChecked": 1,
  "errorCount": 1,
  "warningCount": 2,
  "findings": [
    {
      "rule": "broken-link",
      "severity": "error",
      "file": "docs/guide.md",
      "line": 7,
      "column": 12,
      "message": "link target './setup.md' does not exist"
    }
  ]
}
```

## Programmatic use

```ts
import { check, findMarkdownFiles, formatPretty } from "docrot";

const root = process.cwd();
const files = findMarkdownFiles({ root, exclude: ["CHANGELOG.md"] });
const { findings, filesChecked } = check({
  root,
  files,
  settings: { "stale-code-path": "error" },
});

console.log(formatPretty(findings, { filesChecked }));
```

The scanner is exported too: `scanMarkdown(source)` returns the headings (with their GitHub
slugs), links, reference definitions and code spans of a Markdown string.

## Limitations

- docrot reads Markdown line by line rather than building a full CommonMark tree. Links
  that wrap onto a second line are not detected.
- External URLs are not checked; use a dedicated link checker for those.
- Anchors are only validated in Markdown files. Fragments on other files, such as GitHub's
  `#L10` line links, are ignored.

## Development

```bash
git clone https://github.com/sosoon1113/docrot.git
cd docrot
npm install

npm test               # vitest
npm run test:coverage  # with coverage
npm run lint           # biome lint + format check
npm run typecheck
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details and [CHANGELOG.md](CHANGELOG.md) for
release notes.

## License

[MIT](LICENSE) © 2026 sosoon1113
