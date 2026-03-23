import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Filter,
  Minus,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getStoreScorecard } from '../services/crm.service';
import type { StoreScorecard, OrderFrequencyLabel, ProductMixLabel } from '../types/crm.types';

interface StorePerformanceScorecardProps {}

type ScorecardFilter = 'all' | 'healthy' | 'cooling' | 'at_risk' | 'dormant';
type SortField =
  | 'customer_name'
  | 'health_score'
  | 'lifetime_revenue'
  | 'avg_order_value_90d'
  | 'orders_90d'
  | 'product_types_purchased'
  | 'visit_compliance_pct'
  | 'days_since_last_order';
type SortDir = 'asc' | 'desc';

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  healthy: { label: 'Healthy', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  cooling: { label: 'Cooling', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  at_risk: { label: 'At Risk', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' },
  dormant: { label: 'Dormant', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

const TREND_ICON: Record<string, { icon: typeof TrendingUp; color: string }> = {
  growing: { icon: TrendingUp, color: 'text-emerald-400' },
  stable: { icon: Minus, color: 'text-cult-silver' },
  declining: { icon: TrendingDown, color: 'text-orange-400' },
  inactive: { icon: TrendingDown, color: 'text-red-400' },
};

const FREQ_CONFIG: Record<OrderFrequencyLabel, { label: string; color: string }> = {
  high: { label: 'High', color: 'text-emerald-400' },
  medium: { label: 'Med', color: 'text-amber-400' },
  low: { label: 'Low', color: 'text-orange-400' },
  none: { label: '—', color: 'text-red-400' },
};

const MIX_CONFIG: Record<ProductMixLabel, { label: string; color: string; dots: number }> = {
  full: { label: 'Full', color: 'text-emerald-400', dots: 3 },
  moderate: { label: 'Mod', color: 'text-amber-400', dots: 2 },
  narrow: { label: 'Narrow', color: 'text-orange-400', dots: 1 },
  none: { label: 'None', color: 'text-red-400', dots: 0 },
};

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function StorePerformanceScorecard({}: StorePerformanceScorecardProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<StoreScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ScorecardFilter>('all');
  const [sortField, setSortField] = useState<SortField>('lifetime_revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getStoreScorecard();
    if (data) setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  // Derived stats
  const activeAccounts = accounts.filter((a) => a.account_status === 'active');
  const avgHealth = activeAccounts.length
    ? Math.round(activeAccounts.reduce((s, a) => s + a.health_score, 0) / activeAccounts.length)
    : 0;
  const avgOrderValue = activeAccounts.length
    ? Math.round(activeAccounts.reduce((s, a) => s + a.avg_order_value_90d, 0) / activeAccounts.length)
    : 0;
  const orderedLast60 = accounts.filter(
    (a) => a.days_since_last_order !== null && a.days_since_last_order <= 60,
  ).length;

  const mixCounts = accounts.reduce(
    (acc, a) => { acc[a.product_mix_label] = (acc[a.product_mix_label] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const visitCompliant = accounts.filter((a) => a.visit_compliance_status === 'on_track' || a.visit_compliance_status === 'scheduled').length;

  // Filter + search + sort
  let filtered = accounts;
  if (filter !== 'all') filtered = filtered.filter((a) => a.health_label === filter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.customer_name.toLowerCase().includes(q) ||
        a.dispensary_code.toLowerCase().includes(q) ||
        (a.city && a.city.toLowerCase().includes(q)),
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'customer_name': cmp = a.customer_name.localeCompare(b.customer_name); break;
      case 'health_score': cmp = a.health_score - b.health_score; break;
      case 'lifetime_revenue': cmp = a.lifetime_revenue - b.lifetime_revenue; break;
      case 'avg_order_value_90d': cmp = a.avg_order_value_90d - b.avg_order_value_90d; break;
      case 'orders_90d': cmp = a.orders_90d - b.orders_90d; break;
      case 'product_types_purchased': cmp = a.product_types_purchased - b.product_types_purchased; break;
      case 'visit_compliance_pct': cmp = a.visit_compliance_pct - b.visit_compliance_pct; break;
      case 'days_since_last_order': cmp = (a.days_since_last_order ?? 9999) - (b.days_since_last_order ?? 9999); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'customer_name' ? 'asc' : 'desc');
    }
  }

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ArrowUpRight className="w-3 h-3 inline-block ml-0.5" />
    ) : (
      <ArrowDownRight className="w-3 h-3 inline-block ml-0.5" />
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/30">
            <BarChart3 className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-cult-white">Store Scorecard</h1>
            <p className="text-xs text-cult-silver">{accounts.length} accounts · revenue, frequency, mix & compliance</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cult-silver border border-cult-medium-gray rounded-lg hover:bg-cult-dark-gray transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Cards — CULT-LOS aligned */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Avg Health Score */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Avg Health</p>
          <p className="text-2xl font-bold text-cult-white">{avgHealth}</p>
          <p className="text-xs text-cult-silver">of 100</p>
        </div>
        {/* Avg Order Value — CULT-LOS metric */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold text-emerald-400">{fmt$(avgOrderValue)}</p>
          <p className="text-xs text-cult-silver">90-day avg</p>
        </div>
        {/* Active Accounts — CULT-LOS metric */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Active (60d)</p>
          <p className="text-2xl font-bold text-sky-400">{orderedLast60}</p>
          <p className="text-xs text-cult-silver">ordered last 60 days</p>
        </div>
        {/* Product Mix Distribution */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Product Mix</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-emerald-400">{mixCounts.full || 0}</span>
            <span className="text-xs text-cult-medium-gray">/</span>
            <span className="text-lg font-bold text-amber-400">{mixCounts.moderate || 0}</span>
            <span className="text-xs text-cult-medium-gray">/</span>
            <span className="text-lg font-bold text-orange-400">{mixCounts.narrow || 0}</span>
          </div>
          <p className="text-xs text-cult-silver">full / mod / narrow</p>
        </div>
        {/* Visit Compliance */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Visit Compliant</p>
          <p className="text-2xl font-bold text-cult-white">{visitCompliant}</p>
          <p className="text-xs text-cult-silver">on track / scheduled</p>
        </div>
        {/* Health filter cards (compact) */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Health Split</p>
          <div className="flex items-center gap-2 mt-1">
            {(['healthy', 'cooling', 'at_risk', 'dormant'] as const).map((label) => {
              const cfg = HEALTH_CONFIG[label];
              const count = accounts.filter((a) => a.health_label === label).length;
              return (
                <button
                  key={label}
                  onClick={() => setFilter(filter === label ? 'all' : label)}
                  className={`flex flex-col items-center transition-colors ${filter === label ? cfg.color : ''}`}
                  title={cfg.label}
                >
                  <span className={`text-sm font-bold ${filter === label ? cfg.color : 'text-cult-silver'}`}>{count}</span>
                  <span className="text-xs text-cult-medium-gray">{cfg.label.charAt(0)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-medium-gray" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-medium-gray focus:outline-none focus:border-sky-500/50"
          />
        </div>
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-cult-silver border border-cult-medium-gray rounded-lg hover:bg-cult-dark-gray transition-colors"
          >
            <Filter className="w-3 h-3" /> Clear filter
          </button>
        )}
        <p className="text-xs text-cult-medium-gray ml-auto">{sorted.length} accounts</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-charcoal text-xs uppercase tracking-wider text-cult-medium-gray">
              <th className="text-left py-2 px-3 font-medium">
                <button onClick={() => toggleSort('customer_name')} className="hover:text-cult-silver transition-colors">
                  Account <SortArrow field="customer_name" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium">
                <button onClick={() => toggleSort('health_score')} className="hover:text-cult-silver transition-colors">
                  Health <SortArrow field="health_score" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">
                <button onClick={() => toggleSort('avg_order_value_90d')} className="hover:text-cult-silver transition-colors">
                  AOV <SortArrow field="avg_order_value_90d" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">
                <button onClick={() => toggleSort('orders_90d')} className="hover:text-cult-silver transition-colors">
                  Frequency <SortArrow field="orders_90d" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">
                <button onClick={() => toggleSort('lifetime_revenue')} className="hover:text-cult-silver transition-colors">
                  Lifetime <SortArrow field="lifetime_revenue" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden md:table-cell">
                <button onClick={() => toggleSort('product_types_purchased')} className="hover:text-cult-silver transition-colors">
                  Mix <SortArrow field="product_types_purchased" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden lg:table-cell">Trend</th>
              <th className="text-center py-2 px-2 font-medium hidden lg:table-cell">
                <button onClick={() => toggleSort('days_since_last_order')} className="hover:text-cult-silver transition-colors">
                  Recency <SortArrow field="days_since_last_order" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden xl:table-cell">
                <button onClick={() => toggleSort('visit_compliance_pct')} className="hover:text-cult-silver transition-colors">
                  Visits <SortArrow field="visit_compliance_pct" />
                </button>
              </th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {sorted.map((a) => {
              const cfg = HEALTH_CONFIG[a.health_label] || HEALTH_CONFIG.dormant;
              const trend = TREND_ICON[a.revenue_trend] || TREND_ICON.inactive;
              const TrendIcon = trend.icon;
              const freq = FREQ_CONFIG[a.order_frequency_label] || FREQ_CONFIG.none;
              const mix = MIX_CONFIG[a.product_mix_label] || MIX_CONFIG.none;
              return (
                <tr
                  key={a.customer_id}
                  className="hover:bg-cult-dark-gray/40 transition-colors group"
                >
                  {/* Account */}
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => navigate(`/crm-account-detail/${a.customer_id}`)}
                      className="text-left"
                    >
                      <p className="text-cult-white font-medium hover:text-sky-400 transition-colors truncate max-w-[200px]">
                        {a.customer_name}
                      </p>
                      <p className="text-xs text-cult-light-gray">{a.dispensary_code}{a.city ? ` · ${a.city}` : ''}</p>
                    </button>
                  </td>
                  {/* Health */}
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
                      {a.health_score}
                    </span>
                  </td>
                  {/* AOV */}
                  <td className="py-2.5 px-2 text-right hidden sm:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.avg_order_value_90d)}</span>
                  </td>
                  {/* Frequency */}
                  <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                    <span className={`text-xs font-medium ${freq.color}`}>{freq.label}</span>
                    <p className="text-xs text-cult-medium-gray">{a.orders_90d} / 90d</p>
                  </td>
                  {/* Lifetime */}
                  <td className="py-2.5 px-2 text-right hidden md:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.lifetime_revenue)}</span>
                  </td>
                  {/* Mix */}
                  <td className="py-2.5 px-2 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            i <= mix.dots
                              ? mix.dots === 3 ? 'bg-emerald-500' : mix.dots === 2 ? 'bg-amber-500' : 'bg-orange-500'
                              : 'bg-cult-charcoal'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-cult-medium-gray mt-0.5">{a.distinct_skus_purchased} SKUs</p>
                  </td>
                  {/* Trend */}
                  <td className="py-2.5 px-2 text-center hidden lg:table-cell">
                    <TrendIcon className={`w-3.5 h-3.5 mx-auto ${trend.color}`} />
                  </td>
                  {/* Recency */}
                  <td className="py-2.5 px-2 text-center hidden lg:table-cell">
                    {a.days_since_last_order !== null ? (
                      <span className={`text-xs ${a.days_since_last_order > 60 ? 'text-red-400' : a.days_since_last_order > 30 ? 'text-orange-400' : 'text-cult-silver'}`}>
                        {a.days_since_last_order}d
                      </span>
                    ) : (
                      <span className="text-xs text-cult-medium-gray">—</span>
                    )}
                  </td>
                  {/* Visit compliance */}
                  <td className="py-2.5 px-2 text-center hidden xl:table-cell">
                    <VisitBadge status={a.visit_compliance_status} pct={a.visit_compliance_pct} />
                  </td>
                  {/* Arrow */}
                  <td className="py-2.5 px-2">
                    <ChevronRight className="w-3.5 h-3.5 text-cult-medium-gray group-hover:text-cult-silver transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-10 text-center text-sm text-cult-medium-gray border border-dashed border-cult-charcoal rounded-lg mt-2">
            {search || filter !== 'all' ? 'No accounts match your filters' : 'No scorecard data available'}
          </div>
        )}
      </div>
    </div>
  );
}

/* Visit compliance badge */
function VisitBadge({ status, pct }: { status: string; pct: number }) {
  const cfg: Record<string, { label: string; color: string }> = {
    on_track: { label: 'On Track', color: 'text-emerald-400' },
    scheduled: { label: 'Scheduled', color: 'text-sky-400' },
    due_soon: { label: 'Due Soon', color: 'text-amber-400' },
    overdue: { label: 'Overdue', color: 'text-red-400' },
    never_visited: { label: 'Never', color: 'text-cult-medium-gray' },
  };
  const c = cfg[status] || cfg.never_visited;
  return (
    <div>
      <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>
      {pct > 0 && <p className="text-xs text-cult-medium-gray">{Math.round(pct)}%</p>}
    </div>
  );
}
