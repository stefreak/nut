import { useState, useEffect } from 'react';
import { ProcessList } from './ProcessList';
import { ResourceCharts } from './ResourceCharts';
import { Cpu, HardDrive, AlertTriangle, Zap, Activity, GitCommit, GitPullRequest, AlertCircle } from 'lucide-react';
import { ActivityEvent } from '../App';

export interface Process {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  diskIO: number;
  runtime: string;
  repository?: string;
  status: 'running' | 'idle' | 'high-usage';
}

export interface ResourceMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  diskRead: number;
  diskWrite: number;
}

interface SystemActivityPanelProps {
  activities?: ActivityEvent[];
}

export function SystemActivityPanel({ activities = [] }: SystemActivityPanelProps) {
  const [processes, setProcesses] = useState<Process[]>([
    {
      pid: 12345,
      name: 'node',
      command: 'nx serve app --port 4200',
      cpu: 45.2,
      memory: 512.5,
      diskIO: 2.3,
      runtime: '2h 15m',
      repository: 'stefreak/nut',
      status: 'high-usage',
    },
    {
      pid: 12346,
      name: 'terraform',
      command: 'terraform apply',
      cpu: 12.8,
      memory: 256.0,
      diskIO: 15.7,
      runtime: '45m',
      repository: 'stefreak/garden-playground-exampleapp',
      status: 'running',
    },
    {
      pid: 12347,
      name: 'webpack',
      command: 'webpack --watch --mode development',
      cpu: 8.5,
      memory: 384.2,
      diskIO: 1.2,
      runtime: '1h 30m',
      repository: 'stefreak/buntspiel',
      status: 'running',
    },
    {
      pid: 12348,
      name: 'node',
      command: 'vite dev',
      cpu: 0.2,
      memory: 128.5,
      diskIO: 0.1,
      runtime: '3h 5m',
      repository: 'stefreak/swiftrest',
      status: 'idle',
    },
    {
      pid: 12349,
      name: 'docker',
      command: 'docker-compose up',
      cpu: 25.3,
      memory: 1024.0,
      diskIO: 45.2,
      runtime: '1h 12m',
      repository: 'stefreak/dappcamp-health-plus',
      status: 'high-usage',
    },
    {
      pid: 12350,
      name: 'node',
      command: 'npm run test:watch',
      cpu: 3.1,
      memory: 256.8,
      diskIO: 0.5,
      runtime: '25m',
      repository: 'stefreak/kernel-test',
      status: 'running',
    },
    {
      pid: 12351,
      name: 'rust-analyzer',
      command: 'rust-analyzer',
      cpu: 15.7,
      memory: 445.3,
      diskIO: 3.8,
      runtime: '4h 20m',
      repository: 'stefreak/nut',
      status: 'running',
    },
    {
      pid: 12352,
      name: 'node',
      command: 'eslint . --watch',
      cpu: 0.8,
      memory: 92.1,
      diskIO: 0.2,
      runtime: '2h 45m',
      repository: 'stefreak/ossf-scorecard-repro-2189',
      status: 'idle',
    },
  ]);

  const [metrics, setMetrics] = useState<ResourceMetrics[]>([]);

  // Generate initial metrics
  useEffect(() => {
    const now = Date.now();
    const initialMetrics: ResourceMetrics[] = [];
    
    for (let i = 30; i >= 0; i--) {
      const timestamp = new Date(now - i * 2000).toLocaleTimeString();
      initialMetrics.push({
        timestamp,
        cpu: Math.random() * 40 + 20,
        memory: Math.random() * 1500 + 500,
        diskRead: Math.random() * 30 + 5,
        diskWrite: Math.random() * 25 + 3,
      });
    }
    
    setMetrics(initialMetrics);
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const newMetrics = [...prev.slice(1)];
        const timestamp = new Date().toLocaleTimeString();
        
        // Calculate based on current processes
        const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
        const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
        const totalDiskIO = processes.reduce((sum, p) => sum + p.diskIO, 0);
        
        newMetrics.push({
          timestamp,
          cpu: totalCpu + Math.random() * 10 - 5,
          memory: totalMemory + Math.random() * 100 - 50,
          diskRead: totalDiskIO * 0.6 + Math.random() * 5,
          diskWrite: totalDiskIO * 0.4 + Math.random() * 5,
        });
        
        return newMetrics;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [processes]);

  const handleKillProcess = (pid: number) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
  };

  const handleKillMultiple = (pids: number[]) => {
    setProcesses((prev) => prev.filter((p) => !pids.includes(p.pid)));
  };

  const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
  const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
  const totalDiskIO = processes.reduce((sum, p) => sum + p.diskIO, 0);
  const highUsageCount = processes.filter((p) => p.status === 'high-usage').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="mb-2">System Activity</h3>
            <p className="text-sm text-neutral-500">
              Monitor and manage processes running in this workspace
            </p>
          </div>
          {highUsageCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                {highUsageCount} high-usage {highUsageCount === 1 ? 'process' : 'processes'}
              </span>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-neutral-500">Total CPU</span>
            </div>
            <p className="text-xl">{totalCpu.toFixed(1)}%</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-neutral-500">Memory</span>
            </div>
            <p className="text-xl">{(totalMemory / 1024).toFixed(1)} GB</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <HardDrive className="w-4 h-4 text-green-400" />
              <span className="text-xs text-neutral-500">Disk I/O</span>
            </div>
            <p className="text-xl">{totalDiskIO.toFixed(1)} MB/s</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-neutral-500">Processes</span>
            </div>
            <p className="text-xl">{processes.length}</p>
          </div>
        </div>
      </div>

      {/* Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Charts - Left Side */}
        <div className="w-2/5 border-r border-neutral-800 flex flex-col overflow-hidden">
          <ResourceCharts metrics={metrics} />
        </div>

        {/* Process List - Right Side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProcessList
            processes={processes}
            onKillProcess={handleKillProcess}
            onKillMultiple={handleKillMultiple}
          />
        </div>
      </div>
    </div>
  );
}