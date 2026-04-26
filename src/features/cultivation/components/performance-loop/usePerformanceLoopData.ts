import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// usePerformanceLoopData
// Reads the six locked Performance Loop pattern-panel views (vp_*)
// from prod via PostgREST. Views were created 2026-04-25 per the
// Path C decision (read-only, additive, reversible). The canonical
// SQL behind each view is pinned in brain row
// pattern_panel_locked_queries_2026_04_25.
// ═══════════════════════════════════════════════════════════════════

export interface TrimRateRow {
  strain: string;
  n: number;
  avg_gh: number;
  sd: number | null;
}

export interface ConversionRow {
  strain: string;
  n: number;
  pct_to_flower: number;
  pct_to_smalls: number;
  pct_waste: number;
}

export interface RoomYieldRow {
  room: string;
  harvests: number;
  avg_g_per_plant: number;
}

export interface DowPackagingRow {
  dow: number;
  dow_name: string;
  days: number;
  n_sessions: number;
  total_units: number;
  avg_per_session: number;
}

export interface VarianceRow {
  strain: string;
  n: number;
  avg_var_pct: number;
}

export interface TrimmerSpeedRow {
  trimmer_name: string;
  n: number;
  avg_gh: number;
}

export interface PerformanceLoopData {
  trimRateByStrain: TrimRateRow[];
  conversionByStrain: ConversionRow[];
  yieldByRoom: RoomYieldRow[];
  packagingByDow: DowPackagingRow[];
  varianceByStrain: VarianceRow[];
  trimmerSpeed: TrimmerSpeedRow[];
}

interface UsePerformanceLoopDataResult {
  data: PerformanceLoopData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

async function readView<T>(view: string): Promise<T[]> {
  const { data, error } = await supabase.from(view).select('*');
  if (error) throw new Error(`${view}: ${error.message}`);
  return (data ?? []) as T[];
}

export function usePerformanceLoopData(): UsePerformanceLoopDataResult {
  const [data, setData] = useState<PerformanceLoopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        trimRateByStrain,
        conversionByStrain,
        yieldByRoom,
        packagingByDow,
        varianceByStrain,
        trimmerSpeed,
      ] = await Promise.all([
        readView<TrimRateRow>('vp_trim_rate_by_strain'),
        readView<ConversionRow>('vp_conversion_by_strain'),
        readView<RoomYieldRow>('vp_yield_by_room'),
        readView<DowPackagingRow>('vp_packaging_by_dow'),
        readView<VarianceRow>('vp_variance_by_strain'),
        readView<TrimmerSpeedRow>('vp_trimmer_speed'),
      ]);
      setData({
        trimRateByStrain,
        conversionByStrain,
        yieldByRoom,
        packagingByDow,
        varianceByStrain,
        trimmerSpeed,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refresh: fetch };
}
