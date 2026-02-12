import { useState } from 'react';
import { Repository } from '../App';
import { Play, FileCode, Terminal } from 'lucide-react';

interface CommandPanelProps {
  repositories: Repository[];
  onCommandExecute: (repos: Repository[]) => void;
}

export function CommandPanel({ repositories, onCommandExecute }: CommandPanelProps) {
  const [commandMode, setCommandMode] = useState<'command' | 'script'>('command');
  const [command, setCommand] = useState('');
  const [scriptPath, setScriptPath] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const simulateCommand = () => {
    setIsRunning(true);
    const newOutput: string[] = [];

    // Simulate command execution across repos
    repositories.forEach((repo) => {
      newOutput.push(`==> ${repo.owner}/${repo.name} <==`);
      
      if (command.includes('checkout -b')) {
        const branchName = command.split(' ').pop() || 'new-branch';
        newOutput.push(`Switched to a new branch '${branchName}'`);
      } else if (command.includes('status')) {
        newOutput.push(`On branch ${repo.branch}`);
        if (repo.status === 'untracked' && repo.untrackedFiles) {
          newOutput.push(`Untracked files: ${repo.untrackedFiles} file(s)`);
        } else if (repo.status === 'clean') {
          newOutput.push('nothing to commit, working tree clean');
        }
      } else if (command.includes('add')) {
        newOutput.push('');
      } else if (command.includes('commit')) {
        const match = command.match(/-m ["']([^"']+)["']/);
        const message = match ? match[1] : 'commit message';
        newOutput.push(`[${repo.branch} abc1234] ${message}`);
        newOutput.push(' 1 file changed, 0 insertions(+), 0 deletions(-)');
      } else {
        newOutput.push('Command executed successfully');
      }
      newOutput.push('');
    });

    setOutput(newOutput);
    
    // Update repository statuses based on command
    if (command.includes('add')) {
      const updated = repositories.map(r => ({
        ...r,
        status: 'modified' as const,
        stagedFiles: r.untrackedFiles || r.modifiedFiles || 0,
        untrackedFiles: 0,
      }));
      onCommandExecute(updated);
    } else if (command.includes('commit')) {
      const updated = repositories.map(r => ({
        ...r,
        status: 'clean' as const,
        stagedFiles: 0,
        modifiedFiles: 0,
        untrackedFiles: 0,
      }));
      onCommandExecute(updated);
    }

    setTimeout(() => setIsRunning(false), 1000);
  };

  const handleExecute = () => {
    if ((commandMode === 'command' && !command.trim()) || 
        (commandMode === 'script' && !scriptPath.trim())) {
      return;
    }

    if (commandMode === 'script') {
      setIsRunning(true);
      const newOutput: string[] = [];
      repositories.forEach((repo) => {
        newOutput.push(`==> ${repo.owner}/${repo.name} <==`);
        newOutput.push('Created new file XYZ.md');
        newOutput.push('');
      });
      setOutput(newOutput);
      setTimeout(() => setIsRunning(false), 1000);
    } else {
      simulateCommand();
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCommandMode('command')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            commandMode === 'command'
              ? 'bg-neutral-800 text-blue-400'
              : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Command
        </button>
        <button
          onClick={() => setCommandMode('script')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            commandMode === 'script'
              ? 'bg-neutral-800 text-blue-400'
              : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          Script
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        {commandMode === 'command' ? (
          <div>
            <label className="block text-sm text-neutral-400 mb-2">
              Run command across all repositories
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-neutral-900 border border-neutral-800 rounded-lg px-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <span className="text-neutral-500 mr-2">$</span>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                  placeholder="git checkout -b new-branch"
                  className="flex-1 bg-transparent py-3 outline-none placeholder:text-neutral-600"
                />
              </div>
              <button
                onClick={handleExecute}
                disabled={isRunning || !command.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Run
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Example: git checkout -b change-xyz
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-neutral-400 mb-2">
              Run script across all repositories
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scriptPath}
                onChange={(e) => setScriptPath(e.target.value)}
                placeholder="/path/to/script.sh"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600"
              />
              <button
                onClick={handleExecute}
                disabled={isRunning || !scriptPath.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Run
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Script will run in each repository directory
            </p>
          </div>
        )}
      </div>

      {/* Common Commands */}
      <div className="mb-4">
        <p className="text-sm text-neutral-400 mb-2">Quick commands:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'git status',
            'git checkout -b new-feature',
            'git add .',
            'git commit -m "message"',
            'git push',
            'gh pr create --fill',
            'gh pr list',
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                setCommandMode('command');
                setCommand(cmd);
              }}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-sm transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-4 overflow-y-auto font-mono text-sm">
        {output.length === 0 ? (
          <p className="text-neutral-600">Output will appear here...</p>
        ) : (
          <div className="space-y-1">
            {output.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.startsWith('==>')
                    ? 'text-blue-400 mt-2'
                    : 'text-neutral-300'
                }
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}