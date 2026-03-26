import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgePressure = 'aging' | 'watch' | 'normal' | 'fresh';
export type Confidence = 'calibrated' | 'estimated';

/** Per-batch data from v_sku_yield */
export interface BatchYield {
  batch_id: string;
  batch_number: string;
  strain: string;
  strain_id: string | null;
  harvest_date: string;
  age_days: number;
  lifecycle_state: string;

  // Current inventory by stage (grams)
  binned_g: number;
  bucked_flower_g: number;
  bucked_smalls_g: number;
  bulk_flower_g: number;
  bulk_smalls_g: number;
  trim_g: number;
  packaged_g: number;

  // Existing packaged units by SKU
  existing_3_5g: number;
  existing_14g: number;
  existing_1lb: number;
  existing_preroll: number;
  existing_other_units: number;

  // Totals
  total_remaining_g: number;
  est_packageable_g: number;

  // SKU projections (existing + estimated from pipeline)
  proj_3_5g: number;
  proj_14g: number;
  proj_1lb: number;
  proj_preroll: number;
  proj_trim_g: number;
  est_loose_bulk_g: number;

  // Age
  age_pressure: AgePressure;
}

/** Conversion funnel ratios for a strain (shared across all batches of that strain) */
export interface StrainConversion {
  // Bucking: binned → flower + smalls + waste
  buck_flower_pct: number;
  buck_smalls_pct: number;
  buck_waste_pct: number;
  buck_sessions: number;
  buck_confidence: Confidence;

  // Trimming: bucked → bigs + smalls + trim + waste
  trim_bigs_pct: number;
  trim_smalls_pct: number;
  trim_trim_pct: number;
  trim_waste_pct: number;
  trim_sessions: number;
  trim_confidence: Confidence;

  // Packaging: bulk → 3.5g + 14g + 1lb
  pkg_pct_3_5g: number;
  pkg_pct_14g: number;
  pkg_pct_1lb: number;
  pkg_sessions: number;
  pkg_confidence: Confidence;
}

/** Strain-level grouping with conversion funnel + batches */
export interface StrainAllocation {
  strain: string;
  strain_id: string | null;
  conversion: StrainConversion;
  batches: BatchYield[];

  // Aggregated across batches
  batch_count: number;
  total_remaining_g: number;
  total_trim_g: number;
  aging_batches: number;
  oldest_age_days: number;

  // Total projected SKUs across all batches
  total_proj_3_5g: number;
  total_proj_14g: number;
  total_proj_1lb: number;
  total_proj_preroll: number;
  total_proj_trim_g: number;
  total_est_loose_bulk_g: number;
}

/** Global summary */
export interface SkuYieldSummary {
  total_batches: number;
  total_strains: number;
  aging_batches: number;
  total_remaining_g: number;
  total_proj_3_5g: number;
  total_proj_14g: number;
  total_proj_1lb: number;
  total_proj_preroll: number;
  total_proj_trim_g: number;
}

// ─── Age pressure styles ────────────────────────────────────────────────────

export const AGE_STYLES: Record<AgePressure, { bg: string; text: string; border: string; dot: string; label: string }> = {
  aging:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-400',     label: '6+ months' },
  watch:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   label: '4-6 months' },
  normal: { bg: 'bg-gray-500/10',    text: 'text-gray-400',    border: 'border-gray-500/20',    dot: 'bg-gray-400',    label: '2-4 months' },
  fresh:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: '<2 months' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  return Number(v) || 0;
}

