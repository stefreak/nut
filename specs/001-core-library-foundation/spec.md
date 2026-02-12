# Feature Specification: Core Library Foundation

**Feature Branch**: `001-core-library-foundation`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "Refactor repository to conform to constitution principles. Move workspace management and config functionality from CLI to core library (nut-core crate). Connect core library to Tauri frontend with type-safe boundaries. Establish foundation for listing workspaces, repositories, and creating/importing workspaces."

## Scope

### In Scope
- Create workspace (CLI + UI)
- List workspaces (CLI + UI)
- Import repositories into workspace (CLI + UI)
- Config file operations (`.nut.json`) moved to core
- Directory resolution (data dir, cache dir) moved to core

### Out of Scope (CLI-only, remain unchanged)
- `enter` command - spawns shell, makes no sense in UI
- `apply` command - runs commands in repos, CLI workflow
- `status` command - displays repo status, can be added later
- `cache-dir`, `data-dir`, `workspace-dir` info commands - remain in CLI

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Workspace via CLI (Priority: P1)

As a CLI user, I want `nut create -d "description"` to work exactly as before so existing workflows are not disrupted.

**Why this priority**: Core library must pass CLI compatibility first. This validates the refactoring didn't break existing behavior.

**Independent Test**: Run `nut create -d "test"` and verify a workspace is created with ULID, `.nut/description` file, and the command outputs the ULID.

**Acceptance Scenarios**:

1. **Given** a user runs `nut create -d "My workspace"`, **When** the command completes, **Then** a new directory with ULID name is created in the data directory containing `.nut/description` with the description text
2. **Given** a user runs `nut create -d "Test"` while already inside a workspace, **When** the command runs, **Then** an error is returned indicating already in workspace (existing behavior)
3. **Given** workspace creation succeeds, **When** no `--enter` flag behavior exists, **Then** CLI enters the workspace shell (existing behavior unchanged)

---

### User Story 2 - List Workspaces via CLI (Priority: P1)

As a CLI user, I want `nut list` to work exactly as before, displaying all workspaces with their IDs, creation dates, and descriptions.

**Why this priority**: Listing is the primary read operation. Must work identically after refactoring to core.

**Independent Test**: Create multiple workspaces, run `nut list`, verify all workspaces appear with correct metadata sorted by most recent first.

**Acceptance Scenarios**:

1. **Given** workspaces exist in the data directory, **When** user runs `nut list`, **Then** workspaces are displayed with ULID, creation timestamp (formatted as YYYY-MM-DD HH:MM:SS), and description
2. **Given** no workspaces exist, **When** user runs `nut list`, **Then** nothing is output (no error, just empty)
3. **Given** multiple workspaces exist, **When** user runs `nut list`, **Then** workspaces are sorted by creation time, most recent first

---

### User Story 3 - Import Repositories via CLI (Priority: P1)

As a CLI user, I want `nut import` to work exactly as before, supporting both search queries and explicit repository names.

**Why this priority**: Import is the primary write operation for populating workspaces. Must work identically after refactoring.

**Independent Test**: Run `nut import owner/repo` and `nut import -q "owner:X"` and verify repositories are cloned correctly.

**Acceptance Scenarios**:

1. **Given** a workspace is entered, **When** user runs `nut import owner/repo`, **Then** the repository is cloned into the workspace at `owner/repo` path
2. **Given** a workspace is entered, **When** user runs `nut import -q "owner:stefreak"`, **Then** all matching repositories are cloned, with each repo name printed before cloning
3. **Given** `--dry-run` flag is passed, **When** import runs, **Then** repository names are printed but no cloning occurs
4. **Given** both `-q` and positional repo names are provided, **When** command runs, **Then** an error is returned (mutually exclusive)
5. **Given** neither `-q` nor positional args, **When** command runs, **Then** an error is returned
6. **Given** no GitHub token available (no `--github-token` and `gh auth` fails), **When** import runs, **Then** a helpful error message is shown

---

### User Story 4 - List Workspaces in Desktop UI (Priority: P2)

As a desktop user, I want to see all my workspaces listed in the application matching what `nut list` shows.

**Why this priority**: First UI story. Validates the complete Rust→TypeScript type generation flow.

**Independent Test**: Create workspaces via CLI, launch Tauri app, verify workspaces appear with same data as `nut list` output.

**Acceptance Scenarios**:

1. **Given** workspaces exist (created via CLI), **When** the desktop app opens, **Then** workspaces appear in a list with ID, creation date, and description matching CLI output
2. **Given** no workspaces exist, **When** the desktop app opens, **Then** an empty state is shown
3. **Given** the workspace list is displayed, **When** a workspace is clicked, **Then** the workspace is selected (no additional functionality required)

