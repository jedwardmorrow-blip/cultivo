import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useGenerateTasksFromSchedules } from '../hooks';
import { useGrowRooms } from '../hooks';
import { getTaskTypeConfig } from '../types';
import { todayIso } from '../utils/dateUtils';
import type { ProjectedTaskEntry } from '../hooks';

const HIGH_LABOR_TASK_TYPES = new Set(['harvest', 'defoliation', 'transplant', 'ipm_spray']);
const COLLISION_HOURS_THRESHOLD = 10;
const COLLISION_COUNT_THRESHOLD = 3;

interface DayCollision {
  totalHighLaborHours: number;
  highLaborCount: number;
  isCollision: boolean;
  severity: 'none' | 'warning' | 'critical';
  tasks: ProjectedTaskEntry[];
}

interface WeekTaskGridProps {
  weekCount?: number;
}

function buildDayRange(startDateStr: string, days: number): string[] {
  const MS_PER_DAY = 86400000;
  const start = new Date(startDateStr + 'T00:00:00Z');
  return Array.from({ length: days }, (_, i) =>
    new Date(start.getTime() + i * MS_PER_DAY).toISOString().slice(0, 10),
  );
}

function formatDayHeader(dateStr: string, todayStr: string): { label: string; dayName: string; isToday: boolean; isWeekend: boolean } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const label = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  return {
    label,
    dayName,
    isToday: dateStr === todayStr,
    isWeekend: d.getDay() === 0 || d.getDay() === 6,
  };
}

