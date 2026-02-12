import { Repository } from '../App';
import { GitBranch, Circle, FileQuestion, FileEdit, FolderGit2, GitPullRequest, ExternalLink } from 'lucide-react';

interface RepositoryListProps {
  repositories: Repository[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
  const getStatusIcon = (status: Repository['status']) => {
    switch (status) {
      case 'clean':
        return <Circle className="w-3 h-3 fill-green-500 text-green-500" />;
      case 'modified':
        return <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />;
      case 'untracked':
        return <Circle className="w-3 h-3 fill-orange-500 text-orange-500" />;
    }
  };

  const getStatusText = (repo: Repository) => {
    const parts = [];
    if (repo.untrackedFiles) {
      parts.push(`${repo.untrackedFiles} untracked`);
    }
    if (repo.modifiedFiles) {
      parts.push(`${repo.modifiedFiles} modified`);
    }
    if (repo.stagedFiles) {
      parts.push(`${repo.stagedFiles} staged`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Clean';
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        {repositories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderGit2 className="w-16 h-16 text-neutral-700 mb-4" />
            <p className="text-neutral-400 mb-2">No repositories imported yet</p>
            <p className="text-sm text-neutral-500">
              Click "Import Repositories" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {repositories.map((repo, idx) => (
              <div
                key={`${repo.owner}/${repo.name}`}
                className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(repo.status)}
                      <h3 className="font-mono">
                        <span className="text-neutral-400">{repo.owner}/</span>
                        {repo.name}
                      </h3>
                      {repo.pullRequest && (
                        <a
                          href={repo.pullRequest.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-400 hover:bg-purple-500/20 transition-colors"
                          title={`PR #${repo.pullRequest.number}: ${repo.pullRequest.title}`}
                        >
                          <GitPullRequest className="w-3 h-3" />
                          #{repo.pullRequest.number}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <GitBranch className="w-3.5 h-3.5" />
                        {repo.branch}
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        {repo.status === 'untracked' && (
                          <FileQuestion className="w-3.5 h-3.5" />
                        )}
                        {repo.status === 'modified' && (
                          <FileEdit className="w-3.5 h-3.5" />
                        )}
                        {getStatusText(repo)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}