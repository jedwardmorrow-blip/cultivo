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

  // Working-instrument: chips share a single neutral treatment. Status meaning
  // is conveyed by a 6px dot (or alert triangle for attention), never by chip
  // background fills. Active = warm-white text + raised surface; inactive =
  // muted text + hairline border. Dot color comes from the status palette.
  const inactive = 'text-cult-text-muted border-cult-border-subtle bg-cult-surface-inset';
  const active = 'text-cult-text-primary border-cult-border-strong bg-cult-surface-raised';
  const statusPills: (StatusPill & { dotClass?: string })[] = [
    { key: 'attention', label: 'Needs Attention', count: statusCounts.attention, colors: inactive, activeColors: active, dotClass: 'bg-cult-danger' },
    { key: 'all', label: 'All', count: statusCounts.all, colors: inactive, activeColors: active },
    { key: 'submitted', label: 'Submitted', count: statusCounts.submitted, colors: inactive, activeColors: active, dotClass: 'bg-cult-info' },
    { key: 'accepted', label: 'Accepted', count: statusCounts.accepted, colors: inactive, activeColors: active, dotClass: 'bg-cult-info' },
    { key: 'processing', label: 'Processing', count: statusCounts.processing, colors: inactive, activeColors: active, dotClass: 'bg-cult-warning' },
    { key: 'ready_for_delivery', label: 'Ready', count: statusCounts.ready_for_delivery, colors: inactive, activeColors: active, dotClass: 'bg-cult-success' },
    { key: 'completed', label: 'Completed', count: statusCounts.completed, colors: inactive, activeColors: active, dotClass: 'bg-cult-text-faint' },
    { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, colors: inactive, activeColors: active, dotClass: 'bg-cult-danger' },
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cult-text-secondary w-4 h-4" />
          <input
            type="text"
            placeholder="Search by order number, customer, or product..."
            value={filters.searchTerm}
            onChange={(e) => set({ searchTerm: e.target.value })}
            className="w-full pl-10 pr-10 py-2.5 bg-cult-surface-inset border border-cult-border-subtle rounded text-cult-text-primary placeholder-cult-text-muted text-sm focus:outline-none focus:border-cult-accent focus:ring-1 focus:ring-cult-accent/30 transition-colors"
          />
          {filters.searchTerm && (
            <button
              onClick={() => set({ searchTerm: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-text-muted hover:text-cult-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2.5 border rounded font-mono uppercase tracking-[0.14em] text-[11px] transition-colors ${
            showAdvanced || hasActiveFilters
              ? 'bg-cult-surface-raised border-cult-border-strong text-cult-text-primary'
              : 'bg-cult-surface-inset border-cult-border-subtle text-cult-text-muted hover:border-cult-border-strong hover:text-cult-text-primary'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-cult-accent rounded-full" />
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded font-mono uppercase tracking-[0.14em] text-[11px] transition-colors ${
                isActive ? pill.activeColors : pill.colors
              } hover:text-cult-text-primary hover:border-cult-border`}
            >
              {pill.key === 'attention' ? (
                <AlertTriangle className="w-3 h-3 text-cult-danger" />
              ) : pill.dotClass ? (
                <span className={`w-1.5 h-1.5 rounded-full ${pill.dotClass}`} />
              ) : null}
              {pill.label}
              <span className={`ml-0.5 tabular-nums ${isActive ? 'text-cult-text-primary' : 'text-cult-text-faint'}`}>
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {showAdvanced && (
        <div className="bg-cult-surface-inset border border-cult-border-subtle rounded p-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1.5">
                Customer
              </label>
              <select
                value={filters.customerName}
                onChange={(e) => set({ customerName: e.target.value })}
                className="w-full px-3 py-2 bg-cult-surface border border-cult-border-subtle rounded text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent transition-colors"
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1.5">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => set({ priority: e.target.value })}
                className="w-full px-3 py-2 bg-cult-surface border border-cult-border-subtle rounded text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent transition-colors"
              >
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Delivery From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set({ dateFrom: e.target.value })}
                className="w-full px-3 py-2 bg-cult-surface border border-cult-border-subtle rounded text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Delivery To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => set({ dateTo: e.target.value })}
                className="w-full px-3 py-2 bg-cult-surface border border-cult-border-subtle rounded text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="mt-3 font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted hover:text-cult-accent transition-colors underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