function parseRow(r: Record<string, unknown>): BatchYield & { _conversion: StrainConversion } {
  return {
    batch_id: r.batch_id as string,
    batch_number: r.batch_number as string,
    strain: r.strain as string,
    strain_id: r.strain_id as string | null,
    harvest_date: r.harvest_date as string,
    age_days: num(r.age_days),
    lifecycle_state: r.lifecycle_state as string,

    binned_g: num(r.binned_g),
    bucked_flower_g: num(r.bucked_flower_g),
    bucked_smalls_g: num(r.bucked_smalls_g),
    bulk_flower_g: num(r.bulk_flower_g),
    bulk_smalls_g: num(r.bulk_smalls_g),
    trim_g: num(r.trim_g),
    packaged_g: num(r.packaged_g),

    existing_3_5g: num(r.existing_3_5g),
    existing_14g: num(r.existing_14g),
    existing_1lb: num(r.existing_1lb),
    existing_preroll: num(r.existing_preroll),
    existing_other_units: num(r.existing_other_units),

    total_remaining_g: num(r.total_remaining_g),
    est_packageable_g: num(r.est_packageable_g),

    proj_3_5g: num(r.proj_3_5g),
    proj_14g: num(r.proj_14g),
    proj_1lb: num(r.proj_1lb),
    proj_preroll: num(r.proj_preroll),
    proj_trim_g: num(r.proj_trim_g),
    est_loose_bulk_g: num(r.est_loose_bulk_g),

    age_pressure: (r.age_pressure as AgePressure) || 'normal',

    _conversion: {
      buck_flower_pct: num(r.buck_flower_pct),
      buck_smalls_pct: num(r.buck_smalls_pct),
      buck_waste_pct: num(r.buck_waste_pct),
      buck_sessions: num(r.buck_sessions),
      buck_confidence: (r.buck_confidence as Confidence) || 'estimated',

      trim_bigs_pct: num(r.trim_bigs_pct),
      trim_smalls_pct: num(r.trim_smalls_pct),
      trim_trim_pct: num(r.trim_trim_pct),
      trim_waste_pct: num(r.trim_waste_pct),
      trim_sessions: num(r.trim_sessions),
      trim_confidence: (r.trim_confidence as Confidence) || 'estimated',

      pkg_pct_3_5g: num(r.pkg_pct_3_5g),
      pkg_pct_14g: num(r.pkg_pct_14g),
      pkg_pct_1lb: num(r.pkg_pct_1lb),
      pkg_sessions: num(r.pkg_sessions),
      pkg_confidence: (r.pkg_confidence as Confidence) || 'estimated',
    },
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSkuYield() {
  const [rawData, setRawData] = useState<(BatchYield & { _conversion: StrainConversion })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const { data: rows, error: queryError } = await supabase
        .from('v_sku_yield')
        .select('*');

      if (queryError) throw queryError;
      if (!mountedRef.current) return;

      setRawData((rows || []).map((r: Record<string, unknown>) => parseRow(r)));
      setError(null);
    } catch (e) {
      if (mountedRef.current) setError(e as Error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('sku-yield')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucking_sessions' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trim_sessions' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packaging_sessions' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_registry' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  // Group by strain
  const byStrain = useMemo(() => {
    const map = new Map<string, StrainAllocation>();

    for (const b of rawData) {
      if (!map.has(b.strain)) {
        map.set(b.strain, {
          strain: b.strain,
          strain_id: b.strain_id,
          conversion: b._conversion,
          batches: [],
          batch_count: 0,
          total_remaining_g: 0,
          total_trim_g: 0,
          aging_batches: 0,
          oldest_age_days: 0,
          total_proj_3_5g: 0,
          total_proj_14g: 0,
          total_proj_1lb: 0,
          total_proj_preroll: 0,
          total_proj_trim_g: 0,
          total_est_loose_bulk_g: 0,
        });
      }

      const s = map.get(b.strain)!;
      s.batches.push(b);
      s.batch_count++;
      s.total_remaining_g += b.total_remaining_g;
      s.total_trim_g += b.trim_g;
      s.oldest_age_days = Math.max(s.oldest_age_days, b.age_days);
      if (b.age_pressure === 'aging') s.aging_batches++;
      s.total_proj_3_5g += b.proj_3_5g;
      s.total_proj_14g += b.proj_14g;
      s.total_proj_1lb += b.proj_1lb;
      s.total_proj_preroll += b.proj_preroll;
      s.total_proj_trim_g += b.proj_trim_g;
      s.total_est_loose_bulk_g += b.est_loose_bulk_g;
    }

    return map;
  }, [rawData]);

  // Sorted strain list (by total remaining, descending)
  const strains = useMemo(() => {
    return Array.from(byStrain.values()).sort((a, b) => b.total_remaining_g - a.total_remaining_g);
  }, [byStrain]);

  // Global summary
  const summary = useMemo<SkuYieldSummary>(() => {
    let aging = 0;
    const strainSet = new Set<string>();

    for (const b of rawData) {
      strainSet.add(b.strain);
      if (b.age_pressure === 'aging') aging++;
    }

    return {
      total_batches: rawData.length,
      total_strains: strainSet.size,
      aging_batches: aging,
      total_remaining_g: strains.reduce((sum, s) => sum + s.total_remaining_g, 0),
      total_proj_3_5g: strains.reduce((sum, s) => sum + s.total_proj_3_5g, 0),
      total_proj_14g: strains.reduce((sum, s) => sum + s.total_proj_14g, 0),
      total_proj_1lb: strains.reduce((sum, s) => sum + s.total_proj_1lb, 0),
      total_proj_preroll: strains.reduce((sum, s) => sum + s.total_proj_preroll, 0),
      total_proj_trim_g: strains.reduce((sum, s) => sum + s.total_proj_trim_g, 0),
    };
  }, [rawData, strains]);

  return { rawData, byStrain, strains, summary, loading, error, refresh: fetch };
}
