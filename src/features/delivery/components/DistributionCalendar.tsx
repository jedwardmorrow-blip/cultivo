import { useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Truck, Package, CalendarPlus, AlertTriangle, Weight, Send } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getEnrichedCalendarOrders, updateOrderDeliveryDate as updateDeliveryDate, type CalendarOrder } from '../services/delivery.service';
import { formatDuration } from '../services/routing.service';
import { getRouteZone, getRouteZoneId, getOrderStatusStyle, isOrderReadyStatus } from '../utils';
import { supabase } from '@/lib/supabase';
import { UnscheduledOrdersPanel } from './UnscheduledOrdersPanel';
import { RouteManifestPanel } from './RouteManifestPanel';
import { OrderItemsExpander } from './OrderItemsExpander';
import { formatWeight, formatCurrencyShort } from '@/shared/utils/format';
import { DocumentDispatchQueue } from './DocumentDispatchQueue';
import { getDispatchQueue } from '../services/dispatch.service';
import { TripPlanListView } from './TripPlanListView';

type DistributionTab = 'calendar' | 'documents' | 'trip-plans';


function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayOfWeek(date: Date): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
}

interface DistributionCalendarProps {
  onSelectOrder?: (orderId: string) => void;
}

export function DistributionCalendar({ onSelectOrder }: DistributionCalendarProps) {
  const [activeTab, setActiveTab] = useState<DistributionTab>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allOrders, setAllOrders] = useState<CalendarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrder, setDraggedOrder] = useState<CalendarOrder | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showPlanPanel, setShowPlanPanel] = useState(false);
  const [overdueDocOrderIds, setOverdueDocOrderIds] = useState<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data }, { data: dispatchRows }] = await Promise.all([
        getEnrichedCalendarOrders(false),
        getDispatchQueue(),
      ]);
      setAllOrders(data);
      // Build overdue set for "Docs" badge rendering in calendar rows
      const overdue = new Set<string>();
      (dispatchRows || []).forEach(row => {
        const checks = [
          { leadTime: row.invoice_lead_time_hours, send: row.invoice_send },
          { leadTime: 24, send: row.coa_send },
          { leadTime: 24, send: row.manifest_send },
        ];
        if (!row.delivery_date) return;
        const isOverdue = checks.some(({ leadTime, send }) => {
          if (send) return false;
          const deadlineMs = new Date(row.delivery_date! + 'T00:00:00').getTime() - leadTime * 60 * 60 * 1000;
          return deadlineMs < Date.now();
        });
        if (isOverdue) overdue.add(row.order_id);
      });
      setOverdueDocOrderIds(overdue);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('calendar-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { loadOrders(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  const startOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const endOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

  const scheduledOrders = useMemo(() =>
    allOrders.filter(o => {
      if (!o.requested_delivery_date) return false;
      const d = new Date(o.requested_delivery_date + 'T00:00:00');
      return d >= startOfMonth && d <= endOfMonth;
    }),
    [allOrders, startOfMonth, endOfMonth]
  );

  const unscheduledOrders = useMemo(() =>
    allOrders.filter(o => !o.requested_delivery_date),
    [allOrders]
  );

  const ordersByDate = useMemo(() => {
    const map = new Map<string, CalendarOrder[]>();
    for (const order of scheduledOrders) {
      if (!order.requested_delivery_date) continue;
      const existing = map.get(order.requested_delivery_date) || [];
      existing.push(order);
      map.set(order.requested_delivery_date, existing);
    }
    return map;
  }, [scheduledOrders]);

  const needsPrepCount = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return allOrders.filter(o => {
      if (!o.requested_delivery_date) return false;
      const d = new Date(o.requested_delivery_date + 'T00:00:00');
      return d >= now && d <= weekFromNow && !isOrderReadyStatus(o.status);
    }).length;
  }, [allOrders]);

  const suggestedDates = useMemo(() => {
    if (!draggedOrder) return new Set<string>();
    const suggestions = new Set<string>();
    const draggedZoneId = getRouteZoneId(draggedOrder.customer_lat, draggedOrder.customer_lon);

    const { daysInMonth: dim, startingDayOfWeek: sdow, year: y, month: m } = getDaysInMonthInfo(currentDate);
    const scored: Array<{ dateStr: string; score: number }> = [];

    for (let i = 1; i <= dim; i++) {
      const d = new Date(y, m, i);
      if (d < new Date(new Date().setHours(0, 0, 0, 0))) continue;
      const dateStr = formatDateToLocal(d);
      const dayOrders = ordersByDate.get(dateStr) || [];
      let score = 0;

      const dayZoneIds = new Set(dayOrders.map(o => getRouteZoneId(o.customer_lat, o.customer_lon)));
      if (dayZoneIds.has(draggedZoneId) && dayOrders.length > 0) score += 3;

      if (draggedOrder.preferred_delivery_day) {
        const dow = getDayOfWeek(d);
        if (dow === draggedOrder.preferred_delivery_day.toLowerCase()) score += 2;
      }

      if (dayOrders.length === 0) score += 1;
      else if (dayOrders.length <= 3) score += 0.5;

      if (score >= 2) scored.push({ dateStr, score });
    }

    scored.sort((a, b) => b.score - a.score);
    scored.slice(0, 3).forEach(s => suggestions.add(s.dateStr));
    return suggestions;
  }, [draggedOrder, currentDate, ordersByDate]);

  async function handleUpdateDeliveryDate(orderId: string, newDate: string) {
    await updateDeliveryDate(orderId, newDate);
    await loadOrders();
  }

  function handleDragStart(e: React.DragEvent, order: CalendarOrder) {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
  }

  function handleDragOver(e: React.DragEvent, date: Date) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(formatDateToLocal(date));
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
    if (draggedOrder) {
      handleUpdateDeliveryDate(draggedOrder.id, formatDateToLocal(date));
      setDraggedOrder(null);
    }
  }

  function handleDragEnd() {
    setDraggedOrder(null);
    setDragOverDate(null);
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonthInfo(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days: Array<Date | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const totalRevenue = scheduledOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalWeight = scheduledOrders.reduce((sum, o) => sum + o.demand_g, 0);

  return (
    <div onDragEnd={handleDragEnd}>
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-cult-white">Distribution</h1>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-cult-medium-gray">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
            activeTab === 'calendar'
              ? 'border-cult-white text-cult-white'
              : 'border-transparent text-cult-light-gray hover:text-cult-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
            activeTab === 'documents'
              ? 'border-cult-white text-cult-white'
              : 'border-transparent text-cult-light-gray hover:text-cult-white'
          }`}
        >
          <Send className="w-4 h-4" />
          Documents
        </button>
        <button
          onClick={() => setActiveTab('trip-plans')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
            activeTab === 'trip-plans'
              ? 'border-cult-white text-cult-white'
              : 'border-transparent text-cult-light-gray hover:text-cult-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Trip Plans
        </button>
      </div>

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <DocumentDispatchQueue />
      )}

      {/* Trip Plans tab */}
      {activeTab === 'trip-plans' && (
        <TripPlanListView />
      )}

      {/* Calendar tab (wrapped so calendar state is preserved) */}
      <div className={activeTab === 'calendar' ? '' : 'hidden'}>
      <div className="mb-6">
        <p className="text-cult-light-gray">Plan and manage delivery schedules — drag orders to reschedule</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Orders"
          value={String(scheduledOrders.length)}
          borderColor="border-cult-light-gray"
          valueColor="text-cult-white"
        />
        <StatCard
          label="Scheduled"
          value={String(scheduledOrders.length)}
          borderColor="border-cult-success"
          valueColor="text-cult-success"
        />
        <StatCard
          label="Total Weight"
          value={formatWeight(totalWeight)}
          borderColor="border-purple-600"
          valueColor="text-purple-400"
          icon={<Weight className="w-4 h-4 text-purple-400" />}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          borderColor="border-cult-light-gray"
          valueColor="text-cult-white"
        />
        <StatCard
          label="Needs Prep (7d)"
          value={String(needsPrepCount)}
          borderColor={needsPrepCount > 0 ? 'border-cult-warning' : 'border-cult-light-gray'}
          valueColor={needsPrepCount > 0 ? 'text-cult-warning' : 'text-cult-white'}
          icon={needsPrepCount > 0 ? <AlertTriangle className="w-4 h-4 text-cult-warning" /> : undefined}
        />
      </div>

      <div className="bg-cult-near-black border-2 border-cult-medium-gray overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b-2 border-cult-medium-gray bg-cult-black">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-cult-medium-gray transition-colors">
            <ChevronLeft className="w-5 h-5 text-cult-light-gray" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">{monthName}</h2>
            <button
              onClick={() => setShowPlanPanel(!showPlanPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-cult transition-all ${
                showPlanPanel
                  ? 'bg-cult-success/15 text-cult-success border border-cult-success'
                  : 'bg-cult-charcoal text-cult-light-gray border border-cult-medium-gray hover:border-cult-light-gray hover:text-cult-white'
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Plan
              {unscheduledOrders.length > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full ${
                  showPlanPanel ? 'bg-cult-success text-white' : 'bg-cult-medium-gray text-cult-white'
                }`}>
                  {unscheduledOrders.length}
                </span>
              )}
            </button>
          </div>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-cult-medium-gray transition-colors">
            <ChevronRight className="w-5 h-5 text-cult-light-gray" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-cult-light-gray">Loading calendar...</div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-cult-light-gray py-2 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {days.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

                const dateStr = formatDateToLocal(date);
                const dayOrders = ordersByDate.get(dateStr) || [];
                const isCurrentDay = isToday(date);
                const isDragOver = dragOverDate === dateStr;
                const isSuggested = suggestedDates.has(dateStr);

                return (
                  <DayCell
                    key={date.toISOString()}
                    date={date}
                    orders={dayOrders}
                    isToday={isCurrentDay}
                    isDragOver={isDragOver}
                    isSuggested={isSuggested}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (dayOrders.length > 0) {
                        setSelectedDate(date);
                        setShowPanel(true);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <UpcomingDeliveriesTable
        orders={scheduledOrders}
        onDragStart={handleDragStart}
        onSelectOrder={onSelectOrder}
        overdueDocOrderIds={overdueDocOrderIds}
        onShowDocuments={() => setActiveTab('documents')}
      />

      {showPlanPanel && (
        <UnscheduledOrdersPanel
          orders={unscheduledOrders}
          onClose={() => setShowPlanPanel(false)}
          onDragStart={handleDragStart}
          onSelectOrder={onSelectOrder}
        />
      )}

      {showPanel && selectedDate && (
        <RouteManifestPanel
          date={selectedDate}
          orders={ordersByDate.get(formatDateToLocal(selectedDate)) || []}
          onClose={() => { setShowPanel(false); setSelectedDate(null); }}
          onSelectOrder={onSelectOrder}
        />
      )}
      </div>{/* end calendar tab wrapper */}
    </div>
  );
}

