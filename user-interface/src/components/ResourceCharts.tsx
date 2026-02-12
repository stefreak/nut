import { ResourceMetrics } from './SystemActivityPanel';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Cpu, HardDrive, Zap } from 'lucide-react';

interface ResourceChartsProps {
  metrics: ResourceMetrics[];
}

export function ResourceCharts({ metrics }: ResourceChartsProps) {
  const latestMetrics = metrics[metrics.length - 1];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="mb-4">Resource Usage Over Time</h3>
          <p className="text-sm text-neutral-500 mb-6">
            Real-time monitoring of workspace resource consumption
          </p>
        </div>

        {/* CPU Usage Chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h4 className="text-sm">CPU Usage</h4>
            {latestMetrics && (
              <span className="ml-auto text-sm text-neutral-400">
                {latestMetrics.cpu.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#a3a3a3' }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#facc15"
                  strokeWidth={2}
                  fill="url(#cpuGradient)"
                  name="CPU %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Usage Chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm">Memory Usage</h4>
            {latestMetrics && (
              <span className="ml-auto text-sm text-neutral-400">
                {(latestMetrics.memory / 1024).toFixed(2)} GB
              </span>
            )}
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  unit=" MB"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#a3a3a3' }}
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#memoryGradient)"
                  name="Memory (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disk I/O Chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-green-400" />
            <h4 className="text-sm">Disk I/O</h4>
            {latestMetrics && (
              <span className="ml-auto text-sm text-neutral-400">
                ↓{latestMetrics.diskRead.toFixed(1)} ↑{latestMetrics.diskWrite.toFixed(1)} MB/s
              </span>
            )}
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  unit=" MB/s"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#a3a3a3' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="diskRead"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Read"
                />
                <Line
                  type="monotone"
                  dataKey="diskWrite"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Write"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-200">
            <strong>Tip:</strong> High-usage processes consuming excessive resources can be terminated
            to free up system capacity. Look for idle processes that have been running for extended
            periods.
          </p>
        </div>
      </div>
    </div>
  );
}