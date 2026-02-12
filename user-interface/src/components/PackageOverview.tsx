import { useState } from 'react';
import { RepositoryWithPackages, PackageLink, PackageInfo } from './PackagesPanel';
import { Package, AlertTriangle, CheckCircle2, XCircle, Boxes, Link2, Info } from 'lucide-react';

interface PackageOverviewProps {
  packages: RepositoryWithPackages[];
  links: PackageLink[];
}

function PackageManagerBadge({ pkg }: { pkg: PackageInfo }) {
  const [showTooltip, setShowTooltip] = useState(false);

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
    <div className="relative">
      <span
        className={`px-2 py-0.5 border rounded text-xs uppercase cursor-help ${getPackageManagerColor(
          pkg.packageManager
        )}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {pkg.packageManager}
      </span>

      {showTooltip && pkg.pnpmWorkspace && (
        <div className="absolute left-0 top-full mt-2 z-10 w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800">
            <Info className="w-3.5 h-3.5 text-orange-400" />
            <h5 className="text-xs uppercase tracking-wide text-orange-400">pnpm Workspace</h5>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-500">package.json:</span>
              <code className="block mt-1 bg-neutral-950 px-2 py-1 rounded text-neutral-300">
                {pkg.packageJsonPath}
              </code>
            </div>
            {pkg.pnpmWorkspace.workspaceYamlPath && (
              <div>
                <span className="text-neutral-500">pnpm-workspace.yaml:</span>
                <code className="block mt-1 bg-neutral-950 px-2 py-1 rounded text-neutral-300">
                  {pkg.pnpmWorkspace.workspaceYamlPath}
                </code>
              </div>
            )}
            {pkg.pnpmWorkspace.workspacePackages && (
              <div>
                <span className="text-neutral-500">Workspace packages:</span>
                <div className="mt-1 bg-neutral-950 px-2 py-1 rounded text-neutral-300">
                  {pkg.pnpmWorkspace.workspacePackages.map((p, idx) => (
                    <div key={idx}>{p}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MonorepoTypeBadge({ pkg }: { pkg: PackageInfo }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!pkg.monorepoType) return null;

  const getMonorepoColor = (type: string) => {
    const colors = {
      nx: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      lerna: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      turborepo: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    };
    return colors[type as keyof typeof colors] || colors.nx;
  };

  return (
    <div className="relative">
      <span
        className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-xs cursor-help ${getMonorepoColor(
          pkg.monorepoType
        )}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Boxes className="w-3 h-3" />
        {pkg.monorepoType.toUpperCase()}
      </span>

      {showTooltip && pkg.nxConfig && (
        <div className="absolute left-0 top-full mt-2 z-10 w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <h5 className="text-xs uppercase tracking-wide text-blue-400">NX Configuration</h5>
          </div>
          <div className="space-y-2 text-xs">
            {pkg.nxConfig.rootNxJsonPath && (
              <div>
                <span className="text-neutral-500">Root nx.json:</span>
                <code className="block mt-1 bg-neutral-950 px-2 py-1 rounded text-neutral-300">
                  {pkg.nxConfig.rootNxJsonPath}
                </code>
              </div>
            )}
            {pkg.nxConfig.packageNxJsonPath && (
              <div>
                <span className="text-neutral-500">Package project.json:</span>
                <code className="block mt-1 bg-neutral-950 px-2 py-1 rounded text-neutral-300">
                  {pkg.nxConfig.packageNxJsonPath}
                </code>
              </div>
            )}
            <div>
              <span className="text-neutral-500">package.json:</span>
              <code className="block mt-1 bg-neutral-950 px-2 py-1 rounded text-neutral-300">
                {pkg.packageJsonPath}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PackageOverview({ packages, links }: PackageOverviewProps) {
  const getLinksForRepo = (repoName: string) => {
    return links.filter((l) => l.toRepo === repoName || l.fromRepo === repoName);
  };

  const getAllPackageNames = () => {
    const names: string[] = [];
    packages.forEach((repo) => {
      repo.packages.forEach((pkg) => {
        names.push(pkg.name);
      });
    });
    return names;
  };

  const allPackageNames = getAllPackageNames();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h3 className="mb-2">Package Repositories</h3>
          <p className="text-sm text-neutral-500">
            All packages detected in your workspace with their dependencies and link status
          </p>
        </div>

        <div className="space-y-4">
          {packages.map((repo) => {
            const repoLinks = getLinksForRepo(repo.name);
            const linkedCount = repoLinks.filter((l) => l.status === 'linked').length;
            const brokenCount = repoLinks.filter((l) => l.status === 'broken').length;

            return (
              <div
                key={repo.name}
                className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"
              >
                {/* Repository Header */}
                <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-blue-400" />
                        <h4 className="font-mono">{repo.name}</h4>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-neutral-500">
                          {repo.packages.length} {repo.packages.length === 1 ? 'package' : 'packages'}
                        </span>
                        {linkedCount > 0 && (
                          <span className="flex items-center gap-1.5 text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {linkedCount} linked
                          </span>
                        )}
                        {brokenCount > 0 && (
                          <span className="flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {brokenCount} broken
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Packages List */}
                <div className="divide-y divide-neutral-800">
                  {repo.packages.map((pkg) => {
                    const incomingLinks = links.filter(
                      (l) => l.to === pkg.name && l.toRepo === repo.name
                    );

                    return (
                      <div key={pkg.name} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h5 className="font-mono text-sm">{pkg.name}</h5>
                              <span className="text-xs text-neutral-500">v{pkg.version}</span>
                              <PackageManagerBadge pkg={pkg} />
                              <MonorepoTypeBadge pkg={pkg} />
                            </div>
                            <p className="text-xs text-neutral-500 mb-2">{pkg.path}</p>

                            {pkg.buildCommand && (
                              <code className="text-xs text-neutral-400 bg-neutral-950 px-2 py-1 rounded">
                                {pkg.buildCommand}
                              </code>
                            )}
                          </div>
                        </div>

                        {/* Dependencies */}
                        {pkg.dependencies.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-neutral-500 mb-2">Dependencies:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pkg.dependencies.map((dep) => {
                                const link = links.find(
                                  (l) => l.to === dep && l.from === pkg.name
                                );
                                const isInWorkspace = allPackageNames.includes(dep);

                                return (
                                  <span
                                    key={dep}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                                      link?.status === 'linked'
                                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                        : link?.status === 'broken'
                                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                        : isInWorkspace
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                        : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                                    }`}
                                  >
                                    {link?.status === 'linked' && (
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                    )}
                                    {link?.status === 'broken' && <XCircle className="w-2.5 h-2.5" />}
                                    {isInWorkspace && !link && <Link2 className="w-2.5 h-2.5" />}
                                    {dep}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Incoming Links */}
                        {incomingLinks.length > 0 && (
                          <div className="mt-3 p-3 bg-neutral-950 rounded border border-neutral-800">
                            <p className="text-xs text-neutral-500 mb-2">
                              Used by {incomingLinks.length}{' '}
                              {incomingLinks.length === 1 ? 'package' : 'packages'}:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {incomingLinks.map((link) => (
                                <span
                                  key={`${link.from}-${link.to}`}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                                    link.status === 'linked'
                                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                      : link.status === 'broken'
                                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                      : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                                  }`}
                                >
                                  {link.status === 'linked' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {link.status === 'broken' && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {link.from} ({link.fromRepo.split('/')[1]})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}