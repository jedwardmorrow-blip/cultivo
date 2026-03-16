import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchPlanData, BatchAllocation } from '../types';

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
      }));

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


// ─── useAllocationsForBatch ─────────────────────────────────────────────────
// Fetches existing batch_allocations rows for a specific batch, with order details.

export function useAllocationsForBatch(batchId: string | null) {
  const [allocations, setAllocations] = useState<BatchAllocation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllocations = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('batch_allocations')
        .select(`
          id,
          batch_id,
          order_item_id,
          allocation_stage,
          allocated_weight_grams,
          projected_final_weight_grams,
          status,
          notes,
          order_items!inner (
            quantity,
            format_label,
            orders!inner (
              order_number,
              customers!inner ( business_name )
            )
          )
        `)
        .eq('batch_id', batchId)
        .eq('status', 'pending');

      if (error) throw error;

      const parsed: BatchAllocation[] = (data || []).map((row: Record<string, unknown>) => {
        const oi = row.order_items as Record<string, unknown> | undefined;
        const ord = oi?.orders as Record<string, unknown> | undefined;
        const cust = ord?.customers as Record<string, unknown> | undefined;
        return {
          id: row.id as string,
          batch_id: row.batch_id as string,
          order_item_id: row.order_item_id as string,
          allocation_stage: row.allocation_stage as string,
          allocated_weight_grams: Number(row.allocated_weight_grams) || 0,
          projected_final_weight_grams: row.projected_final_weight_grams ? Number(row.projected_final_weight_grams) : null,
          status: row.status as string,
          notes: row.notes as string | null,
          order_number: ord?.order_number as string | undefined,
          customer_name: cust?.business_name as string | undefined,
          order_item_quantity: oi?.quantity ? Number(oi.quantity) : undefined,
          format_label: oi?.format_label as string | undefined,
        };
      });

      setAllocations(parsed);
    } catch (err) {
      console.error('Failed to fetch allocations for batch:', err);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  return { allocations, loading, refetch: fetchAllocations };
}


// ─── useAllocateBatch ───────────────────────────────────────────────────────
// INSERT into batch_allocations: "this batch services this order item"

export function useAllocateBatch() {
  const [loading, setLoading] = useState(false);

  const allocate = useCallback(async (
    batchId: string,
    orderItemId: string,
    allocationStage: string,
    weightGrams: number,
    projectedFinalWeightGrams?: number
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('batch_allocations')
        .insert({
          batch_id: batchId,
          order_item_id: orderItemId,
          allocation_stage: allocationStage,
          allocated_weight_grams: weightGrams,
          projected_final_weight_grams: projectedFinalWeightGrams ?? null,
          status: 'pending',
        });

      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { allocate, loading };
}


// ─── useDeallocateBatch ─────────────────────────────────────────────────────
// DELETE a batch_allocations row (remove allocation)

export function useDeallocateBatch() {
  const [loading, setLoading] = useState(false);

  const deallocate = useCallback(async (allocationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('batch_allocations')
        .delete()
        .eq('id', allocationId);

      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deallocate, loading };
}
