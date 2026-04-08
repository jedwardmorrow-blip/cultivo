import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRouteZone, getRouteZoneId } from '@/features/delivery/utils';
import { formatWeight, formatCurrencyShort } from '@/shared/utils/format';
import { formatDuration } from '@/features/delivery/services/routing.service';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import {
  GLASS,
  GLASS_ELEVATED,
  GLASS_HOVER,
  ZONE_HEX,
  fadeInVariants,
  formatDateToLocal,
  isToday,
  getDaysInMonthInfo,
} from '../constants';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DeliveryCalendarGridProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  ordersByDate: Map<string, CalendarOrder[]>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onQuickDispatch: () => void;
  // Drag support
  draggedOrder: CalendarOrder | null;
  dragOverDate: string | null;
  suggestedDates: Set<string>;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  // Optional dim for filter mode
  dimmed?: boolean;
  // Driver info
  getDriverName?: (date: string) => string | null;
}

// ─── Day Cell ──────────────────────────────────────────────────────────────

function DayCell({
  date,
  orders,
  isSelected,
  isTodayDate,
  isDragOver,
  isSuggested,
  driverName,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  date: Date;
  orders: CalendarOrder[];
  isSelected: boolean;
  isTodayDate: boolean;
  isDragOver: boolean;
  isSuggested: boolean;
  driverName: string | null;
  onSelect: () => void;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
}) {
  const zones = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      const zoneId = getRouteZoneId(o.customer_lat, o.customer_lon);
      if (!map.has(zoneId)) map.set(zoneId, ZONE_HEX[zoneId] || '#A6A6A6');
    }
    return map;
  }, [orders]);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.total_amount, 0), [orders]);
  const totalDuration = useMemo(() => orders.reduce((s, o) => s + (o.cached_duration_seconds || 0), 0), [orders]);

  // Zone-tinted left border
  const leftBorderColor = zones.size === 1 ? [...zones.values()][0] : undefined;

  return (
    <div
      onDragOver={(e) => onDragOver(e, date)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date)}
      onClick={orders.length > 0 ? onSelect : undefined}
      className={`aspect-square p-1.5 flex flex-col transition-all duration-200 rounded-xl
        ${orders.length > 0 ? 'cursor-pointer' : ''}
        ${isSelected
          ? 'bg-white/[0.09] border border-white/[0.20] shadow-[0_0_16px_rgba(232,224,212,0.1)]'
          : isDragOver
          ? 'bg-emerald-500/10 border border-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.2)] scale-[1.03]'
          : isSuggested
          ? 'bg-emerald-500/5 border border-emerald-400/30 animate-pulse'
          : isTodayDate
          ? 'bg-amber-500/[0.06] border border-amber-400/30'
          : 'border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
        }`}
      style={leftBorderColor && !isSelected ? { borderLeftColor: leftBorderColor, borderLeftWidth: '2px' } : undefined}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-xs font-medium ${isTodayDate ? 'text-amber-400 font-bold' : isSelected ? 'text-white' : 'text-white/70'}`}>
          {date.getDate()}
        </span>
      </div>

      {orders.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-0.5">
            {[...zones.values()].slice(0, 4).map((color, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            ))}
            <span className="text-[9px] text-white/30 ml-0.5">
              {zones.size}r
            </span>
          </div>
          <div className="text-[11px] text-white font-semibold leading-tight tabular-nums">
            {formatCurrencyShort(totalRevenue)}
          </div>
          <div className="text-[9px] text-white/30">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <div className="mt-auto pt-0.5 flex items-center justify-between gap-1">
          {totalDuration > 0 && (
            <span className="text-[9px] text-white/25 truncate">~{formatDuration(totalDuration)}</span>
          )}
          {driverName && (
            <span className="text-[9px] text-white/30 truncate">{driverName}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function DeliveryCalendarGrid({
  currentDate,
  onMonthChange,
  ordersByDate,
  selectedDate,
  onSelectDate,
  onQuickDispatch,
  draggedOrder,
  dragOverDate,
  suggestedDates,
  onDragOver,
  onDragLeave,
  onDrop,
  dimmed,
  getDriverName,
}: DeliveryCalendarGridProps) {
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonthInfo(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days: Array<Date | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  return (
    <motion.div
      initial={fadeInVariants.initial}
      animate={fadeInVariants.animate}
      exit={fadeInVariants.exit}
      transition={fadeInVariants.transition}
      className={`${GLASS} p-4 h-full flex flex-col ${dimmed ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onMonthChange(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white/50" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{monthName}</h2>
          <button
            onClick={onQuickDispatch}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl
              bg-[#E8E0D4]/10 text-[#E8E0D4] border border-[#E8E0D4]/20
              hover:bg-[#E8E0D4]/15 hover:border-[#E8E0D4]/30 transition-all`}
          >
            <Zap className="w-3 h-3" />
            Quick Dispatch
          </button>
        </div>

        <button
          onClick={() => onMonthChange(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-white/25 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const dateStr = formatDateToLocal(date);
          const dayOrders = ordersByDate.get(dateStr) || [];

          return (
            <DayCell
              key={dateStr}
              date={date}
              orders={dayOrders}
              isSelected={selectedDate === dateStr}
              isTodayDate={isToday(date)}
              isDragOver={dragOverDate === dateStr}
              isSuggested={suggestedDates.has(dateStr)}
              driverName={getDriverName?.(dateStr) || null}
              onSelect={() => onSelectDate(selectedDate === dateStr ? null : dateStr)}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
