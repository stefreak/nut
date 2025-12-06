use std::ffi::OsStr;
use std::os::unix::process::ExitStatusExt;
use std::path::Path;

use miette::IntoDiagnostic;

use crate::error::{NutError, Result};

use super::repository::find_repositories;

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

            // This will automatically render fancy miette errors due to global hook in main.rs
            eprintln!();
            eprintln!("{:?}", error.err().unwrap());
        }
        println!();
    }

    Ok(())
}
