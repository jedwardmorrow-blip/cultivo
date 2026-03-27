import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchLifecycleState } from '@/types/batch.types';
import { CULTIVATION_STAGES, FLOWER_PATH_STAGES, FF_LAB_STAGES } from '@/types/batch.types';

export interface PipelineBatch {
  id: string;
  batch_number: string;
  strain: string;
  strain_id: string | null;
  lifecycle_state: BatchLifecycleState;
  production_path: 'flower' | 'fresh_frozen' | null;
  status: string;
  harvest_date: string | null;
  clone_date: string | null;
  initial_weight_grams: number | null;
  fresh_frozen_weight_grams: number;
  quality_grade_id: string | null;
  is_quarantined: boolean;
  room: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Timestamps for stage duration calculation
  veg_started_at: string | null;
  flower_started_at: string | null;
  drying_started_at: string | null;
  bucking_started_at: string | null;
  trimming_started_at: string | null;
  packaging_started_at: string | null;
  fresh_frozen_at: string | null;
  lab_started_at: string | null;
  // Joined data
  coa_status: 'active' | 'inactive' | 'none';
  plant_group_count: number;
}

export interface PipelineColumn {
  stage: BatchLifecycleState;
  label: string;
  batches: PipelineBatch[];
  path: 'cultivation' | 'flower' | 'ff_lab';
}

const STAGE_LABELS: Record<BatchLifecycleState, string> = {
  clone: 'Clone',
  veg: 'Veg',
  flower: 'Flower',
  drying: 'Drying',
  bucking: 'Bucking',
  trimming: 'Trimming',
  bulk: 'Bulk',
  packaging: 'Packaging',
  packaged: 'Packaged',
  fresh_frozen: 'Fresh Frozen',
  lab: 'Lab',
  depleted: 'Depleted',
  archived: 'Archived',
};

/** Returns the timestamp field that marks entry into a lifecycle stage */
function getStageEntryTimestamp(batch: PipelineBatch): string | null {
  switch (batch.lifecycle_state) {
    case 'clone': return batch.clone_date;
    case 'veg': return batch.veg_started_at;
    case 'flower': return batch.flower_started_at;
    case 'drying': return batch.drying_started_at;
    case 'bucking': return batch.bucking_started_at;
    case 'trimming': return batch.trimming_started_at;
    case 'packaging': return batch.packaging_started_at;
    case 'fresh_frozen': return batch.fresh_frozen_at;
    case 'lab': return batch.lab_started_at;
    default: return batch.updated_at;
  }
}

/** Days in the current lifecycle stage */
export function getDaysInStage(batch: PipelineBatch): number {
  const entry = getStageEntryTimestamp(batch);
  if (!entry) return 0;
  const ms = Date.now() - new Date(entry).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function useBatchPipeline() {
  const [batches, setBatches] = useState<PipelineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPipeline() {
    try {
      setLoading(true);
      setError(null);

      // Fetch active batches with COA status via a left join
      const { data: batchData, error: batchErr } = await supabase
        .from('batch_registry')
        .select(`
          id, batch_number, strain, strain_id, lifecycle_state, production_path,
          status, harvest_date, clone_date, initial_weight_grams, fresh_frozen_weight_grams,
          quality_grade_id, is_quarantined, room, notes, created_at, updated_at,
          veg_started_at, flower_started_at, drying_started_at, bucking_started_at,
          trimming_started_at, packaging_started_at, fresh_frozen_at, lab_started_at
        `)
        .eq('status', 'active')
        .order('batch_number');

      if (batchErr) throw batchErr;

      // Get COA status for each batch
      const batchIds = (batchData || []).map(b => b.id);
      const { data: coaData } = await supabase
        .from('certificates_of_analysis')
        .select('batch_id, is_active')
        .in('batch_id', batchIds)
        .eq('is_active', true);

      const coaSet = new Set((coaData || []).map(c => c.batch_id));

      // Get plant group counts per batch
      const { data: pgData } = await supabase
        .from('plant_groups')
        .select('batch_registry_id')
        .in('batch_registry_id', batchIds);

      const pgCounts = new Map<string, number>();
      (pgData || []).forEach(pg => {
        const count = pgCounts.get(pg.batch_registry_id) || 0;
        pgCounts.set(pg.batch_registry_id, count + 1);
      });

      const pipeline: PipelineBatch[] = (batchData || []).map(b => ({
        ...b,
        lifecycle_state: b.lifecycle_state as BatchLifecycleState,
        production_path: b.production_path as 'flower' | 'fresh_frozen' | null,
        coa_status: coaSet.has(b.id) ? 'active' as const : 'none' as const,
        plant_group_count: pgCounts.get(b.id) || 0,
      }));

      setBatches(pipeline);
    } catch (err: any) {
      setError(err.message || 'Failed to load pipeline');
      console.error('Pipeline load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipeline();
  }, []);

  const columns = useMemo((): PipelineColumn[] => {
    const cultivationCols: PipelineColumn[] = CULTIVATION_STAGES.map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      batches: batches.filter(b => b.lifecycle_state === stage),
      path: 'cultivation' as const,
    }));

    const flowerCols: PipelineColumn[] = FLOWER_PATH_STAGES.map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      batches: batches.filter(b => b.lifecycle_state === stage),
      path: 'flower' as const,
    }));

    const ffLabCols: PipelineColumn[] = FF_LAB_STAGES.map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      batches: batches.filter(b => b.lifecycle_state === stage),
      path: 'ff_lab' as const,
    }));

    return [...cultivationCols, ...flowerCols, ...ffLabCols];
  }, [batches]);

  const stats = useMemo(() => ({
    total: batches.length,
    cultivation: batches.filter(b => CULTIVATION_STAGES.includes(b.lifecycle_state)).length,
    flowerPath: batches.filter(b => FLOWER_PATH_STAGES.includes(b.lifecycle_state)).length,
    ffLab: batches.filter(b => FF_LAB_STAGES.includes(b.lifecycle_state)).length,
    quarantined: batches.filter(b => b.is_quarantined).length,
    strains: new Set(batches.map(b => b.strain)).size,
  }), [batches]);

  return {
    batches,
    columns,
    stats,
    loading,
    error,
    reload: loadPipeline,
  };
}
