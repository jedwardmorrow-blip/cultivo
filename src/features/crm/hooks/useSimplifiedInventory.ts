import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/* ────────────────────────────────────────────────────── *
 *  Types                                                 *
 * ────────────────────────────────────────────────────── */

export type HealthStatus = 'critical' | 'low' | 'warning' | 'healthy';

export interface StrainSummary {
  strain: string;
  totalGrams: number;
  sellableGrams: number;
  pipelineGrams: number;
  byproductGrams: number;
  healthStatus: HealthStatus;
  gradeCode: string;
  gradeColor: string;
}

export interface BatchStage {
  batchNumber: string;
  category: string;
  stageName: string;
  stageSort: number;
  displayGroup: string;
  itemCount: number;
  availableQty: number;
  unit: string;
}

export interface BatchSummary {
  batchNumber: string;
  totalGrams: number;
  stages: BatchStage[];
}

/* ────────────────────────────────────────────────────── *
 *  Hook                                                  *
 * ────────────────────────────────────────────────────── */

export function useSimplifiedInventory() {
  const [strains, setStrains] = useState<StrainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  /* ── Fetch strain-level summary from existing view ── */
  const fetchStrains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('v_sales_dashboard')
        .select('*');

      if (err) throw err;

      const mapped: StrainSummary[] = (data || []).map((r: any) => ({
        strain: r.strain,
        totalGrams: (r.sellable_grams || 0) + (r.pipeline_grams || 0),
        sellableGrams: r.sellable_grams || 0,
        pipelineGrams: r.pipeline_grams || 0,
        byproductGrams: r.byproduct_grams || 0,
        healthStatus: (r.health_status || 'healthy') as HealthStatus,
        gradeCode: r.grade_code || 'UNDEFINED',
        gradeColor: r.grade_color || 'gray',
      }));

      mapped.sort((a, b) => b.totalGrams - a.totalGrams);
      setStrains(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch batch→stage breakdown for a strain ── */
  const fetchBatches = useCallback(async (strain: string) => {
    setBatchesLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('v_inventory_batch_stages')
        .select('*')
        .eq('strain', strain)
        .order('batch_number', { ascending: false });

      if (err) throw err;

      // Group rows by batch
      const batchMap = new Map<string, BatchStage[]>();
      for (const row of data || []) {
        const bn = row.batch_number;
        if (!batchMap.has(bn)) batchMap.set(bn, []);
        batchMap.get(bn)!.push({
          batchNumber: bn,
          category: row.category,
          stageName: row.stage_name,
          stageSort: row.stage_sort,
          displayGroup: row.display_group,
          itemCount: row.item_count,
          availableQty: Number(row.available_qty),
          unit: row.unit,
        });
      }

      const batchSummaries: BatchSummary[] = Array.from(batchMap.entries()).map(
        ([bn, stages]) => {
          stages.sort((a, b) => a.stageSort - b.stageSort);
          const totalGrams = stages
            .filter((s) => s.unit === 'g')
            .reduce((sum, s) => sum + s.availableQty, 0);
          return { batchNumber: bn, totalGrams, stages };
        },
      );

      batchSummaries.sort((a, b) => b.totalGrams - a.totalGrams);
      setBatches(batchSummaries);
    } catch (e: any) {
      console.error('Error fetching batch stages:', e);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  /* ── Toggle strain expansion ── */
  const toggleStrain = useCallback(
    (strain: string) => {
      if (expandedStrain === strain) {
        setExpandedStrain(null);
        setBatches([]);
      } else {
        setExpandedStrain(strain);
        fetchBatches(strain);
      }
    },
    [expandedStrain, fetchBatches],
  );

  /* ── Initial load ── */
  useEffect(() => {
    fetchStrains();
  }, [fetchStrains]);

  /* ── Realtime subscriptions ── */
  useEffect(() => {
    const channel = supabase
      .channel('simplified-inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          fetchStrains();
          if (expandedStrain) fetchBatches(expandedStrain);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStrains, fetchBatches, expandedStrain]);

  return {
    strains,
    loading,
    error,
    expandedStrain,
    toggleStrain,
    batches,
    batchesLoading,
    refresh: fetchStrains,
  };
}
