import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle, Copy, Calendar, Package, ArrowRight, Gift } from 'lucide-react';
import { formatCurrency, parseDeliveryDate } from '@/lib/utils';
import { useShiftSelect } from '@/shared/hooks';
import { getStatusColor } from '../utils/orderGrouping';
import { getAttentionFlags, getOrderAge, getOrderAgeColor, type AttentionFlag } from '../utils/orderAttention';
import { getNextStatus, getTransitionLabel } from '../utils/orderTransitions';
import type { Order } from '../types';

type SortField = 'order_number' | 'customer_name' | 'status' | 'delivery_date' | 'total_amount' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface OrderTableProps {
  orders: Order[];
  selectedOrderId: string | null;
  selectedIds: Set<string>;
  onSelectOrder: (orderId: string) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onToggleSelectAll: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_delivery: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function AttentionBadge({ flag }: { flag: AttentionFlag }) {
  const colors = flag.severity === 'high'
    ? 'bg-red-900/40 text-red-400 border-red-700'
    : 'bg-amber-900/30 text-amber-400 border-amber-700';

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded ${colors}`}>
      <AlertTriangle className="w-2.5 h-2.5" />
      {flag.label}
    </span>
  );
}

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) {
    return <ChevronUp className="w-3 h-3 text-cult-medium-gray" />;
  }
  return direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-cult-white" />
    : <ChevronDown className="w-3 h-3 text-cult-white" />;
}

export function OrderTable({
  orders,
  selectedOrderId,
  selectedIds,
  onSelectOrder,
  onSelectionChange,
  onToggleSelectAll,
  onStatusChange,
}: OrderTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'order_number':
          comparison = (a.order_number || '').localeCompare(b.order_number || '');
          break;
        case 'customer_name':
          comparison = (a.customer_name || '').localeCompare(b.customer_name || '');
          break;
        case 'status': {
          const statusOrder = ['submitted', 'accepted', 'processing', 'ready_for_delivery', 'completed', 'cancelled'];
          comparison = statusOrder.indexOf(a.status || '') - statusOrder.indexOf(b.status || '');
          break;
        }
        case 'delivery_date': {
          const dateA = a.scheduled_delivery_date || a.requested_delivery_date || '';
          const dateB = b.scheduled_delivery_date || b.requested_delivery_date || '';
          if (!dateA && dateB) return 1;
          if (dateA && !dateB) return -1;
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case 'total_amount':
          comparison = (a.total_amount || 0) - (b.total_amount || 0);
          break;
        case 'created_at':
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [orders, sortField, sortDirection]);

  const getOrderKey = useCallback((order: Order) => order.id, []);
  const { handleItemClick: shiftSelectClick } = useShiftSelect({
    items: sortedOrders,
    getKey: getOrderKey,
    selectedIds,
    onSelectionChange,
  });

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;

  const thClass = 'px-3 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wide cursor-pointer hover:text-cult-white transition-colors select-none';
  const thSortable = (field: SortField, label: string, align?: string) => (
    <th
      className={`${thClass} ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon field={field} currentField={sortField} direction={sortDirection} />
      </span>
    </th>
  );

  return (
    <div className="bg-cult-graphite border border-cult-charcoal rounded-cult overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-charcoal bg-cult-near-black">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-cult-charcoal bg-cult-near-black text-cult-green focus:ring-cult-green/50 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                />
              </th>
              {thSortable('order_number', 'Order')}
              {thSortable('status', 'Status')}
              {thSortable('customer_name', 'Customer')}
              {thSortable('delivery_date', 'Delivery')}
              <th className={thClass}>Items</th>
              {thSortable('total_amount', 'Total', 'right')}
              {thSortable('created_at', 'Entered')}
              <th className={`${thClass} w-8`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/60">
            {sortedOrders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              const isChecked = selectedIds.has(order.id);
              const flags = getAttentionFlags(order);
              const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;
              const age = getOrderAge(order.created_at);
              const ageColor = getOrderAgeColor(order.created_at, order.status);
              const statusColors = getStatusColor(order.status || 'submitted');
              const nextStatus = getNextStatus(order.status || 'submitted');

              return (
                <tr
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className={`cursor-pointer transition-all duration-150 group ${
                    isSelected
                      ? 'bg-cult-charcoal/80 border-l-2 border-l-cult-green'
                      : 'hover:bg-cult-graphite/80 border-l-2 border-l-transparent'
                  }`}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => shiftSelectClick(order.id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey)}
                      className="w-3.5 h-3.5 rounded border-cult-charcoal bg-cult-near-black text-cult-green focus:ring-cult-green/50 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-cult-off-white tracking-wide">
                        {order.order_number}
                      </span>
                      {(order as any).is_sample && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded uppercase">
                          <Gift className="w-2.5 h-2.5" />
                          Sample
                        </span>
                      )}
                      {order.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-700 rounded uppercase">
                          Urgent
                        </span>
                      )}
                      {order.priority === 'high' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-700 rounded uppercase">
                          High
                        </span>
                      )}
                    </div>
                    {flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {flags.map((flag, i) => (
                          <AttentionBadge key={i} flag={flag} />
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <span className={`inline-block px-2 py-1 text-[11px] font-bold border rounded uppercase tracking-wider select-none ${statusColors}`}>
                        {STATUS_LABELS[order.status || 'submitted'] || order.status}
                      </span>
                      {onStatusChange && nextStatus && (
                        <button
                          title={getTransitionLabel(order.status || 'submitted', nextStatus)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(order.id, nextStatus);
                          }}
                          className="p-1 rounded hover:bg-white/10 transition-all text-cult-lighter-gray hover:text-cult-green opacity-0 group-hover:opacity-100"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-sm text-cult-off-white">
                      {order.customer_name || 'Unknown'}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    {deliveryDate ? (
                      <span className="text-sm text-cult-silver flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-cult-lighter-gray" />
                        {parseDeliveryDate(deliveryDate)?.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }) ?? 'No date'}
                      </span>
                    ) : (
                      <span className="text-xs text-cult-lighter-gray">No date</span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-sm text-cult-silver flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-cult-lighter-gray" />
                      {order.item_count || 0}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-semibold text-green-400">
                      {formatCurrency(order.total_amount || 0)}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    {order.created_at ? (
                      <div>
                        <span className="text-sm text-cult-silver flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-cult-lighter-gray" />
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className={`text-[10px] ${ageColor} ml-4.5`}>{age}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-cult-lighter-gray">--</span>
                    )}
                  </td>

                  <td className="px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy className="w-3.5 h-3.5 text-cult-silver hover:text-cult-white cursor-pointer" title="Clone order" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedOrders.length === 0 && (
        <div className="py-16 text-center">
          <Package className="w-12 h-12 text-cult-charcoal mx-auto mb-3" />
          <p className="text-cult-silver text-sm">No orders match your filters</p>
        </div>
      )}
    </div>
  );
}
