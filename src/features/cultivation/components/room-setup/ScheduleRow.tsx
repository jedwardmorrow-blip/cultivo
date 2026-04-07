import { TASK_TYPE_CONFIG } from '../../types';
import type { RoomTaskSchedule } from '../../types';
import { PRIORITY_COLOR } from '../../constants/taskColors';
import { formatScheduleFrequency, DAY_NAMES } from '../../utils/roomCalendarUtils';

interface ScheduleRowProps {
  schedule: RoomTaskSchedule;
  onEdit: () => void;
}

export function ScheduleRow({ schedule, onEdit }: ScheduleRowProps) {
  const config = TASK_TYPE_CONFIG[schedule.task_type] ?? TASK_TYPE_CONFIG.custom;
  const isPhaseDay = schedule.scheduling_mode === 'phase_day';
  const frequency = formatScheduleFrequency(schedule);

  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left bg-cult-near-black border border-cult-dark-gray/60 hover:border-cult-medium-gray p-4 transition-all hover:bg-cult-charcoal/40 group rounded-sm"
    >
      {/* Top row: task name + badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-black/20"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs font-bold text-cult-white uppercase tracking-wider">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isPhaseDay && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400 bg-violet-950/40 rounded-sm border border-violet-800/30">
              Phase
            </span>
          )}
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cult-light-gray bg-cult-charcoal/80 rounded-sm border border-cult-dark-gray/40">
            {schedule.recurrence}
          </span>
          {schedule.priority === 'high' && (
            <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLOR.high.badge}`}>
              High
            </span>
          )}
        </div>
      </div>

      {/* Frequency description */}
      <div className="text-[11px] text-cult-medium-gray mb-2" style={{ color: `${config.color}99` }}>
        {frequency}
      </div>

      {/* Day-of-week pills — calendar mode only */}
      {!isPhaseDay && schedule.day_of_week && schedule.day_of_week.length > 0 && (
        <div className="flex gap-1">
          {DAY_NAMES.map((name, idx) => {
            const active = schedule.day_of_week!.includes(idx);
            return (
              <span
                key={idx}
                className={`w-7 h-6 flex items-center justify-center text-[10px] font-bold uppercase rounded-sm transition-colors ${
                  active
                    ? 'text-white bg-cult-medium-gray/60 border border-cult-medium-gray/40'
                    : 'text-cult-dark-gray/50 border border-transparent'
                }`}
                style={active ? { color: config.color } : undefined}
              >
                {name.charAt(0)}
              </span>
            );
          })}
        </div>
      )}

      {/* End date indicator (calendar mode) */}
      {schedule.end_date && (
        <div className="mt-2 text-[10px] text-cult-warning/70">
          Stops {new Date(schedule.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {/* Notes */}
      {schedule.notes && (
        <div className={`${schedule.end_date ? 'mt-1' : 'mt-2'} text-xs text-cult-medium-gray truncate`}>{schedule.notes}</div>
      )}
    </button>
  );
}
