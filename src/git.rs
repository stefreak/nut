use std::path::PathBuf;
use ulid::Ulid;

use crate::error::{NutError, Result};
use crate::{dirs, enter, gh};

pub struct RepoStatus {
    pub name: String,
    pub has_changes: bool,
    pub modified_files: usize,
    pub staged_files: usize,
    pub untracked_files: usize,
    pub current_branch: String,
}

pub fn clone(
    full_name: &str,
    latest_commit: &Option<String>,
    default_branch: &Option<String>,
) -> Result<()> {
    let git_protocol = gh::get_git_protocol_with_fallback();
    let clone_url = git_protocol.to_clone_url(full_name);

    let workspace: Ulid = enter::get_entered_workspace()?;
    let workspace_dir = dirs::get_data_local_dir()?.join(workspace.to_string());
    let cache_dir = dirs::get_cache_dir()?.join("github");

    if let (Some(default_branch), Some(latest_commit)) = (default_branch, latest_commit) {
        if workspace_dir.join(full_name).exists() {
            let workspace_repo_dir = workspace_dir.join(full_name);
            std::env::set_current_dir(&workspace_repo_dir).map_err(|e| {
                NutError::ChangeDirectoryFailed {
                    path: workspace_repo_dir.clone(),
                    source: e,
                }
            })?;

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .arg("rev-parse")
                .arg(format!("origin/{default_branch}"))
                .output()
                .map_err(|e| NutError::GitCommandFailed {
                    command: "git rev-parse".to_string(),
                    source: e,
                })?;
            let cache_latest_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if cache_latest_commit != *latest_commit {
                // get current branch
                let output = std::process::Command::new("git")
                    .arg("branch")
                    .arg("--show-current")
                    .output()
                    .map_err(|e| NutError::GitCommandFailed {
                        command: "git branch".to_string(),
                        source: e,
                    })?;
                let current_branch = String::from_utf8_lossy(&output.stdout).trim().to_string();

                if current_branch != *default_branch {
                    let status = std::process::Command::new("git")
                        .arg("fetch")
                        .arg("origin")
                        .status()
                        .map_err(|e| NutError::GitCommandFailed {
                            command: "git fetch".to_string(),
                            source: e,
                        })?;
                    if !status.success() {
                        return Err(NutError::GitOperationFailed {
                            operation: "fetch origin in workspace repository".to_string(),
                        });
                    }
                } else {
                    let status = std::process::Command::new("git")
                        .arg("pull")
                        .status()
                        .map_err(|e| NutError::GitCommandFailed {
                            command: "git pull".to_string(),
                            source: e,
                        })?;
                    if !status.success() {
                        return Err(NutError::GitOperationFailed {
                            operation: "pull in workspace repository".to_string(),
                        });
                    }
                }
            }
            return Ok(());
        }

        if cache_dir.join(full_name).exists() {
            let cache_repo_dir = cache_dir.join(full_name);
            std::env::set_current_dir(&cache_repo_dir).map_err(|e| {
                NutError::ChangeDirectoryFailed {
                    path: cache_repo_dir.clone(),
                    source: e,
                }
            })?;

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .arg("rev-parse")
                .arg(format!("origin/{default_branch}"))
                .output()
                .map_err(|e| NutError::GitCommandFailed {
                    command: "git rev-parse".to_string(),
                    source: e,
                })?;
            let cache_latest_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if cache_latest_commit != *latest_commit {
                let status = std::process::Command::new("git")
                    .arg("remote")
                    .arg("update")
                    .arg("--prune")
                    .status()
                    .map_err(|e| NutError::GitCommandFailed {
                        command: "git remote update".to_string(),
                        source: e,
                    })?;
                if !status.success() {
                    return Err(NutError::GitOperationFailed {
                        operation: "update cache repository".to_string(),
                    });
                }
            }
        } else {
            std::fs::create_dir_all(&cache_dir).map_err(|e| NutError::CreateDirectoryFailed {
                path: cache_dir.clone(),
                source: e,
            })?;
            std::env::set_current_dir(&cache_dir).map_err(|e| NutError::ChangeDirectoryFailed {
                path: cache_dir.clone(),
                source: e,
            })?;
            let status = std::process::Command::new("git")
                .arg("clone")
                .arg(&clone_url)
                .arg(full_name)
                .arg("--mirror")
                .arg("--bare")
                .status()
                .map_err(|e| NutError::GitCommandFailed {
                    command: "git clone".to_string(),
                    source: e,
                })?;
            if !status.success() {
                return Err(NutError::GitOperationFailed {
                    operation: "clone cache repository".to_string(),
                });
            }
        }
    }

    // this can happen if the repository is empty
    if workspace_dir.join(full_name).exists() {
        return Ok(());
    }

    std::env::set_current_dir(&workspace_dir).map_err(|e| NutError::ChangeDirectoryFailed {
        path: workspace_dir.clone(),
        source: e,
    })?;
    let cache_repo_path = cache_dir.join(full_name);
    let cache_dir_str = cache_repo_path.to_str().ok_or(NutError::InvalidUtf8)?;
    let status = std::process::Command::new("git")
        .arg("clone")
        .arg("--local")
        .arg(cache_dir_str)
        .arg(full_name)
        .status()
        .map_err(|e| NutError::GitCommandFailed {
            command: "git clone".to_string(),
            source: e,
        })?;
    if !status.success() {
        return Err(NutError::GitOperationFailed {
            operation: "clone workspace repository".to_string(),
        });
    }

    let workspace_repo_dir = workspace_dir.join(full_name);
    std::env::set_current_dir(&workspace_repo_dir).map_err(|e| {
        NutError::ChangeDirectoryFailed {
            path: workspace_repo_dir.clone(),
            source: e,
        }
    })?;
    let status = std::process::Command::new("git")
        .arg("remote")
        .arg("set-url")
        .arg("origin")
        .arg(&clone_url)
        .status()
        .map_err(|e| NutError::GitCommandFailed {
            command: "git remote set-url".to_string(),
            source: e,
        })?;
    if !status.success() {
        return Err(NutError::GitOperationFailed {
            operation: "set remote url in workspace repository".to_string(),
        });
    }

    Ok(())
}

