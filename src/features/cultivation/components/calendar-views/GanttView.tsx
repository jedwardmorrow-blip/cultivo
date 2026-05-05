import type { RoomTaskSchedule, TaskType } from '../../types';
import { getTaskTypeConfig } from '../../types';
import { ROOM_TYPE_META } from '../../constants/taskColors';
import type { RoomCalendarRoom } from '../../utils/roomCalendarUtils';
import { Plus } from 'lucide-react';

export interface GanttViewProps {
  days: { num: number; date: Date; iso: string; dayOfWeek: string; isWeekend: boolean }[];
  today: string;
  roomsByType: { type: string; meta: typeof ROOM_TYPE_META[string]; rooms: RoomCalendarRoom[] }[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
  getDotsForCell: (roomId: string, date: Date) => TaskType[];
  onOpenEditor: (state: { roomId: string; roomCode: string }) => void;
  todayRef: React.RefObject<HTMLTableCellElement | null>;
}

export function GanttView({ days, today, roomsByType, schedulesByRoom, getDotsForCell, onOpenEditor, todayRef }: GanttViewProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide rounded-sm border border-cult-surface/50">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-cult-surface-raised/30">
            <th className="sticky left-0 z-20 bg-cult-surface text-left px-4 py-2.5 text-xs text-cult-border uppercase tracking-wider font-semibold w-32 border-r border-cult-surface/50">
              Room
            </th>
            {days.map((d) => {
              const isToday = d.iso === today;
              return (
                <th
                  key={d.num}
                  ref={isToday ? todayRef : undefined}
                  className={`px-0 py-2 text-center min-w-[32px] transition-colors ${
                    isToday
                      ? 'bg-cult-success-muted'
                      : d.isWeekend
                        ? 'bg-cult-surface-raised/15'
                        : ''
                  }`}
                >
                  <div className={`text-xs uppercase tracking-wider font-semibold ${
                    isToday ? 'text-cult-success' : d.isWeekend ? 'text-cult-surface' : 'text-cult-border'
                  }`}>
                    {d.dayOfWeek}
                  </div>
                  <div className={`text-xs font-mono font-bold ${
                    isToday ? 'text-cult-success' : 'text-cult-border'
                  }`}>
                    {d.num}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {roomsByType.map((group) => (
            <>
              {/* Room type section header */}
              <tr key={`header-${group.type}`}>
                <td
                  colSpan={days.length + 1}
                  className={`px-4 py-1.5 ${group.bg} border-y ${group.border}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.meta.color }}
                    />
                    <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: group.meta.color }}>
                      {group.meta.label}
                    </span>
                    <span className="text-xs text-cult-border">
                      {group.rooms.length} room{group.rooms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
              </tr>

              {group.rooms.map((room) => {
                const roomSchedules = schedulesByRoom.get(room.id) ?? [];
                const hasSchedules = roomSchedules.length > 0;

                return (
                  <tr
                    key={room.id}
                    className="group border-b border-cult-surface/30 hover:bg-cult-surface-raised/25 cursor-pointer transition-colors"
                    onClick={() => onOpenEditor({ roomId: room.id, roomCode: room.room_code })}
                  >
                    <td className="sticky left-0 z-10 bg-cult-surface group-hover:bg-cult-surface-raised/60 px-4 py-2 border-r border-cult-surface/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cult-text-primary">
                            {room.room_code}
                          </span>
                          {!hasSchedules && (
                            <span className="text-xs text-cult-warning/80 font-semibold uppercase tracking-wider">
                              No tasks
                            </span>
                          )}
                        </div>
                        <Plus className="w-3 h-3 text-cult-surface group-hover:text-cult-border transition-colors" />
                      </div>
                      {hasSchedules && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {Array.from(new Set(roomSchedules.map(s => s.task_type))).slice(0, 5).map(t => (
                            <span
                              key={t}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: getTaskTypeConfig(t).color }}
                            />
                          ))}
                          <span className="text-xs text-cult-surface ml-0.5">
                            {roomSchedules.length}
                          </span>
                        </div>
                      )}
                    </td>

                    {days.map((d) => {
                      const dots = getDotsForCell(room.id, d.date);
                      const isToday = d.iso === today;

                      return (
                        <td
                          key={d.num}
                          className={`px-0 py-1 text-center transition-colors ${
                            isToday
                              ? 'bg-cult-success-muted'
                              : d.isWeekend
                                ? 'bg-cult-surface-raised/10'
                                : ''
                          }`}
                        >
                          {dots.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-[2px] px-0.5">
                              {dots.slice(0, 4).map((t) => {
                                const cfg = getTaskTypeConfig(t);
                                const initial = cfg.label.charAt(0).toUpperCase();
                                return (
                                  <span
                                    key={t}
                                    className="flex items-center justify-center w-[14px] h-[14px] rounded-sm text-[8px] font-bold leading-none"
                                    style={{ backgroundColor: `${cfg.color}25`, color: cfg.color }}
                                    title={cfg.label}
                                  >
                                    {initial}
                                  </span>
                                );
                              })}
                            </div>
                          ) : hasSchedules ? (
                            /* Room has schedules but none fire on this day — subtle dash */
                            <span className="block mx-auto w-2 h-px bg-cult-surface/40" />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
