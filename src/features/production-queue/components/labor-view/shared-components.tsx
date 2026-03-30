import { formatWeight } from '@/shared/utils/format';
import type { Urgency } from '../../types';
import { STAGES, STAGE_ORDER, type Pipeline } from './constants';
import { estOutputG } from './utils';

// ─── Urgency Badge ──────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  overdue: { bg: 'bg-red-500/20',    text: 'text-red-400',    dot: 'bg-red-400',    label: 'Overdue' },
  urgent:  { bg: 'bg-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400',  label: 'Urgent' },
  soon:    { bg: 'bg-sky-500/20',    text: 'text-sky-400',    dot: 'bg-sky-400',    label: 'Soon' },
  normal:  { bg: 'bg-green-500/20',  text: 'text-green-400',  dot: 'bg-green-400',  label: 'On Track' },
  no_date: { bg: 'bg-gray-500/20',   text: 'text-gray-400',   dot: 'bg-gray-400',   label: 'No Date' },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = URGENCY_STYLES[urgency] ?? URGENCY_STYLES.no_date;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.bg} ${c.text} text-[11px] font-semibold`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Pipeline Bar (weight-only, no unit estimates) ──────────────────────────

export function PipelineBar({ pipeline, lossPct }: { pipeline: Pipeline; lossPct: number }) {
  const segments = STAGE_ORDER.map(key => {
    const wG = pipeline[key].weightG;
    if (wG === 0 && key !== 'packaged') return null;
    const estG = key === 'packaged' ? wG : estOutputG(wG, lossPct, STAGES[key].hurdles);
    return { key, weightG: wG, estG, ...STAGES[key] };
  }).filter(Boolean) as (typeof STAGES[string] & { key: string; weightG: number; estG: number })[];

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
                  {seg.key === 'packaged' ? `${formatWeight(seg.weightG)} \u2713` : formatWeight(seg.weightG)}
                </span>
              )}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-cult-surface border border-cult-border rounded-cult px-2.5 py-1.5 text-[11px] text-cult-text-primary whitespace-nowrap shadow-lg pointer-events-none">
                <div className="font-semibold mb-0.5" style={{ color: seg.barBorder }}>{seg.label}: {formatWeight(seg.weightG)}</div>
                <div>&rarr; ~{formatWeight(seg.estG)} after loss</div>
                <div className="text-gray-500 mt-0.5">
                  {seg.hurdles === 0 ? '\u2713 Ready to ship' : `${seg.hurdles} step${seg.hurdles > 1 ? 's' : ''}: ${seg.verb}`}
                  {seg.time && ` \u00b7 ${seg.time}`}
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
                ({(pipeline.packaged as Pipeline['packaged']).unitCount} items) \u2713
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Coverage State Colors ──────────────────────────────────────────────────

export const COVERAGE_COLORS: Record<string, string> = {
  surplus: 'text-emerald-400',
  tight:   'text-amber-400',
  deficit: 'text-rose-400',
};
