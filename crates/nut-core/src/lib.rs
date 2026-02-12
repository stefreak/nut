//! nut-core: Core library for the nut workspace manager.
//!
//! This library provides the core functionality for managing workspaces
//! containing multiple git repositories. It is designed to be used by
//! both the CLI and GUI applications.
//!
//! # Main Components
//!
//! - [`workspace`]: Create, list, and manage workspaces
//! - [`config`]: Configuration file operations
//! - [`dirs`]: Directory resolution (data dir, cache dir)
//! - [`git`]: Git repository operations
//! - [`gh`]: GitHub integration
//! - [`error`]: Error types
//!
//! # Example
//!
//! ```rust,ignore
//! use nut_core::workspace;
//!
//! async fn example() -> nut_core::error::Result<()> {
//!     // Create a new workspace
//!     let workspace = workspace::create_workspace("My project".to_string()).await?;
//!     println!("Created workspace: {}", workspace.id);
//!     
//!     // List all workspaces
//!     let workspaces = workspace::list_workspaces().await?;
//!     for ws in workspaces {
//!         println!("{}: {}", ws.id, ws.description);
//!     }
//!     
//!     Ok(())
//! }
//! ```

pub mod config;
pub mod dirs;
pub mod error;
pub mod gh;
pub mod git;
pub mod workspace;

// Re-export commonly used types at the crate root
pub use config::NutConfig;
pub use error::{NutError, Result};
pub use workspace::{Workspace, WorkspaceInfo};
