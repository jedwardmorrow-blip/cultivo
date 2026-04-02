import { X, Pencil } from 'lucide-react';
import type { TaskType, RoomTaskSchedule } from '../../types';
import { getTaskTypeConfig } from '../../types';
import { ROOM_TYPE_HEX } from '../../constants/taskColors';
import type { RoomCalendarRoom } from '../../utils/roomCalendarUtils';

interface DayDetailPanelProps {
  date: Date;
  breakdown: { room: RoomCalendarRoom; taskTypes: TaskType[]; schedules: RoomTaskSchedule[] }[];
  onClose: () => void;
  onEditRoom?: (roomId: string, roomCode: string) => void;
}

export function DayDetailPanel({ date, breakdown, onClose, onEditRoom }: DayDetailPanelProps) {
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="bg-cult-charcoal/40 border-b border-cult-dark-gray/50 px-3 sm:px-5 py-3 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-cult-white">{dateLabel}</span>
          <span className="text-xs text-cult-medium-gray font-mono">
            {breakdown.length} room{breakdown.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -m-1 hover:bg-cult-charcoal rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-4 h-4 text-cult-medium-gray" />
        </button>
      </div>

      {breakdown.length === 0 ? (
        <p className="text-xs text-cult-medium-gray italic py-2">No scheduled tasks for this day.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {breakdown.map(({ room, taskTypes, schedules: daySchedules }) => (
            <div
              key={room.id}
              className="bg-cult-near-black border border-cult-dark-gray/50 border-l-2 p-2.5 group/card"
              style={{ borderLeftColor: ROOM_TYPE_HEX[room.room_type] ?? '#6B7280' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cult-white">{room.room_code}</span>
                  <span className="text-xs text-cult-medium-gray uppercase">{room.room_type}</span>
                </div>
                {onEditRoom && (
                  <button
                    type="button"
                    onClick={() => onEditRoom(room.id, room.room_code)}
                    className="p-1.5 opacity-0 group-hover/card:opacity-100 hover:bg-cult-charcoal rounded transition-all"
                    title="Edit schedule"
                  >
                    <Pencil className="w-3 h-3 text-cult-medium-gray hover:text-cult-white" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {taskTypes.map((t) => {
                  const cfg = getTaskTypeConfig(t);
                  // Find the schedule for detail
                  const sched = daySchedules.find((s) => s.task_type === t);
                  return (
                    <div
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium"
                      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                      {sched?.priority === 'high' && (
                        <span className="text-[9px] font-bold text-amber-400 ml-0.5">!</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
