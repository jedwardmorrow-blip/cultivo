import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, Users, Clock, CheckCircle2, Circle } from 'lucide-react';
import { getTaskTypeConfig } from '../types';
import type { TaskCardData, StaffOption } from './TaskCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse estimated_duration string → fractional hours.
 *  Accepts "1.5h", "90m", "90min", bare numbers (treated as hours). */
function parseDurationHours(raw: string | null): number {
  if (!raw) return 0;
  const lower = raw.toLowerCase().trim();
  // explicit minutes: "90m" or "90min"
  const minMatch = lower.match(/^([\d.]+)\s*m(?:in)?$/);
  if (minMatch) return parseFloat(minMatch[1]) / 60;
  // explicit hours: "1.5h" or "1.5hr" or "1.5 hours"
  const hrMatch = lower.match(/^([\d.]+)\s*h/);
  if (hrMatch) return parseFloat(hrMatch[1]);
  // bare number → treat as hours
  const bare = parseFloat(lower.replace(/[^0-9.]/g, ''));
  return isNaN(bare) ? 0 : bare;
}

function formatHours(h: number): string {
  if (h === 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-500',
  in_progress: 'bg-amber-400',
  pending: 'bg-cult-dark-gray',
  skipped: 'bg-cult-medium-gray',
  carry_forward: 'bg-violet-500',
};

// ─── Sub-component: single staff row ─────────────────────────────────────────

interface StaffRowProps {
  staffId: string | null;
  displayName: string;
  tasks: TaskCardData[];
  allStaff: StaffOption[];
  capacityHours: number;
  onAssignWorker: (taskId: string, staffId: string) => Promise<void>;
}

function StaffRow({ staffId, displayName, tasks, allStaff, capacityHours, onAssignWorker }: StaffRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const totalHours = useMemo(
    () => tasks.reduce((sum, t) => sum + parseDurationHours(t.estimated_duration), 0),
    [tasks],
  );

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const isOverAllocated = capacityHours > 0 && totalHours > capacityHours;
  const utilizationPct = capacityHours > 0 ? Math.min((totalHours / capacityHours) * 100, 100) : 0;

  const barColor = isOverAllocated
    ? 'bg-red-500'
    : totalHours > capacityHours * 0.8
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  async function handleReassign(taskId: string, newStaffId: string) {
    setAssigning(taskId);
    try {
      await onAssignWorker(taskId, newStaffId);
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className={`border rounded-sm ${isOverAllocated ? 'border-red-600/50 bg-red-950/20' : 'border-cult-dark-gray bg-cult-graphite'}`}>
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${staffId ? 'bg-cult-accent/20 text-cult-accent' : 'bg-cult-charcoal text-cult-medium-gray'}`}>
          {staffId ? displayName.charAt(0).toUpperCase() : '?'}
        </div>

        {/* Name + counts */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cult-off-white truncate">{displayName}</span>
            {isOverAllocated && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-950/60 border border-red-600/40 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" />
                OVER
              </span>
            )}
          </div>
          {/* Utilization bar */}
          {capacityHours > 0 && totalHours > 0 && (
            <div className="mt-1 h-1 rounded-full bg-cult-charcoal overflow-hidden w-full max-w-[160px]">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-cult-medium-gray">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
            {completedCount}/{tasks.length}
          </span>
          {totalHours > 0 && (
            <span className={`flex items-center gap-1 ${isOverAllocated ? 'text-red-400' : ''}`}>
              <Clock className="w-3 h-3" />
              {formatHours(totalHours)}
              {capacityHours > 0 && <span className="text-cult-dark-gray">/{formatHours(capacityHours)}</span>}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded task list */}
      {expanded && (
        <div className="border-t border-cult-dark-gray/60 divide-y divide-cult-dark-gray/40">
          {tasks.map((task) => {
            const cfg = getTaskTypeConfig(task.task_type);
            return (
              <div key={task.id} className="flex items-center gap-2.5 px-3 py-2">
                {/* Status dot */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] ?? 'bg-cult-dark-gray'}`}
                />

                {/* Task type badge */}
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0"
                  style={{ color: cfg.color, borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}15` }}
                >
                  {cfg.label}
                </span>

                {/* Room */}
                <span className="text-xs text-cult-medium-gray truncate flex-1">{task.room_name}</span>

                {/* Duration */}
                {task.estimated_duration && (
                  <span className="text-xs text-cult-medium-gray flex-shrink-0">
                    {formatHours(parseDurationHours(task.estimated_duration))}
                  </span>
                )}

                {/* Reassign dropdown */}
                <select
                  disabled={assigning === task.id}
                  value={task.assigned_to ?? ''}
                  onChange={(e) => { if (e.target.value) void handleReassign(task.id, e.target.value); }}
                  className="text-xs bg-cult-charcoal border border-cult-dark-gray text-cult-light-gray rounded-sm px-1.5 py-1 flex-shrink-0 max-w-[120px] disabled:opacity-50"
                  title="Reassign task"
                >
                  <option value="">Unassigned</option>
                  {allStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StaffCapacityPanelProps {
  tasks: TaskCardData[];
  allStaff: StaffOption[];
  onAssignWorker: (taskId: string, staffId: string) => Promise<void>;
  /** Default capacity threshold in hours. 0 = unlimited / no indicator. */
  defaultCapacityHours?: number;
}

export function StaffCapacityPanel({ tasks, allStaff, onAssignWorker, defaultCapacityHours = 8 }: StaffCapacityPanelProps) {
  const [capacityHours, setCapacityHours] = useState(defaultCapacityHours);

  // Group tasks by assigned_to
  const groups = useMemo(() => {
    const map = new Map<string | null, TaskCardData[]>();
    // Ensure every present staff member gets a slot (even if 0 tasks)
    for (const s of allStaff) {
      if (!map.has(s.id)) map.set(s.id, []);
    }
    for (const t of tasks) {
      const key = t.assigned_to ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks, allStaff]);

  // Sort: unassigned last, then by total estimated hours desc
  const sortedEntries = useMemo(() => {
    return [...groups.entries()].sort(([aId, aT], [bId, bT]) => {
      if (aId === null && bId !== null) return 1;
      if (aId !== null && bId === null) return -1;
      const aH = aT.reduce((s, t) => s + parseDurationHours(t.estimated_duration), 0);
      const bH = bT.reduce((s, t) => s + parseDurationHours(t.estimated_duration), 0);
      return bH - aH;
    });
  }, [groups]);

  const overAllocatedCount = sortedEntries.filter(([id, t]) => {
    if (!id || capacityHours <= 0) return false;
    return t.reduce((s, task) => s + parseDurationHours(task.estimated_duration), 0) > capacityHours;
  }).length;

  const totalAssigned = tasks.filter((t) => t.assigned_to).length;
  const totalUnassigned = tasks.filter((t) => !t.assigned_to).length;

  return (
    <div className="space-y-3">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cult-accent" />
          <span className="text-sm font-semibold text-cult-off-white">Staff Capacity</span>
          {overAllocatedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-950/60 border border-red-600/40 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" />
              {overAllocatedCount} overallocated
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-cult-medium-gray">
          <span className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-cult-medium-gray" />
            {totalUnassigned} unassigned
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
            {totalAssigned} assigned
          </span>
          {/* Capacity threshold control */}
          <label className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3" />
            Cap:
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={capacityHours}
              onChange={(e) => setCapacityHours(parseFloat(e.target.value) || 0)}
              className="w-14 bg-cult-charcoal border border-cult-dark-gray text-cult-light-gray rounded-sm px-1.5 py-0.5 text-xs text-center"
              title="Daily capacity threshold (hours)"
            />
            h
          </label>
        </div>
      </div>

      {/* Staff rows */}
      <div className="space-y-2">
        {sortedEntries.map(([staffId, staffTasks]) => {
          const member = allStaff.find((s) => s.id === staffId);
          const displayName = staffId
            ? (member?.first_name ?? staffId.slice(0, 8))
            : 'Unassigned';
          // skip staff with 0 tasks to keep the list clean, unless overallocated
          if (staffTasks.length === 0) return null;
          return (
            <StaffRow
              key={staffId ?? '__unassigned__'}
              staffId={staffId}
              displayName={displayName}
              tasks={staffTasks}
              allStaff={allStaff}
              capacityHours={staffId ? capacityHours : 0}
              onAssignWorker={onAssignWorker}
            />
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-cult-medium-gray text-sm">
            No tasks for this date.
          </div>
        )}
      </div>
    </div>
  );
}
