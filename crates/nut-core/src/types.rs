//! Type definitions for TypeScript export and API boundaries

use serde::{Deserialize, Serialize};

#[cfg(feature = "typescript")]
use specta::Type;

/// Request to create a new workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "typescript", derive(Type))]
pub struct CreateWorkspaceRequest {
    /// Description for the new workspace
    pub description: String,
}

/// Request to import repositories into a workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "typescript", derive(Type))]
pub struct ImportRequest {
    /// ULID of the workspace to import into
    pub workspace_id: String,
    /// Optional GitHub search query (e.g., "owner:stefreak")
    pub query: Option<String>,
    /// List of explicit repository names (e.g., ["owner/repo"])
    pub repository_names: Vec<String>,
    /// If true, show what would be imported without cloning
    pub dry_run: bool,
}

/// Progress update during repository import
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "typescript", derive(Type))]
pub struct ImportProgress {
    /// Repository being processed
    pub repository: String,
    /// Current status (e.g., "cloning", "done", "error")
    pub status: String,
    /// Optional error message
    pub message: Option<String>,
}
