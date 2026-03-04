import { ChevronRight } from 'lucide-react';
import type { StrainSupplyDemand } from '../types';
import { SUPPLY_HEALTH_COLORS } from '../types';
import { HealthBadge } from './HealthBadge';
import { SupplyBar } from './SupplyBar';
import { formatNumber, formatCurrency } from '@/shared/utils/format';

interface StrainCardProps {
  strain: StrainSupplyDemand;
  onClick: () => void;
}

export function StrainCard({ strain, onClick }: StrainCardProps) {
  const totalSellable = strain.sellable_flower_grams + strain.sellable_smalls_grams;
  const healthColor = SUPPLY_HEALTH_COLORS[strain.supply_health];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-cult-surface-raised border border-cult-border rounded-cult p-4 relative overflow-hidden group hover:border-cult-border-strong hover:bg-cult-surface-overlay transition-all duration-200 cursor-pointer"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 group-hover:w-1.5"
        style={{ backgroundColor: healthColor }}
      />

      <div className="pl-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-cult-text-primary truncate">{strain.strain}</h4>
            <div className="mt-1">
              <HealthBadge status={strain.supply_health} />
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-cult-text-faint group-hover:text-cult-text-muted transition-colors flex-shrink-0 mt-0.5" />
        </div>

        <SupplyBar
          sellableGrams={totalSellable}
          demandUnits={strain.demand_packaged_units}
          health={strain.supply_health}
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
          <Metric label="Packaged" value={formatNumber(strain.packaged_units)} unit="units" />
          <Metric label="Demand" value={formatNumber(strain.demand_packaged_units)} unit="units" />
          <Metric label="Revenue" value={formatCurrency(strain.total_demand_revenue)} />
          <Metric label="Orders" value={String(strain.total_orders)} />
        </div>
      </div>
    </button>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-[10px] text-cult-text-muted uppercase tracking-wider">{label}</div>
      <div className="text-xs font-medium text-cult-text-primary tabular-nums">
        {value}
        {unit && <span className="text-cult-text-muted ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
