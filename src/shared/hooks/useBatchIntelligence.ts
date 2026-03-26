import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgePressure = 'aging' | 'watch' | 'normal' | 'fresh';
export type Confidence = 'calibrated' | 'estimated';

export interface BatchIntel {
  batch_id: string;
  batch_number: string;
  strain: string;
  strain_id: string | null;
  harvest_date: string;
  age_days: number;
  lifecycle_state: string;
  initial_weight_grams: number;
  quality_grade: string;

  // Current inventory (grams)
  binned_g: number;
  bucked_g: number;
  bulk_flower_g: number;
  bulk_smalls_g: number;
  packaged_units: number;
  packaged_g: number;
  trim_g: number;
  sellable_now_g: number;
  pipeline_raw_g: number;

  // Projected potential
  projected_from_bucked_g: number;
  projected_from_binned_g: number;
  total_potential_g: number;

  // Conversion confidence
  confidence: Confidence;
  trim_session_count: number;
  flower_pct: number;
  smalls_pct: number;

  // Batch-allocated demand
  allocated_orders: number;
  allocated_lines: number;
  allocated_units: number;
  allocated_revenue: number;

  // Strain-level unallocated demand (shared across batches)
  strain_unalloc_orders: number;
  strain_unalloc_lines: number;
  strain_unalloc_units: number;
  strain_unalloc_revenue: number;
  strain_unalloc_demand_g: number;

  // Strain daily demand
  strain_daily_demand_g: number;

  // Cultivation pipeline
  flower_plants: number;
  veg_plants: number;
  next_harvest_date: string | null;

  // Computed
  age_pressure: AgePressure;
  priority_score: number;
}

export interface StrainBatchSummary {
  strain: string;
  batches: BatchIntel[];
  batch_count: number;
  oldest_age_days: number;
  aging_batches: number;
  watch_batches: number;
  total_sellable_g: number;
  total_potential_g: number;
  allocated_revenue: number;
  unalloc_revenue: number;
  unalloc_orders: number;
  flower_plants: number;
  veg_plants: number;
  next_harvest_date: string | null;
}

export interface BatchIntelSummary {
  total_batches: number;
  total_strains: number;
  aging_batches: number;
  watch_batches: number;
  total_unalloc_revenue: number;
  total_unalloc_orders: number;
  total_sellable_g: number;
  total_potential_g: number;
}

// ─── Age pressure styles ────────────────────────────────────────────────────

