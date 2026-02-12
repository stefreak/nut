import { useState, useEffect } from 'react';
import { UnifiedPackageLinkView } from './UnifiedPackageLinkView';
import { Package, AlertTriangle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { getRepositoryData, normalizePackageName } from '../data/packageRegistry';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type MonorepoType = 'nx' | 'lerna' | 'turborepo';

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  packageManager: PackageManager;
  monorepoType?: MonorepoType;
  buildCommand?: string;
  isPublishable: boolean;
  dependencies: string[];
  devDependencies: string[];
  // Detection metadata
  packageJsonPath: string;
  nxConfig?: {
    rootNxJsonPath?: string;
    packageNxJsonPath?: string;
  };
  pnpmWorkspace?: {
    workspaceYamlPath?: string;
    workspacePackages?: string[];
  };
}

export interface RepositoryWithPackages {
  name: string;
  owner: string;
  packages: PackageInfo[];
}

export interface PackageLink {
  from: string; // package name that depends on
  to: string; // package name being linked
  fromRepo: string;
  toRepo: string;
  status: 'linked' | 'broken' | 'not-linked';
  symlinkPath?: string;
}

interface PackagesPanelProps {
  repositories?: RepositoryWithPackages[];
  packageLinks?: PackageLink[];
  onImport?: (packageName: string, repoFullName: string) => void;
  onUpdateLinks?: (links: PackageLink[]) => void;
}

export function PackagesPanel({ 
  repositories: initialRepositories,
  packageLinks: initialPackageLinks,
  onImport,
  onUpdateLinks 
}: PackagesPanelProps = {}) {
  const [repositories, setRepositories] = useState<RepositoryWithPackages[]>(initialRepositories || []);
  const [links, setLinks] = useState<PackageLink[]>(initialPackageLinks || []);

  // Update local state when props change (workspace switch)
  useEffect(() => {
    if (initialRepositories) {
      setRepositories(initialRepositories);
    }
  }, [initialRepositories]);

  useEffect(() => {
    if (initialPackageLinks) {
      setLinks(initialPackageLinks);
    }
  }, [initialPackageLinks]);

  const handleLinkPackage = (link: PackageLink) => {
    const updatedLinks = links.map((l) =>
      l.from === link.from && l.to === link.to
        ? { ...l, status: 'linked' as const, symlinkPath: `node_modules/${link.to}` }
        : l
    );
    setLinks(updatedLinks);
    
    // Call onUpdateLinks with the updated links
    if (onUpdateLinks) {
      onUpdateLinks(updatedLinks);
    }
    
    // 10% chance to break the link after 1 minute
    if (Math.random() < 0.1) {
      setTimeout(() => {
        setLinks((currentLinks) => {
          const brokenLinks = currentLinks.map((l) =>
            l.from === link.from && l.to === link.to && l.status === 'linked'
              ? { ...l, status: 'broken' as const }
              : l
          );
          if (onUpdateLinks) {
            onUpdateLinks(brokenLinks);
          }
          return brokenLinks;
        });
      }, 60000); // 1 minute
    }
  };

  const handleLinkMultiple = (linksToLink: PackageLink[]) => {
    // Batch update all links at once to avoid stale state issues
    setLinks((currentLinks) => {
      const linkSet = new Set(linksToLink.map(l => `${l.from}-${l.to}`));
      const updatedLinks = currentLinks.map((l) => {
        const key = `${l.from}-${l.to}`;
        if (linkSet.has(key)) {
          return { ...l, status: 'linked' as const, symlinkPath: `node_modules/${l.to}` };
        }
        return l;
      });
      
      // Call onUpdateLinks with the updated links
      if (onUpdateLinks) {
        onUpdateLinks(updatedLinks);
      }
      
      return updatedLinks;
    });
  };

  const handleUnlinkPackage = (link: PackageLink) => {
    const updatedLinks = links.map((l) =>
      l.from === link.from && l.to === link.to
        ? { ...l, status: 'not-linked' as const, symlinkPath: undefined }
        : l
    );
    setLinks(updatedLinks);
    
    // Call onUpdateLinks with the updated links
    if (onUpdateLinks) {
      onUpdateLinks(updatedLinks);
    }
  };

  const handleImportRepo = async (packageName: string, inferredRepo: string) => {
    // Check if repo already exists
    if (repositories.find((r) => r.name === inferredRepo)) {
      return;
    }

    // Try to get repository data from central registry
    let newRepo = getRepositoryData(inferredRepo);
    
    // If not found in registry, create basic structure
    if (!newRepo) {
      const [owner, repoName] = inferredRepo.split('/');
      newRepo = {
        name: inferredRepo,
        owner: owner,
        packages: [
          {
            name: packageName,
            version: '1.0.0',
            path: '.',
            packageManager: 'npm',
            isPublishable: true,
            dependencies: [],
            devDependencies: [],
            packageJsonPath: 'package.json',
          },
        ],
      };
    }

    // Add the new repository
    setRepositories((prev) => [...prev, newRepo!]);

    // Create new links for packages that depend on this imported package
    // Need to check against normalized package names
    const normalizedPackageName = normalizePackageName(packageName);
    const newLinks: PackageLink[] = [];
    
    repositories.forEach((repo) => {
      repo.packages.forEach((pkg) => {
        // Check if any dependency matches this package (with or without version)
        const hasDependency = pkg.dependencies.some(dep => {
          const normalizedDep = normalizePackageName(dep);
          return normalizedDep === normalizedPackageName;
        });
        
        if (hasDependency) {
          newLinks.push({
            from: pkg.name,
            to: normalizedPackageName,
            fromRepo: repo.name,
            toRepo: inferredRepo,
            status: 'not-linked',
          });
        }
      });
    });

    if (newLinks.length > 0) {
      setLinks((prev) => [...prev, ...newLinks]);
      
      // Call onUpdateLinks with the updated links
      if (onUpdateLinks) {
        onUpdateLinks([...links, ...newLinks]);
      }
    }

    // Call the onImport callback if provided
    if (onImport) {
      onImport(packageName, inferredRepo);
    }
  };

  const linkedCount = links.filter((l) => l.status === 'linked').length;
  const brokenCount = links.filter((l) => l.status === 'broken').length;
  const monorepoCount = repositories.reduce(
    (sum, repo) => sum + repo.packages.filter((p) => p.monorepoType).length,
    0
  );
  const totalSubPackages = repositories.reduce(
    (sum, repo) => sum + repo.packages.length,
    0
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="mb-2">Package Management</h3>
            <p className="text-sm text-neutral-500">
              Link packages and import external dependencies
            </p>
          </div>
          {brokenCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                {brokenCount} broken {brokenCount === 1 ? 'link' : 'links'}
              </span>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-neutral-500">Repositories</span>
            </div>
            <p className="text-xl">{repositories.length}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-neutral-500">Linked</span>
            </div>
            <p className="text-xl">{linkedCount}</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-neutral-500">Total Packages</span>
            </div>
            <p className="text-xl">{totalSubPackages}</p>
          </div>
        </div>
      </div>

      {/* Content - Unified View */}
      <UnifiedPackageLinkView
        packages={repositories}
        links={links}
        onLink={handleLinkPackage}
        onLinkMultiple={handleLinkMultiple}
        onUnlink={handleUnlinkPackage}
        onImportRepo={handleImportRepo}
      />
    </div>
  );
}