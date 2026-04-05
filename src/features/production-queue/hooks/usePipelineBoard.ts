import { useMemo } from 'react';
import { useAllBatches } from './useAllBatches';
import type { BatchPlanData } from '../types';

export type PipelineStage = 'binned' | 'bucked' | 'bulk' | 'trimming' | 'packaged';

export interface PipelineColumnData {
  stage: PipelineStage;
  label: string;
  batches: BatchPlanData[];
  totalWeightG: number;
  batchCount: number;
}

const STAGES: { stage: PipelineStage; label: string; key: keyof BatchPlanData }[] = [
  { stage: 'binned',   label: 'Binned',   key: 'binned_g' },
  { stage: 'bucked',   label: 'Bucked',   key: 'bucked_g' },
  { stage: 'bulk',     label: 'Bulk',     key: 'bulk_g' },
  { stage: 'trimming', label: 'Trimming', key: 'trim_g' },
  { stage: 'packaged', label: 'Packaged', key: 'packaged_g' },
];

/**
 * Transforms batch planning data into pipeline Kanban columns.
 * A batch appears in a column if it has >0g in that stage.
 */
export function usePipelineBoard() {
  const { batches, loading, error, refetch } = useAllBatches();

  const columns = useMemo<PipelineColumnData[]>(() => {
    return STAGES.map(({ stage, label, key }) => {
      const inStage = batches.filter(b => (b[key] as number) > 0);
      const totalWeightG = inStage.reduce((sum, b) => sum + (b[key] as number), 0);
      return {
        stage,
        label,
        batches: inStage.sort((a, b) => (b[key] as number) - (a[key] as number)),
        totalWeightG,
        batchCount: inStage.length,
      };
    });
  }, [batches]);

  const totalBatches = batches.length;

  return { columns, totalBatches, loading, error, refresh: refetch };
}
