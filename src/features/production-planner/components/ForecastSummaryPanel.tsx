import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ForecastSummaryRow } from '../types';

function formatMonth(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1)}kg`;
  return `${g.toFixed(0)}g`;
}

function formatRevenue(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function formatHours(h: number): string {
  return `${h.toFixed(0)}h`;
}

export function ForecastSummaryPanel() {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<ForecastSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    setError(null);
    supabase
      .from('v_forecast_summary')
      .select('*')
      .order('month', { ascending: true })
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(err.message);
        } else {
          setRows((data ?? []) as ForecastSummaryRow[]);
        }
      });
  }, [expanded]);

  return (
    <div className="border-t border-violet-700/40 bg-cult-bg flex-shrink-0">
      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-6 py-2 text-xs font-semibold text-violet-300 hover:text-violet-100 hover:bg-violet-900/20 transition-colors"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        <span>6-Month Forecast Summary</span>
        <span className="ml-auto">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-400" />
            </div>
          )}

          {error && (
            <p className="text-xs text-cult-stage-flower py-2">{error}</p>
          )}

          {!loading && !error && rows.length === 0 && (
            <p className="text-xs text-cult-text-muted py-2">No forecast data. Add planned cycles to see projections.</p>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-cult-text-muted border-b border-cult-border/50">
                    <th className="text-left py-1.5 pr-4 font-medium w-16">Month</th>
                    {/* Projected */}
                    <th className="text-right py-1.5 px-2 font-medium text-violet-400">Proj. Yield</th>
                    <th className="text-right py-1.5 px-2 font-medium text-violet-400">Proj. Rev</th>
                    <th className="text-right py-1.5 px-2 font-medium text-violet-400">Proj. Labor</th>
                    {/* Committed */}
                    <th className="text-right py-1.5 px-2 font-medium text-emerald-400">Cmmt. Yield</th>
                    <th className="text-right py-1.5 px-2 font-medium text-emerald-400">Cmmt. Rev</th>
                    <th className="text-right py-1.5 px-2 font-medium text-emerald-400">Cmmt. Labor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const hasProjected = row.projected_yield_grams > 0 || row.projected_revenue > 0;
                    const hasCommitted = row.committed_yield_grams > 0 || row.committed_revenue > 0;
                    return (
                      <tr key={row.month} className="border-b border-cult-border/30 hover:bg-cult-surface/40 transition-colors">
                        <td className="py-1.5 pr-4 font-semibold text-cult-white">{formatMonth(row.month)}</td>
                        {/* Projected */}
                        <td className={`text-right py-1.5 px-2 ${hasProjected ? 'text-violet-300' : 'text-cult-text-muted'}`}>
                          {formatGrams(row.projected_yield_grams)}
                        </td>
                        <td className={`text-right py-1.5 px-2 ${hasProjected ? 'text-violet-300' : 'text-cult-text-muted'}`}>
                          {formatRevenue(row.projected_revenue)}
                        </td>
                        <td className={`text-right py-1.5 px-2 ${hasProjected ? 'text-violet-300' : 'text-cult-text-muted'}`}>
                          {formatHours(row.projected_labor_hours)}
                        </td>
                        {/* Committed */}
                        <td className={`text-right py-1.5 px-2 ${hasCommitted ? 'text-emerald-300' : 'text-cult-text-muted'}`}>
                          {formatGrams(row.committed_yield_grams)}
                        </td>
                        <td className={`text-right py-1.5 px-2 ${hasCommitted ? 'text-emerald-300' : 'text-cult-text-muted'}`}>
                          {formatRevenue(row.committed_revenue)}
                        </td>
                        <td className={`text-right py-1.5 px-2 ${hasCommitted ? 'text-emerald-300' : 'text-cult-text-muted'}`}>
                          {formatHours(row.committed_labor_hours)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center gap-4 pt-2 text-xs text-cult-silver">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500 inline-block" /> Projected — from planned cycles</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Committed — active plant groups</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
