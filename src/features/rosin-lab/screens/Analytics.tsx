import React, { useEffect, useState } from 'react';
import type { AnalyticsKpis, AnalyticsTimeRange } from '../types/rosin-lab.types';
import { getAnalyticsKpis } from '../services/rosinLabService';
import { getDateFrom, getPreviousPeriodDates } from '../utils/analyticsHelpers';
import { KpiCards } from '../components/analytics/KpiCards';
import { YieldTrendChart } from '../components/analytics/YieldTrendChart';
import { ThroughputChart } from '../components/analytics/ThroughputChart';
import { ConsistencyBreakdown } from '../components/analytics/ConsistencyBreakdown';
import { StrainLeaderboard } from '../components/analytics/StrainLeaderboard';

const TIME_RANGES: { label: string; value: AnalyticsTimeRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="bg-[#111111] border border-[#2E2E2E] rounded-[6px] overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-[#2E2E2E]">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-xs text-[#666666] mt-0.5">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [prevKpis, setPrevKpis] = useState<AnalyticsKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const dateFrom = getDateFrom(timeRange);
  const dateTo = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setKpisLoading(true);
    const prev = getPreviousPeriodDates(timeRange);

    Promise.all([
      getAnalyticsKpis(dateFrom, dateTo),
      getAnalyticsKpis(prev.from, prev.to),
    ]).then(([current, previous]) => {
      setKpis(current);
      setPrevKpis(previous);
      setKpisLoading(false);
    });
  }, [timeRange, dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-6 min-h-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-[#A6A6A6] mt-0.5">Production performance and trends</p>
        </div>

        <div className="flex rounded-[6px] border border-[#2E2E2E] overflow-hidden">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                timeRange === r.value
                  ? 'bg-[#1C1C1C] text-white border-r border-[#2E2E2E] last:border-r-0'
                  : 'text-[#A6A6A6] hover:text-white border-r border-[#2E2E2E] last:border-r-0'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {kpisLoading ? (
        <div className="flex gap-4 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 min-w-[180px] h-24 rounded-[6px] bg-[#111111] border border-[#2E2E2E] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <KpiCards kpis={kpis} prevKpis={prevKpis} timeRange={timeRange} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Press Yield Trend"
          subtitle="Yield percentage per press run"
        >
          <YieldTrendChart dateFrom={dateFrom} dateTo={dateTo} />
        </ChartCard>

        <ChartCard
          title="Rosin Output"
          subtitle="Total output weight by period"
        >
          <ThroughputChart dateFrom={dateFrom} dateTo={dateTo} timeRange={timeRange} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Consistency Breakdown"
          subtitle="Output by rosin type"
        >
          <ConsistencyBreakdown dateFrom={dateFrom} dateTo={dateTo} />
        </ChartCard>

        <ChartCard
          title="Strain Performance"
          subtitle="Ranked by average press yield"
        >
          <StrainLeaderboard timeRange={timeRange} />
        </ChartCard>
      </div>
    </div>
  );
};
