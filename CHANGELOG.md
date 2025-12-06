# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1](https://github.com/stefreak/nut/compare/v0.3.0...v0.3.1) - 2025-12-06

### <!-- 2 -->Performance

- process git status checks concurrently for better performance

### Refactor

- eliminate duplication and complexity through abstraction ([#32](https://github.com/stefreak/nut/pull/32))

## [0.3.0](https://github.com/stefreak/nut/compare/v0.2.3...v0.3.0) - 2025-12-01

### <!-- 0 -->New features

- [**breaking**] *(import)* replace `--skip-*` and `--include-*` options with `--query` option supporting the full GitHub search syntax ([#29](https://github.com/stefreak/nut/pull/29))

## [0.2.3](https://github.com/stefreak/nut/compare/v0.2.2...v0.2.3) - 2025-11-30

### <!-- 0 -->New features

- *(import)* allow positional arguments with full repo path and implement `--dry-run` option. This allows to paralellize imports using `xargs` until we implement parallelization natively.

## [0.2.2](https://github.com/stefreak/nut/compare/v0.2.1...v0.2.2) - 2025-11-30

### <!-- 1 -->Bug fixes

- *(import)* allow combining `--org` and `--repo`

### Refactor

- remove unnecessary NO_COLOR code

## [0.2.1](https://github.com/stefreak/nut/compare/v0.2.0...v0.2.1) - 2025-11-30

### <!-- 0 -->New features

- add repository filtering options to nut import ([#21](https://github.com/stefreak/nut/pull/21))

### <!-- 1 -->Bug fixes

- pass github host to `gh get config` to make sure we use the correct git protocol

### <!-- 3 -->Documentation

- add tutorial with commands for managing pull requests

## [0.2.0](https://github.com/stefreak/nut/compare/v0.1.3...v0.2.0) - 2025-11-30

### <!-- 0 -->New features

- [**breaking**] only determine current workspace based on current directory or explicit option
- introduce `apply` command for running commands in all repositories in a workspace ([#14](https://github.com/stefreak/nut/pull/14))
- integrate official GitHub (`gh`) CLI for protocol config and token auto-discovery ([#15](https://github.com/stefreak/nut/pull/15))

### <!-- 1 -->Bug fixes

- improve UX and fix several issues in AI generated code

### <!-- 4 -->Miscellaneous

- Implement automated Clippy and code formatting in GitHub Actions ([#13](https://github.com/stefreak/nut/pull/13))

### Refactor

- remove unsafe blocks and global state manipulation ([#18](https://github.com/stefreak/nut/pull/18))

## [0.1.3](https://github.com/stefreak/nut/compare/v0.1.2...v0.1.3) - 2025-11-29

### <!-- 0 -->New features

- improves error messages and adds NO_COLOR support ([#9](https://github.com/stefreak/nut/pull/9))

## [0.1.2](https://github.com/stefreak/nut/compare/v0.1.1...v0.1.2) - 2025-11-29

### <!-- 1 -->Features
- improve list command output with better formatting and date ordering

### <!-- 3 -->Documentation

- add "Documentation" as change category to release notes
- reduce noise
- add instalation instructions and experimental note

## [0.1.1](https://github.com/stefreak/nut/compare/v0.1.0...v0.1.1) - 2025-11-29

### Fixed

- revert binary name to be `nut` after package has been named `nut-workspace`
