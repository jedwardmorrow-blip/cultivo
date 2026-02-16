import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getInventoryPipeline, type PipelineRow } from '../services/dashboard.service';

const STAGES = ['Binned', 'Bucked', 'Trimmed', 'Packaged'] as const;
export type StageName = typeof STAGES[number];

export interface BatchStageData {
  batchId: string;
  batchNumber: string;
  stages: Record<StageName, { weight: number; units: number; items: number }>;
}

export interface StrainPipelineData {
  strain: string;
  batches: BatchStageData[];
  totals: Record<StageName, { weight: number; units: number; items: number }>;
}

export interface PipelineTotals {
  stages: Record<StageName, { weight: number; units: number; items: number }>;
  maxByStage: Record<StageName, number>;
}

const emptyStageRecord = (): Record<StageName, { weight: number; units: number; items: number }> => ({
  Binned: { weight: 0, units: 0, items: 0 },
  Bucked: { weight: 0, units: 0, items: 0 },
  Trimmed: { weight: 0, units: 0, items: 0 },
  Packaged: { weight: 0, units: 0, items: 0 },
});

function transformPipelineData(rows: PipelineRow[]): {
  strains: StrainPipelineData[];
  grandTotals: PipelineTotals;
} {
  const strainMap = new Map<string, Map<string, BatchStageData>>();

  for (const row of rows) {
    const stage = row.stage as StageName;
    if (!STAGES.includes(stage)) continue;

    if (!strainMap.has(row.strain)) {
      strainMap.set(row.strain, new Map());
    }
    const batchMap = strainMap.get(row.strain)!;

    if (!batchMap.has(row.batch_id)) {
      batchMap.set(row.batch_id, {
        batchId: row.batch_id,
        batchNumber: row.batch_number,
        stages: emptyStageRecord(),
      });
    }
    const batch = batchMap.get(row.batch_id)!;
    batch.stages[stage] = {
      weight: Number(row.weight_grams) || 0,
      units: Number(row.unit_count) || 0,
      items: Number(row.item_count) || 0,
    };
  }

  const strains: StrainPipelineData[] = [];
  const grandStages = emptyStageRecord();
  const maxByStage: Record<StageName, number> = { Binned: 0, Bucked: 0, Trimmed: 0, Packaged: 0 };

  for (const [strain, batchMap] of strainMap) {
    const batches = Array.from(batchMap.values());
    const totals = emptyStageRecord();

    for (const batch of batches) {
      for (const stage of STAGES) {
        totals[stage].weight += batch.stages[stage].weight;
        totals[stage].units += batch.stages[stage].units;
        totals[stage].items += batch.stages[stage].items;
      }
    }

    for (const stage of STAGES) {
      grandStages[stage].weight += totals[stage].weight;
      grandStages[stage].units += totals[stage].units;
      grandStages[stage].items += totals[stage].items;

      const strainValue = stage === 'Packaged' ? totals[stage].units : totals[stage].weight;
      if (strainValue > maxByStage[stage]) {
        maxByStage[stage] = strainValue;
      }
    }

    strains.push({ strain, batches, totals });
  }

  strains.sort((a, b) => a.strain.localeCompare(b.strain));

  return {
    strains,
    grandTotals: { stages: grandStages, maxByStage },
  };
}

export function useInventoryPipeline() {
  const [rawData, setRawData] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data, error: err } = await getInventoryPipeline();
    if (err) {
      setError('Failed to load pipeline data');
    } else {
      setRawData(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('inventory-pipeline-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const { strains, grandTotals } = useMemo(() => transformPipelineData(rawData), [rawData]);

  return { strains, grandTotals, loading, error, refresh: loadData };
}

export { STAGES };