export const AGE_STYLES: Record<AgePressure, { bg: string; text: string; border: string; dot: string; label: string }> = {
  aging:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-400',     label: '6+ months' },
  watch:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   label: '4-6 months' },
  normal: { bg: 'bg-gray-500/10',    text: 'text-gray-400',    border: 'border-gray-500/20',    dot: 'bg-gray-400',    label: '2-4 months' },
  fresh:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: '<2 months' },
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useBatchIntelligence() {
  const [data, setData] = useState<BatchIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const { data: rows, error: queryError } = await supabase
        .from('v_batch_intelligence')
        .select('*');

      if (queryError) throw queryError;
      if (!mountedRef.current) return;

      const parsed: BatchIntel[] = (rows || []).map((r: Record<string, unknown>) => ({
        batch_id: r.batch_id as string,
        batch_number: r.batch_number as string,
        strain: r.strain as string,
        strain_id: r.strain_id as string | null,
        harvest_date: r.harvest_date as string,
        age_days: Number(r.age_days) || 0,
        lifecycle_state: r.lifecycle_state as string,
        initial_weight_grams: Number(r.initial_weight_grams) || 0,
        quality_grade: (r.quality_grade as string) || 'UNDEFINED',

        binned_g: Number(r.binned_g) || 0,
        bucked_g: Number(r.bucked_g) || 0,
        bulk_flower_g: Number(r.bulk_flower_g) || 0,
        bulk_smalls_g: Number(r.bulk_smalls_g) || 0,
        packaged_units: Number(r.packaged_units) || 0,
        packaged_g: Number(r.packaged_g) || 0,
        trim_g: Number(r.trim_g) || 0,
        sellable_now_g: Number(r.sellable_now_g) || 0,
        pipeline_raw_g: Number(r.pipeline_raw_g) || 0,

        projected_from_bucked_g: Number(r.projected_from_bucked_g) || 0,
        projected_from_binned_g: Number(r.projected_from_binned_g) || 0,
        total_potential_g: Number(r.total_potential_g) || 0,

        confidence: (r.confidence as Confidence) || 'estimated',
        trim_session_count: Number(r.trim_session_count) || 0,
        flower_pct: Number(r.flower_pct) || 0,
        smalls_pct: Number(r.smalls_pct) || 0,

        allocated_orders: Number(r.allocated_orders) || 0,
        allocated_lines: Number(r.allocated_lines) || 0,
        allocated_units: Number(r.allocated_units) || 0,
        allocated_revenue: Number(r.allocated_revenue) || 0,

        strain_unalloc_orders: Number(r.strain_unalloc_orders) || 0,
        strain_unalloc_lines: Number(r.strain_unalloc_lines) || 0,
        strain_unalloc_units: Number(r.strain_unalloc_units) || 0,
        strain_unalloc_revenue: Number(r.strain_unalloc_revenue) || 0,
        strain_unalloc_demand_g: Number(r.strain_unalloc_demand_g) || 0,

        strain_daily_demand_g: Number(r.strain_daily_demand_g) || 0,

        flower_plants: Number(r.flower_plants) || 0,
        veg_plants: Number(r.veg_plants) || 0,
        next_harvest_date: r.next_harvest_date as string | null,

        age_pressure: (r.age_pressure as AgePressure) || 'normal',
        priority_score: Number(r.priority_score) || 0,
      }));

      setData(parsed);
      setError(null);
    } catch (e) {
      if (mountedRef.current) setError(e as Error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  // Realtime subscriptions — same tables as useStrainRunway
  useEffect(() => {
    const channel = supabase
      .channel('batch-intelligence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'package_assignments' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  // Group by strain for strain-level summaries
  const byStrain = useMemo(() => {
    const map = new Map<string, StrainBatchSummary>();
    for (const b of data) {
      if (!map.has(b.strain)) {
        map.set(b.strain, {
          strain: b.strain,
          batches: [],
          batch_count: 0,
          oldest_age_days: 0,
          aging_batches: 0,
          watch_batches: 0,
          total_sellable_g: 0,
          total_potential_g: 0,
          allocated_revenue: 0,
          unalloc_revenue: b.strain_unalloc_revenue,
          unalloc_orders: b.strain_unalloc_orders,
          flower_plants: b.flower_plants,
          veg_plants: b.veg_plants,
          next_harvest_date: b.next_harvest_date,
        });
      }
      const s = map.get(b.strain)!;
      s.batches.push(b);
      s.batch_count++;
      s.oldest_age_days = Math.max(s.oldest_age_days, b.age_days);
      if (b.age_pressure === 'aging') s.aging_batches++;
      if (b.age_pressure === 'watch') s.watch_batches++;
      s.total_sellable_g += b.sellable_now_g;
      s.total_potential_g += b.total_potential_g;
      s.allocated_revenue += b.allocated_revenue;
    }
    return map;
  }, [data]);

  // Global summary
  const summary = useMemo<BatchIntelSummary>(() => {
    const strains = new Set<string>();
    let aging = 0, watch = 0, sellable = 0, potential = 0;
    // De-duplicate strain-level unallocated values
    const strainUnalloc = new Map<string, number>();
    const strainUnallocOrders = new Map<string, number>();

    for (const b of data) {
      strains.add(b.strain);
      if (b.age_pressure === 'aging') aging++;
      if (b.age_pressure === 'watch') watch++;
      sellable += b.sellable_now_g;
      potential += b.total_potential_g;
      if (!strainUnalloc.has(b.strain)) {
        strainUnalloc.set(b.strain, b.strain_unalloc_revenue);
        strainUnallocOrders.set(b.strain, b.strain_unalloc_orders);
      }
    }

    let totalUnallocRev = 0, totalUnallocOrders = 0;
    strainUnalloc.forEach(v => totalUnallocRev += v);
    strainUnallocOrders.forEach(v => totalUnallocOrders += v);

    return {
      total_batches: data.length,
      total_strains: strains.size,
      aging_batches: aging,
      watch_batches: watch,
      total_unalloc_revenue: totalUnallocRev,
      total_unalloc_orders: totalUnallocOrders,
      total_sellable_g: sellable,
      total_potential_g: potential,
    };
  }, [data]);

  return { data, byStrain, summary, loading, error, refresh: fetch };
}
