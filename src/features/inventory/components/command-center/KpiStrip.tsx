import { motion } from 'framer-motion';
import { Weight, DollarSign, TrendingUp, Award } from 'lucide-react';
import { KpiTile } from './KpiTile';
import { GradeMixTile } from './GradeMixTile';
import type { StrainInventoryKpis } from '../../hooks/useStrainInventory';
import type { InventoryKpis } from '../../hooks/useInventoryKpis';

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function formatUsd(v: number): string {
  if (v === 0) return '$0';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

interface KpiStripProps {
  strainKpis: StrainInventoryKpis;
  inventoryKpis: InventoryKpis;
  strainLoading: boolean;
  kpiLoading: boolean;
}

export function KpiStrip({ strainKpis, inventoryKpis, strainLoading, kpiLoading }: KpiStripProps) {
  const weightLabel = strainLoading
    ? '—'
    : `${gramsToLbs(strainKpis.totalWeightGrams)} lbs`;
  const weightSub = strainLoading
    ? undefined
    : `${strainKpis.totalWeightGrams.toLocaleString('en-US', { maximumFractionDigits: 0 })}g across ${strainKpis.activeStrainCount} strains`;

  const valueLabel = strainLoading ? '—' : formatUsd(strainKpis.totalValueUsd);
  const valueSub =
    !strainLoading && strainKpis.unpricedStrainCount > 0
      ? `${strainKpis.unpricedStrainCount} strain${strainKpis.unpricedStrainCount > 1 ? 's' : ''} unpriced`
      : strainLoading
        ? undefined
        : 'ready to sell';

  const throughputLabel = kpiLoading
    ? '—'
    : `${gramsToLbs(inventoryKpis.throughput7dGrams)} lbs`;
  const throughputSub = kpiLoading
    ? undefined
    : inventoryKpis.throughputEventCount === 0
      ? 'no packaging events in 7d'
      : `${inventoryKpis.throughputEventCount} event${inventoryKpis.throughputEventCount > 1 ? 's' : ''}`;

  return (
    <motion.div
      layoutId="kpi-strip"
      className="grid grid-cols-4 gap-3"
    >
      <KpiTile
        layoutId="kpi-tile-weight"
        label="Weight On Hand"
        value={weightLabel}
        subtitle={weightSub}
        icon={Weight}
        iconColor="#10B981"
        loading={strainLoading}
      />
      <KpiTile
        layoutId="kpi-tile-value"
        label="Sellable Value"
        value={valueLabel}
        subtitle={valueSub}
        icon={DollarSign}
        iconColor="#F59E0B"
        loading={strainLoading}
        placeholder={!strainLoading && strainKpis.totalValueUsd === 0}
      />
      <KpiTile
        layoutId="kpi-tile-throughput"
        label="Throughput (7d)"
        value={throughputLabel}
        subtitle={throughputSub}
        icon={TrendingUp}
        iconColor="#3B82F6"
        loading={kpiLoading}
        placeholder={!kpiLoading && inventoryKpis.throughput7dGrams === 0}
      />
      <GradeMixTile
        gradeBuckets={inventoryKpis.gradeBuckets}
        ungradedGrams={inventoryKpis.ungradedGrams}
        totalGradedGrams={inventoryKpis.totalGradedGrams}
        loading={kpiLoading}
      />
    </motion.div>
  );
}
