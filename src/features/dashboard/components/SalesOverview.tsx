import { useState, useEffect } from 'react';
import { calculateMonthRevenue } from '@/features/orders/utils/orderGrouping';
import type { Order } from '@/features/orders/types';
import { getSalesOverview } from '../services/dashboard.service';

export function SalesOverview() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    weekOrders: 0,
    weekRevenue: 0,
    monthOrders: 0,
    monthRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSalesData();
  }, []);

  async function loadSalesData() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00.000Z`;
      const todayEnd = `${today}T23:59:59.999Z`;
      const currentMonth = now.toISOString().slice(0, 7);

      // Calculate start and end of current week (Sunday to Saturday)
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Fetch all orders once - not cancelled (include archived for month totals)
      const { data: allOrders } = await getSalesOverview();

      if (!allOrders) {
        setStats({
          todayOrders: 0,
          todayRevenue: 0,
          weekOrders: 0,
          weekRevenue: 0,
          monthOrders: 0,
          monthRevenue: 0
        });
        return;
      }

      // Orders created today (exclude archived)
      const todayOrders = allOrders.filter(o => {
        if (o.archived) return false;
        const createdDate = o.created_at.split('T')[0];
        return createdDate === today;
      });

      // Orders scheduled for delivery this week (exclude archived)
      const weekOrders = allOrders.filter(o => {
        if (o.archived) return false;
        if (!o.scheduled_delivery_date) return false;
        return o.scheduled_delivery_date >= weekStartStr && o.scheduled_delivery_date <= weekEndStr;
      });

      // Use shared function to calculate month revenue - same logic as Orders screen
      const monthStats = calculateMonthRevenue(allOrders as Order[], currentMonth);

      setStats({
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        weekOrders: weekOrders.length,
        weekRevenue: weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        monthOrders: monthStats.count,
        monthRevenue: monthStats.revenue
      });
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-cult-light-gray">Loading sales overview...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">Sales Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cult-black p-4 border border-cult-medium-gray">
          <p className="text-cult-light-gray text-sm uppercase tracking-wider">Sold Today</p>
          <p className="text-2xl font-bold text-cult-white mt-2">${stats.todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-cult-light-gray text-sm mt-1">{stats.todayOrders} {stats.todayOrders === 1 ? 'order' : 'orders'}</p>
        </div>
        <div className="bg-cult-black p-4 border border-cult-medium-gray">
          <p className="text-cult-light-gray text-sm uppercase tracking-wider">Scheduled This Week</p>
          <p className="text-2xl font-bold text-cult-white mt-2">${stats.weekRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-cult-light-gray text-sm mt-1">{stats.weekOrders} {stats.weekOrders === 1 ? 'order' : 'orders'}</p>
        </div>
        <div className="bg-cult-black p-4 border border-cult-medium-gray">
          <p className="text-cult-light-gray text-sm uppercase tracking-wider">Projected Month Total</p>
          <p className="text-2xl font-bold text-cult-white mt-2">${stats.monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-cult-light-gray text-sm mt-1">{stats.monthOrders} {stats.monthOrders === 1 ? 'order' : 'orders'}</p>
        </div>
      </div>
    </div>
  );
}
