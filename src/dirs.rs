use std::fs::create_dir_all;

use crate::error::Result;
use directories::ProjectDirs;

fn get_proj_dirs() -> ProjectDirs {
    ProjectDirs::from("github", "stefreak", "nut")
        .expect("no valid home directory path could be retrieved from the operating system")
}

pub fn get_data_local_dir() -> Result<std::path::PathBuf> {
    let proj_dirs = get_proj_dirs();
    let local_data_dir = proj_dirs.data_local_dir();

    // ensure exists
    create_dir_all(local_data_dir)
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(proj_dirs
        .data_local_dir()
        .canonicalize()
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}

pub fn get_cache_dir() -> Result<std::path::PathBuf> {
    let proj_dirs = get_proj_dirs();
    let cache_dir = proj_dirs.cache_dir();

    // ensure exists
    create_dir_all(cache_dir)
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(cache_dir
        .canonicalize()
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}
