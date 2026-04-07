import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Heart,
  Minus,
  Phone,
  RefreshCw,
  Search,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getAccountHealthDashboard } from '../services/crm.service';
import type { AccountHealthDashboardItem } from '../types/crm.types';

interface AccountHealthDashboardProps {}

type HealthFilter = 'all' | 'healthy' | 'cooling' | 'at_risk' | 'dormant';
type SortField = 'health_score' | 'days_since_last_order' | 'revenue_90d' | 'lifetime_revenue' | 'customer_name';
type SortDir = 'asc' | 'desc';

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  healthy: { label: 'Healthy', color: 'text-cult-success', bg: 'bg-cult-success/15', border: 'border-cult-success/30' },
  cooling: { label: 'Cooling', color: 'text-cult-warning', bg: 'bg-cult-warning/15', border: 'border-cult-warning/30' },
  at_risk: { label: 'At Risk', color: 'text-cult-warning', bg: 'bg-cult-warning/15', border: 'border-cult-warning/30' },
  dormant: { label: 'Dormant', color: 'text-cult-danger', bg: 'bg-cult-danger/15', border: 'border-cult-danger/30' },
};

const TREND_ICON: Record<string, { icon: typeof TrendingUp; color: string }> = {
  growing: { icon: TrendingUp, color: 'text-cult-success' },
  stable: { icon: Minus, color: 'text-cult-silver' },
  declining: { icon: TrendingDown, color: 'text-cult-warning' },
  inactive: { icon: TrendingDown, color: 'text-cult-danger' },
};

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function AccountHealthDashboard({}: AccountHealthDashboardProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountHealthDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HealthFilter>('all');
  const [sortField, setSortField] = useState<SortField>('health_score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getAccountHealthDashboard();
    if (data) setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  // Derived data
  const counts = accounts.reduce(
    (acc, a) => { acc[a.health_label] = (acc[a.health_label] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const atRiskRevenue = accounts
    .filter((a) => a.health_label === 'at_risk' || a.health_label === 'dormant')
    .reduce((sum, a) => sum + a.lifetime_revenue, 0);
  const avgScore = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + a.health_score, 0) / accounts.length)
    : 0;

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
      case 'health_score': cmp = a.health_score - b.health_score; break;
      case 'days_since_last_order': cmp = (a.days_since_last_order ?? 9999) - (b.days_since_last_order ?? 9999); break;
      case 'revenue_90d': cmp = a.revenue_90d - b.revenue_90d; break;
      case 'lifetime_revenue': cmp = a.lifetime_revenue - b.lifetime_revenue; break;
      case 'customer_name': cmp = a.customer_name.localeCompare(b.customer_name); break;
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
          <div className="p-2 rounded-lg bg-cult-warning/15 border border-cult-warning/30">
            <Activity className="w-5 h-5 text-cult-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-cult-white">Account Health</h1>
            <p className="text-xs text-cult-silver">{accounts.length} accounts scored</p>
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
        {/* Avg Score */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Avg Score</p>
          <p className="text-2xl font-bold text-cult-white">{avgScore}</p>
          <p className="text-xs text-cult-silver">out of 100</p>
        </div>
        {/* Health buckets */}
        {(['healthy', 'cooling', 'at_risk', 'dormant'] as const).map((label) => {
          const cfg = HEALTH_CONFIG[label];
          const count = counts[label] || 0;
          return (
            <button
              key={label}
              onClick={() => setFilter(filter === label ? 'all' : label)}
              className={`rounded-lg px-4 py-3 text-left border transition-colors ${
                filter === label
                  ? `${cfg.bg} ${cfg.border} ring-1 ring-white/10`
                  : 'bg-cult-near-black border-cult-medium-gray hover:bg-cult-dark-gray'
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">{cfg.label}</p>
              <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
              <p className="text-xs text-cult-silver">accounts</p>
            </button>
          );
        })}
        {/* At-risk revenue */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">At-Risk Revenue</p>
          <p className="text-2xl font-bold text-cult-danger">{fmt$(atRiskRevenue)}</p>
          <p className="text-xs text-cult-silver">lifetime total</p>
        </div>
      </div>

      {/* Alerts Banner */}
      {(() => {
        const criticals = accounts.filter(
          (a) => (a.health_label === 'dormant' || a.health_label === 'at_risk') && a.lifetime_revenue > 10000,
        );
        if (criticals.length === 0) return null;
        return (
          <div className="bg-cult-danger/10 border border-cult-danger/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-cult-danger" />
              <p className="text-sm font-semibold text-cult-danger">
                {criticals.length} high-value account{criticals.length > 1 ? 's' : ''} need attention
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticals.slice(0, 5).map((a) => (
                <button
                  key={a.customer_id}
                  onClick={() => navigate(`/crm-account-detail/${a.customer_id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-cult-danger/15 border border-cult-danger/25 rounded-md text-cult-danger/80 hover:bg-cult-danger/25 transition-colors"
                >
                  <span className="font-medium">{a.customer_name}</span>
                  <span className="text-cult-danger/60">·</span>
                  <span>{fmt$(a.lifetime_revenue)}</span>
                  <span className="text-cult-danger/60">·</span>
                  <span>{a.days_since_last_order ?? '?'}d silent</span>
                </button>
              ))}
              {criticals.length > 5 && (
                <span className="text-xs text-cult-danger/60 self-center">+{criticals.length - 5} more</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-medium-gray" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-medium-gray focus:outline-none focus:border-cult-info/50"
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
                  Score <SortArrow field="health_score" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden md:table-cell">Breakdown</th>
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">
                <button onClick={() => toggleSort('days_since_last_order')} className="hover:text-cult-silver transition-colors">
                  Last Order <SortArrow field="days_since_last_order" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">
                <button onClick={() => toggleSort('revenue_90d')} className="hover:text-cult-silver transition-colors">
                  90d Rev <SortArrow field="revenue_90d" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden lg:table-cell">
                <button onClick={() => toggleSort('lifetime_revenue')} className="hover:text-cult-silver transition-colors">
                  Lifetime <SortArrow field="lifetime_revenue" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden lg:table-cell">Trend</th>
              <th className="text-center py-2 px-2 font-medium hidden xl:table-cell">Engagement</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {sorted.map((a) => {
              const cfg = HEALTH_CONFIG[a.health_label] || HEALTH_CONFIG.dormant;
              const trend = TREND_ICON[a.revenue_trend] || TREND_ICON.inactive;
              const TrendIcon = trend.icon;
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
                      <p className="text-cult-white font-medium hover:text-cult-info transition-colors truncate max-w-[200px]">
                        {a.customer_name}
                      </p>
                      <p className="text-xs text-cult-light-gray">{a.dispensary_code}{a.city ? ` · ${a.city}` : ''}</p>
                    </button>
                  </td>
                  {/* Score */}
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
                      {a.health_score}
                    </span>
                    <p className={`text-xs mt-0.5 ${cfg.color}`}>{cfg.label}</p>
                  </td>
                  {/* Breakdown bars */}
                  <td className="py-2.5 px-2 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <ScoreBar label="R" value={a.recency_score} max={40} />
                      <ScoreBar label="F" value={a.frequency_score} max={25} />
                      <ScoreBar label="T" value={a.trend_score} max={20} />
                      <ScoreBar label="E" value={a.engagement_score} max={15} />
                    </div>
                  </td>
                  {/* Last Order */}
                  <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                    {a.days_since_last_order !== null ? (
                      <span className={`text-xs ${a.days_since_last_order > 60 ? 'text-cult-danger' : a.days_since_last_order > 30 ? 'text-cult-warning' : 'text-cult-silver'}`}>
                        {a.days_since_last_order}d
                      </span>
                    ) : (
                      <span className="text-xs text-cult-medium-gray">—</span>
                    )}
                  </td>
                  {/* 90d Revenue */}
                  <td className="py-2.5 px-2 text-right hidden sm:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.revenue_90d)}</span>
                  </td>
                  {/* Lifetime */}
                  <td className="py-2.5 px-2 text-right hidden lg:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.lifetime_revenue)}</span>
                  </td>
                  {/* Trend */}
                  <td className="py-2.5 px-2 text-center hidden lg:table-cell">
                    <TrendIcon className={`w-3.5 h-3.5 mx-auto ${trend.color}`} />
                  </td>
                  {/* Engagement */}
                  <td className="py-2.5 px-2 text-center hidden xl:table-cell">
                    <div className="flex items-center justify-center gap-2 text-xs text-cult-light-gray">
                      {a.open_task_count > 0 && (
                        <span className="flex items-center gap-0.5" title="Open tasks">
                          <CheckCircle2 className="w-3 h-3 text-cult-medium-gray" />{a.open_task_count}
                        </span>
                      )}
                      {a.visits_30d > 0 && (
                        <span className="flex items-center gap-0.5" title="Visits (30d)">
                          <Calendar className="w-3 h-3 text-cult-medium-gray" />{a.visits_30d}
                        </span>
                      )}
                      {a.open_task_count === 0 && a.visits_30d === 0 && (
                        <span className="text-cult-medium-gray">—</span>
                      )}
                    </div>
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
            {search || filter !== 'all' ? 'No accounts match your filters' : 'No account health data available'}
          </div>
        )}
      </div>
    </div>
  );
}

/* Mini score breakdown bar */
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    pct >= 70 ? 'bg-cult-success' : pct >= 40 ? 'bg-cult-warning' : pct > 0 ? 'bg-cult-danger' : 'bg-cult-charcoal';
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}: ${value}/${max}`}>
      <span className="text-xs text-cult-medium-gray leading-none">{label}</span>
      <div className="w-5 h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
