# Service Layer for Tauri Integration

This service layer provides an abstraction between the React frontend and backend operations, making it easy to integrate with Tauri.

## Current Implementation

Right now, all services return **dummy data** wrapped in Promises to simulate async operations. The application works exactly as before, but now all data operations go through this service layer.

## Integration with Tauri

To integrate with Tauri, you'll need to:

### 1. Install Tauri API

```bash
npm install @tauri-apps/api
```

### 2. Replace Service Implementations

Each service function has a comment indicating the corresponding Tauri command name. Simply replace the dummy implementation with a Tauri `invoke` call.

**Example - Before (current dummy implementation):**

```typescript
// workspaceService.ts
export async function getWorkspaces(): Promise<Workspace[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return getDummyWorkspaces();
}
```

**Example - After (Tauri implementation):**

```typescript
// workspaceService.ts
import { invoke } from '@tauri-apps/api/tauri';

export async function getWorkspaces(): Promise<Workspace[]> {
  return await invoke('get_workspaces');
}
```

### 3. Implement Tauri Commands

On the Rust/Tauri side, implement the corresponding commands:

```rust
// src-tauri/src/main.rs

#[tauri::command]
async fn get_workspaces() -> Result<Vec<Workspace>, String> {
    // Your Rust implementation here
    // Read from database, file system, etc.
    Ok(vec![])
}

#[tauri::command]
async fn create_workspace(name: String, path: String) -> Result<Workspace, String> {
    // Create workspace logic
    Ok(Workspace {
        id: generate_id(),
        name,
        path,
        created_at: get_current_timestamp(),
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspaces,
            create_workspace,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Service Organization

### `/services/types.ts`
Contains all TypeScript interfaces and types used across the application. These types should match your Rust structs.

### `/services/workspaceService.ts`
Workspace-related operations:
- `getWorkspaces()` - Get all workspaces
- `getWorkspaceData(workspaceId)` - Get detailed workspace data
- `createWorkspace(name, path)` - Create a new workspace
- `deleteWorkspace(workspaceId)` - Delete a workspace
- `renameWorkspace(workspaceId, newName)` - Rename a workspace

### `/services/repositoryService.ts`
Repository operations:
- `searchGitHubRepositories(query)` - Search for repos on GitHub
- `importRepository(workspaceId, owner, name, url)` - Clone a repository
- `getRepositoryStatus(workspaceId, repoFullName)` - Get git status
- `commitRepositories(workspaceId, options)` - Commit changes
- `executeGitCommand(workspaceId, options)` - Run arbitrary git commands
- `openInVSCode(workspaceId, repoFullName)` - Open repo in VS Code
- `pullRepositories(workspaceId, repoFullNames)` - Pull latest changes
- `pushRepositories(workspaceId, repoFullNames)` - Push changes

### `/services/packageService.ts`
Package linking and dependency management:
- `detectPackages(workspaceId)` - Scan for packages in repos
- `analyzePackageDependencies(workspaceId)` - Find linkable packages
- `linkPackage(workspaceId, options)` - Create a symlink
- `linkPackagesBatch(workspaceId, links)` - Link multiple packages
- `unlinkPackage(workspaceId, options)` - Remove a symlink
- `checkPackageLinks(workspaceId)` - Verify link status
- `importPackageRepository(workspaceId, options)` - Import dependency repo
- `buildPackage(workspaceId, repoFullName, packagePath)` - Run build command

### `/services/pullRequestService.ts`
Pull request operations:
- `getPullRequests(workspaceId, repoFullNames)` - Fetch PRs from GitHub
- `createPullRequest(...)` - Create a new PR
- `mergePullRequest(workspaceId, repoFullName, prId)` - Merge a PR
- `closePullRequest(workspaceId, repoFullName, prId)` - Close a PR

### `/services/index.ts`
Exports all services and types for easy importing:

```typescript
import { getWorkspaces, createWorkspace, type Workspace } from './services';
```

## Error Handling

When integrating with Tauri, add proper error handling:

```typescript
export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    return await invoke('get_workspaces');
  } catch (error) {
    console.error('Failed to get workspaces:', error);
    // Optionally show user-facing error message
    throw error;
  }
}
```

## Type Safety

The TypeScript types in `/services/types.ts` should be kept in sync with your Rust structs. Consider using a tool like `ts-rs` to automatically generate TypeScript types from Rust structs.

Example with ts-rs:

```rust
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
}
```

This will generate a TypeScript file that matches your Rust types exactly.

## Migration Checklist

- [ ] Install `@tauri-apps/api`
- [ ] Implement Rust commands for each service function
- [ ] Replace dummy service implementations with `invoke()` calls
- [ ] Add error handling
- [ ] Test each command individually
- [ ] Set up type generation (optional but recommended)
- [ ] Remove dummy data files from `/data` (optional - keep for development)

## Benefits of This Architecture

1. **Separation of Concerns**: UI components don't know about Tauri - they just call async functions
2. **Easy Testing**: You can mock services for testing without touching Tauri
3. **Gradual Migration**: Implement Tauri commands one at a time while keeping dummy data for the rest
4. **Type Safety**: Strong typing across the boundary between frontend and backend
5. **Flexibility**: Easy to switch between mock data (development) and real data (production)

## Development vs Production

You can even keep both implementations and switch based on an environment variable:

```typescript
const USE_TAURI = import.meta.env.VITE_USE_TAURI === 'true';

export async function getWorkspaces(): Promise<Workspace[]> {
  if (USE_TAURI) {
    return await invoke('get_workspaces');
  } else {
    // Use dummy data for development
    await new Promise(resolve => setTimeout(resolve, 50));
    return getDummyWorkspaces();
  }
}
```
