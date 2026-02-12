import { useState } from 'react';
import { Repository } from '../App';
import { X, GitPullRequest, AlertCircle } from 'lucide-react';

interface CreatePullRequestDialogProps {
  repositories: Repository[];
  onClose: () => void;
  onCreate: (title: string, body: string) => void;
}

export function CreatePullRequestDialog({
  repositories,
  onClose,
  onCreate,
}: CreatePullRequestDialogProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [fillFromCommit, setFillFromCommit] = useState(true);
  const [pushToOrigin, setPushToOrigin] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdPRs, setCreatedPRs] = useState<string[]>([]);

  const handleCreate = () => {
    setIsCreating(true);
    
    // Simulate PR creation with output
    const prUrls: string[] = [];
    repositories.forEach((repo, idx) => {
      const targetBranch = 
        repo.name === 'kernel-test' 
          ? 'test-foo' 
          : repo.name.includes('playground') || repo.name === 'swiftrest' 
          ? 'master' 
          : 'main';
      
      const prNumber = idx + 1;
      const url = `https://github.com/${repo.owner}/${repo.name}/pull/${prNumber}`;
      prUrls.push(`==> ${repo.owner}/${repo.name} <==`);
      
      if (pushToOrigin) {
        prUrls.push('Enumerating objects: 4, done.');
        prUrls.push('Counting objects: 100% (4/4), done.');
        prUrls.push('Writing objects: 100% (3/3), 270 bytes | 270.00 KiB/s, done.');
        prUrls.push(`To github.com:${repo.owner}/${repo.name}.git`);
        prUrls.push(`   abc1234..def5678  HEAD -> ${repo.branch}`);
        prUrls.push(`branch '${repo.branch}' set up to track 'origin/${repo.branch}'.`);
        prUrls.push('');
      }
      
      prUrls.push(`Creating pull request for ${repo.branch} into ${targetBranch} in ${repo.owner}/${repo.name}`);
      prUrls.push('');
      prUrls.push(url);
      prUrls.push('');
    });
    
    setCreatedPRs(prUrls);
    
    setTimeout(() => {
      setIsCreating(false);
      setTimeout(() => {
        onCreate(title || 'Change XYZ', body);
      }, 1000);
    }, 2000);
  };

  const exampleCommands = [
    {
      label: 'Basic (with --fill)',
      command: 'gh pr create --fill',
      description: 'Uses commit message as PR title and body',
    },
    {
      label: 'With push',
      command: 'git push -u origin HEAD && gh pr create --fill',
      description: 'Pushes changes and creates PR',
    },
    {
      label: 'Custom title',
      command: 'gh pr create --title "My PR Title" --body "Description"',
      description: 'Specify custom title and body',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg mb-1">Create Pull Requests</h2>
            <p className="text-sm text-neutral-500">
              Create PRs across {repositories.length} repositories
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {createdPRs.length === 0 ? (
            <>
              {/* Options */}
              <div className="mb-6">
                <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-200">
                    <p className="mb-2">
                      This will run the command across all repositories in the workspace.
                    </p>
                    <p className="text-blue-300">
                      Equivalent to: <code className="px-2 py-0.5 bg-blue-950/50 rounded font-mono">
                        nut apply sh -c "git push -u origin HEAD && gh pr create --fill"
                      </code>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pushToOrigin"
                      checked={pushToOrigin}
                      onChange={(e) => setPushToOrigin(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900"
                    />
                    <label htmlFor="pushToOrigin" className="text-sm text-neutral-300">
                      Push changes to origin before creating PR
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="fillFromCommit"
                      checked={fillFromCommit}
                      onChange={(e) => setFillFromCommit(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900"
                    />
                    <label htmlFor="fillFromCommit" className="text-sm text-neutral-300">
                      Use commit message for PR title and body (--fill)
                    </label>
                  </div>
                </div>
              </div>

              {/* Custom Title and Body */}
              {!fillFromCommit && (
                <div className="mb-6">
                  <div className="mb-4">
                    <label className="block text-sm text-neutral-400 mb-2">
                      Pull Request Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Change XYZ"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">
                      Pull Request Body (Optional)
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Description of changes..."
                      rows={4}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Command Examples */}
              <div>
                <h3 className="text-sm text-neutral-400 mb-3">Command Reference:</h3>
                <div className="space-y-2">
                  {exampleCommands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm text-neutral-400">{cmd.label}</span>
                      </div>
                      <code className="text-sm text-neutral-300 font-mono block mb-1">
                        {cmd.command}
                      </code>
                      <p className="text-xs text-neutral-500">{cmd.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Output Display */
            <div>
              <div className="flex items-center gap-2 mb-4 text-green-400">
                <GitPullRequest className="w-5 h-5" />
                <h3>Pull requests created successfully</h3>
              </div>
              
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
                {createdPRs.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.startsWith('==>')
                        ? 'text-blue-400 mt-2 first:mt-0'
                        : line.startsWith('http')
                        ? 'text-green-400 underline'
                        : line.startsWith('Creating')
                        ? 'text-neutral-300'
                        : 'text-neutral-500 text-xs'
                    }
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            {createdPRs.length > 0 ? 'Close' : 'Cancel'}
          </button>
          {createdPRs.length === 0 && (
            <button
              onClick={handleCreate}
              disabled={isCreating || (!fillFromCommit && !title.trim())}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors"
            >
              <GitPullRequest className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Pull Requests'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
