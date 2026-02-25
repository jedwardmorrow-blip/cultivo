import { useState, useEffect, useCallback } from 'react';
import type { AccountHealthScore, CustomerProductMix } from '../types';
import type { DeliveryHistoryItem } from '../services/deepDive.service';
import { getAccountHealthById, getCustomerProductMix, getCustomerDeliveryHistory } from '../services/deepDive.service';
import { getBatchMonthlyRevenue } from '../services';

export function useAccountDeepDive(customerId: string | null) {
  const [healthScore, setHealthScore] = useState<AccountHealthScore | null>(null);
  const [productMix, setProductMix] = useState<CustomerProductMix[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistoryItem[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);

      const [healthResult, mixResult, deliveryResult, revenueResult] = await Promise.all([
        getAccountHealthById(customerId),
        getCustomerProductMix(customerId),
        getCustomerDeliveryHistory(customerId),
        getBatchMonthlyRevenue([customerId]),
      ]);

      if (healthResult.data) setHealthScore(healthResult.data);
      if (mixResult.data) setProductMix(mixResult.data);
      if (deliveryResult.data) setDeliveryHistory(deliveryResult.data);
      if (revenueResult.data) setMonthlyRevenue(revenueResult.data.get(customerId) || []);

      if (healthResult.error || mixResult.error || deliveryResult.error) {
        setError('Some deep-dive data failed to load');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load account deep-dive');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    healthScore,
    productMix,
    deliveryHistory,
    monthlyRevenue,
    loading,
    error,
    reload: fetchData,
  };
}
