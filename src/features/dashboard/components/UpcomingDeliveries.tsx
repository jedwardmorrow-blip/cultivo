import { useState, useEffect } from 'react';
import { getUpcomingDeliveries } from '../services/dashboard.service';

interface UpcomingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  scheduled_delivery_date: string | null;
  requested_delivery_date: string | null;
  total_amount: number;
}

export function UpcomingDeliveries({ onSelectOrder }: { onSelectOrder: (orderId: string) => void }) {
  const [orders, setOrders] = useState<UpcomingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingDeliveries();
  }, []);

  async function loadUpcomingDeliveries() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data } = await getUpcomingDeliveries();

      // Filter for next week
      const filteredOrders = (data || [])
        .filter((order: any) => {
          const deliveryDate = order.scheduled_delivery_date;
          return deliveryDate && deliveryDate >= today && deliveryDate <= nextWeek;
        })
        .slice(0, 5);

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading upcoming deliveries:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-cult-light-gray">Loading upcoming deliveries...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">Upcoming Deliveries</h2>
      {orders.length === 0 ? (
        <p className="text-cult-light-gray">No deliveries scheduled for the next 7 days</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className="w-full p-3 bg-cult-black border border-cult-medium-gray hover:border-cult-white transition-all text-left"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-cult-white font-medium">{order.order_number}</p>
                  <p className="text-cult-light-gray text-sm">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-cult-white font-medium">${order.total_amount.toFixed(2)}</p>
                  <p className="text-cult-light-gray text-sm">
                    {new Date(order.scheduled_delivery_date || order.requested_delivery_date || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
