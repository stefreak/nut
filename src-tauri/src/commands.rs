//! Tauri command handlers that expose nut-core functionality to the frontend

use nut_core::{CreateWorkspaceRequest, ImportProgress, ImportRequest, WorkspaceInfo};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Information about a repository in a workspace
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RepositoryInfo {
    pub name: String,
    pub owner: String,
    pub branch: String,
    pub has_changes: bool,
    pub path: String,
}

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

/// List repositories in a workspace
#[tauri::command]
#[specta::specta]
pub async fn list_workspace_repositories(
    workspace_id: String,
) -> Result<Vec<RepositoryInfo>, String> {
    use nut_core::git;
    
    // Resolve workspace path from ID
    let data_local_dir = nut_core::dirs::get_data_local_dir()
        .await
        .map_err(|e| e.to_string())?;
    let workspace_path = data_local_dir.join(&workspace_id);
    
    if !workspace_path.exists() {
        return Err(format!("Workspace not found: {}", workspace_id));
    }
    
    // Find all repositories
    let repos = git::find_repositories(&workspace_path)
        .map_err(|e| e.to_string())?;
    
    // Get status for each repository
    let mut repo_infos = Vec::new();
    for repo_path in repos {
        if let Some(status) = git::get_repo_status(&workspace_path, &repo_path).await {
            let path_str = repo_path.to_string_lossy().to_string();
            let parts: Vec<&str> = path_str.split('/').collect();
            let (owner, name) = if parts.len() >= 2 {
                (parts[0].to_string(), parts[1].to_string())
            } else {
                ("unknown".to_string(), path_str.clone())
            };
            
            repo_infos.push(RepositoryInfo {
                name,
                owner,
                branch: status.current_branch,
                has_changes: status.has_changes,
                path: path_str,
            });
        }
    }
    
    Ok(repo_infos)
}

/// Import repositories into a workspace
#[tauri::command]
#[specta::specta]
pub async fn import_repositories(
    request: ImportRequest,
) -> Result<Vec<ImportProgress>, String> {
    use nut_core::{git, gh};
    
    let mut progress: Vec<ImportProgress> = Vec::new();
    
    // Resolve workspace path from ID
    let data_local_dir = nut_core::dirs::get_data_local_dir()
        .await
        .map_err(|e| e.to_string())?;
    let workspace_path = data_local_dir.join(&request.workspace_id);
    
    if !workspace_path.exists() {
        return Err(format!("Workspace not found: {}", request.workspace_id));
    }
    
    // Get GitHub token
    let token = gh::get_auth_token()
        .await
        .ok_or_else(|| "GitHub authentication required. Please run 'gh auth login'".to_string())?;
    
    // Create octocrab instance with token
    let crab = octocrab::Octocrab::builder()
        .user_access_token(token.into_boxed_str())
        .build()
        .map_err(|e| format!("Failed to create GitHub client: {}", e))?;
    
    // Collect repositories to import
    let mut repos_to_import: Vec<octocrab::models::Repository> = Vec::new();
    
    // Handle query-based search
    if let Some(query) = &request.query {
        let mut page = crab
            .search()
            .repositories(query)
            .send()
            .await
            .map_err(|e| format!("GitHub search failed: {}", e))?;
        
        loop {
            repos_to_import.extend(page.items);
            
            page = match crab
                .get_page::<octocrab::models::Repository>(&page.next)
                .await
                .map_err(|e| format!("Failed to fetch next page: {}", e))?
            {
                Some(next_page) => next_page,
                None => break,
            };
        }
    }
    
    // Handle specific repository names
    for full_name in &request.repository_names {
        let parts: Vec<&str> = full_name.split('/').collect();
        if parts.len() != 2 {
            progress.push(ImportProgress {
                repository: full_name.clone(),
                status: "error".to_string(),
                message: Some(format!("Invalid repository name format: {}", full_name)),
            });
            continue;
        }
        
        let owner = parts[0];
        let repo_name = parts[1];
        
        match crab.repos(owner, repo_name).get().await {
            Ok(repo_details) => repos_to_import.push(repo_details),
            Err(e) => {
                progress.push(ImportProgress {
                    repository: full_name.clone(),
                    status: "error".to_string(),
                    message: Some(format!("Failed to fetch repository info: {}", e)),
                });
            }
        }
    }
    
    // Process each repository
    for repo_details in repos_to_import {
        let full_name = repo_details.full_name
            .clone()
            .unwrap_or_else(|| format!("unknown/repo"));
        
        // Skip if dry run
        if request.dry_run {
            progress.push(ImportProgress {
                repository: full_name.clone(),
                status: "dry_run".to_string(),
                message: Some("Would be imported".to_string()),
            });
            continue;
        }
        
        // Start cloning
        progress.push(ImportProgress {
            repository: full_name.clone(),
            status: "cloning".to_string(),
            message: None,
        });
        
        // Get default branch and latest commit
        let default_branch = repo_details.default_branch.as_ref();
        let latest_commit = if let Some(branch) = default_branch {
            let owner = repo_details.owner.as_ref()
                .and_then(|o| Some(o.login.as_str()))
                .unwrap_or("unknown");
            let repo_name = repo_details.name.as_str();
            
            crab.repos(owner, repo_name)
                .list_commits()
                .branch(branch)
                .send()
                .await
                .ok()
                .and_then(|mut commits| {
                    commits.take_items().first().map(|c| c.sha.clone())
                })
        } else {
            None
        };
        
        // Clone the repository
        match git::clone(
            &workspace_path,
            &full_name,
            &latest_commit,
            &default_branch.map(|s| s.to_string()),
        ).await {
            Ok(_) => {
                // Update progress to done
                if let Some(last) = progress.last_mut() {
                    if last.repository == full_name {
                        last.status = "done".to_string();
                        last.message = Some("Successfully cloned".to_string());
                    }
                }
            }
            Err(e) => {
                // Update progress with error
                if let Some(last) = progress.last_mut() {
                    if last.repository == full_name {
                        last.status = "error".to_string();
                        last.message = Some(format!("Clone failed: {}", e));
                    }
                }
            }
        }
    }
    
    Ok(progress)
}
