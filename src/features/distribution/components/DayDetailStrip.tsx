/**
 * DayDetailStrip — B Gapped card list below the bento. Three columns
 * on desktop (1.4fr 1fr 1fr in the mockup; we render auto-fit grid). Each
 * card is an OrderReadinessCard. The first card (or highlighted card)
 * auto-expands; the rest collapse.
 *
 * Header: "Today · weekday · N orders" or "Filtered · N orders with
 * overdue documents" when docFilterMode is active. Filter tag chip in
 * --status-bad signals the active filter; click chip to clear (handled
 * by parent OverdueChip).
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { formatDuration } from '@/features/delivery/services/routing.service';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import type { DeliveryDriver } from '@/types';
import type { OrderReadiness, DriverAssignment } from '../constants';
import { ZONE_HEX } from '../constants';
import { OrderReadinessCard } from './OrderReadinessCard';

interface DayDetailStripProps {
  date: string | null;
  orders: CalendarOrder[];
  readinessMap: Map<string, OrderReadiness>;
  driversForDate: DriverAssignment[];
  driverList: DeliveryDriver[];
  onAssignDriver: (date: string, staffId: string, zoneId: string) => void;
  onReload: () => void;
  highlightedOrderId?: string | null;
  docFilterMode?: boolean;
  docFilterOrders?: CalendarOrder[];
}

export function DayDetailStrip({
  date,
  orders,
  readinessMap,
  onReload,
  highlightedOrderId,
  docFilterMode,
  docFilterOrders,
}: DayDetailStripProps) {
  const displayOrders = docFilterMode ? (docFilterOrders || []) : orders;
  const isVisible = docFilterMode || (date && orders.length > 0);

  const dateLabel = useMemo(() => {
    if (docFilterMode) return `Filtered · ${displayOrders.length} order${displayOrders.length !== 1 ? 's' : ''} with overdue documents`;
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    const wk = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `Today · ${wk} · ${displayOrders.length} order${displayOrders.length !== 1 ? 's' : ''}`;
  }, [date, docFilterMode, displayOrders.length]);

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
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginTop: 16 }}
        >
          {/* Strip head */}
          <div
            className="flex items-baseline justify-between"
            style={{ marginBottom: 8 }}
          >
            <h2
              className="font-sans"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: docFilterMode ? 'var(--op-ink)' : 'var(--op-ink)',
                margin: 0,
                letterSpacing: '-0.005em',
              }}
            >
              {dateLabel}
            </h2>

            <div className="flex items-center" style={{ gap: 12 }}>
              {!docFilterMode && (
                <div className="flex items-center" style={{ gap: 8 }}>
                  {zoneBreakdown.map((z) => (
                    <span key={z.zoneId} className="flex items-center" style={{ gap: 4 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: ZONE_HEX[z.zoneId],
                          display: 'inline-block',
                        }}
                      />
                      <span
                        className="font-mono tabular-nums"
                        style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
                      >
                        {z.count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {!docFilterMode && totalDuration > 0 && (
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
                >
                  ~{formatDuration(totalDuration)} · {formatCurrency(totalRevenue)}
                </span>
              )}
              {docFilterMode && (
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: 'var(--status-bad)',
                    padding: '3px 8px',
                    border: '1px solid var(--status-bad)',
                    borderRadius: 'var(--r-xs)',
                    background: 'var(--op-canvas)',
                  }}
                >
                  Overdue chip filter active
                </span>
              )}
            </div>
          </div>

          {/* B Gapped card list */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 12,
            }}
          >
            {displayOrders.map((order) => (
              <OrderReadinessCard
                key={order.id}
                order={order}
                readiness={
                  readinessMap.get(order.id) || {
                    orderId: order.id,
                    itemsTotal: order.item_count,
                    itemsAllocated: 0,
                    invoiceSent: false,
                    coaSent: false,
                    manifestSent: false,
                    hasOverdueDoc: false,
                    allDocsSent: false,
                  }
                }
                highlighted={highlightedOrderId === order.id}
                onSendDoc={onReload}
              />
            ))}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
