import { useState } from 'react';
import { Process } from './SystemActivityPanel';
import {
  Trash2,
  AlertCircle,
  Circle,
  Cpu,
  HardDrive,
  Clock,
  Terminal,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

interface ProcessListProps {
  processes: Process[];
  onKillProcess: (pid: number) => void;
  onKillMultiple: (pids: number[]) => void;
}

export function ProcessList({ processes, onKillProcess, onKillMultiple }: ProcessListProps) {
  const [selectedPids, setSelectedPids] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'diskIO' | 'runtime'>('cpu');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'idle' | 'high-usage'>('all');

  const toggleSelect = (pid: number) => {
    setSelectedPids((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPids.length === filteredProcesses.length) {
      setSelectedPids([]);
    } else {
      setSelectedPids(filteredProcesses.map((p) => p.pid));
    }
  };

  const handleKillSelected = () => {
    if (selectedPids.length > 0 && confirm(`Kill ${selectedPids.length} selected processes?`)) {
      onKillMultiple(selectedPids);
      setSelectedPids([]);
    }
  };

  const filteredProcesses = processes.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const sortedProcesses = [...filteredProcesses].sort((a, b) => {
    switch (sortBy) {
      case 'cpu':
        return b.cpu - a.cpu;
      case 'memory':
        return b.memory - a.memory;
      case 'diskIO':
        return b.diskIO - a.diskIO;
      case 'runtime':
        return b.runtime.localeCompare(a.runtime);
      default:
        return 0;
    }
  });

  const getStatusColor = (status: Process['status']) => {
    switch (status) {
      case 'high-usage':
        return 'text-orange-400';
      case 'running':
        return 'text-green-400';
      case 'idle':
        return 'text-neutral-500';
    }
  };

  const getStatusIcon = (status: Process['status']) => {
    switch (status) {
      case 'high-usage':
        return <AlertCircle className="w-3 h-3" />;
      case 'running':
        return <Circle className="w-3 h-3 fill-current" />;
      case 'idle':
        return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="p-1 hover:bg-neutral-800 rounded transition-colors"
              title={selectedPids.length === filteredProcesses.length ? 'Deselect all' : 'Select all'}
            >
              {selectedPids.length === filteredProcesses.length && filteredProcesses.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-500" />
              )}
            </button>
            {selectedPids.length > 0 && (
              <button
                onClick={handleKillSelected}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Kill {selectedPids.length} Selected
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
            >
              <option value="cpu">CPU Usage</option>
              <option value="memory">Memory</option>
              <option value="diskIO">Disk I/O</option>
              <option value="runtime">Runtime</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            All ({processes.length})
          </button>
          <button
            onClick={() => setFilterStatus('high-usage')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filterStatus === 'high-usage'
                ? 'bg-orange-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            High Usage ({processes.filter((p) => p.status === 'high-usage').length})
          </button>
          <button
            onClick={() => setFilterStatus('running')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filterStatus === 'running'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            Running ({processes.filter((p) => p.status === 'running').length})
          </button>
          <button
            onClick={() => setFilterStatus('idle')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              filterStatus === 'idle'
                ? 'bg-neutral-600 text-white'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            Idle ({processes.filter((p) => p.status === 'idle').length})
          </button>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedProcesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Terminal className="w-16 h-16 text-neutral-700 mb-4" />
            <p className="text-neutral-400 mb-2">
              {processes.length === 0
                ? 'No processes running'
                : 'No processes match this filter'}
            </p>
            <p className="text-sm text-neutral-500">
              {processes.length === 0
                ? 'Processes will appear here when started'
                : 'Try selecting a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedProcesses.map((process) => (
              <div
                key={process.pid}
                className={`p-4 bg-neutral-900 border rounded-lg transition-all ${
                  selectedPids.includes(process.pid)
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(process.pid)}
                    className="mt-1 p-0.5 hover:bg-neutral-800 rounded transition-colors"
                  >
                    {selectedPids.includes(process.pid) ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-500" />
                    )}
                  </button>

                  {/* Process Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1.5 ${getStatusColor(process.status)}`}>
                        {getStatusIcon(process.status)}
                        <span className="text-xs uppercase">{process.status}</span>
                      </div>
                      <span className="text-neutral-600">•</span>
                      <span className="text-sm font-mono text-neutral-400">
                        PID {process.pid}
                      </span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-sm">{process.name}</span>
                    </div>

                    <div className="mb-3">
                      <code className="text-sm text-neutral-300 break-all">
                        {process.command}
                      </code>
                      {process.repository && (
                        <div className="mt-1 text-xs text-neutral-500">
                          Repository: {process.repository}
                        </div>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-neutral-400">CPU:</span>
                        <span
                          className={process.cpu > 30 ? 'text-orange-400' : 'text-neutral-300'}
                        >
                          {process.cpu.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-neutral-400">MEM:</span>
                        <span
                          className={process.memory > 500 ? 'text-orange-400' : 'text-neutral-300'}
                        >
                          {process.memory.toFixed(1)} MB
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-neutral-400">I/O:</span>
                        <span className="text-neutral-300">{process.diskIO.toFixed(1)} MB/s</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-neutral-400">Runtime:</span>
                        <span className="text-neutral-300">{process.runtime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kill Button */}
                  <button
                    onClick={() => {
                      if (confirm(`Kill process ${process.name} (PID ${process.pid})?`)) {
                        onKillProcess(process.pid);
                      }
                    }}
                    className="p-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded transition-colors"
                    title="Kill process"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
