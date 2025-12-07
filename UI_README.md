# Nut UI

The Nut workspace manager now includes a graphical user interface built with [iced](https://github.com/iced-rs/iced).

## Running the UI

To start the UI application, run:

```bash
cargo run --bin nut-ui
```

Or if you have installed nut-workspace globally:

```bash
nut-ui
```

## Features

The UI provides three main panels:

### Workspaces Panel
- **List workspaces**: View all your workspaces in a dropdown
- **Select workspace**: Click on a workspace to view its repositories and processes
- **Create workspace**: Enter a description and click "Create" to create a new workspace
- **Delete workspace**: Select a workspace and click "Delete Workspace" to remove it

### Repositories Panel
- **Clone repositories**: Enter a repository name (e.g., `owner/repo`) and click "Clone"
- **View status**: See all repositories with their branch, staged/modified/untracked file counts
- **Refresh status**: Click "Refresh Status" to update repository status information
- **Commit changes**: Enter a commit message and click "Commit" to commit all changes across all repositories in the workspace

### Processes Panel
- **View processes**: See all processes running within the selected workspace
- **Process metrics**: View CPU usage (percentage) and memory usage (MB) for each process
- **Kill processes**: Click "Kill" next to any process to terminate it
- **Refresh processes**: Click "Refresh" to update the process list

## Status Bar

At the bottom of the UI, a status bar displays:
- Selected workspace information
- Operation results (successful clones, commits, etc.)
- Error messages if operations fail

## Theme

The UI uses a dark theme by default for comfortable viewing.

## Requirements

The UI requires a graphical environment to run. It is built on top of the wgpu rendering backend and supports:
- Linux (X11 and Wayland)
- macOS
- Windows

## Development

The UI code is located in:
- `src/ui/mod.rs` - Main UI application logic
- `src/ui_main.rs` - UI entry point
- `src/processes.rs` - Process tracking functionality

The UI shares the same core functionality as the CLI tool, ensuring consistency between the two interfaces.
