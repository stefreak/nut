use crate::error::{NutError, Result};

/// Validate import command arguments
pub fn validate_import_args(
    query: &Option<String>,
    full_repository_names: &[String],
) -> Result<()> {
    if query.is_some() && !full_repository_names.is_empty() {
        return Err(NutError::QueryAndPositionalArgsConflict);
    }
    if query.is_none() && full_repository_names.is_empty() {
        return Err(NutError::InvalidArgumentCombination);
    }
    Ok(())
}

/// Parse and validate repository name format (owner/repo)
pub fn parse_repository_name(full_name: &str) -> Result<(&str, &str)> {
    let parts: Vec<&str> = full_name.split('/').collect();
    if parts.len() != 2 {
        return Err(NutError::InvalidRepositoryName {
            name: full_name.to_string(),
        });
    }
    Ok((parts[0], parts[1]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_import_args_both_provided() {
        let query = Some("test query".to_string());
        let repos = vec!["owner/repo".to_string()];
        assert!(validate_import_args(&query, &repos).is_err());
    }

    #[test]
    fn test_validate_import_args_none_provided() {
        let query = None;
        let repos = vec![];
        assert!(validate_import_args(&query, &repos).is_err());
    }

    #[test]
    fn test_validate_import_args_query_only() {
        let query = Some("test query".to_string());
        let repos = vec![];
        assert!(validate_import_args(&query, &repos).is_ok());
    }

    #[test]
    fn test_validate_import_args_repos_only() {
        let query = None;
        let repos = vec!["owner/repo".to_string()];
        assert!(validate_import_args(&query, &repos).is_ok());
    }

    #[test]
    fn test_parse_repository_name_valid() {
        let result = parse_repository_name("owner/repo");
        assert!(result.is_ok());
        let (owner, repo) = result.unwrap();
        assert_eq!(owner, "owner");
        assert_eq!(repo, "repo");
    }

    #[test]
    fn test_parse_repository_name_invalid_no_slash() {
        let result = parse_repository_name("invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_repository_name_invalid_too_many_slashes() {
        let result = parse_repository_name("owner/repo/extra");
        assert!(result.is_err());
    }
}
