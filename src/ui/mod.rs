use crate::dirs;
use crate::git;
use crate::processes::{self, ProcessInfo};
use chrono::{DateTime, Utc};
use iced::widget::{
    Column, button, column, container, pick_list, row, scrollable, text, text_input,
};
use iced::{Element, Length, Task, Theme};
use std::path::PathBuf;
use ulid::Ulid;

pub fn run() -> iced::Result {
    iced::application(
        "Nut Workspace Manager",
        WorkspaceApp::update,
        WorkspaceApp::view,
    )
    .theme(|_| Theme::Dark)
    .run_with(WorkspaceApp::new)
}

#[derive(Debug, Clone)]
pub enum Message {
    WorkspacesLoaded(Result<Vec<WorkspaceInfo>, String>),
    WorkspaceSelected(Option<WorkspaceInfo>),
    CreateWorkspace,
    DeleteWorkspace,
    DescriptionChanged(String),
    RepoUrlChanged(String),
    CloneRepo,
    RefreshStatus,
    StatusLoaded(Result<Vec<git::RepoStatus>, String>),
    RefreshProcesses,
    ProcessesLoaded(Vec<ProcessInfo>),
    KillProcess(u32),
    CommitMessageChanged(String),
    PerformCommit,
    CommitResult(Result<String, String>),
}

#[derive(Debug, Clone)]
pub struct WorkspaceInfo {
    pub id: Ulid,
    pub description: String,
    pub created: DateTime<Utc>,
    pub path: PathBuf,
}

impl std::fmt::Display for WorkspaceInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} - {}", self.id, self.description)
    }
}

impl PartialEq for WorkspaceInfo {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

pub struct WorkspaceApp {
    workspaces: Vec<WorkspaceInfo>,
    selected_workspace: Option<WorkspaceInfo>,
    new_workspace_description: String,
    repo_url: String,
    repo_statuses: Vec<git::RepoStatus>,
    processes: Vec<ProcessInfo>,
    commit_message: String,
    status_message: String,
}

impl WorkspaceApp {
    fn new() -> (Self, Task<Message>) {
        (
            Self {
                workspaces: Vec::new(),
                selected_workspace: None,
                new_workspace_description: String::new(),
                repo_url: String::new(),
                repo_statuses: Vec::new(),
                processes: Vec::new(),
                commit_message: String::new(),
                status_message: String::new(),
            },
            Task::perform(load_workspaces(), Message::WorkspacesLoaded),
        )
    }

    fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::WorkspacesLoaded(Ok(workspaces)) => {
                self.workspaces = workspaces;
                Task::none()
            }
            Message::WorkspacesLoaded(Err(e)) => {
                self.status_message = format!("Error loading workspaces: {}", e);
                Task::none()
            }
            Message::WorkspaceSelected(workspace) => {
                self.selected_workspace = workspace.clone();
                if let Some(ws) = workspace {
                    self.status_message = format!("Selected workspace: {}", ws.description);
                    Task::batch(vec![
                        Task::perform(load_repo_status(ws.path.clone()), Message::StatusLoaded),
                        Task::perform(load_processes(ws.path.clone()), Message::ProcessesLoaded),
                    ])
                } else {
                    self.repo_statuses.clear();
                    self.processes.clear();
                    Task::none()
                }
            }
            Message::CreateWorkspace => {
                let description = self.new_workspace_description.clone();
                self.new_workspace_description.clear();
                Task::perform(create_workspace(description), |result| match result {
                    Ok(_) => Message::WorkspacesLoaded(Ok(Vec::new())),
                    Err(e) => Message::WorkspacesLoaded(Err(e)),
                })
                .chain(Task::perform(load_workspaces(), Message::WorkspacesLoaded))
            }
            Message::DeleteWorkspace => {
                if let Some(ws) = &self.selected_workspace {
                    let path = ws.path.clone();
                    self.selected_workspace = None;
                    self.repo_statuses.clear();
                    self.processes.clear();
                    Task::perform(delete_workspace(path), |result| match result {
                        Ok(_) => Message::WorkspacesLoaded(Ok(Vec::new())),
                        Err(e) => Message::WorkspacesLoaded(Err(e)),
                    })
                    .chain(Task::perform(load_workspaces(), Message::WorkspacesLoaded))
                } else {
                    Task::none()
                }
            }
            Message::DescriptionChanged(desc) => {
                self.new_workspace_description = desc;
                Task::none()
            }
            Message::RepoUrlChanged(url) => {
                self.repo_url = url;
                Task::none()
            }
            Message::CloneRepo => {
                if let Some(ws) = &self.selected_workspace {
                    let path = ws.path.clone();
                    let repo_url = self.repo_url.clone();
                    self.repo_url.clear();
                    self.status_message = format!("Cloning {}...", repo_url);
                    Task::perform(clone_repository(path.clone(), repo_url), move |result| {
                        match result {
                            Ok(_) => Message::StatusLoaded(Ok(Vec::new())),
                            Err(e) => Message::StatusLoaded(Err(e)),
                        }
                    })
                    .chain(Task::perform(load_repo_status(path), Message::StatusLoaded))
                } else {
                    self.status_message = "No workspace selected".to_string();
                    Task::none()
                }
            }
            Message::RefreshStatus => {
                if let Some(ws) = &self.selected_workspace {
                    Task::perform(load_repo_status(ws.path.clone()), Message::StatusLoaded)
                } else {
                    Task::none()
                }
            }
            Message::StatusLoaded(Ok(statuses)) => {
                self.repo_statuses = statuses;
                if self.status_message.starts_with("Cloning") {
                    self.status_message = "Clone completed".to_string();
                }
                Task::none()
            }
            Message::StatusLoaded(Err(e)) => {
                self.status_message = format!("Error loading status: {}", e);
                Task::none()
            }
            Message::RefreshProcesses => {
                if let Some(ws) = &self.selected_workspace {
                    Task::perform(load_processes(ws.path.clone()), Message::ProcessesLoaded)
                } else {
                    Task::none()
                }
            }
            Message::ProcessesLoaded(processes) => {
                self.processes = processes;
                Task::none()
            }
            Message::KillProcess(pid) => {
                if let Err(e) = processes::kill_process(pid) {
                    self.status_message = format!("Failed to kill process {}: {}", pid, e);
                } else {
                    self.status_message = format!("Process {} terminated", pid);
                }
                if let Some(ws) = &self.selected_workspace {
                    Task::perform(load_processes(ws.path.clone()), Message::ProcessesLoaded)
                } else {
                    Task::none()
                }
            }
            Message::CommitMessageChanged(msg) => {
                self.commit_message = msg;
                Task::none()
            }
            Message::PerformCommit => {
                if let Some(ws) = &self.selected_workspace {
                    let path = ws.path.clone();
                    let message = self.commit_message.clone();
                    self.commit_message.clear();
                    Task::perform(perform_commit(path.clone(), message), Message::CommitResult)
                        .chain(Task::perform(load_repo_status(path), Message::StatusLoaded))
                } else {
                    self.status_message = "No workspace selected".to_string();
                    Task::none()
                }
            }
            Message::CommitResult(Ok(msg)) => {
                self.status_message = msg;
                Task::none()
            }
            Message::CommitResult(Err(e)) => {
                self.status_message = format!("Commit failed: {}", e);
                Task::none()
            }
        }
    }

    fn view(&self) -> Element<'_, Message> {
        let workspace_section = self.view_workspace_section();
        let repo_section = self.view_repo_section();
        let process_section = self.view_process_section();

        let content = column![
            text("Nut Workspace Manager").size(32).width(Length::Fill),
            row![
                container(workspace_section)
                    .width(Length::FillPortion(1))
                    .padding(10),
                container(repo_section)
                    .width(Length::FillPortion(1))
                    .padding(10),
                container(process_section)
                    .width(Length::FillPortion(1))
                    .padding(10),
            ]
            .spacing(10),
            container(text(&self.status_message)).padding(10),
        ]
        .spacing(10)
        .padding(20);

        container(content)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn view_workspace_section(&self) -> Element<'_, Message> {
        let mut workspace_col = Column::new().spacing(10).push(text("Workspaces").size(24));

        let picker = pick_list(
            &self.workspaces[..],
            self.selected_workspace.clone(),
            |ws| Message::WorkspaceSelected(Some(ws)),
        )
        .placeholder("Select a workspace");

        workspace_col = workspace_col.push(picker);

        if self.selected_workspace.is_some() {
            workspace_col = workspace_col.push(
                button("Delete Workspace")
                    .on_press(Message::DeleteWorkspace)
                    .style(button::danger),
            );
        }

        workspace_col = workspace_col
            .push(text("Create New Workspace").size(18))
            .push(
                text_input("Description", &self.new_workspace_description)
                    .on_input(Message::DescriptionChanged),
            )
            .push(button("Create").on_press(Message::CreateWorkspace));

        scrollable(workspace_col).into()
    }

    fn view_repo_section(&self) -> Element<'_, Message> {
        let mut repo_col = Column::new()
            .spacing(10)
            .push(text("Repositories").size(24));

        if self.selected_workspace.is_some() {
            repo_col = repo_col
                .push(
                    row![
                        text_input("owner/repo", &self.repo_url)
                            .on_input(Message::RepoUrlChanged)
                            .width(Length::FillPortion(3)),
                        button("Clone").on_press(Message::CloneRepo),
                    ]
                    .spacing(5),
                )
                .push(button("Refresh Status").on_press(Message::RefreshStatus));

            if !self.repo_statuses.is_empty() {
                repo_col =
                    repo_col.push(text(format!("{} repositories", self.repo_statuses.len())));

                for status in &self.repo_statuses {
                    let status_text = if status.has_changes {
                        format!(
                            "{} [{}] • S:{} M:{} U:{}",
                            status.path_relative.to_string_lossy(),
                            status.current_branch,
                            status.staged_files,
                            status.modified_files,
                            status.untracked_files
                        )
                    } else {
                        format!(
                            "{} [{}] ✓",
                            status.path_relative.to_string_lossy(),
                            status.current_branch
                        )
                    };
                    repo_col = repo_col.push(text(status_text).size(14));
                }

                repo_col = repo_col
                    .push(text("Commit All Changes").size(18))
                    .push(
                        text_input("Commit message", &self.commit_message)
                            .on_input(Message::CommitMessageChanged),
                    )
                    .push(button("Commit").on_press(Message::PerformCommit));
            } else {
                repo_col = repo_col.push(text("No repositories found"));
            }
        } else {
            repo_col = repo_col.push(text("Select a workspace to view repositories"));
        }

        scrollable(repo_col).into()
    }

    fn view_process_section(&self) -> Element<'_, Message> {
        let mut process_col = Column::new().spacing(10).push(text("Processes").size(24));

        if self.selected_workspace.is_some() {
            process_col = process_col.push(button("Refresh").on_press(Message::RefreshProcesses));

            if !self.processes.is_empty() {
                process_col =
                    process_col.push(text(format!("{} active processes", self.processes.len())));

                for proc in &self.processes {
                    let memory_mb = proc.memory_bytes as f64 / 1024.0 / 1024.0;
                    let proc_row = row![
                        column![
                            text(format!("{} (PID: {})", proc.name, proc.pid)).size(14),
                            text(format!(
                                "CPU: {:.1}% | Mem: {:.1} MB",
                                proc.cpu_usage, memory_mb
                            ))
                            .size(12),
                        ]
                        .width(Length::FillPortion(3)),
                        button("Kill")
                            .on_press(Message::KillProcess(proc.pid))
                            .style(button::danger),
                    ]
                    .spacing(5);
                    process_col = process_col.push(proc_row);
                }
            } else {
                process_col = process_col.push(text("No active processes"));
            }
        } else {
            process_col = process_col.push(text("Select a workspace to view processes"));
        }

        scrollable(process_col).into()
    }
}

