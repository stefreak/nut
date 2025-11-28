use crate::dirs::get_data_local_dir;

pub fn enter(ulid: ulid::Ulid) {
    let data_local_dir = get_data_local_dir();

    // start shell in directory
    std::env::set_current_dir(data_local_dir.join(ulid.to_string())).unwrap();
    let shell = std::env::var("SHELL").unwrap_or("/bin/sh".to_string());

    unsafe {
        std::env::set_var("NUT_WORKSPACE_ID", ulid.to_string());

        // add location of nut binary to PATH
        let path = std::env::var("PATH").unwrap_or("".to_string());
        let nut_binary_path = std::env::current_exe().unwrap();
        let nut_binary_dir = nut_binary_path.parent().unwrap();
        let new_path = format!("{}:{}", nut_binary_dir.to_str().unwrap(), path
        );
        std::env::set_var("PATH", new_path);
    }

    std::process::Command::new(shell)
        .status()
        .expect("failed to start shell");
}

pub fn get_entered_workspace() -> Option<ulid::Ulid> {
    if let Ok(current_workspace) = std::env::var("NUT_WORKSPACE_ID") {
        return Some(ulid::Ulid::from_string(&current_workspace).unwrap());
    }
    // if in the workspace directory
    let data_local_dir = get_data_local_dir();
    let current_dir = std::env::current_dir().unwrap();
    if let Ok(stripped) = current_dir.strip_prefix(&data_local_dir) {
        let components: Vec<&std::ffi::OsStr> = stripped.components().map(|c| c.as_os_str()).collect();
        if components.len() > 0 {
            if let Ok(ulid) = ulid::Ulid::from_string(&components[0].to_string_lossy()) {
                return Some(ulid);
            }
        }
    }

    return None;
}
