import { useState, useEffect, useMemo } from 'react';
import { Search, X, AlertTriangle, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hasAttentionFlags } from '../utils/orderAttention';
import type { Order } from '../types';

export interface OrderFilterState {
  searchTerm: string;
  status: string;
  customerName: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderFilterBarProps {
  orders: Order[];
  filters: OrderFilterState;
  onFilterChange: (filters: OrderFilterState) => void;
}

interface StatusPill {
  key: string;
  label: string;
  count: number;
  colors: string;
  activeColors: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

export function OrderFilterBar({ orders, filters, onFilterChange }: OrderFilterBarProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (data) setCustomers(data);
    }
    loadCustomers();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      attention: 0,
      submitted: 0,
      accepted: 0,
      processing: 0,
      ready_for_delivery: 0,
      completed: 0,
      cancelled: 0,
    };
    orders.forEach(order => {
      const status = order.status || 'submitted';
      counts[status] = (counts[status] || 0) + 1;
      if (hasAttentionFlags(order)) counts.attention++;
    });
    return counts;
  }, [orders]);

  const statusPills: StatusPill[] = [
    {
      key: 'attention',
      label: 'Needs Attention',
      count: statusCounts.attention,
      colors: 'text-red-400 border-red-800/50 bg-red-900/10',
      activeColors: 'text-red-300 border-red-600 bg-red-900/40',
    },
    {
      key: 'all',
      label: 'All',
      count: statusCounts.all,
      colors: 'text-cult-silver border-cult-charcoal bg-cult-graphite',
      activeColors: 'text-cult-off-white border-cult-silver bg-cult-charcoal',
    },
    {
      key: 'submitted',
      label: 'Submitted',
      count: statusCounts.submitted,
      colors: 'text-blue-400/70 border-blue-800/30 bg-blue-900/5',
      activeColors: 'text-blue-300 border-blue-600 bg-blue-900/30',
    },
    {
      key: 'accepted',
      label: 'Accepted',
      count: statusCounts.accepted,
      colors: 'text-cyan-400/70 border-cyan-800/30 bg-cyan-900/5',
      activeColors: 'text-cyan-300 border-cyan-600 bg-cyan-900/30',
    },
    {
      key: 'processing',
      label: 'Processing',
      count: statusCounts.processing,
      colors: 'text-yellow-400/70 border-yellow-800/30 bg-yellow-900/5',
      activeColors: 'text-yellow-300 border-yellow-600 bg-yellow-900/30',
    },
    {
      key: 'ready_for_delivery',
      label: 'Ready',
      count: statusCounts.ready_for_delivery,
      colors: 'text-green-400/70 border-green-800/30 bg-green-900/5',
      activeColors: 'text-green-300 border-green-600 bg-green-900/30',
    },
    {
      key: 'completed',
      label: 'Completed',
      count: statusCounts.completed,
      colors: 'text-emerald-400/70 border-emerald-800/30 bg-emerald-900/5',
      activeColors: 'text-emerald-300 border-emerald-600 bg-emerald-900/30',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: statusCounts.cancelled,
      colors: 'text-red-400/70 border-red-800/30 bg-red-900/5',
      activeColors: 'text-red-300 border-red-600 bg-red-900/30',
    },
  ];

  const set = (partial: Partial<OrderFilterState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  const hasActiveFilters =
    filters.customerName !== '' ||
    filters.priority !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  const clearAll = () => {
    onFilterChange({
      searchTerm: '',
      status: 'all',
      customerName: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
    });
    setShowAdvanced(false);
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cult-silver w-4 h-4" />
          <input
            type="text"
            placeholder="Search by order number, customer, or product..."
            value={filters.searchTerm}
            onChange={(e) => set({ searchTerm: e.target.value })}
            className="w-full pl-10 pr-10 py-2.5 bg-cult-near-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-lighter-gray text-sm focus:outline-none focus:border-cult-green focus:ring-1 focus:ring-cult-green/30 transition-all"
          />
          {filters.searchTerm && (
            <button
              onClick={() => set({ searchTerm: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-lighter-gray hover:text-cult-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-cult text-xs font-semibold uppercase tracking-wider transition-all ${
            showAdvanced || hasActiveFilters
              ? 'bg-cult-charcoal border-cult-silver text-cult-off-white'
              : 'bg-cult-near-black border-cult-charcoal text-cult-silver hover:border-cult-silver hover:text-cult-off-white'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-cult-green rounded-full" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {statusPills.map((pill) => {
          if (pill.count === 0 && pill.key !== 'all') return null;
          const isActive = filters.status === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => set({ status: pill.key })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                isActive ? pill.activeColors : pill.colors
              } hover:opacity-90`}
            >
              {pill.key === 'attention' && <AlertTriangle className="w-3 h-3" />}
              {pill.label}
              <span className={`ml-0.5 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {showAdvanced && (
        <div className="bg-cult-near-black border border-cult-charcoal rounded-cult p-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-cult-silver uppercase tracking-wider mb-1.5">
                Customer
              </label>
              <select
                value={filters.customerName}
                onChange={(e) => set({ customerName: e.target.value })}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all"
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cult-silver uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => set({ priority: e.target.value })}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all"
              >
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cult-silver uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Delivery From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set({ dateFrom: e.target.value })}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cult-silver uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Delivery To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => set({ dateTo: e.target.value })}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-sm text-cult-off-white focus:outline-none focus:border-cult-green transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="mt-3 text-xs text-cult-silver hover:text-cult-green transition-colors underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