async fn load_workspaces() -> Result<Vec<WorkspaceInfo>, String> {
    let data_dir = dirs::get_data_local_dir()
        .await
        .map_err(|e| format!("Failed to get data directory: {:?}", e))?;

    let mut entries = tokio::fs::read_dir(&data_dir)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut workspaces = Vec::new();

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read entry: {}", e))?
    {
        if entry
            .file_type()
            .await
            .map_err(|e| format!("Failed to get file type: {}", e))?
            .is_dir()
        {
            let ulid_str = entry
                .file_name()
                .into_string()
                .map_err(|_| "Invalid UTF-8 in directory name".to_string())?;

            if let Ok(ulid) = Ulid::from_string(&ulid_str) {
                let datetime: DateTime<Utc> = ulid.datetime().into();
                let desc_path = entry.path().join(".nut/description");
                let description = tokio::fs::read_to_string(&desc_path)
                    .await
                    .unwrap_or_else(|_| "(no description)".to_string());

                workspaces.push(WorkspaceInfo {
                    id: ulid,
                    description,
                    created: datetime,
                    path: entry.path(),
                });
            }
        }
    }

    workspaces.sort_by(|a, b| b.created.cmp(&a.created));
    Ok(workspaces)
}

async fn create_workspace(description: String) -> Result<(), String> {
    let data_dir = dirs::get_data_local_dir()
        .await
        .map_err(|e| format!("Failed to get data directory: {:?}", e))?;

    let ulid = Ulid::new();
    let workspace_path = data_dir.join(ulid.to_string()).join(".nut");

    tokio::fs::create_dir_all(&workspace_path)
        .await
        .map_err(|e| format!("Failed to create workspace: {}", e))?;

    let desc_path = workspace_path.join("description");
    tokio::fs::write(&desc_path, description)
        .await
        .map_err(|e| format!("Failed to write description: {}", e))?;

    Ok(())
}

