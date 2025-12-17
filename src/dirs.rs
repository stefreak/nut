use crate::config::NutConfig;
use crate::error::Result;

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
    let config = NutConfig::load()?;
    let cache_dir = config.get_cache_dir();

    // ensure exists
    tokio::fs::create_dir_all(&cache_dir)
        .await
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?;

    Ok(tokio::fs::canonicalize(&cache_dir)
        .await
        .map_err(|e| crate::error::NutError::ProjectDirectoriesUnavailable { source: e })?
        .to_path_buf())
}
