import { WorkflowTemplate } from './types';
import { PackageLink } from './types';

/**
 * Workflow Service Layer
 * 
 * To integrate with Tauri:
 * Replace the implementation of each function with:
 * return await invoke('command_name', { ...params });
 */

// In-memory storage for demo purposes
let workflows: WorkflowTemplate[] = [];

/**
 * Save current workspace state as a workflow template
 * 
 * Tauri command: invoke('save_workflow', { name, description, repositories, links, taskFavorites })
 */
export async function saveWorkflow(
  name: string,
  description: string,
  repositories: Array<{ owner: string; name: string }>,
  links: PackageLink[],
  taskFavorites?: string[]
): Promise<WorkflowTemplate> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const newWorkflow: WorkflowTemplate = {
    id: Date.now().toString(),
    name,
    description,
    repositories,
    links: links.map(link => ({
      ...link,
      status: 'not-linked' as const, // Reset status for template
    })),
    taskFavorites,
    createdAt: new Date().toISOString(),
  };
  
  workflows.push(newWorkflow);
  return newWorkflow;
}

/**
 * Get all saved workflow templates
 * 
 * Tauri command: invoke('get_workflows')
 */
export async function getWorkflows(): Promise<WorkflowTemplate[]> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 50));
  return workflows;
}

/**
 * Delete a workflow template
 * 
 * Tauri command: invoke('delete_workflow', { workflowId })
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  workflows = workflows.filter(w => w.id !== workflowId);
}

/**
 * Edit a workflow template
 * 
 * Tauri command: invoke('edit_workflow', { workflowId, name, description })
 */
export async function editWorkflow(
  workflowId: string,
  name: string,
  description: string
): Promise<WorkflowTemplate> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) {
    throw new Error('Workflow template not found');
  }
  
  workflow.name = name;
  workflow.description = description;
  
  return workflow;
}

/**
 * Create a workspace from a workflow template
 * 
 * Tauri command: invoke('create_workspace_from_template', { workflowId, name, path })\n */
export async function createWorkspaceFromTemplate(
  workflowId: string,
  name: string,
  path: string
): Promise<{ repositories: Array<{ owner: string; name: string }>; links: PackageLink[]; taskFavorites?: string[] }> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const workflow = workflows.find(w => w.id === workflowId);
  
  if (!workflow) {
    throw new Error('Workflow template not found');
  }
  
  return {
    repositories: workflow.repositories,
    links: workflow.links,
    taskFavorites: workflow.taskFavorites,
  };
}