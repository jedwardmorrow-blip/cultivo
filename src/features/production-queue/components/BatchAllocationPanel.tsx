/**
 * BatchAllocationPanel — SKU yield projection view for a strain.
 *
 * Replaces BatchIntelligencePanel with the approved Batch Allocation Overview:
 * - Conversion funnel: Bin → Buck → Trim → Package (with strain-specific ratios)
 * - SKU split bar: visual proportion of 3.5g / 14g / 1lb output
 * - Per-batch table: remaining weight bar + SKU projections (oldest first)
 */

import { ArrowRight, AlertTriangle, Beaker } from 'lucide-react';
import {
  AGE_STYLES,
  type StrainAllocation,
  type StrainConversion,
  type BatchYield,
  type Confidence,
} from '@/shared/hooks/useSkuYield';
import { SKU_COLORS } from '@/shared/components/inventory';

import { formatWeight } from '@/shared/utils/format';

// ─── Formatters ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Confidence indicator ───────────────────────────────────────────────────

function ConfidenceDot({ confidence, sessions }: { confidence: Confidence; sessions: number }) {
  const isCalibrated = confidence === 'calibrated';
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] ${
        isCalibrated ? 'text-violet-400' : 'text-gray-600'
      }`}
      title={isCalibrated ? `${sessions} sessions — calibrated` : 'Estimated (< 2 sessions)'}
    >
      {isCalibrated ? (
        <Beaker className="w-2.5 h-2.5" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
      )}
    </span>
  );
}

// ─── Conversion Funnel ──────────────────────────────────────────────────────

function FunnelStage({
  label,
  outputs,
  confidence,
  sessions,
}: {
  label: string;
  outputs: { name: string; pct: number; color: string }[];
  confidence: Confidence;
  sessions: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</span>
        <ConfidenceDot confidence={confidence} sessions={sessions} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {outputs.map(o => (
          <span
            key={o.name}
            className={`text-[11px] tabular-nums ${o.color}`}
            title={`${o.name}: ${o.pct}%`}
          >
            {o.pct}% <span className="text-gray-600">{o.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ConversionFunnel({ conversion }: { conversion: StrainConversion }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      <FunnelStage
        label="Buck"
        confidence={conversion.buck_confidence}
        sessions={conversion.buck_sessions}
        outputs={[
          { name: 'bud', pct: conversion.buck_flower_pct, color: 'text-emerald-400' },
          { name: 'smalls', pct: conversion.buck_smalls_pct, color: 'text-cyan-400' },
          { name: 'loss', pct: conversion.buck_waste_pct, color: 'text-gray-500' },
        ]}
      />
      <ArrowRight className="w-3 h-3 text-gray-700 shrink-0" />
      <FunnelStage
        label="Trim"
        confidence={conversion.trim_confidence}
        sessions={conversion.trim_sessions}
        outputs={[
          { name: 'bud', pct: conversion.trim_bigs_pct, color: 'text-emerald-400' },
          { name: 'smalls', pct: conversion.trim_smalls_pct, color: 'text-cyan-400' },
          { name: 'trim', pct: conversion.trim_trim_pct, color: 'text-amber-400' },
        ]}
      />
      <ArrowRight className="w-3 h-3 text-gray-700 shrink-0" />
      <FunnelStage
        label="Package"
        confidence={conversion.pkg_confidence}
        sessions={conversion.pkg_sessions}
        outputs={[
          ...(conversion.pkg_pct_3_5g > 0 ? [{ name: '3.5g', pct: conversion.pkg_pct_3_5g, color: 'text-emerald-400' }] : []),
          ...(conversion.pkg_pct_14g > 0 ? [{ name: '14g', pct: conversion.pkg_pct_14g, color: 'text-sky-400' }] : []),
          ...(conversion.pkg_pct_1lb > 0 ? [{ name: '1lb', pct: conversion.pkg_pct_1lb, color: 'text-violet-400' }] : []),
        ]}
      />
    </div>
  );
}

// ─── SKU Split Bar ──────────────────────────────────────────────────────────

// SKU_COLORS imported from @/shared/components/inventory (canonical source)

function SkuSplitBar({ allocation }: { allocation: StrainAllocation }) {
  const total = allocation.total_proj_3_5g * 3.5
    + allocation.total_proj_14g * 14
    + allocation.total_proj_1lb * 454
    + allocation.total_proj_preroll * 1
    + allocation.total_proj_trim_g
    + allocation.total_est_loose_bulk_g;

  if (total <= 0) return null;

  const segments = [
    { key: '3.5g' as const,    grams: allocation.total_proj_3_5g * 3.5,   units: allocation.total_proj_3_5g,    unitLabel: true },
    { key: '14g' as const,     grams: allocation.total_proj_14g * 14,      units: allocation.total_proj_14g,     unitLabel: true },
    { key: '1lb' as const,     grams: allocation.total_proj_1lb * 454,     units: allocation.total_proj_1lb,     unitLabel: true },
    { key: 'preroll' as const, grams: allocation.total_proj_preroll * 1,   units: allocation.total_proj_preroll,  unitLabel: true },
    { key: 'trim' as const,    grams: allocation.total_proj_trim_g,        units: 0,                             unitLabel: false },
  ].filter(s => s.grams > 0);

  return (
    <div className="space-y-1">
      {/* Bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800/50">
        {segments.map(s => (
          <div
            key={s.key}
            className={`${SKU_COLORS[s.key].bg} transition-all`}
            style={{ width: `${(s.grams / total) * 100}%` }}
            title={`${SKU_COLORS[s.key].label}: ${s.units} units (${((s.grams / total) * 100).toFixed(0)}%)`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] flex-wrap">
        {segments.map(s => (
          <span key={s.key} className={`flex items-center gap-1 ${SKU_COLORS[s.key].text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${SKU_COLORS[s.key].bg}`} />
            <span className="font-semibold tabular-nums">{s.unitLabel ? s.units : formatWeight(s.grams)}</span>
            <span className="text-gray-600">{SKU_COLORS[s.key].label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Remaining Weight Bar ───────────────────────────────────────────────────

function RemainingBar({ batch }: { batch: BatchYield }) {
  const total = batch.total_remaining_g;
  if (total <= 0) return <span className="text-xs text-gray-600">—</span>;

  // Stack segments: binned → bucked → bulk → packaged → trim
  const segments = [
    { label: 'Binned',   grams: batch.binned_g, color: 'bg-indigo-500' },
    { label: 'Bucked',   grams: batch.bucked_flower_g + batch.bucked_smalls_g, color: 'bg-violet-500' },
    { label: 'Bulk',     grams: batch.bulk_flower_g + batch.bulk_smalls_g, color: 'bg-cyan-500' },
    { label: 'Packaged', grams: batch.packaged_g, color: 'bg-emerald-500' },
    { label: 'Trim',     grams: batch.trim_g, color: 'bg-amber-500/60' },
  ].filter(s => s.grams > 0);

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-800/50">
        {segments.map(s => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.grams / total) * 100}%` }}
            title={`${s.label}: ${formatWeight(s.grams)}`}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums text-gray-400 whitespace-nowrap">
        {formatWeight(total)}
      </span>
    </div>
  );
}

