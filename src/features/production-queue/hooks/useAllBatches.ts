import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchPlanData } from '../types';

// ─── useAllBatches ─────────────────────────────────────────────────────────
// Fetches ALL batches from v_production_queue_batch_planning for the Batches tab.
// Unlike useBatchesForStrain (single-strain), this loads the full dataset.

export function useAllBatches() {
  const [batches, setBatches] = useState<BatchPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('v_production_queue_batch_planning')
        .select('*')
        .order('total_available_g', { ascending: false });

      if (queryError) throw queryError;

      const n = (v: unknown): number => Number(v) || 0;

      const parsed: BatchPlanData[] = (data || []).map((row: Record<string, unknown>) => ({
        batch_id: row.batch_id as string,
        batch_number: row.batch_number as string,
        strain_id: row.strain_id as string,
        strain_name: row.strain_name as string,
        batch_status: row.batch_status as string,
        binned_g: n(row.binned_g),
        bucked_g: n(row.bucked_g),
        bulk_g: n(row.bulk_g),
        packaged_g: n(row.packaged_g),
        trim_g: n(row.trim_g),
        total_weight_g: n(row.total_weight_g),
        total_available_g: n(row.total_available_g),
        allocated_order_items: n(row.allocated_order_items),
        total_allocated_g: n(row.total_allocated_g),
        allocated_order_numbers: row.allocated_order_numbers as string[] | null,
        est_eighths_from_bulk: n(row.est_eighths_from_bulk),
        est_lbs_from_bulk: n(row.est_lbs_from_bulk),
        strain_units_needed: n(row.strain_units_needed),
        strain_demand_g: n(row.strain_demand_g),
        strain_order_count: n(row.strain_order_count),
        strain_urgency: (row.strain_urgency as BatchPlanData['strain_urgency']) || 'no_date',
      }));

      setBatches(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();

    const channel = supabase
      .channel('all_batches_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_allocations' }, () => fetchBatches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_stage_tracking' }, () => fetchBatches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetchBatches())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBatches]);

  return { batches, loading, error, refetch: fetchBatches };
}
