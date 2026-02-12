import { useState, useEffect } from 'react';
import { Play, Square, Trash2, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, XCircle, Star, ChevronUp } from 'lucide-react';
import { Task, TaskType, startTask, killTask, clearInactiveTasks, addTaskLog } from '../services/taskService';

interface AvailableTask {
  id: string;
  repository: string;
  packageName?: string;
  target: TaskType;
  label: string;
  isFavorite: boolean;
}

interface TasksPanelProps {
  tasks: Task[];
  repositories: { name: string; owner: string }[];
  onTasksChange: () => void;
  workspaceId: string;
  initialFavorites?: string[];
  onFavoritesChange?: (favorites: string[]) => void;
}

// Common nx targets
const NX_TARGETS: TaskType[] = ['build', 'serve', 'test', 'lint'];

export function TasksPanel({ tasks, repositories, onTasksChange, workspaceId, initialFavorites, onFavoritesChange }: TasksPanelProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize available tasks from repositories
  useEffect(() => {
    const tasks: AvailableTask[] = [];
    
    repositories.forEach((repo) => {
      // Add tasks for the repo itself
      NX_TARGETS.forEach((target) => {
        tasks.push({
          id: `${repo.owner}/${repo.name}:${target}`,
          repository: `${repo.owner}/${repo.name}`,
          target,
          label: `${repo.name} → ${target}`,
          isFavorite: false,
        });
      });

      // Add tasks for known packages within the repo
      // In production, this would query the actual nx.json or project.json files
      const mockPackages = getMockPackagesForRepo(repo.name);
      mockPackages.forEach((pkg) => {
        NX_TARGETS.forEach((target) => {
          tasks.push({
            id: `${repo.owner}/${repo.name}:${pkg}:${target}`,
            repository: `${repo.owner}/${repo.name}`,
            packageName: pkg,
            target,
            label: `${pkg} → ${target}`,
            isFavorite: false,
          });
        });
      });
    });

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem(`nut-task-favorites-${workspaceId}`);
    if (savedFavorites) {
      const favoriteIds = new Set(JSON.parse(savedFavorites));
      tasks.forEach((task) => {
        if (favoriteIds.has(task.id)) {
          task.isFavorite = true;
        }
      });
    } else if (initialFavorites) {
      const favoriteIds = new Set(initialFavorites);
      tasks.forEach((task) => {
        if (favoriteIds.has(task.id)) {
          task.isFavorite = true;
        }
      });
    }

    setAvailableTasks(tasks);
  }, [repositories, workspaceId, initialFavorites]);

  const runningTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status !== 'running');

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleFavorite = (taskId: string) => {
    const updatedTasks = availableTasks.map((task) => {
      if (task.id === taskId) {
        return { ...task, isFavorite: !task.isFavorite };
      }
      return task;
    });
    setAvailableTasks(updatedTasks);

    // Save favorites to localStorage
    const favoriteIds = updatedTasks.filter((t) => t.isFavorite).map((t) => t.id);
    localStorage.setItem(`nut-task-favorites-${workspaceId}`, JSON.stringify(favoriteIds));
    if (onFavoritesChange) {
      onFavoritesChange(favoriteIds);
    }
  };

  const handleStartTask = async (availableTask: AvailableTask, watchMode: boolean = false) => {
    await startTask(availableTask.target, availableTask.repository, availableTask.packageName, watchMode);
    onTasksChange();
  };

  const handleKillTask = async (taskId: string) => {
    await killTask(taskId);
    onTasksChange();
  };

  const handleClearInactive = async () => {
    await clearInactiveTasks();
    onTasksChange();
  };

  const favoriteTasks = availableTasks.filter((t) => t.isFavorite);
  const filteredTasks = availableTasks.filter((task) =>
    task.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.repository.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'killed':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-400 bg-blue-400/10';
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      case 'killed':
        return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  const getLogColor = (level: 'info' | 'error' | 'warn' | 'success') => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-neutral-400';
    }
  };

  // Check if a task is currently running
  const isTaskRunning = (availableTask: AvailableTask) => {
    return runningTasks.some(
      (t) =>
        t.repository === availableTask.repository &&
        t.type === availableTask.target &&
        (t.packageName || '') === (availableTask.packageName || '')
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Available Tasks Sidebar */}
      <div className="w-80 border-r border-neutral-800 flex flex-col bg-neutral-900/30">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="mb-3">Available Tasks</h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-auto">
          {/* Favorites */}
          {favoriteTasks.length > 0 && (
            <div className="border-b border-neutral-800">
              <div className="px-4 py-2 text-xs uppercase tracking-wider text-neutral-500 bg-neutral-900/50">
                Favorites
              </div>
              <div className="py-2">
                {favoriteTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    isRunning={isTaskRunning(task)}
                    onStart={handleStartTask}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Tasks (collapsible) */}
          <div>
            <button
              onClick={() => setShowAllTasks(!showAllTasks)}
              className="w-full px-4 py-2 text-xs uppercase tracking-wider text-neutral-500 bg-neutral-900/50 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
            >
              <span>All Tasks</span>
              {showAllTasks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAllTasks && (
              <div className="py-2">
                {filteredTasks.length === 0 ? (
                  <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                    No tasks found
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      isRunning={isTaskRunning(task)}
                      onStart={handleStartTask}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Running Tasks Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-neutral-800 p-4 bg-neutral-900/50 flex items-center justify-between">
          <div>
            <h3>Task Execution</h3>
            <p className="text-sm text-neutral-400 mt-1">
              {runningTasks.length} running, {completedTasks.length} completed
            </p>
          </div>
          {completedTasks.length > 0 && (
            <button
              onClick={handleClearInactive}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear Inactive
            </button>
          )}
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <Play className="w-12 h-12 mb-4 opacity-50" />
              <p>No tasks running</p>
              <p className="text-sm mt-1">Select a task from the sidebar to start</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Running Tasks */}
              {runningTasks.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                    Running ({runningTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {runningTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={expandedTasks.has(task.id)}
                        onToggle={() => toggleExpanded(task.id)}
                        onKill={() => handleKillTask(task.id)}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        getLogColor={getLogColor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed/Failed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                    Completed ({completedTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={expandedTasks.has(task.id)}
                        onToggle={() => toggleExpanded(task.id)}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        getLogColor={getLogColor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to get mock packages for a repo
function getMockPackagesForRepo(repoName: string): string[] {
  // In production, this would read from nx.json or project.json
  const packageMap: Record<string, string[]> = {
    'design-system': ['@acme/ui-components', '@acme/design-tokens', '@acme/icons'],
    'api-gateway': ['@acme/api-core', '@acme/auth-service', '@acme/user-service'],
    'web-app': ['@acme/web-client', '@acme/shared-utils'],
  };
  
  return packageMap[repoName] || [];
}

interface TaskListItemProps {
  task: AvailableTask;
  isRunning: boolean;
  onStart: (task: AvailableTask, watchMode: boolean) => void;
  onToggleFavorite: (taskId: string) => void;
}

function TaskListItem({ task, isRunning, onStart, onToggleFavorite }: TaskListItemProps) {
  const [showWatchOption, setShowWatchOption] = useState(false);

  return (
    <div
      className="group px-4 py-2 hover:bg-neutral-800/50 transition-colors relative"
      onMouseEnter={() => setShowWatchOption(true)}
      onMouseLeave={() => setShowWatchOption(false)}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleFavorite(task.id)}
          className="text-neutral-600 hover:text-yellow-400 transition-colors"
        >
          <Star className={`w-4 h-4 ${task.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{task.label}</div>
          <div className="text-xs text-neutral-500 truncate">{task.repository}</div>
        </div>

        {isRunning ? (
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <Clock className="w-3 h-3 animate-pulse" />
            Running
          </div>
        ) : (
          <div className="flex gap-1">
            {showWatchOption && task.target === 'build' && (
              <button
                onClick={() => onStart(task, true)}
                className="px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded transition-colors"
                title="Start in watch mode"
              >
                Watch
              </button>
            )}
            <button
              onClick={() => onStart(task, false)}
              className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onKill?: () => void;
  getStatusIcon: (status: Task['status']) => JSX.Element;
  getStatusColor: (status: Task['status']) => string;
  getLogColor: (level: 'info' | 'error' | 'warn' | 'success') => string;
}

function TaskCard({ task, expanded, onToggle, onKill, getStatusIcon, getStatusColor, getLogColor }: TaskCardProps) {
  const duration = task.endTime 
    ? Math.round((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / 1000)
    : Math.round((Date.now() - new Date(task.startTime).getTime()) / 1000);

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg overflow-hidden">
      {/* Task Header */}
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggle}
          className="text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {getStatusIcon(task.status)}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs uppercase ${getStatusColor(task.status)}`}>
              {task.type}
            </span>
            <span className="text-sm font-mono truncate">{task.target}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span>{task.repository}</span>
            <span>•</span>
            <span>{duration}s</span>
            {task.pid && (
              <>
                <span>•</span>
                <span>PID: {task.pid}</span>
              </>
            )}
          </div>
        </div>

        {task.status === 'running' && onKill && (
          <button
            onClick={onKill}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
          >
            <Square className="w-3 h-3" />
            Kill
          </button>
        )}
      </div>

      {/* Task Logs */}
      {expanded && (
        <div className="border-t border-neutral-700 bg-black/30">
          <div className="p-3 max-h-96 overflow-auto font-mono text-xs">
            {task.logs.map((log) => (
              <div key={log.id} className="mb-1 flex gap-2">
                <span className="text-neutral-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={getLogColor(log.level)}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}