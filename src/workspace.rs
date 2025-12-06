use crate::dirs;
use crate::enter;
use crate::error::{NutError, Result};
use std::path::PathBuf;
use ulid::Ulid;

pub struct Workspace {
    #[allow(dead_code)]
    pub id: Ulid,
    pub path: PathBuf,
}

impl Workspace {
    /// Get workspace from explicit ID or infer from current directory
    pub async fn resolve(workspace_arg: &Option<String>) -> Result<Self> {
        let ulid = match workspace_arg {
            Some(id) => id.parse().map_err(|e| NutError::InvalidWorkspaceId {
                id: id.clone(),
                source: e,
            })?,
            None => enter::get_entered_workspace().await?,
        };

        let workspace_dir = dirs::get_data_local_dir().await?.join(ulid.to_string());

        Ok(Workspace {
            id: ulid,
            path: workspace_dir,
        })
    }
}
