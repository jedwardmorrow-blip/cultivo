import { harvestCountdownColor } from '../constants/stageColors';

interface HarvestCountdownProps {
  daysUntilHarvest: number | null;
}

export function HarvestCountdown({ daysUntilHarvest }: HarvestCountdownProps) {
  if (daysUntilHarvest === null) {
    return <span className="text-xs text-cult-text-muted">No harvest date set</span>;
  }

  const colorCls = harvestCountdownColor(daysUntilHarvest);
  const tick = daysUntilHarvest <= 0 ? 'animate-countdown-tick' : daysUntilHarvest <= 3 ? 'animate-countdown-tick' : '';

  if (daysUntilHarvest < 0) {
    return (
      <span className={`text-xs font-semibold ${colorCls} ${tick}`}>
        {Math.abs(daysUntilHarvest)} day{Math.abs(daysUntilHarvest) !== 1 ? 's' : ''} overdue
      </span>
    );
  }

  if (daysUntilHarvest === 0) {
    return <span className={`text-xs font-semibold ${colorCls} ${tick}`}>Harvest today</span>;
  }

  return (
    <span className={`text-xs ${colorCls}`}>
      Harvest in {daysUntilHarvest} day{daysUntilHarvest !== 1 ? 's' : ''}
    </span>
  );
}
