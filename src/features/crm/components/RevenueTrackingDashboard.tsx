import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  Filter,
  Minus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getRevenueTracking, getRevenueWeekly } from '../services/crm.service';
import type { RevenueTrackingItem, RevenueWeeklyItem } from '../types/crm.types';

interface RevenueTrackingDashboardProps {
  onViewChange: (view: string) => void;
}

type RevenueFilter = 'all' | 'has_unresolved' | 'growing' | 'declining' | 'new';
type SortField = 'lifetime_revenue' | 'current_month_realized' | 'rolling_90d_realized' | 'mom_change_pct' | 'total_unresolved_revenue' | 'customer_name';
type SortDir = 'asc' | 'desc';

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null) {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}%`;
}

export function RevenueTrackingDashboard({ onViewChange }: RevenueTrackingDashboardProps) {
  const [accounts, setAccounts] = useState<RevenueTrackingItem[]>([]);
  const [weeklyData, setWeeklyData] = useState<RevenueWeeklyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RevenueFilter>('all');
  const [sortField, setSortField] = useState<SortField>('lifetime_revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [trackingRes, weeklyRes] = await Promise.all([
      getRevenueTracking(),
      getRevenueWeekly(),
    ]);
    if (trackingRes.data) setAccounts(trackingRes.data);
    if (weeklyRes.data) setWeeklyData(weeklyRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Aggregates ───────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalRealized = accounts.reduce((s, a) => s + a.current_month_realized, 0);
    const totalTentative = accounts.reduce((s, a) => s + a.current_month_tentative, 0);
    const totalUnresolved = accounts.reduce((s, a) => s + a.total_unresolved_revenue, 0);
    const unresolvedAccounts = accounts.filter((a) => a.total_unresolved_orders > 0).length;
    const priorMonthTotal = accounts.reduce((s, a) => s + a.prior_month_realized, 0);
    const rolling90Total = accounts.reduce((s, a) => s + a.rolling_90d_realized, 0);
    const rolling90Tentative = accounts.reduce((s, a) => s + a.rolling_90d_tentative, 0);
    const lifetimeTotal = accounts.reduce((s, a) => s + a.lifetime_revenue, 0);
    const growingCount = accounts.filter((a) => a.mom_change_pct != null && a.mom_change_pct > 10).length;
    const decliningCount = accounts.filter((a) => a.mom_change_pct != null && a.mom_change_pct < -10).length;
    return {
      totalRealized, totalTentative, totalUnresolved, unresolvedAccounts,
      priorMonthTotal, rolling90Total, rolling90Tentative, lifetimeTotal,
      growingCount, decliningCount,
    };
  }, [accounts]);

  // ── Weekly sparkline data (last 12 weeks aggregated) ─────────
  const weeklySummary = useMemo(() => {
    const weekMap = new Map<string, { realized: number; tentative: number }>();
    weeklyData.forEach((w) => {
      const existing = weekMap.get(w.revenue_week) || { realized: 0, tentative: 0 };
      existing.realized += w.realized_revenue;
      existing.tentative += w.tentative_revenue;
      weekMap.set(w.revenue_week, existing);
    });
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
  }, [weeklyData]);

  // ── Filter + Search + Sort ──────────────────────────────────
  const filtered = useMemo(() => {
    let list = accounts;
    switch (filter) {
      case 'has_unresolved':
        list = list.filter((a) => a.total_unresolved_orders > 0);
        break;
      case 'growing':
        list = list.filter((a) => a.mom_change_pct != null && a.mom_change_pct > 10);
        break;
      case 'declining':
        list = list.filter((a) => a.mom_change_pct != null && a.mom_change_pct < -10);
        break;
      case 'new':
        list = list.filter((a) => {
          if (!a.first_order_date) return false;
          const d = new Date(a.first_order_date);
          const ninetyAgo = new Date();
          ninetyAgo.setDate(ninetyAgo.getDate() - 90);
          return d >= ninetyAgo;
        });
        break;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.customer_name.toLowerCase().includes(q) || a.dispensary_code.toLowerCase().includes(q),
      );
    }
    return list;
  }, [accounts, filter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lifetime_revenue': cmp = a.lifetime_revenue - b.lifetime_revenue; break;
        case 'current_month_realized': cmp = a.current_month_realized - b.current_month_realized; break;
        case 'rolling_90d_realized': cmp = a.rolling_90d_realized - b.rolling_90d_realized; break;
        case 'mom_change_pct': cmp = (a.mom_change_pct ?? -999) - (b.mom_change_pct ?? -999); break;
        case 'total_unresolved_revenue': cmp = a.total_unresolved_revenue - b.total_unresolved_revenue; break;
        case 'customer_name': cmp = a.customer_name.localeCompare(b.customer_name); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

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

  if (loading) return <LoadingSpinner />;

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-cult-white">Revenue Tracking</h1>
            <p className="text-xs text-cult-silver">{accounts.length} accounts · {currentMonth}</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cult-silver border border-cult-medium-gray rounded-lg hover:bg-cult-dark-gray transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Current Month Realized */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-1">Month Realized</p>
          <p className="text-2xl font-bold text-emerald-400">{fmt$(totals.totalRealized)}</p>
          <p className="text-[10px] text-cult-silver">completed deliveries</p>
        </div>
        {/* Current Month Tentative */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-1">Month Tentative</p>
          <p className="text-2xl font-bold text-amber-400">{fmt$(totals.totalTentative)}</p>
          <p className="text-[10px] text-cult-silver">pending delivery</p>
        </div>
        {/* Prior Month */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-1">Prior Month</p>
          <p className="text-2xl font-bold text-cult-white">{fmt$(totals.priorMonthTotal)}</p>
          <p className="text-[10px] text-cult-silver">realized</p>
        </div>
        {/* Rolling 90d */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-1">90-Day Total</p>
          <p className="text-2xl font-bold text-sky-400">{fmt$(totals.rolling90Total)}</p>
          <p className="text-[10px] text-cult-silver">
            + {fmt$(totals.rolling90Tentative)} tentative
          </p>
        </div>
        {/* Unresolved */}
        <button
          onClick={() => setFilter(filter === 'has_unresolved' ? 'all' : 'has_unresolved')}
          className={`rounded-lg px-4 py-3 text-left border transition-colors ${
            filter === 'has_unresolved'
              ? 'bg-red-500/15 border-red-500/30 ring-1 ring-red-500/40'
              : 'bg-cult-near-black border-cult-medium-gray hover:bg-cult-dark-gray'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-1">Unresolved</p>
          <p className="text-2xl font-bold text-red-400">{fmt$(totals.totalUnresolved)}</p>
          <p className="text-[10px] text-cult-silver">{totals.unresolvedAccounts} accounts</p>
        </button>
        {/* Lifetime */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-1">Lifetime</p>
          <p className="text-2xl font-bold text-cult-white">{fmt$(totals.lifetimeTotal)}</p>
          <p className="text-[10px] text-cult-silver">all time</p>
        </div>
      </div>

      {/* Weekly Trend Bar */}
      {weeklySummary.length > 0 && (
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-cult-medium-gray mb-2">Weekly Revenue (90 days)</p>
          <div className="flex items-end gap-1 h-16">
            {(() => {
              const maxVal = Math.max(...weeklySummary.map(([, d]) => d.realized + d.tentative), 1);
              return weeklySummary.map(([week, d]) => {
                const realH = (d.realized / maxVal) * 100;
                const tentH = (d.tentative / maxVal) * 100;
                const weekLabel = new Date(week + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={week} className="flex-1 flex flex-col items-center gap-0" title={`${weekLabel}: ${fmt$(d.realized)} realized + ${fmt$(d.tentative)} tentative`}>
                    <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                      <div className="w-full bg-amber-500/40 rounded-t-sm" style={{ height: `${tentH}%`, minHeight: tentH > 0 ? '2px' : '0px' }} />
                      <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: `${realH}%`, minHeight: realH > 0 ? '2px' : '0px' }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-cult-silver">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Realized
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-cult-silver">
              <span className="w-2 h-2 rounded-sm bg-amber-500/40" /> Tentative
            </span>
          </div>
        </div>
      )}

      {/* Unresolved Alert */}
      {totals.totalUnresolved > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-red-400">
              {fmt$(totals.totalUnresolved)} in unresolved revenue across {totals.unresolvedAccounts} account{totals.unresolvedAccounts !== 1 ? 's' : ''}
            </p>
          </div>
          <p className="text-xs text-red-300/70 mb-2">
            These orders have past delivery dates but were never completed. They need to be addressed — either mark complete or cancel.
          </p>
          <div className="flex flex-wrap gap-2">
            {accounts
              .filter((a) => a.total_unresolved_revenue > 0)
              .sort((a, b) => b.total_unresolved_revenue - a.total_unresolved_revenue)
              .slice(0, 5)
              .map((a) => (
                <button
                  key={a.customer_id}
                  onClick={() => onViewChange(`crm-account-detail:${a.customer_id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-red-500/15 border border-red-500/25 rounded-md text-red-300 hover:bg-red-500/25 transition-colors"
                >
                  <span className="font-medium">{a.customer_name}</span>
                  <span className="text-red-400/60">·</span>
                  <span>{fmt$(a.total_unresolved_revenue)}</span>
                  <span className="text-red-400/60">·</span>
                  <span>{a.total_unresolved_orders} order{a.total_unresolved_orders !== 1 ? 's' : ''}</span>
                </button>
              ))}
            {totals.unresolvedAccounts > 5 && (
              <span className="text-[11px] text-red-400/60 self-center">+{totals.unresolvedAccounts - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <div className="flex items-center gap-1.5">
          {([
            { key: 'growing' as const, label: 'Growing', icon: TrendingUp, color: 'text-emerald-400' },
            { key: 'declining' as const, label: 'Declining', icon: TrendingDown, color: 'text-orange-400' },
            { key: 'has_unresolved' as const, label: 'Unresolved', icon: AlertTriangle, color: 'text-red-400' },
          ]).map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                filter === key
                  ? `${color} border-current bg-current/10`
                  : 'text-cult-silver border-cult-medium-gray hover:bg-cult-dark-gray'
              }`}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-cult-silver border border-cult-medium-gray rounded-lg hover:bg-cult-dark-gray transition-colors"
          >
            <Filter className="w-3 h-3" /> Clear
          </button>
        )}
        <p className="text-xs text-cult-medium-gray ml-auto">{sorted.length} accounts</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-charcoal text-[10px] uppercase tracking-wider text-cult-medium-gray">
              <th className="text-left py-2 px-3 font-medium">
                <button onClick={() => toggleSort('customer_name')} className="hover:text-cult-silver transition-colors">
                  Account <SortArrow field="customer_name" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium">
                <button onClick={() => toggleSort('current_month_realized')} className="hover:text-cult-silver transition-colors">
                  This Month <SortArrow field="current_month_realized" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">
                <button onClick={() => toggleSort('mom_change_pct')} className="hover:text-cult-silver transition-colors">
                  MoM <SortArrow field="mom_change_pct" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">
                <button onClick={() => toggleSort('rolling_90d_realized')} className="hover:text-cult-silver transition-colors">
                  90d Rev <SortArrow field="rolling_90d_realized" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden lg:table-cell">
                <button onClick={() => toggleSort('lifetime_revenue')} className="hover:text-cult-silver transition-colors">
                  Lifetime <SortArrow field="lifetime_revenue" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden lg:table-cell">
                <button onClick={() => toggleSort('total_unresolved_revenue')} className="hover:text-cult-silver transition-colors">
                  Unresolved <SortArrow field="total_unresolved_revenue" />
                </button>
              </th>
              <th className="py-2 px-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {sorted.map((a) => {
              const momColor =
                a.mom_change_pct == null ? 'text-cult-medium-gray'
                : a.mom_change_pct > 10 ? 'text-emerald-400'
                : a.mom_change_pct < -10 ? 'text-orange-400'
                : 'text-cult-silver';
              const MomIcon =
                a.mom_change_pct == null ? Minus
                : a.mom_change_pct > 10 ? TrendingUp
                : a.mom_change_pct < -10 ? TrendingDown
                : Minus;

              return (
                <tr key={a.customer_id} className="hover:bg-cult-dark-gray/40 transition-colors group">
                  {/* Account */}
                  <td className="py-2.5 px-3">
                    <button onClick={() => onViewChange(`crm-account-detail:${a.customer_id}`)} className="text-left">
                      <p className="text-cult-white font-medium hover:text-sky-400 transition-colors truncate max-w-[200px]">
                        {a.customer_name}
                      </p>
                      <p className="text-[10px] text-cult-light-gray">
                        {a.dispensary_code} · {a.lifetime_order_count} orders
                      </p>
                    </button>
                  </td>
                  {/* This Month */}
                  <td className="py-2.5 px-2 text-right">
                    <div>
                      <span className="text-xs text-emerald-400 font-medium">{fmt$(a.current_month_realized)}</span>
                      {a.current_month_tentative > 0 && (
                        <span className="text-[10px] text-amber-400 ml-1">+{fmt$(a.current_month_tentative)}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-cult-medium-gray">{a.current_month_orders} orders</p>
                  </td>
                  {/* MoM */}
                  <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                    <div className={`flex items-center justify-center gap-0.5 ${momColor}`}>
                      <MomIcon className="w-3 h-3" />
                      <span className="text-xs">{fmtPct(a.mom_change_pct)}</span>
                    </div>
                  </td>
                  {/* 90d */}
                  <td className="py-2.5 px-2 text-right hidden md:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.rolling_90d_realized)}</span>
                    {a.rolling_90d_tentative > 0 && (
                      <span className="text-[10px] text-amber-400/60 ml-1">+{fmt$(a.rolling_90d_tentative)}</span>
                    )}
                  </td>
                  {/* Lifetime */}
                  <td className="py-2.5 px-2 text-right hidden lg:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.lifetime_revenue)}</span>
                  </td>
                  {/* Unresolved */}
                  <td className="py-2.5 px-2 text-right hidden lg:table-cell">
                    {a.total_unresolved_revenue > 0 ? (
                      <span className="text-xs text-red-400 font-medium">
                        {fmt$(a.total_unresolved_revenue)}
                        <span className="text-[10px] text-red-400/60 ml-1">({a.total_unresolved_orders})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-cult-medium-gray">—</span>
                    )}
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
            {search || filter !== 'all' ? 'No accounts match your filters' : 'No revenue data available'}
          </div>
        )}
      </div>
    </div>
  );
}
