import { useState } from 'react';
import { Repository, PullRequest } from '../App';
import { CreatePullRequestDialog } from './CreatePullRequestDialog';
import { GitPullRequest, ExternalLink, GitMerge, X, CheckCircle2, Circle } from 'lucide-react';

interface PullRequestPanelProps {
  repositories: Repository[];
}

export function PullRequestPanel({ repositories }: PullRequestPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [reposWithPRs, setReposWithPRs] = useState<Repository[]>(repositories);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'merged'>('all');

  const handleCreatePRs = (title: string, body: string) => {
    const updatedRepos = reposWithPRs.map((repo, idx) => ({
      ...repo,
      pullRequest: {
        number: Math.floor(Math.random() * 100) + 1,
        title,
        url: `https://github.com/${repo.owner}/${repo.name}/pull/${idx + 1}`,
        state: 'open' as const,
        branch: repo.branch,
        targetBranch: repo.name === 'kernel-test' ? 'test-foo' : repo.name.includes('playground') || repo.name === 'swiftrest' ? 'master' : 'main',
        createdAt: new Date().toISOString(),
      },
    }));
    setReposWithPRs(updatedRepos);
    setShowCreateDialog(false);
  };

  const handleClosePR = (repoKey: string) => {
    setReposWithPRs(
      reposWithPRs.map((repo) =>
        `${repo.owner}/${repo.name}` === repoKey && repo.pullRequest
          ? { ...repo, pullRequest: { ...repo.pullRequest, state: 'closed' as const } }
          : repo
      )
    );
  };

  const handleMergePR = (repoKey: string) => {
    setReposWithPRs(
      reposWithPRs.map((repo) =>
        `${repo.owner}/${repo.name}` === repoKey && repo.pullRequest
          ? { ...repo, pullRequest: { ...repo.pullRequest, state: 'merged' as const } }
          : repo
      )
    );
  };

  const handleCloseAllPRs = () => {
    setReposWithPRs(
      reposWithPRs.map((repo) =>
        repo.pullRequest
          ? { ...repo, pullRequest: { ...repo.pullRequest, state: 'closed' as const } }
          : repo
      )
    );
  };

  const reposWithPullRequests = reposWithPRs.filter((r) => r.pullRequest);
  const filteredRepos =
    filter === 'all'
      ? reposWithPullRequests
      : reposWithPullRequests.filter((r) => r.pullRequest?.state === filter);

  const openPRs = reposWithPullRequests.filter((r) => r.pullRequest?.state === 'open').length;
  const closedPRs = reposWithPullRequests.filter((r) => r.pullRequest?.state === 'closed').length;
  const mergedPRs = reposWithPullRequests.filter((r) => r.pullRequest?.state === 'merged').length;

  const getStateIcon = (state: PullRequest['state']) => {
    switch (state) {
      case 'open':
        return <Circle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <X className="w-4 h-4 text-red-500" />;
      case 'merged':
        return <GitMerge className="w-4 h-4 text-purple-500" />;
    }
  };

  const getStateColor = (state: PullRequest['state']) => {
    switch (state) {
      case 'open':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'closed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'merged':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="mb-2">Pull Request Management</h3>
            <p className="text-sm text-neutral-500">
              Create and manage pull requests across all repositories
            </p>
          </div>
          <div className="flex gap-2">
            {openPRs > 0 && (
              <button
                onClick={handleCloseAllPRs}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm"
              >
                Close All Open PRs
              </button>
            )}
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <GitPullRequest className="w-4 h-4" />
              Create Pull Requests
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 rounded-lg">
            <Circle className="w-3 h-3 text-green-500" />
            <span className="text-sm">
              {openPRs} Open
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 rounded-lg">
            <GitMerge className="w-3 h-3 text-purple-500" />
            <span className="text-sm">
              {mergedPRs} Merged
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 rounded-lg">
            <X className="w-3 h-3 text-red-500" />
            <span className="text-sm">
              {closedPRs} Closed
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-neutral-800">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            All ({reposWithPullRequests.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === 'open'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            Open ({openPRs})
          </button>
          <button
            onClick={() => setFilter('merged')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === 'merged'
                ? 'bg-purple-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            Merged ({mergedPRs})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === 'closed'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            Closed ({closedPRs})
          </button>
        </div>
      </div>

      {/* Pull Request List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GitPullRequest className="w-16 h-16 text-neutral-700 mb-4" />
            <p className="text-neutral-400 mb-2">
              {reposWithPullRequests.length === 0
                ? 'No pull requests created yet'
                : 'No pull requests match this filter'}
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              {reposWithPullRequests.length === 0
                ? 'Create pull requests across all repositories using the button above'
                : 'Try selecting a different filter'}
            </p>
            {reposWithPullRequests.length === 0 && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Create Pull Requests
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRepos.map((repo) => {
              if (!repo.pullRequest) return null;
              const pr = repo.pullRequest;
              const repoKey = `${repo.owner}/${repo.name}`;

              return (
                <div
                  key={repoKey}
                  className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStateIcon(pr.state)}
                        <h4 className="font-mono">
                          <span className="text-neutral-400">{repo.owner}/</span>
                          {repo.name}
                          <span className="text-neutral-600 mx-2">•</span>
                          <span className="text-neutral-500">#{pr.number}</span>
                        </h4>
                      </div>
                      <p className="mb-2">{pr.title}</p>
                      <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <span>
                          {pr.branch} → {pr.targetBranch}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border text-xs uppercase ${getStateColor(
                            pr.state
                          )}`}
                        >
                          {pr.state}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-neutral-800 rounded transition-colors"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-4 h-4 text-neutral-400" />
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  {pr.state === 'open' && (
                    <div className="flex gap-2 pt-3 border-t border-neutral-800">
                      <button
                        onClick={() => handleMergePR(repoKey)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        Merge
                      </button>
                      <button
                        onClick={() => handleClosePR(repoKey)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Close
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateDialog && (
        <CreatePullRequestDialog
          repositories={repositories}
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreatePRs}
        />
      )}
    </div>
  );
}
