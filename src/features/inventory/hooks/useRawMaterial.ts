import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchDetailRow } from './useBatchDetail';

/**
 * Fetches raw (pre-packaged) material from v_batch_lifecycle, ordered strictly
 * by harvest_date ASC (FIFO). Only includes batches with unprocessed weight.
 */
export function useRawMaterial() {
  const [batches, setBatches] = useState<BatchDetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_batch_lifecycle')
        .select('*')
        .order('harvest_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('[useRawMaterial] query failed:', error);
        throw error;
      }

      // Filter to batches with raw/unprocessed weight (pre-packaged stages)
      const mapped: BatchDetailRow[] = (data ?? [])
        .map((r: any) => ({
          batch_id: r.batch_id,
          batch_code: r.batch_code,
          strain_name: r.strain_name,
          strain_id: r.strain_id,
          lifecycle_state: r.lifecycle_state,
          stage: r.stage,
          harvest_date: r.harvest_date,
          age_days: Number(r.age_days) || 0,
          days_in_stage: Number(r.days_in_stage) || 0,
          binned_g: Number(r.binned_g) || 0,
          bucked_g: Number(r.bucked_g) || 0,
          bulk_flower_g: Number(r.bulk_flower_g) || 0,
          bulk_smalls_g: Number(r.bulk_smalls_g) || 0,
          trim_g: Number(r.trim_g) || 0,
          packaged_g: Number(r.packaged_g) || 0,
          shipped_g: Number(r.shipped_g) || 0,
          sellable_now_g: Number(r.sellable_now_g) || 0,
          pipeline_raw_g: Number(r.pipeline_raw_g) || 0,
          total_potential_g: Number(r.total_potential_g) || 0,
          waste_grams: Number(r.waste_grams) || 0,
          allocated_orders: Number(r.allocated_orders) || 0,
          allocated_units: Number(r.allocated_units) || 0,
          allocated_revenue: Number(r.allocated_revenue) || 0,
          sold_value: Number(r.sold_value) || 0,
          quality_grade: r.quality_grade ?? null,
          confidence: r.confidence ?? 'low',
          packaging_started_at: r.packaging_started_at ?? null,
          completed_at: r.completed_at ?? null,
        }))
        .filter((b) => {
          // Only show batches with raw material (binned, bucked, or bulk not yet packaged)
          const rawWeight = b.binned_g + b.bucked_g + b.bulk_flower_g + b.bulk_smalls_g + b.trim_g;
          return rawWeight > 0;
        });

      setBatches(mapped);
    } catch (err) {
      console.error('[useRawMaterial] Failed:', err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { batches, loading, refetch: fetch };
}
