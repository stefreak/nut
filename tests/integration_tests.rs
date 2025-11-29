use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Helper struct to manage a temporary test environment
struct TestEnv {
    temp_dir: PathBuf,
}

impl TestEnv {
    /// Create a new test environment with isolated directories
    fn new(test_name: &str) -> Self {
        let temp_dir = env::temp_dir().join(format!("nut_test_{}", test_name));
        
        // Clean up if it exists from a previous run
        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }
        
        fs::create_dir_all(&temp_dir).unwrap();
        
        TestEnv {
            temp_dir,
        }
    }
    
    /// Get the path to the nut binary
    fn nut_binary() -> PathBuf {
        let mut path = env::current_exe().unwrap();
        path.pop(); // Remove test binary name
        path.pop(); // Remove 'deps' directory
        path.push("nut");
        path
    }
    
    /// Execute nut command with given arguments
    fn run_nut(&self, args: &[&str]) -> std::process::Output {
        Command::new(Self::nut_binary())
            .args(args)
            .env("HOME", &self.temp_dir)
            .output()
            .expect("Failed to execute nut command")
    }
    
    /// Get the data directory path for this test environment
    fn get_data_dir(&self) -> PathBuf {
        // Run the actual nut data-dir command to get the platform-specific path
        // This works cross-platform (Linux, macOS, Windows) using the directories crate
        let output = self.run_nut(&["data-dir"]);
        assert!(output.status.success(), "data-dir command should succeed");
        let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        PathBuf::from(path_str)
    }
    
    /// Get the cache directory path for this test environment
    #[allow(dead_code)]
    fn get_cache_dir(&self) -> PathBuf {
        // Run the actual nut cache-dir command to get the platform-specific path
        // This works cross-platform (Linux, macOS, Windows) using the directories crate
        let output = self.run_nut(&["cache-dir"]);
        assert!(output.status.success(), "cache-dir command should succeed");
        let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        PathBuf::from(path_str)
    }
}

impl Drop for TestEnv {
    fn drop(&mut self) {
        // Clean up temp directory
        if self.temp_dir.exists() {
            fs::remove_dir_all(&self.temp_dir).ok();
        }
    }
}

#[test]
fn test_cache_dir_command() {
    let env = TestEnv::new("cache_dir");
    
    let output = env.run_nut(&["cache-dir"]);
    
    assert!(output.status.success(), "cache-dir command should succeed");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let path_str = stdout.trim();
    
    // Verify the output is a valid path
    assert!(!path_str.is_empty(), "cache-dir should output a path");
    
    // Verify it's under the test HOME directory
    assert!(path_str.starts_with(env.temp_dir.to_str().unwrap()), 
        "cache-dir path should be under the test HOME directory");
    
    // Verify it contains "nut" in the path (the project name)
    assert!(path_str.contains("nut"), 
        "cache-dir path should contain 'nut' directory");
}

#[test]
fn test_data_dir_command() {
    let env = TestEnv::new("data_dir");
    
    let output = env.run_nut(&["data-dir"]);
    
    assert!(output.status.success(), "data-dir command should succeed");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let path_str = stdout.trim();
    
    // Verify the output is a valid path
    assert!(!path_str.is_empty(), "data-dir should output a path");
    
    // Verify it's under the test HOME directory
    assert!(path_str.starts_with(env.temp_dir.to_str().unwrap()), 
        "data-dir path should be under the test HOME directory");
    
    // Verify it contains "nut" in the path (the project name)
    assert!(path_str.contains("nut"), 
        "data-dir path should contain 'nut' directory");
}

#[test]
fn test_list_empty_workspaces() {
    let env = TestEnv::new("list_empty");
    
    // Create the data directory first (the list command expects it to exist)
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();
    
    let output = env.run_nut(&["list"]);
    
    assert!(output.status.success(), "list command should succeed");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    // When there are no workspaces, output should be empty
    assert_eq!(stdout.trim(), "", "list should output nothing when no workspaces exist");
}

#[test]
fn test_create_workspace_simple() {
    let env = TestEnv::new("create_simple");
    
    // Note: We can't actually test the full create command because it spawns a shell
    // Instead, we'll test that the workspace structure is created correctly
    
    // Manually create a workspace directory structure to test list
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();
    
    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace",
    ).unwrap();
    
    // Now test list
    let output = env.run_nut(&["list"]);
    
    assert!(output.status.success(), "list command should succeed");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    assert!(stdout.contains(&workspace_id.to_string()), "list should contain workspace ID");
    assert!(stdout.contains("Test workspace"), "list should contain workspace description");
}

#[test]
fn test_status_empty_workspace() {
    let env = TestEnv::new("status_empty");
    
    // Create an empty workspace
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();
    
    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace for status",
    ).unwrap();
    
    // Run status command with NUT_WORKSPACE_ID set
    let output = Command::new(TestEnv::nut_binary())
        .args(&["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");
    
    assert!(output.status.success(), "status command should succeed for empty workspace");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    assert!(stdout.contains("0 repositories total"), "status should show 0 repositories");
    assert!(stdout.contains("All repositories are clean"), "status should indicate all clean");
}

#[test]
fn test_status_with_git_repo() {
    let env = TestEnv::new("status_with_repo");
    
    // Create a workspace with a git repository
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();
    
    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace with repo",
    ).unwrap();
    
    // Create a simple git repository
    let repo_path = workspace_path.join("test-repo");
    fs::create_dir_all(&repo_path).unwrap();
    
    // Initialize git repo
    Command::new("git")
        .args(&["init"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init git repo");
    
    Command::new("git")
        .args(&["config", "user.email", "test@example.com"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git email");
    
    Command::new("git")
        .args(&["config", "user.name", "Test User"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git name");
    
    // Create and commit a file
    fs::write(repo_path.join("README.md"), "# Test Repo\n").unwrap();
    
    Command::new("git")
        .args(&["add", "."])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to add files");
    
    Command::new("git")
        .args(&["commit", "-m", "Initial commit"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to commit");
    
    // Run status command
    let output = Command::new(TestEnv::nut_binary())
        .args(&["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");
    
    assert!(output.status.success(), "status command should succeed");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    assert!(stdout.contains("1 repositories total"), "status should show 1 repository");
    assert!(stdout.contains("1 clean"), "status should show 1 clean repository");
    
    // Now make a change to test dirty repo detection
    fs::write(repo_path.join("newfile.txt"), "New content\n").unwrap();
    
    let output = Command::new(TestEnv::nut_binary())
        .args(&["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");
    
    assert!(output.status.success(), "status command should succeed for dirty repo");
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    assert!(stdout.contains("1 repositories total"), "status should show 1 repository");
    assert!(stdout.contains("1 with changes"), "status should show 1 repository with changes");
    assert!(stdout.contains("test-repo"), "status should show the repo name");
    assert!(stdout.contains("untracked file"), "status should mention untracked files");
}
