import { X, GripVertical, MapPin, Calendar, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getRouteZone, getAllZones, type RouteZone } from '../utils';
import type { CalendarOrder } from '../services/delivery.service';
import { OrderItemsExpander } from './OrderItemsExpander';

interface UnscheduledOrdersPanelProps {
  orders: CalendarOrder[];
  onClose: () => void;
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
  onSelectOrder?: (orderId: string) => void;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function groupByZone(orders: CalendarOrder[]): Map<string, CalendarOrder[]> {
  const groups = new Map<string, CalendarOrder[]>();
  for (const order of orders) {
    const zone = getRouteZone(order.customer_lat, order.customer_lon);
    const existing = groups.get(zone.id) || [];
    existing.push(order);
    groups.set(zone.id, existing);
  }
  return groups;
}

export function UnscheduledOrdersPanel({ orders, onClose, onDragStart, onSelectOrder }: UnscheduledOrdersPanelProps) {
  const grouped = groupByZone(orders);
  const zones = getAllZones();
  const activeZones = zones.filter(z => grouped.has(z.id));

  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-cult-black border-l border-cult-surface-raised z-50 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cult-surface-raised bg-cult-surface">
          <div>
            <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">
              Unscheduled Orders
            </h3>
            <p className="text-xs text-cult-text-muted mt-0.5">
              {orders.length} orders &middot; {formatCurrency(totalValue)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-cult-text-muted hover:text-cult-text-primary transition-colors rounded-cult hover:bg-cult-surface-raised"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 px-4 py-2 border-b border-cult-surface-raised/50 bg-cult-surface">
          {activeZones.map(zone => {
            const count = grouped.get(zone.id)?.length || 0;
            return (
              <div key={zone.id} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${zone.dotColor}`} />
                <span className="text-xs text-cult-text-muted">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <Package className="w-10 h-10 text-cult-border mb-3" />
              <p className="text-sm text-cult-text-muted text-center">
                All orders have delivery dates assigned
              </p>
            </div>
          ) : (
            <div className="py-2">
              {activeZones.map(zone => {
                const zoneOrders = grouped.get(zone.id) || [];
                return (
                  <div key={zone.id} className="mb-1">
                    <div className={`flex items-center gap-2 px-4 py-1.5 ${zone.bgColor}`}>
                      <div className={`w-2 h-2 rounded-full ${zone.dotColor}`} />
                      <span className={`text-xs font-medium uppercase tracking-wider ${zone.color}`}>
                        {zone.label}
                      </span>
                      <span className="text-xs text-cult-text-muted">({zoneOrders.length})</span>
                    </div>
                    <div className="space-y-0.5 px-2 py-1">
                      {zoneOrders.map(order => (
                        <OrderCard key={order.id} order={order} zone={zone} onDragStart={onDragStart} onSelectOrder={onSelectOrder} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-cult-surface-raised bg-cult-surface">
          <p className="text-xs text-cult-text-muted text-center">
            Drag orders onto calendar days to schedule
          </p>
        </div>
      </div>
    </>
  );
}

function OrderCard({
  order,
  zone,
  onDragStart,
  onSelectOrder,
}: {
  order: CalendarOrder;
  zone: RouteZone;
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
  onSelectOrder?: (orderId: string) => void;
}) {
  const prefDay = order.preferred_delivery_day
    ? DAY_LABELS[order.preferred_delivery_day.toLowerCase()] || order.preferred_delivery_day
    : null;

  return (
    <div className="rounded-cult bg-cult-surface border border-cult-surface-raised hover:border-cult-border transition-colors">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, order)}
        className="flex items-center gap-2 px-2 py-2 cursor-move group"
      >
        <GripVertical className="w-3.5 h-3.5 text-cult-border group-hover:text-cult-text-muted flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${zone.dotColor} flex-shrink-0`} />
            <span className="text-sm text-cult-text-primary truncate font-medium">
              {order.customer_name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-cult-text-muted">{order.order_number}</span>
            <span className="text-xs text-cult-text-muted">&middot;</span>
            <span className="text-xs text-cult-text-muted font-medium">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {order.customer_city && (
              <span className="flex items-center gap-0.5 text-xs text-cult-text-muted">
                <MapPin className="w-2.5 h-2.5" />
                {order.customer_city}
              </span>
            )}
            {prefDay && (
              <span className="flex items-center gap-0.5 text-xs text-cult-text-muted">
                <Calendar className="w-2.5 h-2.5" />
                Pref: {prefDay}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="px-2 pb-1.5">
        <OrderItemsExpander orderId={order.id} onSelectOrder={onSelectOrder} />
      </div>
    </div>
  );
}
