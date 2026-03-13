import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  Filter,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getRevenueForecast } from '../services/crm.service';
import type { RevenueForecastItem, ForecastConfidence } from '../types/crm.types';

interface RevenueForecastingEngineProps {
  onViewChange: (view: string) => void;
}

type ForecastFilter = 'all' | 'reorder' | 'pipeline' | 'high_confidence' | 'at_risk';
type SortField = 'monthly_forecast' | 'current_month_realized' | 'current_month_expected_additional' | 'reorder_probability' | 'avg_monthly_revenue' | 'customer_name';
type SortDir = 'asc' | 'desc';

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function confidenceBadge(c: ForecastConfidence) {
  switch (c) {
    case 'high':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">High</span>;
    case 'medium':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">Medium</span>;
    case 'low':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Low</span>;
    case 'none':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cult-ash/30 text-cult-ash">None</span>;
    case 'prospect':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-400">Prospect</span>;
  }
}

function SortArrow({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return null;
  return <span className="ml-1 text-cult-ash">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function RevenueForecastingEngine({ onViewChange }: RevenueForecastingEngineProps) {
  const [items, setItems] = useState<RevenueForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ForecastFilter>('all');
  const [sortField, setSortField] = useState<SortField>('monthly_forecast');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getRevenueForecast();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Aggregates ── */
  const agg = useMemo(() => {
    const reorders = items.filter(i => i.forecast_type === 'reorder');
    const prospects = items.filter(i => i.forecast_type === 'pipeline');

    const totalForecast = items.reduce((s, i) => s + i.monthly_forecast, 0);
    const totalRealized = reorders.reduce((s, i) => s + i.current_month_realized, 0);
    const totalPipeline = reorders.reduce((s, i) => s + i.current_month_pipeline, 0);
    const totalExpectedAdditional = reorders.reduce((s, i) => s + i.current_month_expected_additional, 0);
    const pipelineWeighted = prospects.reduce((s, i) => s + i.monthly_forecast, 0);
    const reorderForecast = reorders.reduce((s, i) => s + i.monthly_forecast, 0);

    const target = items[0]?.monthly_target ?? 150000;
    const gapToTarget = target - totalRealized - totalPipeline;
    const forecastedTotal = totalRealized + totalPipeline + totalExpectedAdditional + pipelineWeighted;
    const forecastGap = target - forecastedTotal;

    const highConfCount = reorders.filter(i => i.confidence === 'high').length;
    const atRiskCount = reorders.filter(i => i.confidence === 'low' || i.confidence === 'none').length;

    return {
      target,
      totalRealized,
      totalPipeline,
      totalExpectedAdditional,
      pipelineWeighted,
      reorderForecast,
      totalForecast,
      forecastedTotal,
      gapToTarget,
      forecastGap,
      reorderCount: reorders.length,
      prospectCount: prospects.length,
      highConfCount,
      atRiskCount,
    };
  }, [items]);

  /* ── Filter + Search + Sort pipeline ── */
  const displayed = useMemo(() => {
    let result = [...items];

    // filter
    switch (filter) {
      case 'reorder': result = result.filter(i => i.forecast_type === 'reorder'); break;
      case 'pipeline': result = result.filter(i => i.forecast_type === 'pipeline'); break;
      case 'high_confidence': result = result.filter(i => i.confidence === 'high' || i.confidence === 'medium'); break;
      case 'at_risk': result = result.filter(i => i.confidence === 'low' || i.confidence === 'none'); break;
    }

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.customer_name.toLowerCase().includes(q) ||
        i.dispensary_code.toLowerCase().includes(q)
      );
    }

    // sort
    result.sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, filter, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filterButtons: { key: ForecastFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'reorder', label: 'Reorders' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'high_confidence', label: 'High Confidence' },
    { key: 'at_risk', label: 'At Risk' },
  ];

  if (loading) return <LoadingSpinner />;

  const targetPct = agg.target > 0 ? Math.min((agg.forecastedTotal / agg.target) * 100, 100) : 0;
  const realizedPct = agg.target > 0 ? Math.min((agg.totalRealized / agg.target) * 100, 100) : 0;
  const pipelinePct = agg.target > 0 ? Math.min(((agg.totalRealized + agg.totalPipeline) / agg.target) * 100, targetPct) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-cult-white">Revenue Forecasting Engine</h2>
          <p className="text-sm text-cult-ash mt-0.5">Projected revenue from reorder patterns &amp; pipeline</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cult-dark hover:bg-cult-dark/80 text-cult-ash text-sm transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Target Progress Bar */}
      <div className="bg-cult-dark rounded-xl p-4 border border-cult-dark/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-cult-white">Monthly Target: {fmt$(agg.target)}</span>
          </div>
          <span className={`text-sm font-semibold ${agg.forecastGap <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {agg.forecastGap <= 0 ? 'On Track' : `Gap: ${fmt$(agg.forecastGap)}`}
          </span>
        </div>
        <div className="w-full h-4 bg-cult-black rounded-full overflow-hidden relative">
          {/* Forecast zone */}
          <div className="absolute inset-y-0 left-0 bg-emerald-500/15 rounded-full transition-all" style={{ width: `${targetPct}%` }} />
          {/* Pipeline zone */}
          <div className="absolute inset-y-0 left-0 bg-amber-500/30 rounded-full transition-all" style={{ width: `${pipelinePct}%` }} />
          {/* Realized zone */}
          <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all" style={{ width: `${realizedPct}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-cult-ash">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Realized: {fmt$(agg.totalRealized)}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 inline-block" /> Pipeline: {fmt$(agg.totalPipeline)}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/15 inline-block" /> Forecast: {fmt$(agg.forecastedTotal)}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-cult-dark rounded-xl p-3 border border-cult-dark/50">
          <div className="flex items-center gap-1.5 text-cult-ash text-xs mb-1"><DollarSign className="w-3 h-3" /> Reorder Forecast</div>
          <div className="text-lg font-bold text-cult-white">{fmt$(agg.reorderForecast)}</div>
          <div className="text-xs text-cult-ash">{agg.reorderCount} accounts</div>
        </div>
        <div className="bg-cult-dark rounded-xl p-3 border border-cult-dark/50">
          <div className="flex items-center gap-1.5 text-cult-ash text-xs mb-1"><TrendingUp className="w-3 h-3" /> Pipeline Weighted</div>
          <div className="text-lg font-bold text-sky-400">{fmt$(agg.pipelineWeighted)}</div>
          <div className="text-xs text-cult-ash">{agg.prospectCount} prospects</div>
        </div>
        <div className="bg-cult-dark rounded-xl p-3 border border-cult-dark/50">
          <div className="flex items-center gap-1.5 text-cult-ash text-xs mb-1"><DollarSign className="w-3 h-3" /> Realized MTD</div>
          <div className="text-lg font-bold text-emerald-400">{fmt$(agg.totalRealized)}</div>
          <div className="text-xs text-cult-ash">Completed orders</div>
        </div>
        <div className="bg-cult-dark rounded-xl p-3 border border-cult-dark/50">
          <div className="flex items-center gap-1.5 text-cult-ash text-xs mb-1"><Zap className="w-3 h-3" /> Expected Add'l</div>
          <div className="text-lg font-bold text-amber-400">{fmt$(agg.totalExpectedAdditional)}</div>
          <div className="text-xs text-cult-ash">Based on patterns</div>
        </div>
        <div className="bg-cult-dark rounded-xl p-3 border border-cult-dark/50">
          <div className="flex items-center gap-1.5 text-cult-ash text-xs mb-1"><ArrowUpRight className="w-3 h-3" /> High Confidence</div>
          <div className="text-lg font-bold text-emerald-400">{agg.highConfCount}</div>
          <div className="text-xs text-cult-ash">Reliable reorders</div>
        </div>
        <div className="bg-cult-dark rounded-xl p-3 border border-cult-dark/50">
          <div className="flex items-center gap-1.5 text-cult-ash text-xs mb-1"><AlertTriangle className="w-3 h-3" /> At Risk</div>
          <div className="text-lg font-bold text-red-400">{agg.atRiskCount}</div>
          <div className="text-xs text-cult-ash">Low/no confidence</div>
        </div>
      </div>

      {/* Gap Alert */}
      {agg.forecastGap > 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Revenue Gap: {fmt$(agg.forecastGap)} below {fmt$(agg.target)} target</p>
            <p className="text-xs text-cult-ash mt-0.5">
              Forecasted total ({fmt$(agg.forecastedTotal)}) includes {fmt$(agg.totalRealized)} realized + {fmt$(agg.totalPipeline)} pipeline + {fmt$(agg.totalExpectedAdditional)} expected reorders + {fmt$(agg.pipelineWeighted)} weighted prospects.
              Focus on advancing pipeline prospects and re-engaging at-risk accounts to close the gap.
            </p>
          </div>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-ash" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-cult-dark border border-cult-dark/50 text-cult-white text-sm placeholder-cult-ash focus:outline-none focus:border-cult-ash/30"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-cult-ash" />
          {filterButtons.map(fb => (
            <button
              key={fb.key}
              onClick={() => setFilter(fb.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === fb.key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-cult-dark text-cult-ash hover:text-cult-white'
              }`}
            >
              {fb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast Table */}
      <div className="bg-cult-dark rounded-xl border border-cult-dark/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-dark/50 text-cult-ash text-xs">
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => toggleSort('customer_name')}>
                Account <SortArrow field="customer_name" current={sortField} dir={sortDir} />
              </th>
              <th className="text-center px-3 py-3 font-medium">Type</th>
              <th className="text-center px-3 py-3 font-medium">Confidence</th>
              <th className="text-right px-3 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => toggleSort('avg_monthly_revenue')}>
                Avg Monthly <SortArrow field="avg_monthly_revenue" current={sortField} dir={sortDir} />
              </th>
              <th className="text-right px-3 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => toggleSort('reorder_probability')}>
                Probability <SortArrow field="reorder_probability" current={sortField} dir={sortDir} />
              </th>
              <th className="text-right px-3 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => toggleSort('monthly_forecast')}>
                Forecast <SortArrow field="monthly_forecast" current={sortField} dir={sortDir} />
              </th>
              <th className="text-right px-3 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => toggleSort('current_month_realized')}>
                Realized <SortArrow field="current_month_realized" current={sortField} dir={sortDir} />
              </th>
              <th className="text-right px-3 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => toggleSort('current_month_expected_additional')}>
                Expected <SortArrow field="current_month_expected_additional" current={sortField} dir={sortDir} />
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {displayed.map(item => (
              <tr
                key={`${item.forecast_type}-${item.customer_id}`}
                className="border-b border-cult-dark/30 hover:bg-cult-dark/50 transition-colors cursor-pointer"
                onClick={() => onViewChange(`crm-account-detail:${item.customer_id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-cult-white">{item.customer_name}</div>
                  {item.dispensary_code && (
                    <div className="text-xs text-cult-ash">{item.dispensary_code}</div>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.forecast_type === 'reorder'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-sky-500/20 text-sky-400'
                  }`}>
                    {item.forecast_type === 'reorder' ? 'Reorder' : 'Pipeline'}
                  </span>
                </td>
                <td className="text-center px-3 py-3">
                  {confidenceBadge(item.confidence)}
                </td>
                <td className="text-right px-3 py-3 text-cult-white tabular-nums">
                  {item.forecast_type === 'reorder' ? fmt$(item.avg_monthly_revenue) : '—'}
                </td>
                <td className="text-right px-3 py-3 tabular-nums">
                  <span className={
                    item.reorder_probability >= 0.67 ? 'text-emerald-400' :
                    item.reorder_probability >= 0.33 ? 'text-amber-400' :
                    'text-red-400'
                  }>
                    {fmtPct(item.reorder_probability)}
                  </span>
                </td>
                <td className="text-right px-3 py-3 font-semibold text-cult-white tabular-nums">
                  {fmt$(item.monthly_forecast)}
                </td>
                <td className="text-right px-3 py-3 text-emerald-400 tabular-nums">
                  {item.current_month_realized > 0 ? fmt$(item.current_month_realized) : '—'}
                </td>
                <td className="text-right px-3 py-3 text-amber-400 tabular-nums">
                  {item.current_month_expected_additional > 0 ? fmt$(item.current_month_expected_additional) : '—'}
                </td>
                <td className="px-2 py-3">
                  <ChevronRight className="w-4 h-4 text-cult-ash" />
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-cult-ash">
                  No forecast data matches your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-cult-ash text-center">
        Showing {displayed.length} of {items.length} accounts · Forecast based on 3-month rolling average &amp; pipeline stage probability
      </div>
    </div>
  );
}
