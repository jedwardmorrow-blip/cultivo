import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getVisitCadence } from '../services/crm.service';
import type { VisitCadenceItem, ComplianceStatus, AccountTier } from '../types/crm.types';

interface VisitCadenceDashboardProps {}

type ComplianceFilter = 'all' | ComplianceStatus;
type SortField = 'compliance_status' | 'days_until_due' | 'lifetime_revenue' | 'customer_name' | 'visits_completed_30d' | 'compliance_pct_30d';
type SortDir = 'asc' | 'desc';

const COMPLIANCE_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string; border: string; order: number }> = {
  overdue:       { label: 'Overdue',       color: 'text-cult-danger',  bg: 'bg-cult-danger/15',  border: 'border-cult-danger/30',  order: 1 },
  never_visited: { label: 'Never Visited', color: 'text-cult-warning', bg: 'bg-cult-warning/15', border: 'border-cult-warning/30', order: 2 },
  due_soon:      { label: 'Due Soon',      color: 'text-cult-warning', bg: 'bg-cult-warning/15', border: 'border-cult-warning/30', order: 3 },
  scheduled:     { label: 'Scheduled',     color: 'text-cult-info',    bg: 'bg-cult-info/15',    border: 'border-cult-info/30',    order: 4 },
  on_track:      { label: 'On Track',      color: 'text-cult-success', bg: 'bg-cult-success/15', border: 'border-cult-success/30', order: 5 },
};

const TIER_CONFIG: Record<AccountTier, { label: string; freq: string; color: string }> = {
  top_10:   { label: 'Top 10',   freq: 'Weekly',    color: 'text-cult-warning' },
  mid_tier: { label: 'Mid Tier', freq: 'Bi-Weekly', color: 'text-cult-info' },
  tail:     { label: 'Tail',     freq: 'Monthly',   color: 'text-cult-silver' },
  prospect: { label: 'Prospect', freq: 'Bi-Weekly', color: 'text-violet-400' },
};

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function daysLabel(d: number | null): string {
  if (d === null || d === -999) return 'Never';
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Today';
  return `${d}d`;
}