function StatCard({
  label, value, borderColor, valueColor, icon,
}: {
  label: string;
  value: string;
  borderColor: string;
  valueColor: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`bg-cult-near-black border-2 ${borderColor} p-5 transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-cult-light-gray uppercase tracking-wider">{label}</div>
        {icon}
      </div>
      <div className={`text-3xl font-bold ${valueColor} mt-2`}>{value}</div>
    </div>
  );
}

function DayCell({
  date, orders, isToday: isTodayDate, isDragOver, isSuggested,
  onDragOver, onDragLeave, onDrop, onClick,
}: {
  date: Date;
  orders: CalendarOrder[];
  isToday: boolean;
  isDragOver: boolean;
  isSuggested: boolean;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onClick: () => void;
}) {
  // Route count = distinct zones with orders on this day (CUL-331 spec §4.2)
  const zoneDotsMap = useMemo(() => {
    const zoneSet = new Map<string, string>();
    for (const o of orders) {
      const zone = getRouteZone(o.customer_lat, o.customer_lon);
      if (!zoneSet.has(zone.id)) zoneSet.set(zone.id, zone.dotColor);
    }
    return zoneSet;
  }, [orders]);

  const routeCount = zoneDotsMap.size;
  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (o.total_amount || 0), 0), [orders]);
  const totalDuration = useMemo(() => orders.reduce((sum, o) => sum + (o.cached_duration_seconds || 0), 0), [orders]);

  const allReady = orders.length > 0 && orders.every(o => isOrderReadyStatus(o.status));
  const someNotReady = orders.length > 0 && orders.some(o => !isOrderReadyStatus(o.status));

  // Load indicator color semantics per spec §5
  const loadDotClass =
    routeCount === 0 ? '' :
    routeCount === 1 ? 'bg-cult-success' :
    routeCount === 2 ? 'bg-cult-warning' :
    'bg-cult-danger';

  return (
    <div
      onDragOver={(e) => onDragOver(e, date)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date)}
      onClick={onClick}
      className={`aspect-square border-2 p-1.5 transition-all flex flex-col ${
        orders.length > 0 ? 'cursor-pointer' : ''
      } ${
        isDragOver
          ? 'border-cult-success bg-cult-success/10 scale-[1.03]'
          : isSuggested
          ? 'border-cult-success/60 bg-cult-success/5 animate-pulse'
          : isTodayDate
          ? 'border-cult-warning bg-cult-warning/10'
          : 'border-cult-medium-gray hover:border-cult-light-gray bg-cult-black'
      }`}
    >
      {/* Header row: date + readiness indicator */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${
          isTodayDate ? 'text-cult-warning font-bold' : 'text-cult-white'
        }`}>
          {date.getDate()}
        </span>
        {orders.length > 0 && someNotReady && !allReady && (
          <AlertTriangle className="w-3 h-3 text-cult-warning" title="Needs prep" />
        )}
      </div>

      {/* Load summary block per spec §4.2 */}
      {orders.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          {/* Route count + load dots */}
          <div className="flex items-center gap-1 mb-0.5">
            <div className="flex items-center gap-0.5">
              {[...zoneDotsMap.values()].slice(0, 4).map((dotColor, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              ))}
              {zoneDotsMap.size > 4 && (
                <span className="text-[9px] text-cult-lighter-gray ml-0.5">+{zoneDotsMap.size - 4}</span>
              )}
            </div>
            <span className="text-[10px] text-cult-lighter-gray truncate">
              {routeCount} route{routeCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Revenue — most decision-relevant number */}
          <div className="text-[13px] text-cult-white font-semibold leading-tight tabular-nums">
            {formatCurrencyShort(totalRevenue)}
          </div>

          {/* Order count */}
          <div className="text-[10px] text-cult-lighter-gray">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Footer: drive time + load label */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between mt-auto pt-0.5 gap-1">
          {loadDotClass && (
            <div className={`w-1.5 h-1.5 rounded-full ${loadDotClass}`} title={
              routeCount === 1 ? 'Light load' :
              routeCount === 2 ? 'Moderate load' : 'Heavy load'
            } />
          )}
          {totalDuration > 0 && (
            <span className="text-[10px] text-cult-lighter-gray leading-none truncate">
              ~{formatDuration(totalDuration)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function UpcomingDeliveriesTable({
  orders,
  onDragStart,
  onSelectOrder,
  overdueDocOrderIds,
  onShowDocuments,
}: {
  orders: CalendarOrder[];
  onDragStart: (e: React.DragEvent, order: CalendarOrder) => void;
  onSelectOrder?: (orderId: string) => void;
  overdueDocOrderIds: Set<string>;
  onShowDocuments: () => void;
}) {
  const sorted = useMemo(() =>
    [...orders].sort((a, b) => {
      if (!a.requested_delivery_date) return 1;
      if (!b.requested_delivery_date) return -1;
      return a.requested_delivery_date.localeCompare(b.requested_delivery_date);
    }),
    [orders]
  );

  return (
    <div className="mt-6 bg-cult-near-black border-2 border-cult-medium-gray p-6">
      <h3 className="text-lg font-semibold text-cult-white mb-4 uppercase tracking-wide">Upcoming Deliveries</h3>
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-cult-light-gray">No scheduled deliveries this month</div>
      ) : (
        <div className="space-y-3">
          {sorted.map(order => {
            const sc = getOrderStatusStyle(order.status);
            const zone = getRouteZone(order.customer_lat, order.customer_lon);
            return (
              <div
                key={order.id}
                className="border-2 border-cult-medium-gray hover:border-cult-white transition-colors bg-cult-black"
              >
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, order)}
                  className="flex items-center justify-between p-4 cursor-move"
                  title="Drag to calendar to reschedule"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 ${sc.bg} border ${sc.border}`}>
                      <Package className={`w-5 h-5 ${sc.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-cult-white">{order.order_number}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {sc.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${zone.dotColor}`} />
                          <span className={`text-xs ${zone.color}`}>{zone.label}</span>
                        </div>
                        {overdueDocOrderIds.has(order.id) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onShowDocuments(); }}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-cult-danger/15 border border-cult-danger/40 rounded text-[10px] font-bold text-cult-danger uppercase tracking-wider hover:bg-cult-danger/25 transition-colors"
                            title="Documents overdue — click to open Dispatch Queue"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Docs
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-cult-light-gray">{order.customer_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-cult-light-gray">Delivery Date</div>
                      <div className="font-medium text-cult-white">
                        {order.requested_delivery_date
                          ? new Date(order.requested_delivery_date + 'T00:00:00').toLocaleDateString()
                          : 'Not scheduled'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-cult-light-gray">Amount</div>
                      <div className="font-medium text-cult-white">{formatCurrency(order.total_amount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-cult-light-gray">Items</div>
                      <div className="font-medium text-cult-white">{order.item_count}</div>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <OrderItemsExpander orderId={order.id} onSelectOrder={onSelectOrder} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getDaysInMonthInfo(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    daysInMonth: lastDay.getDate(),
    startingDayOfWeek: firstDay.getDay(),
    year,
    month,
  };
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

