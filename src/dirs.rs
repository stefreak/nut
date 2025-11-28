use directories::ProjectDirs;

fn get_proj_dirs() -> ProjectDirs {
    let proj_dirs = ProjectDirs::from("github", "stefreak", "nut").unwrap();
    return proj_dirs;
}

pub fn get_data_local_dir() -> std::path::PathBuf {
    let proj_dirs = get_proj_dirs();
    let data_local_dir = proj_dirs.data_local_dir();
    return data_local_dir.to_path_buf();
}

pub fn get_cache_dir() -> std::path::PathBuf {
    let proj_dirs = get_proj_dirs();
    let cache_dir = proj_dirs.cache_dir();
    return cache_dir.to_path_buf();
}