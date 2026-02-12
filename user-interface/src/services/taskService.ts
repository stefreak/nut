// Task management service for build processes, watch tasks, and nx targets
// In production, this will invoke Tauri commands to manage real processes

export type TaskType = 'build' | 'serve' | 'test' | 'watch' | 'lint';
export type TaskStatus = 'running' | 'completed' | 'failed' | 'killed';

export interface TaskLog {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'warn' | 'success';
}

export interface Task {
  id: string;
  type: TaskType;
  target: string; // e.g., "build @acme/design-system" or "serve api-service"
  repository: string; // Repository name
  packageName?: string; // Optional package name for monorepos
  status: TaskStatus;
  startTime: string;
  endTime?: string;
  logs: TaskLog[];
  pid?: number; // Process ID (will be set by Tauri in production)
}

// Simulated task execution - in production this will call Tauri's invoke()
let taskCounter = 1;
const activeTasks = new Map<string, Task>();
const taskListeners: Array<() => void> = [];

// Subscribe to task updates
export function subscribeToTaskUpdates(callback: () => void): () => void {
  taskListeners.push(callback);
  return () => {
    const index = taskListeners.indexOf(callback);
    if (index > -1) {
      taskListeners.splice(index, 1);
    }
  };
}

function notifyListeners() {
  taskListeners.forEach(callback => callback());
}

// Generate realistic build logs
function generateBuildLogs(packageName: string, type: TaskType): TaskLog[] {
  const logs: TaskLog[] = [];
  const timestamp = new Date().toISOString();
  
  logs.push({
    id: `log-${Date.now()}-1`,
    timestamp,
    message: `> nx run ${packageName}:${type}`,
    level: 'info',
  });
  
  logs.push({
    id: `log-${Date.now()}-2`,
    timestamp,
    message: `Compiling TypeScript files for project "${packageName}"...`,
    level: 'info',
  });
  
  if (type === 'build') {
    logs.push({
      id: `log-${Date.now()}-3`,
      timestamp,
      message: `✓ Successfully compiled ${Math.floor(Math.random() * 20) + 10} files`,
      level: 'success',
    });
  }
  
  return logs;
}

// Generate watch mode logs
function generateWatchLogs(packageName: string): TaskLog[] {
  const logs: TaskLog[] = [];
  const timestamp = new Date().toISOString();
  
  logs.push({
    id: `log-${Date.now()}-1`,
    timestamp,
    message: `> nx run ${packageName}:build --watch`,
    level: 'info',
  });
  
  logs.push({
    id: `log-${Date.now()}-2`,
    timestamp,
    message: `Watching for file changes in ${packageName}...`,
    level: 'info',
  });
  
  return logs;
}

// Start a new task
export async function startTask(
  type: TaskType,
  repository: string,
  packageName?: string,
  watch: boolean = false
): Promise<Task> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const taskId = `task-${taskCounter++}`;
  const target = packageName 
    ? `${type} ${packageName}${watch ? ' --watch' : ''}` 
    : `${type} ${repository}${watch ? ' --watch' : ''}`;
  
  const task: Task = {
    id: taskId,
    type: watch ? 'watch' : type,
    target,
    repository,
    packageName,
    status: 'running',
    startTime: new Date().toISOString(),
    logs: watch ? generateWatchLogs(packageName || repository) : generateBuildLogs(packageName || repository, type),
    pid: Math.floor(Math.random() * 10000) + 1000,
  };
  
  activeTasks.set(taskId, task);
  notifyListeners();
  
  // Simulate task completion for non-watch tasks
  if (!watch) {
    setTimeout(() => {
      completeTask(taskId, Math.random() > 0.1 ? 'completed' : 'failed');
    }, Math.random() * 3000 + 2000);
  }
  
  return task;
}

// Add a log entry to a task
export async function addTaskLog(taskId: string, message: string, level: TaskLog['level'] = 'info'): Promise<void> {
  const task = activeTasks.get(taskId);
  if (!task) return;
  
  const log: TaskLog = {
    id: `log-${Date.now()}-${task.logs.length}`,
    timestamp: new Date().toISOString(),
    message,
    level,
  };
  
  task.logs.push(log);
  activeTasks.set(taskId, { ...task });
  notifyListeners();
}

// Complete a task
function completeTask(taskId: string, status: 'completed' | 'failed'): void {
  const task = activeTasks.get(taskId);
  if (!task) return;
  
  const updatedTask: Task = {
    ...task,
    status,
    endTime: new Date().toISOString(),
  };
  
  // Add completion log
  if (status === 'completed') {
    updatedTask.logs.push({
      id: `log-${Date.now()}-complete`,
      timestamp: new Date().toISOString(),
      message: `✓ ${task.type} completed successfully`,
      level: 'success',
    });
  } else {
    updatedTask.logs.push({
      id: `log-${Date.now()}-failed`,
      timestamp: new Date().toISOString(),
      message: `✗ ${task.type} failed with exit code 1`,
      level: 'error',
    });
  }
  
  activeTasks.set(taskId, updatedTask);
  notifyListeners();
}

// Kill a running task
export async function killTask(taskId: string): Promise<void> {
  const task = activeTasks.get(taskId);
  if (!task || task.status !== 'running') return;
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const updatedTask: Task = {
    ...task,
    status: 'killed',
    endTime: new Date().toISOString(),
  };
  
  updatedTask.logs.push({
    id: `log-${Date.now()}-killed`,
    timestamp: new Date().toISOString(),
    message: `Task killed by user`,
    level: 'warn',
  });
  
  activeTasks.set(taskId, updatedTask);
  notifyListeners();
}

// Get all tasks for a workspace
export async function getTasks(workspaceId?: string): Promise<Task[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return Array.from(activeTasks.values()).sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

// Get a specific task
export async function getTask(taskId: string): Promise<Task | null> {
  return activeTasks.get(taskId) || null;
}

// Clear completed/failed/killed tasks
export async function clearInactiveTasks(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  for (const [id, task] of activeTasks.entries()) {
    if (task.status !== 'running') {
      activeTasks.delete(id);
    }
  }
  notifyListeners();
}

// Find running watch tasks for a repository/package
export async function findWatchTasks(repository: string, packageName?: string): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter(
    (task) =>
      task.type === 'watch' &&
      task.status === 'running' &&
      task.repository === repository &&
      (!packageName || task.packageName === packageName)
  );
}

// Restart watch tasks (useful when dependencies change)
export async function restartWatchTasks(repository: string, packageName?: string): Promise<Task[]> {
  const watchTasks = await findWatchTasks(repository, packageName);
  const newTasks: Task[] = [];

  for (const task of watchTasks) {
    // Kill the old watch task
    await killTask(task.id);
    
    // Add a log explaining why it was restarted
    await addTaskLog(task.id, 'Watch task restarted due to dependency changes', 'info');
    
    // Start a new watch task
    const newTask = await startTask('build', task.repository, task.packageName, true);
    await addTaskLog(newTask.id, 'Restarted due to linked package changes', 'info');
    newTasks.push(newTask);
  }

  return newTasks;
}