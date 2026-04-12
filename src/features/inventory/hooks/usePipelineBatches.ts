import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchDetailRow } from './useBatchDetail';

export type PipelineStage = 'binned' | 'bucked' | 'bulk_flower' | 'bulk_smalls' | 'trim' | 'packaged' | 'shipped';

export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'binned', label: 'Binned', color: '#6B7280' },
  { key: 'bucked', label: 'Bucked', color: '#0EA5E9' },
  { key: 'bulk_flower', label: 'Flower', color: '#F43F5E' },
  { key: 'bulk_smalls', label: 'Smalls', color: '#F59E0B' },
  { key: 'trim', label: 'Trim', color: '#10B981' },
  { key: 'packaged', label: 'Packaged', color: '#8B5CF6' },
  { key: 'shipped', label: 'Shipped', color: '#6366F1' },
];

export interface PipelineFilters {
  search: string;
  showDepleted: boolean;
}

/**
 * Fetches all inventory-relevant batches for the pipeline matrix view.
 * Uses v_batch_lifecycle as the canonical data source.
 */
export function usePipelineBatches() {
  const [batches, setBatches] = useState<BatchDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PipelineFilters>({ search: '', showDepleted: false });

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_batch_lifecycle')
        .select('*')
        .order('harvest_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('[usePipelineBatches] query failed:', error);
        throw error;
      }

      const mapped: BatchDetailRow[] = (data ?? []).map((r: any) => ({
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
      console.error('[usePipelineBatches] Failed:', err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const filtered = useMemo(() => {
    let result = batches;

    // Filter out depleted batches unless toggled
    if (!filters.showDepleted) {
      result = result.filter((b) => {
        const total = b.sellable_now_g + b.pipeline_raw_g + b.total_potential_g;
        return total > 0;
      });
    }

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.batch_code.toLowerCase().includes(q) ||
          b.strain_name.toLowerCase().includes(q) ||
          (b.lifecycle_state?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [batches, filters]);

  // Compute the max weight across all batches for proportional bar sizing
  const maxTotalWeight = useMemo(() => {
    if (filtered.length === 0) return 1;
    return Math.max(...filtered.map((b) => b.total_potential_g), 1);
  }, [filtered]);

  return { batches: filtered, allBatches: batches, loading, filters, setFilters, maxTotalWeight, refetch: fetchBatches };
}
