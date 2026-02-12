/**
 * Tauri Repository Service
 * 
 * Real repository operations using Tauri backend
 */

import { commands } from '../bindings/types';
import { Repository } from './types';

/**
 * List repositories in a workspace
 */
export async function listWorkspaceRepositories(workspaceId: string): Promise<Repository[]> {
  const result = await commands.listWorkspaceRepositories(workspaceId);
  
  if (result.status === 'ok') {
    return result.data.map(repo => ({
      name: repo.name,
      owner: repo.owner,
      branch: repo.branch,
      status: repo.has_changes ? 'modified' : 'clean',
      url: `https://github.com/${repo.owner}/${repo.name}`,
    }));
  } else {
    throw new Error(result.error || 'Failed to list repositories');
  }
}
