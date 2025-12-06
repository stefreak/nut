#![recursion_limit = "256"]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// Helper struct to manage a temporary test environment
struct TestEnv {
    temp_dir: PathBuf,
}

struct TestWorkspace {
    id: ulid::Ulid,
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
        let output = self.run_nut(&["data-dir"], None);
        assert!(output.status.success(), "data-dir command should succeed");
        let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        PathBuf::from(path_str)
    }

    /// Get the cache directory path for this test environment
    fn get_cache_dir(&self) -> PathBuf {
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
}

impl Drop for TestEnv {
    fn drop(&mut self) {
        // Clean up temp directory
        if self.temp_dir.exists() {
            fs::remove_dir_all(&self.temp_dir).ok();
        }
    }
}

/// Setup a fake GitHub API server that returns a minimal repository response
async fn setup_fake_github_server() -> MockServer {
    let mock_server = MockServer::start().await;

    // Create a comprehensive owner object matching GitHub API spec
    let owner_json = serde_json::json!({
        "login": "test-org",
        "id": 789,
        "node_id": "MDEyOk9yZ2FuaXphdGlvbjc4OQ==",
        "avatar_url": "https://avatars.githubusercontent.com/u/789?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/test-org",
        "html_url": "https://github.com/test-org",
        "followers_url": "https://api.github.com/users/test-org/followers",
        "following_url": "https://api.github.com/users/test-org/following{/other_user}",
        "gists_url": "https://api.github.com/users/test-org/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/test-org/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/test-org/subscriptions",
        "organizations_url": "https://api.github.com/users/test-org/orgs",
        "repos_url": "https://api.github.com/users/test-org/repos",
        "events_url": "https://api.github.com/users/test-org/events{/privacy}",
        "received_events_url": "https://api.github.com/users/test-org/received_events",
        "type": "Organization",
        "user_view_type": "public",
        "site_admin": false
    });

    // Create a comprehensive repository object
    let mut repo_json = serde_json::json!({
        "id": 123456,
        "node_id": "MDEwOlJlcG9zaXRvcnkxMjM0NTY=",
        "name": "test-repo",
        "full_name": "test-org/test-repo",
        "private": false,
        "html_url": "https://github.com/test-org/test-repo",
        "description": "Test repository",
        "fork": false,
        "url": "https://api.github.com/repos/test-org/test-repo",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "pushed_at": "2024-01-01T00:00:00Z",
        "git_url": "git://github.com/test-org/test-repo.git",
        "ssh_url": "git@github.com:test-org/test-repo.git",
        "clone_url": "https://github.com/test-org/test-repo.git",
        "svn_url": "https://github.com/test-org/test-repo",
        "homepage": null,
        "size": 100,
        "stargazers_count": 0,
        "watchers_count": 0,
        "language": "Rust",
        "has_issues": true,
        "has_projects": true,
        "has_downloads": true,
        "has_wiki": true,
        "has_pages": false,
        "has_discussions": false,
        "forks_count": 0,
        "mirror_url": null,
        "archived": false,
        "disabled": false,
        "open_issues_count": 0,
        "license": null,
        "allow_forking": true,
        "is_template": false,
        "web_commit_signoff_required": false,
        "topics": [],
        "visibility": "public",
        "forks": 0,
        "open_issues": 0,
        "watchers": 0,
        "default_branch": "main"
    });

    repo_json["owner"] = owner_json.clone();

    // Mock repository get endpoint
    Mock::given(method("GET"))
        .and(path("/repos/test-org/test-repo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(repo_json.clone()))
        .mount(&mock_server)
        .await;

    // Mock commits endpoint
    Mock::given(method("GET"))
        .and(path("/repos/test-org/test-repo/commits"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
            {
                "sha": "abc123def456",
                "node_id": "C_kwDOABCDEFGHI",
                "commit": {
                    "author": {
                        "name": "Test User",
                        "email": "test@example.com",
                        "date": "2024-01-01T00:00:00Z"
                    },
                    "committer": {
                        "name": "Test User",
                        "email": "test@example.com",
                        "date": "2024-01-01T00:00:00Z"
                    },
                    "message": "Initial commit",
                    "tree": {
                        "sha": "def456abc123",
                        "url": "https://api.github.com/repos/test-org/test-repo/git/trees/def456abc123"
                    },
                    "url": "https://api.github.com/repos/test-org/test-repo/git/commits/abc123def456",
                    "comment_count": 0
                },
                "url": "https://api.github.com/repos/test-org/test-repo/commits/abc123def456",
                "html_url": "https://github.com/test-org/test-repo/commit/abc123def456",
                "comments_url": "https://api.github.com/repos/test-org/test-repo/commits/abc123def456/comments",
                "author": null,
                "committer": null,
                "parents": []
            }
        ])))
        .mount(&mock_server)
        .await;

    // Add score field for search results
    let mut search_repo_json = repo_json.clone();
    search_repo_json["score"] = serde_json::json!(1.0);

    // Mock search repositories endpoint
    Mock::given(method("GET"))
        .and(path("/search/repositories"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "total_count": 1,
            "incomplete_results": false,
            "items": [search_repo_json]
        })))
        .mount(&mock_server)
        .await;

    mock_server
}

