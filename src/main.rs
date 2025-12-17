mod config;
mod dirs;
mod enter;
mod error;
mod gh;
mod git;
mod workspace;

use std::ffi::OsStr;
use std::io::{Write, stdout};

use chrono::{DateTime, Utc};
use clap::{Parser, Subcommand};
use miette::{IntoDiagnostic, Result};
use ulid::Ulid;

use crate::dirs::{get_cache_dir, get_data_local_dir};
use crate::error::NutError;
use crate::workspace::Workspace;

#[derive(Parser)]
#[command(arg_required_else_help = true, version, about, long_about = None)]
struct Cli {
    /// Turn debugging information on
    #[arg(short, long, action = clap::ArgAction::Count)]
    debug: u8,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new workspace and enter
    Create {
        /// lists test values
        #[arg(short, long)]
        description: String,
    },
    /// Enter an existing workspace
    Enter {
        /// Workspace ID
        id: String,
    },
    /// List existing workspaces
    List {},
    /// Show status of a workspace
    Status {
        /// Workspace ID
        /// If not provided, uses the currently entered workspace
        #[arg(short, long)]
        workspace: Option<String>,
    },
    /// Run a command in each repository
    Apply {
        /// Workspace ID
        /// If not provided, uses the currently entered workspace
        #[arg(short, long)]
        workspace: Option<String>,

        /// Path to an executable script to run
        #[arg(short, long)]
        script: Option<clap::builder::OsStr>,

        /// Command and arguments to run (must come after --)
        #[arg(trailing_var_arg = true, required = false)]
        command: Vec<clap::builder::OsStr>,
    },
    /// Import repositories into a workspace
    Import {
        /// Workspace ID
        /// If not provided, uses the currently entered workspace
        #[arg(short, long)]
        workspace: Option<String>,

        /// Do not actually clone, only print the repository names
        #[arg(short, long)]
        dry_run: bool,

        /// Search query to find repositories (uses GitHub search syntax)
        /// Example: "owner:stefreak language:rust -fork:true"
        /// See https://github.com/search for query syntax
        #[arg(short, long)]
        query: Option<String>,

        #[arg(short, long)]
        github_token: Option<String>,

        /// List of specific repositories to import (full names, e.g. owner/repo)
        /// Mutually exclusive with --query option
        #[arg(trailing_var_arg = true, required = false)]
        full_repository_names: Vec<String>,
    },
    /// Print git cache directory
    CacheDir {},
    /// Print data directory containing workspaces
    DataDir {},
    /// Print workspace directory
    WorkspaceDir {
        /// Workspace ID
        /// If not provided, uses the currently entered workspace
        #[arg(short, long)]
        workspace: Option<String>,
    },
    /// Configure nut settings
    Config {
        /// Set the workspace directory
        #[arg(short, long)]
        workspace_dir: Option<String>,

        /// Set the cache directory
        #[arg(short, long)]
        cache_dir: Option<String>,
    },
}

