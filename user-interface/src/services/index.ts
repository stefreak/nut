/**
 * Service Layer Index
 * 
 * This module provides a clean API for all backend operations.
 * 
 * INTEGRATING WITH TAURI:
 * 
 * 1. Install Tauri API:
 *    npm install @tauri-apps/api
 * 
 * 2. Import invoke:
 *    import { invoke } from '@tauri-apps/api/tauri';
 * 
 * 3. Replace service implementations:
 *    Instead of: return getDummyData();
 *    Use: return await invoke('command_name', { param1, param2 });
 * 
 * 4. Example migration for workspaceService.getWorkspaces():
 *    
 *    Before (dummy):
 *    export async function getWorkspaces(): Promise<Workspace[]> {
 *      await new Promise(resolve => setTimeout(resolve, 50));
 *      return getDummyWorkspaces();
 *    }
 * 
 *    After (Tauri):
 *    export async function getWorkspaces(): Promise<Workspace[]> {
 *      return await invoke('get_workspaces');
 *    }
 * 
 * 5. Error handling with Tauri:
 *    try {
 *      const result = await invoke('command_name', { params });
 *      return result;
 *    } catch (error) {
 *      console.error('Tauri command failed:', error);
 *      throw error;
 *    }
 */

// Export all types
export * from './types';

// Export workspace services
// Using Tauri backend for create and list operations
export {
  getWorkspaces,
  createWorkspace,
} from './tauriWorkspaceService';

// Other workspace operations still using the mock service
export {
  getWorkspaceData,
  deleteWorkspace,
  renameWorkspace,
  applyTemplateToWorkspace,
} from './workspaceService';

// Export repository services
export {
  searchGitHubRepositories,
  importRepository,
  getRepositoryStatus,
  commitRepositories,
  executeGitCommand,
  openInVSCode,
  pullRepositories,
  pushRepositories,
} from './repositoryService';

// Export Tauri repository services
export {
  listWorkspaceRepositories,
} from './tauriRepositoryService';

// Export package services
export {
  detectPackages,
  analyzePackageDependencies,
  linkPackage,
  linkPackagesBatch,
  unlinkPackage,
  checkPackageLinks,
  importPackageRepository,
  buildPackage,
} from './packageService';

// Export pull request services
export {
  getPullRequests,
  createPullRequest,
  mergePullRequest,
  closePullRequest,
} from './pullRequestService';