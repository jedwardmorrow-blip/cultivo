interface RoomCapacityBarProps {
  currentCount: number;
  capacity: number | null;
  className?: string;
}

export function RoomCapacityBar({ currentCount, capacity, className = '' }: RoomCapacityBarProps) {
  if (capacity === null || capacity <= 0) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className="text-xs text-cult-medium-gray font-mono">{currentCount} plants</span>
      </div>
    );
  }

  const pct = Math.min(Math.round((currentCount / capacity) * 100), 100);
  const barColor =
    pct >= 90 ? 'bg-cult-danger' :
    pct >= 70 ? 'bg-cult-warning' :
    'bg-cult-success';
  const textColor =
    pct >= 90 ? 'text-cult-danger' :
    pct >= 70 ? 'text-cult-warning' :
    'text-cult-success';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-mono font-semibold ${textColor}`}>
          {currentCount} / {capacity}
        </span>
        <span className={`text-xs font-mono ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1 bg-cult-dark-gray rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
