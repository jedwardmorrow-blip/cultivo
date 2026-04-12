import { motion } from 'framer-motion';
import { Weight, DollarSign, TrendingUp } from 'lucide-react';
import { KpiTile } from './KpiTile';
import { GradeMixTile } from './GradeMixTile';
import type { StrainInventoryKpis } from '../../hooks/useStrainInventory';
import type { InventoryKpis } from '../../hooks/useInventoryKpis';

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

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
  const weightValue = strainLoading
    ? '—'
    : `${gramsToLbs(strainKpis.totalWeightGrams)} lbs`;
  const weightSub = strainLoading
    ? 'Weight On Hand'
    : `${strainKpis.totalWeightGrams.toLocaleString('en-US', { maximumFractionDigits: 0 })}g across ${strainKpis.activeStrainCount} strains`;

  const valueValue = strainLoading ? '—' : formatUsd(strainKpis.totalValueUsd);
  const valueSub =
    !strainLoading && strainKpis.unpricedStrainCount > 0
      ? `${strainKpis.unpricedStrainCount} strain${strainKpis.unpricedStrainCount > 1 ? 's' : ''} unpriced`
      : strainLoading
        ? 'Sellable Value'
        : 'ready to sell';

  const throughputValue = kpiLoading
    ? '—'
    : `${gramsToLbs(inventoryKpis.throughput7dGrams)} lbs`;
  const throughputSub = kpiLoading
    ? 'Throughput (7d)'
    : inventoryKpis.throughputEventCount === 0
      ? 'no packaging events in 7d'
      : `${inventoryKpis.throughputEventCount} event${inventoryKpis.throughputEventCount > 1 ? 's' : ''} in 7d`;

  return (
    <motion.div
      layoutId="kpi-strip"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <KpiTile
        layoutId="kpi-tile-weight"
        label="Weight On Hand"
        value={weightValue}
        subtitle={weightSub}
        icon={Weight}
        accent="#10B981"
        loading={strainLoading}
        pulse={!strainLoading && strainKpis.totalWeightGrams > 0}
      />
      <KpiTile
        layoutId="kpi-tile-value"
        label="Sellable Value"
        value={valueValue}
        subtitle={valueSub}
        icon={DollarSign}
        accent="#F59E0B"
        loading={strainLoading}
        placeholder={!strainLoading && strainKpis.totalValueUsd === 0}
      />
      <KpiTile
        layoutId="kpi-tile-throughput"
        label="Throughput (7d)"
        value={throughputValue}
        subtitle={throughputSub}
        icon={TrendingUp}
        accent="#3B82F6"
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
