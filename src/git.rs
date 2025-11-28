use ulid::Ulid;

use crate::{dirs, enter};

pub fn clone(full_name: &str, latest_commit: &Option<String>, default_branch: &Option<String>) {
    let workspace: Ulid = enter::get_entered_workspace().unwrap();
    let workspace_dir = dirs::get_data_local_dir().join(workspace.to_string());
    let cache_dir = dirs::get_cache_dir().join("github");

    if let (Some(default_branch), Some(latest_commit)) = (default_branch, latest_commit)  {
        if workspace_dir.join(full_name).exists() {
            std::env::set_current_dir(workspace_dir.join(full_name)).unwrap();

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .arg("rev-parse")
                .arg(format!("origin/{default_branch}"))
                .output()
                .expect("failed to get latest commit in cache repository");
            let cache_latest_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if cache_latest_commit != *latest_commit {
                // get current branch
                let output = std::process::Command::new("git")
                    .arg("branch")
                    .arg("--show-current")
                    .output()
                    .expect("failed to get current branch workspace repository");
                let current_branch = String::from_utf8_lossy(&output.stdout).trim().to_string();

                if current_branch != *default_branch {
                    let status = std::process::Command::new("git")
                        .arg("fetch")
                        .arg("origin")
                        .status()
                        .expect("failed to fetch origin in workspace repository");
                    if !status.success() {
                        panic!("failed to fetch origin in workspace repository");
                    }
                } else {
                    let status = std::process::Command::new("git")
                        .arg("pull")
                        .status()
                        .expect("failed to update cache repository");            
                    if !status.success() {
                        panic!("failed to update cache repository");
                    }
                }
            }
            return;
        }

        if cache_dir.join(full_name).exists() {
            std::env::set_current_dir(&cache_dir.join(full_name)).unwrap();

            // get latest commit in default branch
            let output = std::process::Command::new("git")
                .arg("rev-parse")
                .arg(format!("origin/{default_branch}"))
                .output()
                .expect("failed to get latest commit in cache repository");
            let cache_latest_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if cache_latest_commit != *latest_commit {
                let status = std::process::Command::new("git")
                    .arg("remote")
                    .arg("update")
                    .arg("--prune")
                    .status()
                    .expect("failed to update cache repository");
                if !status.success() {
                    panic!("failed to update cache repository");
                }
            }
        } else {
            std::fs::create_dir_all(&cache_dir).unwrap();
            std::env::set_current_dir(&cache_dir).unwrap();
            let status = std::process::Command::new("git")
                .arg("clone")
                .arg(format!("git@github.com:{full_name}.git"))
                .arg(full_name)
                .arg("--mirror")
                .arg("--bare")
                .status()
                .expect("failed to clone cache repository");
            if !status.success() {
                panic!("failed to clone cache repository");
            }
        }
    }

    // this can happen if the repository is empty
    if workspace_dir.join(full_name).exists() {
        return;
    }

    std::env::set_current_dir(&workspace_dir).unwrap();
    let status = std::process::Command::new("git")
        .arg("clone")
        .arg("--local")
        .arg(cache_dir.join(full_name).to_str().unwrap())
        .arg(full_name)
        .status()
        .expect("failed to clone workspace repository");
    if !status.success() {
        panic!("failed to clone workspace repository");
    }

    std::env::set_current_dir(&workspace_dir.join(full_name)).unwrap();
    let status = std::process::Command::new("git")
    .arg("remote")
    .arg("set-url")
    .arg("origin")
    .arg(format!("git@github.com:{full_name}.git"))
    .status()
    .expect("failed to set remote url in workspace repository");
    if !status.success() {
        panic!("failed to set remote url in workspace repository");
    }
}