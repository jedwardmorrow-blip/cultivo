import { Truck, Package, Calendar, CheckCircle2 } from 'lucide-react';
import type { DeliveryHistoryItem } from '../services/deepDive.service';

interface AccountDeliveryHistoryProps {
  deliveries: DeliveryHistoryItem[];
  loading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusStyle(status: string): string {
  switch (status) {
    case 'delivered': return 'bg-emerald-500/15 text-emerald-400';
    case 'completed': return 'bg-emerald-500/15 text-emerald-400';
    case 'ready_for_delivery': return 'bg-sky-500/15 text-sky-400';
    default: return 'bg-cult-medium-gray/30 text-cult-silver';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'delivered': return 'Delivered';
    case 'completed': return 'Completed';
    case 'ready_for_delivery': return 'Ready';
    default: return status;
  }
}

export function AccountDeliveryHistory({ deliveries, loading }: AccountDeliveryHistoryProps) {
  if (loading) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cult-white" />
        </div>
      </div>
    );
  }

  const totalDelivered = deliveries.filter((d) => d.status === 'delivered' || d.status === 'completed').length;
  const totalValue = deliveries.reduce((sum, d) => sum + Number(d.total_amount), 0);

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Delivery History</h3>
        </div>
        <span className="text-xs text-cult-light-gray">{deliveries.length} deliveries</span>
      </div>

      {deliveries.length > 0 && (
        <div className="px-5 py-3 border-b border-cult-charcoal/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cult-silver">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{totalDelivered} completed</span>
          </div>
          <span className="text-xs font-semibold text-emerald-400">{formatCurrency(totalValue)} total</span>
        </div>
      )}

      <div className="divide-y divide-cult-charcoal/50 max-h-[350px] overflow-y-auto">
        {deliveries.map((delivery) => (
          <div key={delivery.order_id} className="px-5 py-3 flex items-center gap-3">
            <div className="p-1.5 rounded bg-cult-dark-gray flex-shrink-0">
              <Package className="w-3.5 h-3.5 text-cult-silver" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-cult-white">{delivery.order_number}</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded ${getStatusStyle(delivery.status)}`}>
                  {getStatusLabel(delivery.status)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-cult-silver">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(delivery.order_date)}
                </span>
                <span>{delivery.item_count} items</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-cult-white">{formatCurrency(Number(delivery.total_amount))}</p>
              {delivery.scheduled_delivery_date && (
                <p className="text-[10px] text-cult-light-gray">
                  Del: {formatDate(delivery.scheduled_delivery_date)}
                </p>
              )}
            </div>
          </div>
        ))}
        {deliveries.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-cult-light-gray">
            No delivery history yet.
          </div>
        )}
      </div>
    </div>
  );
}
