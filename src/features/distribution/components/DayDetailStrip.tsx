import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Route, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDuration } from '@/features/delivery/services/routing.service';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import type { OrderReadiness, DriverAssignment } from '../constants';
import { GLASS, ZONE_HEX, ZONE_LABELS, fadeInVariants } from '../constants';
import { OrderReadinessCard } from './OrderReadinessCard';

interface DayDetailStripProps {
  date: string | null;
  orders: CalendarOrder[];
  readinessMap: Map<string, OrderReadiness>;
  driver: DriverAssignment | null;
  staffList: { id: string; display_name?: string; first_name?: string }[];
  onAssignDriver: (date: string, staffId: string) => void;
  onReload: () => void;
  highlightedOrderId?: string | null;
  // Doc filter mode
  docFilterMode?: boolean;
  docFilterOrders?: CalendarOrder[];
  // Trip plan
  onGenerateTripPlan?: () => void;
}

export function DayDetailStrip({
  date,
  orders,
  readinessMap,
  driver,
  staffList,
  onAssignDriver,
  onReload,
  highlightedOrderId,
  docFilterMode,
  docFilterOrders,
  onGenerateTripPlan,
}: DayDetailStripProps) {
  const displayOrders = docFilterMode ? (docFilterOrders || []) : orders;
  const isVisible = docFilterMode || (date && orders.length > 0);

  const dateLabel = useMemo(() => {
    if (docFilterMode) return 'Documents Needing Attention';
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [date, docFilterMode]);

  const totalRevenue = useMemo(() => displayOrders.reduce((s, o) => s + o.total_amount, 0), [displayOrders]);
  const totalDuration = useMemo(() => displayOrders.reduce((s, o) => s + (o.cached_duration_seconds || 0), 0), [displayOrders]);

  const zoneBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    displayOrders.forEach((o) => {
      const zid = getRouteZoneId(o.customer_lat, o.customer_lon);
      map.set(zid, (map.get(zid) || 0) + 1);
    });
    return Array.from(map.entries()).map(([zoneId, count]) => ({ zoneId, count }));
  }, [displayOrders]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">{dateLabel}</h3>
              <span className="text-[11px] text-white/30">
                {displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''}
              </span>
              {!docFilterMode && (
                <div className="flex items-center gap-1.5">
                  {zoneBreakdown.map((z) => (
                    <div key={z.zoneId} className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: ZONE_HEX[z.zoneId] || '#A6A6A6' }} />
                      <span className="text-[9px] text-white/30">{z.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!docFilterMode && totalDuration > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <Route className="w-3 h-3" />
                <span>~{formatDuration(totalDuration)}</span>
                <span className="text-white/20">·</span>
                <span className="font-semibold text-white/60">{formatCurrency(totalRevenue)}</span>
              </div>
            )}
          </div>

          {/* Order cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayOrders.map((order) => (
              <OrderReadinessCard
                key={order.id}
                order={order}
                readiness={readinessMap.get(order.id) || {
                  orderId: order.id,
                  itemsTotal: order.item_count,
                  itemsAllocated: 0,
                  invoiceSent: false,
                  coaSent: false,
                  manifestSent: false,
                  hasOverdueDoc: false,
                  allDocsSent: false,
                }}
                highlighted={highlightedOrderId === order.id}
                onSendDoc={onReload}
              />
            ))}
          </div>

          {/* Footer: Driver + Route actions */}
          {!docFilterMode && date && (
            <div className={`${GLASS} mt-3 p-3 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Driver</label>
                <select
                  value={driver?.staffId || ''}
                  onChange={(e) => {
                    if (e.target.value && date) onAssignDriver(date, e.target.value);
                  }}
                  className="px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.06] text-xs text-white focus:outline-none focus:border-white/[0.15] min-w-[140px]"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name || s.first_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-white/40">
                <span>{displayOrders.length} stops</span>
                {totalDuration > 0 && <span>~{formatDuration(totalDuration)}</span>}
                <span className="font-semibold text-white/60">{formatCurrency(totalRevenue)}</span>
                {onGenerateTripPlan && (
                  <button
                    onClick={onGenerateTripPlan}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[10px] font-bold text-white/60 uppercase tracking-wider hover:bg-white/[0.10] hover:border-white/[0.15] transition-all"
                  >
                    <FileText className="w-3 h-3" />
                    Trip Plan
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
