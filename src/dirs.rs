use directories::ProjectDirs;

pub fn get_data_local_dir() -> std::path::PathBuf {
    let proj_dirs = ProjectDirs::from("github", "stefreak", "nut").unwrap();
    let data_local_dir = proj_dirs.data_local_dir();
    return data_local_dir.to_path_buf();
}
