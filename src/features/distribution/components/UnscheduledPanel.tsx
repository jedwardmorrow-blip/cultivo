import { useMemo } from 'react';
import { CalendarOff, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { getRouteZone } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import { GLASS, GLASS_HOVER, GLASS_ELEVATED, ZONE_HEX, fadeInVariants } from '../constants';

// ─── Compact (sidebar) ────────────────────────────────────────────────────

interface UnscheduledCompactProps {
  orders: CalendarOrder[];
  isActive: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
}

export function UnscheduledCompact({ orders, isActive, onClick, onDragStart }: UnscheduledCompactProps) {
  const topOrders = useMemo(
    () => [...orders].sort((a, b) => b.total_amount - a.total_amount).slice(0, 3),
    [orders],
  );

  return (
    <div
      onClick={onClick}
      className={`${isActive ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} p-3 cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-3.5 h-3.5 text-amber-400/60" />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Unscheduled</span>
        </div>
        <span className={`text-sm font-bold ${orders.length > 0 ? 'text-amber-400' : 'text-white/30'}`}>
          {orders.length}
        </span>
      </div>

      {topOrders.length > 0 ? (
        <div className="space-y-1.5">
          {topOrders.map((order) => {
            const zone = getRouteZone(order.customer_lat, order.customer_lon);
            return (
              <div
                key={order.id}
                draggable
                onDragStart={(e) => onDragStart(e, order)}
                className="flex items-center justify-between text-[11px] cursor-grab active:cursor-grabbing hover:bg-white/[0.04] rounded-lg px-1.5 py-1 -mx-1.5 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical className="w-3 h-3 text-white/15 flex-shrink-0" />
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ZONE_HEX[zone.id] || '#A6A6A6' }} />
                  <span className="text-white/60 truncate">{order.customer_name}</span>
                </div>
                <span className="text-white/30 font-medium flex-shrink-0 ml-2">{formatCurrency(order.total_amount)}</span>
              </div>
            );
          })}
          {orders.length > 3 && (
            <div className="text-[10px] text-white/20 text-center pt-0.5">
              +{orders.length - 3} more · Drag to schedule
            </div>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-white/20 text-center py-2">All orders scheduled</div>
      )}
    </div>
  );
}

// ─── Expanded (main panel) ─────────────────────────────────────────────────

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
      initial={fadeInVariants.initial}
      animate={fadeInVariants.animate}
      exit={fadeInVariants.exit}
      transition={fadeInVariants.transition}
      className={`${GLASS_ELEVATED} p-4 h-full flex flex-col`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Unscheduled Orders</h3>
        <span className="text-[11px] text-white/30">{orders.length} orders · Drag to calendar</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {sorted.map((order) => {
          const zone = getRouteZone(order.customer_lat, order.customer_lon);
          return (
            <div
              key={order.id}
              draggable
              onDragStart={(e) => onDragStart(e, order)}
              className={`${GLASS} p-3 cursor-grab active:cursor-grabbing hover:bg-white/[0.08] transition-colors`}
              style={{ borderLeftWidth: '3px', borderLeftColor: ZONE_HEX[zone.id] || '#A6A6A6' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white truncate">{order.customer_name}</div>
                    <div className="text-[10px] text-white/30">{zone.label} · {order.order_number}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-xs font-semibold text-white">{formatCurrency(order.total_amount)}</div>
                  <div className="text-[10px] text-white/30">{order.item_count} items</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
