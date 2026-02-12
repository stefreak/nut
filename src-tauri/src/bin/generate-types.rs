//! Type generation binary for creating TypeScript bindings

use specta_typescript::Typescript;
use tauri_specta::*;

#[path = "../commands.rs"]
mod commands;

fn main() {
    // Generate TypeScript bindings using tauri-specta builder
    Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            commands::list_workspaces,
            commands::create_workspace,
            commands::list_workspace_repositories,
            commands::import_repositories,
        ])
        .export(
            Typescript::default()
                .header("// This file is auto-generated. Do not edit manually."),
            "../user-interface/src/bindings/types.ts",
        )
        .expect("Failed to export TypeScript types");
    
    println!("TypeScript types generated successfully!");
}
