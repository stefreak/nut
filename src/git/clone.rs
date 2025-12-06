use std::path::Path;

use crate::error::{NutError, Result};
use crate::{dirs, gh};

use super::command::GitCommand;

/// Update an existing workspace repository if needed
async fn update_workspace_repo(
    workspace_repo_dir: &Path,
    default_branch: &str,
    latest_commit: &str,
) -> Result<()> {
    let origin_branch = format!("origin/{default_branch}");
    let workspace_commit = GitCommand::new(workspace_repo_dir)
        .args(&["rev-parse", &origin_branch])
        .output_string()
        .await?;

    if workspace_commit != latest_commit {
        let current_branch = GitCommand::new(workspace_repo_dir)
            .args(&["branch", "--show-current"])
            .output_string()
            .await?;

        if current_branch != default_branch {
            GitCommand::new(workspace_repo_dir)
                .args(&["fetch", "origin"])
                .run()
                .await?;
        } else {
            GitCommand::new(workspace_repo_dir)
                .arg("pull")
                .run()
                .await?;
        }
    }
    Ok(())
}

/// Ensure cache repository exists and is up to date
async fn ensure_cache_repo(
    cache_dir: &Path,
    full_name: &str,
    clone_url: &str,
    default_branch: &str,
    latest_commit: &str,
) -> Result<()> {
    let cache_repo_dir = cache_dir.join(full_name);

    if cache_repo_dir.exists() {
        let origin_branch = format!("origin/{default_branch}");
        let cache_commit = GitCommand::new(&cache_repo_dir)
            .args(&["rev-parse", &origin_branch])
            .output_string()
            .await?;

        if cache_commit != latest_commit {
            GitCommand::new(&cache_repo_dir)
                .args(&["remote", "update", "--prune"])
                .run()
                .await?;
        }
    } else {
        tokio::fs::create_dir_all(cache_dir).await.map_err(|e| {
            NutError::CreateDirectoryFailed {
                path: cache_dir.to_path_buf(),
                source: e,
            }
        })?;
        GitCommand::new(cache_dir)
            .args(&["clone", clone_url, full_name, "--mirror", "--bare"])
            .run()
            .await?;
    }
    Ok(())
}

/// Clone from cache to workspace
async fn clone_from_cache_to_workspace(
    workspace_dir: &Path,
    cache_dir: &Path,
    full_name: &str,
    clone_url: &str,
) -> Result<()> {
    let cache_repo_path = cache_dir.join(full_name);
    let cache_dir_str = cache_repo_path.to_str().ok_or(NutError::InvalidUtf8)?;

    GitCommand::new(workspace_dir)
        .args(&["clone", "--local", cache_dir_str, full_name])
        .run()
        .await?;

    let workspace_repo_dir = workspace_dir.join(full_name);
    GitCommand::new(&workspace_repo_dir)
        .args(&["remote", "set-url", "origin", clone_url])
        .run()
        .await?;

    Ok(())
}

pub async fn clone(
    workspace_dir: &Path,
    full_name: &str,
    latest_commit: &Option<String>,
    default_branch: &Option<String>,
) -> Result<()> {
    // TODO: add support for other hosts, e.g. github enterprise and other git hosting providers
    let host = "github.com";
    let git_protocol = gh::get_git_protocol_with_fallback(host).await;
    let clone_url = git_protocol.to_clone_url(host, full_name);

    let cache_dir = dirs::get_cache_dir().await?.join("github");

    // If we have commit info, handle updates intelligently
    if let (Some(default_branch), Some(latest_commit)) = (default_branch, latest_commit) {
        // Update existing workspace repository if it exists
        let workspace_repo_dir = workspace_dir.join(full_name);
        if workspace_repo_dir.exists() {
            update_workspace_repo(&workspace_repo_dir, default_branch, latest_commit).await?;
            return Ok(());
        }

        // Ensure cache repository is up to date
        ensure_cache_repo(
            &cache_dir,
            full_name,
            &clone_url,
            default_branch,
            latest_commit,
        )
        .await?;
    }

    // Repository might already exist (e.g., empty repo)
    if workspace_dir.join(full_name).exists() {
        return Ok(());
    }

    // Clone from cache to workspace
    clone_from_cache_to_workspace(workspace_dir, &cache_dir, full_name, &clone_url).await?;

    Ok(())
}
