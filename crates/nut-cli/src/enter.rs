//! CLI-specific shell spawning functionality.
//!
//! This module handles entering a workspace by spawning a shell inside it.

use nut_core::dirs::get_data_local_dir;
use nut_core::error::{NutError, Result};

/// Enter a workspace by spawning a shell in its directory.
pub async fn enter(ulid: ulid::Ulid) -> Result<()> {
    let data_local_dir = get_data_local_dir().await?;

    // Start shell in directory
    let workspace_dir = data_local_dir.join(ulid.to_string());

    let shell = std::env::var("SHELL").unwrap_or("/bin/sh".to_string());

    // Add location of nut binary to PATH
    let path = std::env::var("PATH").unwrap_or("".to_string());
    let nut_binary_path =
        std::env::current_exe().map_err(|e| NutError::GetCurrentExecutableFailed { source: e })?;
    let nut_binary_dir =
        nut_binary_path
            .parent()
            .ok_or_else(|| NutError::GetCurrentExecutableFailed {
                source: std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "Executable path has no parent directory",
                ),
            })?;
    let nut_binary_dir_str = nut_binary_dir.to_str().ok_or(NutError::InvalidUtf8)?;
    let new_path = format!("{}:{}", nut_binary_dir_str, path);

    tokio::process::Command::new(shell)
        .current_dir(&workspace_dir)
        .env("PATH", new_path)
        .status()
        .await
        .map_err(|e| NutError::ShellSpawnFailed { source: e })?;

    Ok(())
}
