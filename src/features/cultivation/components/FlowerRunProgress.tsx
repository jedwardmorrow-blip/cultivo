interface FlowerRunProgressProps {
  dayInFlower: number;
  estimatedFlowerDays: number;
}

export function FlowerRunProgress({ dayInFlower, estimatedFlowerDays }: FlowerRunProgressProps) {
  const pct = Math.min(100, (dayInFlower / estimatedFlowerDays) * 100);

  return (
    <div className="space-y-1">
      <p className="text-xs text-cult-text-muted">
        Day <span className="text-cult-text-primary font-mono">{dayInFlower}</span> of ~{estimatedFlowerDays}
      </p>
      <div className="h-1.5 bg-cult-surface-raised overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rose-700 to-rose-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
