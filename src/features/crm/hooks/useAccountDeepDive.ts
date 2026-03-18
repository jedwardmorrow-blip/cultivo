import { useState, useEffect, useCallback } from 'react';
import type { AccountHealthScore, CustomerProductMix } from '../types';
import type { DeliveryHistoryItem } from '../services/deepDive.service';
import {
  getAccountHealthById,
  getCustomerProductMix,
  getCustomerDeliveryHistory,
  getCustomerProductMixByRange,
  getCustomerDeliveryHistoryByRange,
} from '../services/deepDive.service';
import { getBatchMonthlyRevenue, getAccountOrders, getAccountOrdersByRange } from '../services';
import type { DateRange } from '@/shared/utils/dateRange';

interface AccountOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  order_date: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
  archived: boolean;
}

export function useAccountDeepDive(customerId: string | null, initialRange?: DateRange) {
  const [healthScore, setHealthScore] = useState<AccountHealthScore | null>(null);
  const [productMix, setProductMix] = useState<CustomerProductMix[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistoryItem[]>([]);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRange, setCurrentRange] = useState<DateRange | undefined>(initialRange);

  const fetchData = useCallback(async (range?: DateRange, isInitial = false) => {
    if (!customerId || customerId.length < 10) return;

    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const hasRange = range && range.start && range.end;

      const [healthResult, mixResult, deliveryResult, ordersResult, revenueResult] = await Promise.all([
        getAccountHealthById(customerId),
        hasRange
          ? getCustomerProductMixByRange(customerId, range.start, range.end)
          : getCustomerProductMix(customerId),
        hasRange
          ? getCustomerDeliveryHistoryByRange(customerId, range.start, range.end)
          : getCustomerDeliveryHistory(customerId),
        hasRange
          ? getAccountOrdersByRange(customerId, range.start, range.end)
          : getAccountOrders(customerId),
        getBatchMonthlyRevenue([customerId]),
      ]);

      if (healthResult.data) setHealthScore(healthResult.data);
      if (mixResult.data) setProductMix(mixResult.data);
      if (deliveryResult.data) setDeliveryHistory(deliveryResult.data);
      if (ordersResult.data) setOrders(ordersResult.data as AccountOrder[]);
      if (revenueResult.data) setMonthlyRevenue(revenueResult.data.get(customerId) || []);

      if (healthResult.error || mixResult.error || deliveryResult.error) {
        setError('Some deep-dive data failed to load');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load account deep-dive');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData(currentRange, true);
  }, [customerId]);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setCurrentRange(range);
    fetchData(range, false);
  }, [fetchData]);

  return {
    healthScore,
    productMix,
    deliveryHistory,
    orders,
    monthlyRevenue,
    loading,
    isRefreshing,
    error,
    reload: () => fetchData(currentRange, false),
    onDateRangeChange: handleDateRangeChange,
  };
}
