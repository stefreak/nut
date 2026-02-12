import { useState, useEffect } from 'react';
import { UnifiedRepositoriesView } from './UnifiedRepositoriesView';
import { PullRequestPanel } from './PullRequestPanel';
import { SystemActivityPanel } from './SystemActivityPanel';
import { PackagesPanel, RepositoryWithPackages, PackageLink } from './PackagesPanel';
import { SequencerPanel } from './SequencerPanel';
import { SaveWorkflowDialog } from './SaveWorkflowDialog';
import { TasksPanel } from './TasksPanel';
import { Folder, GitPullRequest, Activity, Package, Download, GitBranch, Workflow, Save, ListTodo } from 'lucide-react';
import { getRepositoryData } from '../data/packageRegistry';
import { 
  getWorkspaceData, 
  commitRepositories,
  openInVSCode,
  importPackageRepository,
  type Workspace, 
  type Repository, 
  type ActivityEvent 
} from '../services';
import { saveWorkflow } from '../services/workflowService';
import { getTasks, Task, startTask, subscribeToTaskUpdates, restartWatchTasks } from '../services/taskService';

interface WorkspaceViewProps {
  workspace: Workspace;
  onImport: () => void;
  onWorkflowSaved: (workflow: any) => void;
}

// Helper function to create package data for imported repositories
function createPackageDataForRepo(repoFullName: string, triggerPackage: string): RepositoryWithPackages | null {
  // Use central registry for known repos
  return getRepositoryData(repoFullName);
}

