import { LayoutGroup } from 'framer-motion';
import { Dna, GitBranch, FlaskConical, Package, Layers } from 'lucide-react';
import { KpiStrip } from './KpiStrip';
import { LensPillNav, type LensId } from './LensPillNav';
import { LensContainer } from './LensContainer';
import { StrainsLens } from './lenses/StrainsLens';
import type { StrainInventoryRow, StrainInventoryKpis } from '../../hooks/useStrainInventory';
import type { InventoryKpis } from '../../hooks/useInventoryKpis';

const PAGE_BG = 'bg-gradient-to-br from-[#0a0f0a] via-[#080a08] to-[#060808]';

const LENSES = [
  { id: 'strains' as LensId, label: 'Strains', icon: Dna, ready: true },
  { id: 'pipeline' as LensId, label: 'Batch Pipeline', icon: GitBranch, ready: false },
  { id: 'coa' as LensId, label: 'COA Desk', icon: FlaskConical, ready: false },
  { id: 'ship' as LensId, label: 'Ready to Ship', icon: Package, ready: false },
  { id: 'raw' as LensId, label: 'Raw Material', icon: Layers, ready: false },
];

interface InventoryShellProps {
  activeLens: LensId;
  onLensChange: (id: LensId) => void;
  strainData: StrainInventoryRow[];
  strainKpis: StrainInventoryKpis;
  inventoryKpis: InventoryKpis;
  strainLoading: boolean;
  kpiLoading: boolean;
}

export function InventoryShell({
  activeLens,
  onLensChange,
  strainData,
  strainKpis,
  inventoryKpis,
  strainLoading,
  kpiLoading,
}: InventoryShellProps) {
  function renderLens() {
    switch (activeLens) {
      case 'strains':
        return <StrainsLens data={strainData} loading={strainLoading} />;
      case 'pipeline':
      case 'coa':
      case 'ship':
      case 'raw':
        return <PlaceholderLens name={LENSES.find((l) => l.id === activeLens)?.label ?? activeLens} />;
      default:
        return null;
    }
  }

  return (
    <div className={`${PAGE_BG} min-h-screen -m-6 p-6`}>
      <LayoutGroup>
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-white">Inventory</h1>
            <p className="text-white/40 text-sm mt-1">Command Center</p>
          </div>

          {/* KPI strip — persists across all lenses */}
          <KpiStrip
            strainKpis={strainKpis}
            inventoryKpis={inventoryKpis}
            strainLoading={strainLoading}
            kpiLoading={kpiLoading}
          />

          {/* Lens pill nav */}
          <LensPillNav lenses={LENSES} active={activeLens} onChange={onLensChange} />

          {/* Active lens content */}
          <LensContainer activeId={activeLens}>
            {renderLens()}
          </LensContainer>
        </div>
      </LayoutGroup>
    </div>
  );
}

function PlaceholderLens({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-12 text-center">
      <p className="text-white/30 font-medium">{name}</p>
      <p className="text-white/20 text-sm mt-1">Coming in Phase 2</p>
    </div>
  );
}
