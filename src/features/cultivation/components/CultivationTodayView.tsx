import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout, AlertTriangle, Clock, Calendar, ChevronRight,
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

// ─── Attention Card ─────────────────────────────────────────────────────────

function AttentionCard({ item }: { item: AttentionItem }) {
  const isHarvest = item.type === 'harvest_imminent';
  const days = isHarvest && item.estimated_harvest_date ? daysUntil(item.estimated_harvest_date) : null;

  const config = {
    harvest_imminent: {
      icon: Scissors, bg: 'bg-amber-900/20 border-amber-500/30',
      label: days != null && days <= 0 ? 'Harvest Due' : `Harvest in ${days}d`,
      urgency: 'text-amber-400',
    },
    stage_move_pending: {
      icon: ArrowRightLeft, bg: 'bg-sky-900/20 border-sky-500/30',
      label: `${item.days_in_stage ?? 0}d in ${item.growth_stage ?? 'stage'}`,
      urgency: 'text-sky-400',
    },
    overdue_task: {
      icon: AlertTriangle, bg: 'bg-red-900/20 border-red-500/30',
      label: 'Overdue',
      urgency: 'text-red-400',
    },
    unassigned_task: {
      icon: ClipboardList, bg: 'bg-cult-charcoal border-cult-medium-gray/40',
      label: 'Unassigned',
      urgency: 'text-cult-text-muted',
    },
  }[item.type];

  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded border ${config.bg}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.urgency}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-cult-white truncate">
            {item.plant_group_name ?? item.room_name ?? 'Unknown'}
          </span>
          <span className={`text-[10px] font-medium ${config.urgency}`}>{config.label}</span>
        </div>
        <div className="text-[11px] text-cult-text-muted mt-0.5">
          {item.strain_name && <span>{item.strain_name}</span>}
          {item.room_name && item.strain_name && <span> · </span>}
          {item.room_name && <span>{item.room_name}</span>}
          {item.plant_count != null && <span> · {item.plant_count} plants</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Task Row ───────────────────────────────────────────────────────────────

function TaskRow({ task, roomCodeMap }: { task: DailyTaskInstance; roomCodeMap: Map<string, string> }) {
  const roomCode = roomCodeMap.get(task.room_id) ?? task.room_id.slice(0, 8);
  const statusStyles: Record<string, string> = {
    completed: 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30',
    in_progress: 'bg-amber-900/20 text-amber-400 border-amber-500/30',
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/20 rounded border border-amber-500/30">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-medium">{taskStats.active} active</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Attention Needed ───────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <section>
          <h2 className="text-[11px] text-cult-text-muted uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Attention Needed
            <span className="text-[10px] text-amber-400 font-semibold">({attentionItems.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attentionItems.map((item, i) => (
              <AttentionCard key={`${item.type}-${item.plant_group_id ?? i}`} item={item} />
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
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
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
                          <span className={`tabular-nums ${daysUntil(s.earliest_projected_harvest!) <= 3 ? 'text-amber-400' : 'text-cult-text-muted'}`}>
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
