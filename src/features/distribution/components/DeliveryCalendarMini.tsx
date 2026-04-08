import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import { GLASS, GLASS_HOVER, formatDateToLocal, isToday, getDaysInMonthInfo } from '../constants';

interface DeliveryCalendarMiniProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  ordersByDate: Map<string, CalendarOrder[]>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onClick?: () => void;
}

export function DeliveryCalendarMini({
  currentDate,
  onMonthChange,
  ordersByDate,
  selectedDate,
  onSelectDate,
  onClick,
}: DeliveryCalendarMiniProps) {
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonthInfo(currentDate);
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const days: Array<Date | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  return (
    <div className={`${GLASS} ${GLASS_HOVER} p-3 cursor-pointer`} onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onMonthChange(new Date(year, month - 1, 1)); }}
          className="p-0.5 rounded hover:bg-white/[0.08]"
        >
          <ChevronLeft className="w-3 h-3 text-white/40" />
        </button>
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">{monthLabel}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onMonthChange(new Date(year, month + 1, 1)); }}
          className="p-0.5 rounded hover:bg-white/[0.08]"
        >
          <ChevronRight className="w-3 h-3 text-white/40" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[8px] text-white/20 font-medium">{d}</div>
        ))}
      </div>

      {/* Mini grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="w-full aspect-square" />;
          const dateStr = formatDateToLocal(date);
          const hasOrders = (ordersByDate.get(dateStr) || []).length > 0;
          const isSel = selectedDate === dateStr;
          const isTod = isToday(date);

          return (
            <button
              key={dateStr}
              onClick={(e) => { e.stopPropagation(); onSelectDate(isSel ? null : dateStr); }}
              className={`w-full aspect-square flex items-center justify-center rounded text-[9px] transition-all
                ${isSel ? 'bg-white/[0.15] text-white font-bold' : isTod ? 'text-amber-400 font-bold' : 'text-white/40 hover:text-white/60'}
              `}
            >
              <div className="relative">
                {date.getDate()}
                {hasOrders && (
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSel ? 'bg-white' : 'bg-emerald-400/60'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
