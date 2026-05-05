import { useState, useEffect, useCallback } from 'react';
import { FlaskConical } from 'lucide-react';
import { PipelineStages } from '../components/PipelineStages';
import { getDashboardStats, getActivePipelineItems, getPipelineStageCounts } from '../services/rosinLabService';
import type { ActivePipelineItem, DashboardStats, RosinLabScreen } from '../types/rosin-lab.types';

const STAGE_COLORS: Record<string, string> = {
  ff: '#06B6D4',
  'fresh-frozen': '#06B6D4',
  wash: '#3B82F6',
  fd: '#94A3B8',
  'freeze-dry': '#94A3B8',
  hash: '#F59E0B',
  press: '#F97316',
  cure: '#8B5CF6',
};

const STAGE_LABELS: Record<string, string> = {
  ff: 'Fresh Frozen',
  wash: 'Washing',
  fd: 'Drying',
  hash: 'Hash',
  press: 'Pressing',
  cure: 'Curing',
};

function getStageColor(stage: string): string {
  return STAGE_COLORS[stage.toLowerCase()] ?? '#666666';
}

function getStageLabel(stage: string): string {
  return STAGE_LABELS[stage.toLowerCase()] ?? stage;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface StatCardProps {
  label: string;
  value: string;
  accentColor: string;
  isDanger?: boolean;
}

function StatCard({ label, value, accentColor, isDanger }: StatCardProps) {
  return (
    <div className="flex-1 min-w-0 bg-cult-surface-raised border border-cult-border rounded-cult px-5 py-4">
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: '#666666' }}
      >
        {label}
      </p>
      <p
        className="text-[28px] font-bold leading-none"
        style={{ color: isDanger ? '#B81D24' : accentColor }}
      >
        {value}
      </p>
    </div>
  );
}

interface RosinDashboardProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

export function RosinDashboard({ onNavigate }: RosinDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    avgWashYield: 0,
    avgPressYield: 0,
    totalRosin30d: 0,
    needsAttention: 0,
  });
  const [pipelineItems, setPipelineItems] = useState<ActivePipelineItem[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsData, itemsData, countsData] = await Promise.all([
      getDashboardStats(),
      getActivePipelineItems(),
      getPipelineStageCounts(),
    ]);
    setStats(statsData);
    setPipelineItems(itemsData);
    setStageCounts(countsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cult-text-muted mb-3">
          Production Pipeline
        </h2>
        <PipelineStages counts={stageCounts} onStageClick={onNavigate} />
      </div>

      <div className="flex gap-4">
        <StatCard
          label="Avg Wash Yield"
          value={loading ? '—' : `${stats.avgWashYield.toFixed(1)}%`}
          accentColor="#3B82F6"
        />
        <StatCard
          label="Avg Press Yield"
          value={loading ? '—' : `${stats.avgPressYield.toFixed(1)}%`}
          accentColor="#F97316"
        />
        <StatCard
          label="Total Rosin (30d)"
          value={loading ? '—' : `${stats.totalRosin30d.toFixed(0)}g`}
          accentColor="#6366F1"
        />
        <StatCard
          label="Needs Attention"
          value={loading ? '—' : String(stats.needsAttention)}
          accentColor="#B81D24"
          isDanger={stats.needsAttention > 0}
        />
      </div>

      <div className="bg-cult-surface-raised border border-cult-border rounded-cult overflow-hidden">
        <div className="bg-cult-surface-overlay px-5 py-3 border-b border-cult-border">
          <h3 className="text-[13px] font-semibold text-cult-text-primary">Active Work</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cult-accent" />
          </div>
        ) : pipelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FlaskConical className="w-10 h-10 text-cult-border-strong" />
            <p className="text-[13px] text-cult-text-muted">No active work in the pipeline</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-cult-surface-overlay border-b border-cult-border">
                <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Stage
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Strain
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Batch
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Input
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Started
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pipelineItems.map((item) => {
                const stageColor = getStageColor(item.stage);
                const navKey = (item.stage.toLowerCase() === 'wash'
                  ? 'wash'
                  : item.stage.toLowerCase() === 'press'
                  ? 'press'
                  : item.stage.toLowerCase() === 'cure'
                  ? 'rosin'
                  : item.stage.toLowerCase() === 'hash' || item.stage.toLowerCase() === 'fd'
                  ? 'hash'
                  : item.stage.toLowerCase() === 'ff' || item.stage.toLowerCase() === 'fresh-frozen'
                  ? 'fresh-frozen'
                  : 'dashboard') as RosinLabScreen;

                return (
                  <tr
                    key={item.run_id}
                    className="border-b border-cult-border last:border-0 hover:bg-cult-surface-overlay/50 transition-colors"
                  >
                    <td
                      className="px-5 py-3 text-[13px] font-medium text-cult-text-primary"
                      style={{ boxShadow: `inset 3px 0 0 ${stageColor}` }}
                    >
                      {getStageLabel(item.stage)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-cult-text-secondary">
                      {item.strain_name}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-mono text-cult-text-muted">
                      {item.batch_number}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-cult-text-secondary">
                      {item.input_grams.toFixed(0)}g
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: stageColor + '20',
                          color: stageColor,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-cult-text-muted">
                      {relativeTime(item.started_date)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onNavigate(navKey)}
                        className="text-[13px] font-medium text-cult-accent hover:text-cult-accent-hover transition-colors"
                      >
                        View &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
