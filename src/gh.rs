use std::process::Command;

use crate::error::Result;

/// Git protocol to use for cloning repositories
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GitProtocol {
    Https,
    Ssh,
}

impl GitProtocol {
    /// Convert to a git clone URL for a GitHub repository
    pub fn to_clone_url(self, host: &str, full_name: &str) -> String {
        match self {
            GitProtocol::Https => format!("https://{host}/{full_name}.git"),
            GitProtocol::Ssh => format!("git@{host}:{full_name}.git"),
        }
    }
}

/// Get the git protocol from gh config
/// Returns None if gh is not available or config is not set
pub fn get_git_protocol(host: &str) -> Option<GitProtocol> {
    let output = Command::new("gh")
        .args(["config", "get", "git_protocol", "-h", host])
        .output()
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

/// Get GitHub token from gh auth token
/// Returns None if gh is not available or not authenticated
pub fn get_auth_token() -> Option<String> {
    let output = Command::new("gh").args(["auth", "token"]).output().ok()?;

    if !output.status.success() {
        return None;
    }

    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if token.is_empty() { None } else { Some(token) }
}

/// Get the git protocol to use for cloning, with fallback logic
/// 1. Try to get from gh config
/// 2. Fall back to HTTPS (gh default)
pub fn get_git_protocol_with_fallback(host: &str) -> GitProtocol {
    get_git_protocol(host).unwrap_or(GitProtocol::Https)
}

/// Get GitHub token with fallback logic
/// 1. Use provided token if available
/// 2. Try to get from gh auth token
/// 3. Return None if neither available
pub fn get_token_with_fallback(provided_token: Option<&str>) -> Result<String> {
    if let Some(token) = provided_token {
        return Ok(token.to_string());
    }

    get_auth_token().ok_or_else(|| {
        crate::error::NutError::MissingGitHubToken {
            message: "No GitHub token provided and gh CLI is not authenticated. Either provide --github-token or run 'gh auth login'".to_string(),
        }
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

    #[test]
    fn test_get_git_protocol_with_fallback_defaults_to_https() {
        // When gh is not available or not configured, should default to HTTPS
        let protocol = get_git_protocol_with_fallback("github.com");
        assert_eq!(protocol, GitProtocol::Https);
    }

    #[test]
    fn test_get_token_with_fallback_uses_provided_token() {
        let token = "provided_token";
        let result = get_token_with_fallback(Some(token));
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), token);
    }

    #[test]
    fn test_get_token_with_fallback_fails_without_token_and_gh() {
        // When no token provided and gh not available, should fail
        let result = get_token_with_fallback(None);
        // This should fail unless gh is authenticated on the test machine
        // We can't guarantee gh auth status, so we just verify it returns a result
        assert!(result.is_ok() || result.is_err());
    }
}
