interface HarvestCountdownProps {
  daysUntilHarvest: number | null;
}

export function HarvestCountdown({ daysUntilHarvest }: HarvestCountdownProps) {
  if (daysUntilHarvest === null) {
    return <span className="text-xs text-cult-text-muted">No harvest date set</span>;
  }

  if (daysUntilHarvest < 0) {
    return (
      <span className="text-xs text-red-400 animate-pulse">
        {Math.abs(daysUntilHarvest)} day{Math.abs(daysUntilHarvest) !== 1 ? 's' : ''} overdue
      </span>
    );
  }

  if (daysUntilHarvest === 0) {
    return <span className="text-xs text-amber-400 animate-pulse">Harvest today</span>;
  }

  if (daysUntilHarvest <= 7) {
    return (
      <span className="text-xs text-amber-400">
        Harvest in {daysUntilHarvest} day{daysUntilHarvest !== 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <span className="text-xs text-cult-light-gray">
      Harvest in {daysUntilHarvest} day{daysUntilHarvest !== 1 ? 's' : ''}
    </span>
  );
}
