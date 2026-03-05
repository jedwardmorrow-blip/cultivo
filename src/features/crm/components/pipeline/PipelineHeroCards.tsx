import type { PipelineSummary } from '../../hooks/useSalesPipeline';
import { formatGrams, formatCurrency, HEALTH_HEX } from './pipelineConstants';

interface PipelineHeroCardsProps {
  summary: PipelineSummary;
}

export function PipelineHeroCards({ summary }: PipelineHeroCardsProps) {
  const t = summary.totals;
  const pct = t.totalSellableGrams + t.pipelineGrams > 0
    ? Math.round((t.totalSellableGrams / (t.totalSellableGrams + t.pipelineGrams)) * 100)
    : 0;
  const hd = summary.healthDistribution;
  const healthTotal = Object.values(hd).reduce((a, b) => a + b, 0);

  const cards = [
    {
      label: 'SELLABLE INVENTORY',
      value: formatGrams(t.totalSellableGrams) + 'g',
      sub: `${t.packagedUnits.toLocaleString()} pkgd \u00b7 ${formatGrams(t.sellableFlowerGrams)}g flower \u00b7 ${formatGrams(t.sellableSmallsGrams)}g smalls`,
    },
    {
      label: 'PIPELINE',
      value: formatGrams(t.pipelineGrams) + 'g',
      sub: `${pct}% sellable \u00b7 ${formatGrams(t.byproductGrams)}g byproduct`,
    },
    {
      label: 'ACTIVE DEMAND',
      value: formatCurrency(t.activeDemandRevenue),
      sub: `${t.activeOrders.toLocaleString()} orders \u00b7 ${summary.strainCount.withActiveDemand} strains`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-xl p-4 border border-cult-medium-gray/40 bg-cult-black">
          <div className="text-[9px] font-bold text-neutral-500 tracking-[0.1em] mb-1">{c.label}</div>
          <div className="text-[22px] font-extrabold text-cult-white leading-tight tabular-nums">{c.value}</div>
          <div className="text-[10px] text-neutral-500 mt-1">{c.sub}</div>

          {i === 0 && t.totalSellableGrams > 0 && (
            <div className="flex gap-[3px] mt-2 h-[3px] rounded-full overflow-hidden">
              <div className="rounded-full bg-emerald-500" style={{ width: `${(t.sellableFlowerGrams / t.totalSellableGrams) * 100}%` }} />
              <div className="rounded-full bg-emerald-400" style={{ width: `${(t.sellableSmallsGrams / t.totalSellableGrams) * 100}%` }} />
              <div className="rounded-full bg-emerald-800" style={{ width: `${((t.packagedUnits * 3.5) / t.totalSellableGrams) * 100}%` }} />
            </div>
          )}

          {i === 2 && healthTotal > 0 && (
            <div className="flex gap-[2px] mt-2 h-[3px] rounded-full overflow-hidden">
              {(['critical', 'low', 'warning', 'healthy'] as const).map(k => (
                <div
                  key={k}
                  className="rounded-full"
                  style={{ width: `${(hd[k] / healthTotal) * 100}%`, background: HEALTH_HEX[k] }}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
