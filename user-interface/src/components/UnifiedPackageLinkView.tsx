import { useState } from 'react';
import { RepositoryWithPackages, PackageLink, PackageInfo } from './PackagesPanel';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Link2,
  Unlink,
  Download,
  Search,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { inferGitHubRepo } from '../data/packageRegistry';

interface UnifiedPackageLinkViewProps {
  packages: RepositoryWithPackages[];
  links: PackageLink[];
  onLink: (link: PackageLink) => void;
  onLinkMultiple?: (links: PackageLink[]) => void;
  onUnlink: (link: PackageLink) => void;
  onImportRepo: (packageName: string, inferredRepo: string) => void;
}

interface ExternalDependency {
  name: string;
  usedBy: string[]; // List of packages that depend on this
  inferredRepo: string; // GitHub repo we think this package comes from
}

function PackageManagerBadge({ pkg }: { pkg: PackageInfo }) {
  const getPackageManagerColor = (pm: string) => {
    const colors = {
      npm: 'bg-red-500/10 border-red-500/20 text-red-400',
      pnpm: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      yarn: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      bun: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
    };
    return colors[pm as keyof typeof colors] || colors.npm;
  };

  return (
    <span
      className={`px-2 py-0.5 border rounded text-xs uppercase ${getPackageManagerColor(
        pkg.packageManager
      )}`}
    >
      {pkg.packageManager}
    </span>
  );
}

export function UnifiedPackageLinkView({
  packages,
  links,
  onLink,
  onLinkMultiple,
  onUnlink,
  onImportRepo,
}: UnifiedPackageLinkViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'not-linked' | 'external'>('all');
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
        const depName = dep.includes('@', 1) ? dep.substring(0, dep.lastIndexOf('@')) : dep.split('@')[0];
        
        if (!workspacePackages.has(depName) && !depName.startsWith('@types/')) {
          const existing = externalDeps.get(depName);
          if (existing) {
            if (!existing.usedBy.includes(pkg.name)) {
              existing.usedBy.push(pkg.name);
            }
          } else {
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

  // Build list of all relationships (both workspace links and external deps)
  interface PackageRelationship {
    type: 'linked' | 'not-linked' | 'broken' | 'external';
    from: string;
    to: string;
    fromRepo?: string;
    toRepo?: string;
    status?: string;
    usedBy?: string[];
    inferredRepo?: string;
    link?: PackageLink;
  }

  const relationships: PackageRelationship[] = [];

  // Add workspace links
  links.forEach((link) => {
    relationships.push({
      type: link.status === 'linked' ? 'linked' : link.status === 'broken' ? 'broken' : 'not-linked',
      from: link.from,
      to: link.to,
      fromRepo: link.fromRepo,
      toRepo: link.toRepo,
      status: link.status,
      link,
    });
  });

  // Add external dependencies
  externalDepsList.forEach((dep) => {
    relationships.push({
      type: 'external',
      from: dep.usedBy.join(', '),
      to: dep.name,
      usedBy: dep.usedBy,
      inferredRepo: dep.inferredRepo,
    });
  });

  // Filter relationships
  let filteredRelationships = relationships;
  
  if (filter !== 'all') {
    filteredRelationships = relationships.filter((r) => r.type === filter);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredRelationships = filteredRelationships.filter((r) => {
      // For external dependencies, only search package name and inferred repo
      if (r.type === 'external') {
        return (
          r.to.toLowerCase().includes(query) ||
          r.inferredRepo?.toLowerCase().includes(query)
        );
      }
      
      // For workspace links, search all fields
      return (
        r.from.toLowerCase().includes(query) ||
        r.to.toLowerCase().includes(query) ||
        r.fromRepo?.toLowerCase().includes(query) ||
        r.toRepo?.toLowerCase().includes(query)
      );
    });
  }

  const handleImport = (dep: PackageRelationship) => {
    if (dep.type !== 'external' || !dep.inferredRepo) return;
    
    setImporting(dep.to);
    setTimeout(() => {
      onImportRepo(dep.to, dep.inferredRepo!);
      setImporting(null);
    }, 1500);
  };

  const handleLink = (rel: PackageRelationship) => {
    if (rel.link && onLink) {
      onLink(rel.link);
    }
  };

  const handleUnlink = (rel: PackageRelationship) => {
    if (rel.link && onUnlink) {
      onUnlink(rel.link);
    }
  };

  // Calculate counts for filters
  const counts = {
    all: relationships.length,
    linked: relationships.filter((r) => r.type === 'linked').length,
    'not-linked': relationships.filter((r) => r.type === 'not-linked' || r.type === 'broken').length,
    external: relationships.filter((r) => r.type === 'external').length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Search and Filter */}
      <div className="p-4 border-b border-neutral-800 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search packages, repositories, or dependencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              filter === 'all'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setFilter('linked')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              filter === 'linked'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Linked ({counts.linked})
          </button>
          <button
            onClick={() => setFilter('not-linked')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              filter === 'not-linked'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Not Linked ({counts['not-linked']})
          </button>
          <button
            onClick={() => setFilter('external')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              filter === 'external'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            <Download className="w-3 h-3" />
            External ({counts.external})
          </button>
        </div>
      </div>

      {/* Relationships List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRelationships.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400">No package relationships found</p>
            {searchQuery && (
              <p className="text-sm text-neutral-500 mt-1">Try adjusting your search</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRelationships.map((rel, idx) => (
              <div
                key={`${rel.type}-${rel.from}-${rel.to}-${idx}`}
                className={`p-4 rounded-lg border transition-colors ${
                  rel.type === 'linked'
                    ? 'bg-green-500/5 border-green-500/20'
                    : rel.type === 'broken'
                    ? 'bg-red-500/5 border-red-500/20'
                    : rel.type === 'external'
                    ? 'bg-purple-500/5 border-purple-500/20'
                    : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left side - relationship info */}
                  <div className="flex-1 min-w-0">
                    {rel.type === 'external' ? (
                      // External dependency
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Download className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <h5 className="font-mono text-sm">{rel.to}</h5>
                          <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-400">
                            External
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>{rel.inferredRepo}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-neutral-500">Used by:</span>
                          {rel.usedBy?.map((pkg) => (
                            <span
                              key={pkg}
                              className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300"
                            >
                              {pkg}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      // Workspace link
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          {rel.type === 'linked' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : rel.type === 'broken' ? (
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          )}
                          <span className="font-mono text-sm">{rel.from}</span>
                          <span className="text-neutral-600">→</span>
                          <span className="font-mono text-sm">{rel.to}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-600">from:</span>
                            <span className="text-neutral-400">{rel.fromRepo}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-600">to:</span>
                            <span className="text-neutral-400">{rel.toRepo}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right side - actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rel.type === 'external' ? (
                      <button
                        onClick={() => handleImport(rel)}
                        disabled={importing === rel.to}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {importing === rel.to ? 'Importing...' : 'Import'}
                      </button>
                    ) : rel.type === 'linked' ? (
                      <button
                        onClick={() => handleUnlink(rel)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs transition-colors"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        Unlink
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLink(rel)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Link
                      </button>
                    )}
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