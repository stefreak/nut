use crate::dirs::get_data_local_dir;
use crate::error::{NutError, Result};

pub fn enter(ulid: ulid::Ulid) -> Result<()> {
    let data_local_dir = get_data_local_dir()?;

    // start shell in directory
    let workspace_dir = data_local_dir.join(ulid.to_string());

    let shell = std::env::var("SHELL").unwrap_or("/bin/sh".to_string());

    // add location of nut binary to PATH
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

    std::process::Command::new(shell)
        .current_dir(&workspace_dir)
        .env("PATH", new_path)
        .status()
        .map_err(|e| NutError::ShellSpawnFailed { source: e })?;

    Ok(())
}

pub fn get_entered_workspace() -> Result<ulid::Ulid> {
    // if in the workspace directory
    let data_local_dir = get_data_local_dir()?;
    let current_dir = std::env::current_dir()
        .and_then(|d| d.canonicalize())
        .map_err(|e| NutError::GetCurrentDirectoryFailed { source: e })?;

    if let Ok(stripped) = current_dir.strip_prefix(&data_local_dir) {
        let components: Vec<&std::ffi::OsStr> =
            stripped.components().map(|c| c.as_os_str()).collect();
        if !components.is_empty()
            && let Ok(ulid) = ulid::Ulid::from_string(&components[0].to_string_lossy())
        {
            return Ok(ulid);
        }
    }

    Err(NutError::NotInWorkspace {
        working_directory: current_dir.display().to_string(),
        data_directory: data_local_dir.display().to_string(),
    })
}