export function WorkspaceView({ workspace, onImport, onWorkflowSaved }: WorkspaceViewProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [packageRepositories, setPackageRepositories] = useState<RepositoryWithPackages[]>([]);
  const [packageLinks, setPackageLinks] = useState<PackageLink[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFavorites, setTaskFavorites] = useState<string[]>([]);

  // Load workspace-specific data when workspace changes
  useEffect(() => {
    async function loadWorkspaceData() {
      setIsLoading(true);
      try {
        const data = await getWorkspaceData(workspace.id);
        setRepositories(data.repositories);
        setPackageRepositories(data.packageRepositories);
        setPackageLinks(data.packageLinks);
        setActivities(data.activities);
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkspaceData();
  }, [workspace.id]);

  // Load tasks when workspace changes
  useEffect(() => {
    async function loadTasks() {
      try {
        const taskData = await getTasks(workspace.id);
        setTasks(taskData);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    }
    loadTasks();
  }, [workspace.id]);

  // Subscribe to task updates
  useEffect(() => {
    const unsubscribe = subscribeToTaskUpdates(async () => {
      const taskData = await getTasks(workspace.id);
      setTasks(taskData);
    });
    return () => unsubscribe();
  }, [workspace.id]);

  const [activeTab, setActiveTab] = useState<'repos' | 'activity' | 'packages' | 'prs' | 'tasks'>('repos');
  const [showSaveWorkflowDialog, setShowSaveWorkflowDialog] = useState(false);

  const handleImportFromPackages = (packageName: string, repoFullName: string) => {
    // Check if already exists
    const [owner, name] = repoFullName.split('/');
    if (repositories.find((r) => r.owner === owner && r.name === name)) {
      return;
    }

    // Add new repository to the list
    const newRepo: Repository = {
      name,
      owner,
      branch: 'main',
      status: 'clean',
    };
    setRepositories((prev) => [...prev, newRepo]);

    // Create package data based on the imported repository
    const newPackageRepo = createPackageDataForRepo(repoFullName, packageName);
    if (newPackageRepo) {
      setPackageRepositories((prev) => [...prev, newPackageRepo]);
      
      // Update existing package links to reference the new repository
      setPackageLinks((prevLinks) => {
        // Create new links for this imported repo's packages
        const newLinks: PackageLink[] = [];
        
        // Update links that were waiting for this repo (status: not-linked with empty toRepo)
        const updatedLinks = prevLinks.map((link) => {
          if (link.status === 'not-linked' && newPackageRepo.packages.some(pkg => pkg.name === link.to)) {
            return { ...link, toRepo: repoFullName };
          }
          return link;
        });
        
        // Create links from existing packages to this new repo's packages
        packageRepositories.forEach((existingRepo) => {
          existingRepo.packages.forEach((pkg) => {
            // Check if this package depends on any of the new repo's packages
            newPackageRepo.packages.forEach((newPkg) => {
              const hasDependency = pkg.dependencies.some(dep => {
                // Extract package name (e.g., '@acme/design-system@1.0.0' -> '@acme/design-system')
                const depName = dep.includes('@', 1) ? dep.substring(0, dep.lastIndexOf('@')) : dep;
                return depName === newPkg.name;
              });
              
              if (hasDependency && !updatedLinks.some(l => l.from === pkg.name && l.to === newPkg.name)) {
                newLinks.push({
                  from: pkg.name,
                  to: newPkg.name,
                  fromRepo: existingRepo.name,
                  toRepo: repoFullName,
                  status: 'not-linked',
                });
              }
            });
          });
        });
        
        return [...updatedLinks, ...newLinks];
      });
    }

    // Add activity
    const newActivity: ActivityEvent = {
      id: Date.now().toString(),
      type: 'commit',
      repository: repoFullName,
      message: `Imported repository ${repoFullName}`,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleCommit = (repoFullNames: string[], message: string) => {
    // Update repository status to clean after commit
    setRepositories((prev) =>
      prev.map((repo) => {
        const fullName = `${repo.owner}/${repo.name}`;
        if (repoFullNames.includes(fullName)) {
          return { ...repo, status: 'clean', modifiedFiles: 0, untrackedFiles: 0, stagedFiles: 0 };
        }
        return repo;
      })
    );

    // Add activity
    const newActivity: ActivityEvent = {
      id: Date.now().toString(),
      type: 'commit',
      repository: repoFullNames.join(', '),
      message: `Committed: ${message}`,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleVSCodeOpen = (repoFullName: string) => {
    // Simulate opening in VS Code by adding random changes
    const [owner, name] = repoFullName.split('/');
    
    setRepositories((prev) =>
      prev.map((repo) => {
        if (repo.owner === owner && repo.name === name) {
          // Add random changes
          const modifiedFiles = Math.floor(Math.random() * 8) + 1;
          const untrackedFiles = Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0;
          const stagedFiles = Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0;
          
          return {
            ...repo,
            status: 'modified' as const,
            modifiedFiles,
            untrackedFiles,
            stagedFiles,
          };
        }
        return repo;
      })
    );

    // Add activity
    const newActivity: ActivityEvent = {
      id: Date.now().toString(),
      type: 'commit',
      repository: repoFullName,
      message: 'Opened in VS Code - files modified',
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleSaveWorkflow = async (name: string, description: string) => {
    try {
      const repoList = repositories.map(r => ({ owner: r.owner, name: r.name }));
      // Only save links that are currently active (linked)
      const activeLinks = packageLinks.filter(link => link.status === 'linked');
      const savedWorkflow = await saveWorkflow(name, description, repoList, activeLinks, taskFavorites);
      
      // Add activity
      const newActivity: ActivityEvent = {
        id: Date.now().toString(),
        type: 'commit',
        repository: workspace.name,
        message: `Saved workflow template: ${name}`,
        timestamp: new Date().toISOString(),
      };
      setActivities((prev) => [newActivity, ...prev]);
      
      setShowSaveWorkflowDialog(false);
      
      // Call the callback immediately with the saved workflow
      onWorkflowSaved(savedWorkflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const cleanRepos = repositories.filter((r) => r.status === 'clean').length;
  const dirtyRepos = repositories.length - cleanRepos;
  const linkedPackagesCount = packageLinks.filter(link => link.status === 'linked').length;
  const prCount = repositories.filter((r) => r.status === 'modified').length;
  const runningTasksCount = tasks.filter(t => t.status === 'running').length;

  const refreshTasks = async () => {
    const taskData = await getTasks(workspace.id);
    setTasks(taskData);
  };

  const handlePackageLinkUpdate = async (newLinks: PackageLink[]) => {
    const previousLinks = packageLinks;
    setPackageLinks(newLinks);

    // Find newly linked packages and trigger builds
    for (const newLink of newLinks) {
      const wasLinked = previousLinks.find(
        (prevLink) => prevLink.from === newLink.from && prevLink.to === newLink.to
      )?.status === 'linked';

      if (newLink.status === 'linked' && !wasLinked) {
        // Trigger a build for the linked package
        await startTask('build', newLink.toRepo, newLink.to, false);

        // Check if there's a running watch task for the consuming package
        // If so, restart it to pick up the new linked dependency
        const targetRepo = repositories.find(r => `${r.owner}/${r.name}` === newLink.fromRepo);
        if (targetRepo) {
          await restartWatchTasks(newLink.fromRepo, newLink.from);
        }

        // Add activity
        const newActivity: ActivityEvent = {
          id: Date.now().toString(),
          type: 'commit',
          repository: newLink.toRepo,
          message: `Built ${newLink.to} after linking to ${newLink.from}`,
          timestamp: new Date().toISOString(),
        };
        setActivities((prev) => [newActivity, ...prev]);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="p-6 pb-0">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Folder className="w-5 h-5 text-blue-400" />
                <h2>{workspace.name}</h2>
              </div>
              <p className="text-sm text-neutral-500 font-mono">
                {workspace.path}
              </p>
            </div>
            <button
              onClick={() => setShowSaveWorkflowDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-800">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('repos')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'repos'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Repositories ({repositories.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Tasks ({runningTasksCount})
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'packages'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Links ({linkedPackagesCount})
          </button>
          <button
            onClick={() => setActiveTab('prs')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'prs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            Pull Requests ({prCount})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            System Activity
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'repos' && (
          <UnifiedRepositoriesView repositories={repositories} onVSCodeOpen={handleVSCodeOpen} onImport={onImport} />
        )}
        {activeTab === 'packages' && (
          <PackagesPanel 
            repositories={packageRepositories}
            packageLinks={packageLinks}
            onImport={handleImportFromPackages}
            onUpdateLinks={handlePackageLinkUpdate}
          />
        )}
        {activeTab === 'prs' && <SequencerPanel packages={packageRepositories} links={packageLinks} repositories={repositories} />}
        {activeTab === 'activity' && <SystemActivityPanel activities={activities} />}
        {activeTab === 'tasks' && (
          <TasksPanel
            tasks={tasks}
            repositories={repositories}
            onTasksChange={refreshTasks}
            workspaceId={workspace.id}
            onFavoritesChange={setTaskFavorites}
          />
        )}
      </div>

      {/* Save Workflow Dialog */}
      {showSaveWorkflowDialog && (
        <SaveWorkflowDialog
          onSave={handleSaveWorkflow}
          onClose={() => setShowSaveWorkflowDialog(false)}
        />
      )}
    </div>
  );
}