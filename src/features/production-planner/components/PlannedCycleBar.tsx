import type { CalendarPlannedEntry } from '../types';

interface PlannedCycleBarProps {
  entry: CalendarPlannedEntry;
  startDate: Date;
  dayWidth: number;
  top: number;
  onClick: (entry: CalendarPlannedEntry) => void;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

const STATUS_OPACITY: Record<string, number> = {
  draft: 0.4,
  committed: 0.65,
  active: 0.8,
  cancelled: 0.2,
  completed: 0.3,
};

export function PlannedCycleBar({ entry, startDate, dayWidth, top, onClick }: PlannedCycleBarProps) {
  // Use the earliest meaningful date as bar start
  const barStartDate = new Date(
    entry.clone_cut_date ?? entry.veg_start_date ?? entry.flower_start_date
  );
  const barEndDate = new Date(entry.estimated_harvest_date);

  const barLeft = daysBetween(startDate, barStartDate) * dayWidth;
  const barWidth = Math.max(daysBetween(barStartDate, barEndDate) * dayWidth, 14);
  const opacity = STATUS_OPACITY[entry.status] ?? 0.4;

  const yieldLabel = entry.forecast_yield_grams
    ? ` · ${(entry.forecast_yield_grams / 1000).toFixed(1)}kg`
    : '';
  const title = `[PLAN] ${entry.strain_name} — ${entry.planned_plant_count}p · ${entry.status}${yieldLabel}`;

  return (
    <div
      className="absolute rounded-sm cursor-pointer transition-opacity hover:opacity-90"
      style={{
        left: Math.max(barLeft, 0),
        top,
        width: barWidth,
        height: 8,
        opacity,
        backgroundColor: '#7C3AED', // indigo-600 — distinct from stage colors
        border: '1px dashed #A78BFA',
        boxSizing: 'border-box',
      }}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick(entry);
      }}
    />
  );
}
