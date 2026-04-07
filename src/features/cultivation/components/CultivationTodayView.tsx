import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout, AlertTriangle, Clock, Calendar, ChevronRight, ChevronDown,
  Plus, ArrowRightLeft, ClipboardList, Leaf, Scissors,
} from 'lucide-react';
import { useCultivationToday, type AttentionItem } from '../hooks/useCultivationToday';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { useRoomSummaries } from '../hooks/useRoomSummaries';
import type { DailyTaskInstance, TaskType } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayDisplay(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  ipm_spray: 'IPM Spray', defoliation: 'Defoliation', transplant: 'Transplant',
  cleaning: 'Cleaning', harvest: 'Harvest', batch_tank_mix: 'Tank Mix',
  saturation_check: 'Saturation', irrigation_audit: 'Irrigation', scouting: 'Scouting',
  training: 'Training', clone_cutting: 'Clone Cut', maintenance: 'Maintenance',
  concentrate_mix: 'Conc. Mix', custom: 'Custom',
};

// ─── Attention Item Grouping ────────────────────────────────────────────────

interface AttentionGroup {
  key: string;
  type: AttentionItem['type'];
  room_name: string;
  items: AttentionItem[];
  totalPlants: number;
  strainBreakdown: { strain: string; count: number; plants: number }[];
}

function groupAttentionItems(items: AttentionItem[]): AttentionGroup[] {
  const map = new Map<string, AttentionGroup>();

  for (const item of items) {
    const room = item.room_name ?? 'Unknown';
    const key = `${room}::${item.type}`;

    let group = map.get(key);
    if (!group) {
      group = { key, type: item.type, room_name: room, items: [], totalPlants: 0, strainBreakdown: [] };
      map.set(key, group);
    }
    group.items.push(item);
    group.totalPlants += item.plant_count ?? 0;
  }

  // Build strain breakdowns
  for (const group of map.values()) {
    const strainMap = new Map<string, { count: number; plants: number }>();
    for (const item of group.items) {
      const strain = item.strain_name ?? 'Unknown';
      const entry = strainMap.get(strain) ?? { count: 0, plants: 0 };
      entry.count += 1;
      entry.plants += item.plant_count ?? 0;
      strainMap.set(strain, entry);
    }
    group.strainBreakdown = [...strainMap.entries()]
      .map(([strain, { count, plants }]) => ({ strain, count, plants }))
      .sort((a, b) => b.plants - a.plants);
  }

  return [...map.values()].sort((a, b) => b.items.length - a.items.length);
}

const ATTENTION_CONFIG: Record<AttentionItem['type'], {
  icon: typeof Scissors; bg: string; urgency: string; labelFn: (item?: AttentionItem) => string;
}> = {
  harvest_imminent: {
    icon: Scissors, bg: 'bg-cult-warning-muted border-cult-warning/30', urgency: 'text-cult-warning',
    labelFn: (item) => {
      const days = item?.estimated_harvest_date ? daysUntil(item.estimated_harvest_date) : null;
      return days != null && days <= 0 ? 'Harvest Due' : `Harvest in ${days}d`;
    },
  },
  stage_move_pending: {
    icon: ArrowRightLeft, bg: 'bg-cult-info-muted border-cult-info/30', urgency: 'text-cult-info',
    labelFn: (item) => `${item?.days_in_stage ?? 0}d in ${item?.growth_stage ?? 'stage'}`,
  },
  overdue_task: {
    icon: AlertTriangle, bg: 'bg-cult-danger-muted border-cult-danger/30', urgency: 'text-cult-danger',
    labelFn: () => 'Overdue',
  },
  unassigned_task: {
    icon: ClipboardList, bg: 'bg-cult-charcoal border-cult-medium-gray/40', urgency: 'text-cult-text-muted',
    labelFn: () => 'Unassigned',
  },
};

// ─── Grouped Attention Card ────────────────────────────────────────────────

