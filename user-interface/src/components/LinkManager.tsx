import { useState } from 'react';
import { RepositoryWithPackages, PackageLink, PackageManager } from './PackagesPanel';
import {
  Link2,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Terminal,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ExternalDependencies } from './ExternalDependencies';

interface LinkManagerProps {
  packages: RepositoryWithPackages[];
  links: PackageLink[];
  onLink: (link: PackageLink) => void;
  onUnlink: (link: PackageLink) => void;
}

export function LinkManager({ packages, links, onLink, onUnlink }: LinkManagerProps) {
  const [view, setView] = useState<'workspace' | 'external'>('workspace');
  const [filter, setFilter] = useState<'all' | 'linked' | 'broken' | 'not-linked'>('all');
  const [showOutput, setShowOutput] = useState(false);
  const [commandOutput, setCommandOutput] = useState<string[]>([]);

  const filteredLinks =
    filter === 'all' ? links : links.filter((l) => l.status === filter);

  const getPackageManager = (repoName: string): PackageManager => {
    const repo = packages.find((p) => p.name === repoName);
    if (!repo || repo.packages.length === 0) return 'npm';
    return repo.packages[0].packageManager;
  };

  const getLinkCommand = (link: PackageLink, action: 'link' | 'unlink') => {
    const pm = getPackageManager(link.fromRepo);
    const targetPkg = packages.find((p) => p.name === link.toRepo);
    const targetSubPkg = targetPkg?.packages?.find((sp) => sp.name === link.to);
    const targetPath = targetSubPkg ? `${link.toRepo}/${targetSubPkg.path}` : link.toRepo;

    if (action === 'link') {
      switch (pm) {
        case 'npm':
          return `cd ${link.fromRepo} && npm link ../${targetPath}`;
        case 'pnpm':
          return `cd ${link.fromRepo} && pnpm link ../${targetPath}`;
        case 'yarn':
          return `cd ${link.fromRepo} && yarn link ../${targetPath}`;
        case 'bun':
          return `cd ${link.fromRepo} && bun link ../${targetPath}`;
      }
    } else {
      switch (pm) {
        case 'npm':
          return `cd ${link.fromRepo} && npm unlink ${link.to}`;
        case 'pnpm':
          return `cd ${link.fromRepo} && pnpm unlink ${link.to}`;
        case 'yarn':
          return `cd ${link.fromRepo} && yarn unlink ${link.to}`;
        case 'bun':
          return `cd ${link.fromRepo} && bun unlink ${link.to}`;
      }
    }
  };

  const handleLink = (link: PackageLink) => {
    const command = getLinkCommand(link, 'link');
    setCommandOutput([
      `$ ${command}`,
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
    const command = getLinkCommand(link, 'unlink');
    setCommandOutput([
      `$ ${command}`,
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
      commands.push(`$ ${getLinkCommand(link, 'link')}`);
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
      notLinked.forEach(onLink);
      setTimeout(() => setShowOutput(false), 3000);
    }, 1500);
  };

  const handleFixBroken = () => {
    const broken = links.filter((l) => l.status === 'broken');
    const commands: string[] = [];
    broken.forEach((link) => {
      commands.push(`$ ${getLinkCommand(link, 'unlink')}`);
      commands.push(`$ ${getLinkCommand(link, 'link')}`);
      commands.push(`✓ Fixed ${link.to} in ${link.fromRepo}`);
      commands.push('');
    });
    setCommandOutput([
      `Fixing ${broken.length} broken links...`,
      '',
      ...commands,
      `✓ Successfully fixed ${broken.length} broken links`,
    ]);
    setShowOutput(true);
    setTimeout(() => {
      broken.forEach(onLink);
      setTimeout(() => setShowOutput(false), 3000);
    }, 1500);
  };

  const handleImportRepo = (packageName: string, inferredRepo: string) => {
    setCommandOutput([
      `Importing repository for package: ${packageName}`,
      `$ nut import "${inferredRepo}"`,
      `Cloning ${inferredRepo}...`,
      `✓ Successfully imported ${inferredRepo}`,
      '',
      'Repository added to workspace. Package linking will be available once packages are detected.',
    ]);
    setShowOutput(true);
    setTimeout(() => {
      setShowOutput(false);
    }, 4000);
  };

  const getStatusIcon = (status: PackageLink['status']) => {
    switch (status) {
      case 'linked':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'broken':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'not-linked':
        return <AlertCircle className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: PackageLink['status']) => {
    switch (status) {
      case 'linked':
        return 'border-green-500/20 bg-green-500/5';
      case 'broken':
        return 'border-red-500/20 bg-red-500/5';
      case 'not-linked':
        return 'border-neutral-800 bg-neutral-900';
    }
  };

  const linkedCount = links.filter((l) => l.status === 'linked').length;
  const brokenCount = links.filter((l) => l.status === 'broken').length;
  const notLinkedCount = links.filter((l) => l.status === 'not-linked').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* View Tabs */}
      <div className="border-b border-neutral-800">
        <div className="flex gap-1 px-4">
          <button
            onClick={() => setView('workspace')}
            className={`px-4 py-3 border-b-2 transition-colors text-sm ${
              view === 'workspace'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Workspace Links
          </button>
          <button
            onClick={() => setView('external')}
            className={`px-4 py-3 border-b-2 transition-colors text-sm ${
              view === 'external'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            External Dependencies
          </button>
        </div>
      </div>

      {view === 'external' ? (
        <ExternalDependencies packages={packages} onImportRepo={handleImportRepo} />
      ) : (
        <>
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
                    Fix Broken Links ({brokenCount})
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  All ({links.length})
                </button>
                <button
                  onClick={() => setFilter('linked')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    filter === 'linked'
                      ? 'bg-green-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  Linked ({linkedCount})
                </button>
                <button
                  onClick={() => setFilter('broken')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    filter === 'broken'
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  Broken ({brokenCount})
                </button>
                <button
                  onClick={() => setFilter('not-linked')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    filter === 'not-linked'
                      ? 'bg-neutral-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  Not Linked ({notLinkedCount})
                </button>
              </div>
            </div>

            {brokenCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  {brokenCount} broken {brokenCount === 1 ? 'link' : 'links'} detected. Broken
                  symlinks can cause build failures and runtime errors. Click "Fix Broken Links" to
                  recreate them.
                </p>
              </div>
            )}
          </div>

          {/* Links List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Link2 className="w-16 h-16 text-neutral-700 mb-4" />
                <p className="text-neutral-400 mb-2">
                  No {filter !== 'all' && filter} links found
                </p>
                <p className="text-sm text-neutral-500">
                  {filter === 'all'
                    ? 'No package links detected in this workspace'
                    : 'Try selecting a different filter'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLinks.map((link) => {
                  const pm = getPackageManager(link.fromRepo);

                  return (
                    <div
                      key={`${link.from}-${link.to}`}
                      className={`p-4 border rounded-lg transition-all ${getStatusColor(
                        link.status
                      )}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(link.status)}
                            <h4 className="text-sm uppercase tracking-wide text-neutral-400">
                              {link.status.replace('-', ' ')}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-mono">{link.from}</span>
                            <span className="text-neutral-600">→</span>
                            <span className="font-mono">{link.to}</span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-neutral-500">
                            <span>
                              From: <span className="text-neutral-400">{link.fromRepo}</span>
                            </span>
                            <span>
                              To: <span className="text-neutral-400">{link.toRepo}</span>
                            </span>
                            <span className="px-2 py-0.5 bg-neutral-800 rounded text-xs">
                              {pm}
                            </span>
                          </div>

                          {link.symlinkPath && (
                            <div className="mt-2 p-2 bg-neutral-950 rounded border border-neutral-800">
                              <p className="text-xs text-neutral-500 mb-1">Symlink path:</p>
                              <code className="text-xs text-neutral-400">
                                {link.fromRepo}/{link.symlinkPath}
                              </code>
                            </div>
                          )}

                          {link.status === 'broken' && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-red-400">
                              <AlertTriangle className="w-3 h-3 mt-0.5" />
                              <span>
                                Symlink is broken. The target package may have been moved or removed.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {link.status === 'not-linked' && (
                            <button
                              onClick={() => handleLink(link)}
                              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm"
                            >
                              <Link2 className="w-4 h-4" />
                              Link
                            </button>
                          )}
                          {link.status === 'linked' && (
                            <button
                              onClick={() => handleUnlink(link)}
                              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm"
                            >
                              <Unlink className="w-4 h-4" />
                              Unlink
                            </button>
                          )}
                          {link.status === 'broken' && (
                            <button
                              onClick={() => handleLink(link)}
                              className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-sm"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Fix
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

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