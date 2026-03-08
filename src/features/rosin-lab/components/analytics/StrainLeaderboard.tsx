import React, { useEffect, useState } from 'react';
import type { AnalyticsTimeRange, StrainLeaderboardEntry } from '../../types/rosin-lab.types';
import { getStrainLeaderboard } from '../../services/rosinLabService';
import { getYieldBarColor } from '../../utils/analyticsHelpers';

const RANK_STYLES: Record<number, { border: string; color: string }> = {
  1: { border: '#FFD700', color: '#FFD700' },
  2: { border: '#C0C0C0', color: '#C0C0C0' },
  3: { border: '#CD7F32', color: '#CD7F32' },
};

const DEFAULT_VISIBLE = 10;

function formatLeaderboardDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

interface StrainLeaderboardProps {
  timeRange: AnalyticsTimeRange;
}

export const StrainLeaderboard: React.FC<StrainLeaderboardProps> = ({ timeRange }) => {
  const [entries, setEntries] = useState<StrainLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setExpanded(false);
    getStrainLeaderboard(timeRange).then(({ data }) => {
      setEntries(data ?? []);
      setLoading(false);
    });
  }, [timeRange]);

  const maxYield = entries.length > 0
    ? Math.max(...entries.map((e) => e.avg_yield_percentage))
    : 1;

  const visible = expanded ? entries : entries.slice(0, DEFAULT_VISIBLE);
  const hasMore = entries.length > DEFAULT_VISIBLE;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-[#666666] text-sm">No strain data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1C1C1C]">
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-left px-3 py-2 w-10">
                #
              </th>
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-left px-3 py-2 w-36">
                Strain
              </th>
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-center px-3 py-2 w-16">
                Runs
              </th>
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-left px-3 py-2">
                Avg Yield
              </th>
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-right px-3 py-2 w-16">
                Best
              </th>
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-right px-3 py-2 w-16">
                Worst
              </th>
              <th className="uppercase text-[11px] font-semibold text-[#666666] tracking-wider text-right px-3 py-2 w-24">
                Last Pressed
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry, i) => {
              const rank = i + 1;
              const rankStyle = RANK_STYLES[rank];
              const barWidthPct =
                maxYield > 0 ? (entry.avg_yield_percentage / maxYield) * 100 : 0;
              const barColor = getYieldBarColor(entry.avg_yield_percentage);

              return (
                <tr
                  key={entry.strain_id}
                  className="border-b border-[#2E2E2E] hover:bg-[#1C1C1C]/50 transition-colors"
                  style={
                    rankStyle
                      ? { boxShadow: `inset 3px 0 0 ${rankStyle.border}` }
                      : undefined
                  }
                >
                  <td className="px-3 py-3 w-10">
                    <span
                      className="text-sm font-bold"
                      style={{ color: rankStyle ? rankStyle.color : '#666666' }}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-3 py-3 w-36">
                    <span
                      className={`text-sm ${rank <= 3 ? 'font-bold text-white' : 'text-[#A6A6A6]'}`}
                    >
                      {entry.strain_name}
                    </span>
                    {entry.strain_abbreviation && (
                      <span className="text-[#666666] text-xs ml-1">
                        ({entry.strain_abbreviation})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 w-16 text-center text-[#A6A6A6]">
                    {entry.total_runs}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#1C1C1C] h-2 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidthPct}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold w-12 text-right flex-shrink-0"
                        style={{ color: barColor }}
                      >
                        {entry.avg_yield_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 w-16 text-right text-emerald-400 text-xs font-semibold">
                    {entry.max_yield_percentage.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 w-16 text-right text-red-400 text-xs font-semibold">
                    {entry.min_yield_percentage.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 w-24 text-right text-[#666666] text-xs">
                    {formatLeaderboardDate(entry.last_pressed)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="px-4 py-3 border-t border-[#2E2E2E]">
          <button
            className="text-xs text-[#A6A6A6] hover:text-white transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? 'Show fewer strains'
              : `View all ${entries.length} strains`}
          </button>
        </div>
      )}
    </div>
  );
};