export function WeekTaskGrid({ weekCount = 4 }: WeekTaskGridProps) {
  const { projectDays, projecting } = useGenerateTasksFromSchedules();
  const { rooms: dbRooms } = useGrowRooms();
  const [projectedTasks, setProjectedTasks] = useState<ProjectedTaskEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ tasks: ProjectedTaskEntry[]; dateStr: string; roomId: string } | null>(null);

  const today = todayIso();
  const days = weekCount * 7;
  const dayRange = useMemo(() => buildDayRange(today, days), [today, days]);

  useEffect(() => {
    setLoadError(null);
    projectDays(today, days)
      .then(setProjectedTasks)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load schedule'));
  }, [today, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const rooms = useMemo(
    () => dbRooms.map((r) => ({ id: r.id, name: r.name, room_code: r.room_code, room_type: r.room_type })),
    [dbRooms],
  );

  // Index: dateStr → roomId → tasks
  const taskIndex = useMemo(() => {
    const idx = new Map<string, Map<string, ProjectedTaskEntry[]>>();
    for (const t of projectedTasks) {
      if (!idx.has(t.dateStr)) idx.set(t.dateStr, new Map());
      const byRoom = idx.get(t.dateStr)!;
      if (!byRoom.has(t.roomId)) byRoom.set(t.roomId, []);
      byRoom.get(t.roomId)!.push(t);
    }
    return idx;
  }, [projectedTasks]);

  // Collision per day (across all rooms)
  const collisionByDay = useMemo(() => {
    const result = new Map<string, DayCollision>();
    for (const dateStr of dayRange) {
      const byRoom = taskIndex.get(dateStr);
      const allTasks: ProjectedTaskEntry[] = [];
      if (byRoom) {
        for (const tasks of byRoom.values()) allTasks.push(...tasks);
      }
      const highLabor = allTasks.filter((t) => HIGH_LABOR_TASK_TYPES.has(t.taskType));
      const totalHours = highLabor.reduce((sum, t) => sum + t.estimatedHours, 0);
      const isCollision = totalHours > COLLISION_HOURS_THRESHOLD || highLabor.length >= COLLISION_COUNT_THRESHOLD;
      result.set(dateStr, {
        totalHighLaborHours: totalHours,
        highLaborCount: highLabor.length,
        isCollision,
        severity: isCollision ? (totalHours > 16 || highLabor.length >= 5 ? 'critical' : 'warning') : 'none',
        tasks: highLabor,
      });
    }
    return result;
  }, [dayRange, taskIndex]);

  // Only show rooms that have at least one projected task
  const activeRooms = useMemo(
    () => rooms.filter((r) => projectedTasks.some((t) => t.roomId === r.id)),
    [rooms, projectedTasks],
  );

  if (projecting) {
    return (
      <div className="flex items-center justify-center py-16 text-cult-medium-gray gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading 4-week schedule…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 py-8 text-red-400 text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {loadError}
      </div>
    );
  }

  if (activeRooms.length === 0) {
    return (
      <div className="py-12 text-center text-cult-medium-gray text-sm">
        No active schedules found. Set up room schedules to see projections here.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-cult-medium-gray flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/50" />
          <span>Collision (≥{COLLISION_COUNT_THRESHOLD} high-labor tasks or &gt;{COLLISION_HOURS_THRESHOLD}h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
          <span>Critical collision</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-cult-accent/60" />
          <span>Today</span>
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto rounded-sm border border-cult-dark-gray">
        <table className="border-collapse text-xs min-w-max">
          {/* Day header */}
          <thead>
            <tr>
              {/* Room name column */}
              <th className="sticky left-0 z-10 bg-cult-graphite border-b border-r border-cult-dark-gray px-3 py-2 text-left font-semibold text-cult-light-gray uppercase tracking-wider min-w-[120px] whitespace-nowrap">
                Room
              </th>
              {dayRange.map((dateStr) => {
                const { label, dayName, isToday, isWeekend } = formatDayHeader(dateStr, today);
                const collision = collisionByDay.get(dateStr)!;
                const colBg =
                  collision.severity === 'critical'
                    ? 'bg-red-900/30'
                    : collision.severity === 'warning'
                      ? 'bg-amber-900/20'
                      : isToday
                        ? 'bg-cult-accent/10'
                        : isWeekend
                          ? 'bg-cult-charcoal/60'
                          : 'bg-cult-graphite';
                return (
                  <th
                    key={dateStr}
                    className={`border-b border-r border-cult-dark-gray px-1.5 py-1 text-center min-w-[72px] ${colBg}`}
                    title={
                      collision.isCollision
                        ? `⚠ ${collision.highLaborCount} high-labor tasks — ${collision.totalHighLaborHours.toFixed(1)}h total`
                        : undefined
                    }
                  >
                    <div className={`font-semibold ${isToday ? 'text-cult-accent' : isWeekend ? 'text-cult-medium-gray' : 'text-cult-light-gray'}`}>
                      {dayName}
                    </div>
                    <div className={`text-[10px] ${isToday ? 'text-cult-accent/70' : 'text-cult-medium-gray'}`}>{label}</div>
                    {collision.isCollision && (
                      <div
                        className={`mt-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          collision.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        {collision.totalHighLaborHours.toFixed(0)}h
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {activeRooms.map((room) => (
              <tr key={room.id} className="group">
                {/* Room name — sticky */}
                <td className="sticky left-0 z-10 bg-cult-graphite group-hover:bg-cult-charcoal/80 border-b border-r border-cult-dark-gray px-3 py-1.5 font-medium text-cult-white whitespace-nowrap">
                  {room.room_code}
                </td>

                {dayRange.map((dateStr) => {
                  const tasks = taskIndex.get(dateStr)?.get(room.id) ?? [];
                  const { isToday, isWeekend } = formatDayHeader(dateStr, today);
                  const collision = collisionByDay.get(dateStr)!;
                  const cellBg =
                    collision.severity === 'critical'
                      ? 'bg-red-900/20'
                      : collision.severity === 'warning'
                        ? 'bg-amber-900/10'
                        : isToday
                          ? 'bg-cult-accent/5'
                          : isWeekend
                            ? 'bg-cult-charcoal/40'
                            : 'bg-cult-graphite/40';

                  const isActive = tooltip?.dateStr === dateStr && tooltip?.roomId === room.id;

                  return (
                    <td
                      key={dateStr}
                      className={`border-b border-r border-cult-dark-gray px-1 py-1 align-top min-w-[72px] min-h-[36px] cursor-pointer hover:bg-cult-charcoal/60 transition-colors ${cellBg} ${isActive ? 'ring-1 ring-inset ring-cult-accent/50' : ''}`}
                      onClick={() =>
                        tasks.length > 0
                          ? setTooltip(isActive ? null : { tasks, dateStr, roomId: room.id })
                          : setTooltip(null)
                      }
                    >
                      {tasks.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {tasks.map((t, i) => {
                            const cfg = getTaskTypeConfig(t.taskType);
                            const isHighLabor = HIGH_LABOR_TASK_TYPES.has(t.taskType);
                            return (
                              <div
                                key={i}
                                className={`rounded-[2px] px-1 py-0.5 text-[9px] font-semibold truncate leading-tight ${isHighLabor ? 'ring-1 ring-inset ring-white/10' : ''}`}
                                style={{ backgroundColor: cfg.color + '33', color: cfg.color, borderLeft: `2px solid ${cfg.color}` }}
                                title={`${cfg.label} — ${t.estimatedHours}h`}
                              >
                                {cfg.label.length > 10 ? cfg.label.slice(0, 9) + '…' : cfg.label}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-[18px]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Task detail popover */}
      {tooltip && tooltip.tasks.length > 0 && (
        <div className="mt-3 p-3 bg-cult-charcoal border border-cult-dark-gray rounded-sm text-xs max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-cult-white">
              {rooms.find((r) => r.id === tooltip.roomId)?.room_code ?? 'Room'} —{' '}
              {new Date(tooltip.dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button type="button" onClick={() => setTooltip(null)} className="text-cult-medium-gray hover:text-cult-white text-base leading-none">×</button>
          </div>
          <div className="space-y-1.5">
            {tooltip.tasks.map((t, i) => {
              const cfg = getTaskTypeConfig(t.taskType);
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <span className="text-cult-light-gray">{cfg.label}</span>
                    {HIGH_LABOR_TASK_TYPES.has(t.taskType) && (
                      <span className="text-[9px] text-amber-400 font-semibold uppercase">HIGH</span>
                    )}
                  </div>
                  <span className="text-cult-medium-gray ml-3">{t.estimatedHours}h</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-cult-dark-gray text-cult-medium-gray">
            Total: {tooltip.tasks.reduce((s, t) => s + t.estimatedHours, 0).toFixed(1)}h
          </div>
        </div>
      )}
    </div>
  );
}
