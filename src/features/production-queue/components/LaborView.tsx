import { useState, useMemo, Fragment } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { StrainFormatRow, OrderLineItem, Urgency } from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────

interface StageConfig {
  label: string;
  short: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  barBg: string;
  barBorder: string;
  hurdles: number;
  verb: string;
  time: string;
}

const STAGES: Record<string, StageConfig> = {
  packaged: { label: 'Packaged', short: 'Pkg', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20', barBg: 'linear-gradient(135deg, #065f46, rgba(52,211,153,0.09))', barBorder: '#34d399', hurdles: 0, verb: 'Done', time: '' },
  bulk:     { label: 'Bulk',     short: 'Bulk', colorClass: 'text-sky-400',     bgClass: 'bg-sky-500/10',     borderClass: 'border-sky-500/20',     barBg: 'linear-gradient(135deg, #0c4a6e, rgba(56,189,248,0.09))', barBorder: '#38bdf8', hurdles: 1, verb: 'Package', time: 'same day' },
  trimming: { label: 'Trimming', short: 'Trim', colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10',   borderClass: 'border-amber-500/20',   barBg: 'linear-gradient(135deg, #78350f, rgba(251,191,36,0.09))', barBorder: '#fbbf24', hurdles: 2, verb: 'Trim → Pkg', time: '~1 day' },
  bucked:   { label: 'Bucked',   short: 'Buck', colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10',   borderClass: 'border-amber-500/20',   barBg: 'linear-gradient(135deg, #78350f, rgba(251,191,36,0.09))', barBorder: '#fbbf24', hurdles: 2, verb: 'Trim → Pkg', time: '~1–2 days' },
  binned:   { label: 'Binned',   short: 'Bin',  colorClass: 'text-orange-400',  bgClass: 'bg-orange-500/10',  borderClass: 'border-orange-500/20',  barBg: 'linear-gradient(135deg, #7c2d12, rgba(251,146,60,0.09))', barBorder: '#fb923c', hurdles: 3, verb: 'Buck → Trim → Pkg', time: '~2–3 days' },
};

const STAGE_ORDER = ['packaged', 'bulk', 'trimming', 'bucked', 'binned'] as const;

type CoverageState = 'surplus' | 'tight' | 'deficit';
type SortKey = 'urgency' | 'demand' | 'ready' | 'coverage';

// ─── Utility Functions ─────────────────────────────────────────────────────

function fmtPct(n: number): string {
  return n >= 100 ? '100%' : n < 1 && n > 0 ? '<1%' : `${Math.round(n)}%`;
}

/** Estimate output weight from a stage after loss */
function estOutputG(weightG: number, lossPct: number, hurdles: number): number {
  const effectiveLoss = lossPct * hurdles * 0.35 + lossPct * 0.65;
  return weightG * (1 - effectiveLoss / 100);
}

// ─── Pipeline (strain-level, weight-only) ──────────────────────────────────

interface Pipeline {
  packaged: { weightG: number; unitCount: number };
  bulk:     { weightG: number };
  trimming: { weightG: number };
  bucked:   { weightG: number };
  binned:   { weightG: number };
}

/** Total estimated output weight from the full pipeline */
function calcTotalEstG(pipeline: Pipeline, lossPct: number): number {
  return STAGE_ORDER.reduce((sum, key) => {
    const wG = pipeline[key].weightG;
    if (wG === 0 && key !== 'packaged') return sum;
    if (key === 'packaged') return sum + wG; // already finished product weight
    return sum + estOutputG(wG, lossPct, STAGES[key].hurdles);
  }, 0);
}

function getCoverage(readyG: number, totalEstG: number, demandG: number): { state: CoverageState; label: string } {
  if (demandG <= 0) return { state: 'surplus', label: 'Covered' };
  const ratio = totalEstG / demandG;
  if (ratio >= 1.15) return { state: 'surplus', label: 'Surplus' };
  if (ratio >= 0.90) return { state: 'tight', label: 'Tight' };
  return { state: 'deficit', label: 'Deficit' };
}

interface ShortfallInfoG {
  shortG: number;
  bulkWeightNeeded: number;
  trimWeightNeeded: number;
  buckWeightNeeded: number;
}

function calcShortfallG(demandG: number, totalEstG: number, lossPct: number): ShortfallInfoG | null {
  const shortG = demandG - totalEstG;
  if (shortG <= 0) return null;
  const lossMultiplier = 1 / (1 - lossPct / 100);
  const bulkWeightNeeded = Math.ceil(shortG);
  const trimWeightNeeded = Math.ceil(bulkWeightNeeded * lossMultiplier);
  const buckWeightNeeded = Math.ceil(trimWeightNeeded * lossMultiplier);
  return { shortG, bulkWeightNeeded, trimWeightNeeded, buckWeightNeeded };
}

// ─── Strain Aggregate (grouped across formats) ────────────────────────────

interface FormatDemand {
  formatLabel: string;
  productCategory: string;
  weightPerUnitG: number;
  unitsOrdered: number;
  unitsAssigned: number;
  unitsNeeded: number;
  demandG: number;
}

interface StrainAggregate {
  strainId: string | null;
  strainName: string;
  urgency: Urgency;
  formats: FormatDemand[];
  totalDemandG: number;
  totalOrderedG: number;
  pipeline: Pipeline;
  orderCount: number;
  earliestDelivery: string | null;
  confidence: 'none' | 'low' | 'medium' | 'high';
  conversionSessions: number;
}

function groupByStrain(rows: StrainFormatRow[]): StrainAggregate[] {
  const urgencyRank: Record<string, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4 };
  const map = new Map<string, StrainAggregate>();

  for (const row of rows) {
    const key = row.strain_id ?? row.strain_name;
    let agg = map.get(key);

    if (!agg) {
      // Pipeline is strain-level — same across all format rows, take from first
      const bulkG = (row.ready_flower_g ?? 0) + (row.ready_smalls_g ?? 0);
      agg = {
        strainId: row.strain_id,
        strainName: row.strain_name,
        urgency: row.urgency,
        formats: [],
        totalDemandG: 0,
        totalOrderedG: 0,
        pipeline: {
          packaged: { weightG: row.already_packaged_g ?? 0, unitCount: row.already_packaged_units ?? 0 },
          bulk:     { weightG: bulkG },
          trimming: { weightG: row.ready_trim_g ?? 0 },
          bucked:   { weightG: row.pipeline_bucked_g ?? 0 },
          binned:   { weightG: row.pipeline_binned_g ?? 0 },
        },
        orderCount: 0,
        earliestDelivery: row.earliest_delivery_date,
        confidence: row.confidence,
        conversionSessions: row.conversion_sessions,
      };
      map.set(key, agg);
    }

    // Pick worst urgency
    if ((urgencyRank[row.urgency] ?? 4) < (urgencyRank[agg.urgency] ?? 4)) {
      agg.urgency = row.urgency;
    }
    // Pick earliest delivery
    if (row.earliest_delivery_date && (!agg.earliestDelivery || row.earliest_delivery_date < agg.earliestDelivery)) {
      agg.earliestDelivery = row.earliest_delivery_date;
    }

    const demandG = row.total_units_needed * row.weight_per_unit_g;
    const orderedG = row.total_units_ordered * row.weight_per_unit_g;
    agg.formats.push({
      formatLabel: row.format_label,
      productCategory: row.product_category,
      weightPerUnitG: row.weight_per_unit_g,
      unitsOrdered: row.total_units_ordered,
      unitsAssigned: row.total_units_assigned,
      unitsNeeded: row.total_units_needed,
      demandG,
    });
    agg.totalDemandG += demandG;
    agg.totalOrderedG += orderedG;
    agg.orderCount += row.order_count;
  }

  return Array.from(map.values());
}

// ─── Sub-components ────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    overdue: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400', label: 'Overdue' },
    urgent:  { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Urgent' },
    soon:    { bg: 'bg-sky-500/20', text: 'text-sky-400', dot: 'bg-sky-400', label: 'Soon' },
    normal:  { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400', label: 'On Track' },
    no_date: { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400', label: 'No Date' },
  };
  const c = map[urgency] ?? map.no_date;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.bg} ${c.text} text-[11px] font-semibold`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Pipeline Bar (weight-only, no unit estimates) ──

function PipelineBar({ pipeline, lossPct }: { pipeline: Pipeline; lossPct: number }) {
  const segments = STAGE_ORDER.map(key => {
    const wG = pipeline[key].weightG;
    if (wG === 0 && key !== 'packaged') return null;
    const estG = key === 'packaged' ? wG : estOutputG(wG, lossPct, STAGES[key].hurdles);
    return { key, weightG: wG, estG, ...STAGES[key] };
  }).filter(Boolean) as (StageConfig & { key: string; weightG: number; estG: number })[];

  const maxW = segments.reduce((s, seg) => s + seg.weightG, 0);
  if (maxW === 0) return <div className="text-gray-600 text-xs italic">No inventory in pipeline</div>;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-6 rounded-cult overflow-hidden bg-cult-border gap-px">
        {segments.map(seg => {
          const pct = (seg.weightG / maxW) * 100;
          const clampPct = Math.max(pct, seg.key === 'packaged' && seg.weightG > 0 ? 2 : 0);
          if (clampPct === 0) return null;
          return (
            <div
              key={seg.key}
              className="group relative flex items-center justify-center overflow-hidden px-0.5"
              style={{ width: `${clampPct}%`, background: seg.barBg, borderLeft: `3px solid ${seg.barBorder}` }}
            >
              {pct >= 12 && (
                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: seg.barBorder }}>
                  {seg.key === 'packaged' ? `${formatWeight(seg.weightG)} ✓` : formatWeight(seg.weightG)}
                </span>
              )}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-cult-surface border border-cult-border rounded-cult px-2.5 py-1.5 text-[11px] text-cult-text-primary whitespace-nowrap shadow-lg pointer-events-none">
                <div className="font-semibold mb-0.5" style={{ color: seg.barBorder }}>{seg.label}: {formatWeight(seg.weightG)}</div>
                <div>→ ~{formatWeight(seg.estG)} after loss</div>
                <div className="text-gray-500 mt-0.5">
                  {seg.hurdles === 0 ? '✓ Ready to ship' : `${seg.hurdles} step${seg.hurdles > 1 ? 's' : ''}: ${seg.verb}`}
                  {seg.time && ` · ${seg.time}`}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cult-border" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 flex-wrap">
        {segments.filter(s => s.weightG > 0).map(seg => (
          <div key={seg.key} className="inline-flex items-center gap-1 text-[10px] leading-tight">
            <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: seg.barBorder }} />
            <span className="text-gray-500">{seg.short}</span>
            <span className="text-cult-text-primary font-semibold">{formatWeight(seg.weightG)}</span>
            {seg.key === 'packaged' && (
              <span className="font-semibold text-[9px]" style={{ color: seg.barBorder }}>
                ({(pipeline.packaged as Pipeline['packaged']).unitCount} items) ✓
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Demand Cell (weight-based) ──

function DemandCell({ strain }: { strain: StrainAggregate }) {
  const fmtCount = strain.formats.length;
  return (
    <div>
      <div className="text-[15px] font-bold text-cult-text-primary">
        {formatWeight(strain.totalDemandG)}
        <span className="text-[11px] text-gray-500 font-normal"> need</span>
      </div>
      <div className="text-[10px] text-gray-600">
        {fmtCount} format{fmtCount !== 1 ? 's' : ''} · {strain.orderCount} order{strain.orderCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ── Fill / Labor Cell (weight-based) ──

function FillCell({ strain, lossPct }: { strain: StrainAggregate; lossPct: number }) {
  const { pipeline, totalDemandG } = strain;
  const readyG = pipeline.packaged.weightG;
  const totalEstG = calcTotalEstG(pipeline, lossPct);
  const readyPct = totalDemandG > 0 ? (readyG / totalDemandG) * 100 : 0;
  const coverage = getCoverage(readyG, totalEstG, totalDemandG);
  const shortfall = calcShortfallG(totalDemandG, totalEstG, lossPct);

  const b = pipeline.binned.weightG;
  const bk = pipeline.bucked.weightG;
  const bl = pipeline.bulk.weightG;
  let laborTag = '';
  let laborColor = 'text-emerald-400';

  if (shortfall) {
    laborTag = `Short ~${formatWeight(shortfall.bulkWeightNeeded)}`;
    laborColor = 'text-rose-400';
  } else if (b > 0) { laborTag = `Buck ${formatWeight(b)} first`; laborColor = 'text-orange-400'; }
  else if (bk > 0) { laborTag = `Trim ${formatWeight(bk)}`; laborColor = 'text-amber-400'; }
  else if (bl > 0) { laborTag = `Package ${formatWeight(bl)}`; laborColor = 'text-sky-400'; }
  else if (readyPct >= 100) { laborTag = 'Ship it'; laborColor = 'text-emerald-400'; }

  const coverageColorMap: Record<CoverageState, string> = {
    surplus: 'text-emerald-400',
    tight: 'text-amber-400',
    deficit: 'text-rose-400',
  };

  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold font-montserrat ${coverageColorMap[coverage.state]}`}>
          {fmtPct(readyPct)}
        </span>
        <span className="text-[10px] text-gray-500">ready</span>
      </div>
      <div className="flex h-1 rounded-sm bg-cult-border overflow-hidden my-0.5 w-24">
        <div className="bg-emerald-400 rounded-sm" style={{ width: `${Math.min(readyPct, 100)}%` }} />
        {totalEstG > readyG && (
          <div className="bg-sky-400/30" style={{ width: `${Math.min(((totalEstG - readyG) / (totalDemandG || 1)) * 100, 100 - Math.min(readyPct, 100))}%` }} />
        )}
        {coverage.state === 'deficit' && (
          <div className="flex-1 bg-rose-400/20 border-r-2 border-rose-400" />
        )}
      </div>
      {coverage.state !== 'surplus' && (
        <span className={`inline-block text-[9px] font-bold px-1.5 py-px rounded mt-0.5 uppercase tracking-wide ${
          coverage.state === 'tight' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {coverage.label}
        </span>
      )}
      {laborTag && (
        <div className={`text-[10px] font-semibold mt-0.5 ${laborColor}`}>{laborTag}</div>
      )}
    </div>
  );
}

// ── Order Triage (FIFO, weight-based) ──

function OrderTriage({ orders, totalEstG }: { orders: OrderLineItem[]; totalEstG: number }) {
  if (!orders.length) return null;

  let remainingG = totalEstG;
  const lines = orders.map(line => {
    const lineNeedUnits = line.quantity - (line.units_assigned ?? 0);
    const lineNeedG = lineNeedUnits * (line.weight_per_unit_g ?? 0);
    const canCoverG = Math.min(Math.max(remainingG, 0), lineNeedG);
    const status: 'covered' | 'partial' | 'uncovered' = canCoverG >= lineNeedG ? 'covered' : canCoverG > 0 ? 'partial' : 'uncovered';
    remainingG = Math.max(0, remainingG - lineNeedG);
    return { ...line, lineNeedUnits, lineNeedG, canCoverG, status };
  });

  const statusStyles = {
    covered:   { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-400', icon: '✓', label: 'Covered' },
    partial:   { bg: 'bg-amber-500/5',   border: 'border-amber-500/15',   text: 'text-amber-400',   icon: '◐', label: 'Partial' },
    uncovered: { bg: 'bg-rose-500/5',    border: 'border-rose-500/15',    text: 'text-rose-400',    icon: '✗', label: 'At Risk' },
  };

  return (
    <div className="p-3 rounded-cult bg-rose-500/[0.03] border border-rose-500/10">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Order Triage</span>
        <span className="text-[10px] text-gray-600">— FIFO priority, earliest due first</span>
      </div>
      <div className="flex flex-col gap-1">
        {lines.map(line => {
          const ss = statusStyles[line.status];
          return (
            <div
              key={line.order_item_id}
              className={`grid items-center gap-2 px-2.5 py-1.5 rounded-cult border ${ss.bg} ${ss.border}`}
              style={{ gridTemplateColumns: '24px 90px 1fr 80px 80px 80px' }}
            >
              <span className={`text-sm text-center ${ss.text}`}>{ss.icon}</span>
              <span className="text-[11px] font-semibold text-cult-text-primary">{line.order_number}</span>
              <span className="text-[11px] text-gray-500 truncate">{line.customer_name}</span>
              <span className="text-[11px] text-cult-text-primary font-medium">{line.lineNeedUnits}× {line.format_label}</span>
              <span className="text-[11px] text-gray-600">Due {formatDateShort(line.requested_delivery_date)}</span>
              <span className={`text-[10px] font-semibold ${ss.text}`}>
                {line.status === 'covered' ? 'Covered' :
                 line.status === 'partial' ? `~${formatWeight(line.canCoverG)}/${formatWeight(line.lineNeedG)}` :
                 'At Risk'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Format Demand Breakdown (expanded detail) ──

function FormatBreakdown({ formats }: { formats: FormatDemand[] }) {
  return (
    <div className="p-3 rounded-cult bg-cult-surface-overlay/30 border border-cult-border/50">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Demand by Format
      </div>
      <div className="flex flex-col gap-1">
        {formats.map(f => (
          <div key={f.formatLabel} className="flex items-center gap-3 text-[11px]">
            <span className="text-cult-text-primary font-medium w-32 truncate">{f.formatLabel}</span>
            <span className="text-cult-text-primary font-semibold">{f.unitsNeeded} units</span>
            <span className="text-gray-600">({formatWeight(f.demandG)})</span>
            {f.unitsAssigned > 0 && (
              <span className="text-emerald-400 text-[10px]">{f.unitsAssigned} assigned</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Expanded Detail ──

function ExpandedDetail({ strain, lossPct, orders }: { strain: StrainAggregate; lossPct: number; orders: OrderLineItem[] }) {
  const { pipeline, totalDemandG } = strain;
  const readyG = pipeline.packaged.weightG;
  const totalEstG = calcTotalEstG(pipeline, lossPct);
  const surplusG = totalEstG - totalDemandG;
  const coverage = getCoverage(readyG, totalEstG, totalDemandG);
  const shortfall = calcShortfallG(totalDemandG, totalEstG, lossPct);

  // Build labor tasks
  const tasks: { action: string; weight: number; colorClass: string; borderClass: string; bgClass: string; time: string; people: string }[] = [];
  const b = pipeline.binned.weightG;
  const bk = pipeline.bucked.weightG;
  const bl = pipeline.bulk.weightG;
  if (b > 0) tasks.push({ action: 'Buck', weight: b, colorClass: 'text-orange-400', borderClass: 'border-orange-500/20', bgClass: 'bg-orange-500/10', time: '~2–3 days', people: '1–2 people' });
  if (bk > 0 || b > 0) tasks.push({ action: 'Trim', weight: bk + (b > 0 ? b * (1 - lossPct / 100) : 0), colorClass: 'text-amber-400', borderClass: 'border-amber-500/20', bgClass: 'bg-amber-500/10', time: '~1–2 days', people: '2–3 people' });
  if (bl > 0 || bk > 0 || b > 0) tasks.push({ action: 'Package', weight: bl + bk * (1 - lossPct / 100), colorClass: 'text-sky-400', borderClass: 'border-sky-500/20', bgClass: 'bg-sky-500/10', time: 'same day', people: '1 person' });

  return (
    <div className="px-4 pb-4 border-t border-cult-border/50 flex flex-col gap-2.5">
      {/* Narrative summary */}
      <div className="pt-3">
        {coverage.state === 'surplus' && (
          <div className="p-3 rounded-cult bg-emerald-500/[0.04] border border-emerald-500/10 text-xs text-emerald-400 font-medium leading-relaxed">
            Pipeline covers all {formatWeight(totalDemandG)} needed, with ~{formatWeight(surplusG)} to spare.
          </div>
        )}
        {coverage.state === 'tight' && (
          <div className="p-3 rounded-cult bg-amber-500/[0.04] border border-amber-500/10 text-xs text-amber-400 font-medium leading-relaxed">
            Pipeline barely covers demand — only ~{formatWeight(Math.abs(surplusG))} buffer.
            Loss above {lossPct}% or new orders will create a shortfall.
          </div>
        )}
        {shortfall && (
          <div className="p-3 rounded-cult bg-rose-500/[0.04] border border-rose-500/10">
            <div className="text-[13px] font-bold text-rose-400 mb-1.5">
              Short ~{formatWeight(shortfall.shortG)} of finished product
            </div>
            <div className="text-xs text-cult-text-primary leading-relaxed">
              To fill remaining orders, Post Production needs an additional:
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <div className="flex-1 min-w-[140px] p-2 rounded-cult bg-sky-500/[0.06] border border-sky-500/10">
                <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wide">As trimmed bulk</div>
                <div className="text-lg font-bold text-cult-text-primary mt-0.5">~{formatWeight(shortfall.bulkWeightNeeded)}</div>
                <div className="text-[10px] text-gray-600">ready to package</div>
              </div>
              <div className="flex-1 min-w-[140px] p-2 rounded-cult bg-amber-500/[0.06] border border-amber-500/10">
                <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">As pre-trim material</div>
                <div className="text-lg font-bold text-cult-text-primary mt-0.5">~{formatWeight(shortfall.trimWeightNeeded)}</div>
                <div className="text-[10px] text-gray-600">accounting for {lossPct}% trim loss</div>
              </div>
              <div className="flex-1 min-w-[140px] p-2 rounded-cult bg-orange-500/[0.06] border border-orange-500/10">
                <div className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide">As raw (pre-buck)</div>
                <div className="text-lg font-bold text-cult-text-primary mt-0.5">~{formatWeight(shortfall.buckWeightNeeded)}</div>
                <div className="text-[10px] text-gray-600">accounting for {lossPct}% buck + trim loss</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Format demand breakdown */}
      <FormatBreakdown formats={strain.formats} />

      {/* Order triage — deficit only */}
      {coverage.state === 'deficit' && (
        <OrderTriage orders={orders} totalEstG={totalEstG} />
      )}

      {/* Labor path */}
      {tasks.length > 0 && (
        <div className="p-3 rounded-cult bg-gradient-to-br from-cult-surface to-cult-border/20 border border-cult-border/50">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Labor Path — Post Production
          </div>
          <div className="flex gap-1 items-stretch">
            {tasks.map((task, i) => (
              <Fragment key={task.action}>
                {i > 0 && <div className="flex items-center text-gray-600 text-sm px-1">→</div>}
                <div className={`flex-1 p-2 rounded-cult ${task.bgClass} border ${task.borderClass}`}>
                  <div className={`text-[13px] font-bold ${task.colorClass}`}>{task.action}</div>
                  <div className="text-base font-bold text-cult-text-primary my-0.5">{formatWeight(task.weight)}</div>
                  <div className="text-[10px] text-gray-600">{task.time} · {task.people}</div>
                </div>
              </Fragment>
            ))}
            <div className="flex items-center text-gray-600 text-sm px-1">→</div>
            <div className="flex-1 p-2 rounded-cult bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[13px] font-bold text-emerald-400">Ready</div>
              <div className="text-base font-bold text-cult-text-primary my-0.5">~{formatWeight(totalEstG)}</div>
              <div className="text-[10px] text-gray-600">assign → ship</div>
            </div>
          </div>
        </div>
      )}

      {/* Stage cards */}
      <div className="grid grid-cols-5 gap-1.5">
        {STAGE_ORDER.map(key => {
          const wG = pipeline[key].weightG;
          const estG = key === 'packaged' ? wG : estOutputG(wG, lossPct, STAGES[key].hurdles);
          const cfg = STAGES[key];
          const hasWeight = wG > 0;
          return (
            <div
              key={key}
              className={`p-2 rounded-cult border ${hasWeight ? `${cfg.bgClass} ${cfg.borderClass}` : 'bg-cult-border/20 border-transparent'} ${!hasWeight && key !== 'packaged' ? 'opacity-35' : ''}`}
            >
              <div className={`text-[9px] font-semibold uppercase tracking-wide mb-0.5 ${cfg.colorClass}`}>{cfg.label}</div>
              <div className="text-base font-bold text-cult-text-primary">{formatWeight(wG)}</div>
              <div className="text-[10px] text-gray-500">
                {key === 'packaged'
                  ? `${pipeline.packaged.unitCount} items ✓`
                  : `→ ~${formatWeight(estG)} out`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion rate confidence */}
      {strain.confidence !== 'none' && strain.conversionSessions > 0 && (
        <div className="text-[10px] text-gray-600 px-1">
          Conversion rates: {strain.confidence} confidence ({strain.conversionSessions} session{strain.conversionSessions !== 1 ? 's' : ''})
        </div>
      )}
    </div>
  );
}

// ── Strain Row ──

function StrainRow({
  strain,
  lossPct,
  orders,
}: {
  strain: StrainAggregate;
  lossPct: number;
  orders: OrderLineItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { pipeline, totalDemandG } = strain;
  const readyG = pipeline.packaged.weightG;
  const totalEstG = useMemo(() => calcTotalEstG(pipeline, lossPct), [pipeline, lossPct]);
  const coverage = getCoverage(readyG, totalEstG, totalDemandG);

  const borderColor = coverage.state === 'deficit'
    ? 'border-rose-500/20'
    : expanded ? 'border-cult-border' : 'border-cult-border/50';

  return (
    <div className={`bg-cult-surface rounded-cult border ${borderColor} transition-colors`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="grid items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cult-surface-raised transition-colors"
        style={{ gridTemplateColumns: '200px 110px 1fr 120px' }}
      >
        {/* Strain name column */}
        <div className="flex items-center gap-1.5">
          <ChevronRight className={`w-3 h-3 text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-cult-text-primary text-[13px]">{strain.strainName}</span>
              <UrgencyBadge urgency={strain.urgency} />
            </div>
            <div className="text-[10px] text-gray-600 mt-px">
              {strain.formats.map(f => f.formatLabel).join(', ')}
            </div>
          </div>
        </div>

        {/* Demand */}
        <DemandCell strain={strain} />

        {/* Pipeline bar */}
        <PipelineBar pipeline={pipeline} lossPct={lossPct} />

        {/* Fill / Labor */}
        <FillCell strain={strain} lossPct={lossPct} />
      </div>

      {expanded && <ExpandedDetail strain={strain} lossPct={lossPct} orders={orders} />}
    </div>
  );
}

// ─── Main LaborView Component ──────────────────────────────────────────────

interface LaborViewProps {
  byStrain: StrainFormatRow[];
  byOrder: OrderLineItem[];
  loading?: boolean;
}

export default function LaborView({ byStrain, byOrder, loading }: LaborViewProps) {
  const [lossPct, setLossPct] = useState(15);
  const [sortBy, setSortBy] = useState<SortKey>('urgency');

  // Group format rows into strain-level aggregates
  const strainGroups = useMemo(() => groupByStrain(byStrain), [byStrain]);

  // Build order lookup: strainId → order lines, sorted by delivery date (FIFO)
  const ordersByStrain = useMemo(() => {
    const map = new Map<string, OrderLineItem[]>();
    for (const o of byOrder) {
      const key = o.strain_id ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    for (const [, items] of map) {
      items.sort((a, b) => {
        const da = a.requested_delivery_date ?? '9999';
        const db = b.requested_delivery_date ?? '9999';
        return da.localeCompare(db);
      });
    }
    return map;
  }, [byOrder]);

  // Sort
  const sorted = useMemo(() => {
    const uo: Record<string, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4 };
    return [...strainGroups].sort((a, b) => {
      if (sortBy === 'urgency') return (uo[a.urgency] ?? 4) - (uo[b.urgency] ?? 4);
      if (sortBy === 'demand') return b.totalDemandG - a.totalDemandG;
      if (sortBy === 'ready') {
        const ra = a.pipeline.packaged.weightG / (a.totalDemandG || 1);
        const rb = b.pipeline.packaged.weightG / (b.totalDemandG || 1);
        return ra - rb;
      }
      if (sortBy === 'coverage') {
        const ca = calcTotalEstG(a.pipeline, lossPct) / (a.totalDemandG || 1);
        const cb = calcTotalEstG(b.pipeline, lossPct) / (b.totalDemandG || 1);
        return ca - cb;
      }
      return 0;
    });
  }, [strainGroups, sortBy, lossPct]);

  // Summary stats (weight-based)
  const totalDemandG = strainGroups.reduce((s, g) => s + g.totalDemandG, 0);
  const totalOrderedG = strainGroups.reduce((s, g) => s + g.totalOrderedG, 0);
  const totalReadyG = strainGroups.reduce((s, g) => s + g.pipeline.packaged.weightG, 0);
  const deficitCount = strainGroups.filter(g => {
    const t = calcTotalEstG(g.pipeline, lossPct);
    return getCoverage(g.pipeline.packaged.weightG, t, g.totalDemandG).state === 'deficit';
  }).length;
  const tightCount = strainGroups.filter(g => {
    const t = calcTotalEstG(g.pipeline, lossPct);
    return getCoverage(g.pipeline.packaged.weightG, t, g.totalDemandG).state === 'tight';
  }).length;

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading production data…</div>;
  }

  if (strainGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No strain data to display. Adjust filters or check order data.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary stats bar */}
      <div className="flex items-center gap-5 px-4 py-2.5 bg-cult-surface rounded-cult border border-cult-border/50 flex-wrap">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total Ordered</div>
          <div className="text-lg font-bold text-cult-text-primary">{formatWeight(totalOrderedG)}</div>
        </div>
        <span className="text-gray-600">→</span>
        <div>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wide">Packaged</div>
          <div className="text-lg font-bold text-emerald-400">{formatWeight(totalReadyG)}</div>
        </div>
        <span className="text-gray-600">→</span>
        <div>
          <div className="text-[10px] text-rose-400 uppercase tracking-wide">Still Need</div>
          <div className="text-lg font-bold text-rose-400">{formatWeight(totalDemandG)}</div>
        </div>
        <div className="w-px h-7 bg-cult-border" />
        <div className="text-[11px] text-gray-500">
          {strainGroups.length} strains
        </div>
        {(deficitCount > 0 || tightCount > 0) && (
          <>
            <div className="w-px h-7 bg-cult-border" />
            <div className="flex gap-2 items-center">
              {deficitCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/60 text-rose-400">
                  {deficitCount} deficit
                </span>
              )}
              {tightCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-400">
                  {tightCount} tight
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 bg-cult-surface rounded-cult border border-cult-border/50 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-gray-500 font-medium">Loss</label>
          <input
            type="range"
            min={5}
            max={35}
            step={1}
            value={lossPct}
            onChange={e => setLossPct(Number(e.target.value))}
            className="w-16 accent-amber-400"
          />
          <span className="text-xs font-semibold text-amber-400 min-w-[28px]">{lossPct}%</span>
        </div>
        <div className="w-px h-4 bg-cult-border" />
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-500 font-medium">Sort</span>
          {([
            { key: 'urgency', label: 'Urgency' },
            { key: 'demand', label: 'Need' },
            { key: 'ready', label: 'Least Ready' },
            { key: 'coverage', label: 'Coverage' },
          ] as { key: SortKey; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                sortBy === opt.key
                  ? 'bg-cult-surface-overlay text-cult-text-primary'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid gap-3 px-4 pb-1 text-[9px] font-semibold text-gray-600 uppercase tracking-wider"
        style={{ gridTemplateColumns: '200px 110px 1fr 120px' }}
      >
        <div>Strain</div>
        <div>Demand</div>
        <div className="flex items-center gap-1.5">
          Inventory Pipeline
          <span className="inline-flex gap-1.5 font-normal normal-case text-[8px] ml-1">
            <span><span className="text-emerald-400">■</span> Ready</span>
            <span><span className="text-sky-400">■</span> 1 step</span>
            <span><span className="text-amber-400">■</span> 2 steps</span>
            <span><span className="text-orange-400">■</span> 3 steps</span>
          </span>
        </div>
        <div>Fill / Labor</div>
      </div>

      {/* Strain rows */}
      <div className="flex flex-col gap-0.5">
        {sorted.map(sg => (
          <StrainRow
            key={sg.strainId ?? sg.strainName}
            strain={sg}
            lossPct={lossPct}
            orders={ordersByStrain.get(sg.strainId ?? '') ?? []}
          />
        ))}
      </div>
    </div>
  );
}
