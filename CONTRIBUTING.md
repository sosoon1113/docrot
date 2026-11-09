# Contributing to docrot

Thanks for helping keep documentation healthy! Bug reports, rule ideas and pull requests
are all welcome.

## Reporting a false positive or a missed problem

Please open an issue with:

- a minimal Markdown snippet (and the files it links to) that reproduces it,
- the output you got and the output you expected,
- your Node.js version, operating system and `docrot --version`.

False positives are treated as bugs: docrot should only complain about things that are
really broken.

## Development setup

```bash
git clone https://github.com/sosoon1113/docrot.git
cd docrot
npm install
```

## Before opening a pull request

```bash
npm run format
npm run lint
npm run typecheck
npm test
```

- Add tests for any behavior change. Most rule tests run against the sample project in the
  test fixtures folder; add a file there when you need a new scenario.
- New rules live in the rules folder under `src/` and need an id, a description and a default
  severity. Register them in the rules index and add the id to `RuleId`.
- Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md).

CI runs the same checks on Linux, Windows and macOS, and runs docrot on this repository's
own documentation.