async fn delete_workspace(path: PathBuf) -> Result<(), String> {
    tokio::fs::remove_dir_all(path)
        .await
        .map_err(|e| format!("Failed to delete workspace: {}", e))
}

async fn load_repo_status(workspace_path: PathBuf) -> Result<Vec<git::RepoStatus>, String> {
    git::get_all_repos_status(&workspace_path)
        .await
        .map_err(|e| format!("Failed to get repo status: {:?}", e))
}

async fn load_processes(workspace_path: PathBuf) -> Vec<ProcessInfo> {
    tokio::task::spawn_blocking(move || processes::get_workspace_processes(&workspace_path))
        .await
        .unwrap_or_else(|_| Vec::new())
}

async fn clone_repository(workspace_path: PathBuf, repo_name: String) -> Result<(), String> {
    git::clone(&workspace_path, &repo_name, &None, &None)
        .await
        .map_err(|e| format!("Failed to clone repository: {:?}", e))
}

async fn perform_commit(workspace_path: PathBuf, message: String) -> Result<String, String> {
    use std::ffi::OsStr;
    let args: Vec<&OsStr> = vec![OsStr::new("git"), OsStr::new("add"), OsStr::new(".")];

    git::apply_command(&workspace_path, args.clone())
        .await
        .map_err(|e| format!("Failed to stage changes: {:?}", e))?;

    let commit_args: Vec<&OsStr> = vec![
        OsStr::new("git"),
        OsStr::new("commit"),
        OsStr::new("-m"),
        OsStr::new(&message),
    ];

    git::apply_command(&workspace_path, commit_args)
        .await
        .map_err(|e| format!("Failed to commit: {:?}", e))?;

    Ok("Changes committed successfully".to_string())
}
