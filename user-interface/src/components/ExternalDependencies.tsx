import { useState } from 'react';
import { RepositoryWithPackages } from './PackagesPanel';
import { Download, Search, GitBranch, AlertCircle } from 'lucide-react';
import { inferGitHubRepo } from '../data/packageRegistry';

interface ExternalDependenciesProps {
  packages: RepositoryWithPackages[];
  onImportRepo: (packageName: string, inferredRepo: string) => void;
}

interface ExternalDependency {
  name: string;
  usedBy: string[]; // List of packages that depend on this
  inferredRepo: string; // GitHub repo we think this package comes from
}

export function ExternalDependencies({ packages, onImportRepo }: ExternalDependenciesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  // Get all packages in workspace
  const workspacePackages = new Set<string>();
  packages.forEach((repo) => {
    repo.packages.forEach((pkg) => {
      workspacePackages.add(pkg.name);
    });
  });

  // Find all external dependencies
  const externalDeps = new Map<string, ExternalDependency>();
  packages.forEach((repo) => {
    repo.packages.forEach((pkg) => {
      pkg.dependencies.forEach((dep) => {
        // Extract package name without version (e.g., '@acme/design-system@1.0.0' -> '@acme/design-system')
        const depName = dep.includes('@', 1) ? dep.substring(0, dep.lastIndexOf('@')) : dep.split('@')[0];
        
        if (!workspacePackages.has(depName) && !depName.startsWith('@types/')) {
          const existing = externalDeps.get(depName);
          if (existing) {
            existing.usedBy.push(pkg.name);
          } else {
            // Infer GitHub repo from package name
            // In a real implementation, this would query npm registry or use a mapping
            const inferredRepo = inferGitHubRepo(depName);
            externalDeps.set(depName, {
              name: depName,
              usedBy: [pkg.name],
              inferredRepo,
            });
          }
        }
      });
    });
  });

  const externalDepsList = Array.from(externalDeps.values());

  // Filter by search query
  const filteredDeps = searchQuery
    ? externalDepsList.filter(
        (dep) =>
          dep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dep.inferredRepo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : externalDepsList;

  const handleImport = (dep: ExternalDependency) => {
    setImporting(dep.name);
    setTimeout(() => {
      onImportRepo(dep.name, dep.inferredRepo);
      setImporting(null);
    }, 1500);
  };

  if (externalDepsList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400 mb-1">No external dependencies found</p>
          <p className="text-sm text-neutral-500">
            All dependencies are already in your workspace
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="mb-1">External Dependencies</h4>
            <p className="text-sm text-neutral-500">
              {externalDepsList.length} {externalDepsList.length === 1 ? 'package' : 'packages'}{' '}
              not in workspace
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search external dependencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Dependencies List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDeps.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400">No dependencies match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDeps.map((dep) => (
              <div
                key={dep.name}
                className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-mono text-sm">{dep.name}</h5>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{dep.inferredRepo}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-neutral-500">Used by:</span>
                      {dep.usedBy.map((pkg) => (
                        <span
                          key={pkg}
                          className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300"
                        >
                          {pkg}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleImport(dep)}
                    disabled={importing === dep.name}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors text-sm whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    {importing === dep.name ? 'Importing...' : 'Import Repo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}