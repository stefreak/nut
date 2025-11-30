use std::ffi::{OsStr, OsString};
use std::os::unix::process::ExitStatusExt;
use std::path::{Path, PathBuf};

use crate::error::{NutError, Result};
use crate::{dirs, gh};
use futures_util::stream::{self, StreamExt};
use miette::IntoDiagnostic;

pub struct RepoStatus {
    pub path_relative: OsString,
    pub has_changes: bool,
    pub modified_files: usize,
    pub staged_files: usize,
    pub untracked_files: usize,
    pub current_branch: String,
}

pub struct CloneInfo {
    pub full_name: String,
    pub latest_commit: Option<String>,
    pub default_branch: Option<String>,
}

pub fn clone(
    workspace_dir: &PathBuf,
    full_name: &str,
    latest_commit: &Option<String>,
    default_branch: &Option<String>,
) -> Result<()> {
    let git_protocol = gh::get_git_protocol_with_fallback();
    let clone_url = git_protocol.to_clone_url(full_name);

    let cache_dir = dirs::get_cache_dir()?.join("github");

    if let (Some(default_branch), Some(latest_commit)) = (default_branch, latest_commit) {
        if workspace_dir.join(full_name).exists() {
            let workspace_repo_dir = workspace_dir.join(full_name);

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .current_dir(&workspace_repo_dir)
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
                    .current_dir(&workspace_repo_dir)
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
                        .current_dir(&workspace_repo_dir)
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
                        .current_dir(&workspace_repo_dir)
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

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .current_dir(&cache_repo_dir)
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
                    .current_dir(&cache_repo_dir)
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
            let status = std::process::Command::new("git")
                .current_dir(&cache_dir)
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

    let cache_repo_path = cache_dir.join(full_name);
    let cache_dir_str = cache_repo_path.to_str().ok_or(NutError::InvalidUtf8)?;
    let status = std::process::Command::new("git")
        .current_dir(workspace_dir)
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
    let status = std::process::Command::new("git")
        .current_dir(&workspace_repo_dir)
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

/// Clone multiple repositories in parallel with a concurrency limit.
///
/// This function takes a list of repositories and clones them in parallel,
/// with a maximum number of concurrent clone operations controlled by `parallel_count`.
pub async fn clone_parallel(
    workspace_dir: PathBuf,
    repos: Vec<CloneInfo>,
    parallel_count: usize,
) -> Result<()> {
    // Validate parallel_count
    if parallel_count == 0 {
        return Err(NutError::GitOperationFailed {
            operation: "parallel_count must be greater than 0".to_string(),
        });
    }

    // Create a stream of clone tasks
    let clone_tasks = stream::iter(repos).map(move |repo_info| {
        let workspace_dir = workspace_dir.clone();
        async move {
            let full_name = repo_info.full_name.clone();
            // Clone is a blocking operation, so we run it in a blocking task
            let result = tokio::task::spawn_blocking(move || {
                clone(
                    &workspace_dir,
                    &repo_info.full_name,
                    &repo_info.latest_commit,
                    &repo_info.default_branch,
                )
            })
            .await;

            // Handle the JoinError
            match result {
                Ok(clone_result) => clone_result,
                Err(join_error) => Err(NutError::GitOperationFailed {
                    operation: format!("clone task for {} failed: {}", full_name, join_error),
                }),
            }
        }
    });

    // Execute tasks with limited concurrency
    let results: Vec<Result<()>> = clone_tasks.buffer_unordered(parallel_count).collect().await;

    // Check if any clones failed
    for result in results {
        result?;
    }

    Ok(())
}

pub fn get_repo_status(workspace_dir: &Path, repo_path_relative: &PathBuf) -> Option<RepoStatus> {
    let abs_path = workspace_dir.join(repo_path_relative);

    // Check if the path is a git repository
    if !abs_path.join(".git").exists() {
        return None;
    }

    // Get current branch
    let branch_output = std::process::Command::new("git")
        .current_dir(&abs_path)
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
            .current_dir(&abs_path)
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
        .current_dir(&abs_path)
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
        path_relative: repo_path_relative.clone().into_os_string(),
        has_changes,
        modified_files,
        staged_files,
        untracked_files,
        current_branch,
    })
}

// use walkdir crate to recursively find git repos (by looking for .git directories)
pub fn get_all_repos_status(workspace_dir: &PathBuf) -> Result<Vec<RepoStatus>> {
    let repos = find_repositories(workspace_dir)?;
    let mut statuses = Vec::new();

    for repo_path_relative in repos {
        if let Some(status) = get_repo_status(workspace_dir, &repo_path_relative) {
            statuses.push(status);
        }
    }

    // Sort by repository name for consistent output
    statuses.sort_by(|a, b| a.path_relative.cmp(&b.path_relative));

    Ok(statuses)
}

/// Find all git repositories in a workspace.
///
/// Searches for directories containing a `.git` subdirectory within the workspace,
/// up to a maximum depth of 3 levels. Returns a sorted list of repository paths.
fn find_repositories(workspace_dir: &PathBuf) -> Result<Vec<PathBuf>> {
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
pub fn apply_command(workspace_dir: &PathBuf, command: Vec<&OsStr>) -> Result<()> {
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

        let status = std::process::Command::new(command_name)
            .args(args)
            .current_dir(workspace_dir.join(&repo_path_relative))
            .status()
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
