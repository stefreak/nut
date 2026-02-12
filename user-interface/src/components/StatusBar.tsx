import { Repository } from '../App';
import { CheckCircle2, AlertCircle, FileQuestion, FileEdit } from 'lucide-react';

interface StatusBarProps {
  totalRepos: number;
  cleanRepos: number;
  dirtyRepos: number;
  repositories: Repository[];
}

export function StatusBar({
  totalRepos,
  cleanRepos,
  dirtyRepos,
  repositories,
}: StatusBarProps) {
  const reposWithChanges = repositories.filter((r) => r.status !== 'clean');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl">{totalRepos}</p>
              <p className="text-sm text-neutral-500">Total Repositories</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl">{cleanRepos}</p>
              <p className="text-sm text-neutral-500">Clean</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl">{dirtyRepos}</p>
              <p className="text-sm text-neutral-500">With Changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mb-6 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        {cleanRepos === totalRepos ? (
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <p>All repositories are clean</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-orange-400">
            <AlertCircle className="w-5 h-5" />
            <p>
              {dirtyRepos} {dirtyRepos === 1 ? 'repository has' : 'repositories have'} changes
            </p>
          </div>
        )}
      </div>

      {/* Repositories with Changes */}
      {reposWithChanges.length > 0 && (
        <div>
          <h3 className="mb-4 text-neutral-400">Repositories with changes:</h3>
          <div className="space-y-3">
            {reposWithChanges.map((repo) => (
              <div
                key={`${repo.owner}/${repo.name}`}
                className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-mono mb-1">
                      <span className="text-neutral-400">{repo.owner}/</span>
                      {repo.name}
                    </h4>
                    <p className="text-sm text-neutral-500">
                      Branch: {repo.branch}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  {repo.untrackedFiles && repo.untrackedFiles > 0 && (
                    <div className="flex items-center gap-2 text-orange-400">
                      <FileQuestion className="w-4 h-4" />
                      <span>
                        {repo.untrackedFiles} untracked{' '}
                        {repo.untrackedFiles === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  )}
                  {repo.modifiedFiles && repo.modifiedFiles > 0 && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <FileEdit className="w-4 h-4" />
                      <span>
                        {repo.modifiedFiles} modified{' '}
                        {repo.modifiedFiles === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  )}
                  {repo.stagedFiles && repo.stagedFiles > 0 && (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {repo.stagedFiles} staged{' '}
                        {repo.stagedFiles === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
