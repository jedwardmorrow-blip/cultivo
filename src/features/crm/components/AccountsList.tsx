import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, ChevronRight, ChevronDown, Filter, X, MapPin, Network } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getAccountSummaries } from '../services';
import type { AccountSummary, AccountStatus, AccountType } from '../types';

interface AccountsListProps {}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-cult-success-muted text-cult-success border-cult-success/30';
    case 'prospect': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'inactive': return 'bg-cult-border/30 text-cult-text-secondary border-cult-border/30';
    case 'churned': return 'bg-cult-danger-muted text-cult-danger border-cult-danger/30';
    default: return 'bg-cult-border/30 text-cult-text-secondary border-cult-border/30';
  }
}

export function AccountsList({}: AccountsListProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [sortField, setSortField] = useState<'name' | 'total_revenue' | 'last_order_date' | 'order_count'>('total_revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await getAccountSummaries();
      if (data) setAccounts(data);
      setLoading(false);
    }
    load();
  }, []);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, AccountSummary[]>();
    accounts.forEach((a) => {
      if (a.account_type === 'hub_child' && a.parent_customer_id) {
        const existing = map.get(a.parent_customer_id) || [];
        existing.push(a);
        map.set(a.parent_customer_id, existing);
      }
    });
    return map;
  }, [accounts]);

  const matchingChildParentIds = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    const term = searchTerm.toLowerCase();
    const parentIds = new Set<string>();
    accounts.forEach((a) => {
      if (a.account_type === 'hub_child' && a.parent_customer_id) {
        const matches =
          a.name.toLowerCase().includes(term) ||
          a.dispensary_code.toLowerCase().includes(term) ||
          (a.city && a.city.toLowerCase().includes(term)) ||
          (a.license_name && a.license_name.toLowerCase().includes(term));
        if (matches) parentIds.add(a.parent_customer_id);
      }
    });
    return parentIds;
  }, [accounts, searchTerm]);

  const filteredAccounts = useMemo(() => {
    let result = accounts.filter((a) => a.account_type !== 'hub_child');

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.dispensary_code.toLowerCase().includes(term) ||
          (a.city && a.city.toLowerCase().includes(term)) ||
          (a.license_name && a.license_name.toLowerCase().includes(term)) ||
          matchingChildParentIds.has(a.id)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.account_status === statusFilter);
    }

    if (typeFilter !== 'all') {
      if (typeFilter === 'hub_child') {
        result = [];
      } else {
        result = result.filter((a) => a.account_type === typeFilter);
      }
    }

    const getCombinedRevenue = (a: AccountSummary) =>
      Number(a.total_revenue) + (a.child_total_revenue || 0);

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'total_revenue':
          aVal = getCombinedRevenue(a);
          bVal = getCombinedRevenue(b);
          break;
        case 'last_order_date':
          aVal = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
          bVal = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
          break;
        case 'order_count':
          aVal = a.order_count + (a.child_total_orders || 0);
          bVal = b.order_count + (b.child_total_orders || 0);
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [accounts, searchTerm, statusFilter, typeFilter, sortField, sortDir, matchingChildParentIds]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const handleSelectAccount = (accountId: string) => {
    navigate(`/crm-account-detail/${accountId}`);
  };

  const toggleParent = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || searchTerm !== '';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-text-primary">Accounts</h1>
          <p className="text-cult-text-muted mt-2">
            {accounts.filter((a) => a.account_type !== 'hub_child').length} accounts
            {childrenByParent.size > 0 && (
              <span className="ml-1 text-cult-text-secondary">
                ({Array.from(childrenByParent.values()).reduce((s, c) => s + c.length, 0)} hub locations)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/crm-dashboard')}
          className="px-4 py-2 text-sm font-medium text-cult-text-primary bg-cult-surface border border-cult-border rounded-lg hover:bg-cult-surface-raised transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-secondary" />
          <input
            type="text"
            placeholder="Search by name, code, city, or license..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cult-surface border border-cult-border rounded-lg text-sm text-cult-text-primary placeholder-cult-text-secondary focus:outline-none focus:border-cult-text-muted transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-text-secondary hover:text-cult-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-text-secondary pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'all')}
              className="pl-9 pr-8 py-2.5 bg-cult-surface border border-cult-border rounded-lg text-sm text-cult-text-primary appearance-none cursor-pointer focus:outline-none focus:border-cult-text-muted"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccountType | 'all')}
            className="px-3 py-2.5 bg-cult-surface border border-cult-border rounded-lg text-sm text-cult-text-primary appearance-none cursor-pointer focus:outline-none focus:border-cult-text-muted"
          >
            <option value="all">All Types</option>
            <option value="direct">Direct</option>
            <option value="hub_parent">Hub Parent</option>
            <option value="hub_child">Hub Child</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}
              className="px-3 py-2.5 text-xs text-cult-text-secondary hover:text-cult-text-primary bg-cult-surface border border-cult-border rounded-lg hover:bg-cult-surface-raised transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cult-surface-raised">
                <SortHeader label="Account" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden sm:table-cell">Location</th>
                <SortHeader label="Revenue" field="total_revenue" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Orders" field="order_count" current={sortField} dir={sortDir} onSort={handleSort} align="right" className="hidden md:table-cell" />
                <SortHeader label="Last Order" field="last_order_date" current={sortField} dir={sortDir} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-surface-raised/50">
              {filteredAccounts.map((account) => {
                const isHub = account.account_type === 'hub_parent';
                const children = isHub ? (childrenByParent.get(account.id) || []) : [];
                const isExpanded = expandedParents.has(account.id);
                const combinedRevenue = Number(account.total_revenue) + (account.child_total_revenue || 0);
                const combinedOrders = account.order_count + (account.child_total_orders || 0);

                return (
                  <ParentRow
                    key={account.id}
                    account={account}
                    isHub={isHub}
                    children={children}
                    isExpanded={isExpanded}
                    combinedRevenue={combinedRevenue}
                    combinedOrders={combinedOrders}
                    onSelect={handleSelectAccount}
                    onToggle={toggleParent}
                  />
                );
              })}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-cult-text-muted text-sm">
                    No accounts match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ParentRow({
  account,
  isHub,
  children,
  isExpanded,
  combinedRevenue,
  combinedOrders,
  onSelect,
  onToggle,
}: {
  account: AccountSummary;
  isHub: boolean;
  children: AccountSummary[];
  isExpanded: boolean;
  combinedRevenue: number;
  combinedOrders: number;
  onSelect: (id: string) => void;
  onToggle: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <>
      <tr
        onClick={() => onSelect(account.id)}
        className="hover:bg-cult-surface/50 cursor-pointer transition-colors group"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isHub && children.length > 0 ? (
              <button
                onClick={(e) => onToggle(account.id, e)}
                className="p-0.5 rounded hover:bg-cult-surface-raised transition-colors"
              >
                <ChevronDown className={`w-4 h-4 text-cult-text-secondary transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
              </button>
            ) : (
              <Building2 className="w-4 h-4 text-cult-border flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-cult-text-primary truncate">{account.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-cult-text-muted">{account.dispensary_code}</span>
                {isHub && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-400 rounded">
                    <Network className="w-3 h-3" />
                    CHAIN ({account.child_account_count})
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs text-cult-text-muted">
            {[account.city, account.state].filter(Boolean).join(', ') || '-'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div>
            <span className={`text-sm font-semibold ${combinedRevenue > 0 ? 'text-cult-success' : 'text-cult-border'}`}>
              {combinedRevenue > 0 ? formatCurrency(combinedRevenue) : '-'}
            </span>
            {isHub && Number(account.total_revenue) > 0 && (account.child_total_revenue || 0) > 0 && (
              <p className="text-xs text-cult-text-secondary">
                {formatCurrency(Number(account.total_revenue))} direct
              </p>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right hidden md:table-cell">
          <div>
            <span className="text-sm text-cult-text-muted">{combinedOrders || '-'}</span>
            {isHub && account.order_count > 0 && (account.child_total_orders || 0) > 0 && (
              <p className="text-xs text-cult-text-secondary">{account.order_count} direct</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right hidden lg:table-cell">
          <span className={`text-xs ${
            account.days_since_last_order !== null && account.days_since_last_order > 30
              ? 'text-cult-warning'
              : 'text-cult-text-muted'
          }`}>
            {account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : '-'}
          </span>
        </td>
        <td className="px-4 py-3 text-center hidden sm:table-cell">
          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full uppercase border ${getStatusColor(account.account_status)}`}>
            {account.account_status}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <ChevronRight className="w-4 h-4 text-cult-border group-hover:text-cult-text-primary transition-colors" />
        </td>
      </tr>

      {isHub && isExpanded && children.map((child) => (
        <tr
          key={child.id}
          onClick={() => onSelect(child.id)}
          className="hover:bg-cult-surface/30 cursor-pointer transition-colors group bg-cult-surface/20"
        >
          <td className="px-4 py-2.5 pl-12">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-sky-400/60 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-cult-text-secondary group-hover:text-cult-text-primary truncate">{child.name}</p>
                <span className="text-xs font-mono text-cult-text-muted">{child.dispensary_code}</span>
              </div>
            </div>
          </td>
          <td className="px-4 py-2.5 hidden sm:table-cell">
            <span className="text-xs text-cult-text-muted">
              {[child.city, child.state].filter(Boolean).join(', ') || '-'}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right">
            <span className={`text-sm ${Number(child.total_revenue) > 0 ? 'text-cult-success/80' : 'text-cult-border'}`}>
              {Number(child.total_revenue) > 0 ? formatCurrency(Number(child.total_revenue)) : '-'}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right hidden md:table-cell">
            <span className="text-sm text-cult-text-muted">{child.order_count || '-'}</span>
          </td>
          <td className="px-4 py-2.5 text-right hidden lg:table-cell">
            <span className={`text-xs ${
              child.days_since_last_order !== null && child.days_since_last_order > 30
                ? 'text-cult-warning'
                : 'text-cult-text-muted'
            }`}>
              {child.days_since_last_order !== null ? `${child.days_since_last_order}d ago` : '-'}
            </span>
          </td>
          <td className="px-4 py-2.5 text-center hidden sm:table-cell">
            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full uppercase border ${getStatusColor(child.account_status)}`}>
              {child.account_status}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right">
            <ChevronRight className="w-3.5 h-3.5 text-cult-border group-hover:text-cult-text-primary transition-colors" />
          </td>
        </tr>
      ))}
    </>
  );
}

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string;
  field: string;
  current: string;
  dir: 'asc' | 'desc';
  onSort: (field: any) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const isActive = current === field;
  return (
    <th
      className={`px-4 py-3 text-${align} text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:text-cult-text-primary transition-colors ${
        isActive ? 'text-cult-text-primary' : 'text-cult-text-secondary'
      } ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-xs">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </span>
    </th>
  );
}
