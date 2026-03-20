import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  Calendar,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Heart,
  Activity,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  Star,
  MapPin,
  Briefcase,
} from 'lucide-react';
import {
  getAccountSummaries,
} from '../services';
import {
  getAccountHealthDashboard,
  getAllContacts,
} from '../services/crm.service';
import type {
  AccountSummary,
  AccountStatus,
  AccountType,
  AccountHealthDashboardItem,
} from '../types/crm.types';
import { RevenueTrackingDashboard } from './RevenueTrackingDashboard';
import { VisitCadenceDashboard } from './VisitCadenceDashboard';

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type TabKey = 'overview' | 'revenue' | 'cadence' | 'contacts';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

type HealthBucket = 'healthy' | 'cooling' | 'at_risk' | 'dormant';

type SortField = 'name' | 'health_score' | 'total_revenue' | 'last_order_date' | 'order_count';
type SortDirection = 'asc' | 'desc';

type StatusFilter = 'all' | AccountStatus;
type TypeFilter = 'all' | AccountType;

interface EnrichedAccount extends AccountSummary {
  health_score?: number;
  health_bucket?: HealthBucket;
  days_since_last_order?: number;
  revenue_90d?: number;
  recency_score?: number;
  frequency_score?: number;
  trend_score?: number;
  engagement_score?: number;
}

// âââ Constants âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const TABS: Tab[] = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'revenue', label: 'Revenue', icon: TrendingUp },
  { key: 'cadence', label: 'Visit Cadence', icon: Calendar },
  { key: 'contacts', label: 'Contacts', icon: Users },
];

const HEALTH_CONFIG: Record<HealthBucket, { label: string; color: string; bgColor: string; borderColor: string }> = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
  },
  cooling: {
    label: 'Cooling',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
  },
  at_risk: {
    label: 'At Risk',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/30',
  },
  dormant: {
    label: 'Dormant',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
  },
};

// âââ Sub-Components ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function HealthBadge({ bucket }: { bucket?: HealthBucket }) {
  if (!bucket) return <span className="text-cult-medium-gray text-xs">â</span>;
  const cfg = HEALTH_CONFIG[bucket];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}>
      <Heart className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function MiniScoreBar({ score, max = 100 }: { score?: number; max?: number }) {
  if (score === undefined || score === null) return <span className="text-cult-medium-gray text-xs">â</span>;
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const color =
    pct >= 75 ? 'bg-emerald-400' :
    pct >= 50 ? 'bg-amber-400' :
    pct >= 25 ? 'bg-orange-400' :
    'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-cult-dark-gray rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-cult-silver tabular-nums">{score}</span>
    </div>
  );
}

function SortHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
        isActive ? 'text-cult-white' : 'text-cult-silver hover:text-cult-white'
      }`}
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// âââ Overview Tab ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function OverviewTab({ onViewChange }: { onViewChange: (view: string) => void }) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [healthData, setHealthData] = useState<AccountHealthDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [accts, health] = await Promise.all([
          getAccountSummaries(),
          getAccountHealthDashboard(),
        ]);
        if (!cancelled) {
          setAccounts(accts.data || []);
          setHealthData(health.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load accounts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Build health lookup by customer_id
  const healthMap = useMemo(() => {
    const map = new Map<string, AccountHealthDashboardItem>();
    healthData.forEach((h) => map.set(h.customer_id, h));
    return map;
  }, [healthData]);

  // Enrich accounts with health data
  const enrichedAccounts: EnrichedAccount[] = useMemo(() => {
    return accounts.map((acct) => {
      const h = healthMap.get(acct.customer_id);
      return {
        ...acct,
        health_score: h?.health_score,
        health_bucket: h?.health_bucket as HealthBucket | undefined,
        days_since_last_order: h?.days_since_last_order,
        revenue_90d: h?.revenue_90d,
        recency_score: h?.recency_score,
        frequency_score: h?.frequency_score,
        trend_score: h?.trend_score,
        engagement_score: h?.engagement_score,
      };
    });
  }, [accounts, healthMap]);

  // Hub children grouped by parent
  const childrenByParent = useMemo(() => {
    const map = new Map<string, EnrichedAccount[]>();
    enrichedAccounts.forEach((acct) => {
      if (acct.account_type === 'hub_child' && acct.hub_parent_id) {
        const existing = map.get(acct.hub_parent_id) || [];
        existing.push(acct);
        map.set(acct.hub_parent_id, existing);
      }
    });
    return map;
  }, [enrichedAccounts]);

  // Search + filter
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    // Find parent IDs where a child matches search
    const matchingChildParentIds = new Set<string>();
    if (term) {
      enrichedAccounts.forEach((acct) => {
        if (acct.account_type === 'hub_child' && acct.hub_parent_id) {
          const fields = [acct.name, acct.customer_code, acct.city].filter(Boolean).join(' ').toLowerCase();
          if (fields.includes(term)) {
            matchingChildParentIds.add(acct.hub_parent_id);
          }
        }
      });
    }

    return enrichedAccounts
      .filter((acct) => acct.account_type !== 'hub_child') // only top-level
      .filter((acct) => {
        if (!term) return true;
        const fields = [acct.name, acct.customer_code, acct.city].filter(Boolean).join(' ').toLowerCase();
        return fields.includes(term) || matchingChildParentIds.has(acct.customer_id);
      })
      .filter((acct) => statusFilter === 'all' || acct.status === statusFilter)
      .filter((acct) => typeFilter === 'all' || acct.account_type === typeFilter);
  }, [enrichedAccounts, searchTerm, statusFilter, typeFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'health_score':
          cmp = (a.health_score ?? -1) - (b.health_score ?? -1);
          break;
        case 'total_revenue':
          cmp = (a.total_revenue ?? 0) - (b.total_revenue ?? 0);
          break;
        case 'last_order_date':
          cmp = (a.last_order_date || '').localeCompare(b.last_order_date || '');
          break;
        case 'order_count':
          cmp = (a.order_count ?? 0) - (b.order_count ?? 0);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDirection]);

  // Summary stats from health data
  const healthSummary = useMemo(() => {
    const buckets = { healthy: 0, cooling: 0, at_risk: 0, dormant: 0 };
    let totalScore = 0;
    let scored = 0;
    let atRiskRevenue = 0;
    healthData.forEach((h) => {
      const bucket = h.health_bucket as HealthBucket;
      if (bucket && buckets[bucket] !== undefined) buckets[bucket]++;
      if (h.health_score != null) {
        totalScore += h.health_score;
        scored++;
      }
      if ((bucket === 'at_risk' || bucket === 'dormant') && h.revenue_90d) {
        atRiskRevenue += h.revenue_90d;
      }
    });
    return {
      ...buckets,
      avgScore: scored > 0 ? Math.round(totalScore / scored) : 0,
      atRiskRevenue,
      total: healthData.length,
    };
  }, [healthData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const toggleParent = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatCurrency = (val?: number) => {
    if (val == null) return 'â';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (val?: string) => {
    if (!val) return 'â';
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-cult-silver animate-spin" />
        <span className="ml-3 text-cult-silver">Loading accounts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-red-400">
        <AlertTriangle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ââ Health Summary Cards ââ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-cult-dark-gray/50 rounded-lg p-3 border border-cult-medium-gray/30">
          <p className="text-xs text-cult-silver mb-1">Avg Health Score</p>
          <p className="text-xl font-semibold text-cult-white">{healthSummary.avgScore}</p>
        </div>
        {(Object.keys(HEALTH_CONFIG) as HealthBucket[]).map((bucket) => {
          const cfg = HEALTH_CONFIG[bucket];
          return (
            <div key={bucket} className={`rounded-lg p-3 border ${cfg.borderColor} ${cfg.bgColor}`}>
              <p className={`text-xs ${cfg.color} mb-1`}>{cfg.label}</p>
              <p className={`text-xl font-semibold ${cfg.color}`}>{healthSummary[bucket]}</p>
            </div>
          );
        })}
        <div className="bg-red-400/10 rounded-lg p-3 border border-red-400/30">
          <p className="text-xs text-red-400 mb-1">At-Risk Revenue</p>
          <p className="text-xl font-semibold text-red-400">{formatCurrency(healthSummary.atRiskRevenue)}</p>
        </div>
      </div>

      {/* ââ At-Risk Alerts ââ */}
      {healthData.some((h) => (h.health_bucket === 'at_risk' || h.health_bucket === 'dormant') && (h.revenue_90d ?? 0) > 10000) && (
        <div className="bg-orange-400/10 border border-orange-400/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">High-Value Accounts Need Attention</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {healthData
              .filter((h) => (h.health_bucket === 'at_risk' || h.health_bucket === 'dormant') && (h.revenue_90d ?? 0) > 10000)
              .slice(0, 5)
              .map((h) => (
                <button
                  key={h.customer_id}
                  onClick={() => onViewChange(`crm-account-detail:${h.customer_id}`)}
                  className="text-xs bg-cult-dark-gray/80 text-orange-300 px-2 py-1 rounded hover:bg-cult-dark-gray transition-colors"
                >
                  {h.customer_name} Â· {formatCurrency(h.revenue_90d)}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ââ Search & Filters ââ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-medium-gray" />
          <input
            type="text"
            placeholder="Search by name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-cult-dark-gray/50 border border-cult-medium-gray/50 rounded-lg text-sm text-cult-white placeholder-cult-medium-gray focus:outline-none focus:border-cult-silver/50"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-cult-medium-gray" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-cult-dark-gray/50 border border-cult-medium-gray/50 rounded-lg px-2 py-2 text-sm text-cult-silver focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
            <option value="churned">Churned</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="bg-cult-dark-gray/50 border border-cult-medium-gray/50 rounded-lg px-2 py-2 text-sm text-cult-silver focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="direct">Direct</option>
            <option value="hub_parent">Hub Parent</option>
          </select>
        </div>
        <span className="text-xs text-cult-medium-gray">{sorted.length} accounts</span>
      </div>

      {/* ââ Table ââ */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-medium-gray/30">
              <th className="text-left py-3 px-3 w-8" />
              <th className="text-left py-3 px-3">
                <SortHeader label="Account" field="name" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="text-left py-3 px-3">
                <SortHeader label="Health" field="health_score" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="text-right py-3 px-3">
                <SortHeader label="Revenue" field="total_revenue" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="text-left py-3 px-3">
                <SortHeader label="Last Order" field="last_order_date" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="text-right py-3 px-3">
                <SortHeader label="Orders" field="order_count" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="text-left py-3 px-3">
                <span className="text-xs font-medium uppercase tracking-wider text-cult-silver">Score</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-medium-gray/20">
            {sorted.map((acct) => {
              const isParent = acct.account_type === 'hub_parent';
              const children = isParent ? childrenByParent.get(acct.customer_id) || [] : [];
              const isExpanded = expandedParents.has(acct.customer_id);

              return (
                <React.Fragment key={acct.customer_id}>
                  {/* Parent / Direct row */}
                  <tr className="hover:bg-cult-dark-gray/30 transition-colors group">
                    <td className="py-2.5 px-3">
                      {isParent && children.length > 0 ? (
                        <button onClick={() => toggleParent(acct.customer_id)} className="text-cult-medium-gray hover:text-cult-white">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="w-4 h-4 block" />
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onViewChange(`crm-account-detail:${acct.customer_id}`)}
                        className="text-left hover:text-cult-white transition-colors"
                      >
                        <span className="text-cult-white font-medium">{acct.name}</span>
                        <span className="text-cult-medium-gray text-xs ml-2">{acct.customer_code}</span>
                        {isParent && <span className="ml-2 text-xs text-sky-400/70">Hub Â· {children.length} locations</span>}
                        {acct.city && <span className="block text-xs text-cult-medium-gray">{acct.city}{acct.state ? `, ${acct.state}` : ''}</span>}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <HealthBadge bucket={acct.health_bucket} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-cult-silver tabular-nums">
                      {formatCurrency(acct.total_revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-cult-silver text-xs">
                      {formatDate(acct.last_order_date)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cult-silver tabular-nums">
                      {acct.order_count ?? 'â'}
                    </td>
                    <td className="py-2.5 px-3">
                      <MiniScoreBar score={acct.health_score} />
                    </td>
                  </tr>

                  {/* Expanded children */}
                  {isExpanded && children.map((child) => (
                    <tr key={child.customer_id} className="hover:bg-cult-dark-gray/20 transition-colors bg-cult-near-black/30">
                      <td className="py-2 px-3" />
                      <td className="py-2 px-3 pl-10">
                        <button
                          onClick={() => onViewChange(`crm-account-detail:${child.customer_id}`)}
                          className="text-left hover:text-cult-white transition-colors"
                        >
                          <span className="text-cult-silver text-sm">{child.name}</span>
                          <span className="text-cult-medium-gray text-xs ml-2">{child.customer_code}</span>
                          {child.city && <span className="block text-xs text-cult-medium-gray">{child.city}{child.state ? `, ${child.state}` : ''}</span>}
                        </button>
                      </td>
                      <td className="py-2 px-3">
                        <HealthBadge bucket={child.health_bucket} />
                      </td>
                      <td className="py-2 px-3 text-right text-cult-medium-gray tabular-nums text-xs">
                        {formatCurrency(child.total_revenue)}
                      </td>
                      <td className="py-2 px-3 text-cult-medium-gray text-xs">
                        {formatDate(child.last_order_date)}
                      </td>
                      <td className="py-2 px-3 text-right text-cult-medium-gray tabular-nums text-xs">
                        {child.order_count ?? 'â'}
                      </td>
                      <td className="py-2 px-3">
                        <MiniScoreBar score={child.health_score} />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-cult-medium-gray">
                  No accounts match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Contacts Tab — Cross-account contact directory
// ──────────────────────────────────────────────────────────────────────────────

function ContactsTab({ onViewChange }: { onViewChange: (view: string) => void }) {
  const [contacts, setContacts] = React.useState<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
    is_primary: boolean;
    customer_id: string | null;
    customer: { id: string; name: string; city: string | null; state: string | null; account_type: string | null } | null;
  }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<'name' | 'customer' | 'title'>('name');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch contacts
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllContacts(debouncedQuery || undefined).then(({ data }) => {
      if (!cancelled && data) setContacts(data);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Sort contacts
  const sorted = useMemo(() => {
    const arr = [...contacts];
    arr.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (sortField === 'name') { aVal = a.name || ''; bVal = b.name || ''; }
      else if (sortField === 'customer') { aVal = a.customer?.name || ''; bVal = b.customer?.name || ''; }
      else if (sortField === 'title') { aVal = a.title || ''; bVal = b.title || ''; }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [contacts, sortField, sortDir]);

  const toggleSort = (field: 'name' | 'customer' | 'title') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-medium-gray" />
          <input
            type="text"
            placeholder="Search contacts by name, email, title, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cult-dark-gray border border-cult-medium-gray/30 rounded-lg text-cult-silver text-sm placeholder:text-cult-medium-gray/60 focus:outline-none focus:border-cult-silver/50"
          />
        </div>
        <div className="text-xs text-cult-medium-gray">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 animate-spin text-cult-medium-gray" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-cult-medium-gray">
          <Users className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">{debouncedQuery ? 'No contacts match your search' : 'No contacts found'}</p>
        </div>
      ) : (
        <div className="border border-cult-medium-gray/20 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cult-dark-gray/60 text-cult-medium-gray text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left cursor-pointer hover:text-cult-silver" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Contact <SortIcon field="name" /></span>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:text-cult-silver" onClick={() => toggleSort('title')}>
                  <span className="flex items-center gap-1">Title <SortIcon field="title" /></span>
                </th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left cursor-pointer hover:text-cult-silver" onClick={() => toggleSort('customer')}>
                  <span className="flex items-center gap-1">Account <SortIcon field="customer" /></span>
                </th>
                <th className="px-4 py-3 text-left">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-medium-gray/10">
              {sorted.map(c => (
                <tr key={c.id} className="hover:bg-cult-dark-gray/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.is_primary && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      <span className="text-cult-silver font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cult-medium-gray">{c.title || '—'}</td>
                  <td className="px-4 py-3">
                    {c.email ? (
                      <a href={'mailto:' + c.email} className="text-cult-medium-gray hover:text-cult-silver flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {c.email}
                      </a>
                    ) : <span className="text-cult-medium-gray/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.phone ? (
                      <span className="text-cult-medium-gray flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </span>
                    ) : <span className="text-cult-medium-gray/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onViewChange('account-detail:' + c.customer?.id)}
                      className="text-cult-silver hover:underline flex items-center gap-1"
                    >
                      <Briefcase className="w-3 h-3 text-cult-medium-gray" />
                      {c.customer?.name || 'Unknown'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-cult-medium-gray text-xs">
                    {c.customer?.city && c.customer?.state
                      ? c.customer.city + ', ' + c.customer.state
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// âââ Main AccountsHub Component ââââââââââââââââââââââââââââââââââââââââââââââ

interface AccountsHubProps {
  onViewChange: (view: string) => void;
}

export default function AccountsHub({ onViewChange }: AccountsHubProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <div className="space-y-4">
      {/* ââ Header ââ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-cult-white">Accounts Hub</h1>
          <p className="text-sm text-cult-silver mt-0.5">
            Unified account management â health, revenue, visits, and contacts in one place.
          </p>
        </div>
      </div>

      {/* ââ Tab Bar ââ */}
      <div className="bg-cult-dark-gray/50 rounded-lg p-1 border border-cult-medium-gray/50 inline-flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cult-near-black text-cult-white shadow-sm'
                  : 'text-cult-silver hover:text-cult-white hover:bg-cult-dark-gray/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ââ Tab Content ââ */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab onViewChange={onViewChange} />}
        {activeTab === 'revenue' && <RevenueTrackingDashboard onViewChange={onViewChange} />}
        {activeTab === 'cadence' && <VisitCadenceDashboard onViewChange={onViewChange} />}
        {activeTab === 'contacts' && <ContactsTab onViewChange={onViewChange} />}
      </div>
    </div>
  );
}
