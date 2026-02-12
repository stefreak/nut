import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface SaveWorkflowDialogProps {
  onSave: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}

export function SaveWorkflowDialog({ onSave, onClose }: SaveWorkflowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      // Don't call onClose here - let the parent handle it after save completes
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg mb-1">Save Workflow</h2>
            <p className="text-sm text-neutral-500">
              Save current repositories and links as a template
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="workflow-name" className="block text-sm mb-2">
                Workflow Name *
              </label>
              <input
                id="workflow-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monorepo Setup"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="workflow-description" className="block text-sm mb-2">
                Description (optional)
              </label>
              <textarea
                id="workflow-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this workflow template..."
                rows={3}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}