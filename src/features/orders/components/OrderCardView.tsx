import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getStatusColor } from '../utils/orderGrouping';
import { OrderCard } from './OrderCard';
import type { Order } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderCardViewProps {
  orders: Order[];
  selectedOrderId: string | null;
  selectedIds: Set<string>;
  onSelectOrder: (orderId: string) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onToggleSelectAll: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

interface StatusLane {
  status: string;
  label: string;
  orders: Order[];
  totalAmount: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_ORDER = ['submitted', 'accepted', 'processing', 'ready_for_delivery', 'completed', 'cancelled'];

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── Lane Header ────────────────────────────────────────────────────────────

function LaneHeader({
  lane,
  isExpanded,
  onToggle,
}: {
  lane: StatusLane;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColors = getStatusColor(lane.status);

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-cult-surface-raised border border-cult-border rounded-cult hover:border-cult-border-strong transition-all group"
    >
      <div className="text-cult-text-muted">
        {isExpanded
          ? <ChevronDown className="w-4 h-4" />
          : <ChevronRight className="w-4 h-4" />
        }
      </div>

      <span className={`inline-block px-2.5 py-1 text-xs font-bold border rounded-cult uppercase tracking-wider select-none ${statusColors}`}>
        {lane.label}
      </span>

      <span className="text-xs text-cult-text-secondary font-semibold">
        {lane.orders.length} {lane.orders.length === 1 ? 'order' : 'orders'}
      </span>

      <span className="text-xs text-cult-success font-semibold ml-auto">
        {formatCurrency(lane.totalAmount)}
      </span>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OrderCardView({
  orders,
  selectedOrderId,
  selectedIds,
  onSelectOrder,
  onSelectionChange,
  onStatusChange,
}: OrderCardViewProps) {
  // Default: expand non-terminal statuses
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(
    () => new Set(['completed', 'cancelled'])
  );

  const toggleLane = useCallback((status: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  // Group orders into lanes
  const lanes: StatusLane[] = useMemo(() => {
    const grouped = new Map<string, Order[]>();

    orders.forEach(order => {
      const status = order.status || 'submitted';
      if (!grouped.has(status)) {
        grouped.set(status, []);
      }
      grouped.get(status)!.push(order);
    });

    return STATUS_ORDER
      .filter(status => grouped.has(status))
      .map(status => {
        const laneOrders = grouped.get(status)!;
        // Sort within lane: newest first
        laneOrders.sort((a, b) => {
          const dateA = a.created_at || '';
          const dateB = b.created_at || '';
          return dateB.localeCompare(dateA);
        });

        return {
          status,
          label: STATUS_LABELS[status] || status,
          orders: laneOrders,
          totalAmount: laneOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        };
      });
  }, [orders]);

  const handleCheck = useCallback((orderId: string, shiftKey: boolean) => {
    const next = new Set(selectedIds);
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <Package className="w-12 h-12 text-cult-border mx-auto mb-3" />
        <p className="text-cult-text-secondary text-sm">No orders match your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lanes.map(lane => (
        <div key={lane.status}>
          <LaneHeader
            lane={lane}
            isExpanded={!collapsedLanes.has(lane.status)}
            onToggle={() => toggleLane(lane.status)}
          />

          {!collapsedLanes.has(lane.status) && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 pl-4">
              {lane.orders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderId === order.id}
                  isChecked={selectedIds.has(order.id)}
                  onSelect={onSelectOrder}
                  onCheck={handleCheck}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
