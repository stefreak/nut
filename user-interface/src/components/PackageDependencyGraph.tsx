import { RepositoryWithPackages, PackageLink } from './PackagesPanel';
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, GitBranch } from 'lucide-react';

interface PackageDependencyGraphProps {
  packages: RepositoryWithPackages[];
  links: PackageLink[];
}

export function PackageDependencyGraph({ packages, links }: PackageDependencyGraphProps) {
  // Build a flat list of all packages with their repo info
  const allPackages = packages.flatMap((repo) =>
    repo.packages.map((pkg) => ({
      ...pkg,
      repository: repo.name,
    }))
  );

  // Group packages by repository
  const packagesByRepo = packages.reduce((acc, repo) => {
    acc[repo.name] = repo.packages;
    return acc;
  }, {} as Record<string, any[]>);

  const getStatusColor = (status: PackageLink['status']) => {
    switch (status) {
      case 'linked':
        return 'border-green-500 bg-green-500/10';
      case 'broken':
        return 'border-red-500 bg-red-500/10';
      case 'not-linked':
        return 'border-neutral-700 bg-neutral-800';
    }
  };

  const getStatusIcon = (status: PackageLink['status']) => {
    switch (status) {
      case 'linked':
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case 'broken':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'not-linked':
        return <AlertTriangle className="w-3 h-3 text-neutral-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h3 className="mb-2">Dependency Graph</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Visual representation of package dependencies across your workspace
          </p>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-neutral-400">Linked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-neutral-400">Broken Link</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-neutral-600"></div>
              <span className="text-neutral-400">Not Linked</span>
            </div>
          </div>
        </div>

        {/* Repository-based Graph */}
        <div className="space-y-8">
          {Object.entries(packagesByRepo).map(([repoName, pkgs]) => {
            const repoLinks = links.filter(
              (l) => l.fromRepo === repoName || l.toRepo === repoName
            );

            if (pkgs.length === 0) return null;

            return (
              <div key={repoName} className="relative">
                {/* Repository Container */}
                <div className="border-2 border-neutral-700 rounded-lg p-6 bg-neutral-900/50">
                  <div className="flex items-center gap-2 mb-4">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <h4 className="font-mono">{repoName}</h4>
                  </div>

                  {/* Packages in this repo */}
                  <div className="grid grid-cols-3 gap-3">
                    {pkgs.map((pkg) => {
                      const outgoingLinks = links.filter(
                        (l) =>
                          pkg.dependencies.includes(l.to) &&
                          (l.from === pkg.name || l.fromRepo === repoName)
                      );
                      const hasLinks = outgoingLinks.length > 0;

                      return (
                        <div
                          key={pkg.name}
                          className="bg-neutral-900 border border-neutral-800 rounded-lg p-3"
                        >
                          <div className="mb-2">
                            <p className="text-sm font-mono truncate" title={pkg.name}>
                              {pkg.name}
                            </p>
                            <p className="text-xs text-neutral-500">v{pkg.version}</p>
                          </div>

                          {hasLinks && (
                            <div className="mt-2 pt-2 border-t border-neutral-800">
                              <p className="text-xs text-neutral-500 mb-1">Dependencies:</p>
                              <div className="space-y-1">
                                {pkg.dependencies
                                  .filter((dep) =>
                                    allPackages.some((p) => p.name === dep)
                                  )
                                  .slice(0, 3)
                                  .map((dep) => {
                                    const link = links.find(
                                      (l) => l.to === dep && pkg.dependencies.includes(dep)
                                    );
                                    return (
                                      <div
                                        key={dep}
                                        className="flex items-center gap-1.5 text-xs"
                                      >
                                        {link && getStatusIcon(link.status)}
                                        <span className="text-neutral-400 truncate" title={dep}>
                                          {dep}
                                        </span>
                                      </div>
                                    );
                                  })}
                                {pkg.dependencies.filter((dep) =>
                                  allPackages.some((p) => p.name === dep)
                                ).length > 3 && (
                                  <p className="text-xs text-neutral-600">
                                    +
                                    {pkg.dependencies.filter((dep) =>
                                      allPackages.some((p) => p.name === dep)
                                    ).length - 3}{' '}
                                    more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cross-repo dependency links */}
                {repoLinks.filter((l) => l.fromRepo === repoName && l.toRepo !== repoName).length >
                  0 && (
                  <div className="mt-4 ml-6">
                    <p className="text-xs text-neutral-500 mb-2">Cross-repository dependencies:</p>
                    <div className="space-y-2">
                      {repoLinks
                        .filter((l) => l.fromRepo === repoName && l.toRepo !== repoName)
                        .map((link) => (
                          <div
                            key={`${link.from}-${link.to}`}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor(
                              link.status
                            )}`}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {getStatusIcon(link.status)}
                              <span className="font-mono text-sm">{link.from}</span>
                              <ArrowRight className="w-4 h-4 text-neutral-500" />
                              <span className="font-mono text-sm">{link.to}</span>
                            </div>
                            <div className="text-xs text-neutral-500">
                              → {link.toRepo.split('/')[1]}
                            </div>
                            {link.status === 'broken' && link.symlinkPath && (
                              <div className="text-xs text-red-400">
                                Broken: {link.symlinkPath}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>Tip:</strong> The dependency graph shows how packages in your workspace depend on
            each other. Green connections indicate active symlinks, while red connections show broken
            links that need attention.
          </p>
        </div>
      </div>
    </div>
  );
}