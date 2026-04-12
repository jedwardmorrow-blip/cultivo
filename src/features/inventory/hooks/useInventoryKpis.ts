import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface GradeBucket {
  code: string;
  label: string;
  colorClass: string;
  sortOrder: number;
  totalGrams: number;
}

export interface InventoryKpis {
  throughput7dGrams: number;
  throughputEventCount: number;
  gradeBuckets: GradeBucket[];
  ungradedGrams: number;
  totalGradedGrams: number;
}

const EMPTY_KPIS: InventoryKpis = {
  throughput7dGrams: 0,
  throughputEventCount: 0,
  gradeBuckets: [],
  ungradedGrams: 0,
  totalGradedGrams: 0,
};

export function useInventoryKpis() {
  const [kpis, setKpis] = useState<InventoryKpis>(EMPTY_KPIS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [throughputResult, gradeResult, ungradedResult] = await Promise.all([
        fetchThroughput(),
        fetchGradeMix(),
        fetchUngraded(),
      ]);

      const totalGraded = gradeResult.reduce((s, g) => s + g.totalGrams, 0);

      setKpis({
        throughput7dGrams: throughputResult.grams,
        throughputEventCount: throughputResult.count,
        gradeBuckets: gradeResult,
        ungradedGrams: ungradedResult,
        totalGradedGrams: totalGraded,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { kpis, loading, error, refetch: fetch };
}

async function fetchThroughput(): Promise<{ grams: number; count: number }> {
  const { data, error } = await supabase.rpc('get_throughput_7d').single();

  if (error) {
    // Fallback: direct query
    const { data: rows, error: fallbackErr } = await supabase
      .from('batch_lifecycle_events')
      .select('metadata')
      .eq('event_type', 'stage_transition')
      .eq('to_state', 'packaged')
      .gte('event_timestamp', new Date(Date.now() - 7 * 86_400_000).toISOString());

    if (fallbackErr) throw fallbackErr;

    const grams = (rows ?? []).reduce((s, r: any) => {
      const w = Number(r.metadata?.weight_grams) || 0;
      return s + w;
    }, 0);

    return { grams, count: rows?.length ?? 0 };
  }

  return {
    grams: Number(data?.throughput_7d_g) || 0,
    count: Number(data?.event_count) || 0,
  };
}

async function fetchGradeMix(): Promise<GradeBucket[]> {
  const { data, error } = await supabase.rpc('get_grade_mix');

  if (error) {
    // Fallback: manual join via two queries
    const { data: balances, error: bErr } = await supabase
      .from('v_inventory_balances')
      .select('batch_id, on_hand_qty')
      .gt('on_hand_qty', 0);
    if (bErr) throw bErr;

    const batchIds = [...new Set((balances ?? []).map((b: any) => b.batch_id))];
    if (batchIds.length === 0) return [];

    const { data: batches, error: brErr } = await supabase
      .from('batch_registry')
      .select('id, quality_grade_id')
      .in('id', batchIds);
    if (brErr) throw brErr;

    const gradeIdToBatch = new Map<string, string[]>();
    for (const b of batches ?? []) {
      if (!b.quality_grade_id) continue;
      const arr = gradeIdToBatch.get(b.quality_grade_id) ?? [];
      arr.push(b.id);
      gradeIdToBatch.set(b.quality_grade_id, arr);
    }

    const gradeIds = [...gradeIdToBatch.keys()];
    if (gradeIds.length === 0) return [];

    const { data: grades, error: gErr } = await supabase
      .from('quality_grades')
      .select('id, code, label, color_class, sort_order')
      .in('id', gradeIds)
      .order('sort_order');
    if (gErr) throw gErr;

    const batchQtyMap = new Map<string, number>();
    for (const b of balances ?? []) {
      batchQtyMap.set(b.batch_id, (batchQtyMap.get(b.batch_id) ?? 0) + Number(b.on_hand_qty));
    }

    return (grades ?? []).map((g: any) => {
      const bIds = gradeIdToBatch.get(g.id) ?? [];
      const totalGrams = bIds.reduce((s, id) => s + (batchQtyMap.get(id) ?? 0), 0);
      return {
        code: g.code,
        label: g.label,
        colorClass: g.color_class,
        sortOrder: g.sort_order,
        totalGrams,
      };
    });
  }

  return (data ?? []).map((r: any) => ({
    code: r.code,
    label: r.label,
    colorClass: r.color_class,
    sortOrder: r.sort_order,
    totalGrams: Number(r.total_grams) || 0,
  }));
}

async function fetchUngraded(): Promise<number> {
  const { data, error } = await supabase
    .from('v_inventory_balances')
    .select('batch_id, on_hand_qty')
    .gt('on_hand_qty', 0);
  if (error) throw error;

  const batchIds = [...new Set((data ?? []).map((b: any) => b.batch_id))];
  if (batchIds.length === 0) return 0;

  const { data: batches, error: brErr } = await supabase
    .from('batch_registry')
    .select('id')
    .in('id', batchIds)
    .is('quality_grade_id', null);
  if (brErr) throw brErr;

  const ungradedIds = new Set((batches ?? []).map((b: any) => b.id));
  return (data ?? [])
    .filter((b: any) => ungradedIds.has(b.batch_id))
    .reduce((s, b: any) => s + Number(b.on_hand_qty), 0);
}