// ─── SKU Projection Chips ───────────────────────────────────────────────────

function SkuChips({ batch }: { batch: BatchYield }) {
  const unitChips = [
    { label: '3.5g', count: batch.proj_3_5g, color: SKU_COLORS['3.5g'] },
    { label: '14g',  count: batch.proj_14g,  color: SKU_COLORS['14g'] },
    { label: '1lb',  count: batch.proj_1lb,  color: SKU_COLORS['1lb'] },
    { label: 'pre',  count: batch.proj_preroll, color: SKU_COLORS['preroll'] },
  ].filter(c => c.count > 0);

  const hasTrim = batch.proj_trim_g > 0;
  const hasAnything = unitChips.length > 0 || hasTrim;

  if (!hasAnything) {
    return <span className="text-xs text-gray-600">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {unitChips.map(c => (
        <span
          key={c.label}
          className={`inline-flex items-center gap-0.5 text-[11px] tabular-nums ${c.color.text}`}
        >
          <span className="font-semibold">{c.count}</span>
          <span className="text-gray-600">×</span>
          <span>{c.label}</span>
        </span>
      ))}
      {hasTrim && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] tabular-nums ${SKU_COLORS['trim'].text}`}>
          <span className="font-semibold">{formatWeight(batch.proj_trim_g)}</span>
          <span className="text-gray-600">trim</span>
        </span>
      )}
    </div>
  );
}

// ─── Age Dot ────────────────────────────────────────────────────────────────

function AgeDot({ pressure, ageDays }: { pressure: BatchYield['age_pressure']; ageDays: number }) {
  const style = AGE_STYLES[pressure];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${style.bg} border ${style.border}`}
      title={`${ageDays} days since harvest (${style.label})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className={`text-[11px] font-bold tabular-nums ${style.text}`}>{ageDays}d</span>
    </span>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

interface BatchAllocationPanelProps {
  allocation: StrainAllocation | undefined;
  strainName: string;
}

export function BatchAllocationPanel({ allocation, strainName }: BatchAllocationPanelProps) {
  if (!allocation || allocation.batches.length === 0) {
    return (
      <div className="px-6 py-4">
        <span className="text-xs text-gray-500">No batch inventory found for {strainName}.</span>
      </div>
    );
  }

  const { conversion, batches } = allocation;
  const hasProjections = allocation.total_proj_3_5g > 0 || allocation.total_proj_14g > 0 || allocation.total_proj_1lb > 0 || allocation.total_proj_preroll > 0 || allocation.total_proj_trim_g > 0;

  return (
    <div className="px-6 py-4 space-y-3">
      {/* ─── Header: Strain conversion funnel + SKU split ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
            Conversion Funnel
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
            <span>·</span>
            <span className="text-white font-semibold">{formatWeight(allocation.total_remaining_g)}</span>
            <span>remaining</span>
            {allocation.aging_batches > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {allocation.aging_batches} aging
              </span>
            )}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="px-2 py-2 rounded-cult bg-cult-dark-gray/30 border border-cult-medium-gray/20">
          <ConversionFunnel conversion={conversion} />
        </div>

        {/* SKU split bar */}
        {hasProjections && (
          <div className="px-2">
            <SkuSplitBar allocation={allocation} />
          </div>
        )}
      </div>

      {/* ─── Batch table ─── */}
      <div className="rounded-cult border border-cult-medium-gray/30 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cult-dark-gray/30 text-left">
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Batch</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Harvest</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Age</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Remaining</th>
              <th className="px-3 py-2 text-xs uppercase tracking-wider text-gray-600 font-medium">Est. SKU Yield</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr
                key={b.batch_id}
                className={`border-t border-cult-medium-gray/20 ${
                  b.age_pressure === 'aging' ? 'bg-red-500/[0.03]' :
                  b.age_pressure === 'watch' ? 'bg-amber-500/[0.02]' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <span className="text-xs font-mono text-gray-400">{b.batch_number}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-500">{formatDate(b.harvest_date)}</span>
                </td>
                <td className="px-3 py-2">
                  <AgeDot pressure={b.age_pressure} ageDays={b.age_days} />
                </td>
                <td className="px-3 py-2">
                  <RemainingBar batch={b} />
                </td>
                <td className="px-3 py-2">
                  <SkuChips batch={b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
