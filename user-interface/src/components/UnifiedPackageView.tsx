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
  RefreshCw,
  AlertCircle,
  Terminal,
} from 'lucide-react';

interface UnifiedPackageViewProps {
  packages: RepositoryWithPackages[];
  links: PackageLink[];
  onLink: (link: PackageLink) => void;
  onLinkMultiple?: (links: PackageLink[]) => void;
  onUnlink: (link: PackageLink) => void;
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

export function UnifiedPackageView({ packages, links, onLink, onLinkMultiple, onUnlink }: UnifiedPackageViewProps) {
  const [showOutput, setShowOutput] = useState(false);
  const [commandOutput, setCommandOutput] = useState<string[]>([]);

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
  
  // Check if there are any packages with outgoing links (actionable dependencies)
  const hasLinkablePackages = packages.some((repo) => 
    repo.packages.some((pkg) => {
      const outgoingLinks = links.filter(
        (l) => l.from === pkg.name && l.fromRepo === repo.name
      );
      return outgoingLinks.length > 0;
    })
  );

  const handleLink = (link: PackageLink) => {
    setCommandOutput([
      `Creating symlink for ${link.to}...`,
      `✓ Successfully linked ${link.to} in ${link.fromRepo}`,
      `Symlink: ${link.fromRepo}/node_modules/${link.to} → ../${link.toRepo}`,
    ]);
    setShowOutput(true);
    setTimeout(() => {
      onLink(link);
      setTimeout(() => setShowOutput(false), 3000);
    }, 1000);
  };

  const handleUnlink = (link: PackageLink) => {
    setCommandOutput([
      `Removing symlink for ${link.to}...`,
      `✓ Successfully unlinked ${link.to} from ${link.fromRepo}`,
    ]);
    setShowOutput(true);
    setTimeout(() => {
      onUnlink(link);
      setTimeout(() => setShowOutput(false), 3000);
    }, 1000);
  };

  const handleLinkAll = () => {
    const notLinked = links.filter((l) => l.status === 'not-linked');
    const commands: string[] = [];
    notLinked.forEach((link) => {
      commands.push(`✓ Linked ${link.to} in ${link.fromRepo}`);
    });
    setCommandOutput([
      `Linking ${notLinked.length} packages...`,
      '',
      ...commands,
      '',
      `✓ Successfully linked ${notLinked.length} packages`,
    ]);
    setShowOutput(true);
    setTimeout(() => {
      // Use batched update if available, otherwise fall back to individual updates
      if (onLinkMultiple) {
        onLinkMultiple(notLinked);
      } else {
        notLinked.forEach(onLink);
      }
      setTimeout(() => setShowOutput(false), 3000);
    }, 1500);
  };

  const handleFixBroken = () => {
    const broken = links.filter((l) => l.status === 'broken');
    const commands: string[] = [];
    broken.forEach((link) => {
      commands.push(`✓ Fixed ${link.to} in ${link.fromRepo}`);
    });
    setCommandOutput([
      `Fixing ${broken.length} broken links...`,
      '',
      ...commands,
      '',
      `✓ Successfully fixed ${broken.length} broken links`,
    ]);
    setShowOutput(true);
    setTimeout(() => {
      // Use batched update if available, otherwise fall back to individual updates
      if (onLinkMultiple) {
        onLinkMultiple(broken);
      } else {
        broken.forEach(onLink);
      }
      setTimeout(() => setShowOutput(false), 3000);
    }, 1500);
  };

  const linkedCount = links.filter((l) => l.status === 'linked').length;
  const brokenCount = links.filter((l) => l.status === 'broken').length;
  const notLinkedCount = links.filter((l) => l.status === 'not-linked').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLinkAll}
              disabled={notLinkedCount === 0}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors text-sm"
            >
              <Link2 className="w-4 h-4" />
              Link All ({notLinkedCount})
            </button>
            {brokenCount > 0 && (
              <button
                onClick={handleFixBroken}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Fix Broken ({brokenCount})
              </button>
            )}
          </div>
        </div>

