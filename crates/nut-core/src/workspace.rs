//! Workspace operations for nut.
//!
//! Provides functions for creating, listing, and resolving workspaces.

use crate::dirs;
use crate::error::{NutError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use ulid::Ulid;

/// A workspace containing multiple git repositories.
pub struct Workspace {
    /// The workspace ULID identifier.
    pub id: Ulid,
    /// The filesystem path to the workspace directory.
    pub path: PathBuf,
}

/// Information about a workspace for display purposes.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "typescript", derive(specta::Type))]
pub struct WorkspaceInfo {
    /// The workspace ULID identifier as a string.
    pub id: String,
    /// ISO-8601 formatted creation timestamp.
    pub created_at: String,
    /// User-provided description of the workspace.
    pub description: String,
    /// Filesystem path to the workspace.
    pub path: String,
}

impl Workspace {
    /// Resolve a workspace from an explicit ID or the current directory.
    ///
    /// If `workspace_arg` is provided, parses it as a ULID.
    /// Otherwise, checks if the current directory is inside a workspace.
    pub async fn resolve(workspace_arg: &Option<String>) -> Result<Self> {
        let data_local_dir = dirs::get_data_local_dir().await?;
        
        let ulid = match workspace_arg {
            Some(id) => id.parse().map_err(|e| NutError::InvalidWorkspaceId {
                id: id.clone(),
                source: e,
            })?,
            None => get_entered_workspace().await?,
        };

        let workspace_dir = data_local_dir.join(ulid.to_string());

        Ok(Workspace {
            id: ulid,
            path: workspace_dir,
        })
    }

    /// Get the workspace from the current directory.
    ///
    /// Returns the workspace ULID if currently inside a workspace directory.
    pub async fn from_current_dir() -> Result<Ulid> {
        get_entered_workspace().await
    }
}

/// Check if currently inside a workspace and return its ULID.
pub async fn get_entered_workspace() -> Result<Ulid> {
    let data_local_dir = dirs::get_data_local_dir().await?;
    let current_dir = std::env::current_dir()
        .and_then(|d| d.canonicalize())
        .map_err(|e| NutError::GetCurrentDirectoryFailed { source: e })?;

    if let Ok(stripped) = current_dir.strip_prefix(&data_local_dir) {
        let components: Vec<&std::ffi::OsStr> =
            stripped.components().map(|c| c.as_os_str()).collect();
        if !components.is_empty()
            && let Ok(ulid) = Ulid::from_string(&components[0].to_string_lossy())
        {
            return Ok(ulid);
        }
    }

    Err(NutError::NotInWorkspace {
        working_directory: current_dir.display().to_string(),
        data_directory: data_local_dir.display().to_string(),
    })
}

/// Check if currently inside any workspace.
pub async fn is_in_workspace() -> bool {
    get_entered_workspace().await.is_ok()
}

/// Create a new workspace with the given description.
///
/// Returns the created workspace.
pub async fn create_workspace(description: String) -> Result<Workspace> {
    let data_local_dir = dirs::get_data_local_dir().await?;

    let ulid = Ulid::new();

    let workspace_path = data_local_dir.join(ulid.to_string());
    let nut_dir = workspace_path.join(".nut");
    
    tokio::fs::create_dir_all(&nut_dir)
        .await
        .map_err(|e| NutError::CreateDirectoryFailed {
            path: nut_dir.clone(),
            source: e,
        })?;

    // Write description file
    let desc_path = nut_dir.join("description");
    tokio::fs::write(&desc_path, &description)
        .await
        .map_err(|e| NutError::WriteFileFailed {
            path: desc_path,
            source: e,
        })?;

    Ok(Workspace {
        id: ulid,
        path: workspace_path,
    })
}

/// List all workspaces sorted by creation time (most recent first).
pub async fn list_workspaces() -> Result<Vec<WorkspaceInfo>> {
    let data_local_dir = dirs::get_data_local_dir().await?;
    let mut entries = tokio::fs::read_dir(&data_local_dir).await.map_err(|e| {
        NutError::ReadDirectoryFailed {
            path: data_local_dir.clone(),
            source: e,
        }
    })?;

    let mut workspaces: Vec<WorkspaceInfo> = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| {
        NutError::ReadDirectoryFailed {
            path: data_local_dir.clone(),
            source: e,
        }
    })? {
        let file_type = entry.file_type().await.map_err(|e| {
            NutError::ReadDirectoryFailed {
                path: entry.path(),
                source: e,
            }
        })?;
        
        if file_type.is_dir() {
            let ulid_str = entry
                .file_name()
                .into_string()
                .map_err(|_| NutError::InvalidUtf8)?;
            
            if let Ok(ulid) = Ulid::from_string(&ulid_str) {
                let datetime: DateTime<Utc> = ulid.datetime().into();
                let desc_path = entry.path().join(".nut/description");
                let description = tokio::fs::read_to_string(&desc_path)
                    .await
                    .unwrap_or("(missing description)".to_string());
                
                workspaces.push(WorkspaceInfo {
                    id: ulid.to_string(),
                    created_at: datetime.to_rfc3339(),
                    description,
                    path: entry.path().to_string_lossy().to_string(),
                });
            }
        }
    }

    // Sort by timestamp, most recent first
    workspaces.sort_by(|a, b| {
        // Parse timestamps back for sorting
        let a_time = DateTime::parse_from_rfc3339(&a.created_at).ok();
        let b_time = DateTime::parse_from_rfc3339(&b.created_at).ok();
        b_time.cmp(&a_time)
    });

    Ok(workspaces)
}

/// Get information about a specific workspace by ID.
pub async fn get_workspace_info(workspace_id: &str) -> Result<WorkspaceInfo> {
    let ulid: Ulid = workspace_id.parse().map_err(|e| NutError::InvalidWorkspaceId {
        id: workspace_id.to_string(),
        source: e,
    })?;

    let data_local_dir = dirs::get_data_local_dir().await?;
    let workspace_path = data_local_dir.join(workspace_id);

    if !workspace_path.exists() {
        return Err(NutError::WorkspaceNotFound {
            id: workspace_id.to_string(),
        });
    }

    let datetime: DateTime<Utc> = ulid.datetime().into();
    let desc_path = workspace_path.join(".nut/description");
    let description = tokio::fs::read_to_string(&desc_path)
        .await
        .unwrap_or("(missing description)".to_string());

    Ok(WorkspaceInfo {
        id: ulid.to_string(),
        created_at: datetime.to_rfc3339(),
        description,
        path: workspace_path.to_string_lossy().to_string(),
    })
}
