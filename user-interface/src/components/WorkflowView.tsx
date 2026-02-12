import { useState } from 'react';
import { WorkflowTemplate } from '../services/workflowService';
import { Save, GitBranch, Link as LinkIcon, Calendar } from 'lucide-react';

interface WorkflowViewProps {
  workflow: WorkflowTemplate;
  onSave: (workflowId: string, name: string, description: string) => void;
}

export function WorkflowView({ workflow, onSave }: WorkflowViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);

  const handleSave = () => {
    if (name.trim()) {
      onSave(workflow.id, name.trim(), description.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setName(workflow.name);
    setDescription(workflow.description);
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-neutral-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl bg-neutral-800 border border-neutral-700 rounded px-3 py-1 w-full max-w-xl focus:outline-none focus:border-blue-500"
                placeholder="Workflow Name"
                autoFocus
              />
            ) : (
              <h1 className="text-2xl">{workflow.name}</h1>
            )}
            
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 text-sm text-neutral-400 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 w-full max-w-xl resize-none focus:outline-none focus:border-blue-500"
                rows={2}
                placeholder="Workflow description"
              />
            ) : (
              <p className="text-sm text-neutral-400 mt-1">{workflow.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {new Date(workflow.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {workflow.repositories.length} repositories
              </span>
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5" />
                {workflow.links.length} package links
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl space-y-8">
          {/* Repositories Section */}
          <div>
            <h2 className="text-lg mb-4">Repositories</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left px-4 py-3 text-sm text-neutral-400">Owner</th>
                    <th className="text-left px-4 py-3 text-sm text-neutral-400">Repository</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.repositories.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-neutral-500">
                        No repositories in this workflow
                      </td>
                    </tr>
                  ) : (
                    workflow.repositories.map((repo, index) => (
                      <tr key={index} className="border-b border-neutral-800 last:border-0">
                        <td className="px-4 py-3 text-sm font-mono text-neutral-300">{repo.owner}</td>
                        <td className="px-4 py-3 text-sm font-mono">{repo.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Package Links Section */}
          <div>
            <h2 className="text-lg mb-4">Package Links</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left px-4 py-3 text-sm text-neutral-400">Consumer</th>
                    <th className="text-left px-4 py-3 text-sm text-neutral-400">Package</th>
                    <th className="text-left px-4 py-3 text-sm text-neutral-400">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.links.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                        No package links in this workflow
                      </td>
                    </tr>
                  ) : (
                    workflow.links.map((link, index) => (
                      <tr key={index} className="border-b border-neutral-800 last:border-0">
                        <td className="px-4 py-3 text-sm font-mono text-neutral-300">
                          {link.fromRepo}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-blue-400">
                          {link.from} → {link.to}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-neutral-300">
                          {link.toRepo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}