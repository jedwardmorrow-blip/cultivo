import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { StrainYieldMetrics } from './useStrainMetrics';
import { FALLBACK_METRICS } from './useStrainMetrics';
import type { BatchLifecycleState } from '@/types/batch.types';
import { CULTIVATION_STAGES } from '@/types/batch.types';

/** Prediction for a single batch at each stage of the pipeline */
export interface BatchPrediction {
  batch_id: string;
  batch_number: string;
  strain: string;
  lifecycle_state: BatchLifecycleState;
  plant_count: number;
  room_code: string | null;
  room_sqft: number | null;
  occupancy_fraction: number | null;
  effective_sqft: number | null;

  // Predicted weights at each stage (grams)
  predicted_wet: number | null;
  predicted_dry: number | null;
  predicted_bucked: number | null;
  predicted_trimmed: number | null;

  // Actual weights where known
  actual_wet: number | null;
  actual_dry: number | null;
  actual_bucked: number | null;
  actual_trimmed: number | null;

  // Variance: (actual - predicted) / predicted
  variance_wet: number | null;
  variance_dry: number | null;
  variance_bucked: number | null;
  variance_trimmed: number | null;

  // Confidence based on sample size
  confidence: 'high' | 'medium' | 'low' | 'fallback';

  // Which ratios were used
  using_fallbacks: boolean;
}

interface RoomPlantData {
  batch_id: string;
  batch_number: string;
  strain: string;
  lifecycle_state: string;
  plant_count: number;
  room_code: string | null;
  room_sqft: number | null;
  room_total_plants: number;
}

interface BatchActuals {
  batch_id: string;
  wet_weight: number | null;
  dry_weight: number | null;
  bucked_output: number | null;
  trimmed_output: number | null;
}

function getConfidence(m: StrainYieldMetrics & { usingFallbacks: boolean }): BatchPrediction['confidence'] {
  if (m.usingFallbacks) return 'fallback';
  if (m.harvest_batch_count >= 5) return 'high';
  if (m.harvest_batch_count >= 2) return 'medium';
  return 'low';
}

function variance(actual: number | null, predicted: number | null): number | null {
  if (actual == null || predicted == null || predicted === 0) return null;
  return (actual - predicted) / predicted;
}

