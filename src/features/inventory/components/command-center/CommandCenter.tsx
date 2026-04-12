/**
 * Inventory Command Center — Phase 1.5 (Shell + Strains lens + real KPI strip)
 *
 * Design system: Liquid Glass + Bento Grid
 * Spec: cultops_inventory_spec (f5f8dbff)
 * Philosophy: cultops_inventory_philosophy (3b0baa61)
 * Route: /inventory-command-center (D19 convention)
 */

import { useState } from 'react';
import { InventoryShell } from './InventoryShell';
import { useStrainInventory } from '../../hooks/useStrainInventory';
import { useInventoryKpis } from '../../hooks/useInventoryKpis';
import type { LensId } from './LensPillNav';

export function InventoryCommandCenter() {
  const [activeLens, setActiveLens] = useState<LensId>('strains');
  const { data, kpis: strainKpis, loading: strainLoading } = useStrainInventory();
  const { kpis: inventoryKpis, loading: kpiLoading } = useInventoryKpis();

  return (
    <InventoryShell
      activeLens={activeLens}
      onLensChange={setActiveLens}
      strainData={data}
      strainKpis={strainKpis}
      inventoryKpis={inventoryKpis}
      strainLoading={strainLoading}
      kpiLoading={kpiLoading}
    />
  );
}
