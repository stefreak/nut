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

        TestEnv { temp_dir }
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
    assert!(
        path_str.starts_with(env.temp_dir.to_str().unwrap()),
        "cache-dir path should be under the test HOME directory"
    );

    // Verify it contains "nut" in the path (the project name)
    assert!(
        path_str.contains("nut"),
        "cache-dir path should contain 'nut' directory"
    );
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
    assert!(
        path_str.starts_with(env.temp_dir.to_str().unwrap()),
        "data-dir path should be under the test HOME directory"
    );

    // Verify it contains "nut" in the path (the project name)
    assert!(
        path_str.contains("nut"),
        "data-dir path should contain 'nut' directory"
    );
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
    assert_eq!(
        stdout.trim(),
        "",
        "list should output nothing when no workspaces exist"
    );
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
    fs::write(workspace_path.join(".nut/description"), "Test workspace").unwrap();

    // Now test list
    let output = env.run_nut(&["list"]);

    assert!(output.status.success(), "list command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains(&workspace_id.to_string()),
        "list should contain workspace ID"
    );
    assert!(
        stdout.contains("Test workspace"),
        "list should contain workspace description"
    );
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
    )
    .unwrap();

    // Run status command with NUT_WORKSPACE_ID set
    let output = Command::new(TestEnv::nut_binary())
        .args(["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");

    assert!(
        output.status.success(),
        "status command should succeed for empty workspace"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("0 repositories total"),
        "status should show 0 repositories"
    );
    assert!(
        stdout.contains("All repositories are clean"),
        "status should indicate all clean"
    );
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
    )
    .unwrap();

    // Create a simple git repository
    let repo_path = workspace_path.join("test-repo");
    fs::create_dir_all(&repo_path).unwrap();

    // Initialize git repo
    Command::new("git")
        .args(["init"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git email");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git name");

    // Create and commit a file
    fs::write(repo_path.join("README.md"), "# Test Repo\n").unwrap();

    Command::new("git")
        .args(["add", "."])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to add files");

    Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to commit");

    // Run status command
    let output = Command::new(TestEnv::nut_binary())
        .args(["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");

    assert!(output.status.success(), "status command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("1 repositories total"),
        "status should show 1 repository"
    );
    assert!(
        stdout.contains("1 clean"),
        "status should show 1 clean repository"
    );

    // Now make a change to test dirty repo detection
    fs::write(repo_path.join("newfile.txt"), "New content\n").unwrap();

    let output = Command::new(TestEnv::nut_binary())
        .args(["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");

    assert!(
        output.status.success(),
        "status command should succeed for dirty repo"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("1 repositories total"),
        "status should show 1 repository"
    );
    assert!(
        stdout.contains("1 with changes"),
        "status should show 1 repository with changes"
    );
    assert!(
        stdout.contains("test-repo"),
        "status should show the repo name"
    );
    assert!(
        stdout.contains("untracked file"),
        "status should mention untracked files"
    );
}

#[test]
fn test_status_with_git_repo_nested() {
    let env = TestEnv::new("status_with_repo_nested");

    // Create a workspace with a git repository
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace with repo",
    )
    .unwrap();

    // Create a simple git repository
    let repo_path = workspace_path.join("some-org").join("test-repo");
    fs::create_dir_all(&repo_path).unwrap();

    // Initialize git repo
    Command::new("git")
        .args(["init"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git email");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git name");

    // Create and commit a file
    fs::write(repo_path.join("README.md"), "# Test Repo\n").unwrap();

    Command::new("git")
        .args(["add", "."])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to add files");

    Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to commit");

    // Run status command
    let output = Command::new(TestEnv::nut_binary())
        .args(["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");

    assert!(output.status.success(), "status command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("1 repositories total"),
        "status should show 1 repository"
    );
    assert!(
        stdout.contains("1 clean"),
        "status should show 1 clean repository"
    );

    // Now make a change to test dirty repo detection
    fs::write(repo_path.join("newfile.txt"), "New content\n").unwrap();

    let output = Command::new(TestEnv::nut_binary())
        .args(["status"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut status");

    assert!(
        output.status.success(),
        "status command should succeed for dirty repo"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("1 repositories total"),
        "status should show 1 repository"
    );
    assert!(
        stdout.contains("1 with changes"),
        "status should show 1 repository with changes"
    );
    assert!(
        stdout.contains("test-repo"),
        "status should show the repo name"
    );
    assert!(
        stdout.contains("untracked file"),
        "status should mention untracked files"
    );
}

#[test]
fn test_list_workspace_ordering() {
    let env = TestEnv::new("list_ordering");

    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    // Create workspaces with different timestamps by using thread sleep
    // Older workspace
    let older_workspace_id = ulid::Ulid::new();
    std::thread::sleep(std::time::Duration::from_millis(10));

    // Newer workspace
    let newer_workspace_id = ulid::Ulid::new();

    // Create older workspace
    let older_workspace_path = data_dir.join(older_workspace_id.to_string());
    fs::create_dir_all(older_workspace_path.join(".nut")).unwrap();
    fs::write(
        older_workspace_path.join(".nut/description"),
        "Older workspace",
    )
    .unwrap();

    // Create newer workspace
    let newer_workspace_path = data_dir.join(newer_workspace_id.to_string());
    fs::create_dir_all(newer_workspace_path.join(".nut")).unwrap();
    fs::write(
        newer_workspace_path.join(".nut/description"),
        "Newer workspace",
    )
    .unwrap();

    // Run list command
    let output = env.run_nut(&["list"]);

    assert!(output.status.success(), "list command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Verify both workspaces are listed
    assert!(
        stdout.contains(&newer_workspace_id.to_string()),
        "list should contain newer workspace ID"
    );
    assert!(
        stdout.contains(&older_workspace_id.to_string()),
        "list should contain older workspace ID"
    );
    assert!(
        stdout.contains("Newer workspace"),
        "list should contain newer workspace description"
    );
    assert!(
        stdout.contains("Older workspace"),
        "list should contain older workspace description"
    );

    // Verify ordering: newer workspace should appear before older workspace
    let newer_pos = stdout.find(&newer_workspace_id.to_string()).unwrap();
    let older_pos = stdout.find(&older_workspace_id.to_string()).unwrap();
    assert!(
        newer_pos < older_pos,
        "Newer workspace should appear before older workspace"
    );
}

#[test]
fn test_error_not_in_workspace() {
    let env = TestEnv::new("error_not_in_workspace");

    // Run status command without being in a workspace
    let output = env.run_nut(&["status"]);

    assert!(
        !output.status.success(),
        "status command should fail when not in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("Not in a workspace"),
        "Error message should indicate not in workspace"
    );
    assert!(
        stderr.contains("nut::workspace::not_entered"),
        "Error should have correct error code"
    );
}

#[test]
fn test_error_invalid_workspace_id() {
    let env = TestEnv::new("error_invalid_id");

    // Try to enter a workspace with an invalid ID
    let output = env.run_nut(&["enter", "invalid-workspace-id"]);

    assert!(
        !output.status.success(),
        "enter command should fail with invalid workspace ID"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("Invalid workspace ID"),
        "Error message should indicate invalid workspace ID"
    );
    assert!(
        stderr.contains("nut::workspace::invalid_id"),
        "Error should have correct error code"
    );
}

#[test]
fn test_error_already_in_workspace() {
    let env = TestEnv::new("error_already_in_workspace");

    // Create a workspace first
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(workspace_path.join(".nut/description"), "Test workspace").unwrap();

    // Try to create a new workspace while already in one
    let output = Command::new(TestEnv::nut_binary())
        .args(["create", "--description", "Another workspace"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut create");

    assert!(
        !output.status.success(),
        "create command should fail when already in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("Already in workspace"),
        "Error message should indicate already in workspace"
    );
    assert!(
        stderr.contains("nut::workspace::already_entered"),
        "Error should have correct error code"
    );
}

#[test]
fn test_no_color_flag() {
    let env = TestEnv::new("no_color_flag");

    // Run with --no-color flag (should still show error, just without colors)
    let output = env.run_nut(&["--no-color", "status"]);

    assert!(
        !output.status.success(),
        "status command should fail when not in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    // Should contain the error message but miette will respect the no-color setting
    assert!(
        stderr.contains("Not in a workspace"),
        "Error message should be present with --no-color"
    );
}

#[test]
fn test_no_color_env_var() {
    let env = TestEnv::new("no_color_env");

    // Run with NO_COLOR environment variable
    let output = Command::new(TestEnv::nut_binary())
        .args(["status"])
        .env("HOME", &env.temp_dir)
        .env("NO_COLOR", "1")
        .output()
        .expect("Failed to execute nut status");

    assert!(
        !output.status.success(),
        "status command should fail when not in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    // Should contain the error message but miette will respect the NO_COLOR env var
    assert!(
        stderr.contains("Not in a workspace"),
        "Error message should be present with NO_COLOR"
    );
}

#[test]
fn test_apply_basic_command() {
    let env = TestEnv::new("apply_basic");

    // Create a workspace with a git repository
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace for apply",
    )
    .unwrap();

    // Create a simple git repository
    let repo_path = workspace_path.join("test-repo");
    fs::create_dir_all(&repo_path).unwrap();

    Command::new("git")
        .args(["init"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git email");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git name");

    // Create and commit a file
    fs::write(repo_path.join("README.md"), "# Test Repo\n").unwrap();

    Command::new("git")
        .args(["add", "."])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to add files");

    Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to commit");

    // Test apply command with ls
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply", "--", "ls", "-la"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        output.status.success(),
        "apply command should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> test-repo <=="),
        "Output should show repository name"
    );
    assert!(
        stdout.contains("README.md"),
        "Output should show files from ls command"
    );
}

#[test]
fn test_apply_git_command() {
    let env = TestEnv::new("apply_git");

    // Create a workspace with a git repository
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace for apply",
    )
    .unwrap();

    // Create a simple git repository
    let repo_path = workspace_path.join("test-repo");
    fs::create_dir_all(&repo_path).unwrap();

    Command::new("git")
        .args(["init"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git email");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git name");

    // Create and commit a file
    fs::write(repo_path.join("README.md"), "# Test Repo\n").unwrap();

    Command::new("git")
        .args(["add", "."])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to add files");

    Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to commit");

    // Test apply with git command
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply", "--", "git", "status", "--short"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        output.status.success(),
        "apply command should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> test-repo <=="),
        "Output should show repository name"
    );
}

#[test]
fn test_apply_script_mode() {
    let env = TestEnv::new("apply_script");

    // Create a workspace with a git repository
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace for apply",
    )
    .unwrap();

    // Create a simple git repository
    let repo_path = workspace_path.join("test-repo");
    fs::create_dir_all(&repo_path).unwrap();

    Command::new("git")
        .args(["init"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git email");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to set git name");

    // Create a test script
    let script_path = env.temp_dir.join("test_script.sh");
    fs::write(&script_path, "#!/bin/bash\necho 'Hello from script'\nls\n").unwrap();

    // Make script executable on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&script_path).unwrap().permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&script_path, perms).unwrap();
    }

    // Test apply with script
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply", "--script", script_path.to_str().unwrap()])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        output.status.success(),
        "apply with script should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> test-repo <=="),
        "Output should show repository name"
    );
    assert!(
        stdout.contains("Hello from script"),
        "Output should show script output"
    );
}

#[test]
#[cfg(unix)]
fn test_apply_script_not_executable() {
    let env = TestEnv::new("apply_script_not_exec");

    // Create a workspace
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(workspace_path.join(".nut/description"), "Test workspace").unwrap();

    // Create a non-executable script
    let script_path = env.temp_dir.join("non_exec_script.sh");
    fs::write(&script_path, "#!/bin/bash\necho 'test'\n").unwrap();
    // Don't make it executable

    // Test apply with non-executable script
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply", "--script", script_path.to_str().unwrap()])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        !output.status.success(),
        "apply should fail with non-executable script"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("not executable"),
        "Error should mention script is not executable"
    );
}

#[test]
fn test_apply_script_not_found() {
    let env = TestEnv::new("apply_script_not_found");

    // Create a workspace
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(workspace_path.join(".nut/description"), "Test workspace").unwrap();

    // Test apply with non-existent script
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply", "--script", "/nonexistent/script.sh"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        !output.status.success(),
        "apply should fail with non-existent script"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("not found") || stderr.contains("not executable"),
        "Error should mention script not found or not executable"
    );
}

#[test]
fn test_apply_no_command() {
    let env = TestEnv::new("apply_no_command");

    // Create a workspace
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(workspace_path.join(".nut/description"), "Test workspace").unwrap();

    // Test apply without command or script
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        !output.status.success(),
        "apply should fail without command or script"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("No command provided") || stderr.contains("missing_command"),
        "Error should mention missing command"
    );
}

