import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BatchDetailRow {
  batch_id: string;
  batch_number: string;
  strain: string;
  strain_id: string;
  harvest_date: string | null;
  batch_status: string;
  lifecycle_state: string | null;
  production_path: string | null;
  coa_status: string | null;
  bucked_available: number;
  flower_available: number;
  smalls_available: number;
  packaged_available: number;
  total_weight: number;
  total_allocated: number;
  grade_label: string | null;
  grade_color: string | null;
}

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
      // Step 1: Get batch IDs + lifecycle data from batch_registry
      // Only post-harvest stages belong in inventory (veg/flower/drying = Cultivation domain)
      const INVENTORY_LIFECYCLE_STATES = ['bucked', 'bulk_available', 'packaged', 'archived'];

      const { data: regRows, error: regError } = await supabase
        .from('batch_registry')
        .select('id, lifecycle_state, production_path, quality_grade_id')
        .eq('strain', strainName)
        .eq('status', 'active')
        .in('lifecycle_state', INVENTORY_LIFECYCLE_STATES);

      if (regError) {
        console.error('[useBatchDetail] batch_registry lookup failed:', regError);
        throw regError;
      }

      const batchIds = (regRows ?? []).map((r: any) => r.id);
      if (batchIds.length === 0) {
        setBatches([]);
        return;
      }

      // Step 2: Get allocation data by batch_id (proven pattern from batch.service.ts)
      const { data: allocRows, error: allocError } = await supabase
        .from('batch_allocation_summary')
        .select('*')
        .in('batch_id', batchIds)
        .gt('total_weight', 0)
        .order('total_weight', { ascending: false });

      if (allocError) {
        console.error('[useBatchDetail] batch_allocation_summary query failed:', allocError);
        throw allocError;
      }

      if (!allocRows || allocRows.length === 0) {
        setBatches([]);
        return;
      }

      // Step 3: Build lifecycle + grade map from the registry rows we already fetched
      const lifecycleMap = new Map<string, {
        lifecycle_state: string | null;
        production_path: string | null;
        grade_label: string | null;
        grade_color: string | null;
      }>();

      try {

        const gradeIds = (regRows ?? []).map((r: any) => r.quality_grade_id).filter(Boolean);
        const gradeMap = new Map<string, { label: string; color_class: string }>();

        if (gradeIds.length > 0) {
          const { data: grades } = await supabase
            .from('quality_grades')
            .select('id, label, color_class')
            .in('id', gradeIds);
          (grades ?? []).forEach((g: any) => gradeMap.set(g.id, { label: g.label, color_class: g.color_class }));
        }

        (regRows ?? []).forEach((r: any) => {
          const grade = r.quality_grade_id ? gradeMap.get(r.quality_grade_id) : null;
          lifecycleMap.set(r.id, {
            lifecycle_state: r.lifecycle_state,
            production_path: r.production_path,
            grade_label: grade?.label ?? null,
            grade_color: grade?.color_class ?? null,
          });
        });
      } catch (enrichErr) {
        // Non-fatal: we still have allocation data, just missing lifecycle/grade
        console.warn('[useBatchDetail] batch_registry enrichment failed (non-fatal):', enrichErr);
      }

      // Step 4: Map to BatchDetailRow
      const mapped: BatchDetailRow[] = allocRows.map((r: any) => {
        const extra = lifecycleMap.get(r.batch_id);
        return {
          batch_id: r.batch_id,
          batch_number: r.batch_number,
          strain: r.strain,
          strain_id: r.strain_id,
          harvest_date: r.harvest_date,
          batch_status: r.batch_status,
          lifecycle_state: extra?.lifecycle_state ?? null,
          production_path: extra?.production_path ?? null,
          coa_status: r.coa_status,
          bucked_available: Math.max(0, Number(r.bucked_available) || 0),
          flower_available: Math.max(0, Number(r.flower_available) || 0),
          smalls_available: Math.max(0, Number(r.smalls_available) || 0),
          packaged_available: Math.max(0, Number(r.packaged_available) || 0),
          total_weight: Math.max(0, Number(r.total_weight) || 0),
          total_allocated: Number(r.total_allocated) || 0,
          grade_label: extra?.grade_label ?? null,
          grade_color: extra?.grade_color ?? null,
        };
      });

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