function GroupedAttentionCard({ group }: { group: AttentionGroup }) {
  const [expanded, setExpanded] = useState(false);
  const config = ATTENTION_CONFIG[group.type];
  const Icon = config.icon;

  // Use the first item's data for the group-level label
  const groupLabel = group.type === 'harvest_imminent' ? 'Harvest Due' : config.labelFn(group.items[0]);
  const strainSummary = group.strainBreakdown.map(s => `${s.strain} (${s.plants})`).join(', ');

  return (
    <div className={`rounded border ${config.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.urgency}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-cult-white truncate">{group.room_name}</span>
            <span className={`text-[10px] font-medium ${config.urgency}`}>{groupLabel}</span>
          </div>
          <div className="text-[11px] text-cult-text-muted mt-0.5">
            {group.strainBreakdown.length} {group.strainBreakdown.length === 1 ? 'strain' : 'strains'} · {group.totalPlants} plants · {group.items.length} groups
          </div>
          <div className="text-[10px] text-cult-text-faint mt-0.5 truncate">{strainSummary}</div>
        </div>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-cult-medium-gray" />
          : <ChevronRight className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-cult-medium-gray" />
        }
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2 space-y-1.5">
          {group.strainBreakdown.map(({ strain, count, plants }) => (
            <div key={strain} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white/[0.02]">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-cult-lighter-gray font-medium">{strain}</span>
                <span className="text-[10px] text-cult-text-muted ml-1.5">
                  · {plants} plants · {count} {count === 1 ? 'group' : 'groups'}
                </span>
              </div>
              <span className={`text-[10px] font-medium flex-shrink-0 ${config.urgency}`}>
                {config.labelFn(group.items.find(i => i.strain_name === strain))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Row ───────────────────────────────────────────────────────────────

function TaskRow({ task, roomCodeMap }: { task: DailyTaskInstance; roomCodeMap: Map<string, string> }) {
  const roomCode = roomCodeMap.get(task.room_id) ?? task.room_id.slice(0, 8);
  const statusStyles: Record<string, string> = {
    completed: 'bg-cult-success-muted text-cult-success border-cult-success/30',
    in_progress: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30',
    pending: 'bg-cult-charcoal text-cult-text-muted border-cult-medium-gray/40',
    skipped: 'bg-cult-charcoal text-cult-text-faint border-cult-medium-gray/20',
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-cult-charcoal/40 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] font-medium text-cult-white">
          {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
        </span>
        <span className="text-[11px] text-cult-text-muted truncate">{roomCode}</span>
        {task.assigned_to && (
          <span className="text-[10px] text-cult-text-faint truncate">· {task.assigned_to}</span>
        )}
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 font-medium ${statusStyles[task.status] ?? statusStyles.pending}`}>
        {task.status === 'in_progress' ? 'active' : task.status}
      </span>
    </div>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-cult-charcoal border border-cult-medium-gray/40 rounded hover:bg-cult-charcoal/80 hover:border-cult-accent/40 transition-colors min-h-[44px]"
    >
      <Icon className="w-4 h-4 text-cult-accent" />
      <span className="text-[12px] font-medium text-cult-white">{label}</span>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CultivationTodayView() {
  const navigate = useNavigate();
  const today = todayIso();

  const { summary, loading: summaryLoading } = useCultivationToday();
  const { tasks, loading: tasksLoading } = useDailyTasks(today);
  const { summaries: roomSummaries } = useRoomSummaries();

  const roomCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    roomSummaries.forEach(s => map.set(s.room_id, s.room_code));
    return map;
  }, [roomSummaries]);

  const attentionItems = summary?.attention_items ?? [];
  const attentionGroups = useMemo(() => groupAttentionItems(attentionItems), [attentionItems]);

  const todaysTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const statusOrder: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, skipped: 3 };
      return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    });
  }, [tasks]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const active = tasks.filter(t => t.status === 'in_progress').length;
    return { total, completed, active, pending: total - completed - active };
  }, [tasks]);

  const loading = summaryLoading || tasksLoading;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Sprout className="w-6 h-6 text-cult-accent" />
          <div>
            <h1 className="text-[18px] font-semibold text-cult-white font-montserrat">Cultivation Today</h1>
            <p className="text-[12px] text-cult-text-muted">{todayDisplay()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cult-charcoal rounded border border-cult-medium-gray/40">
            <ClipboardList className="w-3.5 h-3.5 text-cult-accent" />
            <span className="text-cult-white font-medium">{taskStats.completed}/{taskStats.total}</span>
            <span className="text-cult-text-muted">tasks done</span>
          </div>
          {taskStats.active > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cult-warning-muted rounded border border-cult-warning/30">
              <Clock className="w-3.5 h-3.5 text-cult-warning" />
              <span className="text-cult-warning font-medium">{taskStats.active} active</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Attention Needed ───────────────────────────────────────────── */}
      {attentionGroups.length > 0 && (
        <section>
          <h2 className="text-[11px] text-cult-text-muted uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Attention Needed
            <span className="text-[10px] text-cult-warning font-semibold">({attentionItems.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attentionGroups.map(group => (
              <GroupedAttentionCard key={group.key} group={group} />
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-cult-charcoal rounded" />)}
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks — 2/3 width */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] text-cult-text-muted uppercase tracking-wider font-medium flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                Today's Tasks
              </h2>
              <button
                onClick={() => navigate('/cultivation-taskboard')}
                className="flex items-center gap-1 text-[11px] text-cult-accent hover:text-cult-accent/80 transition-colors"
              >
                Full board <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
              {todaysTasks.length === 0 ? (
                <p className="text-[12px] text-cult-text-faint py-4 text-center">No tasks scheduled for today.</p>
              ) : (
                <div>
                  {todaysTasks.map(t => (
                    <TaskRow key={t.id} task={t} roomCodeMap={roomCodeMap} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* This Week sidebar — 1/3 width */}
          <section>
            <h2 className="text-[11px] text-cult-text-muted uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              This Week
            </h2>
            <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4 space-y-3">
              {/* Room overview */}
              <div>
                <div className="text-[10px] text-cult-text-faint uppercase tracking-wider mb-1.5">Rooms</div>
                <div className="flex items-center gap-2">
                  <Leaf className="w-3.5 h-3.5 text-cult-success" />
                  <span className="text-[13px] font-semibold text-cult-white">{roomSummaries.length}</span>
                  <span className="text-[11px] text-cult-text-muted">active</span>
                </div>
              </div>

              {/* Plants summary */}
              <div>
                <div className="text-[10px] text-cult-text-faint uppercase tracking-wider mb-1.5">Plants</div>
                {roomSummaries.length === 0 ? (
                  <p className="text-[11px] text-cult-text-faint">No active rooms</p>
                ) : (
                  <div className="space-y-1">
                    {roomSummaries
                      .filter(s => s.total_plant_count > 0)
                      .sort((a, b) => b.total_plant_count - a.total_plant_count)
                      .slice(0, 6)
                      .map(s => (
                        <div key={s.room_id} className="flex items-center justify-between text-[11px]">
                          <span className="text-cult-lighter-gray truncate">{s.room_code}</span>
                          <span className="text-cult-text-muted tabular-nums">{s.total_plant_count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Upcoming harvests in sidebar */}
              {roomSummaries.some(s => s.earliest_projected_harvest) && (
                <div>
                  <div className="text-[10px] text-cult-text-faint uppercase tracking-wider mb-1.5">Next Harvests</div>
                  <div className="space-y-1">
                    {roomSummaries
                      .filter(s => s.earliest_projected_harvest && daysUntil(s.earliest_projected_harvest) >= 0)
                      .sort((a, b) => a.earliest_projected_harvest!.localeCompare(b.earliest_projected_harvest!))
                      .slice(0, 4)
                      .map(s => (
                        <div key={s.room_id} className="flex items-center justify-between text-[11px]">
                          <span className="text-cult-lighter-gray truncate">{s.room_code}</span>
                          <span className={`tabular-nums ${daysUntil(s.earliest_projected_harvest!) <= 3 ? 'text-cult-warning' : 'text-cult-text-muted'}`}>
                            {daysUntil(s.earliest_projected_harvest!)}d
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/cultivation-taskboard')}
                className="w-full flex items-center justify-center gap-1 text-[11px] text-cult-accent hover:text-cult-accent/80 pt-2 border-t border-cult-charcoal/40 transition-colors"
              >
                Week view <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] text-cult-text-muted uppercase tracking-wider font-medium mb-2">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction icon={Plus} label="Add Task" onClick={() => navigate('/cultivation-taskboard')} />
          <QuickAction icon={ArrowRightLeft} label="Move Plants" onClick={() => navigate('/cultivation-plants')} />
          <QuickAction icon={ClipboardList} label="Task Board" onClick={() => navigate('/cultivation-taskboard')} />
          <QuickAction icon={Calendar} label="Schedules" onClick={() => navigate('/cultivation-schedules')} />
        </div>
      </section>
    </div>
  );
}
