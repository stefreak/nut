use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use nut_workspace::git;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

// Helper function to create a test workspace with repositories
fn create_test_workspace(num_repos: usize) -> PathBuf {
    let temp_dir = env::temp_dir().join(format!("nut_bench_{}", std::process::id()));

    // Clean up if it exists
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).ok();
    }

    fs::create_dir_all(&temp_dir).unwrap();

    // Create multiple repositories
    for i in 0..num_repos {
        let repo_path = temp_dir.join(format!("org/repo-{}", i));
        fs::create_dir_all(&repo_path).unwrap();

        // Initialize git repo
        Command::new("git")
            .args(["init"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to init git repo");

        Command::new("git")
            .args(["config", "user.email", "bench@example.com"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to set git email");

        Command::new("git")
            .args(["config", "user.name", "Bench User"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to set git name");

        // Create and commit a file
        fs::write(repo_path.join("README.md"), format!("# Repo {}\n", i)).unwrap();

        Command::new("git")
            .args(["add", "."])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to add files");

        Command::new("git")
            .args(["commit", "-m", "Initial commit"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to commit");

        // Add some untracked files to make it more realistic
        if i % 3 == 0 {
            fs::write(repo_path.join("untracked.txt"), "untracked content").unwrap();
        }

        // Add some modified files
        if i % 4 == 0 {
            fs::write(repo_path.join("README.md"), format!("# Modified Repo {}\n", i))
                .unwrap();
        }
    }

    temp_dir
}

// Cleanup function
fn cleanup_workspace(workspace_dir: &PathBuf) {
    if workspace_dir.exists() {
        fs::remove_dir_all(workspace_dir).ok();
    }
}

fn bench_get_all_repos_status(c: &mut Criterion) {
    let mut group = c.benchmark_group("get_all_repos_status");
    
    // Create a tokio runtime once for all benchmarks
    let rt = tokio::runtime::Runtime::new().unwrap();

    // Test with different numbers of repositories
    for num_repos in [5, 10, 20, 50].iter() {
        let workspace_dir = create_test_workspace(*num_repos);

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_repos", num_repos)),
            num_repos,
            |b, _| {
                b.iter(|| {
                    // Call the actual async implementation from the library
                    let statuses = rt.block_on(git::get_all_repos_status(&workspace_dir)).unwrap();
                    black_box(statuses)
                });
            },
        );

        cleanup_workspace(&workspace_dir);
    }

    group.finish();
}

criterion_group!(benches, bench_get_all_repos_status);
criterion_main!(benches);
