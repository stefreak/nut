# nut 🔩

A workspace manager for working with multiple GitHub repositories simultaneously.

## Overview

`nut` creates isolated workspaces for organizing and managing clones of GitHub repositories. It uses a local cache to optimize cloning operations and provides commands for workspace lifecycle management.

## Installation

```bash
cargo build --release
```

## Usage

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

### Other commands

- `nut cache-dir` - Print git cache directory path
- `nut data-dir` - Print workspace data directory path

#### Not implemented yet
- `nut status` - Show workspace status
- `nut reset` - Reset changes in workspace
- `nut commit --message <msg>` - Commit changes
- `nut submit [--branch <name>] [--create-pr]` - Submit changes

## How it works

`nut` maintains two directories:

- **Cache directory**: Stores bare git repositories as mirrors for fast cloning
- **Data directory**: Contains individual workspaces, each with their own repository clones

When importing repositories, `nut` first creates or updates a cached bare clone, then uses `git clone --local` to create fast workspace copies. Workspaces are identified by ULID timestamps.
`nut` is smart and just knows when the cache repositories need updating.

## License

See LICENSE file for details.
