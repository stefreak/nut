use std::ffi::{OsStr, OsString};
use std::os::unix::process::ExitStatusExt;
use std::path::{Path, PathBuf};

use crate::error::{NutError, Result};
use crate::{dirs, gh};
use miette::IntoDiagnostic;

pub struct RepoStatus {
    pub path_relative: OsString,
    pub has_changes: bool,
    pub modified_files: usize,
    pub staged_files: usize,
    pub untracked_files: usize,
    pub current_branch: String,
}

/// Helper to execute git commands with consistent error handling
struct GitCommand<'a> {
    args: Vec<&'a str>,
    working_dir: &'a Path,
}

impl<'a> GitCommand<'a> {
    fn new(working_dir: &'a Path) -> Self {
        Self {
            args: Vec::new(),
            working_dir,
        }
    }

    fn arg(mut self, arg: &'a str) -> Self {
        self.args.push(arg);
        self
    }

    fn args(mut self, args: &[&'a str]) -> Self {
        self.args.extend_from_slice(args);
        self
    }

    async fn output(self) -> Result<std::process::Output> {
        let output = tokio::process::Command::new("git")
            .current_dir(self.working_dir)
            .args(&self.args)
            .output()
            .await
            .map_err(|e| NutError::GitCommandFailed {
                command: format!("git {}", self.args.join(" ")),
                source: e,
            })?;
        Ok(output)
    }

    async fn run(self) -> Result<()> {
        let status = tokio::process::Command::new("git")
            .current_dir(self.working_dir)
            .args(&self.args)
            .status()
            .await
            .map_err(|e| NutError::GitCommandFailed {
                command: format!("git {}", self.args.join(" ")),
                source: e,
            })?;

        if !status.success() {
            return Err(NutError::GitOperationFailed {
                operation: format!("git {}", self.args.join(" ")),
            });
        }
        Ok(())
    }

    async fn output_string(self) -> Result<String> {
        let output = self.output().await?;
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
}

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

pub async fn get_repo_status(
    workspace_dir: &Path,
    repo_path_relative: &PathBuf,
) -> Option<RepoStatus> {
    let abs_path = workspace_dir.join(repo_path_relative);

    // Check if the path is a git repository
    if !abs_path.join(".git").exists() {
        return None;
    }

    // Get current branch
    let branch_output = tokio::process::Command::new("git")
        .current_dir(&abs_path)
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
            .current_dir(&abs_path)
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

    // Get git status porcelain output
    let status_output = tokio::process::Command::new("git")
        .current_dir(&abs_path)
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
        path_relative: repo_path_relative.clone().into_os_string(),
        has_changes,
        modified_files,
        staged_files,
        untracked_files,
        current_branch,
    })
}

// use walkdir crate to recursively find git repos (by looking for .git directories)
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

/// Find all git repositories in a workspace.
///
/// Searches for directories containing a `.git` subdirectory within the workspace,
/// up to a maximum depth of 3 levels. Returns a sorted list of repository paths.
fn find_repositories(workspace_dir: &Path) -> Result<Vec<PathBuf>> {
    let mut repos = Vec::new();

    let walker = walkdir::WalkDir::new(workspace_dir)
        .max_depth(3)
        .into_iter();

    for entry in walker
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
    {
        if entry.file_name() == ".git"
            && let Some(parent) = entry.path().parent()
        {
            // push relative path from workspace_dir
            let relative_path = parent.strip_prefix(workspace_dir).expect("failed to strip prefix - is repo in the workspace directory? This is a bug in nut, please report it on GitHub.");
            repos.push(relative_path.to_path_buf());
        }
    }

    // Sort repositories by name for consistent output
    repos.sort();

    Ok(repos)
}

/// Execute a command in each repository without using a subshell.
///
/// Discovers all git repositories in the workspace and executes the specified command
/// in each one. The command is executed directly (not in a shell).
pub async fn apply_command(workspace_dir: &Path, command: Vec<&OsStr>) -> Result<()> {
    let repos = find_repositories(workspace_dir)?;

    if repos.is_empty() {
        println!("No repositories found in workspace");
        return Ok(());
    }

    // Execute command in each repository
    let command_name = &command[0];
    let args = &command[1..];

    for repo_path_relative in repos {
        println!("==> {} <==", repo_path_relative.display());

        let status = tokio::process::Command::new(command_name)
            .args(args)
            .current_dir(workspace_dir.join(&repo_path_relative))
            .status()
            .await
            .map_err(|e| NutError::CommandFailed {
                repo: repo_path_relative.display().to_string(),
                source: e,
            })?;

        if !status.success() {
            // render the error using miette
            let error: miette::Result<()> = Err(NutError::CommandFailed {
                repo: repo_path_relative.display().to_string(),
                source: std::io::Error::other(if let Some(code) = status.code() {
                    format!("Command exited with status code {}", code)
                } else if let Some(signal) = status.signal() {
                    format!("Command terminated by signal {}", signal)
                } else {
                    "Command terminated for unknown reason".to_string()
                }),
            })
            .into_diagnostic();

            // this will automatically render fancy miette errors due to global hook in main.rs
            eprintln!();
            eprintln!("{:?}", error.err().unwrap());
        }
        println!();
    }

    Ok(())
}
