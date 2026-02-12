// Shared types for the service layer
export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

export interface Repository {
  name: string;
  owner: string;
  branch: string;
  status: 'clean' | 'modified' | 'ahead' | 'behind' | 'diverged';
  lastCommit?: string;
  uncommittedChanges?: number;
  url?: string;
}

export interface PullRequest {
  id: string;
  title: string;
  repository: string;
  author: string;
  status: 'open' | 'merged' | 'closed';
  branch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  description?: string;
  reviewers?: string[];
  labels?: string[];
}

export interface ActivityEvent {
  id: string;
  type: 'commit' | 'pull_request' | 'sync' | 'link' | 'build' | 'error';
  repository: string;
  message: string;
  timestamp: string;
  details?: string;
  user?: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  monorepoType?: 'nx' | 'lerna' | 'turborepo';
  buildCommand?: string;
  isPublishable: boolean;
  dependencies: string[];
  devDependencies: string[];
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
  from: string;
  to: string;
  fromRepo: string;
  toRepo: string;
  status: 'linked' | 'broken' | 'not-linked';
  symlinkPath?: string;
}

export interface WorkspaceData {
  repositories: Repository[];
  pullRequests: PullRequest[];
  activities: ActivityEvent[];
  packageRepositories: RepositoryWithPackages[];
  packageLinks: PackageLink[];
}

export interface CommitOptions {
  repoFullNames: string[];
  message: string;
}

export interface GitCommandOptions {
  repoFullNames: string[];
  command: string;
  args?: string[];
}

export interface LinkPackageOptions {
  from: string;
  to: string;
  fromRepo: string;
  toRepo: string;
}

export interface ImportRepositoryOptions {
  packageName: string;
  repoFullName: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  repositories: Array<{ owner: string; name: string }>;
  links: PackageLink[];
  taskFavorites?: string[]; // Task IDs that are favorited
  createdAt: string;
}