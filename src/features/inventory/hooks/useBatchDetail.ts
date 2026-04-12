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

export function useBatchDetail(strainId: string | null) {
  const [batches, setBatches] = useState<BatchDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!strainId) {
      setBatches([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('batch_allocation_summary')
        .select(`
          batch_id,
          batch_number,
          strain,
          strain_id,
          harvest_date,
          batch_status,
          coa_status,
          bucked_available,
          flower_available,
          smalls_available,
          packaged_available,
          total_weight,
          total_allocated
        `)
        .eq('strain_id', strainId)
        .eq('batch_status', 'active')
        .order('harvest_date', { ascending: false });

      if (error) throw error;

      // Fetch lifecycle_state + grade from batch_registry for these batches
      const batchIds = (data ?? []).map((r: any) => r.batch_id);
      let lifecycleMap = new Map<string, { lifecycle_state: string | null; production_path: string | null; grade_label: string | null; grade_color: string | null }>();

      if (batchIds.length > 0) {
        const { data: regRows } = await supabase
          .from('batch_registry')
          .select('id, lifecycle_state, production_path, quality_grade_id')
          .in('id', batchIds);

        // Fetch grade info if any batches have grades
        const gradeIds = (regRows ?? []).map((r: any) => r.quality_grade_id).filter(Boolean);
        let gradeMap = new Map<string, { label: string; color_class: string }>();
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
      }

      const mapped: BatchDetailRow[] = (data ?? []).map((r: any) => {
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
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [strainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { batches, loading, refetch: fetch };
}
