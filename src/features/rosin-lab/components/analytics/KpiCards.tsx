import React from 'react';
import type { AnalyticsKpis, AnalyticsTimeRange } from '../../types/rosin-lab.types';

interface KpiCardProps {
  label: string;
  value: string;
  accentColor: string;
  delta?: number | null;
  deltaLabel?: string;
  invertDelta?: boolean;
}

function KpiCard({ label, value, accentColor, delta, deltaLabel, invertDelta }: KpiCardProps) {
  const isPositive = invertDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  const isNeutral = delta === null || delta === undefined;
  const arrow = isPositive ? '↑' : '↓';
  const deltaColor = isNeutral ? '' : isPositive ? 'text-emerald-400' : 'text-red-400';
  const absDelta = delta !== null && delta !== undefined ? Math.abs(delta) : null;

  return (
    <div
      className="flex-1 min-w-[180px] rounded-[6px] border border-[#2E2E2E] bg-[#111111] p-5"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <p className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {!isNeutral && absDelta !== null && (
        <p className={`text-xs mt-1 ${deltaColor}`}>
          {arrow} {deltaLabel ?? String(absDelta)} vs prev period
        </p>
      )}
    </div>
  );
}

interface KpiCardsProps {
  kpis: AnalyticsKpis | null;
  prevKpis: AnalyticsKpis | null;
  timeRange: AnalyticsTimeRange;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, prevKpis, timeRange }) => {
  const showDelta = timeRange !== 'all' && kpis !== null && prevKpis !== null;

  const runsDelta = showDelta ? kpis!.totalRuns - prevKpis!.totalRuns : null;
  const yieldDelta = showDelta ? kpis!.avgYield - prevKpis!.avgYield : null;
  const outputDelta = showDelta ? kpis!.totalOutput - prevKpis!.totalOutput : null;
  const cureLossDelta = showDelta ? kpis!.avgCureLoss - prevKpis!.avgCureLoss : null;

  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <div className="flex flex-wrap gap-4">
      <KpiCard
        label="Total Runs"
        value={kpis ? fmt(kpis.totalRuns) : '—'}
        accentColor="#F97316"
        delta={runsDelta}
        deltaLabel={runsDelta !== null ? (runsDelta >= 0 ? `+${runsDelta}` : String(runsDelta)) : undefined}
      />
      <KpiCard
        label="Avg Press Yield"
        value={kpis ? `${fmt(kpis.avgYield, 1)}%` : '—'}
        accentColor="#F97316"
        delta={yieldDelta}
        deltaLabel={
          yieldDelta !== null
            ? `${yieldDelta >= 0 ? '+' : ''}${fmt(yieldDelta, 1)}%`
            : undefined
        }
      />
      <KpiCard
        label="Total Rosin Output"
        value={kpis ? `${fmt(kpis.totalOutput, 0)}g` : '—'}
        accentColor="#6366F1"
        delta={outputDelta}
        deltaLabel={
          outputDelta !== null
            ? `${outputDelta >= 0 ? '+' : ''}${fmt(outputDelta, 0)}g`
            : undefined
        }
      />
      <KpiCard
        label="Avg Cure Loss"
        value={kpis ? `${fmt(kpis.avgCureLoss, 1)}%` : '—'}
        accentColor="#8B5CF6"
        delta={cureLossDelta}
        deltaLabel={
          cureLossDelta !== null
            ? `${cureLossDelta >= 0 ? '+' : ''}${fmt(cureLossDelta, 1)}%`
            : undefined
        }
        invertDelta
      />
      <KpiCard
        label="Active Strains"
        value={kpis ? fmt(kpis.activeStrains) : '—'}
        accentColor="#3B82F6"
      />
    </div>
  );
};
