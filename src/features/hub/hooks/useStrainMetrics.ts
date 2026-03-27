import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface StrainYieldMetrics {
  strain: string;
  harvest_batch_count: number;
  avg_wet_per_plant: number | null;
  stddev_wet_per_plant: number | null;
  avg_wet_per_sqft_room: number | null;
  drying_batch_count: number;
  avg_dry_wet_ratio: number | null;
  stddev_dry_wet_ratio: number | null;
  bucking_batch_count: number;
  avg_buck_yield_ratio: number | null;
  avg_buck_flower_ratio: number | null;
  avg_buck_smalls_ratio: number | null;
  trim_batch_count: number;
  avg_trim_yield_ratio: number | null;
  avg_trim_bigs_ratio: number | null;
  avg_trim_smalls_ratio: number | null;
  avg_overall_conversion_ratio: number | null;
}

// Global fallback ratios when a strain has no history
// Derived from the aggregate across all strains in the DB
export const FALLBACK_METRICS = {
  avg_wet_per_plant: 1550, // grams
  avg_dry_wet_ratio: 0.215,
  avg_buck_yield_ratio: 0.68,
  avg_trim_yield_ratio: 0.82,
} as const;

export function useStrainMetrics() {
  const [metrics, setMetrics] = useState<StrainYieldMetrics[]>([]);
  const [metricsMap, setMetricsMap] = useState<Map<string, StrainYieldMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryErr } = await supabase
        .from('v_strain_yield_metrics')
        .select('*');

      if (queryErr) throw queryErr;

      const parsed: StrainYieldMetrics[] = (data || []).map(row => ({
        strain: row.strain,
        harvest_batch_count: Number(row.harvest_batch_count) || 0,
        avg_wet_per_plant: row.avg_wet_per_plant ? Number(row.avg_wet_per_plant) : null,
        stddev_wet_per_plant: row.stddev_wet_per_plant ? Number(row.stddev_wet_per_plant) : null,
        avg_wet_per_sqft_room: row.avg_wet_per_sqft_room ? Number(row.avg_wet_per_sqft_room) : null,
        drying_batch_count: Number(row.drying_batch_count) || 0,
        avg_dry_wet_ratio: row.avg_dry_wet_ratio ? Number(row.avg_dry_wet_ratio) : null,
        stddev_dry_wet_ratio: row.stddev_dry_wet_ratio ? Number(row.stddev_dry_wet_ratio) : null,
        bucking_batch_count: Number(row.bucking_batch_count) || 0,
        avg_buck_yield_ratio: row.avg_buck_yield_ratio ? Number(row.avg_buck_yield_ratio) : null,
        avg_buck_flower_ratio: row.avg_buck_flower_ratio ? Number(row.avg_buck_flower_ratio) : null,
        avg_buck_smalls_ratio: row.avg_buck_smalls_ratio ? Number(row.avg_buck_smalls_ratio) : null,
        trim_batch_count: Number(row.trim_batch_count) || 0,
        avg_trim_yield_ratio: row.avg_trim_yield_ratio ? Number(row.avg_trim_yield_ratio) : null,
        avg_trim_bigs_ratio: row.avg_trim_bigs_ratio ? Number(row.avg_trim_bigs_ratio) : null,
        avg_trim_smalls_ratio: row.avg_trim_smalls_ratio ? Number(row.avg_trim_smalls_ratio) : null,
        avg_overall_conversion_ratio: row.avg_overall_conversion_ratio ? Number(row.avg_overall_conversion_ratio) : null,
      }));

      setMetrics(parsed);

      const map = new Map<string, StrainYieldMetrics>();
      parsed.forEach(m => map.set(m.strain, m));
      setMetricsMap(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load strain metrics');
      console.error('Strain metrics load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  /** Get metrics for a specific strain, with fallbacks for missing data */
  function getMetricsForStrain(strain: string): StrainYieldMetrics & { usingFallbacks: boolean } {
    const m = metricsMap.get(strain);
    if (m && m.harvest_batch_count > 0) {
      return { ...m, usingFallbacks: false };
    }
    return {
      strain,
      harvest_batch_count: 0,
      avg_wet_per_plant: FALLBACK_METRICS.avg_wet_per_plant,
      stddev_wet_per_plant: null,
      avg_wet_per_sqft_room: null,
      drying_batch_count: 0,
      avg_dry_wet_ratio: FALLBACK_METRICS.avg_dry_wet_ratio,
      stddev_dry_wet_ratio: null,
      bucking_batch_count: 0,
      avg_buck_yield_ratio: FALLBACK_METRICS.avg_buck_yield_ratio,
      avg_buck_flower_ratio: null,
      avg_buck_smalls_ratio: null,
      trim_batch_count: 0,
      avg_trim_yield_ratio: FALLBACK_METRICS.avg_trim_yield_ratio,
      avg_trim_bigs_ratio: null,
      avg_trim_smalls_ratio: null,
      avg_overall_conversion_ratio: null,
      usingFallbacks: true,
    };
  }

  return {
    metrics,
    metricsMap,
    getMetricsForStrain,
    loading,
    error,
    reload: loadMetrics,
  };
}
