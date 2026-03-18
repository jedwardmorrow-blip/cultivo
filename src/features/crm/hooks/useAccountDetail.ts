import { useState, useEffect, useCallback } from 'react';
import type {
  AccountSummary,
  ChainLocationPerformance,
  CustomerContact,
  CustomerActivity,
  MonthlyRevenue,
} from '../types';
import {
  getAccountById,
  getChildAccounts,
  getChainLocationPerformance,
  getAccountContacts,
  getActivityLog,
  getMonthlyRevenue,
} from '../services';

export function useAccountDetail(accountId: string | null) {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [childAccounts, setChildAccounts] = useState<AccountSummary[]>([]);
  const [chainPerformance, setChainPerformance] = useState<ChainLocationPerformance[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!accountId || accountId.length < 10) return;

    try {
      setLoading(true);
      setError(null);

      const [accountResult, contactsResult, activityResult, revenueResult] =
        await Promise.all([
          getAccountById(accountId),
          getAccountContacts(accountId),
          getActivityLog(accountId),
          getMonthlyRevenue(accountId),
        ]);

      if (accountResult.data) {
        setAccount(accountResult.data);
        if (accountResult.data.account_type === 'hub_parent') {
          const [childResult, perfResult] = await Promise.all([
            getChildAccounts(accountId),
            getChainLocationPerformance(accountId),
          ]);
          if (childResult.data) setChildAccounts(childResult.data);
          if (perfResult.data) setChainPerformance(perfResult.data);
        }
      }

      if (contactsResult.data) setContacts(contactsResult.data);
      if (activityResult.data) setActivities(activityResult.data);
      if (revenueResult.data) setMonthlyRevenue(revenueResult.data);

      if (accountResult.error) setError('Failed to load account details');
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  return {
    account,
    childAccounts,
    chainPerformance,
    contacts,
    activities,
    monthlyRevenue,
    loading,
    error,
    reload: fetchAccount,
  };
}