export function VisitCadenceDashboard({}: VisitCadenceDashboardProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<VisitCadenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ComplianceFilter>('all');
  const [sortField, setSortField] = useState<SortField>('compliance_status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getVisitCadence();
    if (data) setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  // Derived counts
  const counts = accounts.reduce(
    (acc, a) => { acc[a.compliance_status] = (acc[a.compliance_status] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const tierCounts = accounts.reduce(
    (acc, a) => { acc[a.account_tier] = (acc[a.account_tier] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const overdueRevenue = accounts
    .filter((a) => a.compliance_status === 'overdue' || a.compliance_status === 'never_visited')
    .reduce((sum, a) => sum + a.lifetime_revenue, 0);
  const avgCompliance = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + a.compliance_pct_30d, 0) / accounts.length)
    : 0;
  const visitsThisWeek = accounts.reduce((s, a) => s + a.visits_completed_7d, 0);

  // Filter + search + sort
  let filtered = accounts;
  if (filter !== 'all') filtered = filtered.filter((a) => a.compliance_status === filter);
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
      case 'compliance_status':
        cmp = (COMPLIANCE_CONFIG[a.compliance_status]?.order ?? 9) - (COMPLIANCE_CONFIG[b.compliance_status]?.order ?? 9);
        if (cmp === 0) cmp = (a.days_until_due === -999 ? 9999 : a.days_until_due) - (b.days_until_due === -999 ? 9999 : b.days_until_due);
        break;
      case 'days_until_due':
        cmp = (a.days_until_due === -999 ? 9999 : a.days_until_due) - (b.days_until_due === -999 ? 9999 : b.days_until_due);
        break;
      case 'lifetime_revenue': cmp = a.lifetime_revenue - b.lifetime_revenue; break;
      case 'customer_name': cmp = a.customer_name.localeCompare(b.customer_name); break;
      case 'visits_completed_30d': cmp = a.visits_completed_30d - b.visits_completed_30d; break;
      case 'compliance_pct_30d': cmp = a.compliance_pct_30d - b.compliance_pct_30d; break;
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
          <div className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/30">
            <CalendarClock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-cult-white">Visit Cadence</h1>
            <p className="text-xs text-cult-silver">{accounts.length} accounts tracked · {visitsThisWeek} visits this week</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Avg Compliance */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Compliance</p>
          <p className={`text-2xl font-bold ${avgCompliance >= 70 ? 'text-cult-success' : avgCompliance >= 40 ? 'text-cult-warning' : 'text-cult-danger'}`}>
            {avgCompliance}%
          </p>
          <p className="text-xs text-cult-silver">30-day avg</p>
        </div>
        {/* Status buckets */}
        {(['overdue', 'never_visited', 'due_soon', 'scheduled', 'on_track'] as const).map((status) => {
          const cfg = COMPLIANCE_CONFIG[status];
          const count = counts[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? 'all' : status)}
              className={`rounded-lg px-4 py-3 text-left border transition-colors ${
                filter === status
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
        {/* At-risk Revenue */}
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-cult-medium-gray mb-1">Overdue Rev</p>
          <p className="text-2xl font-bold text-cult-danger">{fmt$(overdueRevenue)}</p>
          <p className="text-xs text-cult-silver">lifetime total</p>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="flex items-center gap-4 px-1">
        <p className="text-xs uppercase tracking-wider text-cult-medium-gray">Tiers:</p>
        {(['top_10', 'mid_tier', 'tail', 'prospect'] as const).map((tier) => {
          const tc = TIER_CONFIG[tier];
          return (
            <div key={tier} className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${tc.color}`}>{tierCounts[tier] || 0}</span>
              <span className="text-xs text-cult-light-gray">{tc.label}</span>
              <span className="text-xs text-cult-medium-gray">({tc.freq})</span>
            </div>
          );
        })}
      </div>

      {/* Alerts Banner - overdue high-value accounts */}
      {(() => {
        const criticals = accounts.filter(
          (a) => (a.compliance_status === 'overdue' || a.compliance_status === 'never_visited') && a.lifetime_revenue > 5000,
        );
        if (criticals.length === 0) return null;
        return (
          <div className="bg-cult-danger/10 border border-cult-danger/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-cult-danger" />
              <p className="text-sm font-semibold text-cult-danger">
                {criticals.length} high-value account{criticals.length > 1 ? 's' : ''} overdue for visits
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticals.slice(0, 6).map((a) => (
                <button
                  key={a.customer_id}
                  onClick={() => navigate(`/crm-account-detail/${a.customer_id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-cult-danger/15 border border-cult-danger/25 rounded-md text-cult-danger/80 hover:bg-cult-danger/25 transition-colors"
                >
                  <span className="font-medium">{a.customer_name}</span>
                  <span className="text-cult-danger/60">·</span>
                  <span>{fmt$(a.lifetime_revenue)}</span>
                  <span className="text-cult-danger/60">·</span>
                  <span>{TIER_CONFIG[a.account_tier]?.label || a.account_tier}</span>
                </button>
              ))}
              {criticals.length > 6 && (
                <span className="text-xs text-cult-danger/60 self-center">+{criticals.length - 6} more</span>
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
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">Tier / Freq</th>
              <th className="text-center py-2 px-2 font-medium">
                <button onClick={() => toggleSort('compliance_status')} className="hover:text-cult-silver transition-colors">
                  Status <SortArrow field="compliance_status" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden sm:table-cell">
                <button onClick={() => toggleSort('days_until_due')} className="hover:text-cult-silver transition-colors">
                  Next Due <SortArrow field="days_until_due" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden md:table-cell">
                <button onClick={() => toggleSort('compliance_pct_30d')} className="hover:text-cult-silver transition-colors">
                  Compliance <SortArrow field="compliance_pct_30d" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden md:table-cell">
                <button onClick={() => toggleSort('visits_completed_30d')} className="hover:text-cult-silver transition-colors">
                  Visits (30d) <SortArrow field="visits_completed_30d" />
                </button>
              </th>
              <th className="text-right py-2 px-2 font-medium hidden lg:table-cell">
                <button onClick={() => toggleSort('lifetime_revenue')} className="hover:text-cult-silver transition-colors">
                  Revenue <SortArrow field="lifetime_revenue" />
                </button>
              </th>
              <th className="text-center py-2 px-2 font-medium hidden xl:table-cell">Last Visit</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {sorted.map((a) => {
              const cfg = COMPLIANCE_CONFIG[a.compliance_status] || COMPLIANCE_CONFIG.overdue;
              const tier = TIER_CONFIG[a.account_tier] || TIER_CONFIG.tail;
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
                      <p className="text-xs text-cult-light-gray">
                        {a.dispensary_code}{a.city ? ` · ${a.city}` : ''}
                      </p>
                    </button>
                  </td>
                  {/* Tier / Freq */}
                  <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                    <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
                    <p className="text-xs text-cult-medium-gray">{a.frequency_label}</p>
                  </td>
                  {/* Status */}
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </td>
                  {/* Next Due */}
                  <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                    <span className={`text-xs ${
                      a.days_until_due === -999 ? 'text-cult-warning' :
                      a.days_until_due < 0 ? 'text-cult-danger' :
                      a.days_until_due <= 2 ? 'text-cult-warning' :
                      'text-cult-silver'
                    }`}>
                      {daysLabel(a.days_until_due)}
                    </span>
                  </td>
                  {/* Compliance % */}
                  <td className="py-2.5 px-2 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            a.compliance_pct_30d >= 80 ? 'bg-cult-success' :
                            a.compliance_pct_30d >= 50 ? 'bg-cult-warning' :
                            a.compliance_pct_30d > 0 ? 'bg-cult-danger' :
                            'bg-cult-charcoal'
                          }`}
                          style={{ width: `${a.compliance_pct_30d}%` }}
                        />
                      </div>
                      <span className="text-xs text-cult-light-gray w-7">{a.compliance_pct_30d}%</span>
                    </div>
                  </td>
                  {/* Visits (30d) */}
                  <td className="py-2.5 px-2 text-center hidden md:table-cell">
                    <span className="text-xs text-cult-silver">{a.visits_completed_30d}</span>
                    {a.upcoming_scheduled > 0 && (
                      <span className="text-xs text-cult-info ml-1" title="Upcoming scheduled">
                        +{a.upcoming_scheduled}
                      </span>
                    )}
                  </td>
                  {/* Revenue */}
                  <td className="py-2.5 px-2 text-right hidden lg:table-cell">
                    <span className="text-xs text-cult-silver">{fmt$(a.lifetime_revenue)}</span>
                  </td>
                  {/* Last Visit */}
                  <td className="py-2.5 px-2 text-center hidden xl:table-cell">
                    {a.days_since_last_visit !== null ? (
                      <span className={`text-xs ${
                        a.days_since_last_visit > 30 ? 'text-cult-danger' :
                        a.days_since_last_visit > 14 ? 'text-cult-warning' :
                        'text-cult-silver'
                      }`}>
                        {a.days_since_last_visit}d ago
                      </span>
                    ) : (
                      <span className="text-xs text-cult-medium-gray">Never</span>
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
            {search || filter !== 'all' ? 'No accounts match your filters' : 'No visit cadence data available'}
          </div>
        )}
      </div>
    </div>
  );
}
