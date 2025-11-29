use std::path::PathBuf;
use ulid::Ulid;

use crate::{dirs, enter};

pub struct RepoStatus {
    pub name: String,
    pub has_changes: bool,
    pub modified_files: usize,
    pub staged_files: usize,
    pub untracked_files: usize,
    pub current_branch: String,
}

pub fn clone(full_name: &str, latest_commit: &Option<String>, default_branch: &Option<String>) {
    let workspace: Ulid = enter::get_entered_workspace().unwrap();
    let workspace_dir = dirs::get_data_local_dir().join(workspace.to_string());
    let cache_dir = dirs::get_cache_dir().join("github");

    if let (Some(default_branch), Some(latest_commit)) = (default_branch, latest_commit)  {
        if workspace_dir.join(full_name).exists() {
            std::env::set_current_dir(workspace_dir.join(full_name)).unwrap();

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .arg("rev-parse")
                .arg(format!("origin/{default_branch}"))
                .output()
                .expect("failed to get latest commit in cache repository");
            let cache_latest_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if cache_latest_commit != *latest_commit {
                // get current branch
                let output = std::process::Command::new("git")
                    .arg("branch")
                    .arg("--show-current")
                    .output()
                    .expect("failed to get current branch workspace repository");
                let current_branch = String::from_utf8_lossy(&output.stdout).trim().to_string();

                if current_branch != *default_branch {
                    let status = std::process::Command::new("git")
                        .arg("fetch")
                        .arg("origin")
                        .status()
                        .expect("failed to fetch origin in workspace repository");
                    if !status.success() {
                        panic!("failed to fetch origin in workspace repository");
                    }
                } else {
                    let status = std::process::Command::new("git")
                        .arg("pull")
                        .status()
                        .expect("failed to update cache repository");            
                    if !status.success() {
                        panic!("failed to update cache repository");
                    }
                }
            }
            return;
        }

        if cache_dir.join(full_name).exists() {
            std::env::set_current_dir(&cache_dir.join(full_name)).unwrap();

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .arg("rev-parse")
                .arg(format!("origin/{default_branch}"))
                .output()
                .expect("failed to get latest commit in cache repository");
            let cache_latest_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if cache_latest_commit != *latest_commit {
                let status = std::process::Command::new("git")
                    .arg("remote")
                    .arg("update")
                    .arg("--prune")
                    .status()
                    .expect("failed to update cache repository");
                if !status.success() {
                    panic!("failed to update cache repository");
                }
            }
        } else {
            std::fs::create_dir_all(&cache_dir).unwrap();
            std::env::set_current_dir(&cache_dir).unwrap();
            let status = std::process::Command::new("git")
                .arg("clone")
                .arg(format!("git@github.com:{full_name}.git"))
                .arg(full_name)
                .arg("--mirror")
                .arg("--bare")
                .status()
                .expect("failed to clone cache repository");
            if !status.success() {
                panic!("failed to clone cache repository");
            }
        }
    }

    // this can happen if the repository is empty
    if workspace_dir.join(full_name).exists() {
        return;
    }

    std::env::set_current_dir(&workspace_dir).unwrap();
    let status = std::process::Command::new("git")
        .arg("clone")
        .arg("--local")
        .arg(cache_dir.join(full_name).to_str().unwrap())
        .arg(full_name)
        .status()
        .expect("failed to clone workspace repository");
    if !status.success() {
        panic!("failed to clone workspace repository");
    }

    std::env::set_current_dir(&workspace_dir.join(full_name)).unwrap();
    let status = std::process::Command::new("git")
    .arg("remote")
    .arg("set-url")
    .arg("origin")
    .arg(format!("git@github.com:{full_name}.git"))
    .status()
    .expect("failed to set remote url in workspace repository");
    if !status.success() {
        panic!("failed to set remote url in workspace repository");
    }
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
    
    let mut current_branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();
    
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
            let commit = String::from_utf8_lossy(&rev_output.stdout).trim().to_string();
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

        let index_status = line.chars().nth(0).unwrap();
        let worktree_status = line.chars().nth(1).unwrap();

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

pub fn get_all_repos_status(workspace_id: Ulid) -> Vec<RepoStatus> {
    let workspace_dir = dirs::get_data_local_dir().join(workspace_id.to_string());
    let mut statuses = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&workspace_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                // Skip .nut directory
                if path.is_dir() && path.file_name().and_then(|n| n.to_str()) != Some(".nut") {
                    if let Some(status) = get_repo_status(&path) {
                        statuses.push(status);
                    }
                }
            }
        }
    }

    // Sort by repository name for consistent output
    statuses.sort_by(|a, b| a.name.cmp(&b.name));

    statuses
}