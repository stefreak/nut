import { Workspace } from '../services';
import { WorkflowTemplate } from '../services/workflowService';
import { FolderGit2, Plus, Settings, Workflow, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  workspaces: Workspace[];
  selectedWorkspaceId: string | undefined;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  workflows: WorkflowTemplate[];
  selectedWorkflowId: string | undefined;
  onSelectWorkflow: (id: string) => void;
  onEditWorkflow: (workflowId: string) => void;
  onDeleteWorkflow: (workflowId: string) => void;
}

export function Sidebar({
  workspaces,
  selectedWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  workflows,
  selectedWorkflowId,
  onSelectWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
}: SidebarProps) {
  return (
    <div className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="text-2xl">🔩</div>
          <h1 className="text-xl">nut</h1>
        </div>
        <p className="text-sm text-neutral-400">Workspace Manager</p>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Workspaces */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-neutral-400 uppercase tracking-wider">
              Workspaces
            </h2>
            <button
              onClick={onCreateWorkspace}
              className="p-1 hover:bg-neutral-800 rounded transition-colors"
              title="Create workspace"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => onSelectWorkspace(workspace.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedWorkspaceId === workspace.id
                    ? 'bg-neutral-800 border border-neutral-700'
                    : 'hover:bg-neutral-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <FolderGit2 className="w-5 h-5 mt-0.5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{workspace.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500 font-mono truncate">
                        {workspace.path}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workflows */}
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-neutral-400 uppercase tracking-wider">
              Workflows
            </h2>
          </div>

          <div className="space-y-1">
            {workflows.length === 0 ? (
              <p className="text-xs text-neutral-500 px-3 py-2">No saved workflows</p>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`group relative rounded-lg transition-colors ${
                    selectedWorkflowId === workflow.id
                      ? 'bg-neutral-800 border border-neutral-700'
                      : 'hover:bg-neutral-800/50 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => onSelectWorkflow(workflow.id)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-start gap-3">
                      <Workflow className="w-5 h-5 mt-0.5 text-purple-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{workflow.name}</p>
                        <p className="text-xs text-neutral-500 truncate mt-1">
                          {workflow.description}
                        </p>
                        <p className="text-xs text-neutral-600 mt-1">
                          {workflow.repositories.length} repos · {workflow.links.length} links
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWorkflow(workflow.id);
                      }}
                      className="p-1.5 bg-neutral-900 hover:bg-neutral-700 rounded transition-colors"
                      title="Edit workflow"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWorkflow(workflow.id);
                      }}
                      className="p-1.5 bg-neutral-900 hover:bg-red-900/50 rounded transition-colors"
                      title="Delete workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-800">
        <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-800 rounded-lg transition-colors text-sm text-neutral-400">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
}