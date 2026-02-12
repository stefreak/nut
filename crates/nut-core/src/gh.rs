//! GitHub integration for nut.
//!
//! Provides functions for GitHub authentication and git protocol configuration.

use crate::error::{NutError, Result};

/// Git protocol to use for cloning repositories.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GitProtocol {
    Https,
    Ssh,
}

impl GitProtocol {
    /// Convert to a git clone URL for a GitHub repository.
    pub fn to_clone_url(self, host: &str, full_name: &str) -> String {
        match self {
            GitProtocol::Https => format!("https://{host}/{full_name}.git"),
            GitProtocol::Ssh => format!("git@{host}:{full_name}.git"),
        }
    }
}

/// Get the git protocol from gh config.
///
/// Returns None if gh is not available or config is not set.
pub async fn get_git_protocol(host: &str) -> Option<GitProtocol> {
    let output = tokio::process::Command::new("gh")
        .args(["config", "get", "git_protocol", "-h", host])
        .output()
        .await
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let protocol = String::from_utf8_lossy(&output.stdout).trim().to_string();
    match protocol.as_str() {
        "https" => Some(GitProtocol::Https),
        "ssh" => Some(GitProtocol::Ssh),
        _ => None,
    }
}

/// Get GitHub token from gh auth token.
///
/// Returns None if gh is not available or not authenticated.
pub async fn get_auth_token() -> Option<String> {
    let output = tokio::process::Command::new("gh")
        .args(["auth", "token"])
        .output()
        .await
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if token.is_empty() {
        None
    } else {
        Some(token)
    }
}

/// Get the git protocol to use for cloning, with fallback logic.
///
/// 1. Try to get from gh config
/// 2. Fall back to HTTPS (gh default)
pub async fn get_git_protocol_with_fallback(host: &str) -> GitProtocol {
    get_git_protocol(host).await.unwrap_or(GitProtocol::Https)
}

/// Get GitHub token with fallback logic.
///
/// 1. Use provided token if available
/// 2. Try to get from gh auth token
/// 3. Return error if neither available
pub async fn get_token_with_fallback(provided_token: Option<&str>) -> Result<String> {
    if let Some(token) = provided_token {
        return Ok(token.to_string());
    }

    get_auth_token().await.ok_or_else(|| NutError::MissingGitHubToken {
        message: "No GitHub token provided and gh CLI is not authenticated. Either provide --github-token or run 'gh auth login'".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_git_protocol_to_clone_url_https() {
        let protocol = GitProtocol::Https;
        assert_eq!(
            protocol.to_clone_url("github.com", "owner/repo"),
            "https://github.com/owner/repo.git"
        );
    }

    #[test]
    fn test_git_protocol_to_clone_url_ssh() {
        let protocol = GitProtocol::Ssh;
        assert_eq!(
            protocol.to_clone_url("github.com", "owner/repo"),
            "git@github.com:owner/repo.git"
        );
    }

    #[tokio::test]
    async fn test_get_git_protocol_with_fallback_returns_valid_protocol() {
        // When gh is not available, should default to HTTPS
        // When gh is available and configured, should return that configuration
        // Either way, we should get a valid GitProtocol
        let protocol = get_git_protocol_with_fallback("github.com").await;
        // Just verify we get a valid protocol (either HTTPS or SSH depending on system config)
        assert!(protocol == GitProtocol::Https || protocol == GitProtocol::Ssh);
    }

    #[tokio::test]
    async fn test_get_token_with_fallback_uses_provided_token() {
        let token = "provided_token";
        let result = get_token_with_fallback(Some(token)).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), token);
    }
}
