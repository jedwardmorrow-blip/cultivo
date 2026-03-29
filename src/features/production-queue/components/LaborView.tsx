import { useState, useMemo, Fragment } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { StrainFormatRow, OrderLineItem, Urgency } from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────

interface StageConfig {
  label: string;
  short: string;
  colorClass: string;       // Tailwind text color
  bgClass: string;          // Tailwind bg for cards
  borderClass: string;      // Tailwind border color
  barBg: string;            // Inline bar segment bg (gradient)
  barBorder: string;        // Inline bar left-border color
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

function estYield(weightG: number, skuG: number, lossPct: number, hurdles: number): number {
  const effectiveLoss = lossPct * hurdles * 0.35 + lossPct * 0.65;
  return Math.floor(weightG * (1 - effectiveLoss / 100) / skuG);
}

/** Map a StrainFormatRow to a pipeline object the view can consume */
function rowToPipeline(row: StrainFormatRow) {
  // Bulk weight depends on product_category
  const cat = row.product_category?.toLowerCase() ?? '';
  let bulkG = row.ready_flower_g ?? 0;
  if (cat.includes('small')) bulkG = row.ready_smalls_g ?? 0;
  else if (cat.includes('trim')) bulkG = row.ready_trim_g ?? 0;

  return {
    packaged: { units: row.already_packaged_units ?? 0, weightG: row.already_packaged_g ?? 0 },
    bulk:     { weightG: bulkG },
    trimming: { weightG: 0 }, // trimming is pipeline flow, not a separate bucket in the view
    bucked:   { weightG: row.pipeline_bucked_g ?? 0 },
    binned:   { weightG: row.pipeline_binned_g ?? 0 },
  };
}

type Pipeline = ReturnType<typeof rowToPipeline>;

function calcTotalEst(pipeline: Pipeline, skuWeightG: number, lossPct: number): number {
  return STAGE_ORDER.reduce((sum, key) => {
    const stage = pipeline[key];
    if (!stage) return sum;
    const wG = 'weightG' in stage ? stage.weightG : 0;
    if (wG === 0 && key !== 'packaged') return sum;
    if (key === 'packaged') return sum + (stage.units || 0);
    return sum + estYield(wG, skuWeightG, lossPct, STAGES[key].hurdles);
  }, 0);
}

function getCoverage(readyUnits: number, totalEstUnits: number, needed: number): { state: CoverageState; label: string } {
  if (needed <= 0) return { state: 'surplus', label: 'Covered' };
  const ratio = totalEstUnits / needed;
  if (ratio >= 1.15) return { state: 'surplus', label: 'Surplus' };
  if (ratio >= 0.90) return { state: 'tight', label: 'Tight' };
  return { state: 'deficit', label: 'Deficit' };
}

interface ShortfallInfo {
  shortUnits: number;
  bulkWeightNeeded: number;
  trimWeightNeeded: number;
  buckWeightNeeded: number;
  formatName: string;
}

function calcShortfallInfo(
  needed: number, totalEstUnits: number, skuWeightG: number, lossPct: number, formatLabel: string
): ShortfallInfo | null {
  const shortUnits = needed - totalEstUnits;
  if (shortUnits <= 0) return null;

  const bulkWeightNeeded = Math.ceil(shortUnits * skuWeightG);
  const lossMultiplier = 1 / (1 - lossPct / 100);
  const trimWeightNeeded = Math.ceil(bulkWeightNeeded * lossMultiplier);
  const buckWeightNeeded = Math.ceil(trimWeightNeeded * lossMultiplier);
  const formatName = formatLabel.replace(/[\d.]+g\s*/i, '').toLowerCase().trim() || 'flower';

  return { shortUnits, bulkWeightNeeded, trimWeightNeeded, buckWeightNeeded, formatName };
}

// ─── Grouped strain type ───────────────────────────────────────────────────

interface StrainGroup {
  strainId: string | null;
  strainName: string;
  urgency: Urgency;
  formatLabel: string;
  productCategory: string;
  skuWeightG: number;
  demand: { ordered: number; assigned: number; needed: number };
  pipeline: Pipeline;
  orderCount: number;
  earliestDelivery: string | null;
  // Conversion rates from the view
  buckingFlowerPct: number;
  buckingSmallsPct: number;
  trimmingBigBudPct: number;
  trimmingSmallBudPct: number;
  packagingEfficiencyPct: number;
  confidence: 'none' | 'low' | 'medium' | 'high';
  conversionSessions: number;
}

function rowToStrainGroup(row: StrainFormatRow): StrainGroup {
  return {
    strainId: row.strain_id,
    strainName: row.strain_name,
    urgency: row.urgency,
    formatLabel: row.format_label,
    productCategory: row.product_category,
    skuWeightG: row.weight_per_unit_g,
    demand: {
      ordered: row.total_units_ordered,
      assigned: row.total_units_assigned,
      needed: row.total_units_needed,
    },
    pipeline: rowToPipeline(row),
    orderCount: row.order_count,
    earliestDelivery: row.earliest_delivery_date,
    buckingFlowerPct: row.bucking_flower_pct,
    buckingSmallsPct: row.bucking_smalls_pct,
    trimmingBigBudPct: row.trimming_big_bud_pct,
    trimmingSmallBudPct: row.trimming_small_bud_pct,
    packagingEfficiencyPct: row.packaging_efficiency_pct,
    confidence: row.confidence,
    conversionSessions: row.conversion_sessions,
  };
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

// ── Pipeline Bar ──

function PipelineBar({ pipeline, skuWeightG, lossPct }: { pipeline: Pipeline; skuWeightG: number; lossPct: number }) {
  const segments = STAGE_ORDER.map(key => {
    const stage = pipeline[key];
    if (!stage) return null;
    const wG = stage.weightG ?? 0;
    if (wG === 0 && key !== 'packaged') return null;
    const eu = key === 'packaged' ? (stage.units || 0) : estYield(wG, skuWeightG, lossPct, STAGES[key].hurdles);
    return { key, weightG: wG, estUnits: eu, ...STAGES[key] };
  }).filter(Boolean) as (StageConfig & { key: string; weightG: number; estUnits: number })[];

  const maxW = segments.reduce((s, seg) => s + seg.weightG, 0);
  if (maxW === 0) return <div className="text-gray-600 text-xs italic">No inventory in pipeline</div>;

  return (
    <div className="flex flex-col gap-1">
      {/* Bar */}
      <div className="flex h-6 rounded-cult overflow-hidden bg-cult-border gap-px">
        {segments.map(seg => {
          const pct = (seg.weightG / maxW) * 100;
          const clampPct = Math.max(pct, seg.key === 'packaged' && seg.estUnits > 0 ? 2 : 0);
          if (clampPct === 0) return null;
          return (
            <div
              key={seg.key}
              className="group relative flex items-center justify-center overflow-hidden px-0.5"
              style={{ width: `${clampPct}%`, background: seg.barBg, borderLeft: `3px solid ${seg.barBorder}` }}
            >
              {pct >= 12 && (
                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: seg.barBorder }}>
                  {seg.key === 'packaged' ? `${seg.estUnits} ✓` : `~${seg.estUnits}`}
                </span>
              )}
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-cult-surface border border-cult-border rounded-cult px-2.5 py-1.5 text-[11px] text-cult-text-primary whitespace-nowrap shadow-lg pointer-events-none">
                <div className="font-semibold mb-0.5" style={{ color: seg.barBorder }}>{seg.label}: {formatWeight(seg.weightG)}</div>
                <div>~{seg.estUnits} units estimated</div>
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
      {/* Legend */}
      <div className="flex gap-2 flex-wrap">
        {segments.filter(s => s.weightG > 0 || s.key === 'packaged').map(seg => (
          <div key={seg.key} className="inline-flex items-center gap-1 text-[10px] leading-tight">
            <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: seg.barBorder }} />
            <span className="text-gray-500">{seg.short}</span>
            <span className="text-cult-text-primary font-semibold">{formatWeight(seg.weightG)}</span>
            <span className="font-semibold text-[9px]" style={{ color: seg.barBorder }}>
              {seg.key === 'packaged' ? `${seg.estUnits}u ✓` : `~${seg.estUnits}u`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Demand Cell ──

function DemandCell({ demand }: { demand: StrainGroup['demand'] }) {
  const assignPct = demand.ordered > 0 ? (demand.assigned / demand.ordered) * 100 : 0;
  return (
    <div>
      <div className="text-[15px] font-bold text-cult-text-primary">
        {demand.needed}<span className="text-[11px] text-gray-500 font-normal"> need</span>
      </div>
      {demand.assigned > 0 && (
        <div className="text-[10px] text-emerald-400 font-medium">
          {demand.assigned} assigned ({fmtPct(assignPct)})
        </div>
      )}
      <div className="text-[10px] text-gray-600">{demand.ordered} ordered total</div>
    </div>
  );
}

// ── Fill / Labor Cell ──

function FillCell({ strain, lossPct }: { strain: StrainGroup; lossPct: number }) {
  const { pipeline, demand, skuWeightG, formatLabel } = strain;
  const readyUnits = pipeline.packaged.units;
  const totalEstUnits = calcTotalEst(pipeline, skuWeightG, lossPct);
  const readyPct = demand.needed > 0 ? (readyUnits / demand.needed) * 100 : 0;
  const coverage = getCoverage(readyUnits, totalEstUnits, demand.needed);
  const shortfall = calcShortfallInfo(demand.needed, totalEstUnits, skuWeightG, lossPct, formatLabel);

  const b = pipeline.binned.weightG;
  const bk = pipeline.bucked.weightG;
  const bl = pipeline.bulk.weightG;
  let laborTag = '';
  let laborColor = 'text-emerald-400';

  if (shortfall) {
    laborTag = `Short ~${formatWeight(shortfall.bulkWeightNeeded)} bulk ${shortfall.formatName}`;
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
      {/* Mini progress bar */}
      <div className="flex h-1 rounded-sm bg-cult-border overflow-hidden my-0.5 w-24">
        <div className="bg-emerald-400 rounded-sm" style={{ width: `${Math.min(readyPct, 100)}%` }} />
        {totalEstUnits > readyUnits && (
          <div className="bg-sky-400/30" style={{ width: `${Math.min(((totalEstUnits - readyUnits) / (demand.needed || 1)) * 100, 100 - Math.min(readyPct, 100))}%` }} />
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

// ── Order Triage (FIFO) — deficit only ──

function OrderTriage({ orders, totalEstUnits, assigned }: { orders: OrderLineItem[]; totalEstUnits: number; assigned: number }) {
  if (!orders.length) return null;

  let remaining = totalEstUnits - assigned;
  const lines = orders.map(line => {
    const canCover = Math.min(Math.max(remaining, 0), line.quantity - (line.units_assigned ?? 0));
    const lineNeed = line.quantity - (line.units_assigned ?? 0);
    const status: 'covered' | 'partial' | 'uncovered' = canCover >= lineNeed ? 'covered' : canCover > 0 ? 'partial' : 'uncovered';
    remaining = Math.max(0, remaining - lineNeed);
    return { ...line, canCover, lineNeed, status };
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
              <span className="text-[11px] text-cult-text-primary font-medium">{line.lineNeed} units</span>
              <span className="text-[11px] text-gray-600">Due {formatDateShort(line.requested_delivery_date)}</span>
              <span className={`text-[10px] font-semibold ${ss.text}`}>
                {line.status === 'covered' ? 'Covered' :
                 line.status === 'partial' ? `${line.canCover}/${line.lineNeed}` :
                 'At Risk'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Expanded Detail ──

function ExpandedDetail({ strain, lossPct, orders }: { strain: StrainGroup; lossPct: number; orders: OrderLineItem[] }) {
  const { pipeline, demand, skuWeightG, formatLabel } = strain;
  const totalEstUnits = calcTotalEst(pipeline, skuWeightG, lossPct);
  const readyUnits = pipeline.packaged.units;
  const surplus = totalEstUnits - demand.needed;
  const coverage = getCoverage(readyUnits, totalEstUnits, demand.needed);
  const shortfall = calcShortfallInfo(demand.needed, totalEstUnits, skuWeightG, lossPct, formatLabel);

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
            Pipeline covers all {demand.needed} units needed, with ~{surplus} units to spare.
          </div>
        )}
        {coverage.state === 'tight' && (
          <div className="p-3 rounded-cult bg-amber-500/[0.04] border border-amber-500/10 text-xs text-amber-400 font-medium leading-relaxed">
            Pipeline barely covers demand — only ~{Math.abs(surplus)} unit buffer.
            Loss above {lossPct}% or new orders will create a shortfall.
          </div>
        )}
        {shortfall && (
          <div className="p-3 rounded-cult bg-rose-500/[0.04] border border-rose-500/10">
            <div className="text-[13px] font-bold text-rose-400 mb-1.5">
              Short {shortfall.shortUnits} units of {formatLabel}
            </div>
            <div className="text-xs text-cult-text-primary leading-relaxed">
              To fill remaining orders, Post Production needs an additional:
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <div className="flex-1 min-w-[140px] p-2 rounded-cult bg-sky-500/[0.06] border border-sky-500/10">
                <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wide">As trimmed bulk</div>
                <div className="text-lg font-bold text-cult-text-primary mt-0.5">~{formatWeight(shortfall.bulkWeightNeeded)}</div>
                <div className="text-[10px] text-gray-600">{shortfall.formatName} ready to package</div>
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

      {/* Order triage — deficit only */}
      {coverage.state === 'deficit' && (
        <OrderTriage orders={orders} totalEstUnits={totalEstUnits} assigned={demand.assigned} />
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
              <div className="text-base font-bold text-cult-text-primary my-0.5">~{totalEstUnits} units</div>
              <div className="text-[10px] text-gray-600">assign → ship</div>
            </div>
          </div>
        </div>
      )}

      {/* Stage cards */}
      <div className="grid grid-cols-5 gap-1.5">
        {STAGE_ORDER.map(key => {
          const stage = pipeline[key];
          const wG = stage?.weightG ?? 0;
          const units = key === 'packaged' ? (stage?.units || 0) : estYield(wG, skuWeightG, lossPct, STAGES[key].hurdles);
          const cfg = STAGES[key];
          const hasWeight = wG > 0 || key === 'packaged';
          return (
            <div
              key={key}
              className={`p-2 rounded-cult border ${hasWeight ? `${cfg.bgClass} ${cfg.borderClass}` : 'bg-cult-border/20 border-transparent'} ${!hasWeight && key !== 'packaged' ? 'opacity-35' : ''}`}
            >
              <div className={`text-[9px] font-semibold uppercase tracking-wide mb-0.5 ${cfg.colorClass}`}>{cfg.label}</div>
              <div className="text-base font-bold text-cult-text-primary">{formatWeight(wG)}</div>
              <div className="text-[10px] text-gray-500">{key === 'packaged' ? `${units} units ✓` : `~${units} units est`}</div>
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
  strain: StrainGroup;
  lossPct: number;
  orders: OrderLineItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { pipeline, demand, skuWeightG } = strain;
  const readyUnits = pipeline.packaged.units;
  const totalEstUnits = useMemo(() => calcTotalEst(pipeline, skuWeightG, lossPct), [pipeline, skuWeightG, lossPct]);
  const coverage = getCoverage(readyUnits, totalEstUnits, demand.needed);

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
            <div className="text-[10px] text-gray-600 mt-px">{strain.formatLabel} · {strain.orderCount} orders</div>
          </div>
        </div>

        {/* Demand */}
        <DemandCell demand={demand} />

        {/* Pipeline bar */}
        <PipelineBar pipeline={pipeline} skuWeightG={skuWeightG} lossPct={lossPct} />

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

  // Transform rows into StrainGroups
  const strainGroups = useMemo(() => byStrain.map(rowToStrainGroup), [byStrain]);

  // Build order lookup: strainId+formatLabel → order lines, sorted by delivery date (FIFO)
  const ordersByKey = useMemo(() => {
    const map = new Map<string, OrderLineItem[]>();
    for (const o of byOrder) {
      const key = `${o.strain_id ?? ''}::${o.format_label}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    // Sort each group by delivery date ascending (FIFO)
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
      if (sortBy === 'demand') return b.demand.needed - a.demand.needed;
      if (sortBy === 'ready') {
        const ra = (a.pipeline.packaged.units) / (a.demand.needed || 1);
        const rb = (b.pipeline.packaged.units) / (b.demand.needed || 1);
        return ra - rb;
      }
      if (sortBy === 'coverage') {
        const ca = calcTotalEst(a.pipeline, a.skuWeightG, lossPct) / (a.demand.needed || 1);
        const cb = calcTotalEst(b.pipeline, b.skuWeightG, lossPct) / (b.demand.needed || 1);
        return ca - cb;
      }
      return 0;
    });
  }, [strainGroups, sortBy, lossPct]);

  // Summary stats
  const totalNeeded = strainGroups.reduce((s, g) => s + g.demand.needed, 0);
  const totalAssigned = strainGroups.reduce((s, g) => s + g.demand.assigned, 0);
  const totalOrdered = strainGroups.reduce((s, g) => s + g.demand.ordered, 0);
  const deficitCount = strainGroups.filter(g => {
    const t = calcTotalEst(g.pipeline, g.skuWeightG, lossPct);
    return getCoverage(g.pipeline.packaged.units, t, g.demand.needed).state === 'deficit';
  }).length;
  const tightCount = strainGroups.filter(g => {
    const t = calcTotalEst(g.pipeline, g.skuWeightG, lossPct);
    return getCoverage(g.pipeline.packaged.units, t, g.demand.needed).state === 'tight';
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
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Ordered</div>
          <div className="text-lg font-bold text-cult-text-primary">{totalOrdered.toLocaleString()}</div>
        </div>
        <span className="text-gray-600">→</span>
        <div>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wide">Assigned</div>
          <div className="text-lg font-bold text-emerald-400">{totalAssigned.toLocaleString()}</div>
        </div>
        <span className="text-gray-600">→</span>
        <div>
          <div className="text-[10px] text-rose-400 uppercase tracking-wide">Still Need</div>
          <div className="text-lg font-bold text-rose-400">{totalNeeded.toLocaleString()}</div>
        </div>
        <div className="w-px h-7 bg-cult-border" />
        <div className="text-[11px] text-gray-500">
          {totalOrdered > 0 ? fmtPct(totalAssigned / totalOrdered * 100) : '0%'} fulfilled across {strainGroups.length} strains
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
        {/* Loss slider */}
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
        {/* Sort */}
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
        {sorted.map(sg => {
          const key = `${sg.strainId ?? ''}::${sg.formatLabel}`;
          return (
            <StrainRow
              key={key}
              strain={sg}
              lossPct={lossPct}
              orders={ordersByKey.get(key) ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}
