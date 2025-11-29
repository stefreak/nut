# nut 🔩

A workspace manager for working with multiple GitHub repositories simultaneously.

## Overview

`nut` creates isolated workspaces for organizing and managing clones of GitHub repositories. The `import` command uses a local cache reduce cloning time to a minimum.

_This package is experimental and not feature complete._

## Installation

### Cargo

[Install cargo by following the instructions in the cargo book](https://doc.rust-lang.org/cargo/getting-started/installation.html), then install the `nut-workspace` crate:

```bash
cargo install nut-workspace
```

## Usage

```bash
nut --help
```

### Create a workspace

```bash
nut create --description "Description of your workspace"
```

This creates a new workspace and starts a shell session within it.

### List workspaces

```bash
nut list
```

### Enter an existing workspace

```bash
nut enter <workspace-id>
```

### Import repositories

Import a single repository:
```bash
nut import --user <username> --repo <repository> --github-token <token>
```

Import all repositories from a user:
```bash
nut import --user <username> --github-token <token>
```

Import all repositories from an organization:
```bash
nut import --org <organization> --github-token <token>
```

### Status command

Check the status of all repositories in the workspace:

```bash
nut status
```

### Other commands

- `nut cache-dir` - Print git cache directory path
- `nut data-dir` - Print workspace data directory path

#### Not implemented yet
- `nut reset` - Reset changes in workspace
- `nut commit --message <msg>` - Commit changes
- `nut submit [--branch <name>] [--create-pr]` - Submit changes

## How it works

`nut` maintains two directories:

- **Cache directory**: Stores bare git repositories as mirrors for fast cloning
- **Data directory**: Contains individual workspaces, each with their own repository clones

When importing repositories, `nut` first creates or updates a cached bare clone, then uses `git clone --local` to create fast workspace copies. Workspaces are identified by ULID timestamps.
`nut` is smart and just knows when the cache repositories need updating.

## Development

### Running Tests

The project includes integration tests that verify the CLI behavior:

```bash
cargo test
```

For more information about the testing strategy, see [tests/README.md](tests/README.md).

### Building

```bash
cargo build --release
```

## License

See LICENSE file for details.