#[test]
fn test_apply_multiple_repos() {
    let env = TestEnv::new("apply_multi_repos");

    // Create a workspace with multiple git repositories
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let workspace_id = ulid::Ulid::new();
    let workspace_path = data_dir.join(workspace_id.to_string());
    fs::create_dir_all(workspace_path.join(".nut")).unwrap();
    fs::write(
        workspace_path.join(".nut/description"),
        "Test workspace with multiple repos",
    )
    .unwrap();

    // Create first repo
    let repo1_path = workspace_path.join("repo-1");
    fs::create_dir_all(&repo1_path).unwrap();
    Command::new("git")
        .args(["init"])
        .current_dir(&repo1_path)
        .output()
        .expect("Failed to init git repo 1");

    // Create second repo
    let repo2_path = workspace_path.join("repo-2");
    fs::create_dir_all(&repo2_path).unwrap();
    Command::new("git")
        .args(["init"])
        .current_dir(&repo2_path)
        .output()
        .expect("Failed to init git repo 2");

    // Test apply command with echo
    let output = Command::new(TestEnv::nut_binary())
        .args(["apply", "--", "pwd"])
        .env("HOME", &env.temp_dir)
        .env("NUT_WORKSPACE_ID", workspace_id.to_string())
        .output()
        .expect("Failed to execute nut apply");

    assert!(
        output.status.success(),
        "apply command should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> repo-1 <=="),
        "Output should show first repository name"
    );
    assert!(
        stdout.contains("==> repo-2 <=="),
        "Output should show second repository name"
    );
    assert!(
        stdout.contains("repo-1") && stdout.contains("repo-2"),
        "Output should include both repo paths"
    );
}
