import { Fragment, useMemo } from 'react';
import { X } from 'lucide-react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { OrderLineItem } from '../../types';
import {
  STAGES, STAGE_ORDER,
  type StrainAggregate, type Pipeline,
} from './constants';
import {
  calcTotalEstG, getCoverage, calcShortfallG, estOutputG, fmtPct,
} from './utils';
import { UrgencyBadge, PipelineBar, COVERAGE_COLORS } from './shared-components';

// ─── Strain Detail Panel ────────────────────────────────────────────────────
// Section 3: Full strain breakdown — shown when a strain is selected.
// Shows: pipeline bar, format demand, order triage, labor path, stage cards.

interface StrainDetailPanelProps {
  strain: StrainAggregate;
  lossPct: number;
  orders: OrderLineItem[];
  onClose: () => void;
}

// ── Format Demand Breakdown ──

function FormatBreakdown({ formats }: { formats: StrainAggregate['formats'] }) {
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

// ── Order Triage (FIFO) ──

function OrderTriage({ orders, totalEstG }: { orders: OrderLineItem[]; totalEstG: number }) {
  if (!orders.length) return null;

  let remainingG = totalEstG;
  const lines = orders.map(line => {
    const lineNeedUnits = line.quantity - (line.units_assigned ?? 0);
    const lineNeedG = lineNeedUnits * (line.weight_per_unit_g ?? 0);
    const canCoverG = Math.min(Math.max(remainingG, 0), lineNeedG);
    const status: 'covered' | 'partial' | 'uncovered' =
      canCoverG >= lineNeedG ? 'covered' : canCoverG > 0 ? 'partial' : 'uncovered';
    remainingG = Math.max(0, remainingG - lineNeedG);
    return { ...line, lineNeedUnits, lineNeedG, canCoverG, status };
  });

  const statusStyles = {
    covered:   { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-400', icon: '\u2713', label: 'Covered' },
    partial:   { bg: 'bg-amber-500/5',   border: 'border-amber-500/15',   text: 'text-amber-400',   icon: '\u25D0', label: 'Partial' },
    uncovered: { bg: 'bg-rose-500/5',    border: 'border-rose-500/15',    text: 'text-rose-400',    icon: '\u2717', label: 'At Risk' },
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
              <span className="text-[11px] text-cult-text-primary font-medium">{line.lineNeedUnits}\u00d7 {line.format_label}</span>
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

// ── Main Panel ──

export default function StrainDetailPanel({
  strain,
  lossPct,
  orders,
  onClose,
}: StrainDetailPanelProps) {
  const { pipeline, totalDemandG } = strain;
  const readyG = pipeline.packaged.weightG;
  const totalEstG = useMemo(() => calcTotalEstG(pipeline, lossPct), [pipeline, lossPct]);
  const readyPct = totalDemandG > 0 ? (readyG / totalDemandG) * 100 : 0;
  const surplusG = totalEstG - totalDemandG;
  const coverage = getCoverage(readyG, totalEstG, totalDemandG);
  const shortfall = calcShortfallG(totalDemandG, totalEstG, lossPct);

  // Build labor tasks
  const tasks: { action: string; weight: number; colorClass: string; borderClass: string; bgClass: string; time: string; people: string }[] = [];
  const b = pipeline.binned.weightG;
  const bk = pipeline.bucked.weightG;
  const bl = pipeline.bulk.weightG;
  if (b > 0) tasks.push({ action: 'Buck', weight: b, colorClass: 'text-orange-400', borderClass: 'border-orange-500/20', bgClass: 'bg-orange-500/10', time: '~2-3 days', people: '1-2 people' });
  if (bk > 0 || b > 0) tasks.push({ action: 'Trim', weight: bk + (b > 0 ? b * (1 - lossPct / 100) : 0), colorClass: 'text-amber-400', borderClass: 'border-amber-500/20', bgClass: 'bg-amber-500/10', time: '~1-2 days', people: '2-3 people' });
  if (bl > 0 || bk > 0 || b > 0) tasks.push({ action: 'Package', weight: bl + bk * (1 - lossPct / 100), colorClass: 'text-sky-400', borderClass: 'border-sky-500/20', bgClass: 'bg-sky-500/10', time: 'same day', people: '1 person' });

  return (
    <div className="bg-cult-surface rounded-cult border border-cult-border overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cult-border/50">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-cult-text-primary">{strain.strainName}</span>
          <UrgencyBadge urgency={strain.urgency} />
          {strain.earliestDelivery && (
            <span className="text-[10px] text-gray-500">
              Due {formatDateShort(strain.earliestDelivery)}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-cult-surface-raised transition-colors text-gray-500 hover:text-cult-text-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Quick stats row */}
        <div className="flex items-center gap-5 flex-wrap">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Demand</div>
            <div className="text-lg font-bold text-cult-text-primary">{formatWeight(totalDemandG)}</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wide">Packaged</div>
            <div className="text-lg font-bold text-emerald-400">{formatWeight(readyG)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Fill</div>
            <div className={`text-lg font-bold ${COVERAGE_COLORS[coverage.state]}`}>
              {fmtPct(readyPct)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Est. Total</div>
            <div className="text-lg font-bold text-sky-400">{formatWeight(totalEstG)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Formats</div>
            <div className="text-sm font-semibold text-cult-text-primary">
              {strain.formats.length} ({strain.orderCount} orders)
            </div>
          </div>
        </div>

        {/* Pipeline bar */}
        <PipelineBar pipeline={pipeline} lossPct={lossPct} />

        {/* Narrative summary */}
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
                  {i > 0 && <div className="flex items-center text-gray-600 text-sm px-1">&rarr;</div>}
                  <div className={`flex-1 p-2 rounded-cult ${task.bgClass} border ${task.borderClass}`}>
                    <div className={`text-[13px] font-bold ${task.colorClass}`}>{task.action}</div>
                    <div className="text-base font-bold text-cult-text-primary my-0.5">{formatWeight(task.weight)}</div>
                    <div className="text-[10px] text-gray-600">{task.time} \u00b7 {task.people}</div>
                  </div>
                </Fragment>
              ))}
              <div className="flex items-center text-gray-600 text-sm px-1">&rarr;</div>
              <div className="flex-1 p-2 rounded-cult bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[13px] font-bold text-emerald-400">Ready</div>
                <div className="text-base font-bold text-cult-text-primary my-0.5">~{formatWeight(totalEstG)}</div>
                <div className="text-[10px] text-gray-600">assign &rarr; ship</div>
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
                    ? `${pipeline.packaged.unitCount} items \u2713`
                    : `\u2192 ~${formatWeight(estG)} out`}
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
    </div>
  );
}
