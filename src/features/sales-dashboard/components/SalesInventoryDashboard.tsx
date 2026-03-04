import { useState, useCallback } from 'react';
import type { StrainSupplyDemand } from '../types';
import { dashboardData } from '../data';
import { HeroCards } from './HeroCards';
import { InventoryBreakdownChart } from './InventoryBreakdownChart';
import { StrainGrid } from './StrainGrid';
import { StrainDetailDrawer } from './StrainDetailDrawer';
import { PipelineFunnel } from './PipelineFunnel';

export function SalesInventoryDashboard() {
  const [selectedStrain, setSelectedStrain] = useState<StrainSupplyDemand | null>(null);

  const handleCloseDrawer = useCallback(() => setSelectedStrain(null), []);

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">
          Inventory Dashboard
        </h1>
        <p className="text-cult-light-gray mt-2">
          Supply, demand, and pipeline visibility by strain
        </p>
      </div>

      <HeroCards summary={dashboardData.summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryBreakdownChart totals={dashboardData.summary.totals} />
        <PipelineFunnel totals={dashboardData.summary.totals} />
      </div>

      <StrainGrid
        strains={dashboardData.supply_demand_by_strain}
        onSelectStrain={setSelectedStrain}
      />

      {selectedStrain && (
        <StrainDetailDrawer
          strain={selectedStrain}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}