/// Create a fake bare git repository to simulate a GitHub repository
fn create_fake_git_repo(cache_dir: &PathBuf, host: &str, full_name: &str) {
    let repo_path = cache_dir.join(host).join(full_name);
    fs::create_dir_all(&repo_path).unwrap();

    // Initialize as a bare repository
    Command::new("git")
        .args(["init", "--bare"])
        .current_dir(&repo_path)
        .output()
        .expect("Failed to init bare git repo");

    // Create a temporary directory for the initial commit
    let temp_work_dir = repo_path
        .parent()
        .unwrap()
        .join(format!("{}_temp", full_name.replace('/', "_")));
    fs::create_dir_all(&temp_work_dir).unwrap();

    // Initialize a regular git repo in the temp directory
    Command::new("git")
        .args(["init"])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to init git repo");

    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to set git email");

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to set git name");

    // Create a file and commit it
    fs::write(temp_work_dir.join("README.md"), "# Test Repository\n").unwrap();

    Command::new("git")
        .args(["add", "."])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to add files");

    Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to commit");

    // Push to the bare repository
    Command::new("git")
        .args(["remote", "add", "origin", repo_path.to_str().unwrap()])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to add remote");

    Command::new("git")
        .args(["push", "origin", "main"])
        .current_dir(&temp_work_dir)
        .output()
        .expect("Failed to push to bare repo");

    // Clean up temp directory
    fs::remove_dir_all(&temp_work_dir).ok();
}

#[tokio::test]
async fn test_import_with_fake_github_server() {
    let env = TestEnv::new("fake_github_import");
    let workspace = env.create_workspace("Test workspace for fake GitHub");

    // Start fake GitHub server
    let mock_server = setup_fake_github_server().await;
    let server_url = mock_server.uri();

    // Use the full server URL (including http://)
    let github_host = server_url.trim_end_matches('/');

    // For git operations, we need just the host:port part
    let host_for_git = server_url
        .strip_prefix("http://")
        .unwrap_or(github_host)
        .trim_end_matches('/');

    // Create a fake git repository in the cache
    let cache_dir = env.get_cache_dir();
    create_fake_git_repo(&cache_dir, host_for_git, "test-org/test-repo");

    // For the test, we'll use dry-run mode since we can't actually clone from the mock server
    // The mock server only provides API responses, not actual git server functionality
    let output = env.run_nut(
        &[
            "import",
            "--workspace",
            &workspace.id.to_string(),
            "--dry-run",
            "--github-host",
            github_host,
            "--github-token",
            "fake-token",
            "test-org/test-repo",
        ],
        None,
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // In dry-run mode, it should succeed and print the repository name
    assert!(
        output.status.success(),
        "Import should succeed in dry-run mode. stdout: {}\nstderr: {}",
        stdout,
        stderr
    );
    assert!(
        stdout.contains("test-org/test-repo"),
        "Should print repository name, got: {}",
        stdout
    );
}

#[tokio::test]
async fn test_import_query_with_fake_github_server() {
    let env = TestEnv::new("fake_github_import_query");
    let workspace = env.create_workspace("Test workspace for fake GitHub query");

    // Start fake GitHub server
    let mock_server = setup_fake_github_server().await;
    let server_url = mock_server.uri();

    let github_host = server_url.trim_end_matches('/');

    // Run import with query using the fake server
    let output = env.run_nut(
        &[
            "import",
            "--workspace",
            &workspace.id.to_string(),
            "--dry-run",
            "--github-host",
            github_host,
            "--github-token",
            "fake-token",
            "--query",
            "org:test-org",
        ],
        None,
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // In dry-run mode, it should succeed and print the repository name
    assert!(
        output.status.success(),
        "Import with query should succeed in dry-run mode. stdout: {}\nstderr: {}",
        stdout,
        stderr
    );
    assert!(
        stdout.contains("test-org/test-repo"),
        "Should print repository name from search results, got: {}",
        stdout
    );
}

#[test]
fn test_cache_dir_structure_with_custom_host() {
    // Test that custom hosts result in proper cache directory structure
    let env = TestEnv::new("cache_dir_custom_host");
    let cache_dir = env.get_cache_dir();

    // Create a fake git repo with a custom host to verify the directory structure
    create_fake_git_repo(&cache_dir, "github.company.com", "myorg/myrepo");

    // Verify the directory exists
    let expected_path = cache_dir.join("github.company.com").join("myorg/myrepo");
    assert!(
        expected_path.exists(),
        "Cache directory should exist at {:?}",
        expected_path
    );

    // Verify it's a valid git repository
    assert!(
        expected_path.join("HEAD").exists(),
        "Should have HEAD file (bare repo)"
    );
}
