import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorkspaceView } from './components/WorkspaceView';
import { WorkflowView } from './components/WorkflowView';
import { CreateWorkspaceDialog } from './components/CreateWorkspaceDialog';
import { ImportDialog } from './components/ImportDialog';
import { getWorkspaces, createWorkspace, applyTemplateToWorkspace, type Workspace } from './services';
import { getWorkflows, createWorkspaceFromTemplate, editWorkflow, deleteWorkflow, type WorkflowTemplate } from './services/workflowService';

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load workspaces and workflows on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [workspaceData, workflowData] = await Promise.all([
          getWorkspaces(),
          getWorkflows(),
        ]);
        setWorkspaces(workspaceData);
        setWorkflows(workflowData);
        if (workspaceData.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(workspaceData[0].id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    setSelectedWorkflowId(''); // Clear workflow selection
  };

  const handleSelectWorkflow = (id: string) => {
    setSelectedWorkflowId(id);
    setSelectedWorkspaceId(''); // Clear workspace selection
  };

  const handleCreateWorkspace = async (name: string, workflowId?: string) => {
    try {
      const newWorkspace = await createWorkspace(name);
      
      // If a workflow template was selected, apply it
      if (workflowId) {
        const templateData = await createWorkspaceFromTemplate(workflowId, name, newWorkspace.path);
        // Apply the template data to the new workspace
        await applyTemplateToWorkspace(newWorkspace.id, templateData.repositories, templateData.links);
        
        // Restore task favorites from the workflow template
        if (templateData.taskFavorites && templateData.taskFavorites.length > 0) {
          localStorage.setItem(`nut-task-favorites-${newWorkspace.id}`, JSON.stringify(templateData.taskFavorites));
        }
      }
      
      setWorkspaces([newWorkspace, ...workspaces]);
      setSelectedWorkspaceId(newWorkspace.id);
      setSelectedWorkflowId(''); // Clear workflow selection
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleImportComplete = (count: number) => {
    // No need to update workspace count - it will be fetched from backend
    setShowImportDialog(false);
  };

  const handleEditWorkflow = async (workflowId: string, newName: string, newDescription: string) => {
    try {
      const updatedWorkflow = await editWorkflow(workflowId, newName, newDescription);
      setWorkflows(workflows.map(w => w.id === workflowId ? updatedWorkflow : w));
    } catch (error) {
      console.error('Failed to edit workflow:', error);
    }
  };

  const handleWorkflowSaved = async (savedWorkflow: WorkflowTemplate) => {
    // Add the newly saved workflow to the state immediately
    setWorkflows(prev => {
      // Check if it already exists to prevent duplicates
      const exists = prev.some(w => w.id === savedWorkflow.id);
      if (exists) {
        return prev;
      }
      return [savedWorkflow, ...prev];
    });
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(workflows.filter(w => w.id !== workflowId));
      // If we're deleting the selected workflow, clear selection
      if (selectedWorkflowId === workflowId) {
        setSelectedWorkflowId('');
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral-950 text-neutral-50 items-center justify-center">
        <div className="text-neutral-400">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-50">
      <Sidebar
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={() => setShowCreateDialog(true)}
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        onSelectWorkflow={handleSelectWorkflow}
        onEditWorkflow={(id) => {
          setSelectedWorkflowId(id);
          setSelectedWorkspaceId('');
        }}
        onDeleteWorkflow={handleDeleteWorkflow}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedWorkspace ? (
          <WorkspaceView
            key={selectedWorkspace.id}
            workspace={selectedWorkspace}
            onImport={() => setShowImportDialog(true)}
            onWorkflowSaved={handleWorkflowSaved}
          />
        ) : selectedWorkflow ? (
          <WorkflowView
            key={selectedWorkflow.id}
            workflow={selectedWorkflow}
            onSave={handleEditWorkflow}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-neutral-400 mb-4">No workspace or workflow selected</p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Create Workspace
              </button>
            </div>
          </div>
        )}
      </main>

      {showCreateDialog && (
        <CreateWorkspaceDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateWorkspace}
          workflows={workflows}
        />
      )}

      {showImportDialog && selectedWorkspace && (
        <ImportDialog
          workspace={selectedWorkspace}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportComplete}
        />
      )}
    </div>
  );
}