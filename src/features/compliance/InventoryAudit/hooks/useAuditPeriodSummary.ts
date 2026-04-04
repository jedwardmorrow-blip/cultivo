import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuditPeriodSummary } from '@/types';

interface UseAuditPeriodSummaryResult {
  summary: AuditPeriodSummary | null;
  loading: boolean;
  error: string | null;
}

/**
 * Calls get_audit_period_summary() RPC to fetch period-based inventory balances.
 * DB dependency: CUL-359 (must be deployed before this hook returns real data).
 */
export function useAuditPeriodSummary(
  startDate: string | null,
  endDate: string | null
): UseAuditPeriodSummaryResult {
  const [summary, setSummary] = useState<AuditPeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setSummary(null);
      return;
    }

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_audit_period_summary',
          { p_start_date: startDate, p_end_date: endDate }
        );

        if (!mounted) return;

        if (rpcError) {
          setError(rpcError.message);
          setSummary(null);
          return;
        }

        setSummary(data as AuditPeriodSummary);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load audit period summary');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [startDate, endDate]);

  return { summary, loading, error };
}
