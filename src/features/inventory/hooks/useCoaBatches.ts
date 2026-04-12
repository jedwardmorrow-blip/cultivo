import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export type CoaStatus = 'curing' | 'pending_sampling' | 'testing_in_progress' | 'coa_received' | 'available' | 'coa_failed';

export const COA_COLUMNS: { status: CoaStatus; label: string; color: string }[] = [
  { status: 'curing', label: 'Curing', color: '#6B7280' },
  { status: 'pending_sampling', label: 'Ready to Sample', color: '#F59E0B' },
  { status: 'testing_in_progress', label: 'Submitted', color: '#3B82F6' },
  { status: 'coa_received', label: 'Results In', color: '#06B6D4' },
  { status: 'available', label: 'Available', color: '#10B981' },
  { status: 'coa_failed', label: 'Failed', color: '#EF4444' },
];

export interface CoaBatchRow {
  batch_id: string;
  batch_number: string;
  strain: string;
  harvest_date: string | null;
  lifecycle_state: string;
  coa_status: CoaStatus;
  coa_id: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  total_cannabinoids_percentage: number | null;
  days_in_current_state: number | null;
}

/**
 * Fetches COA-relevant batch data from batch_with_coa_status view.
 */
export function useCoaBatches() {
  const [batches, setBatches] = useState<CoaBatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('batch_with_coa_status')
        .select('batch_id, batch_number, strain, harvest_date, lifecycle_state, coa_status, coa_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, cure_start_date, cure_expected_complete_date, testing_submitted_at')
        .not('batch_status', 'in', '("archived","depleted")')
        .order('harvest_date', { ascending: true });

      if (error) {
        console.error('[useCoaBatches] query failed:', error);
        throw error;
      }

      const mapped: CoaBatchRow[] = (data ?? []).map((r: any) => {
        // Calculate days in current state
        let daysInState: number | null = null;
        const now = Date.now();
        if (r.coa_status === 'curing' && r.cure_start_date) {
          daysInState = Math.floor((now - new Date(r.cure_start_date).getTime()) / 86_400_000);
        } else if (r.coa_status === 'pending_sampling' && r.cure_expected_complete_date) {
          daysInState = Math.floor((now - new Date(r.cure_expected_complete_date).getTime()) / 86_400_000);
        } else if (r.coa_status === 'testing_in_progress' && r.testing_submitted_at) {
          daysInState = Math.floor((now - new Date(r.testing_submitted_at).getTime()) / 86_400_000);
        }

        return {
          batch_id: r.batch_id,
          batch_number: r.batch_number,
          strain: r.strain,
          harvest_date: r.harvest_date,
          lifecycle_state: r.lifecycle_state,
          coa_status: r.coa_status as CoaStatus,
          coa_id: r.coa_id,
          thc_percentage: r.thc_percentage != null ? Number(r.thc_percentage) : null,
          cbd_percentage: r.cbd_percentage != null ? Number(r.cbd_percentage) : null,
          total_cannabinoids_percentage: r.total_cannabinoids_percentage != null ? Number(r.total_cannabinoids_percentage) : null,
          days_in_current_state: daysInState,
        };
      });

      setBatches(mapped);
    } catch (err) {
      console.error('[useCoaBatches] Failed:', err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Group by COA status for kanban columns
  const columns = useMemo(() => {
    const map = new Map<CoaStatus, CoaBatchRow[]>();
    COA_COLUMNS.forEach((c) => map.set(c.status, []));
    batches.forEach((b) => {
      const list = map.get(b.coa_status);
      if (list) list.push(b);
    });
    return map;
  }, [batches]);

  return { batches, columns, loading, refetch: fetchBatches };
}