pub fn get_repo_status(repo_path: &PathBuf) -> Option<RepoStatus> {
    // Check if the path is a git repository
    if !repo_path.join(".git").exists() {
        return None;
    }

    let repo_name = repo_path.file_name()?.to_string_lossy().to_string();

    // Get current branch
    let branch_output = std::process::Command::new("git")
        .current_dir(repo_path)
        .arg("branch")
        .arg("--show-current")
        .output()
        .ok()?;

    if !branch_output.status.success() {
        return None;
    }

    let mut current_branch = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();

    // Handle detached HEAD state
    if current_branch.is_empty() {
        let rev_output = std::process::Command::new("git")
            .current_dir(repo_path)
            .arg("rev-parse")
            .arg("--short")
            .arg("HEAD")
            .output()
            .ok()?;
        if rev_output.status.success() {
            let commit = String::from_utf8_lossy(&rev_output.stdout)
                .trim()
                .to_string();
            current_branch = format!("(detached at {})", commit);
        } else {
            current_branch = "(detached)".to_string();
        }
    }

    // Get git status porcelain output
    let status_output = std::process::Command::new("git")
        .current_dir(repo_path)
        .arg("status")
        .arg("--porcelain")
        .output()
        .ok()?;

    if !status_output.status.success() {
        return None;
    }

    let status_text = String::from_utf8_lossy(&status_output.stdout);

    let mut modified_files = 0;
    let mut staged_files = 0;
    let mut untracked_files = 0;

    for line in status_text.lines() {
        if line.is_empty() {
            continue;
        }

        // Parse git status --porcelain format
        // First two characters indicate status
        if line.len() < 2 {
            continue;
        }

        let mut chars = line.chars();
        let Some(index_status) = chars.next() else {
            continue;
        };
        let Some(worktree_status) = chars.next() else {
            continue;
        };

        // Untracked files - handle first as they're special
        if index_status == '?' && worktree_status == '?' {
            untracked_files += 1;
        } else {
            // For tracked files, count if staged (index has changes)
            if index_status != ' ' && index_status != '?' {
                staged_files += 1;
            }
            // Count if modified in worktree (unstaged changes)
            if worktree_status != ' ' && worktree_status != '?' {
                modified_files += 1;
            }
        }
    }

    let has_changes = modified_files > 0 || staged_files > 0 || untracked_files > 0;

    Some(RepoStatus {
        name: repo_name,
        has_changes,
        modified_files,
        staged_files,
        untracked_files,
        current_branch,
    })
}

// use walkdir crate to recursively find git repos (by looking for .git directories)
pub fn get_all_repos_status(workspace_id: Ulid) -> Result<Vec<RepoStatus>> {
    let workspace_dir = dirs::get_data_local_dir()?.join(workspace_id.to_string());
    let mut statuses = Vec::new();

    let walker = walkdir::WalkDir::new(&workspace_dir)
        .max_depth(3)
        .into_iter();
    for entry in walker
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
    {
        if entry.file_name() == ".git"
            && let Some(parent) = entry.path().parent()
        {
            let repo_path = parent.to_path_buf();
            if let Some(status) = get_repo_status(&repo_path) {
                statuses.push(status);
            }
        }
    }

    // Sort by repository name for consistent output
    statuses.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(statuses)
}
