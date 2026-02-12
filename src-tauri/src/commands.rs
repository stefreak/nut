//! Tauri command handlers that expose nut-core functionality to the frontend

use nut_core::{CreateWorkspaceRequest, ImportProgress, ImportRequest, WorkspaceInfo};

/// List all workspaces
#[tauri::command]
#[specta::specta]
pub async fn list_workspaces() -> Result<Vec<WorkspaceInfo>, String> {
    nut_core::workspace::list_workspaces()
        .await
        .map_err(|e| e.to_string())
}

/// Create a new workspace
#[tauri::command]
#[specta::specta]
pub async fn create_workspace(
    request: CreateWorkspaceRequest,
) -> Result<WorkspaceInfo, String> {
    let ws = nut_core::workspace::create_workspace(request.description.clone())
        .await
        .map_err(|e| e.to_string())?;
    
    // Convert Workspace to WorkspaceInfo
    use chrono::{DateTime, Utc};
    let datetime: DateTime<Utc> = ws.id.datetime().into();
    Ok(WorkspaceInfo {
        id: ws.id.to_string(),
        created_at: datetime.to_rfc3339(),
        description: request.description,
        path: ws.path.to_string_lossy().to_string(),
    })
}

/// Import repositories into a workspace
#[tauri::command]
#[specta::specta]
pub async fn import_repositories(
    _request: ImportRequest,
) -> Result<Vec<ImportProgress>, String> {
    // TODO: Implement import functionality with progress callbacks
    // This is a placeholder that will be implemented in T045
    Ok(vec![])
}
