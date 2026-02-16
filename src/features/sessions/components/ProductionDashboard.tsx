import { useState, useEffect } from 'react';
import {
  Scissors,
  Leaf,
  Box,
  Clock,
  CheckCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatElapsedTime } from '../utils';
import type { BuckingSession, TrimSession, PackagingSession } from '../types';
import {
  getActiveBuckingSessions,
  getActiveTrimSessions,
  getActivePackagingSessions,
  getBuckingSessions,
  getTrimSessions,
  getPackagingSessions,
} from '../services/sessions.service';

interface ProductionDashboardProps {
  onViewChange: (view: string) => void;
}

interface ActiveSessionRow {
  id: string;
  type: 'bucking' | 'trim' | 'packaging';
  worker: string;
  strain: string;
  packageId: string;
  startedAt: string;
}

interface TodaySummary {
  buckingCompleted: number;
  trimCompleted: number;
  packagingCompleted: number;
  totalFlowerBucked: number;
  totalFlowerTrimmed: number;
  totalUnitsPackaged: number;
}

function normalizeActiveSessions(
  bucking: BuckingSession[],
  trim: TrimSession[],
  packaging: PackagingSession[]
): ActiveSessionRow[] {
  const rows: ActiveSessionRow[] = [];

  bucking.forEach((s) =>
    rows.push({
      id: s.id,
      type: 'bucking',
      worker: s.bucker_name || '',
      strain: s.strain || '',
      packageId: s.binned_package_id || '',
      startedAt: s.started_at,
    })
  );

  trim.forEach((s) =>
    rows.push({
      id: s.id,
      type: 'trim',
      worker: s.trimmer_name || '',
      strain: s.strain || '',
      packageId: s.package_id || '',
      startedAt: s.started_at,
    })
  );

  packaging.forEach((s) =>
    rows.push({
      id: s.id,
      type: 'packaging',
      worker: s.packager_name || '',
      strain: s.strain || '',
      packageId: s.package_id || '',
      startedAt: s.started_at,
    })
  );

  rows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return rows;
}

function computeTodaySummary(
  buckingAll: BuckingSession[],
  trimAll: TrimSession[],
  packagingAll: PackagingSession[]
): TodaySummary {
  const today = new Date().toISOString().split('T')[0];

  const buckingToday = buckingAll.filter(
    (s) => s.session_date === today && s.session_status === 'completed'
  );
  const trimToday = trimAll.filter(
    (s) => s.session_date === today && s.session_status === 'completed'
  );
  const packagingToday = packagingAll.filter(
    (s) => s.session_date === today && s.session_status === 'completed'
  );

  return {
    buckingCompleted: buckingToday.length,
    trimCompleted: trimToday.length,
    packagingCompleted: packagingToday.length,
    totalFlowerBucked: buckingToday.reduce((sum, s) => sum + (s.bucked_flower_grams || 0), 0),
    totalFlowerTrimmed: trimToday.reduce((sum, s) => sum + (s.big_buds_grams || 0), 0),
    totalUnitsPackaged: packagingToday.reduce(
      (sum, s) => sum + (s.units_3_5g || 0) + (s.units_14g || 0) + (s.units_454g || 0),
      0
    ),
  };
}