        {brokenCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              {brokenCount} broken {brokenCount === 1 ? 'link' : 'links'} detected. Click "Fix
              Broken" to recreate them.
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasLinkablePackages ? (
          // Empty State
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="max-w-md text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-full">
                  <Link2 className="w-8 h-8 text-neutral-600" />
                </div>
              </div>
              <h4 className="mb-2">No Linkable Packages Found</h4>
              <p className="text-sm text-neutral-500 mb-6">
                We couldn't find any packages in the {packages.length} {packages.length === 1 ? 'repository' : 'repositories'} in your workspace that can be linked together.
              </p>
              <button
                onClick={() => {
                  // Switch to external dependencies tab
                  const externalTab = document.querySelector('[data-view="external"]') as HTMLElement;
                  if (externalTab) externalTab.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
              >
                <Package className="w-4 h-4" />
                Browse External Dependencies
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="mb-2">Package Repositories</h3>
              <p className="text-sm text-neutral-500">
                All packages in your workspace with linking capabilities
              </p>
            </div>

            <div className="space-y-4">
              {packages.map((repo) => {
                const repoLinks = getLinksForRepo(repo.name);
                const linkedRepoCount = repoLinks.filter((l) => l.status === 'linked').length;
                const brokenRepoCount = repoLinks.filter((l) => l.status === 'broken').length;
                
                // Filter packages to only show those with outgoing links (actionable dependencies)
                const packagesWithActions = repo.packages.filter((pkg) => {
                  const outgoingLinks = links.filter(
                    (l) => l.from === pkg.name && l.fromRepo === repo.name
                  );
                  return outgoingLinks.length > 0;
                });
                
                // Skip this repo if it has no packages with actionable links
                if (packagesWithActions.length === 0) {
                  return null;
                }

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
                              {packagesWithActions.length}{' '}
                              {packagesWithActions.length === 1 ? 'package' : 'packages'}
                            </span>
                            {linkedRepoCount > 0 && (
                              <span className="flex items-center gap-1.5 text-green-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {linkedRepoCount} linked
                              </span>
                            )}
                            {brokenRepoCount > 0 && (
                              <span className="flex items-center gap-1.5 text-red-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {brokenRepoCount} broken
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Packages List */}
                    <div className="divide-y divide-neutral-800">
                      {packagesWithActions.map((pkg) => {
                        const incomingLinks = links.filter(
                          (l) => l.to === pkg.name && l.toRepo === repo.name
                        );
                        const outgoingLinks = links.filter(
                          (l) => l.from === pkg.name && l.fromRepo === repo.name
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

                            {/* Dependencies with Link Actions */}
                            {outgoingLinks.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-neutral-500 mb-2">
                                  Workspace dependencies:
                                </p>
                                <div className="space-y-2">
                                  {outgoingLinks.map((link) => (
                                    <div
                                      key={`${link.from}-${link.to}`}
                                      className={`flex items-center justify-between p-2 rounded ${
                                        link.status === 'linked'
                                          ? 'bg-green-500/5 border border-green-500/20'
                                          : link.status === 'broken'
                                          ? 'bg-red-500/5 border border-red-500/20'
                                          : 'bg-neutral-800/50 border border-neutral-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {link.status === 'linked' && (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                        )}
                                        {link.status === 'broken' && (
                                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                                        )}
                                        {link.status === 'not-linked' && (
                                          <AlertCircle className="w-3.5 h-3.5 text-neutral-500" />
                                        )}
                                        <span className="text-sm font-mono">{link.to}</span>
                                        <span className="text-xs text-neutral-500">
                                          ({link.toRepo})
                                        </span>
                                      </div>

                                      <div className="flex gap-2">
                                        {link.status === 'not-linked' && (
                                          <button
                                            onClick={() => handleLink(link)}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                                          >
                                            <Link2 className="w-3 h-3" />
                                            Link
                                          </button>
                                        )}
                                        {link.status === 'linked' && (
                                          <button
                                            onClick={() => handleUnlink(link)}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs transition-colors"
                                          >
                                            <Unlink className="w-3 h-3" />
                                            Unlink
                                          </button>
                                        )}
                                        {link.status === 'broken' && (
                                          <button
                                            onClick={() => handleLink(link)}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs transition-colors"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                            Fix
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
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
                                      {link.status === 'linked' && (
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                      )}
                                      {link.status === 'broken' && (
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                      )}
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
          </>
        )}
      </div>

      {/* Command Output Overlay */}
      {showOutput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm">Command Output</h4>
              </div>
            </div>
            <div className="p-4 bg-neutral-950 font-mono text-sm max-h-96 overflow-y-auto">
              {commandOutput.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.startsWith('$')
                      ? 'text-blue-400 mt-2'
                      : line.startsWith('✓')
                      ? 'text-green-400'
                      : 'text-neutral-300'
                  }
                >
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}