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

### Import GitHub repositories

Import repositories using a search query (uses the same syntax as GitHub's search bar):
```bash
nut import --query "owner:stefreak language:rust -fork:only -archived:true"
```

More query examples:
```bash
# Import all JavaScript and TypeScript repos from an org, excluding archived repos
nut import --query "org:actions language:JavaScript,TypeScript -fork:only -archived:true"

# Import all public repositories from a user
nut import --query "user:stefreak is:public"

# Import repositories with specific topics
nut import --query "topic:cli user:stefreak"
```

You can use the same search syntax as on [github.com/search](https://github.com/search).

Import specific repositories by name:
```bash
nut import owner/repository
nut import owner/repo1 owner/repo2 owner/repo3
```

Parallelized import with dry-run:
```bash
nut import --dry-run --query "org:myorg" | xargs -n1 -P8 nut import
```

Nut will automatically discover a GitHub token if you have the official GitHub CLI `gh` installed and ran `gh auth login` before.
It will respect other decisions you made when configuring `gh`, for instance will use the configured git clone protocol (`ssh` or `http`).

### Status command

Check the status of all repositories in the workspace:

```bash
nut status
```

### Apply command

Run a command across all repositories in the workspace:

```bash
nut apply git commit -m "fix: foo bar"
```

You can also run a script in each repository:

```bash
nut apply --script path/to/script.sh
```

Scripts must be executable (use `chmod +x script.sh` to make them executable).

You can pass arguments to scripts as well:

```bash
nut apply --script path/to/script.sh arg1 arg2
```

In case options for your script clash with nut options, use the double dash to tell nut to stop parsing options:

```bash
nut apply --script path/to/script.sh -- --option1 --option2
```

### Other commands

- `nut cache-dir` - Print git cache directory path
- `nut data-dir` - Print data directory path that contains workspaces
- `nut workspace-dir` - Print absolute path to a specific workspace

## Tutorial

[Follow the tutorials](./TUTORIALS.md) to learn how you can use `nut` to manage changes across multiple repositories in your org.

## How it works

`nut` maintains two directories:

- **Cache directory**: Stores bare git repositories as mirrors for fast cloning
- **Data directory**: Contains individual workspaces, each with their own repository clones

When importing repositories, `nut` first creates or updates a cached bare clone, then uses `git clone --local` to create fast workspace copies. Workspaces are identified by ULID timestamps.
`nut` is smart and just knows when the cache repositories need updating.

## Feedback

I've built `nut` for myself, but if you find it interesting and you feel like you would like it to behave differently, you're welcome to open a GitHub issue.

I'd also be happy if you simply reach out because you've found it helpful.

## Development

### Running Tests

The project includes integration tests that verify the CLI behavior:

```bash
cargo test
```

### Run test version

```bash
cargo run enter <workspace-id>
```
After entering a workspace, you can refer to the test binary just using `nut` (It will update the `PATH`)

## License

The code in this repository is licensed under the MIT license.

See the [LICENSE](./LICENSE.md) file for details.
