use std::path::{Path, PathBuf};

use crate::error::Result;

const MAX_REPOSITORY_SEARCH_DEPTH: usize = 3;

/// Find all git repositories in a workspace.
///
/// Searches for directories containing a `.git` subdirectory within the workspace.
/// Returns a sorted list of repository paths.
pub(super) fn find_repositories(workspace_dir: &Path) -> Result<Vec<PathBuf>> {
    let mut repos = Vec::new();

    let walker = walkdir::WalkDir::new(workspace_dir)
        .max_depth(MAX_REPOSITORY_SEARCH_DEPTH)
        .into_iter();

    for entry in walker
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
    {
        if entry.file_name() == ".git"
            && let Some(parent) = entry.path().parent()
        {
            let relative_path = parent.strip_prefix(workspace_dir).expect("failed to strip prefix - is repo in the workspace directory? This is a bug in nut, please report it on GitHub.");
            repos.push(relative_path.to_path_buf());
        }
    }

    repos.sort();
    Ok(repos)
}