---

### User Story 5 - Create Workspace in Desktop UI (Priority: P2)

As a desktop user, I want to create a new workspace by entering a description, matching `nut create -d` functionality.

**Why this priority**: Write operation via UI. Validates Tauri command invocation and response handling.

**Independent Test**: Click create, enter description, verify workspace appears in UI list and exists on disk.

**Acceptance Scenarios**:

1. **Given** user clicks "Create Workspace" and enters a description, **When** creation completes, **Then** workspace is created on disk and appears in the workspace list
2. **Given** workspace creation fails (e.g., permissions), **When** error occurs, **Then** user sees an error message
3. **Given** workspace is created, **When** viewing with `nut list` in CLI, **Then** the new workspace appears (CLI/UI consistency)

---

### User Story 6 - Import Repositories in Desktop UI (Priority: P3)

As a desktop user, I want to import repositories into a workspace using a search query, matching `nut import -q` functionality.

**Why this priority**: Most complex UI operation. Lower priority as users can use CLI for import initially.

**Independent Test**: Select workspace, enter query, click import, verify repositories appear on disk.

**Acceptance Scenarios**:

1. **Given** a workspace is selected, **When** user enters a search query and clicks import, **Then** matching repositories are cloned to the workspace
2. **Given** import is running, **When** repositories are being cloned, **Then** progress is shown (repository names as they complete)
3. **Given** import fails for a repository, **When** error occurs, **Then** the error is shown but other imports continue
4. **Given** "dry run" is checked, **When** import runs, **Then** matching repository names are shown without cloning

---

### Edge Cases

- What happens when the workspace directory from `.nut.json` doesn't exist? → Create it (existing behavior)
- What happens when `.nut.json` doesn't exist? → Error prompting to run `nut config --workspace-dir` (existing behavior)
- How is concurrent CLI+UI access handled? → File system is source of truth; UI refreshes on focus
- What if ULID directory exists but `.nut/description` is missing? → Show "(missing description)" (existing behavior)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Core library (`nut-core` crate) MUST encapsulate: workspace creation, workspace listing, repository import, config loading/saving, directory resolution
- **FR-002**: Core library MUST expose async APIs returning typed Result values
- **FR-003**: CLI MUST call core library for create, list, and import commands—no direct filesystem/git operations in CLI for these
- **FR-004**: CLI behavior MUST be identical before and after refactoring (no user-visible changes)
- **FR-005**: Tauri backend MUST expose commands wrapping core library APIs
- **FR-006**: TypeScript types MUST be generated from Rust structs using specta with tauri-specta
- **FR-007**: Frontend MUST use generated types—no manual type definitions for boundary data
- **FR-008**: `nut enter`, `nut apply`, `nut status` remain CLI-only, implemented directly in CLI crate (not in core)
- **FR-009**: Core library MUST NOT have CLI-specific dependencies (shell spawning, stdin/stdout handling)
- **FR-010**: Import progress MUST be reportable via callbacks/channels for UI progress display
- **FR-011**: Config file path MUST remain `~/.nut.json` (existing location)
- **FR-012**: Workspace ULID generation MUST occur in core library
- **FR-013**: GitHub token handling (from arg or `gh auth token`) MUST be in core library

### Key Entities

- **Workspace**: ULID identifier, description string, creation timestamp (derived from ULID), filesystem path
- **Repository**: Full name (owner/repo), local path relative to workspace
- **NutConfig**: workspace_dir path (required for operations)
- **ImportOptions**: query (Option<String>), repository_names (Vec<String>), dry_run (bool), github_token (Option<String>)
- **ImportResult**: repository name, success/failure, error message if failed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing CLI integration tests pass without modification
- **SC-002**: `nut create`, `nut list`, `nut import` produce byte-identical output before and after refactoring
- **SC-003**: Desktop app displays workspace list within 500ms of launch
- **SC-004**: Desktop app workspace creation completes within 1 second
- **SC-005**: 100% of types crossing Rust↔TypeScript boundary have generated definitions
- **SC-006**: Core library has unit tests for all public functions
- **SC-007**: Import progress updates are emitted at least once per repository

## Assumptions

- Tauri 2.x is used for desktop application
- Existing ULID-based identification is preserved
- Existing directory structure (data dir from config, cache dir from system) is preserved
- `gh` CLI availability for token discovery is optional convenience
- Import runs sequentially (parallelization is future work)
- UI styling uses existing user-interface components
