//! Integration tests for workspace operations.

use serial_test::serial;
use std::fs;
use std::path::PathBuf;

/// Helper struct to manage a temporary test environment.
struct TestEnv {
    temp_dir: PathBuf,
}

impl TestEnv {
    /// Create a new test environment with isolated directories.
    fn new(test_name: &str) -> Self {
        let temp_dir = std::env::temp_dir().join(format!("nut_core_test_{}", test_name));

        // Clean up if it exists from a previous run
        if temp_dir.exists() {
            fs::remove_dir_all(&temp_dir).ok();
        }

        fs::create_dir_all(&temp_dir).unwrap();

        let env = TestEnv {
            temp_dir: temp_dir
                .canonicalize()
                .expect("Failed to canonicalize tmp dir"),
        };

        // Set up config file with workspace directory
        env.setup_config();

        env
    }

    /// Set up config file with default workspace directory.
    fn setup_config(&self) {
        let config_path = self.temp_dir.join(".nut.json");
        let workspace_dir = self.temp_dir.join("workspaces");
        let config = format!(
            r#"{{
  "workspace_dir": "{}"
}}"#,
            workspace_dir.display()
        );
        fs::write(config_path, config).unwrap();
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

#[tokio::test]
#[serial]
async fn test_create_and_list_workspace() {
    let env = TestEnv::new("create_list");
    
    // Set HOME to our test directory so config is found
    // SAFETY: This is safe in single-threaded test context
    unsafe { std::env::set_var("HOME", &env.temp_dir) };
    
    // Create a workspace
    let workspace = nut_core::workspace::create_workspace("Test workspace".to_string())
        .await
        .expect("Failed to create workspace");
    
    assert!(!workspace.id.to_string().is_empty());
    assert!(workspace.path.exists());
    assert!(workspace.path.join(".nut/description").exists());
    
    // Verify description was written
    let description = std::fs::read_to_string(workspace.path.join(".nut/description"))
        .expect("Failed to read description");
    assert_eq!(description, "Test workspace");
    
    // List workspaces
    let workspaces = nut_core::workspace::list_workspaces()
        .await
        .expect("Failed to list workspaces");
    
    assert_eq!(workspaces.len(), 1);
    assert_eq!(workspaces[0].id, workspace.id.to_string());
    assert_eq!(workspaces[0].description, "Test workspace");
}

#[tokio::test]
#[serial]
async fn test_list_multiple_workspaces_sorted() {
    let env = TestEnv::new("list_multiple");
    
    // Set HOME to our test directory so config is found
    // SAFETY: This is safe in single-threaded test context
    unsafe { std::env::set_var("HOME", &env.temp_dir) };
    
    // Create multiple workspaces with small delays
    let _ws1 = nut_core::workspace::create_workspace("First workspace".to_string())
        .await
        .expect("Failed to create workspace 1");
    
    // Small delay to ensure different ULIDs
    tokio::time::sleep(tokio::time::Duration::from_millis(2)).await;
    
    let _ws2 = nut_core::workspace::create_workspace("Second workspace".to_string())
        .await
        .expect("Failed to create workspace 2");
    
    tokio::time::sleep(tokio::time::Duration::from_millis(2)).await;
    
    let _ws3 = nut_core::workspace::create_workspace("Third workspace".to_string())
        .await
        .expect("Failed to create workspace 3");
    
    // List workspaces - should be sorted most recent first
    let workspaces = nut_core::workspace::list_workspaces()
        .await
        .expect("Failed to list workspaces");
    
    assert_eq!(workspaces.len(), 3);
    assert_eq!(workspaces[0].description, "Third workspace");
    assert_eq!(workspaces[1].description, "Second workspace");
    assert_eq!(workspaces[2].description, "First workspace");
}

#[tokio::test]
#[serial]
async fn test_get_workspace_info() {
    let env = TestEnv::new("get_info");
    
    // Set HOME to our test directory so config is found
    // SAFETY: This is safe in single-threaded test context
    unsafe { std::env::set_var("HOME", &env.temp_dir) };
    
    // Create a workspace
    let workspace = nut_core::workspace::create_workspace("Info test workspace".to_string())
        .await
        .expect("Failed to create workspace");
    
    // Get workspace info
    let info = nut_core::workspace::get_workspace_info(&workspace.id.to_string())
        .await
        .expect("Failed to get workspace info");
    
    assert_eq!(info.id, workspace.id.to_string());
    assert_eq!(info.description, "Info test workspace");
    assert_eq!(info.path, workspace.path);
}
