//! Configuration file operations for nut.
//!
//! Handles loading and saving the `.nut.json` configuration file.

use crate::error::{NutError, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Nut configuration stored in `~/.nut.json`.
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct NutConfig {
    /// Directory where workspaces are stored.
    pub workspace_dir: Option<PathBuf>,
}

impl NutConfig {
    /// Load configuration from the default config file path.
    ///
    /// Returns default configuration if the file doesn't exist.
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;

        if !config_path.exists() {
            return Ok(Self::default());
        }

        let settings = config::Config::builder()
            .add_source(config::File::from(config_path))
            .build()
            .map_err(|e| NutError::ConfigLoadFailed {
                source: Box::new(e),
            })?;

        settings.try_deserialize().map_err(|e| NutError::ConfigLoadFailed {
            source: Box::new(e),
        })
    }

    /// Save configuration to the default config file path.
    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;

        let json = serde_json::to_string_pretty(self).map_err(|e| NutError::ConfigSaveFailed {
            source: Box::new(e),
        })?;

        std::fs::write(&config_path, json).map_err(|e| NutError::ConfigSaveFailed {
            source: Box::new(e),
        })?;

        Ok(())
    }

    /// Get the path to the configuration file (`~/.nut.json`).
    pub fn config_path() -> Result<PathBuf> {
        let home = Self::get_home_dir()?;
        Ok(PathBuf::from(home).join(".nut.json"))
    }

    /// Get the configured workspace directory.
    ///
    /// Returns an error if not configured.
    pub fn get_workspace_dir(&self) -> Result<PathBuf> {
        self.workspace_dir
            .clone()
            .map_or_else(|| Ok(PathBuf::from(NutConfig::get_home_dir()?).join(".nut")), Ok)
    }

    fn get_home_dir() -> Result<String> {
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map_err(|e| NutError::HomeDirectoryNotFound { source: e })
    }
}
