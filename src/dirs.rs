use crate::config::NutConfig;
use crate::error::Result;
use directories::ProjectDirs;

fn get_proj_dirs() -> ProjectDirs {
    ProjectDirs::from("github", "stefreak", "nut")
        .expect("no valid home directory path could be retrieved from the operating system")
}

pub async fn get_data_local_dir() -> Result<std::path::PathBuf> {
    let config = NutConfig::load()?;
    let workspace_dir = config.get_workspace_dir()?;

    // ensure exists
    tokio::fs::create_dir_all(&workspace_dir)
        .await
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(tokio::fs::canonicalize(&workspace_dir)
        .await
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}

pub async fn get_cache_dir() -> Result<std::path::PathBuf> {
    let proj_dirs = get_proj_dirs();
    let cache_dir = proj_dirs.cache_dir();

    // ensure exists
    tokio::fs::create_dir_all(cache_dir)
        .await
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(tokio::fs::canonicalize(cache_dir)
        .await
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}
