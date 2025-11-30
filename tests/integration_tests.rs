use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Helper struct to manage a temporary test environment
struct TestEnv {
    temp_dir: PathBuf,
}

struct TestWorkspace {
    id: ulid::Ulid,
    path: PathBuf,
}

struct TestRepo {
    #[allow(dead_code)]
    workspace_id: ulid::Ulid,
    #[allow(dead_code)]
    path_relative: PathBuf,
    path: PathBuf,
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
            temp_dir: temp_dir
                .canonicalize()
                .expect("Failed to canonicalize tmp dir"),
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

    fn nut_working_directory(&self, workspace_id: Option<ulid::Ulid>) -> PathBuf {
        let working_directory = match workspace_id {
            Some(id) => self.get_data_dir().join(id.to_string()),
            None => self.temp_dir.clone(),
        }
        // this makes sure that commands work even when not in workspace root or $HOME
        .join("random_working_directory");

        // ensure working directory exists
        fs::create_dir_all(&working_directory).unwrap();

        working_directory
    }

    /// Execute nut command with given arguments
    fn run_nut(&self, args: &[&str], workspace_id: Option<ulid::Ulid>) -> std::process::Output {
        let working_directory = self.nut_working_directory(workspace_id);

        Command::new(Self::nut_binary())
            .args(args)
            .current_dir(&working_directory)
            .env("HOME", &self.temp_dir)
            .output()
            .expect("Failed to execute nut command")
    }

    /// Get the data directory path for this test environment
    fn get_data_dir(&self) -> PathBuf {
        // Run the actual nut data-dir command to get the platform-specific path
        // This works cross-platform (Linux, macOS, Windows) using the directories crate
        let output = self.run_nut(&["data-dir"], None);
        assert!(output.status.success(), "data-dir command should succeed");
        let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        PathBuf::from(path_str)
    }

    /// Get the cache directory path for this test environment
    #[allow(dead_code)]
    fn get_cache_dir(&self) -> PathBuf {
        // Run the actual nut cache-dir command to get the platform-specific path
        // This works cross-platform (Linux, macOS, Windows) using the directories crate
        let output = self.run_nut(&["cache-dir"], None);
        assert!(output.status.success(), "cache-dir command should succeed");
        let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        PathBuf::from(path_str)
    }

    /// Create a workspace with a git repository for testing
    fn create_workspace(&self, description: &str) -> TestWorkspace {
        let data_dir = self.get_data_dir();
        fs::create_dir_all(&data_dir).unwrap();

        let workspace_id = ulid::Ulid::new();
        let workspace_path = data_dir.join(workspace_id.to_string());
        fs::create_dir_all(workspace_path.join(".nut")).unwrap();
        fs::write(workspace_path.join(".nut/description"), description).unwrap();

        TestWorkspace {
            id: workspace_id,
            path: workspace_path,
        }
    }

    /// Create a workspace with a git repository for testing
    fn create_repo(&self, workspace: &TestWorkspace, org_name: &str, repo_name: &str) -> TestRepo {
        let repo_path_relative = PathBuf::from(org_name).join(repo_name);
        let repo_path = workspace.path.join(&repo_path_relative);

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

        TestRepo {
            workspace_id: workspace.id,
            path_relative: repo_path_relative,
            path: repo_path,
        }
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

    let output = env.run_nut(&["cache-dir"], None);

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
        "cache-dir path should contain 'nut' directory, got: {path_str}"
    );
}

