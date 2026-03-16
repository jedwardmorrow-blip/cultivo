/**
 * useBatchStages — fetch batch→stage breakdown for a given strain.
 *
 * Mirrors the batch-fetching logic from useSimplifiedInventory,
 * scoped to a single strain name, with realtime subscriptions
 * on inventory_items + batch_allocations.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchStage, BatchSummary } from '@/shared/components/inventory';

export function useBatchStages(strainName: string | null) {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    if (!strainName) {
      setBatches([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('v_inventory_batch_stages')
        .select('*')
        .eq('strain', strainName)
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

      const summaries: BatchSummary[] = Array.from(batchMap.entries()).map(
        ([bn, stages]) => {
          stages.sort((a, b) => a.stageSort - b.stageSort);
          const totalGrams = stages
            .filter((s) => s.unit === 'g')
            .reduce((sum, s) => sum + s.availableQty, 0);
          return { batchNumber: bn, totalGrams, stages };
        },
      );

      summaries.sort((a, b) => b.totalGrams - a.totalGrams);
      setBatches(summaries);
    } catch (e: any) {
      console.error('useBatchStages error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [strainName]);

  // Initial fetch when strainName changes
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Realtime: re-fetch when inventory or allocations change
  useEffect(() => {
    if (!strainName) return;

    const channel = supabase
      .channel(`batch-stages-${strainName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => fetchBatches(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'batch_allocations' },
        () => fetchBatches(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [strainName, fetchBatches]);

  return { batches, loading, error, refresh: fetchBatches };
}
