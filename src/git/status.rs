use std::ffi::OsString;
use std::path::{Path, PathBuf};

use crate::error::Result;

use super::repository::find_repositories;

pub struct RepoStatus {
    pub path_relative: OsString,
    pub has_changes: bool,
    pub modified_files: usize,
    pub staged_files: usize,
    pub untracked_files: usize,
    pub current_branch: String,
}

pub async fn get_repo_status(
    workspace_dir: &Path,
    repo_path_relative: &PathBuf,
) -> Option<RepoStatus> {
    let abs_path = workspace_dir.join(repo_path_relative);

    if !abs_path.join(".git").exists() {
        return None;
    }

    let current_branch = get_current_branch(&abs_path).await?;
    let (modified_files, staged_files, untracked_files) = count_changes(&abs_path).await?;

    let has_changes = modified_files > 0 || staged_files > 0 || untracked_files > 0;

    Some(RepoStatus {
        path_relative: repo_path_relative.clone().into_os_string(),
        has_changes,
        modified_files,
        staged_files,
        untracked_files,
        current_branch,
    })
}

async fn get_current_branch(abs_path: &Path) -> Option<String> {
    let branch_output = tokio::process::Command::new("git")
        .current_dir(abs_path)
        .arg("branch")
        .arg("--show-current")
        .output()
        .await
        .ok()?;

    if !branch_output.status.success() {
        return None;
    }

    let mut current_branch = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();

    // Handle detached HEAD state
    if current_branch.is_empty() {
        let rev_output = tokio::process::Command::new("git")
            .current_dir(abs_path)
            .arg("rev-parse")
            .arg("--short")
            .arg("HEAD")
            .output()
            .await
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

    Some(current_branch)
}

async fn count_changes(abs_path: &Path) -> Option<(usize, usize, usize)> {
    let status_output = tokio::process::Command::new("git")
        .current_dir(abs_path)
        .arg("status")
        .arg("--porcelain")
        .output()
        .await
        .ok()?;

    if !status_output.status.success() {
        return None;
    }

    let status_text = String::from_utf8_lossy(&status_output.stdout);

    let mut modified_files = 0;
    let mut staged_files = 0;
    let mut untracked_files = 0;

    for line in status_text.lines() {
        if line.is_empty() || line.len() < 2 {
            continue;
        }

        let mut chars = line.chars();
        let Some(index_status) = chars.next() else {
            continue;
        };
        let Some(worktree_status) = chars.next() else {
            continue;
        };

        // Untracked files
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

    Some((modified_files, staged_files, untracked_files))
}

pub async fn get_all_repos_status(workspace_dir: &Path) -> Result<Vec<RepoStatus>> {
    let repos = find_repositories(workspace_dir)?;

    // Process all repositories concurrently for better performance
    let futures: Vec<_> = repos
        .into_iter()
        .map(|repo_path_relative| async move {
            get_repo_status(workspace_dir, &repo_path_relative).await
        })
        .collect();

    let results = futures_util::future::join_all(futures).await;
    let mut statuses: Vec<RepoStatus> = results.into_iter().flatten().collect();

    // Sort by repository name for consistent output
    statuses.sort_by(|a, b| a.path_relative.cmp(&b.path_relative));

    Ok(statuses)
}
