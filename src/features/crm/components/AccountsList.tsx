import { useState, useEffect, useMemo } from 'react';
import { Search, Building2, ChevronRight, Filter, X } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { getAccountSummaries } from '../services';
import type { AccountSummary, AccountStatus, AccountType } from '../types';

interface AccountsListProps {
  onViewChange: (view: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'prospect': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'inactive': return 'bg-cult-medium-gray/30 text-cult-silver border-cult-medium-gray/30';
    case 'churned': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-cult-medium-gray/30 text-cult-silver border-cult-medium-gray/30';
  }
}

export function AccountsList({ onViewChange }: AccountsListProps) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [sortField, setSortField] = useState<'name' | 'total_revenue' | 'last_order_date' | 'order_count'>('total_revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await getAccountSummaries();
      if (data) setAccounts(data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredAccounts = useMemo(() => {
    let result = accounts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.dispensary_code.toLowerCase().includes(term) ||
          (a.city && a.city.toLowerCase().includes(term)) ||
          (a.license_name && a.license_name.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.account_status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((a) => a.account_type === typeFilter);
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'total_revenue':
          aVal = Number(a.total_revenue);
          bVal = Number(b.total_revenue);
          break;
        case 'last_order_date':
          aVal = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
          bVal = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
          break;
        case 'order_count':
          aVal = a.order_count;
          bVal = b.order_count;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [accounts, searchTerm, statusFilter, typeFilter, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const handleSelectAccount = (accountId: string) => {
    onViewChange(`crm-account-detail:${accountId}`);
  };

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || searchTerm !== '';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Accounts</h1>
          <p className="text-cult-light-gray mt-1">{accounts.length} dispensary accounts</p>
        </div>
        <button
          onClick={() => onViewChange('crm-dashboard')}
          className="px-4 py-2 text-sm font-medium text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-silver" />
          <input
            type="text"
            placeholder="Search by name, code, city, or license..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cult-near-black border border-cult-medium-gray rounded-lg text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-silver hover:text-cult-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-silver pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'all')}
              className="pl-9 pr-8 py-2.5 bg-cult-near-black border border-cult-medium-gray rounded-lg text-sm text-cult-white appearance-none cursor-pointer focus:outline-none focus:border-cult-lighter-gray"
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
            className="px-3 py-2.5 bg-cult-near-black border border-cult-medium-gray rounded-lg text-sm text-cult-white appearance-none cursor-pointer focus:outline-none focus:border-cult-lighter-gray"
          >
            <option value="all">All Types</option>
            <option value="direct">Direct</option>
            <option value="hub_parent">Hub Parent</option>
            <option value="hub_child">Hub Child</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}
              className="px-3 py-2.5 text-xs text-cult-silver hover:text-cult-white bg-cult-near-black border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cult-charcoal">
                <SortHeader label="Account" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider hidden sm:table-cell">Location</th>
                <SortHeader label="Revenue" field="total_revenue" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Orders" field="order_count" current={sortField} dir={sortDir} onSort={handleSort} align="right" className="hidden md:table-cell" />
                <SortHeader label="Last Order" field="last_order_date" current={sortField} dir={sortDir} onSort={handleSort} align="right" className="hidden lg:table-cell" />
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-charcoal/50">
              {filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  onClick={() => handleSelectAccount(account.id)}
                  className="hover:bg-cult-dark-gray/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cult-white truncate">{account.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-cult-light-gray">{account.dispensary_code}</span>
                          {account.account_type === 'hub_parent' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/20 text-sky-400 rounded">
                              HUB ({account.child_account_count} locations)
                            </span>
                          )}
                          {account.account_type === 'hub_child' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/15 text-sky-300/70 rounded">SUB</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-cult-light-gray">
                      {[account.city, account.state].filter(Boolean).join(', ') || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${Number(account.total_revenue) > 0 ? 'text-emerald-400' : 'text-cult-medium-gray'}`}>
                      {Number(account.total_revenue) > 0 ? formatCurrency(Number(account.total_revenue)) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-cult-light-gray">{account.order_count || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className={`text-xs ${
                      account.days_since_last_order !== null && account.days_since_last_order > 30
                        ? 'text-amber-400'
                        : 'text-cult-light-gray'
                    }`}>
                      {account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase border ${getStatusColor(account.account_status)}`}>
                      {account.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white transition-colors" />
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-cult-light-gray text-sm">
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
      className={`px-4 py-3 text-${align} text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:text-cult-white transition-colors ${
        isActive ? 'text-cult-white' : 'text-cult-silver'
      } ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-[10px]">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </span>
    </th>
  );
}
