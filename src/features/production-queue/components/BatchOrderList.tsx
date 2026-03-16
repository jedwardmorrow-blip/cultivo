import { Plus, X, Loader2 } from 'lucide-react';
import type { OrderLineItem, BatchAllocation, BatchPlanData, Urgency } from '../types';

function urgencyDot(urgency: Urgency) {
  const colors: Record<Urgency, string> = {
    overdue: 'bg-red-500',
    urgent: 'bg-amber-500',
    soon: 'bg-yellow-500',
    normal: 'bg-green-500',
    no_date: 'bg-gray-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[urgency]}`} />;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface BatchOrderListProps {
  batch: BatchPlanData;
  orderItems: OrderLineItem[];
  allocations: BatchAllocation[];
  onAllocate: (orderItem: OrderLineItem) => void;
  onDeallocate: (allocationId: string) => void;
  allocating: boolean;
}

export function BatchOrderList({
  batch,
  orderItems,
  allocations,
  onAllocate,
  onDeallocate,
  allocating,
}: BatchOrderListProps) {
  // Build a set of order_item_ids that are already allocated to THIS batch
  const allocatedItemIds = new Set(allocations.map(a => a.order_item_id));

  // Split into allocated and unallocated
  const allocatedOrders = orderItems.filter(o => allocatedItemIds.has(o.order_item_id));
  const unallocatedOrders = orderItems.filter(o => !allocatedItemIds.has(o.order_item_id));

  // Find allocation record for an order item
  const getAllocation = (orderItemId: string) => allocations.find(a => a.order_item_id === orderItemId);

  if (orderItems.length === 0) {
    return (
      <div className="text-xs text-gray-500 py-2">No orders need this strain currently.</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        Orders needing {batch.strain_name}
      </div>

      {/* Allocated orders first */}
      {allocatedOrders.map(o => {
        const alloc = getAllocation(o.order_item_id);
        return (
          <div
            key={o.order_item_id}
            className="flex items-center gap-3 text-xs py-1 px-2 rounded bg-green-500/5 border border-green-500/10"
          >
            <span className="text-green-400 text-[10px]">✓</span>
            <span className="text-gray-400 w-18 font-mono">{o.order_number}</span>
            <span className="w-32 truncate text-gray-300">{o.customer_name}</span>
            <span className="w-20 text-gray-400">{o.format_label}</span>
            <span className="w-16 text-right text-gray-300">{o.quantity} units</span>
            <span className="w-16 text-right text-gray-400">{formatDate(o.requested_delivery_date)}</span>
            {urgencyDot(o.urgency)}
            <div className="ml-auto">
              <button
                onClick={() => alloc && onDeallocate(alloc.id)}
                disabled={allocating}
                className="p-1 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Remove allocation"
              >
                {allocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              </button>
            </div>
          </div>
        );
      })}

      {/* Unallocated orders */}
      {unallocatedOrders.map(o => (
        <div
          key={o.order_item_id}
          className="flex items-center gap-3 text-xs py-1 px-2 rounded hover:bg-white/[0.02]"
        >
          <span className="text-gray-600 text-[10px]">──</span>
          <span className="text-gray-500 w-18 font-mono">{o.order_number}</span>
          <span className="w-32 truncate text-gray-400">{o.customer_name}</span>
          <span className="w-20 text-gray-500">{o.format_label}</span>
          <span className="w-16 text-right text-gray-400">{o.quantity} units</span>
          <span className="w-16 text-right text-gray-500">{formatDate(o.requested_delivery_date)}</span>
          {urgencyDot(o.urgency)}
          <div className="ml-auto">
            <button
              onClick={() => onAllocate(o)}
              disabled={allocating}
              className="p-1 rounded hover:bg-blue-500/20 text-blue-400/60 hover:text-blue-400 transition-colors disabled:opacity-50"
              title="Allocate to this batch"
            >
              {allocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
