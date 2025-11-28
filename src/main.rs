mod enter;
mod dirs;

use chrono::{DateTime, Utc};
use clap::{Parser, Subcommand};
use tokio::pin;
use ulid::Ulid;
use futures_util::stream::TryStreamExt;

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
    }
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
            let _ = enter::get_entered_workspace().unwrap();
            println!("TODO: Check status");
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
                    let repository = crab.repos(user, repo).get().await.unwrap();
                    println!("{}", repository.full_name.unwrap());
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
                    while let Some(repo) = stream.try_next().await.unwrap() {
                        println!("{}", repo.full_name.unwrap());
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
                    while let Some(repo) = stream.try_next().await.unwrap() {
                        println!("{}", repo.full_name.unwrap());
                    }
                }
                _ => {
                    println!("Please provide either user and optional repo, or org");
                    std::process::exit(1);
                }
            }
        }
        None => {
        }
    }

    // Continued program logic goes here...
}