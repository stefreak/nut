import { commands, WorkspaceInfo, CreateWorkspaceRequest } from '../bindings/types';
import { Workspace } from './types';

/**
 * Tauri Workspace Service
 * 
 * Integrates with the Tauri backend commands for workspace operations.
 * Maps between Tauri's WorkspaceInfo and the UI's Workspace type.
 */

/**
 * Map Tauri's WorkspaceInfo to UI's Workspace type
 */
function mapWorkspaceInfo(info: WorkspaceInfo): Workspace {
  return {
    id: info.id,
    name: info.description, // Use description as the workspace name in the UI
    path: info.path,
    createdAt: info.created_at,
  };
}

/**
 * Get all workspaces from the Tauri backend
 * 
 * @returns Promise<Workspace[]> List of workspaces sorted by creation date (newest first)
 * @throws Error if the backend call fails
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  const result = await commands.listWorkspaces();
  
  if (result.status === 'error') {
    throw new Error(`Failed to list workspaces: ${result.error}`);
  }
  
  // Map WorkspaceInfo to Workspace and sort by creation date (newest first)
  const workspaces = result.data.map(mapWorkspaceInfo);
  workspaces.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return workspaces;
}

/**
 * Create a new workspace via the Tauri backend
 * 
 * @param description The description/name for the new workspace
 * @returns Promise<Workspace> The newly created workspace
 * @throws Error if the backend call fails or validation fails
 */
export async function createWorkspace(description: string): Promise<Workspace> {
  // Validate description
  const trimmedDescription = description.trim();
  if (!trimmedDescription) {
    throw new Error('Workspace description cannot be empty');
  }
  
  const request: CreateWorkspaceRequest = {
    description: trimmedDescription,
  };
  
  const result = await commands.createWorkspace(request);
  
  if (result.status === 'error') {
    throw new Error(`Failed to create workspace: ${result.error}`);
  }
  
  return mapWorkspaceInfo(result.data);
}
