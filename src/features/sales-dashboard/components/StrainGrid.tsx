import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { StrainSupplyDemand, SupplyHealthStatus } from '../types';
import { StrainCard } from './StrainCard';

interface StrainGridProps {
  strains: StrainSupplyDemand[];
  onSelectStrain: (strain: StrainSupplyDemand) => void;
}

const HEALTH_FILTERS: { value: SupplyHealthStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'low', label: 'Low' },
  { value: 'warning', label: 'Warning' },
  { value: 'healthy', label: 'Healthy' },
];

export function StrainGrid({ strains, onSelectStrain }: StrainGridProps) {
  const [healthFilter, setHealthFilter] = useState<SupplyHealthStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    let filtered = [...strains].sort((a, b) => b.total_demand_revenue - a.total_demand_revenue);

    if (healthFilter !== 'all') {
      filtered = filtered.filter((s) => s.supply_health === healthFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((s) => s.strain.toLowerCase().includes(q));
    }

    return filtered;
  }, [strains, healthFilter, search]);

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">
          Supply & Demand by Strain
          <span className="text-cult-text-muted font-normal ml-2">({sorted.length} strains)</span>
        </h3>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-text-muted" />
            <input
              type="text"
              placeholder="Search strain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 pl-8 pr-3 py-1.5 text-xs bg-cult-surface-sunken border border-cult-border rounded-cult text-cult-text-primary placeholder-cult-text-faint focus:outline-none focus:border-cult-border-strong"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {HEALTH_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setHealthFilter(f.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              healthFilter === f.value
                ? 'bg-cult-text-primary text-cult-black'
                : 'bg-cult-surface-sunken text-cult-text-muted hover:text-cult-text-secondary border border-cult-border-subtle'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-cult-text-muted text-sm">
          No strains match the current filter
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((strain) => (
            <StrainCard
              key={strain.strain}
              strain={strain}
              onClick={() => onSelectStrain(strain)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
