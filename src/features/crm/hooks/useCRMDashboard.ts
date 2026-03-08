import { useState, useEffect, useCallback } from 'react';
import type { CRMDashboardStats, SKUPerformance, TopAccountByRange } from '../types';
import {
  getDashboardStatsByRange,
  getTopAccountsByRange,
  getSKUPerformanceByRange,
  getBatchMonthlyRevenue,
  getAccountSummaries,
} from '../services';
import type { DateRange } from '@/shared/utils/dateRange';
import { computeDateRange } from '@/shared/utils/dateRange';
import type { AccountSummary } from '../types';
import { ensureValidSession } from '@/lib/sessionGuard';

const DEFAULT_RANGE = computeDateRange('30d');

export function useCRMDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [stats, setStats] = useState<CRMDashboardStats | null>(null);
  const [topAccounts, setTopAccounts] = useState<TopAccountByRange[]>([]);
  const [atRiskAccounts, setAtRiskAccounts] = useState<AccountSummary[]>([]);
  const [topSKUs, setTopSKUs] = useState<SKUPerformance[]>([]);
  const [monthlyRevenueMap, setMonthlyRevenueMap] = useState<Map<string, number[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (range: DateRange, isInitial = false) => {
    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) return;

      if (isInitial) setLoading(true);
      else setIsRefreshing(true);

      const [statsResult, accountsResult, skuResult, allAccountsResult] = await Promise.all([
        getDashboardStatsByRange(range.start, range.end),
        getTopAccountsByRange(range.start, range.end),
        getSKUPerformanceByRange(range.start, range.end),
        getAccountSummaries(),
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (accountsResult.data) {
        setTopAccounts(accountsResult.data);

        const topIds = accountsResult.data.map((a) => a.id);
        if (topIds.length > 0) {
          const revenueResult = await getBatchMonthlyRevenue(topIds);
          if (revenueResult.data) setMonthlyRevenueMap(revenueResult.data);
        }
      }
      if (skuResult.data) setTopSKUs(skuResult.data);

      if (allAccountsResult.data) {
        const nonChild = allAccountsResult.data.filter((a) => a.account_type !== 'hub_child');
        setAtRiskAccounts(
          nonChild.filter(
            (a) => a.account_status === 'active' && a.days_since_last_order != null && a.days_since_last_order > 30
          )
        );
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(dateRange, true);
  }, []);

  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range);
      fetchDashboard(range, false);
    },
    [fetchDashboard]
  );

  return {
    stats,
    topAccounts,
    atRiskAccounts,
    topSKUs,
    monthlyRevenueMap,
    loading,
    isRefreshing,
    dateRange,
    compareEnabled,
    setCompareEnabled,
    setDateRange: handleDateRangeChange,
    reload: () => fetchDashboard(dateRange, false),
  };
}
