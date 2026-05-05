/**
 * @deprecated — Replaced by BatchAllocationPanel. No active consumers.
 * Kept for reference during transition. Safe to delete.
 *
 * BatchIntelligencePanel — batch-centric inventory intelligence panel.
 *
 * Replaces the old BatchInfoPanel with a richer view:
 * - Per-batch row: age, stage, sellable → potential, allocated orders, age pressure
 * - Strain-level unallocated demand callout
 * - Cultivation pipeline (what's growing)
 * - FIFO sorted (oldest first) to highlight cost clock pressure
 */

import { Sprout, AlertTriangle, Package, Clock } from 'lucide-react';
import { AGE_STYLES, type BatchIntel, type StrainBatchSummary } from '@/shared/hooks/useBatchIntelligence';

function formatLbs(grams: number): string {
  const lbs = grams / 453.592;
  if (lbs >= 1) return `${lbs.toFixed(1)} lbs`;
  return `${Math.round(grams)}g`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AgeDot({ pressure, ageDays }: { pressure: BatchIntel['age_pressure']; ageDays: number }) {
  const style = AGE_STYLES[pressure];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${style.bg} border ${style.border}`}
      title={`${ageDays} days since harvest (${style.label})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className={`text-xs font-bold tabular-nums ${style.text}`}>{ageDays}d</span>
    </span>
  );
}

function LifecycleBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    binned: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    bucked: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    bulk_available: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    packaged: 'bg-cult-success-muted text-cult-success border-cult-success/20',
    archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  const labels: Record<string, string> = {
    binned: 'Binned',
    bucked: 'Bucked',
    bulk_available: 'Bulk',
    packaged: 'Packaged',
    archived: 'Archived',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${styles[state] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
      {labels[state] || state}
    </span>
  );
}

function PotentialBar({ sellable, potential }: { sellable: number; potential: number }) {
  if (potential <= 0) return <span className="text-xs text-gray-600">—</span>;
  const sellablePct = potential > 0 ? Math.min((sellable / potential) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden" title={`${formatLbs(sellable)} sellable of ${formatLbs(potential)} potential`}>
        <div
          className="h-full bg-cult-success rounded-full transition-all"
          style={{ width: `${sellablePct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-400 whitespace-nowrap">
        {formatLbs(potential)}
      </span>
    </div>
  );
}

interface BatchIntelligencePanelProps {
  strainSummary: StrainBatchSummary | undefined;
  strainName: string;
}

export function BatchIntelligencePanel({ strainSummary, strainName }: BatchIntelligencePanelProps) {
  if (!strainSummary || strainSummary.batches.length === 0) {
    return (
      <div className="px-6 py-4">
        <span className="text-xs text-gray-500">No batch inventory found for {strainName}.</span>
      </div>
    );
  }

  const { batches, unalloc_revenue, unalloc_orders, flower_plants, veg_plants, next_harvest_date } = strainSummary;
  const hasUnallocated = unalloc_orders > 0;
  const hasCultivation = flower_plants > 0 || veg_plants > 0;

  return (
    <div className="px-6 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
            Batch Inventory — {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </span>
          {strainSummary.aging_batches > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cult-danger-muted border border-cult-danger/20 text-xs text-cult-danger">
              <AlertTriangle className="w-3 h-3" />
              {strainSummary.aging_batches} aging
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Sellable: <span className="text-white font-semibold">{formatLbs(strainSummary.total_sellable_g)}</span></span>
          <span>Potential: <span className="text-gray-300 font-semibold">{formatLbs(strainSummary.total_potential_g)}</span></span>
          {strainSummary.confidence && (
            <span className={`px-1.5 py-0.5 rounded ${
              batches.some(b => b.confidence === 'calibrated')
                ? 'bg-violet-500/10 text-violet-400'
                : 'bg-gray-700/50 text-gray-500'
            }`}>
              {batches[0].trim_session_count > 0 ? `${batches[0].trim_session_count} sessions` : 'default est.'}
            </span>
          )}
        </div>
      </div>

      {/* Batch table */}
      <div className="rounded-cult border border-cult-border/30 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cult-surface/30 text-left">
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Batch</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Age</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Stage</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Sellable → Potential</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium text-right">Orders</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium text-right">Allocated $</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr
                key={b.batch_id}
                className={`border-t border-cult-border/20 ${
                  b.age_pressure === 'aging' ? 'bg-cult-danger/[0.03]' :
                  b.age_pressure === 'watch' ? 'bg-cult-warning/[0.02]' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{b.batch_number}</span>
                    {b.quality_grade !== 'UNDEFINED' && (
                      <span className={`text-xs font-medium ${
                        b.quality_grade === 'CULT' ? 'text-cult-success' :
                        b.quality_grade === 'B' ? 'text-sky-400' :
                        b.quality_grade === 'C' ? 'text-cult-warning' :
                        'text-cult-danger'
                      }`}>{b.quality_grade}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <AgeDot pressure={b.age_pressure} ageDays={b.age_days} />
                </td>
                <td className="px-3 py-2">
                  <LifecycleBadge state={b.lifecycle_state} />
                </td>
                <td className="px-3 py-2">
                  <PotentialBar sellable={b.sellable_now_g} potential={b.total_potential_g} />
                </td>
                <td className="px-3 py-2 text-right">
                  {b.allocated_orders > 0
                    ? <span className="text-xs text-white tabular-nums">{b.allocated_orders}</span>
                    : <span className="text-xs text-gray-600">—</span>
                  }
                </td>
                <td className="px-3 py-2 text-right">
                  {b.allocated_revenue > 0
                    ? <span className="text-xs text-white tabular-nums">${b.allocated_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    : <span className="text-xs text-gray-600">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: unallocated demand + cultivation pipeline */}
      {(hasUnallocated || hasCultivation) && (
        <div className="flex items-center gap-4 text-xs">
          {hasUnallocated && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-cult bg-cult-warning/5 border border-cult-warning/15">
              <Clock className="w-3 h-3 text-cult-warning" />
              <span className="text-cult-warning font-semibold">{unalloc_orders} order{unalloc_orders !== 1 ? 's' : ''}</span>
              <span className="text-gray-500">unallocated</span>
              <span className="text-cult-warning font-semibold">(${unalloc_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
            </div>
          )}
          {hasCultivation && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-cult bg-cult-success/5 border border-cult-success/15">
              <Sprout className="w-3 h-3 text-cult-success" />
              {flower_plants > 0 && (
                <span className="text-cult-success">
                  <span className="font-semibold">{flower_plants}</span> in flower
                  {next_harvest_date && <span className="text-gray-500"> · harvest ~{formatDate(next_harvest_date)}</span>}
                </span>
              )}
              {veg_plants > 0 && (
                <span className="text-gray-400">
                  {flower_plants > 0 && <span className="text-gray-600 mx-1">·</span>}
                  <span className="font-semibold">{veg_plants}</span> in veg
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
