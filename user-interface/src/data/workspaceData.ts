import { Workspace, WorkspaceData } from '../services/types';
import { ACME_REPOSITORIES } from './packageRegistry';

/**
 * Dummy workspace data for development
 * In production Tauri app, this data will come from the backend
 */

export function getWorkspaces(): Workspace[] {
  return [
    {
      id: '01KBA98F91YBRNH3ARWJJSSA9E',
      name: 'Change XYZ',
      path: '/Users/dev/workspaces/change-xyz',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '01KBA9XAMPLE1234567890ABC',
      name: 'Update Dependencies',
      path: '/Users/dev/workspaces/update-deps',
      createdAt: '2024-01-14T09:15:00Z',
    },
  ];
}

export function getWorkspaceData(workspaceId: string): WorkspaceData {
  if (workspaceId === '01KBA98F91YBRNH3ARWJJSSA9E') {
    // Change XYZ workspace - start with just acme/react-frontend
    const reactFrontendData = ACME_REPOSITORIES['acme/react-frontend'];
    
    return {
      repositories: [
        {
          name: 'react-frontend',
          owner: 'acme',
          branch: 'change-xyz',
          status: 'clean',
        },
      ],
      pullRequests: [],
      packageRepositories: reactFrontendData ? [reactFrontendData] : [],
      packageLinks: [],
      activities: [
        {
          id: '1',
          type: 'commit',
          repository: 'acme/react-frontend',
          message: 'feat: Add user authentication flow with new login form',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: 'Implements frontend UI for authentication using design system components',
        },
      ],
    };
  }

  // Update dependencies workspace
  if (workspaceId === '01KBA9XAMPLE1234567890ABC') {
    return {
      repositories: [
        {
          name: 'api-server',
          owner: 'myorg',
          branch: 'update-deps',
          status: 'modified',
        },
        {
          name: 'web-client',
          owner: 'myorg',
          branch: 'update-deps',
          status: 'modified',
        },
        {
          name: 'shared-types',
          owner: 'myorg',
          branch: 'update-deps',
          status: 'clean',
        },
      ],
      pullRequests: [
        {
          id: '145',
          title: 'Update all dependencies to latest',
          repository: 'myorg/api-server',
          author: 'developer1',
          status: 'open',
          branch: 'update-deps',
          baseBranch: 'main',
          createdAt: '2024-01-14T09:15:00Z',
          updatedAt: '2024-01-14T12:30:00Z',
          url: 'https://github.com/myorg/api-server/pull/145',
        },
        {
          id: '89',
          title: 'Dependency updates',
          repository: 'myorg/shared-types',
          author: 'developer2',
          status: 'merged',
          branch: 'update-deps',
          baseBranch: 'main',
          createdAt: '2024-01-13T14:20:00Z',
          updatedAt: '2024-01-13T16:45:00Z',
          url: 'https://github.com/myorg/shared-types/pull/89',
        },
      ],
      packageRepositories: [
        {
          name: 'myorg/api-server',
          owner: 'myorg',
          packages: [
            {
              name: '@myorg/api',
              version: '2.1.0',
              path: '.',
              packageManager: 'npm',
              isPublishable: false,
              dependencies: ['@myorg/shared-types', 'express', 'cors'],
              devDependencies: ['typescript', '@types/node', '@types/express'],
              packageJsonPath: 'package.json',
            },
          ],
        },
        {
          name: 'myorg/web-client',
          owner: 'myorg',
          packages: [
            {
              name: '@myorg/web-client',
              version: '1.5.2',
              path: '.',
              packageManager: 'npm',
              isPublishable: false,
              dependencies: ['@myorg/shared-types', 'react', 'react-dom'],
              devDependencies: ['typescript', 'vite', '@types/react'],
              packageJsonPath: 'package.json',
            },
          ],
        },
        {
          name: 'myorg/shared-types',
          owner: 'myorg',
          packages: [
            {
              name: '@myorg/shared-types',
              version: '1.2.0',
              path: '.',
              packageManager: 'npm',
              isPublishable: true,
              dependencies: [],
              devDependencies: ['typescript'],
              packageJsonPath: 'package.json',
            },
          ],
        },
      ],
      packageLinks: [
        {
          from: '@myorg/api',
          to: '@myorg/shared-types',
          fromRepo: 'myorg/api-server',
          toRepo: 'myorg/shared-types',
          status: 'linked',
          symlinkPath: 'node_modules/@myorg/shared-types',
        },
        {
          from: '@myorg/web-client',
          to: '@myorg/shared-types',
          fromRepo: 'myorg/web-client',
          toRepo: 'myorg/shared-types',
          status: 'linked',
          symlinkPath: 'node_modules/@myorg/shared-types',
        },
      ],
      activities: [
        {
          id: '1',
          type: 'commit',
          repository: 'myorg/api-server',
          message: 'chore: Update express and cors to latest versions',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '2',
          type: 'pull_request',
          repository: 'myorg/shared-types',
          message: 'Merged PR #89: Dependency updates',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
        {
          id: '3',
          type: 'link',
          repository: 'myorg/web-client',
          message: 'Linked package @myorg/shared-types',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
        },
      ],
    };
  }

  // Default empty workspace
  return {
    repositories: [],
    pullRequests: [],
    packageRepositories: [],
    packageLinks: [],
    activities: [],
  };
}
