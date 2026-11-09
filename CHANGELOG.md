# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-10

First public release.

### Added

- Markdown scanner for headings (ATX and setext), inline and reference-style links, images,
  reference definitions, inline code and HTML anchors, with line and column positions.
- GitHub-compatible heading slugs, including suffixes for duplicate headings.
- Rules: `broken-link`, `missing-anchor`, `missing-image`, `undefined-reference` and
  `stale-code-path`, with "did you mean" suggestions for anchors and reference labels.
- Letter-case mismatches between link targets and files on disk are reported on every OS.
- `docrot` CLI with `pretty`, `json` and `github` (Actions annotations) output formats,
  `--quiet`, and `init` and `rules` commands.
- `.docrotrc.json` / `docrot.config.json` configuration: include/exclude globs,
  `ignoreTargets`, and per-rule severity or `off`.
- Programmatic API: `check`, `findMarkdownFiles`, `scanMarkdown` and the reporters.

### Fixed

- Links, headings and code inside HTML comments and inline code are no longer reported.

[Unreleased]: https://github.com/sosoon1113/docrot/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sosoon1113/docrot/releases/tag/v0.1.0
