//! Directory resolution for nut.
//!
//! Provides functions to get the data and cache directories.

use crate::config::NutConfig;
use crate::error::{NutError, Result};
use directories::ProjectDirs;
use std::path::PathBuf;

fn get_proj_dirs() -> ProjectDirs {
    ProjectDirs::from("github", "stefreak", "nut")
        .expect("no valid home directory path could be retrieved from the operating system")
}

/// Get the data directory where workspaces are stored.
///
/// This directory is configured via `.nut.json` using the `workspace_dir` setting.
/// The directory is created if it doesn't exist.
pub async fn get_data_local_dir() -> Result<PathBuf> {
    let config = NutConfig::load()?;
    let workspace_dir = config.get_workspace_dir()?;

    // ensure exists
    tokio::fs::create_dir_all(&workspace_dir)
        .await
        .map_err(|e| NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(tokio::fs::canonicalize(&workspace_dir)
        .await
        .map_err(|e| NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}

/// Get the cache directory for git repository caching.
///
/// This uses the system-specific cache directory for the application.
/// The directory is created if it doesn't exist.
pub async fn get_cache_dir() -> Result<PathBuf> {
    let proj_dirs = get_proj_dirs();
    let cache_dir = proj_dirs.cache_dir();

    // ensure exists
    tokio::fs::create_dir_all(cache_dir)
        .await
        .map_err(|e| NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(tokio::fs::canonicalize(cache_dir)
        .await
        .map_err(|e| NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}
