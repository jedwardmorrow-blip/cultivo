import { useState, useEffect, useCallback } from 'react';
import type { AccountSummary, CRMDashboardStats, SKUPerformance } from '../types';
import {
  getDashboardStats,
  getAccountSummaries,
  getSKUPerformance,
} from '../services';

export function useCRMDashboard() {
  const [stats, setStats] = useState<CRMDashboardStats | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [topSKUs, setTopSKUs] = useState<SKUPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResult, accountsResult, skuResult] = await Promise.all([
        getDashboardStats(),
        getAccountSummaries(),
        getSKUPerformance(),
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (accountsResult.data) setAccounts(accountsResult.data);
      if (skuResult.data) setTopSKUs(skuResult.data);

      if (statsResult.error || accountsResult.error || skuResult.error) {
        setError('Some dashboard data failed to load');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const nonChildAccounts = accounts.filter((a) => a.account_type !== 'hub_child');

  const atRiskAccounts = nonChildAccounts.filter(
    (a) => a.account_status === 'active' && a.days_since_last_order !== null && a.days_since_last_order > 30
  );

  const topAccounts = nonChildAccounts
    .filter((a) => a.order_count > 0 || (a.child_total_orders || 0) > 0)
    .sort((a, b) => {
      const aRev = a.total_revenue + (a.child_total_revenue || 0);
      const bRev = b.total_revenue + (b.child_total_revenue || 0);
      return bRev - aRev;
    })
    .slice(0, 15);

  const recentOrders = nonChildAccounts
    .filter((a) => a.last_order_date)
    .sort((a, b) => new Date(b.last_order_date!).getTime() - new Date(a.last_order_date!).getTime())
    .slice(0, 10);

  return {
    stats,
    accounts,
    topAccounts,
    atRiskAccounts,
    recentOrders,
    topSKUs,
    loading,
    error,
    reload: fetchDashboard,
  };
}
