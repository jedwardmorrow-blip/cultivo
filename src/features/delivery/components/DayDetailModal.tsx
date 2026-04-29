import { X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getRouteZone, getAllZones, getApproxMiles } from '../utils';
import { formatDuration } from '../services/routing.service';
import type { CalendarOrder } from '../services/delivery.service';
import { OrderItemsExpander } from './OrderItemsExpander';

interface DayDetailModalProps {
  date: Date;
  orders: CalendarOrder[];
  onClose: () => void;
  onSelectOrder?: (orderId: string) => void;
}

const READY_STATUSES = new Set(['ready_for_delivery', 'completed']);
const IN_PROGRESS_STATUSES = new Set(['processing', 'accepted']);

function ReadinessBadge({ status }: { status: string }) {
  if (READY_STATUSES.has(status)) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-cult-success/15 text-cult-success border border-cult-success rounded-sm">
        <CheckCircle2 className="w-3 h-3" />
        Ready
      </span>
    );
  }
  if (IN_PROGRESS_STATUSES.has(status)) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-cult-warning/15 text-cult-warning border border-cult-warning rounded-sm">
        <Clock className="w-3 h-3" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-cult-danger/15 text-cult-danger border border-cult-danger rounded-sm">
      <AlertTriangle className="w-3 h-3" />
      Needs Work
    </span>
  );
}

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

export function DayDetailModal({ date, orders, onClose, onSelectOrder }: DayDetailModalProps) {
  const grouped = groupByZone(orders);
  const zones = getAllZones();
  const activeZones = zones.filter(z => grouped.has(z.id));

  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const readyCount = orders.filter(o => READY_STATUSES.has(o.status)).length;
  const totalDuration = orders.reduce((sum, o) => sum + (o.cached_duration_seconds || 0), 0);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-cult-surface border-2 border-cult-text-muted max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b-2 border-cult-border bg-cult-black">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-cult-text-primary uppercase tracking-wide">
                {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-cult-text-muted">
                  {orders.length} order{orders.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-cult-text-muted">
                  {activeZones.length} zone{activeZones.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-cult-text-muted">
                  {readyCount}/{orders.length} ready
                </span>
                {totalDuration > 0 && (
                  <span className="text-xs text-cult-text-muted">
                    ~{formatDuration(totalDuration)} est. drive
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-cult-text-muted hover:text-cult-text-primary transition-colors rounded-cult hover:bg-cult-surface-raised"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-160px)]">
          {activeZones.map(zone => {
            const zoneOrders = grouped.get(zone.id) || [];
            const zoneValue = zoneOrders.reduce((sum, o) => sum + o.total_amount, 0);
            return (
              <div key={zone.id}>
                <div className={`flex items-center justify-between px-5 py-2 ${zone.bgColor} border-b border-cult-surface-raised/50`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${zone.dotColor}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${zone.color}`}>
                      {zone.label}
                    </span>
                    <span className="text-xs text-cult-text-muted">
                      ({zoneOrders.length})
                    </span>
                  </div>
                  <span className="text-xs text-cult-text-muted font-medium">
                    {formatCurrency(zoneValue)}
                  </span>
                </div>

                <div className="divide-y divide-cult-surface-raised/50">
                  {zoneOrders.map(order => {
                    const miles = getApproxMiles(order.customer_lat, order.customer_lon);
                    return (
                      <div key={order.id} className="hover:bg-cult-black/50 transition-colors">
                        <div className="flex items-center px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-cult-text-primary">
                              {order.customer_name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-cult-text-muted">{order.order_number}</span>
                              {miles !== null && (
                                <>
                                  <span className="text-xs text-cult-border">&middot;</span>
                                  <span className="text-xs text-cult-text-muted">{miles} mi</span>
                                </>
                              )}
                              {order.cached_duration_seconds && order.cached_duration_seconds > 0 && (
                                <>
                                  <span className="text-xs text-cult-border">&middot;</span>
                                  <span className="text-xs text-cult-text-muted">
                                    {formatDuration(order.cached_duration_seconds)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <ReadinessBadge status={order.status} />
                            <span className="text-sm font-semibold text-cult-text-primary">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>
                        </div>
                        <div className="px-5 pb-2">
                          <OrderItemsExpander orderId={order.id} onSelectOrder={onSelectOrder} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t-2 border-cult-border bg-cult-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeZones.map(zone => (
                <div key={zone.id} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${zone.dotColor}`} />
                  <span className="text-xs text-cult-text-muted">{zone.label}</span>
                </div>
              ))}
            </div>
            <div className="text-base font-semibold text-cult-text-primary">
              Total: <span className="text-cult-success">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
