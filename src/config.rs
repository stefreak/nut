use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct NutConfig {
    pub workspace_dir: Option<PathBuf>,
    pub cache_dir: Option<PathBuf>,
}

impl NutConfig {
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;

        if !config_path.exists() {
            return Ok(Self::default());
        }

        let settings = config::Config::builder()
            .add_source(config::File::from(config_path))
            .build()
            .map_err(|e| crate::error::NutError::ConfigLoadFailed {
                source: Box::new(e),
            })?;

        settings
            .try_deserialize()
            .map_err(|e| crate::error::NutError::ConfigLoadFailed {
                source: Box::new(e),
            })
    }

    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;

        let json = serde_json::to_string_pretty(self).map_err(|e| {
            crate::error::NutError::ConfigSaveFailed {
                source: Box::new(e),
            }
        })?;

        std::fs::write(&config_path, json).map_err(|e| {
            crate::error::NutError::ConfigSaveFailed {
                source: Box::new(e),
            }
        })?;

        Ok(())
    }

    pub fn config_path() -> Result<PathBuf> {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map_err(|e| crate::error::NutError::HomeDirectoryNotFound { source: e })?;
        Ok(PathBuf::from(home).join(".nut.json"))
    }

    pub fn get_workspace_dir(&self) -> Result<PathBuf> {
        self.workspace_dir
            .clone()
            .ok_or(crate::error::NutError::WorkspaceDirectoryNotConfigured)
    }

    pub fn get_cache_dir(&self) -> PathBuf {
        self.cache_dir
            .clone()
            .unwrap_or_else(Self::default_cache_dir)
    }

    fn default_cache_dir() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| {
                if cfg!(unix) {
                    "/tmp".to_string()
                } else {
                    ".".to_string()
                }
            });
        PathBuf::from(home).join(".cache").join("nut")
    }
}
