mod enter;
mod dirs;
mod git;

use chrono::{DateTime, Utc};
use clap::{Parser, Subcommand};
use tokio::pin;
use ulid::Ulid;
use futures_util::stream::TryStreamExt;

use crate::dirs::{get_cache_dir, get_data_local_dir};

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
    List {
    },
    /// Show status of a workspace
    Status {
    },
    /// Reset changes in a workspace
    Reset {
    },
    /// Commit changes in a workspace
    Commit {
        #[arg(short, long)]
        message: String,
    },
    /// Submit changes in a workspace
    Submit {
        #[arg(short, long)]
        branch: Option<String>,

        #[arg(default_value_t=true, short, long)]
        create_pr: bool,
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
        github_token: String
    },
    /// Print git cache directory
    CacheDir {},
    /// Print workspace data directory
    DataDir {},
}

#[tokio::main(flavor = "multi_thread")]
async fn main() {
    let cli = Cli::parse();

    // You can see how many times a particular flag or argument occurred
    // Note, only flags can have multiple occurrences
    match cli.debug {
        0 => {},
        1 => println!("Debug mode is kind of on"),
        2 => println!("Debug mode is on"),
        _ => println!("Don't be crazy"),
    }

    // You can check for the existence of subcommands, and if found use their
    // matches just as you would the top level cmd
    match &cli.command {
        Some(Commands::Create { description }) => {
            let workspace = enter::get_entered_workspace();
            if workspace.is_some() {
                println!("Already in workspace");
                std::process::exit(1);
            }

            let data_local_dir = dirs::get_data_local_dir();

            let ulid = ulid::Ulid::new();

            std::fs::create_dir_all(data_local_dir.join(ulid.to_string()).join(".nut")).unwrap();

            // write description file
            std::fs::write(
                data_local_dir.join(ulid.to_string()).join(".nut/description"),
                description,
            ).unwrap();

            enter::enter(ulid);
        }
        Some(Commands::Enter { id }) => {
            let workspace = enter::get_entered_workspace();
            if workspace.is_some() {
                println!("Already in workspace");
                std::process::exit(1);
            }

            enter::enter(id.parse().unwrap());
        }
        Some(Commands::List {  }) => {
            let data_local_dir = dirs::get_data_local_dir();
            let entries = std::fs::read_dir(data_local_dir).unwrap();
            for entry in entries {
                let entry = entry.unwrap();
                if entry.file_type().unwrap().is_dir() {
                    let ulid_str = entry.file_name().into_string().unwrap();
                    if let Ok(ulid) = Ulid::from_string(&ulid_str)
                    {
                        let datetime: DateTime<Utc> = ulid.datetime().into();
                        // format systemtime
                        let description = std::fs::read_to_string(entry.path().join(".nut/description")).unwrap_or("(missing description)".to_string());
                        println!("id={}, created={} – {}", ulid.to_string(), datetime.format("%d/%m/%Y %T"), description);
                    }
                }
            }
        }
        Some(Commands::Status { }) => {
            let workspace_id = enter::get_entered_workspace().unwrap();
            let statuses = git::get_all_repos_status(workspace_id);

            // Count repositories with and without changes
            let repos_with_changes: Vec<_> = statuses.iter().filter(|s| s.has_changes).collect();
            let total_repos = statuses.len();
            let clean_repos = total_repos - repos_with_changes.len();

            // Print summary
            println!("Workspace status:");
            println!("  {} repositories total", total_repos);
            println!("  {} clean, {} with changes", clean_repos, repos_with_changes.len());
            println!();

            // Print details for repos with changes
            if repos_with_changes.is_empty() {
                println!("All repositories are clean.");
            } else {
                println!("Repositories with changes:");
                println!();
                
                for status in repos_with_changes {
                    println!("  {} ({})", status.name, status.current_branch);
                    
                    if status.staged_files > 0 {
                        println!("    {} file(s) staged for commit", status.staged_files);
                    }
                    if status.modified_files > 0 {
                        println!("    {} file(s) modified", status.modified_files);
                    }
                    if status.untracked_files > 0 {
                        println!("    {} untracked file(s)", status.untracked_files);
                    }
                    println!();
                }
            }
        }
        Some(Commands::Reset { }) => {
            let _ = enter::get_entered_workspace().unwrap();
            println!("TODO: Reset workspace");
        }
        Some(Commands::Commit { message }) => {
            let _ = enter::get_entered_workspace().unwrap();
            println!("TODO: Commit changes with message: {}", message);
        }
        Some(Commands::Submit { branch, create_pr }) => {
            let _ = enter::get_entered_workspace().unwrap();
            println!("TODO: Submit changes on branch: {:?}, create_pr: {}", branch, create_pr);
        }
        Some(Commands::Import { github_token, user, repo, org }) => {
            let _ = enter::get_entered_workspace().unwrap();

            let crab = octocrab::instance().user_access_token(github_token.clone().into_boxed_str()).unwrap();

            match (user, repo, org) {
                (Some(user), Some(repo), _) => {
                    let repo = crab.repos(user, repo);
                    let details = repo.get().await.unwrap();
                    let full_name = &details.full_name.unwrap();
                    println!("{}", full_name);
                    let default_branch = &details.default_branch;
                    let latest_commit = match default_branch {
                        Some(d) => repo.list_commits().branch(d).send().await.unwrap_or_default().take_items().get(0).map(|c| c.sha.clone()),
                        None => None,
                    };

                    git::clone(full_name, &latest_commit, default_branch);
                }
                (Some(user), None, _) => {
                    let stream = crab
                        .users(user)
                        .repos()
                        .send()
                        .await
                        .unwrap()
                        .into_stream(&crab);

                    pin!(stream);
                    while let Some(details) = stream.try_next().await.unwrap() {
                        let repo = crab.repos(details.owner.unwrap().login, details.name);
                        let full_name = &details.full_name.unwrap();
                        println!("{}", full_name);
                        let default_branch = &details.default_branch;
                        let latest_commit = match default_branch {
                            Some(d) => repo.list_commits().branch(d).send().await.unwrap_or_default().take_items().get(0).map(|c| c.sha.clone()),
                            None => None,
                        };
                        git::clone(full_name, &latest_commit, default_branch);
                    }
                }
                (_, _, Some(org)) => {
                    let stream = crab
                        .orgs(org)
                        .list_repos()
                        .send()
                        .await
                        .unwrap()
                        .into_stream(&crab);

                    pin!(stream);
                    while let Some(details) = stream.try_next().await.unwrap() {
                        let repo = crab.repos(details.owner.unwrap().login, details.name);
                        let full_name = &details.full_name.unwrap();
                        println!("{}", full_name);
                        let default_branch = &details.default_branch;
                        let latest_commit = match default_branch {
                            Some(d) => repo.list_commits().branch(d).send().await.unwrap_or_default().take_items().get(0).map(|c| c.sha.clone()),
                            None => None,
                        };
                        git::clone(full_name, &latest_commit, default_branch);
                    }
                }
                _ => {
                    println!("Please provide either user and optional repo, or org");
                    std::process::exit(1);
                }
            }
        },
        Some(Commands::CacheDir {  }) => {
            println!("{}", get_cache_dir().to_str().unwrap())
        },
        Some(Commands::DataDir {  }) => {
            println!("{}", get_data_local_dir().to_str().unwrap())
        },
        None => {
        }
    }

    // Continued program logic goes here...
}