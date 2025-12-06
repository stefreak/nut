use std::path::Path;

use crate::error::{NutError, Result};

/// Helper to execute git commands with consistent error handling
pub(super) struct GitCommand<'a> {
    args: Vec<&'a str>,
    working_dir: &'a Path,
}

impl<'a> GitCommand<'a> {
    pub(super) fn new(working_dir: &'a Path) -> Self {
        Self {
            args: Vec::new(),
            working_dir,
        }
    }

    pub(super) fn arg(mut self, arg: &'a str) -> Self {
        self.args.push(arg);
        self
    }

    pub(super) fn args(mut self, args: &[&'a str]) -> Self {
        self.args.extend_from_slice(args);
        self
    }

    pub(super) async fn output(self) -> Result<std::process::Output> {
        let output = tokio::process::Command::new("git")
            .current_dir(self.working_dir)
            .args(&self.args)
            .output()
            .await
            .map_err(|e| NutError::GitCommandFailed {
                command: format!("git {}", self.args.join(" ")),
                source: e,
            })?;
        Ok(output)
    }

    pub(super) async fn run(self) -> Result<()> {
        let status = tokio::process::Command::new("git")
            .current_dir(self.working_dir)
            .args(&self.args)
            .status()
            .await
            .map_err(|e| NutError::GitCommandFailed {
                command: format!("git {}", self.args.join(" ")),
                source: e,
            })?;

        if !status.success() {
            return Err(NutError::GitOperationFailed {
                operation: format!("git {}", self.args.join(" ")),
            });
        }
        Ok(())
    }

    pub(super) async fn output_string(self) -> Result<String> {
        let output = self.output().await?;
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
}