export function useBatchPredictions(
  strainMetricsMap: Map<string, StrainYieldMetrics>,
  getMetricsForStrain: (strain: string) => StrainYieldMetrics & { usingFallbacks: boolean },
  metricsLoading: boolean
) {
  const [roomData, setRoomData] = useState<RoomPlantData[]>([]);
  const [actuals, setActuals] = useState<Map<string, BatchActuals>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (metricsLoading) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Get active batches with their plant groups → room → sqft
      const { data: batchPlantData, error: bpErr } = await supabase
        .rpc('get_batch_room_occupancy');

      // If the RPC doesn't exist, fall back to manual query
      let roomRows: RoomPlantData[] = [];
      if (bpErr || !batchPlantData) {
        // Manual approach: get batch → plant_groups → grow_rooms
        const { data: batches } = await supabase
          .from('batch_registry')
          .select('id, batch_number, strain, lifecycle_state')
          .eq('status', 'active');

        if (batches && batches.length > 0) {
          const batchIds = batches.map(b => b.id);

          // Get plant groups with room info
          const { data: pgData } = await supabase
            .from('plant_groups')
            .select('batch_registry_id, plant_count, grow_room_id')
            .in('batch_registry_id', batchIds);

          // Get room details
          const roomIds = [...new Set((pgData || []).map(pg => pg.grow_room_id).filter(Boolean))];
          const { data: rooms } = roomIds.length > 0
            ? await supabase.from('grow_rooms').select('id, room_code, square_footage').in('id', roomIds)
            : { data: [] };

          const roomMap = new Map((rooms || []).map(r => [r.id, r]));

          // Compute total plants per room (for occupancy fraction)
          const roomTotalPlants = new Map<string, number>();
          (pgData || []).forEach(pg => {
            if (pg.grow_room_id) {
              const current = roomTotalPlants.get(pg.grow_room_id) || 0;
              roomTotalPlants.set(pg.grow_room_id, current + (pg.plant_count || 0));
            }
          });

          // Aggregate per batch: total plants, primary room
          const batchAgg = new Map<string, { plants: number; roomId: string | null }>();
          (pgData || []).forEach(pg => {
            const existing = batchAgg.get(pg.batch_registry_id) || { plants: 0, roomId: null };
            existing.plants += pg.plant_count || 0;
            // Pick the flower room if available (most relevant for yield)
            if (pg.grow_room_id) {
              const room = roomMap.get(pg.grow_room_id);
              if (room && room.square_footage) {
                existing.roomId = pg.grow_room_id;
              }
            }
            batchAgg.set(pg.batch_registry_id, existing);
          });

          roomRows = batches.map(b => {
            const agg = batchAgg.get(b.id);
            const room = agg?.roomId ? roomMap.get(agg.roomId) : null;
            const totalInRoom = agg?.roomId ? (roomTotalPlants.get(agg.roomId) || 0) : 0;
            return {
              batch_id: b.id,
              batch_number: b.batch_number,
              strain: b.strain,
              lifecycle_state: b.lifecycle_state,
              plant_count: agg?.plants || 0,
              room_code: room?.room_code || null,
              room_sqft: room?.square_footage || null,
              room_total_plants: totalInRoom,
            };
          });
        }
      }

      setRoomData(roomRows);

      // 2. Get actuals for batches that have progressed through stages
      const batchIds = roomRows.map(r => r.batch_id);

      if (batchIds.length > 0) {
        // Harvest actuals (wet weight)
        const { data: harvestData } = await supabase
          .from('harvest_sessions')
          .select('batch_registry_id, wet_weight_grams')
          .in('batch_registry_id', batchIds)
          .in('session_status', ['completed', 'finalized']);

        // Binning actuals (dry weight)
        const { data: binData } = await supabase
          .from('binning_sessions')
          .select('batch_registry_id, dry_weight_grams')
          .in('batch_registry_id', batchIds)
          .eq('session_status', 'completed');

        // Bucking actuals
        const { data: buckData } = await supabase
          .from('bucking_sessions')
          .select('batch_registry_id, bucked_flower_grams, bucked_smalls_grams')
          .in('batch_registry_id', batchIds)
          .eq('session_status', 'completed');

        // Trim actuals
        const { data: trimData } = await supabase
          .from('trim_sessions')
          .select('batch_registry_id, big_buds_grams, small_buds_grams')
          .in('batch_registry_id', batchIds)
          .eq('session_status', 'completed');

        const actualsMap = new Map<string, BatchActuals>();

        // Initialize all
        batchIds.forEach(id => {
          actualsMap.set(id, { batch_id: id, wet_weight: null, dry_weight: null, bucked_output: null, trimmed_output: null });
        });

        // Sum harvest wet weights per batch
        (harvestData || []).forEach(h => {
          const a = actualsMap.get(h.batch_registry_id)!;
          a.wet_weight = (a.wet_weight || 0) + Number(h.wet_weight_grams || 0);
        });

        // Sum dry weights
        (binData || []).forEach(b => {
          const a = actualsMap.get(b.batch_registry_id)!;
          a.dry_weight = (a.dry_weight || 0) + Number(b.dry_weight_grams || 0);
        });

        // Sum bucked output (flower + smalls)
        (buckData || []).forEach(b => {
          const a = actualsMap.get(b.batch_registry_id)!;
          a.bucked_output = (a.bucked_output || 0)
            + Number(b.bucked_flower_grams || 0)
            + Number(b.bucked_smalls_grams || 0);
        });

        // Sum trimmed output (bigs + smalls)
        (trimData || []).forEach(t => {
          const a = actualsMap.get(t.batch_registry_id)!;
          a.trimmed_output = (a.trimmed_output || 0)
            + Number(t.big_buds_grams || 0)
            + Number(t.small_buds_grams || 0);
        });

        // Clean up: if sum is 0 and nothing was added, set back to null
        actualsMap.forEach((a) => {
          if (a.wet_weight === 0) a.wet_weight = null;
          if (a.dry_weight === 0) a.dry_weight = null;
          if (a.bucked_output === 0) a.bucked_output = null;
          if (a.trimmed_output === 0) a.trimmed_output = null;
        });

        setActuals(actualsMap);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load batch predictions');
      console.error('Batch predictions load error:', err);
    } finally {
      setLoading(false);
    }
  }, [metricsLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const predictions = useMemo((): Map<string, BatchPrediction> => {
    const map = new Map<string, BatchPrediction>();
    if (metricsLoading || roomData.length === 0) return map;

    roomData.forEach(rd => {
      const strainM = getMetricsForStrain(rd.strain);
      const a = actuals.get(rd.batch_id) || { batch_id: rd.batch_id, wet_weight: null, dry_weight: null, bucked_output: null, trimmed_output: null };

      const occupancy = (rd.room_total_plants > 0 && rd.plant_count > 0)
        ? rd.plant_count / rd.room_total_plants
        : null;

      const effectiveSqft = (occupancy != null && rd.room_sqft)
        ? rd.room_sqft * occupancy
        : null;

      // Predicted wet: prefer per-plant calculation (more reliable than per-sqft for multi-strain rooms)
      const wetPerPlant = strainM.avg_wet_per_plant ?? FALLBACK_METRICS.avg_wet_per_plant;
      const predictedWet = rd.plant_count > 0 ? wetPerPlant * rd.plant_count : null;

      // Cascade: use actual if available, else predict from upstream
      const dryRatio = strainM.avg_dry_wet_ratio ?? FALLBACK_METRICS.avg_dry_wet_ratio;
      const buckRatio = strainM.avg_buck_yield_ratio ?? FALLBACK_METRICS.avg_buck_yield_ratio;
      const trimRatio = strainM.avg_trim_yield_ratio ?? FALLBACK_METRICS.avg_trim_yield_ratio;

      // Wet: use actual if harvested, else predicted
      const wetBase = a.wet_weight ?? predictedWet;

      // Dry: use actual if dried, else predict from wet base
      const predictedDry = wetBase != null ? wetBase * dryRatio : null;
      const dryBase = a.dry_weight ?? predictedDry;

      // Bucked: use actual if bucked, else predict from dry base
      const predictedBucked = dryBase != null ? dryBase * buckRatio : null;
      const buckedBase = a.bucked_output ?? predictedBucked;

      // Trimmed: use actual if trimmed, else predict from bucked base
      const predictedTrimmed = buckedBase != null ? buckedBase * trimRatio : null;

      map.set(rd.batch_id, {
        batch_id: rd.batch_id,
        batch_number: rd.batch_number,
        strain: rd.strain,
        lifecycle_state: rd.lifecycle_state as BatchLifecycleState,
        plant_count: rd.plant_count,
        room_code: rd.room_code,
        room_sqft: rd.room_sqft,
        occupancy_fraction: occupancy,
        effective_sqft: effectiveSqft,
        predicted_wet: predictedWet,
        predicted_dry: predictedWet != null ? predictedWet * dryRatio : null,
        predicted_bucked: predictedWet != null ? predictedWet * dryRatio * buckRatio : null,
        predicted_trimmed: predictedWet != null ? predictedWet * dryRatio * buckRatio * trimRatio : null,
        actual_wet: a.wet_weight,
        actual_dry: a.dry_weight,
        actual_bucked: a.bucked_output,
        actual_trimmed: a.trimmed_output,
        variance_wet: variance(a.wet_weight, predictedWet),
        variance_dry: variance(a.dry_weight, predictedWet != null ? predictedWet * dryRatio : null),
        variance_bucked: variance(a.bucked_output, predictedWet != null ? predictedWet * dryRatio * buckRatio : null),
        variance_trimmed: variance(a.trimmed_output, predictedWet != null ? predictedWet * dryRatio * buckRatio * trimRatio : null),
        confidence: getConfidence(strainM),
        using_fallbacks: strainM.usingFallbacks,
      });
    });

    return map;
  }, [roomData, actuals, strainMetricsMap, metricsLoading]);

  return {
    predictions,
    loading,
    error,
    reload: loadData,
  };
}
