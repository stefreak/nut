import { RepositoryWithPackages } from '../components/PackagesPanel';

// Central registry of all packages and their GitHub repositories
// This ensures consistent, realistic data across the entire application

interface PackageRegistryEntry {
  packageName: string;
  githubRepo: string;
  version: string;
  description?: string;
}

// Registry of known npm packages and their real GitHub repos
export const PACKAGE_REGISTRY: Record<string, PackageRegistryEntry> = {
  // React ecosystem
  'react': {
    packageName: 'react',
    githubRepo: 'facebook/react',
    version: '18.2.0',
    description: 'A JavaScript library for building user interfaces',
  },
  'react-dom': {
    packageName: 'react-dom',
    githubRepo: 'facebook/react',
    version: '18.2.0',
    description: 'React package for working with the DOM',
  },
  '@types/react': {
    packageName: '@types/react',
    githubRepo: 'DefinitelyTyped/DefinitelyTyped',
    version: '18.2.0',
    description: 'TypeScript definitions for React',
  },
  
  // Build tools
  'vite': {
    packageName: 'vite',
    githubRepo: 'vitejs/vite',
    version: '5.0.10',
    description: 'Next generation frontend tooling',
  },
  'typescript': {
    packageName: 'typescript',
    githubRepo: 'microsoft/TypeScript',
    version: '5.3.3',
    description: 'TypeScript is a superset of JavaScript',
  },
  
  // Backend
  'express': {
    packageName: 'express',
    githubRepo: 'expressjs/express',
    version: '4.18.2',
    description: 'Fast, unopinionated, minimalist web framework',
  },
  '@types/express': {
    packageName: '@types/express',
    githubRepo: 'DefinitelyTyped/DefinitelyTyped',
    version: '4.17.21',
    description: 'TypeScript definitions for Express',
  },
  'prisma': {
    packageName: 'prisma',
    githubRepo: 'prisma/prisma',
    version: '5.7.1',
    description: 'Next-generation ORM for Node.js and TypeScript',
  },
  
  // Utilities
  'axios': {
    packageName: 'axios',
    githubRepo: 'axios/axios',
    version: '1.6.2',
    description: 'Promise based HTTP client',
  },
  'zod': {
    packageName: 'zod',
    githubRepo: 'colinhacks/zod',
    version: '3.22.4',
    description: 'TypeScript-first schema validation',
  },
  'clsx': {
    packageName: 'clsx',
    githubRepo: 'lukeed/clsx',
    version: '2.0.0',
    description: 'Tiny utility for constructing className strings',
  },
  'zustand': {
    packageName: 'zustand',
    githubRepo: 'pmndrs/zustand',
    version: '4.4.7',
    description: 'Bear necessities for state management in React',
  },
  'date-fns': {
    packageName: 'date-fns',
    githubRepo: 'date-fns/date-fns',
    version: '2.30.0',
    description: 'Modern JavaScript date utility library',
  },
  'lodash': {
    packageName: 'lodash',
    githubRepo: 'lodash/lodash',
    version: '4.17.21',
    description: 'A modern JavaScript utility library',
  },
};

// Infer GitHub repo from package name using our registry
export function inferGitHubRepo(packageName: string): string {
  // Remove version if present (e.g., "react@18.2.0" -> "react")
  const cleanName = packageName.split('@').filter(part => !part.match(/^\d/)).join('@');
  
  // First, check if this package is part of a known ACME repository
  const acmeRepo = findRepoForPackage(cleanName);
  if (acmeRepo) {
    return acmeRepo;
  }
  
  // Check if it's in our registry
  if (PACKAGE_REGISTRY[cleanName]) {
    return PACKAGE_REGISTRY[cleanName].githubRepo;
  }
  
  // For scoped packages like @acme/something, use the scope as owner
  if (cleanName.startsWith('@')) {
    const [scope, name] = cleanName.substring(1).split('/');
    return `${scope}/${name}`;
  }
  
  // Fallback: create a plausible repo name
  return `${cleanName}/${cleanName}`;
}

// Get package version from registry or extract from package string
export function getPackageVersion(packageName: string): string {
  // If version is in the name like "react@18.2.0"
  const versionMatch = packageName.match(/@([\d.]+)$/);
  if (versionMatch) {
    return versionMatch[1];
  }
  
  // Remove version if present for lookup
  const cleanName = packageName.split('@').filter(part => !part.match(/^\d/)).join('@');
  
  // Look up in registry
  if (PACKAGE_REGISTRY[cleanName]) {
    return PACKAGE_REGISTRY[cleanName].version;
  }
  
  return '1.0.0';
}

