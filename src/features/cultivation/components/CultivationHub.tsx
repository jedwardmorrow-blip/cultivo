import { useMemo } from 'react';
import { Sprout, Calendar, Clock, Leaf, LayoutGrid } from 'lucide-react';
import { HubShell } from '@/features/hub/components/HubShell';
import { HubSection } from '@/shared/components/HubSection';
import { useRoomSummaries } from '../hooks/useRoomSummaries';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useHarvestMetrics } from '../hooks/useHarvestMetrics';
import type { RoomSummary, DailyTaskInstance, TaskType } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  ipm_spray: 'IPM Spray',
  defoliation: 'Defoliation',
  transplant: 'Transplant',
  cleaning: 'Cleaning',
  harvest: 'Harvest',
  batch_tank_mix: 'Tank Mix',
  saturation_check: 'Saturation',
  irrigation_audit: 'Irrigation',
  scouting: 'Scouting',
  training: 'Training',
  clone_cutting: 'Clone Cut',
  maintenance: 'Maintenance',
  concentrate_mix: 'Conc. Mix',
  custom: 'Custom',
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  flower: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  veg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  clone: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  mother: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  mixed: 'bg-cult-surface-raised text-cult-text-muted border-cult-border',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function RoomSummaryMini({ summary }: { summary: RoomSummary }) {
  const dominantStage = useMemo(() => {
    if (!summary.groups.length) return summary.room_type;
    const counts: Record<string, number> = {};
    for (const g of summary.groups) {
      counts[g.stage] = (counts[g.stage] ?? 0) + g.plant_count;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? summary.room_type;
  }, [summary.groups, summary.room_type]);

  const avgDays = useMemo(() => {
    if (!summary.groups.length) return 0;
    const total = summary.groups.reduce((s, g) => s + g.days_in_stage * g.plant_count, 0);
    const plants = summary.groups.reduce((s, g) => s + g.plant_count, 0);
    return plants > 0 ? Math.round(total / plants) : 0;
  }, [summary.groups]);

  const chipClass = ROOM_TYPE_COLORS[dominantStage] ?? ROOM_TYPE_COLORS.mixed;

  return (
    <div className="bg-cult-surface border border-cult-surface-raised rounded-cult p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-cult-text-primary font-mono truncate">
          {summary.room_code}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${chipClass}`}>
          {dominantStage}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-cult-text-muted">
        <span className="flex items-center gap-1">
          <Leaf className="w-3 h-3" />
          {summary.total_plant_count}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {avgDays}d
        </span>
        <span className="truncate text-cult-text-faint">{summary.strains.length} strain{summary.strains.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function HarvestCountdownRow({ roomCode, strain, projectedDate }: { roomCode: string; strain: string; projectedDate: string }) {
  const days = daysUntil(projectedDate);
  const chipColor = days <= 7 ? 'bg-cult-warning-muted text-cult-warning border-cult-warning/30'
    : days <= 14 ? 'bg-cult-info-muted text-cult-info border-cult-info/30'
    : 'bg-cult-surface-raised text-cult-text-muted border-cult-border';
  const formattedDate = new Date(projectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-cult-surface-raised/50 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] font-medium text-cult-text-primary font-mono">{roomCode}</span>
        <span className="text-[11px] text-cult-text-muted truncate">{strain}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-cult-text-faint">{formattedDate}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${chipColor}`}>
          {days <= 0 ? 'due' : `${days}d`}
        </span>
      </div>
    </div>
  );
}

function TaskQueueMini({ tasks, roomCodeMap }: { tasks: DailyTaskInstance[]; roomCodeMap: Map<string, string> }) {
  const active = tasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .slice(0, 5);

  if (!active.length) {
    return (
      <p className="text-[12px] text-cult-text-faint py-2">No pending tasks today.</p>
    );
  }

  return (
    <div className="space-y-0">
      {active.map(t => {
        const roomCode = roomCodeMap.get(t.room_id) ?? t.room_id.slice(0, 8);
        const statusColor = t.status === 'in_progress' ? 'bg-cult-warning-muted text-cult-warning border-cult-warning/30'
          : 'bg-cult-surface-raised text-cult-text-muted border-cult-border';
        return (
          <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-cult-surface-raised/50 last:border-b-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] font-medium text-cult-text-primary">
                {TASK_TYPE_LABELS[t.task_type] ?? t.task_type}
              </span>
              <span className="text-[11px] text-cult-text-muted">{roomCode}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${statusColor}`}>
              {t.status === 'in_progress' ? 'active' : 'pending'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CultivationHub() {
  const today = todayIso();
  const { summaries, loading: roomsLoading } = useRoomSummaries();
  const { tasks, loading: tasksLoading } = useDailyTasks(today);
  const { groups } = usePlantGroups({ stage: 'active' });
  const { rows: harvestRows } = useHarvestMetrics();

  const plantsInVegFlower = useMemo(
    () => groups
      .filter(g => g.growth_stage === 'veg' || g.growth_stage === 'flower')
      .reduce((s, g) => s + g.plant_count, 0),
    [groups],
  );

  const harvestsThisWeek = useMemo(() => {
    const { start, end } = getWeekBounds();
    return harvestRows.filter(r => r.harvest_date >= start && r.harvest_date <= end).length;
  }, [harvestRows]);

  const upcomingHarvests = useMemo(() => {
    return summaries
      .filter(s => s.earliest_projected_harvest)
      .map(s => ({
        roomCode: s.room_code,
        strain: s.strains.map(st => st.name).join(', ') || '—',
        projectedDate: s.earliest_projected_harvest!,
      }))
      .filter(h => daysUntil(h.projectedDate) >= 0)
      .sort((a, b) => a.projectedDate.localeCompare(b.projectedDate))
      .slice(0, 8);
  }, [summaries]);

  const roomCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    summaries.forEach(s => map.set(s.room_id, s.room_code));
    return map;
  }, [summaries]);

  const kpis = [
    { label: 'Active Rooms', value: roomsLoading ? '—' : String(summaries.length) },
    { label: 'Plants in Veg/Flower', value: String(plantsInVegFlower) },
    { label: 'Harvests This Week', value: String(harvestsThisWeek) },
  ];

  return (
    <HubShell section="Cultivation" icon={Sprout} kpis={kpis}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HubSection label="Active Rooms" icon={LayoutGrid}>
          {roomsLoading ? (
            <div className="animate-pulse space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-cult-surface rounded-cult" />)}
            </div>
          ) : summaries.length === 0 ? (
            <p className="text-[12px] text-cult-text-faint py-2">No active rooms.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {summaries.map(s => <RoomSummaryMini key={s.room_id} summary={s} />)}
            </div>
          )}
        </HubSection>

        <HubSection label="Upcoming Harvests" icon={Calendar}>
          {upcomingHarvests.length === 0 ? (
            <p className="text-[12px] text-cult-text-faint py-2">No upcoming harvests scheduled.</p>
          ) : (
            <div>
              {upcomingHarvests.map((h, i) => (
                <HarvestCountdownRow
                  key={`${h.roomCode}-${i}`}
                  roomCode={h.roomCode}
                  strain={h.strain}
                  projectedDate={h.projectedDate}
                />
              ))}
            </div>
          )}
        </HubSection>

        <div className="lg:col-span-2">
          <HubSection label="Today's Task Queue" icon={Clock}>
            {tasksLoading ? (
              <div className="animate-pulse space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-cult-surface rounded-cult" />)}
              </div>
            ) : (
              <TaskQueueMini tasks={tasks} roomCodeMap={roomCodeMap} />
            )}
          </HubSection>
        </div>
      </div>
    </HubShell>
  );
}
