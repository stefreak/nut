<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial constitution)
Added sections:
  - Core Principles (5 principles)
  - Architecture Components
  - Technology Stack
  - Governance
Removed sections: None
Templates requiring updates:
  - plan-template.md ✅ (no updates needed - compatible)
  - spec-template.md ✅ (no updates needed - compatible)
  - tasks-template.md ✅ (no updates needed - compatible)
Follow-up TODOs: None
-->

# nut Workspace Manager Constitution

## Core Principles

### I. Core-First Architecture

All shared functionality MUST be implemented in the core Rust library (`nut-core` crate) before being exposed via CLI or Tauri commands.

**Requirements**:
- Features involving workspace/repository operations MUST exist in core first
- CLI and Tauri backends act as thin adapters over core library APIs
- Core library MUST be independently testable without CLI or Tauri dependencies
- Core library MUST expose async APIs suitable for both sync CLI and async UI contexts

**Rationale**: A single source of truth eliminating logic duplication between CLI and UI, enabling independent testing and maintenance of business logic.

### II. Type Safety Across Boundaries

All data crossing Rust↔TypeScript boundaries MUST have generated type definitions with runtime validation.

**Requirements**:
- Use `typeshare` (https://github.com/1password/typeshare) to generate TypeScript types from Rust structs
- Generated types MUST NOT be committed to source control, but they are generated as part of the build process
- Tauri commands MUST use typed request/response structures (no raw `serde_json::Value` at boundaries)
- Frontend MUST import generated types—manual type duplication is forbidden
- Schema changes MUST regenerate types before merging

**Rationale**: Type drift between Rust and TypeScript causes runtime errors that are expensive to debug. Generated types catch mismatches at compile time.

### III. Security by Design

All Tauri commands MUST follow least-privilege principles with explicit permission boundaries.

**Requirements**:
- Tauri permissions MUST be explicitly declared in `tauri.conf.json` capabilities
- No direct filesystem access from the UI. Only domain-level RPC is allowed (e.g. create workspace, list workspaces)
- Direct Shell command execution is FORBIDDEN (Git `apply` is not part of the core library, but a CLI feature.). The Tasks API might indirectly call CLI commands under the hood, but great care must be taken to prevent shell injection.
- GitHub tokens MUST never be logged or exposed to frontend
- Input validation MUST occur at the Tauri command boundary before reaching core

**Rationale**: Desktop applications with shell access require defense in depth. Explicit permissions prevent accidental exposure.

### IV. Simplicity & Iteration

Favor minimal viable implementations that can be extended later over comprehensive upfront designs.

**Requirements**:
- New features SHOULD start with the smallest possible scope
- Abstractions MUST be introduced only when duplication exceeds 3 occurrences
- Configuration options MUST have sensible defaults—zero-config for common cases
- Remove dead code immediately; do not comment out "for later"
- Prefer explicit code over clever metaprogramming

**Rationale**: nut is an evolving tool. Premature abstraction creates maintenance burden. Simple code is easier to change when requirements shift.

### V. Performance & Responsiveness

The UI MUST remain responsive during all operations. Long-running tasks MUST not block the main thread.

**Requirements**:
- Repository operations (clone, fetch, status) MUST run asynchronously
- Progress feedback MUST be provided for operations exceeding 500ms
- Workspace listing and basic queries MUST complete in under 100ms
- Large batch operations SHOULD support cancellation
- Cache invalidation MUST be explicit—no unbounded memory growth

**Rationale**: Users working with many repositories expect snappy interactions. Blocking operations degrade the experience and hide progress.

## Architecture Components

The nut workspace manager consists of four integrated components:

| Component | Location | Purpose |
|-----------|----------|---------|
| **Core Library** | `crates/nut-core/` | Shared business logic for workspace, repository, and GitHub operations |
| **CLI** | `crates/nut-cli/` | Command-line interface using `clap`, thin wrapper over core |
| **Tauri Backend** | `crates/nut-ui/src` | Tauri commands exposing core functionality to frontend |
| **Tauri Frontend** | `crates/nut-ui/frontend/` | Vite + React + TypeScript desktop UI |

**Type Flow**:
```
Core Rust types → typeshare → generated/*.ts → Frontend imports
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Core | Rust |
| CLI | clap |
| Desktop | Tauri |
| Frontend | Vite + React + TypeScript |
| Type Generation | typeshare |
| GitHub API | octocrab |
| Async Runtime | tokio |

## Governance

This constitution supersedes all other development practices for the nut project.

**Amendment Process**:
1. Propose changes via PR with rationale
2. Document impact on existing code
3. Update constitution version following semver:
   - MAJOR: Principle removal or incompatible redefinition
   - MINOR: New principle or significant expansion
   - PATCH: Clarifications and non-semantic changes

**Compliance**:
- All PRs MUST verify adherence to applicable principles
- Violations MUST be documented with explicit justification
- Principle conflicts MUST escalate to constitution amendment discussion

**Version**: 1.0.0 | **Ratified**: 2026-02-12 | **Last Amended**: 2026-02-12