// Complete repository data for acme/* repositories
export const ACME_REPOSITORIES: Record<string, RepositoryWithPackages> = {
  'acme/react-frontend': {
    name: 'acme/react-frontend',
    owner: 'acme',
    packages: [
      {
        name: '@acme/web-app',
        version: '3.2.0',
        path: '.',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build web-app',
        isPublishable: false,
        dependencies: [
          'react@18.2.0',
          'react-dom@18.2.0',
          'vite@5.0.10',
          'zustand@4.4.7',
          '@acme/design-system-button@2.1.0',
          '@acme/design-system-input@2.1.0',
          '@acme/design-system-card@2.1.0',
          '@acme/great-service-client@1.5.0',
        ],
        devDependencies: [
          '@types/react@18.2.0',
          'typescript@5.3.3',
        ],
        packageJsonPath: 'package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['apps/*', 'packages/*'],
        },
      },
    ],
  },
  
  'acme/design-system': {
    name: 'acme/design-system',
    owner: 'acme',
    packages: [
      {
        name: '@acme/design-system-button',
        version: '2.1.0',
        path: 'packages/button',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build button',
        isPublishable: true,
        dependencies: [
          'react@18.2.0',
          'clsx@2.0.0',
        ],
        devDependencies: [
          '@types/react@18.2.0',
          'typescript@5.3.3',
        ],
        packageJsonPath: 'packages/button/package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'packages/button/project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['packages/*'],
        },
      },
      {
        name: '@acme/design-system-input',
        version: '2.1.0',
        path: 'packages/input',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build input',
        isPublishable: true,
        dependencies: [
          'react@18.2.0',
          'clsx@2.0.0',
        ],
        devDependencies: [
          '@types/react@18.2.0',
          'typescript@5.3.3',
        ],
        packageJsonPath: 'packages/input/package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'packages/input/project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['packages/*'],
        },
      },
      {
        name: '@acme/design-system-card',
        version: '2.1.0',
        path: 'packages/card',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build card',
        isPublishable: true,
        dependencies: [
          'react@18.2.0',
          'clsx@2.0.0',
        ],
        devDependencies: [
          '@types/react@18.2.0',
          'typescript@5.3.3',
        ],
        packageJsonPath: 'packages/card/package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'packages/card/project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['packages/*'],
        },
      },
      {
        name: '@acme/design-system-modal',
        version: '2.1.0',
        path: 'packages/modal',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build modal',
        isPublishable: true,
        dependencies: [
          'react@18.2.0',
          'clsx@2.0.0',
        ],
        devDependencies: [
          '@types/react@18.2.0',
          'typescript@5.3.3',
        ],
        packageJsonPath: 'packages/modal/package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'packages/modal/project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['packages/*'],
        },
      },
    ],
  },
  
  'acme/backend': {
    name: 'acme/backend',
    owner: 'acme',
    packages: [
      {
        name: '@acme/great-service-client',
        version: '1.5.0',
        path: 'packages/great-service-client',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build great-service-client',
        isPublishable: true,
        dependencies: [
          'axios@1.6.2',
          'zod@3.22.4',
        ],
        devDependencies: [
          'typescript@5.3.3',
        ],
        packageJsonPath: 'packages/great-service-client/package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'packages/great-service-client/project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['packages/*', 'apps/*'],
        },
      },
      {
        name: '@acme/api-server',
        version: '1.5.0',
        path: 'apps/api',
        packageManager: 'pnpm',
        monorepoType: 'nx',
        buildCommand: 'nx build api',
        isPublishable: false,
        dependencies: [
          'express@4.18.2',
          'prisma@5.7.1',
          '@acme/great-service-client@1.5.0',
        ],
        devDependencies: [
          '@types/express@4.17.21',
          'typescript@5.3.3',
        ],
        packageJsonPath: 'apps/api/package.json',
        nxConfig: {
          rootNxJsonPath: 'nx.json',
          packageNxJsonPath: 'apps/api/project.json',
        },
        pnpmWorkspace: {
          workspaceYamlPath: 'pnpm-workspace.yaml',
          workspacePackages: ['packages/*', 'apps/*'],
        },
      },
    ],
  },
};

// Get repository data by full name
export function getRepositoryData(repoFullName: string): RepositoryWithPackages | null {
  // Check ACME repositories first
  if (ACME_REPOSITORIES[repoFullName]) {
    return ACME_REPOSITORIES[repoFullName];
  }
  
  // For external packages (like facebook/react), create repository data on the fly
  // Find the package in our registry by repo name
  const registryEntry = Object.values(PACKAGE_REGISTRY).find(
    entry => entry.githubRepo === repoFullName
  );
  
  if (registryEntry) {
    return {
      name: repoFullName,
      owner: repoFullName.split('/')[0],
      packages: [
        {
          name: registryEntry.packageName,
          version: registryEntry.version,
          path: '.',
          packageManager: 'npm',
          buildCommand: 'npm run build',
          isPublishable: true,
          dependencies: [],
          devDependencies: [],
          packageJsonPath: 'package.json',
        },
      ],
    };
  }
  
  return null;
}

// Check if a package is part of a known ACME repository
export function findRepoForPackage(packageName: string): string | null {
  // Remove version if present
  const cleanName = packageName.split('@').filter(part => !part.match(/^\d/)).join('@');
  
  for (const [repoName, repoData] of Object.entries(ACME_REPOSITORIES)) {
    const hasPackage = repoData.packages.some(pkg => pkg.name === cleanName);
    if (hasPackage) {
      return repoName;
    }
  }
  return null;
}

// Helper to normalize package names (remove version)
export function normalizePackageName(packageName: string): string {
  return packageName.split('@').filter(part => !part.match(/^\d/)).join('@');
}