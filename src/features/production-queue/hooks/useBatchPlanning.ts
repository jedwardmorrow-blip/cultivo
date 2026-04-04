import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchPlanData } from '../types';
import type { BatchCOAStatus } from '@/types/batch.types';

// ─── useBatchesForStrain ────────────────────────────────────────────────────
// Queries v_production_queue_batch_planning for all batches matching a strain.
// Returns batch cards with stage breakdown, capacity estimates, and demand ctx.

export function useBatchesForStrain(strainId: string | null) {
  const [batches, setBatches] = useState<BatchPlanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchBatches = useCallback(async () => {
    if (!strainId || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('v_production_queue_batch_planning')
        .select('*')
        .eq('strain_id', strainId)
        .order('total_available_g', { ascending: false });

      if (queryError) throw queryError;
      if (!isMountedRef.current) return;

      // Parse numeric strings from Postgres into numbers
      const parsed: BatchPlanData[] = (data || []).map((row: Record<string, unknown>) => ({
        batch_id: row.batch_id as string,
        batch_number: row.batch_number as string,
        strain_id: row.strain_id as string,
        strain_name: row.strain_name as string,
        batch_status: row.batch_status as string,
        binned_g: Number(row.binned_g) || 0,
        bucked_g: Number(row.bucked_g) || 0,
        bulk_g: Number(row.bulk_g) || 0,
        packaged_g: Number(row.packaged_g) || 0,
        trim_g: Number(row.trim_g) || 0,
        total_weight_g: Number(row.total_weight_g) || 0,
        total_available_g: Number(row.total_available_g) || 0,
        allocated_order_items: Number(row.allocated_order_items) || 0,
        total_allocated_g: Number(row.total_allocated_g) || 0,
        allocated_order_numbers: row.allocated_order_numbers as string[] | null,
        est_eighths_from_bulk: Number(row.est_eighths_from_bulk) || 0,
        est_lbs_from_bulk: Number(row.est_lbs_from_bulk) || 0,
        strain_units_needed: Number(row.strain_units_needed) || 0,
        strain_demand_g: Number(row.strain_demand_g) || 0,
        strain_order_count: Number(row.strain_order_count) || 0,
        strain_urgency: (row.strain_urgency as BatchPlanData['strain_urgency']) || 'no_date',
        coa_status: null,
      }));

      // Enrich with coa_status from batch_registry
      const batchIds = parsed.map(b => b.batch_id).filter(Boolean);
      if (batchIds.length > 0) {
        const { data: coaRows } = await supabase
          .from('batch_registry')
          .select('id, coa_status')
          .in('id', batchIds);

        if (coaRows) {
          const coaMap = new Map(coaRows.map(r => [r.id, r.coa_status as BatchCOAStatus]));
          parsed.forEach(b => { b.coa_status = coaMap.get(b.batch_id) ?? null; });
        }
      }

      setBatches(parsed);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [strainId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Realtime subscription: refetch when batch_allocations or batch_stage_tracking change
  useEffect(() => {
    if (!strainId) return;

    const allocationsSub = supabase
      .channel(`batch_plan_allocations_${strainId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_allocations' }, () => {
        fetchBatches();
      })
      .subscribe();

    const stagesSub = supabase
      .channel(`batch_plan_stages_${strainId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_stage_tracking' }, () => {
        fetchBatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(allocationsSub);
      supabase.removeChannel(stagesSub);
    };
  }, [strainId, fetchBatches]);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  return { batches, loading, error, refetch: fetchBatches };
}