#[test]
fn test_data_dir_command() {
    let env = TestEnv::new("data_dir");

    let output = env.run_nut(&["data-dir"], None);

    assert!(output.status.success(), "data-dir command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let path_str = stdout.trim();

    // Verify the output is a valid path
    assert!(!path_str.is_empty(), "data-dir should output a path");

    // Verify it's under the test HOME directory
    assert!(
        path_str.starts_with(env.temp_dir.to_str().unwrap()),
        "data-dir path should be under the test HOME directory, got: {path_str}"
    );

    // Verify it contains "nut" in the path (the project name)
    assert!(
        path_str.contains("nut"),
        "data-dir path should contain 'nut' directory, got: {path_str}"
    );
}

#[test]
fn test_list_empty_workspaces() {
    let env = TestEnv::new("list_empty");

    // Create the data directory first (the list command expects it to exist)
    let data_dir = env.get_data_dir();
    fs::create_dir_all(&data_dir).unwrap();

    let output = env.run_nut(&["list"], None);

    assert!(output.status.success(), "list command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    // When there are no workspaces, output should be empty
    assert_eq!(
        stdout.trim(),
        "",
        "list should output nothing when no workspaces exist, got:\n{stdout}"
    );
}

#[test]
fn test_create_workspace_simple() {
    let env = TestEnv::new("create_simple");

    let workspace = env.create_workspace("Test workspace");

    // Now test list
    let output = env.run_nut(&["list"], None);

    assert!(output.status.success(), "list command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains(&workspace.id.to_string()),
        "list should contain workspace ID, got: \n{stdout}"
    );
    assert!(
        stdout.contains("Test workspace"),
        "list should contain workspace description, got: \n{stdout}"
    );
}

#[test]
fn test_status_empty_workspace() {
    let env = TestEnv::new("status_empty");

    let workspace = env.create_workspace("Test workspace for status");

    let output = env.run_nut(&["status"], Some(workspace.id));

    assert!(
        output.status.success(),
        "status command should succeed for empty workspace"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("0 repositories total"),
        "status should show 0 repositories, got:\n{stdout}"
    );
    assert!(
        stdout.contains("All repositories are clean"),
        "status should indicate all clean, got:\n{stdout}"
    );
}

#[test]
fn test_status_with_git_repo() {
    let env: TestEnv = TestEnv::new("status_with_repo");

    let workspace = env.create_workspace("Test workspace with repo");
    let repo = env.create_repo(&workspace, "some-org", "test-repo");

    let output = env.run_nut(&["status"], Some(workspace.id));

    assert!(output.status.success(), "status command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("1 repositories total"),
        "status should show 1 repository, got:\n{stdout}"
    );
    assert!(
        stdout.contains("1 clean"),
        "status should show 1 clean repository, got:\n{stdout}"
    );

    // Now make a change to test dirty repo detection
    fs::write(repo.path.join("newfile.txt"), "New content\n").unwrap();

    let output = env.run_nut(&["status"], Some(workspace.id));

    assert!(
        output.status.success(),
        "status command should succeed for dirty repo"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert!(
        stdout.contains("1 repositories total"),
        "status should show 1 repository, got:\n{stdout}"
    );
    assert!(
        stdout.contains("1 with changes"),
        "status should show 1 repository with changes, got:\n{stdout}"
    );
    assert!(
        stdout.contains("test-repo"),
        "status should show the repo name, got:\n{stdout}"
    );
    assert!(
        stdout.contains("untracked file"),
        "status should mention untracked files, got:\n{stdout}"
    );
}

#[test]
fn test_list_workspace_ordering() {
    let env = TestEnv::new("list_ordering");

    // Create workspaces with different timestamps by using thread sleep
    let older_workspace = env.create_workspace("Older workspace");
    std::thread::sleep(std::time::Duration::from_millis(10));
    let newer_workspace = env.create_workspace("Newer workspace");

    // Run list command
    let output = env.run_nut(&["list"], None);

    assert!(output.status.success(), "list command should succeed");

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Verify both workspaces are listed
    assert!(
        stdout.contains(&newer_workspace.id.to_string()),
        "list should contain newer workspace ID, got:\n{stdout}"
    );
    assert!(
        stdout.contains(&older_workspace.id.to_string()),
        "list should contain older workspace ID, got:\n{stdout}"
    );
    assert!(
        stdout.contains("Newer workspace"),
        "list should contain newer workspace description, got:\n{stdout}"
    );
    assert!(
        stdout.contains("Older workspace"),
        "list should contain older workspace description, got:\n{stdout}"
    );

    // Verify ordering: newer workspace should appear before older workspace
    let newer_pos = stdout.find(&newer_workspace.id.to_string()).unwrap();
    let older_pos = stdout.find(&older_workspace.id.to_string()).unwrap();
    assert!(
        newer_pos < older_pos,
        "Newer workspace should appear before older workspace"
    );
}

#[test]
fn test_error_not_in_workspace() {
    let env = TestEnv::new("error_not_in_workspace");

    // Run status command without being in a workspace
    let output = env.run_nut(&["status"], None);

    assert!(
        !output.status.success(),
        "status command should fail when not in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("Not in a workspace"),
        "Error message should indicate not in workspace, got:\n{stderr}"
    );
    assert!(
        stderr.contains("nut::workspace::not_entered"),
        "Error should have correct error code, got:\n{stderr}"
    );
}

#[test]
fn test_error_invalid_workspace_id() {
    let env = TestEnv::new("error_invalid_id");

    // Try to enter a workspace with an invalid ID
    let output = env.run_nut(&["enter", "invalid-workspace-id"], None);

    assert!(
        !output.status.success(),
        "enter command should fail with invalid workspace ID"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("Invalid workspace ID"),
        "Error message should indicate invalid workspace ID, got:\n{stderr}"
    );
    assert!(
        stderr.contains("nut::workspace::invalid_id"),
        "Error should have correct error code, got:\n{stderr}"
    );
}

#[test]
fn test_error_already_in_workspace() {
    let env = TestEnv::new("error_already_in_workspace");

    // Create a workspace first
    let workspace = env.create_workspace("Test workspace");

    // Try to create a new workspace while already in one
    let output = env.run_nut(
        &["create", "--description", "Another workspace"],
        Some(workspace.id),
    );

    assert!(
        !output.status.success(),
        "create command should fail when already in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("Already in workspace"),
        "Error message should indicate already in workspace, got:\n{stderr}"
    );
    assert!(
        stderr.contains("nut::workspace::already_entered"),
        "Error should have correct error code, got:\n{stderr}"
    );
}

#[test]
fn test_no_color_flag() {
    let env = TestEnv::new("no_color_flag");

    // Run with --no-color flag (should still show error, just without colors)
    let output = env.run_nut(&["--no-color", "status"], None);

    assert!(
        !output.status.success(),
        "status command should fail when not in a workspace"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    // Should contain the error message but miette will respect the no-color setting
    assert!(
        stderr.contains("Not in a workspace"),
        "Error message should be present with --no-color, got:\n{stderr}"
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
        "Error message should be present with NO_COLOR, got:\n{stderr}"
    );
}

#[test]
fn test_apply_basic_command() {
    let env = TestEnv::new("apply_basic");
    let workspace = env.create_workspace("Test workspace for apply");
    env.create_repo(&workspace, "test-org", "test-repo");

    // Test apply command with ls
    let output = env.run_nut(&["apply", "ls", "-la"], Some(workspace.id));

    assert!(
        output.status.success(),
        "apply command should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> test-org/test-repo <=="),
        "Output should show repository name, got:\n{stdout}"
    );
    assert!(
        stdout.contains("README.md"),
        "Output should show files from ls command, got:\n{stdout}"
    );
}

#[test]
fn test_apply_git_command() {
    let env = TestEnv::new("apply_git");
    let workspace = env.create_workspace("Test workspace for apply");
    env.create_repo(&workspace, "test-org", "test-repo");

    // Test apply command with ls
    let output = env.run_nut(
        &["apply", "--", "git", "status", "--short"],
        Some(workspace.id),
    );

    assert!(
        output.status.success(),
        "apply command should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> test-org/test-repo <=="),
        "Output should show repository name, got:\n{stdout}"
    );
}

#[test]
fn test_apply_script_mode() {
    let env = TestEnv::new("apply_script");
    let workspace = env.create_workspace("Test workspace for apply");
    env.create_repo(&workspace, "test-org", "test-repo");

    let working_directory = env.nut_working_directory(Some(workspace.id));

    // Create a test script
    let script_path = working_directory.join("test_script.sh");
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
    let output = env.run_nut(
        &[
            "apply",
            "--script",
            script_path.file_name().unwrap().to_str().unwrap(),
        ],
        Some(workspace.id),
    );

    assert!(
        output.status.success(),
        "apply with script should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> test-org/test-repo <=="),
        "Output should show repository name, got:\n{stdout}"
    );
    assert!(
        stdout.contains("Hello from script"),
        "Output should show script output, got:\n{stdout}"
    );
}

#[test]
#[cfg(unix)]
fn test_apply_script_not_executable() {
    let env = TestEnv::new("apply_script_not_exec");

    // Create a workspace
    let workspace = env.create_workspace("Test workspace");
    env.create_repo(&workspace, "test-org", "test-repo");

    let working_directory = env.nut_working_directory(Some(workspace.id));

    // Create a non-executable script
    // NOTE: The Script is not executable in this test case.
    let script_path = working_directory.join("non_exec_script.sh");
    fs::write(&script_path, "#!/bin/bash\necho 'test'\n").unwrap();

    // Test apply with non-executable script
    let output = env.run_nut(
        &[
            "apply",
            "--script",
            script_path.file_name().unwrap().to_str().unwrap(),
        ],
        Some(workspace.id),
    );
    assert!(
        !output.status.success(),
        "apply should fail with non-executable script"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("not executable"),
        "Error should mention script is not executable, got:\n{stderr}"
    );
}

#[test]
fn test_apply_script_not_found() {
    let env = TestEnv::new("apply_script_not_found");

    let workspace = env.create_workspace("Test workspace");
    env.create_repo(&workspace, "test-org", "test-repo");

    // Test apply with non-executable script
    let output = env.run_nut(
        &[
            "apply",
            "--script",
            "relative/path/script_does_not_exist.sh",
        ],
        Some(workspace.id),
    );

    assert!(
        !output.status.success(),
        "apply should fail with non-existent script"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("Invalid script path"),
        "Error should mention script path is invalid, got:\n{stderr}"
    );
    assert!(
        stderr.contains("relative/path/script_does_not_exist.sh"),
        "Error should mention nonexistant script path, got:\n{stderr}"
    );
    assert!(
        stderr.contains("No such file or directory (os error 2)"),
        "Error should mention underlying OS error, got:\n{stderr}"
    );
    assert!(
        stderr.contains("help: Make sure the script path is correct and accessible"),
        "Error should provide help suggestion, got:\n{stderr}"
    );
}

#[test]
fn test_apply_no_command() {
    let env = TestEnv::new("apply_no_command");

    let workspace = env.create_workspace("Test workspace");
    env.create_repo(&workspace, "test-org", "test-repo");

    let output = env.run_nut(&["apply"], Some(workspace.id));

    assert!(
        !output.status.success(),
        "apply should fail without command or script"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("No command provided") || stderr.contains("missing_command"),
        "Error should mention missing command, got:\n{stderr}"
    );
}

#[test]
fn test_apply_multiple_repos() {
    let env = TestEnv::new("apply_multi_repos");

    let workspace = env.create_workspace("Test workspace with multiple repos");

    env.create_repo(&workspace, "org", "repo-1");
    env.create_repo(&workspace, "org", "repo-2");

    // Test apply command with echo
    let output = env.run_nut(&["apply", "--", "pwd"], Some(workspace.id));

    assert!(
        output.status.success(),
        "apply command should succeed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("==> org/repo-1 <=="),
        "Output should show first repository name, got:\n{stdout}"
    );
    assert!(
        stdout.contains("==> org/repo-2 <=="),
        "Output should show second repository name, got:\n{stdout}"
    );
    assert!(
        stdout.contains("org/repo-1") && stdout.contains("org/repo-2"),
        "Output should include both repo paths, got:\n{stdout}"
    );
}

#[test]
fn test_import_without_token_or_gh() {
    let env = TestEnv::new("import_no_token");

    let workspace = env.create_workspace("Test workspace for import");

    // Try to import without providing a token and with PATH that doesn't include gh
    let output = env.run_nut(
        &["import", "--user", "testuser", "--repo", "testrepo"],
        Some(workspace.id),
    );

    assert!(
        !output.status.success(),
        "import command should fail when no token provided and gh not available"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(
        stderr.contains("GitHub token required") || stderr.contains("No GitHub token provided"),
        "Error message should indicate token is required. Got: {}",
        stderr
    );
}

#[test]
fn test_import_parallel_option() {
    let env = TestEnv::new("import_parallel_option");

    let workspace = env.create_workspace("Test workspace for import with parallel option");

    // Test that the parallel option is accepted
    let output = env.run_nut(
        &[
            "import",
            "--user",
            "testuser",
            "--repo",
            "testrepo",
            "--parallel",
            "8",
        ],
        Some(workspace.id),
    );

    // This should still fail due to missing token, but it should accept the parallel option
    assert!(
        !output.status.success(),
        "import command should fail when no token provided"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);

    // Should fail due to token, not due to invalid parallel option
    assert!(
        stderr.contains("GitHub token required") || stderr.contains("No GitHub token provided"),
        "Error message should indicate token is required (not parallel option error). Got: {}",
        stderr
    );
}
