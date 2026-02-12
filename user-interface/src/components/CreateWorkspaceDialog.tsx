import { useState } from 'react';
import { X, FolderOpen, Workflow, Plus } from 'lucide-react';
import { WorkflowTemplate } from '../services/types';

interface CreateWorkspaceDialogProps {
  onClose: () => void;
  onCreate: (name: string, workflowId?: string) => void;
  workflows: WorkflowTemplate[];
}

export function CreateWorkspaceDialog({
  onClose,
  onCreate,
  workflows,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [workflowId, setWorkflowId] = useState<string | undefined>(undefined);
  const [hoveredWorkflowId, setHoveredWorkflowId] = useState<string | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), workflowId);
    }
  };

  const selectedWorkflow = workflows.find(w => w.id === workflowId);
  const hoveredWorkflow = workflows.find(w => w.id === hoveredWorkflowId);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg mb-1">Create Workspace</h2>
            <p className="text-sm text-neutral-500">
              Set up a new workspace for your repositories
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm text-neutral-400 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project XYZ"
              autoFocus
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-neutral-400 mb-3">
              Workflow Template (optional)
            </label>
            <div className="space-y-2">
              {/* Empty workspace option */}
              <button
                type="button"
                onClick={() => setWorkflowId(undefined)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  workflowId === undefined
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    workflowId === undefined
                      ? 'bg-blue-500/20'
                      : 'bg-neutral-800'
                  }`}>
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm mb-1">Empty Workspace</p>
                    <p className="text-xs text-neutral-500">
                      Start fresh and import repositories manually
                    </p>
                  </div>
                </div>
              </button>

              {/* Workflow templates */}
              {workflows.map((workflow) => (
                <div key={workflow.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setWorkflowId(workflow.id)}
                    onMouseEnter={() => setHoveredWorkflowId(workflow.id)}
                    onMouseLeave={() => setHoveredWorkflowId(undefined)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      workflowId === workflow.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        workflowId === workflow.id
                          ? 'bg-purple-500/20'
                          : 'bg-neutral-800'
                      }`}>
                        <Workflow className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-1">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-xs text-neutral-500 truncate">
                            {workflow.description}
                          </p>
                        )}
                        <p className="text-xs text-neutral-600 mt-1">
                          {workflow.repositories.length} {workflow.repositories.length === 1 ? 'repository' : 'repositories'} • {workflow.links.length} {workflow.links.length === 1 ? 'link' : 'links'}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Hover Tooltip */}
                  {hoveredWorkflowId === workflow.id && (
                    <div className="absolute left-full ml-3 top-0 z-50 w-80 bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl p-4">
                      {/* Repositories */}
                      <div className="mb-4">
                        <p className="text-xs text-neutral-400 mb-2">Repositories ({workflow.repositories.length})</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {workflow.repositories.map((repo, idx) => (
                            <div key={idx} className="text-xs font-mono text-neutral-300 bg-neutral-900 px-2 py-1 rounded">
                              {repo.owner}/{repo.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Links */}
                      {workflow.links.length > 0 && (
                        <div>
                          <p className="text-xs text-neutral-400 mb-2">Links ({workflow.links.length})</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {workflow.links.map((link, idx) => (
                              <div key={idx} className="text-xs bg-neutral-900 px-2 py-1.5 rounded">
                                <div className="font-mono text-neutral-300 mb-0.5">{link.from}</div>
                                <div className="text-neutral-600">→ {link.to}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-lg transition-colors"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}