import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { InventoryAudit, InventoryAuditInsert } from '@/types';

const PAGE_SIZE = 20;

interface AuditHistoryFilters {
  status?: 'completed' | 'flagged' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

interface UseAuditHistoryResult {
  audits: InventoryAudit[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  setPage: (page: number) => void;
  filters: AuditHistoryFilters;
  setFilters: (filters: AuditHistoryFilters) => void;
  submitAudit: (record: InventoryAuditInsert) => Promise<InventoryAudit>;
  refresh: () => void;
}

/**
 * Paginated read of inventory_audits with filter support.
 * Also exposes submitAudit() to write new audit records.
 * DB dependency: CUL-359.
 */
export function useAuditHistory(): UseAuditHistoryResult {
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<AuditHistoryFilters>({ status: 'all' });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        let query = supabase
          .from('inventory_audits')
          .select(
            'id, audit_number, period_start, period_end, auditor_id, auditor_name, ' +
            'beginning_inventory_g, acquisitions_g, harvests_g, sales_g, transfers_g, ' +
            'testing_submissions_g, disposals_g, calculated_ending_balance_g, ' +
            'physical_ending_inventory_g, variance_g, variance_explanation, ' +
            'corrective_action, status, completed_at, created_at',
            { count: 'exact' }
          )
          .order('completed_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters.dateFrom) {
          query = query.gte('period_start', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('period_end', filters.dateTo);
        }

        const { data, error: fetchError, count } = await query;

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setAudits([]);
          return;
        }

        setAudits((data as InventoryAudit[]) ?? []);
        setTotal(count ?? 0);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load audit history');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [page, filters, refreshKey]);

  const submitAudit = useCallback(async (record: InventoryAuditInsert): Promise<InventoryAudit> => {
    const { data, error: insertError } = await supabase
      .from('inventory_audits')
      .insert(record)
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    refresh();
    return data as InventoryAudit;
  }, [refresh]);

  return {
    audits,
    loading,
    error,
    total,
    page,
    setPage,
    filters,
    setFilters: (f) => { setPage(0); setFilters(f); },
    submitAudit,
    refresh,
  };
}
