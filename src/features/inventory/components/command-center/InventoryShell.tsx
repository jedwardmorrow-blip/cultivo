import { LayoutGroup } from 'framer-motion';
import { Dna, GitBranch, FlaskConical, Package, Layers } from 'lucide-react';
import { KpiStrip } from './KpiStrip';
import { LensPillNav, type LensId } from './LensPillNav';
import { LensContainer } from './LensContainer';
import { StrainsLens } from './lenses/StrainsLens';
import { PipelineLens } from './lenses/PipelineLens';
import { CoaDeskLens } from './lenses/CoaDeskLens';
import { ReadyToShipLens } from './lenses/ReadyToShipLens';
import { RawMaterialLens } from './lenses/RawMaterialLens';
import { BatchDrawer } from './drawers/BatchDrawer';
import { StrainDrawer } from './drawers/StrainDrawer';
import { CoaDrawer } from './drawers/CoaDrawer';
import { SkuDrawer } from './drawers/SkuDrawer';
import { InventoryOmnibar } from './InventoryOmnibar';
import type { StrainInventoryRow, StrainInventoryKpis } from '../../hooks/useStrainInventory';
import type { InventoryKpis } from '../../hooks/useInventoryKpis';

const PAGE_BG = 'bg-gradient-to-br from-cult-opaque-black via-[#080a08] to-[#060808]';

const LENSES = [
  { id: 'strains' as LensId, label: 'Strains', icon: Dna, ready: true },
  { id: 'pipeline' as LensId, label: 'Batch Pipeline', icon: GitBranch, ready: true },
  { id: 'coa' as LensId, label: 'COA Desk', icon: FlaskConical, ready: true },
  { id: 'ship' as LensId, label: 'Ready to Ship', icon: Package, ready: true },
  { id: 'raw' as LensId, label: 'Raw Material', icon: Layers, ready: true },
];

interface InventoryShellProps {
  activeLens: LensId;
  onLensChange: (id: LensId) => void;
  strainData: StrainInventoryRow[];
  strainKpis: StrainInventoryKpis;
  inventoryKpis: InventoryKpis;
  strainLoading: boolean;
  kpiLoading: boolean;
  // Drawer state — URL-synced via CommandCenter
  drawerBatchId: string | null;
  drawerStrainId: string | null;
  drawerCoaBatchId: string | null;
  drawerSkuProductId: string | null;
  openBatchDrawer: (id: string) => void;
  closeBatchDrawer: () => void;
  openStrainDrawer: (id: string) => void;
  closeStrainDrawer: () => void;
  openCoaDrawer: (id: string) => void;
  closeCoaDrawer: () => void;
  openSkuDrawer: (id: string) => void;
  closeSkuDrawer: () => void;
}

export function InventoryShell({
  activeLens,
  onLensChange,
  strainData,
  strainKpis,
  inventoryKpis,
  strainLoading,
  kpiLoading,
  drawerBatchId,
  drawerStrainId,
  drawerCoaBatchId,
  drawerSkuProductId,
  openBatchDrawer,
  closeBatchDrawer,
  openStrainDrawer,
  closeStrainDrawer,
  openCoaDrawer,
  closeCoaDrawer,
  openSkuDrawer,
  closeSkuDrawer,
}: InventoryShellProps) {

  function renderLens() {
    switch (activeLens) {
      case 'strains':
        return <StrainsLens data={strainData} loading={strainLoading} onBatchClick={openBatchDrawer} />;
      case 'pipeline':
        return <PipelineLens onBatchClick={openBatchDrawer} />;
      case 'coa':
        return <CoaDeskLens onBatchClick={openBatchDrawer} onCoaClick={openCoaDrawer} />;
      case 'ship':
        return <ReadyToShipLens onSkuClick={openSkuDrawer} />;
      case 'raw':
        return <RawMaterialLens onBatchClick={openBatchDrawer} />;
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

          {/* Omnibar — persistent cross-entity search (Decision #23) */}
          <InventoryOmnibar onBatchSelect={openBatchDrawer} onStrainSelect={openStrainDrawer} />

          {/* Lens pill nav */}
          <LensPillNav lenses={LENSES} active={activeLens} onChange={onLensChange} />

          {/* Active lens content */}
          <LensContainer activeId={activeLens}>
            {renderLens()}
          </LensContainer>
        </div>
      </LayoutGroup>

      {/* Drawers — shell-level, available across all lenses */}
      <BatchDrawer batchId={drawerBatchId} onClose={closeBatchDrawer} />
      <StrainDrawer strainId={drawerStrainId} onClose={closeStrainDrawer} onBatchClick={openBatchDrawer} />
      <CoaDrawer batchId={drawerCoaBatchId} onClose={closeCoaDrawer} onBatchClick={openBatchDrawer} />
      <SkuDrawer productId={drawerSkuProductId} onClose={closeSkuDrawer} onBatchClick={openBatchDrawer} />
    </div>
  );
}
