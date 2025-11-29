# Integration Tests

This directory contains integration tests for `nut`. These tests verify the behavior of the CLI tool by running it as a subprocess with isolated test environments.

## Test Structure

The integration tests use a `TestEnv` helper struct that:
- Creates isolated temporary directories for each test
- Overrides the `HOME` environment variable to prevent interference with the user's actual nut configuration
- Automatically cleans up after each test

## Running Tests

Run all tests:
```bash
cargo test
```

Run integration tests only:
```bash
cargo test --test integration_tests
```

Run a specific test:
```bash
cargo test test_status_with_git_repo
```

## What's Tested

The current integration tests cover:

1. **Directory Commands**
   - `cache-dir`: Verifies the correct cache directory path is returned
   - `data-dir`: Verifies the correct data directory path is returned

2. **Workspace Management**
   - `list`: Tests listing empty workspaces and workspaces with data
   - Workspace creation workflow (manual directory creation to test list)

3. **Status Command**
   - Empty workspace status
   - Status with clean git repositories
   - Status with modified git repositories (untracked files, staged changes)

## What's Not Tested Yet

The following functionality is intentionally not covered by integration tests:

1. **Import Command**: This command relies on the GitHub API via octocrab. Testing this would require:
   - Creating a trait abstraction over the GitHub API client
   - Implementing a mock version for tests
   - This is recommended for future work but skipped for the initial implementation

2. **Interactive Commands**: Commands that spawn shells (like `create` and `enter`) are difficult to test in an automated way

3. **Reset, Commit, Submit**: These commands are not yet implemented in the main codebase

## Design Notes

- Tests use temporary directories under `/tmp/nut_test_*` to ensure isolation
- Each test has its own unique directory based on the test name
- The `TestEnv` struct implements `Drop` to ensure cleanup even if tests panic
- Tests manipulate the `HOME` environment variable in an unsafe block, which is necessary to use the `directories` crate's XDG directory detection

## Future Improvements

1. **GitHub API Abstraction**: Define a trait for GitHub operations that can be mocked:
   ```rust
   trait GitHubClient {
       async fn get_repos(&self, user: &str) -> Result<Vec<Repo>>;
       async fn get_org_repos(&self, org: &str) -> Result<Vec<Repo>>;
   }
   ```
   This would allow testing the import logic without hitting the real GitHub API.

2. **More Status Scenarios**: Add tests for:
   - Multiple repositories with mixed states
   - Repositories with staged changes
   - Repositories in detached HEAD state

3. **Error Cases**: Test how commands handle error conditions:
   - Invalid workspace IDs
   - Corrupted workspace data
   - Git command failures
