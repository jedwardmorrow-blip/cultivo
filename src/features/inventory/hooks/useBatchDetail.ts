import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BatchDetailRow {
  batch_id: string;
  batch_code: string;
  strain_name: string;
  strain_id: string;
  lifecycle_state: string;
  stage: string;
  harvest_date: string | null;
  age_days: number;
  days_in_stage: number;
  // Per-stage weights
  binned_g: number;
  bucked_g: number;
  bulk_flower_g: number;
  bulk_smalls_g: number;
  trim_g: number;
  packaged_g: number;
  shipped_g: number;
  // Derived totals
  sellable_now_g: number;
  pipeline_raw_g: number;
  total_potential_g: number;
  waste_grams: number;
  // Allocation + sales
  allocated_orders: number;
  allocated_units: number;
  allocated_revenue: number;
  sold_value: number;
  // Quality
  quality_grade: string | null;
  confidence: string;
  // Timestamps
  packaging_started_at: string | null;
  completed_at: string | null;
}

/**
 * Fetches batch-level detail from v_batch_lifecycle for a given strain.
 * Only returns inventory-relevant batches (with sellable or pipeline weight).
 */
export function useBatchDetail(strainName: string | null) {
  const [batches, setBatches] = useState<BatchDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBatches = useCallback(async () => {
    if (!strainName) {
      setBatches([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_batch_lifecycle')
        .select('*')
        .eq('strain_name', strainName)
        .order('total_potential_g', { ascending: false });

      if (error) {
        console.error('[useBatchDetail] v_batch_lifecycle query failed:', error);
        throw error;
      }

      // Filter to inventory-relevant batches: has weight on the shelf or in pipeline
      const mapped: BatchDetailRow[] = (data ?? [])
        .filter((r: any) => {
          const sellable = Number(r.sellable_now_g) || 0;
          const pipeline = Number(r.pipeline_raw_g) || 0;
          const potential = Number(r.total_potential_g) || 0;
          return sellable > 0 || pipeline > 0 || potential > 0;
        })
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
        }));

      setBatches(mapped);
    } catch (err) {
      console.error('[useBatchDetail] Failed to load batches for strain', strainName, err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [strainName]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return { batches, loading, refetch: fetchBatches };
}
