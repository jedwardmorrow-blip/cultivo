import { useState } from 'react';
import { Package, ExternalLink, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import { OrderItemsExpander } from '@/features/delivery/components/OrderItemsExpander';

interface AccountOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  order_date: string;
  requested_delivery_date: string | null;
  archived: boolean;
}

interface AccountOrderHistoryProps {
  orders: AccountOrder[];
  onSelectOrder?: (orderId: string) => void;
  periodLabel?: string;
}

function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-cult-success-muted text-cult-success';
    case 'pending': return 'bg-cult-warning-muted text-cult-warning';
    case 'processing': return 'bg-cult-info-muted text-cult-info';
    case 'ready_for_delivery': return 'bg-cult-info-muted text-cult-info';
    case 'cancelled': return 'bg-cult-danger-muted text-cult-danger';
    default: return 'bg-cult-border/30 text-cult-text-secondary';
  }
}

export function AccountOrderHistory({ orders, onSelectOrder, periodLabel }: AccountOrderHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="bg-cult-surface border border-cult-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-cult-text-secondary" />
          <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Order History</h3>
        </div>
        <p className="text-sm text-cult-text-muted">No orders yet for this account.</p>
      </div>
    );
  }

  const totalValue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  return (
    <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-surface-raised flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cult-text-secondary" />
          <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Order History</h3>
          {periodLabel && (
            <span className="text-xs text-cult-text-muted bg-cult-surface px-2 py-0.5 rounded-full">
              {periodLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-cult-text-muted">
          <span>{orders.length} orders</span>
          <span className="text-cult-success font-semibold">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-surface-raised">
              <th className="px-2 py-3 w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden md:table-cell">Delivery</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-surface-raised/50">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <tr key={order.id} className="group">
                  <td colSpan={7} className="p-0">
                    <div>
                      <div
                        className={`flex items-center hover:bg-cult-surface/50 transition-colors ${onSelectOrder ? 'cursor-pointer' : ''}`}
                        onClick={() => toggleExpand(order.id)}
                      >
                        <div className="px-2 py-3 w-8 flex items-center justify-center">
                          <ChevronDown className={`w-3.5 h-3.5 text-cult-border transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="px-4 py-3 flex-1 min-w-0">
                          <span className="text-sm font-mono text-cult-text-primary">{order.order_number}</span>
                        </div>
                        <div className="px-4 py-3">
                          <span className="text-sm text-cult-text-muted">{formatDate(order.order_date)}</span>
                        </div>
                        <div className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-cult-text-primary">{formatCurrency(Number(order.total_amount))}</span>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full uppercase ${getOrderStatusColor(order.status)}`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="px-4 py-3 hidden md:block">
                          <span className="text-xs text-cult-text-muted">
                            {order.requested_delivery_date ? formatDate(order.requested_delivery_date) : '-'}
                          </span>
                        </div>
                        <div className="px-4 py-3 w-10">
                          {onSelectOrder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onSelectOrder(order.id); }}
                              className="p-1 text-cult-border hover:text-cult-text-primary transition-colors"
                              title="View full order"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-5 pb-3 pt-1 bg-cult-surface/20 border-t border-cult-surface-raised/30">
                          <OrderItemsExpander orderId={order.id} onSelectOrder={onSelectOrder} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
