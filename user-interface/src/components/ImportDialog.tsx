import { useState } from 'react';
import { X, Search, GitBranch } from 'lucide-react';
import { Workspace } from '../App';

interface ImportDialogProps {
  workspace: Workspace;
  onClose: () => void;
  onImport: (count: number) => void;
}

export function ImportDialog({ workspace, onClose, onImport }: ImportDialogProps) {
  const [importMode, setImportMode] = useState<'query' | 'specific'>('query');
  const [query, setQuery] = useState('');
  const [repoNames, setRepoNames] = useState('');
  const [isDryRun, setIsDryRun] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleImport = () => {
    setIsImporting(true);
    
    // Simulate import
    setTimeout(() => {
      const mockResults = [
        'stefreak/buntspiel',
        'stefreak/dappcamp-health-plus',
        'stefreak/garden-playground-exampleapp',
        'stefreak/kernel-test',
        'stefreak/nut',
        'stefreak/ossf-scorecard-repro-2189',
        'stefreak/swiftrest',
      ];
      
      setResults(mockResults);
      setIsImporting(false);
      
      if (!isDryRun) {
        setTimeout(() => {
          onImport(mockResults.length);
        }, 1000);
      }
    }, 2000);
  };

  const exampleQueries = [
    'owner:stefreak language:rust -fork:only -archived:true',
    'org:actions language:JavaScript,TypeScript -fork:only -archived:true',
    'user:stefreak is:public',
    'topic:cli user:stefreak',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg mb-1">Import Repositories</h2>
            <p className="text-sm text-neutral-500">
              Workspace: {workspace.description}
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
          {/* Mode Selection */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setImportMode('query')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                importMode === 'query'
                  ? 'bg-neutral-800 text-blue-400'
                  : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <Search className="w-4 h-4" />
              Search Query
            </button>
            <button
              onClick={() => setImportMode('specific')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                importMode === 'specific'
                  ? 'bg-neutral-800 text-blue-400'
                  : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Specific Repos
            </button>
          </div>

          {/* Query Mode */}
          {importMode === 'query' && (
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                GitHub Search Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="owner:username language:rust -fork:only -archived:true"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 mb-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600"
              />
              
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="dryRun"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-900"
                />
                <label htmlFor="dryRun" className="text-sm text-neutral-400">
                  Dry run (preview only)
                </label>
              </div>

              <div className="mb-4">
                <p className="text-sm text-neutral-400 mb-2">Example queries:</p>
                <div className="space-y-2">
                  {exampleQueries.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(example)}
                      className="block w-full text-left px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-sm text-neutral-300 transition-colors font-mono"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Specific Repos Mode */}
          {importMode === 'specific' && (
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Repository Names
              </label>
              <textarea
                value={repoNames}
                onChange={(e) => setRepoNames(e.target.value)}
                placeholder="owner/repo1&#10;owner/repo2&#10;owner/repo3"
                rows={6}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 mb-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600 font-mono resize-none"
              />
              <p className="text-xs text-neutral-500">
                Enter repository names in owner/repo format, one per line
              </p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm text-neutral-400 mb-3">
                {isDryRun ? 'Preview:' : 'Imported:'} {results.length}{' '}
                {results.length === 1 ? 'repository' : 'repositories'}
              </h3>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-1 font-mono text-sm">
                  {results.map((repo) => (
                    <div key={repo} className="text-neutral-300">
                      ✓ {repo}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Importing State */}
          {isImporting && (
            <div className="mt-6 p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-400 animate-pulse">
                Importing repositories...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={
              isImporting ||
              (importMode === 'query' && !query.trim()) ||
              (importMode === 'specific' && !repoNames.trim())
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors"
          >
            {isImporting ? 'Importing...' : isDryRun ? 'Preview' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
