/**
 * Inventory Command Center — Phase 2 (all lenses, drawers, omnibar, URL-synced state)
 *
 * Design system: Liquid Glass + Bento Grid
 * Spec: cultops_inventory_spec (f5f8dbff)
 * Philosophy: cultops_inventory_philosophy (3b0baa61)
 * Route: /inventory-command-center (D19 convention)
 *
 * URL params:
 *   ?lens=strains|pipeline|coa|ship|raw
 *   ?batch=<uuid>   — opens BatchDrawer
 *   ?strain=<uuid>  — opens StrainDrawer
 *   ?coa=<uuid>     — opens CoaDrawer (batch_id)
 *   ?sku=<uuid>     — opens SkuDrawer (product_id)
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InventoryShell } from './InventoryShell';
import { useStrainInventory } from '../../hooks/useStrainInventory';
import { useInventoryKpis } from '../../hooks/useInventoryKpis';
import type { LensId } from './LensPillNav';

const VALID_LENSES: LensId[] = ['strains', 'pipeline', 'coa', 'ship', 'raw'];

function isLensId(v: string | null): v is LensId {
  return v != null && VALID_LENSES.includes(v as LensId);
}

export function InventoryCommandCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, kpis: strainKpis, loading: strainLoading } = useStrainInventory();
  const { kpis: inventoryKpis, loading: kpiLoading } = useInventoryKpis();

  const rawLens = searchParams.get('lens');
  const activeLens: LensId = isLensId(rawLens) ? rawLens : 'strains';

  const drawerBatchId = searchParams.get('batch');
  const drawerStrainId = searchParams.get('strain');
  const drawerCoaBatchId = searchParams.get('coa');
  const drawerSkuProductId = searchParams.get('sku');

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const onLensChange = useCallback(
    (id: LensId) => setParam('lens', id === 'strains' ? null : id),
    [setParam],
  );

  const openBatchDrawer = useCallback((id: string) => setParam('batch', id), [setParam]);
  const closeBatchDrawer = useCallback(() => setParam('batch', null), [setParam]);
  const openStrainDrawer = useCallback((id: string) => setParam('strain', id), [setParam]);
  const closeStrainDrawer = useCallback(() => setParam('strain', null), [setParam]);
  const openCoaDrawer = useCallback((id: string) => setParam('coa', id), [setParam]);
  const closeCoaDrawer = useCallback(() => setParam('coa', null), [setParam]);
  const openSkuDrawer = useCallback((id: string) => setParam('sku', id), [setParam]);
  const closeSkuDrawer = useCallback(() => setParam('sku', null), [setParam]);

  return (
    <InventoryShell
      activeLens={activeLens}
      onLensChange={onLensChange}
      strainData={data}
      strainKpis={strainKpis}
      inventoryKpis={inventoryKpis}
      strainLoading={strainLoading}
      kpiLoading={kpiLoading}
      drawerBatchId={drawerBatchId}
      drawerStrainId={drawerStrainId}
      drawerCoaBatchId={drawerCoaBatchId}
      drawerSkuProductId={drawerSkuProductId}
      openBatchDrawer={openBatchDrawer}
      closeBatchDrawer={closeBatchDrawer}
      openStrainDrawer={openStrainDrawer}
      closeStrainDrawer={closeStrainDrawer}
      openCoaDrawer={openCoaDrawer}
      closeCoaDrawer={closeCoaDrawer}
      openSkuDrawer={openSkuDrawer}
      closeSkuDrawer={closeSkuDrawer}
    />
  );
}
