import type { SupplyHealthStatus } from '../types';
import { SUPPLY_HEALTH_COLORS } from '../types';

interface SupplyBarProps {
  sellableGrams: number;
  demandUnits: number;
  health: SupplyHealthStatus;
}

export function SupplyBar({ sellableGrams, demandUnits, health }: SupplyBarProps) {
  const max = Math.max(sellableGrams, demandUnits, 1);
  const supplyPercent = Math.min((sellableGrams / max) * 100, 100);
  const demandPercent = Math.min((demandUnits / max) * 100, 100);
  const healthColor = SUPPLY_HEALTH_COLORS[health];

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-[10px] text-cult-text-muted">
        <span>Supply vs Demand</span>
      </div>
      <div className="relative h-2 bg-cult-surface-sunken rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${demandPercent}%`,
            backgroundColor: `${healthColor}20`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${supplyPercent}%`,
            backgroundColor: healthColor,
          }}
        />
      </div>
    </div>
  );
}
