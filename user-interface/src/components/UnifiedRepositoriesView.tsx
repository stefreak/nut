import { useState } from 'react';
import { Repository } from '../App';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Terminal,
  Code,
  Sparkles,
  Download,
} from 'lucide-react';

interface UnifiedRepositoriesViewProps {
  repositories: Repository[];
  onVSCodeOpen?: (repoFullName: string) => void;
  onImport?: () => void;
}

export function UnifiedRepositoriesView({ repositories, onVSCodeOpen, onImport }: UnifiedRepositoriesViewProps) {
  const [hoveredPR, setHoveredPR] = useState<string | null>(null);

  const getPRStatusColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'merged':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'closed':
        return 'bg-neutral-800 border-neutral-700 text-neutral-400';
      default:
        return 'bg-neutral-800 border-neutral-700 text-neutral-400';
    }
  };

  const dirtyRepos = repositories.filter(
    (r) => r.status === 'modified' || r.status === 'untracked'
  );
  const cleanRepos = repositories.filter((r) => r.status === 'clean');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-800">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="text-xs text-neutral-500 mb-1">Total</p>
            <p className="text-xl">{repositories.length}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="text-xs text-neutral-500 mb-1">Clean</p>
            <p className="text-xl">{cleanRepos.length}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="text-xs text-neutral-500 mb-1">Modified</p>
            <p className="text-xl">
              {repositories.filter((r) => r.status === 'modified').length}
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="text-xs text-neutral-500 mb-1">Untracked</p>
            <p className="text-xl">
              {repositories.filter((r) => r.status === 'untracked').length}
            </p>
          </div>
        </div>
      </div>

      {/* Repositories List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {repositories.map((repo) => {
            const repoFullName = `${repo.owner}/${repo.name}`;

            return (
              <div
                key={repoFullName}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-all"
              >
                <div className="p-4 flex items-center gap-3">
                  {/* Repo Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-mono truncate">{repoFullName}</h4>
                      
                      {/* PR Badge with Tooltip */}
                      {repo.pullRequest && (
                        <div 
                          className="relative"
                          onMouseEnter={() => setHoveredPR(repoFullName)}
                          onMouseLeave={() => setHoveredPR(null)}
                        >
                          <div
                            className={`flex items-center gap-1 px-1.5 py-0.5 border rounded cursor-help ${getPRStatusColor(
                              repo.pullRequest.state
                            )}`}
                          >
                            <GitPullRequest className="w-3 h-3" />
                          </div>
                          
                          {/* Tooltip */}
                          {hoveredPR === repoFullName && (
                            <div className="absolute left-0 top-full mt-2 z-10 w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-3">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-xs w-fit mb-2 ${getPRStatusColor(
                                    repo.pullRequest.state
                                  )}`}>
                                    <GitPullRequest className="w-3 h-3" />
                                    #{repo.pullRequest.number} • {repo.pullRequest.state}
                                  </div>
                                  <p className="text-sm mb-2">{repo.pullRequest.title}</p>
                                  <p className="text-xs text-neutral-500">
                                    {repo.pullRequest.branch} → {repo.pullRequest.targetBranch}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={repo.pullRequest.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View on GitHub
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {repo.branch}
                        </span>
                      </div>

                      {repo.modifiedFiles && repo.modifiedFiles > 0 && (
                        <span className="text-xs">
                          {repo.modifiedFiles} modified
                        </span>
                      )}
                      {repo.untrackedFiles && repo.untrackedFiles > 0 && (
                        <span className="text-xs">
                          {repo.untrackedFiles} untracked
                        </span>
                      )}
                      {repo.stagedFiles && repo.stagedFiles > 0 && (
                        <span className="text-xs">
                          {repo.stagedFiles} staged
                        </span>
                      )}
                    </div>
                  </div>

                  {/* VS Code Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onVSCodeOpen) {
                        onVSCodeOpen(repoFullName);
                      } else {
                        console.log(`Opening ${repoFullName} in VS Code`);
                      }
                    }}
                    className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
                    title="Open in VS Code"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Import Repositories Button */}
        {onImport && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Import Repositories
            </button>
          </div>
        )}
      </div>
    </div>
  );
}