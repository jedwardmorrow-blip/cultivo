/**
 * UnscheduledPanel — both compact (sidebar tile) and expanded (primary
 * panel) variants are B Gapped. Each draggable order row carries a 2px
 * left --accent rule and a "drop on day to schedule" meta line.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { getRouteZone } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import { ZONE_HEX, ZONE_TOKEN } from '../constants';

interface UnscheduledRowProps {
  order: CalendarOrder;
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
  compact?: boolean;
}

function UnscheduledRow({ order, onDragStart, compact }: UnscheduledRowProps) {
  const zone = getRouteZone(order.customer_lat, order.customer_lon);
  const tokenName = ZONE_TOKEN[zone.id] || 'other';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      style={{
        padding: compact ? '8px 12px' : '10px 12px',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: 'inset 2px 0 0 var(--accent)',
        background: 'var(--op-canvas)',
      }}
    >
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <span
          className="font-sans truncate"
          style={{ fontSize: 12, color: 'var(--op-ink)' }}
        >
          {order.customer_name}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 11, color: 'var(--op-ink-2)' }}
        >
          {formatCurrency(order.total_amount)}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        <span
          className={`zone-dot ${tokenName}`}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ZONE_HEX[zone.id],
            display: 'inline-block',
          }}
        />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'var(--accent)',
          }}
        >
          {zone.label} · {order.item_count} line items · drop on day
        </span>
      </div>
    </div>
  );
}

// ─── Compact (sidebar tile) ───────────────────────────────────────────────

interface UnscheduledCompactProps {
  orders: CalendarOrder[];
  isActive: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
}

export function UnscheduledCompact({
  orders,
  isActive,
  onClick,
  onDragStart,
}: UnscheduledCompactProps) {
  const sorted = useMemo(
    () => [...orders].sort((a, b) => b.total_amount - a.total_amount),
    [orders],
  );
  const visible = sorted.slice(0, 3);
  const overflow = sorted.length - visible.length;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        boxShadow: isActive ? 'inset 2px 0 0 var(--accent)' : undefined,
      }}
    >
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '12px 14px 10px' }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink-3)' }}
        >
          Unscheduled
        </span>
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 10,
            color: orders.length > 0 ? 'var(--op-ink-2)' : 'var(--op-ink-3)',
          }}
        >
          {orders.length === 0 ? 'all scheduled' : `${orders.length} unrouted`}
        </span>
      </div>

      {visible.length === 0 ? (
        <div
          className="text-center"
          style={{
            padding: 14,
            fontSize: 11,
            color: 'var(--op-ink-3)',
            borderTop: '1px solid var(--op-line)',
          }}
        >
          All orders scheduled
        </div>
      ) : (
        visible.map((order, i) => {
          const isLast = i === visible.length - 1 && overflow <= 0;
          return (
            <div
              key={order.id}
              style={{
                borderTop: i === 0 ? '1px solid var(--op-line)' : undefined,
                borderBottom: isLast ? 'none' : '1px solid var(--op-line)',
              }}
            >
              <UnscheduledRow order={order} onDragStart={onDragStart} compact />
            </div>
          );
        })
      )}

      {overflow > 0 && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--op-line)',
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--op-ink-3)', letterSpacing: '0.04em' }}
          >
            and {overflow} more · drag to schedule
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Expanded (primary panel) ────────────────────────────────────────────

interface UnscheduledExpandedProps {
  orders: CalendarOrder[];
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
}

export function UnscheduledExpanded({ orders, onDragStart }: UnscheduledExpandedProps) {
  const sorted = useMemo(
    () => [...orders].sort((a, b) => b.total_amount - a.total_amount),
    [orders],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      style={{
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '14px 16px 10px' }}
      >
        <h3
          className="font-sans"
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--op-ink)', margin: 0 }}
        >
          Unscheduled orders
        </h3>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
        >
          {orders.length} order{orders.length !== 1 ? 's' : ''} · drag to calendar
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--op-line)' }}>
        {sorted.length === 0 ? (
          <div
            className="text-center"
            style={{ padding: 24, fontSize: 11, color: 'var(--op-ink-3)' }}
          >
            All orders scheduled
          </div>
        ) : (
          sorted.map((order, i) => (
            <div
              key={order.id}
              style={{
                borderBottom: i === sorted.length - 1 ? 'none' : '1px solid var(--op-line)',
              }}
            >
              <UnscheduledRow order={order} onDragStart={onDragStart} />
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
