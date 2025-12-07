use std::path::Path;
use sysinfo::{ProcessRefreshKind, System};

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub cwd: String,
}

pub fn get_workspace_processes(workspace_path: &Path) -> Vec<ProcessInfo> {
    let mut system = System::new_all();
    system.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    let workspace_path_str = workspace_path.to_string_lossy().to_string();
    let mut processes = Vec::new();

    for (pid, process) in system.processes() {
        if let Some(cwd) = process.cwd() {
            let cwd_str = cwd.to_string_lossy().to_string();
            if cwd_str.starts_with(&workspace_path_str) {
                processes.push(ProcessInfo {
                    pid: pid.as_u32(),
                    name: process.name().to_string_lossy().to_string(),
                    cpu_usage: process.cpu_usage(),
                    memory_bytes: process.memory(),
                    cwd: cwd_str,
                });
            }
        }
    }

    processes.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap());
    processes
}

pub fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::process::Command;
        Command::new("kill")
            .arg(pid.to_string())
            .status()
            .map_err(|e| format!("Failed to kill process: {}", e))?;
        Ok(())
    }

    #[cfg(windows)]
    {
        use std::process::Command;
        Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .status()
            .map_err(|e| format!("Failed to kill process: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    {
        Err("Process killing not supported on this platform".to_string())
    }
}
