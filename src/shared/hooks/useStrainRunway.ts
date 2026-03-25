import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RunwayStatus = 'sold_out' | 'critical' | 'tight' | 'comfortable' | 'surplus' | 'no_demand';
export type Confidence = 'calibrated' | 'estimated';

export interface StrainRunway {
  strain: string;
  strain_id: string | null;

  // Supply by stage
  packaged_units: number;
  bulk_flower_lbs: number;
  bulk_smalls_lbs: number;
  bucked_lbs: number;
  binned_lbs: number;
  trim_lbs: number;
  total_sellable_lbs: number;
  total_pipeline_lbs: number;

  // Raw grams
  bulk_flower_g: number;
  bulk_smalls_g: number;
  bucked_g: number;
  binned_g: number;
  total_sellable_g: number;
  total_pipeline_g: number;

  // Projected yield
  projected_flower_from_bucked_lbs: number;
  projected_smalls_from_bucked_lbs: number;
  projected_total_sellable_lbs: number;

  // Demand
  order_count: number;
  line_count: number;
  demand_units: number;
  demand_revenue: number;
  demand_lbs: number;
  earliest_delivery: string | null;
  latest_delivery: string | null;
  daily_demand_g: number;

  // The runway
  runway_days: number | null;
  runway_status: RunwayStatus;

  // Conversion data
  flower_pct: number;
  smalls_pct: number;
  trim_pct: number;
  packaging_yield_pct: number;
  trim_confidence: Confidence;
  pkg_confidence: Confidence;
  trim_session_count: number;
  pkg_session_count: number;
  confidence: Confidence;

  // Batch coverage
  batch_coverage_pct: number;
  items_with_batch: number;
  total_order_items: number;
}

// ─── Runway status helpers (shared across all surfaces) ─────────────────────

export const RUNWAY_STYLES: Record<RunwayStatus, { bg: string; text: string; border: string; dot: string }> = {
  sold_out:    { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400' },
  critical:    { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-400' },
  tight:       { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-400' },
  comfortable: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  surplus:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  no_demand:   { bg: 'bg-gray-500/10',    text: 'text-gray-400',    border: 'border-gray-500/20',    dot: 'bg-gray-400' },
};

export function runwayLabel(r: StrainRunway): string {
  if (r.runway_status === 'no_demand') return 'No demand';
  if (r.runway_status === 'sold_out') return 'SOLD OUT';
  if (r.runway_days === null) return '—';
  return `${r.runway_days}d`;
}

export function runwayTooltip(r: StrainRunway): string {
  if (r.runway_status === 'no_demand') return 'No open orders for this strain';
  if (r.runway_status === 'sold_out') return `No sellable inventory. ${r.demand_revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} in demand at risk.`;

  const days = r.runway_days ?? 0;
  const confidence = r.confidence === 'calibrated'
    ? `Based on ${r.trim_session_count} trim session${r.trim_session_count !== 1 ? 's' : ''} (${r.flower_pct}% flower yield)`
    : 'Using default estimates — no trim data yet';

  return `~${days} days of supply at current order velocity. ${confidence}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useStrainRunway() {
  const [data, setData] = useState<StrainRunway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const { data: rows, error: queryError } = await supabase
        .from('v_strain_runway')
        .select('*');

      if (queryError) throw queryError;
      if (!mountedRef.current) return;

      const parsed: StrainRunway[] = (rows || []).map((r: Record<string, unknown>) => ({
        strain: r.strain as string,
        strain_id: r.strain_id as string | null,
        packaged_units: Number(r.packaged_units) || 0,
        bulk_flower_lbs: Number(r.bulk_flower_lbs) || 0,
        bulk_smalls_lbs: Number(r.bulk_smalls_lbs) || 0,
        bucked_lbs: Number(r.bucked_lbs) || 0,
        binned_lbs: Number(r.binned_lbs) || 0,
        trim_lbs: Number(r.trim_lbs) || 0,
        total_sellable_lbs: Number(r.total_sellable_lbs) || 0,
        total_pipeline_lbs: Number(r.total_pipeline_lbs) || 0,
        bulk_flower_g: Number(r.bulk_flower_g) || 0,
        bulk_smalls_g: Number(r.bulk_smalls_g) || 0,
        bucked_g: Number(r.bucked_g) || 0,
        binned_g: Number(r.binned_g) || 0,
        total_sellable_g: Number(r.total_sellable_g) || 0,
        total_pipeline_g: Number(r.total_pipeline_g) || 0,
        projected_flower_from_bucked_lbs: Number(r.projected_flower_from_bucked_lbs) || 0,
        projected_smalls_from_bucked_lbs: Number(r.projected_smalls_from_bucked_lbs) || 0,
        projected_total_sellable_lbs: Number(r.projected_total_sellable_lbs) || 0,
        order_count: Number(r.order_count) || 0,
        line_count: Number(r.line_count) || 0,
        demand_units: Number(r.demand_units) || 0,
        demand_revenue: Number(r.demand_revenue) || 0,
        demand_lbs: Number(r.demand_lbs) || 0,
        earliest_delivery: r.earliest_delivery as string | null,
        latest_delivery: r.latest_delivery as string | null,
        daily_demand_g: Number(r.daily_demand_g) || 0,
        runway_days: r.runway_days != null ? Number(r.runway_days) : null,
        runway_status: (r.runway_status as RunwayStatus) || 'no_demand',
        flower_pct: Number(r.flower_pct) || 0,
        smalls_pct: Number(r.smalls_pct) || 0,
        trim_pct: Number(r.trim_pct) || 0,
        packaging_yield_pct: Number(r.packaging_yield_pct) || 0,
        trim_confidence: (r.trim_confidence as Confidence) || 'estimated',
        pkg_confidence: (r.pkg_confidence as Confidence) || 'estimated',
        trim_session_count: Number(r.trim_session_count) || 0,
        pkg_session_count: Number(r.pkg_session_count) || 0,
        confidence: (r.confidence as Confidence) || 'estimated',
        batch_coverage_pct: Number(r.batch_coverage_pct) || 0,
        items_with_batch: Number(r.items_with_batch) || 0,
        total_order_items: Number(r.total_order_items) || 0,
      }));

      setData(parsed);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime: refetch when inventory or orders change
  useEffect(() => {
    const channel = supabase
      .channel('strain_runway_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'package_assignments' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Derived stats
  const summary = {
    soldOut: data.filter(d => d.runway_status === 'sold_out').length,
    critical: data.filter(d => d.runway_status === 'critical').length,
    tight: data.filter(d => d.runway_status === 'tight').length,
    comfortable: data.filter(d => d.runway_status === 'comfortable').length,
    surplus: data.filter(d => d.runway_status === 'surplus').length,
    noDemand: data.filter(d => d.runway_status === 'no_demand').length,
    calibrated: data.filter(d => d.confidence === 'calibrated').length,
    estimated: data.filter(d => d.confidence === 'estimated').length,
    totalRevenueAtRisk: data
      .filter(d => d.runway_status === 'sold_out' || d.runway_status === 'critical')
      .reduce((s, d) => s + d.demand_revenue, 0),
  };

  return { data, loading, error, refetch: fetch, summary };
}
