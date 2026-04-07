import type { RoomTaskSchedule } from '../../types';
import { TASK_TYPE_CONFIG } from '../../types';
import { ROOM_TYPE_META } from '../../constants/taskColors';
import type { RoomCalendarRoom } from '../../utils/roomCalendarUtils';

export interface CopyFromRoomPickerProps {
  targetRoomId: string;
  targetRoomCode: string;
  allRooms: RoomCalendarRoom[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
  copying: boolean;
  copySuccess: string | null;
  onCopy: (sourceRoomId: string) => void;
  onCancel: () => void;
}

export function CopyFromRoomPicker({ targetRoomId, targetRoomCode, allRooms, schedulesByRoom, copying, copySuccess, onCopy, onCancel }: CopyFromRoomPickerProps) {
  const roomsWithSchedules = allRooms.filter(
    (r) => r.id !== targetRoomId && (schedulesByRoom.get(r.id) ?? []).length > 0
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-cult-info uppercase tracking-wider">Copy schedules to {targetRoomCode}</p>
          <p className="text-xs text-cult-dark-gray mt-0.5">Select a source room below</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors"
        >
          Cancel
        </button>
      </div>

      {roomsWithSchedules.length === 0 ? (
        <p className="text-xs text-cult-medium-gray py-4 text-center">No other rooms have schedules to copy from</p>
      ) : (
        <div className="space-y-1.5">
          {roomsWithSchedules.map((room) => {
            const roomSchedules = schedulesByRoom.get(room.id) ?? [];
            const meta = ROOM_TYPE_META[room.room_type] ?? ROOM_TYPE_META.mixed;
            return (
              <button
                key={room.id}
                type="button"
                disabled={copying}
                onClick={() => onCopy(room.id)}
                className="w-full text-left bg-cult-charcoal/30 border border-cult-dark-gray/60 hover:border-cult-info/40 hover:bg-cult-info-muted p-3 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs font-bold text-cult-white uppercase tracking-wider font-mono">{room.room_code}</span>
                    <span className={`px-1.5 py-0.5 text-xs uppercase tracking-wider rounded-sm ${meta.bg} ${meta.border} border`} style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs text-cult-medium-gray">
                    {roomSchedules.length} schedule{roomSchedules.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {roomSchedules.map((s) => {
                    const cfg = TASK_TYPE_CONFIG[s.task_type] ?? TASK_TYPE_CONFIG.custom;
                    return (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-sm"
                        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {cfg.label}
                        <span className="text-cult-dark-gray ml-0.5">{s.recurrence === 'daily' ? 'D' : s.recurrence === 'weekly' ? 'W' : s.recurrence === 'biweekly' ? 'B' : 'M'}</span>
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {copying && (
        <p className="text-xs text-cult-info text-center animate-pulse">Copying schedules...</p>
      )}

      {copySuccess && (
        <p className="text-xs text-cult-success text-center">{copySuccess}</p>
      )}
    </div>
  );
}
