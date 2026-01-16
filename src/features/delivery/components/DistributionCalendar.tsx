import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Truck, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getOrdersForCalendar, getOrderItemCounts, getCustomerNames, updateOrderDeliveryDate as updateDeliveryDate } from '../services/delivery.service';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  requested_delivery_date: string | null;
  total_amount: number;
  item_count: number;
  status: string;
}

const ORDER_STATUS_COLORS = {
  submitted: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
    border: 'border-blue-600',
    label: 'Submitted'
  },
  accepted: {
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-400',
    border: 'border-cyan-600',
    label: 'Accepted'
  },
  processing: {
    bg: 'bg-yellow-900/30',
    text: 'text-yellow-400',
    border: 'border-yellow-600',
    label: 'Processing'
  },
  ready_for_delivery: {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    border: 'border-green-600',
    label: 'Ready for Delivery'
  },
  completed: {
    bg: 'bg-emerald-900/30',
    text: 'text-emerald-400',
    border: 'border-emerald-600',
    label: 'Completed'
  },
  cancelled: {
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    border: 'border-red-600',
    label: 'Cancelled'
  }
};

function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DistributionCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadOrders();

    // Subscribe to order changes for real-time updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate]);

  async function loadOrders() {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Load orders from service
      const { data: ordersData } = await getOrdersForCalendar(false);
      if (!ordersData) {
        setOrders([]);
        return;
      }

      // Get order item counts
      const orderIds = ordersData.map(o => o.id);
      const { data: itemCounts } = await getOrderItemCounts(orderIds);

      const countMap = itemCounts?.reduce((acc, item) => {
        acc[item.order_id] = (acc[item.order_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get customer names
      const customerIds = ordersData.map(o => o.customer_id).filter(Boolean);
      const { data: customers } = await getCustomerNames(customerIds);

      const customerMap = customers?.reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as Record<string, string>) || {};

      // Format orders with customer names and item counts
      const formattedOrders = ordersData.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_id ? customerMap[order.customer_id] || 'Unknown' : 'Unknown',
        requested_delivery_date: order.requested_delivery_date,
        total_amount: Number(order.total_amount),
        item_count: countMap[order.id] || 0,
        status: order.status,
      }));

      // Filter to current month
      const filteredOrders = formattedOrders.filter(order => {
        if (!order.requested_delivery_date) return false;
        const orderDate = new Date(order.requested_delivery_date);
        return orderDate >= startOfMonth && orderDate <= endOfMonth;
      });

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateDeliveryDate(orderId: string, newDate: string) {
    await updateDeliveryDate(orderId, newDate);
    await loadOrders();
  }

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  }

  function getOrdersForDate(date: Date): Order[] {
    const dateStr = formatDateToLocal(date);
    return orders.filter(order => order.requested_delivery_date === dateStr);
  }

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  function handleDragStart(e: React.DragEvent, order: Order) {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
  }

  function handleDragOver(e: React.DragEvent, date: Date) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dateStr = formatDateToLocal(date);
    setDragOverDate(dateStr);
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);

    if (draggedOrder) {
      const newDateStr = formatDateToLocal(date);
      handleUpdateDeliveryDate(draggedOrder.id, newDateStr);
      setDraggedOrder(null);
    }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const ordersWithDates = orders.filter(order => order.requested_delivery_date).length;

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Distribution Calendar</h1>
        <p className="text-cult-light-gray mt-1">View and manage delivery schedules - drag orders to reschedule</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-cult-near-black border-2 border-cult-light-gray p-6">
          <div className="text-sm font-medium text-cult-light-gray uppercase tracking-wider">Total Orders</div>
          <div className="text-3xl font-bold text-cult-white mt-2">{totalOrders}</div>
        </div>
        <div className="bg-cult-near-black border-2 border-green-600 p-6">
          <div className="text-sm font-medium text-cult-light-gray uppercase tracking-wider">Scheduled Deliveries</div>
          <div className="text-3xl font-bold text-green-500 mt-2">{ordersWithDates}</div>
        </div>
        <div className="bg-cult-near-black border-2 border-cult-light-gray p-6">
          <div className="text-sm font-medium text-cult-light-gray uppercase tracking-wider">Total Revenue</div>
          <div className="text-3xl font-bold text-cult-white mt-2">${formatCurrency(totalRevenue)}</div>
        </div>
      </div>

      <div className="bg-cult-near-black border-2 border-cult-medium-gray mb-6 p-4">
        <h3 className="text-sm font-bold text-cult-white uppercase tracking-wider mb-3">Order Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(ORDER_STATUS_COLORS).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-4 h-4 ${config.bg} border ${config.border}`}></div>
              <span className="text-sm text-cult-light-gray">
                {config.label}
                {statusCounts[status] ? ` (${statusCounts[status]})` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-cult-near-black border-2 border-cult-medium-gray overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b-2 border-cult-medium-gray bg-cult-black">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-cult-medium-gray transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-cult-light-gray" />
          </button>
          <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">{monthName}</h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-cult-medium-gray transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-cult-light-gray" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-cult-light-gray">
            Loading calendar...
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-cult-light-gray py-2 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dayOrders = getOrdersForDate(date);
                const isCurrentDay = isToday(date);
                const dateStr = formatDateToLocal(date);
                const isDragOver = dragOverDate === dateStr;

                return (
                  <div
                    key={date.toISOString()}
                    onDragOver={(e) => handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, date)}
                    onClick={() => {
                      if (dayOrders.length > 0) {
                        setSelectedDate(date);
                        setShowModal(true);
                      }
                    }}
                    className={`aspect-square border-2 p-2 transition-all ${
                      dayOrders.length > 0 ? 'cursor-pointer' : ''
                    } ${
                      isDragOver
                        ? 'border-green-500 bg-green-950/20 scale-105'
                        : isCurrentDay
                        ? 'border-yellow-500 bg-yellow-950/20'
                        : 'border-cult-medium-gray hover:border-cult-light-gray bg-cult-black'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentDay ? 'text-yellow-500 font-bold' : 'text-cult-white'
                    }`}>
                      {date.getDate()}
                    </div>

                    {dayOrders.length > 0 && (
                      <div className="space-y-1">
                        {dayOrders.slice(0, 2).map(order => {
                          const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.submitted;
                          return (
                            <div
                              key={order.id}
                              draggable
                              onDragStart={(e) => {
                                handleDragStart(e, order);
                                e.stopPropagation();
                              }}
                              onDragEnd={(e) => e.stopPropagation()}
                              className={`${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} text-xs px-1.5 py-0.5 truncate cursor-move hover:opacity-80 transition-opacity`}
                              title={`${order.order_number} - ${order.customer_name} - ${statusConfig.label} - Drag to reschedule`}
                            >
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate font-medium">{order.customer_name}</span>
                              </div>
                            </div>
                          );
                        })}
                        {dayOrders.length > 2 && (
                          <div
                            className="text-xs text-cult-lighter-gray px-1.5 cursor-pointer hover:text-cult-white"
                            onClick={() => {
                              setSelectedDate(date);
                              setShowModal(true);
                            }}
                          >
                            +{dayOrders.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-cult-near-black border-2 border-cult-medium-gray p-6">
        <h3 className="text-lg font-semibold text-cult-white mb-4 uppercase tracking-wide">Upcoming Deliveries</h3>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-cult-light-gray">
            No scheduled deliveries this month
          </div>
        ) : (
          <div className="space-y-3">
            {orders
              .sort((a, b) => {
                if (!a.requested_delivery_date) return 1;
                if (!b.requested_delivery_date) return -1;
                return a.requested_delivery_date.localeCompare(b.requested_delivery_date);
              })
              .map(order => {
                const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.submitted;
                return (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order)}
                    className="flex items-center justify-between p-4 border-2 border-cult-medium-gray hover:border-cult-white transition-colors cursor-move bg-cult-black"
                    title="Drag to calendar to reschedule"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 ${statusConfig.bg} border ${statusConfig.border}`}>
                        <Package className={`w-5 h-5 ${statusConfig.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-cult-white">{order.order_number}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                            {statusConfig.label}
                          </span>
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
                        <div className="font-medium text-cult-white">${formatCurrency(order.total_amount)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-cult-light-gray">Items</div>
                        <div className="font-medium text-cult-white">{order.item_count}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {showModal && selectedDate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-cult-near-black border-2 border-cult-light-gray shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-2 border-cult-medium-gray bg-cult-black">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
                  Deliveries for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-cult-light-gray hover:text-cult-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-160px)]">
              <table className="w-full">
                <thead className="bg-cult-black sticky top-0 border-b-2 border-cult-medium-gray">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-cult-light-gray uppercase tracking-wider">
                      Dispensary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-cult-light-gray uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-cult-light-gray uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-cult-light-gray uppercase tracking-wider">
                      Order Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cult-medium-gray">
                  {getOrdersForDate(selectedDate).map((order) => {
                    const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.submitted;
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-cult-black transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-cult-white">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-cult-light-gray">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-cult-white text-right">
                          ${formatCurrency(order.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t-2 border-cult-medium-gray bg-cult-black">
              <div className="flex items-center justify-between">
                <div className="text-sm text-cult-light-gray">
                  Total Orders: <span className="text-cult-white font-bold">{getOrdersForDate(selectedDate).length}</span>
                </div>
                <div className="text-lg font-semibold text-cult-white">
                  Total Value: <span className="text-green-500">${formatCurrency(getOrdersForDate(selectedDate).reduce((sum, order) => sum + order.total_amount, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
