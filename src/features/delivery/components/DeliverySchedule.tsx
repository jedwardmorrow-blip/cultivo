import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import * as deliveryService from '../services/delivery.service';

interface DeliveryScheduleItem {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_address: string | null;
  scheduled_date: string;
  scheduled_time_window: string | null;
  driver_name: string | null;
  route_number: string | null;
  status: string;
  actual_delivery_time: string | null;
  notes: string | null;
}

export function DeliverySchedule() {
  const [schedules, setSchedules] = useState<DeliveryScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadSchedules();
  }, [selectedDate]);

  async function loadSchedules() {
    try {
      const { data } = await deliveryService.getDeliverySchedules(selectedDate);

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          order_id: item.order_id,
          order_number: item.orders.order_number,
          customer_name: item.orders.customers?.name || 'Unknown',
          customer_address: item.orders.customers?.address || null,
          scheduled_date: item.scheduled_date,
          scheduled_time_window: item.scheduled_time_window,
          driver_name: item.driver_name,
          route_number: item.route_number,
          status: item.status,
          actual_delivery_time: item.actual_delivery_time,
          notes: item.notes,
        }));
        setSchedules(formatted);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    await deliveryService.updateDeliveryStatus(id, newStatus);

    if (newStatus === 'delivered' || newStatus === 'in_transit') {
      const schedule = schedules.find(s => s.id === id);
      if (schedule) {
        await deliveryService.updateOrderStatusFromDelivery(schedule.order_id, newStatus);
      }
    }

    await loadSchedules();
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
      loaded: { bg: 'bg-purple-100', text: 'text-purple-700' },
      in_transit: { bg: 'bg-teal-100', text: 'text-teal-700' },
      delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      failed: { bg: 'bg-red-100', text: 'text-red-700' },
    };

    const { bg, text } = config[status] || config.scheduled;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const deliveredCount = schedules.filter(s => s.status === 'delivered').length;
  const inTransitCount = schedules.filter(s => s.status === 'in_transit').length;
  const routes = new Set(schedules.map(s => s.route_number).filter(Boolean));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-light-gray">Loading delivery schedule...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Delivery Schedule</h1>
        <p className="text-cult-light-gray mt-2">Coordinate delivery routes and track shipments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-cult-light-gray">Scheduled Deliveries</div>
          <div className="text-3xl font-bold text-cult-white mt-2">{schedules.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-cult-light-gray">In Transit</div>
          <div className="text-3xl font-bold text-teal-600 mt-2">{inTransitCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-cult-light-gray">Delivered</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">
            {deliveredCount} / {schedules.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-cult-light-gray">Active Routes</div>
          <div className="text-3xl font-bold text-cult-white mt-2">{routes.size}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-sm text-cult-light-gray">
            Showing deliveries for {new Date(selectedDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {schedules.length === 0 ? (
          <div className="p-12 text-center text-cult-light-gray">
            No deliveries scheduled for this date
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Time Window
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cult-light-gray uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-cult-white">
                    {schedule.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cult-white">
                    {schedule.customer_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-cult-white max-w-xs truncate">
                    {schedule.customer_address || 'No address'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cult-white">
                    {schedule.scheduled_time_window || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cult-white">
                    {schedule.route_number || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cult-white">
                    {schedule.driver_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(schedule.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {schedule.status === 'scheduled' && (
                      <button
                        onClick={() => updateStatus(schedule.id, 'loaded')}
                        className="text-emerald-600 hover:text-emerald-900 font-medium"
                      >
                        Load
                      </button>
                    )}
                    {schedule.status === 'loaded' && (
                      <button
                        onClick={() => updateStatus(schedule.id, 'in_transit')}
                        className="text-emerald-600 hover:text-emerald-900 font-medium"
                      >
                        Dispatch
                      </button>
                    )}
                    {schedule.status === 'in_transit' && (
                      <button
                        onClick={() => updateStatus(schedule.id, 'delivered')}
                        className="text-emerald-600 hover:text-emerald-900 font-medium"
                      >
                        Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
