use miette::Diagnostic;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug, Diagnostic)]
#[allow(dead_code)]
pub enum NutError {
    #[error("Already in workspace")]
    #[diagnostic(
        code(nut::workspace::already_entered),
        help(
            "Exit the current workspace before creating or entering a new one (for example, return to the home directory by running 'cd ~')"
        )
    )]
    AlreadyInWorkspace,

    #[error(
        "Not in a workspace.
    Current working directory: {working_directory}
    Data directory: {data_directory}"
    )]
    #[diagnostic(
        code(nut::workspace::not_entered),
        help(
            "Create a new workspace with 'nut create' or enter one with 'nut enter <id>'. You need to be inside the workspace directory or pass the workspace ID via the --workspace option."
        )
    )]
    NotInWorkspace {
        working_directory: String,
        data_directory: String,
    },

    #[error("Failed to create directory: {path}")]
    #[diagnostic(code(nut::io::create_dir))]
    CreateDirectoryFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to read directory: {path}")]
    #[diagnostic(code(nut::io::read_dir))]
    ReadDirectoryFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to read file: {path}")]
    #[diagnostic(code(nut::io::read_file))]
    ReadFileFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to write file: {path}")]
    #[diagnostic(code(nut::io::write_file))]
    WriteFileFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to change directory: {path}")]
    #[diagnostic(code(nut::io::change_dir))]
    ChangeDirectoryFailed {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Invalid workspace ID: {id}")]
    #[diagnostic(
        code(nut::workspace::invalid_id),
        help("Workspace IDs must be valid ULIDs")
    )]
    InvalidWorkspaceId {
        id: String,
        #[source]
        source: ulid::DecodeError,
    },

    #[error("Failed to get current directory")]
    #[diagnostic(code(nut::io::current_dir))]
    GetCurrentDirectoryFailed {
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to get current executable path")]
    #[diagnostic(code(nut::io::current_exe))]
    GetCurrentExecutableFailed {
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to get project directories")]
    #[diagnostic(
        code(nut::config::project_dirs),
        help("Unable to determine system configuration directories")
    )]
    ProjectDirectoriesUnavailable {
        #[source]
        source: std::io::Error,
    },

    #[error("Git command failed: {command}")]
    #[diagnostic(code(nut::git::command_failed))]
    GitCommandFailed {
        command: String,
        #[source]
        source: std::io::Error,
    },

    #[error("Git operation failed: {operation}")]
    #[diagnostic(code(nut::git::operation_failed))]
    GitOperationFailed { operation: String },

    #[error("Failed to spawn shell")]
    #[diagnostic(code(nut::shell::spawn_failed))]
    ShellSpawnFailed {
        #[source]
        source: std::io::Error,
    },

    #[error("GitHub API error")]
    #[diagnostic(code(nut::github::api_error))]
    GitHubApiError {
        #[from]
        source: octocrab::Error,
    },

    #[error("Invalid UTF-8 in git output")]
    #[diagnostic(code(nut::git::invalid_utf8))]
    InvalidUtf8,

    #[error(
        "Please provide either a query using --query or positional repository arguments, but not both."
    )]
    #[diagnostic(
        code(nut::args::query_and_positional_conflict),
        help(
            "Use --query <query> OR positional arguments <owner>/<repo>, but not both at the same time"
        )
    )]
    QueryAndPositionalArgsConflict,

    #[error("Please provide either a query using --query or positional repository arguments.")]
    #[diagnostic(
        code(nut::args::invalid_combination),
        help(
            "Use --query <query> to search for repositories or provide positional arguments <owner>/<repo>"
        )
    )]
    InvalidArgumentCombination,

    #[error("Invalid full repository name: '{name}'.")]
    #[diagnostic(
        code(nut::args::invalid_combination),
        help("Must look like 'owner/repo'")
    )]
    InvalidRepositoryName { name: String },

    #[error("No command provided for apply")]
    #[diagnostic(
        code(nut::apply::missing_command),
        help("Use 'nut apply -- <command>' or 'nut apply --script <path>'")
    )]
    ApplyMissingCommand,

    #[error("Script is not executable: {path}")]
    #[diagnostic(
        code(nut::apply::script_not_executable),
        help("Make sure the script is executable (chmod +x {path})")
    )]
    ScriptNotExecutable { path: String },

    #[error("Invalid script path: {path}")]
    #[diagnostic(
        code(nut::apply::script_path_invalid),
        help("Make sure the script path is correct and accessible")
    )]
    ScriptPathInvalid {
        path: String,
        #[source]
        source: std::io::Error,
    },

    #[error("Command execution failed in repository: {repo}")]
    #[diagnostic(code(nut::apply::command_failed))]
    CommandFailed {
        repo: String,
        #[source]
        source: std::io::Error,
    },
    #[error("GitHub token required")]
    #[diagnostic(code(nut::github::missing_token), help("{message}"))]
    MissingGitHubToken { message: String },

    #[error("Workspace directory not configured")]
    #[diagnostic(
        code(nut::config::workspace_dir_not_configured),
        help("Set the workspace directory using: nut config --workspace-dir <path>")
    )]
    WorkspaceDirectoryNotConfigured,

    #[error("Failed to load configuration")]
    #[diagnostic(code(nut::config::load_failed))]
    ConfigLoadFailed {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("Failed to save configuration")]
    #[diagnostic(code(nut::config::save_failed))]
    ConfigSaveFailed {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("HOME directory not found")]
    #[diagnostic(
        code(nut::config::home_not_found),
        help("Make sure the HOME environment variable is set")
    )]
    HomeDirectoryNotFound {
        #[source]
        source: std::env::VarError,
    },
}

pub type Result<T> = miette::Result<T, NutError>;
