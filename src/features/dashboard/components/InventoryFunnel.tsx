import type { FunnelStage } from '../hooks/useDashboardData';
import { useSkuYield } from '@/shared/hooks/useSkuYield';
import { SKU_COLORS } from '@/shared/components/inventory';
import { formatWeight } from '@/shared/utils/format';

interface Props {
  stages: FunnelStage[];
}

function fmtMoney(n: number): string {
  if (n >= 1000) return '~$' + Math.round(n / 1000) + 'K';
  return '~$' + n.toLocaleString();
}

export function InventoryFunnel({ stages }: Props) {
  const totalRaw = stages.reduce((s, st) => s + st.lbs, 0);
  const totalFinished = stages.reduce((s, st) => s + st.finishedLbs, 0);
  const maxLbs = Math.max(...stages.map(s => s.lbs), 1);
  const packagedStage = stages.find(s => s.label === 'Packaged');
  const finishedUpstream = stages.filter(s => s.label !== 'Packaged').reduce((s, st) => s + st.finishedLbs, 0);

  // SKU yield projections for the footer callout
  const { summary, loading: skuLoading } = useSkuYield();
  const hasProjections = !skuLoading && (summary.total_proj_3_5g > 0 || summary.total_proj_14g > 0 || summary.total_proj_1lb > 0 || summary.total_proj_preroll > 0 || summary.total_proj_trim_g > 0);

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Inventory Pipeline
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-stage-harvest/10 text-cult-stage-harvest">
          {totalRaw.toFixed(0)} lbs raw → ~{totalFinished.toFixed(0)} lbs finished
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {stages.map(stage => {
          const pct = Math.max((stage.lbs / maxLbs) * 100, 2);
          const showConversion = stage.lbs !== stage.finishedLbs && stage.lbs > 0;
          return (
            <div
              key={stage.label}
              className="flex items-center gap-4 px-3.5 py-2.5 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition-all duration-200"
            >
              <div className="w-[100px] text-xs font-medium text-cult-text-secondary">
                {stage.label}
              </div>
              <div className="flex-1 h-6 bg-white/[0.04] rounded-xl overflow-hidden">
                <div
                  className="h-full rounded-xl flex items-center pl-2.5 text-[0.6875rem] font-semibold text-cult-surface transition-all duration-1000 ease-cult"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                >
                  {stage.lbs >= 5 ? `${stage.lbs.toFixed(1)} lbs` : ''}
                </div>
              </div>
              <div className="min-w-[65px] text-right tabular-nums">
                <div className="text-sm font-bold" style={{ color: stage.color }}>
                  {stage.lbs.toFixed(1)}
                </div>
                {showConversion && (
                  <div className="text-[0.5625rem] text-cult-text-muted">
                    →{stage.finishedLbs.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="min-w-[70px] text-right text-[0.625rem] text-cult-text-muted font-light">
                {fmtMoney(stage.revenueEst)}
              </div>
            </div>
          );
        })}
      </div>

      {/* SKU yield projection callout */}
      {hasProjections && (
        <div className="mt-3.5 px-3.5 py-2.5 bg-white/[0.03] rounded-xl flex items-center gap-4 border-l-2 border-cult-success">
          <span className="text-[0.6875rem] text-cult-text-secondary font-medium">
            Est. output →
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {summary.total_proj_3_5g > 0 && (
              <span className={`text-[0.6875rem] tabular-nums ${SKU_COLORS['3.5g'].text}`}>
                <span className="font-bold">{summary.total_proj_3_5g.toLocaleString()}</span>
                <span className="text-cult-text-muted ml-1">3.5g</span>
              </span>
            )}
            {summary.total_proj_14g > 0 && (
              <span className={`text-[0.6875rem] tabular-nums ${SKU_COLORS['14g'].text}`}>
                <span className="font-bold">{summary.total_proj_14g.toLocaleString()}</span>
                <span className="text-cult-text-muted ml-1">14g</span>
              </span>
            )}
            {summary.total_proj_1lb > 0 && (
              <span className={`text-[0.6875rem] tabular-nums ${SKU_COLORS['1lb'].text}`}>
                <span className="font-bold">{summary.total_proj_1lb.toLocaleString()}</span>
                <span className="text-cult-text-muted ml-1">1lb</span>
              </span>
            )}
            {summary.total_proj_preroll > 0 && (
              <span className={`text-[0.6875rem] tabular-nums ${SKU_COLORS['preroll'].text}`}>
                <span className="font-bold">{summary.total_proj_preroll.toLocaleString()}</span>
                <span className="text-cult-text-muted ml-1">pre</span>
              </span>
            )}
            {summary.total_proj_trim_g > 0 && (
              <span className={`text-[0.6875rem] tabular-nums ${SKU_COLORS['trim'].text}`}>
                <span className="font-bold">{formatWeight(summary.total_proj_trim_g)}</span>
                <span className="text-cult-text-muted ml-1">trim</span>
              </span>
            )}
          </div>
          {summary.aging_batches > 0 && (
            <span className="text-[0.625rem] text-red-400 font-semibold ml-auto">
              {summary.aging_batches} aging
            </span>
          )}
        </div>
      )}

      {packagedStage && finishedUpstream > 10 && packagedStage.lbs < 5 && (
        <div className="mt-3.5 px-3.5 py-2.5 bg-white/[0.03] rounded-xl text-[0.6875rem] font-light text-cult-text-secondary flex items-center gap-2.5 border-l-2 border-cult-stage-harvest">
          <strong className="text-cult-stage-harvest font-semibold">Bottleneck:</strong>
          ~{finishedUpstream.toFixed(0)} lbs finished-equiv upstream, only {packagedStage.lbs.toFixed(1)} lbs packaged. Revenue at {fmtMoney(finishedUpstream * 2000)}.
        </div>
      )}
    </div>
  );
}
