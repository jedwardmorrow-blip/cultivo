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
    case 'completed': return 'bg-emerald-500/20 text-emerald-400';
    case 'pending': return 'bg-amber-500/20 text-amber-400';
    case 'processing': return 'bg-sky-500/20 text-sky-400';
    case 'ready_for_delivery': return 'bg-cyan-500/20 text-cyan-400';
    case 'cancelled': return 'bg-red-500/20 text-red-400';
    default: return 'bg-cult-medium-gray/30 text-cult-silver';
  }
}

export function AccountOrderHistory({ orders, onSelectOrder, periodLabel }: AccountOrderHistoryProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Order History</h3>
        </div>
        <p className="text-sm text-cult-light-gray">No orders yet for this account.</p>
      </div>
    );
  }

  const totalValue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Order History</h3>
          {periodLabel && (
            <span className="text-[10px] text-cult-light-gray bg-cult-dark-gray px-2 py-0.5 rounded-full">
              {periodLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-cult-light-gray">
          <span>{orders.length} orders</span>
          <span className="text-emerald-400 font-semibold">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-charcoal">
              <th className="px-2 py-3 w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider hidden md:table-cell">Delivery</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <tr key={order.id} className="group">
                  <td colSpan={7} className="p-0">
                    <div>
                      <div
                        className={`flex items-center hover:bg-cult-dark-gray/50 transition-colors ${onSelectOrder ? 'cursor-pointer' : ''}`}
                        onClick={() => toggleExpand(order.id)}
                      >
                        <div className="px-2 py-3 w-8 flex items-center justify-center">
                          <ChevronDown className={`w-3.5 h-3.5 text-cult-medium-gray transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="px-4 py-3 flex-1 min-w-0">
                          <span className="text-sm font-mono text-cult-white">{order.order_number}</span>
                        </div>
                        <div className="px-4 py-3">
                          <span className="text-sm text-cult-light-gray">{formatDate(order.order_date)}</span>
                        </div>
                        <div className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-cult-white">{formatCurrency(Number(order.total_amount))}</span>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${getOrderStatusColor(order.status)}`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="px-4 py-3 hidden md:block">
                          <span className="text-xs text-cult-light-gray">
                            {order.requested_delivery_date ? formatDate(order.requested_delivery_date) : '-'}
                          </span>
                        </div>
                        <div className="px-4 py-3 w-10">
                          {onSelectOrder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onSelectOrder(order.id); }}
                              className="p-1 text-cult-medium-gray hover:text-cult-white transition-colors"
                              title="View full order"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-5 pb-3 pt-1 bg-cult-dark-gray/20 border-t border-cult-charcoal/30">
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