const TYPE_CONFIG = {
  bucking: { label: 'Bucking', icon: Scissors, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  trim: { label: 'Trim', icon: Leaf, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  packaging: { label: 'Packaging', icon: Box, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' },
} as const;

export function ProductionDashboard({ onViewChange }: ProductionDashboardProps) {
  const [activeBucking, setActiveBucking] = useState<BuckingSession[]>([]);
  const [activeTrim, setActiveTrim] = useState<TrimSession[]>([]);
  const [activePackaging, setActivePackaging] = useState<PackagingSession[]>([]);
  const [allBucking, setAllBucking] = useState<BuckingSession[]>([]);
  const [allTrim, setAllTrim] = useState<TrimSession[]>([]);
  const [allPackaging, setAllPackaging] = useState<PackagingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('production-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucking_sessions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trim_sessions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packaging_sessions' }, fetchAll)
      .subscribe();

    const timer = setInterval(() => setTick((t) => t + 1), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  async function fetchAll() {
    try {
      const [ab, at, ap, allB, allT, allP] = await Promise.all([
        getActiveBuckingSessions(),
        getActiveTrimSessions(),
        getActivePackagingSessions(),
        getBuckingSessions(),
        getTrimSessions(),
        getPackagingSessions(),
      ]);

      setActiveBucking(ab.data || []);
      setActiveTrim((at.data || []).filter((s: any) => s.session_status === 'active'));
      setActivePackaging(ap.data || []);
      setAllBucking(allB.data || []);
      setAllTrim(allT.data || []);
      setAllPackaging(allP.data || []);
    } catch (err) {
      console.error('Error loading production dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const activeRows = normalizeActiveSessions(activeBucking, activeTrim, activePackaging);
  const totalActive = activeRows.length;
  const todaySummary = computeTodaySummary(allBucking, allTrim, allPackaging);
  const totalCompletedToday =
    todaySummary.buckingCompleted + todaySummary.trimCompleted + todaySummary.packagingCompleted;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-cult-light-gray">Loading production overview...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">
          Production
        </h1>
        <p className="text-cult-light-gray mt-2">Real-time floor activity across all session types</p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Sessions"
          value={totalActive}
          icon={<Activity className="w-5 h-5 text-cult-green" />}
          highlight={totalActive > 0}
        />
        <StatCard
          label="Completed Today"
          value={totalCompletedToday}
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          label="Flower Bucked"
          value={`${(todaySummary.totalFlowerBucked / 1000).toFixed(1)} kg`}
          icon={<Scissors className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          label="Units Packaged"
          value={todaySummary.totalUnitsPackaged}
          icon={<Box className="w-5 h-5 text-sky-400" />}
        />
      </div>

      {/* Active Sessions */}
      <div className="bg-cult-near-black border border-cult-medium-gray">
        <div className="px-6 py-4 border-b border-cult-medium-gray flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${totalActive > 0 ? 'bg-cult-green animate-pulse' : 'bg-cult-medium-gray'}`} />
            <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
              Active Sessions
            </h2>
            {totalActive > 0 && (
              <span className="text-xs font-bold bg-cult-green/20 text-cult-green px-2 py-0.5 rounded-full">
                {totalActive} LIVE
              </span>
            )}
          </div>
        </div>
        {activeRows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Clock className="w-10 h-10 text-cult-medium-gray mx-auto mb-3" />
            <p className="text-cult-light-gray text-sm">No active sessions on the floor</p>
            <p className="text-cult-silver text-xs mt-1">Start a session from the buttons below</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cult-dark-gray border-b border-cult-medium-gray">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                    Strain
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                    Package ID
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider">
                    Elapsed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cult-medium-gray/50">
                {activeRows.map((row) => {
                  const cfg = TYPE_CONFIG[row.type];
                  const TypeIcon = cfg.icon;
                  return (
                    <tr key={row.id} className="hover:bg-cult-dark-gray/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-cult-white">
                        {row.worker}
                      </td>
                      <td className="px-5 py-3 text-sm text-cult-white">
                        {row.strain}
                      </td>
                      <td className="px-5 py-3 text-sm text-cult-silver font-mono">
                        {row.packageId || '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-center font-medium text-cult-green">
                        {formatElapsedTime(row.startedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Today's Completed Summary */}
      {totalCompletedToday > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CompletedCard
            type="bucking"
            count={todaySummary.buckingCompleted}
            metric={`${(todaySummary.totalFlowerBucked / 1000).toFixed(1)} kg flower`}
            onNavigate={() => onViewChange('bucking-sessions')}
          />
          <CompletedCard
            type="trim"
            count={todaySummary.trimCompleted}
            metric={`${todaySummary.totalFlowerTrimmed.toFixed(0)}g flower`}
            onNavigate={() => onViewChange('trim-sessions')}
          />
          <CompletedCard
            type="packaging"
            count={todaySummary.packagingCompleted}
            metric={`${todaySummary.totalUnitsPackaged} units`}
            onNavigate={() => onViewChange('packaging-sessions')}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">
          Start Session
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickActionButton
            label="Bucking Session"
            icon={<Scissors className="w-5 h-5" />}
            onClick={() => onViewChange('bucking-sessions')}
            accentColor="amber"
          />
          <QuickActionButton
            label="Trim Session"
            icon={<Leaf className="w-5 h-5" />}
            onClick={() => onViewChange('trim-sessions')}
            accentColor="emerald"
          />
          <QuickActionButton
            label="Packaging Session"
            icon={<Box className="w-5 h-5" />}
            onClick={() => onViewChange('packaging-sessions')}
            accentColor="sky"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-cult-near-black border p-5 ${highlight ? 'border-cult-green/30' : 'border-cult-medium-gray'}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-cult-silver uppercase tracking-wider font-medium">{label}</p>
        {icon}
      </div>
      <p className={`text-3xl font-bold ${highlight ? 'text-cult-green' : 'text-cult-white'}`}>
        {value}
      </p>
    </div>
  );
}

function CompletedCard({
  type,
  count,
  metric,
  onNavigate,
}: {
  type: 'bucking' | 'trim' | 'packaging';
  count: number;
  metric: string;
  onNavigate: () => void;
}) {
  const cfg = TYPE_CONFIG[type];
  const TypeIcon = cfg.icon;

  if (count === 0) return null;

  return (
    <button
      onClick={onNavigate}
      className="bg-cult-near-black border border-cult-medium-gray p-5 text-left hover:border-cult-light-gray transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
          <TypeIcon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
        <ArrowRight className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white transition-colors" />
      </div>
      <p className="text-2xl font-bold text-cult-white">{count} completed</p>
      <p className="text-sm text-cult-silver mt-1">{metric}</p>
    </button>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
  accentColor,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  accentColor: 'amber' | 'emerald' | 'sky';
}) {
  const hoverMap = {
    amber: 'hover:border-amber-400/40 hover:bg-amber-400/5',
    emerald: 'hover:border-emerald-400/40 hover:bg-emerald-400/5',
    sky: 'hover:border-sky-400/40 hover:bg-sky-400/5',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-4 bg-cult-black border border-cult-medium-gray text-cult-white font-bold uppercase tracking-wider text-sm transition-all duration-200 ${hoverMap[accentColor]}`}
    >
      {icon}
      {label}
    </button>
  );
}