/// Process a repository: fetch commit info and clone
async fn process_repo(
    workspace_path: &std::path::Path,
    crab: &octocrab::Octocrab,
    details: octocrab::models::Repository,
    dry_run: bool,
) -> Result<()> {
    let repo = crab.repos(
        details.owner.ok_or(NutError::InvalidUtf8)?.login,
        details.name,
    );
    let full_name = &details.full_name.ok_or(NutError::InvalidUtf8)?;
    println!("{}", full_name);

    if dry_run {
        return Ok(());
    }

    let default_branch = &details.default_branch;
    let latest_commit = match default_branch {
        Some(d) => repo
            .list_commits()
            .branch(d)
            .send()
            .await
            .unwrap_or_default()
            .take_items()
            .first()
            .map(|c| c.sha.clone()),
        None => None,
    };
    git::clone(workspace_path, full_name, &latest_commit, default_branch).await?;
    Ok(())
}

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Install the fancy error handler with default theme
    miette::set_hook(Box::new(|_| {
        Box::new(
            miette::GraphicalReportHandler::new().with_theme(miette::GraphicalTheme::default()),
        )
    }))?;

    // You can see how many times a particular flag or argument occurred
    // Note, only flags can have multiple occurrences
    match cli.debug {
        0 => {}
        1 => println!("Debug mode is kind of on"),
        2 => println!("Debug mode is on"),
        _ => println!("Don't be crazy"),
    }

    // You can check for the existence of subcommands, and if found use their
    // matches just as you would the top level cmd
    match &cli.command {
        Some(Commands::Create { description }) => {
            if enter::get_entered_workspace().await.is_ok() {
                return Err(NutError::AlreadyInWorkspace.into());
            }

            let data_local_dir = dirs::get_data_local_dir().await?;

            let ulid = ulid::Ulid::new();

            let workspace_path = data_local_dir.join(ulid.to_string()).join(".nut");
            tokio::fs::create_dir_all(&workspace_path)
                .await
                .map_err(|e| NutError::CreateDirectoryFailed {
                    path: workspace_path.clone(),
                    source: e,
                })?;

            // write description file
            let desc_path = data_local_dir
                .join(ulid.to_string())
                .join(".nut/description");
            tokio::fs::write(&desc_path, description)
                .await
                .map_err(|e| NutError::WriteFileFailed {
                    path: desc_path,
                    source: e,
                })?;

            enter::enter(ulid).await?;
        }
        Some(Commands::Enter { id }) => {
            if enter::get_entered_workspace().await.is_ok() {
                return Err(NutError::AlreadyInWorkspace.into());
            }

            let ulid = id.parse().map_err(|e| NutError::InvalidWorkspaceId {
                id: id.clone(),
                source: e,
            })?;
            enter::enter(ulid).await?;
        }
        Some(Commands::List {}) => {
            let data_local_dir = dirs::get_data_local_dir().await?;
            let mut entries = tokio::fs::read_dir(&data_local_dir).await.map_err(|e| {
                NutError::ReadDirectoryFailed {
                    path: data_local_dir.clone(),
                    source: e,
                }
            })?;

            // Collect all workspaces with their metadata
            let mut workspaces: Vec<(Ulid, DateTime<Utc>, String)> = Vec::new();

            while let Some(entry) = entries.next_entry().await.into_diagnostic()? {
                if entry.file_type().await.into_diagnostic()?.is_dir() {
                    let ulid_str = entry
                        .file_name()
                        .into_string()
                        .map_err(|_| NutError::InvalidUtf8)?;
                    if let Ok(ulid) = Ulid::from_string(&ulid_str) {
                        let datetime: DateTime<Utc> = ulid.datetime().into();
                        let desc_path = entry.path().join(".nut/description");
                        let description = tokio::fs::read_to_string(&desc_path)
                            .await
                            .unwrap_or("(missing description)".to_string());
                        workspaces.push((ulid, datetime, description));
                    }
                }
            }

            // Sort by timestamp, most recent first
            workspaces.sort_by(|a, b| b.1.cmp(&a.1));

            // Display workspaces
            for (ulid, datetime, description) in workspaces {
                println!("{}", ulid.to_string());
                println!("  Created: {}", datetime.format("%Y-%m-%d %H:%M:%S"));
                println!("  {}", description);
                println!();
            }
        }
        Some(Commands::Status { workspace }) => {
            let workspace = Workspace::resolve(workspace).await?;
            let statuses = git::get_all_repos_status(&workspace.path).await?;

            // Count repositories with and without changes
            let repos_with_changes: Vec<_> = statuses.iter().filter(|s| s.has_changes).collect();
            let total_repos = statuses.len();
            let clean_repos = total_repos - repos_with_changes.len();

            // Print summary
            println!("Workspace status:");
            println!("  {} repositories total", total_repos);
            println!(
                "  {} clean, {} with changes",
                clean_repos,
                repos_with_changes.len()
            );
            println!();

            // Print details for repos with changes
            if repos_with_changes.is_empty() {
                println!("All repositories are clean.");
            } else {
                println!("Repositories with changes:");
                println!();

                for status in repos_with_changes {
                    println!(
                        "  {} ({})",
                        status.path_relative.to_string_lossy(),
                        status.current_branch
                    );

                    if status.staged_files > 0 {
                        println!("    {} file(s) with staged changes", status.staged_files);
                    }
                    if status.modified_files > 0 {
                        println!(
                            "    {} file(s) with unstaged changes",
                            status.modified_files
                        );
                    }
                    if status.untracked_files > 0 {
                        println!("    {} untracked file(s)", status.untracked_files);
                    }
                    println!();
                }
            }
        }
        Some(Commands::Apply {
            workspace,
            script,
            command,
        }) => {
            let workspace = Workspace::resolve(workspace).await?;

            // Handle script mode
            if let Some(script_path) = script {
                let absolute_script_path =
                    tokio::fs::canonicalize(script_path).await.map_err(|e| {
                        NutError::ScriptPathInvalid {
                            path: script_path.display().to_string(),
                            source: e,
                        }
                    })?;

                // only for unix
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let metadata =
                        tokio::fs::metadata(&absolute_script_path)
                            .await
                            .map_err(|e| NutError::ScriptPathInvalid {
                                path: script_path.display().to_string(),
                                source: e,
                            })?;
                    let permissions = metadata.permissions();
                    if (permissions.mode() & 0o111) == 0 {
                        return Err(NutError::ScriptNotExecutable {
                            path: script_path.display().to_string(),
                        }
                        .into());
                    }
                }

                let mut args: Vec<&OsStr> = vec![absolute_script_path.as_os_str()];
                args.extend(command.iter().map(|s| s.as_os_str()));
                git::apply_command(&workspace.path, args).await?;
            } else {
                // Direct command mode
                if command.is_empty() {
                    return Err(NutError::ApplyMissingCommand.into());
                }

                git::apply_command(
                    &workspace.path,
                    command.iter().map(|s| s.as_os_str()).collect(),
                )
                .await?;
            }
        }
        Some(Commands::Import {
            workspace,
            dry_run,
            github_token,
            query,
            full_repository_names,
        }) => {
            // Validate arguments first before checking for token
            if query.is_some() && !full_repository_names.is_empty() {
                return Err(NutError::QueryAndPositionalArgsConflict.into());
            }
            if query.is_none() && full_repository_names.is_empty() {
                return Err(NutError::InvalidArgumentCombination.into());
            }

            let workspace = Workspace::resolve(workspace).await?;

            let token = gh::get_token_with_fallback(github_token.as_deref()).await?;

            let crab = octocrab::instance()
                .user_access_token(token.into_boxed_str())
                .into_diagnostic()?;

            if let Some(q) = query {
                // Use search API with query
                let mut page = crab
                    .search()
                    .repositories(q)
                    .send()
                    .await
                    .into_diagnostic()?;

                loop {
                    for details in page.items {
                        process_repo(&workspace.path, &crab, details, *dry_run).await?;
                    }

                    page = match crab
                        .get_page::<octocrab::models::Repository>(&page.next)
                        .await
                        .into_diagnostic()?
                    {
                        Some(next_page) => next_page,
                        None => break,
                    }
                }
            } else {
                // Import specific repositories by full name
                for full_name in full_repository_names {
                    let parts: Vec<&str> = full_name.split('/').collect();
                    if parts.len() != 2 {
                        return Err(NutError::InvalidRepositoryName {
                            name: full_name.clone(),
                        }
                        .into());
                    }
                    let owner = parts[0];
                    let repo = parts[1];
                    let repo_handler = crab.repos(owner, repo);
                    let details = repo_handler.get().await.into_diagnostic()?;
                    process_repo(&workspace.path, &crab, details, *dry_run).await?;
                }
            }
        }
        Some(Commands::CacheDir {}) => {
            write_path_to_stdout(get_cache_dir().await?)?;
        }
        Some(Commands::DataDir {}) => {
            write_path_to_stdout(get_data_local_dir().await?)?;
        }
        Some(Commands::WorkspaceDir { workspace }) => {
            let workspace = Workspace::resolve(workspace).await?;
            write_path_to_stdout(workspace.path.clone())?;
        }
        Some(Commands::Config {
            workspace_dir,
            cache_dir,
        }) => {
            let mut config = config::NutConfig::load()?;

            if let Some(dir) = workspace_dir {
                let path = std::path::PathBuf::from(dir);
                config.workspace_dir = Some(path.clone());
                println!("Workspace directory set to: {}", path.display());
            }

            if let Some(dir) = cache_dir {
                let path = std::path::PathBuf::from(dir);
                config.cache_dir = Some(path.clone());
                println!("Cache directory set to: {}", path.display());
            }

            config.save()?;
        }
        None => {}
    }

    Ok(())
}

// let's preserves the original path even if it does not happen to be valid utf-8, which is valid in some platforms.
fn write_path_to_stdout(path: std::path::PathBuf) -> Result<()> {
    stdout()
        .write(path.into_os_string().into_encoded_bytes().as_slice())
        .into_diagnostic()?;
    println!();
    Ok(())
}
