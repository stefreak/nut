mod dirs;
mod enter;
mod error;
mod gh;
mod git;
mod processes;
pub mod ui;
mod workspace;

fn main() -> iced::Result {
    ui::run()
}
