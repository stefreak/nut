mod dirs;
mod enter;
mod error;
mod gh;
mod git;

use std::ffi::OsStr;

use chrono::{DateTime, Utc};
use clap::{Parser, Subcommand};
use futures_util::stream::TryStreamExt;
use miette::{IntoDiagnostic, Result};
use tokio::pin;
use ulid::Ulid;

use crate::dirs::{get_cache_dir, get_data_local_dir};
use crate::error::NutError;

#[derive(Parser)]
#[command(arg_required_else_help = true, version, about, long_about = None)]
struct Cli {
    /// Turn debugging information on
    #[arg(short, long, action = clap::ArgAction::Count)]
    debug: u8,

    /// Disable colored output
    #[arg(long)]
    no_color: bool,

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
    Status {},
    /// Run a command in each repository
    Apply {
        /// Path to an executable script to run
        #[arg(short, long)]
        script: Option<clap::builder::OsStr>,

        /// Command and arguments to run (must come after --)
        #[arg(trailing_var_arg = true, required = false)]
        command: Vec<clap::builder::OsStr>,
    },
    /// Import repositories into a workspace
    Import {
        #[arg(short, long)]
        org: Option<String>,

        #[arg(short, long)]
        user: Option<String>,

        #[arg(short, long)]
        repo: Option<String>,

        #[arg(short, long)]
        github_token: Option<String>,
    },
    /// Print git cache directory
    CacheDir {},
    /// Print workspace data directory
    DataDir {},
}

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Set up miette colors based on NO_COLOR environment variable and --no-color flag
    // NO_COLOR takes precedence unless explicitly overridden by command-line flags
    let should_use_color = if cli.no_color {
        false
    } else if let Ok(no_color) = std::env::var("NO_COLOR") {
        // Per NO_COLOR spec: any non-empty value disables colors
        no_color.is_empty()
    } else {
        true
    };

    // Configure miette to respect color settings
    if !should_use_color {
        miette::set_hook(Box::new(|_| {
            Box::new(miette::MietteHandlerOpts::new().color(false).build())
        }))
        .into_diagnostic()?;
    } else {
    // Install the fancy error handler with default theme
    miette::set_hook(Box::new(|_| {
        Box::new(
            miette::GraphicalReportHandler::new()
                .with_theme(miette::GraphicalTheme::default())
        )
    }))?;    }

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
            if enter::get_entered_workspace().is_ok() {
                return Err(NutError::AlreadyInWorkspace.into());
            }

            let data_local_dir = dirs::get_data_local_dir()?;

            let ulid = ulid::Ulid::new();

            let workspace_path = data_local_dir.join(ulid.to_string()).join(".nut");
            std::fs::create_dir_all(&workspace_path).map_err(|e| {
                NutError::CreateDirectoryFailed {
                    path: workspace_path.clone(),
                    source: e,
                }
            })?;

            // write description file
            let desc_path = data_local_dir
                .join(ulid.to_string())
                .join(".nut/description");
            std::fs::write(&desc_path, description).map_err(|e| NutError::WriteFileFailed {
                path: desc_path,
                source: e,
            })?;

            enter::enter(ulid)?;
        }
        Some(Commands::Enter { id }) => {
            if enter::get_entered_workspace().is_ok() {
                return Err(NutError::AlreadyInWorkspace.into());
            }

            let ulid = id.parse().map_err(|e| NutError::InvalidWorkspaceId {
                id: id.clone(),
                source: e,
            })?;
            enter::enter(ulid)?;
        }
        Some(Commands::List {}) => {
            let data_local_dir = dirs::get_data_local_dir()?;
            let entries =
                std::fs::read_dir(&data_local_dir).map_err(|e| NutError::ReadDirectoryFailed {
                    path: data_local_dir.clone(),
                    source: e,
                })?;

            // Collect all workspaces with their metadata
            let mut workspaces: Vec<(Ulid, DateTime<Utc>, String)> = Vec::new();

            for entry in entries {
                let entry = entry.into_diagnostic()?;
                if entry.file_type().into_diagnostic()?.is_dir() {
                    let ulid_str = entry
                        .file_name()
                        .into_string()
                        .map_err(|_| NutError::InvalidUtf8)?;
                    if let Ok(ulid) = Ulid::from_string(&ulid_str) {
                        let datetime: DateTime<Utc> = ulid.datetime().into();
                        let desc_path = entry.path().join(".nut/description");
                        let description = std::fs::read_to_string(&desc_path)
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
        Some(Commands::Status {}) => {
            let workspace_id = enter::get_entered_workspace()?;
            let workspace_dir = dirs::get_data_local_dir()?.join(workspace_id.to_string());
            let statuses = git::get_all_repos_status(&workspace_dir)?;

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
                    println!("  {} ({})", status.path_relative.to_string_lossy(), status.current_branch);

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
        Some(Commands::Apply { script, command }) => {
            let workspace_id = enter::get_entered_workspace()?;
            let workspace_dir = dirs::get_data_local_dir()?.join(workspace_id.to_string());

            // Handle script mode
            if let Some(script_path) = script {
                let absolute_script_path = std::fs::canonicalize(script_path).map_err(|e| {
                    NutError::ScriptPathInvalid { path: script_path.display().to_string(), source: e } 
                })?;

                // only for unix
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let metadata = std::fs::metadata(&absolute_script_path).map_err(|e| {
                        NutError::ScriptPathInvalid { path: script_path.display().to_string(), source: e } 
                    })?;
                    let permissions = metadata.permissions();
                    if (permissions.mode() & 0o111) == 0 {
                        return Err(NutError::ScriptNotExecutable { path: script_path.display().to_string() }.into());
                    }
                }

                let mut args: Vec<&OsStr> = vec![absolute_script_path.as_os_str()];
                args.extend(command.iter().map(|s| s.as_os_str()));
                git::apply_command(&workspace_dir, args)?;
            } else {
                // Direct command mode
                if command.is_empty() {
                    return Err(NutError::ApplyMissingCommand.into());
                }

                git::apply_command(&workspace_dir, command.into_iter().map(|s| s.as_os_str()).collect())?;
            }
        }
        Some(Commands::Import {
            github_token,
            user,
            repo,
            org,
        }) => {
            let _ = enter::get_entered_workspace()?;

            let token = gh::get_token_with_fallback(github_token.as_deref())?;

            let crab = octocrab::instance()
                .user_access_token(token.into_boxed_str())
                .into_diagnostic()?;

            match (user, repo, org) {
                (Some(user), Some(repo), _) => {
                    let repo = crab.repos(user, repo);
                    let details = repo.get().await.into_diagnostic()?;
                    let full_name = &details.full_name.ok_or(NutError::InvalidUtf8)?;
                    println!("{}", full_name);
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

                    git::clone(full_name, &latest_commit, default_branch)?;
                }
                (Some(user), None, _) => {
                    let stream = crab
                        .users(user)
                        .repos()
                        .send()
                        .await
                        .into_diagnostic()?
                        .into_stream(&crab);

                    pin!(stream);
                    while let Some(details) = stream.try_next().await.into_diagnostic()? {
                        let repo = crab.repos(
                            details.owner.ok_or(NutError::InvalidUtf8)?.login,
                            details.name,
                        );
                        let full_name = &details.full_name.ok_or(NutError::InvalidUtf8)?;
                        println!("{}", full_name);
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
                        git::clone(full_name, &latest_commit, default_branch)?;
                    }
                }
                (_, _, Some(org)) => {
                    let stream = crab
                        .orgs(org)
                        .list_repos()
                        .send()
                        .await
                        .into_diagnostic()?
                        .into_stream(&crab);

                    pin!(stream);
                    while let Some(details) = stream.try_next().await.into_diagnostic()? {
                        let repo = crab.repos(
                            details.owner.ok_or(NutError::InvalidUtf8)?.login,
                            details.name,
                        );
                        let full_name = &details.full_name.ok_or(NutError::InvalidUtf8)?;
                        println!("{}", full_name);
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
                        git::clone(full_name, &latest_commit, default_branch)?;
                    }
                }
                _ => {
                    return Err(NutError::InvalidArgumentCombination.into());
                }
            }
        }
        Some(Commands::CacheDir {}) => {
            println!(
                "{}",
                get_cache_dir()?.to_str().ok_or(NutError::InvalidUtf8)?
            )
        }
        Some(Commands::DataDir {}) => {
            println!(
                "{}",
                get_data_local_dir()?
                    .to_str()
                    .ok_or(NutError::InvalidUtf8)?
            )
        }
        None => {}
    }

    Ok(())
}
