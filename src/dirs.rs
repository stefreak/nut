use directories::ProjectDirs;
use crate::error::{NutError, Result};

fn get_proj_dirs() -> Result<ProjectDirs> {
    ProjectDirs::from("github", "stefreak", "nut")
        .ok_or(NutError::ProjectDirectoriesUnavailable)
}

pub fn get_data_local_dir() -> Result<std::path::PathBuf> {
    let proj_dirs = get_proj_dirs()?;
    let data_local_dir = proj_dirs.data_local_dir();
    Ok(data_local_dir.to_path_buf())
}

pub fn get_cache_dir() -> Result<std::path::PathBuf> {
    let proj_dirs = get_proj_dirs()?;
    let cache_dir = proj_dirs.cache_dir();
    Ok(cache_dir.to_path_buf())
}
