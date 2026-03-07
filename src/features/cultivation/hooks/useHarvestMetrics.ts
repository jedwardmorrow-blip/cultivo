import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface HarvestMetricRow {
  harvest_session_id: string;
  harvest_date: string;
  harvest_status: string;
  wet_weight_grams: number;
  effective_wet_weight_grams: number;
  waste_grams: number | null;
  plant_count_harvested: number;
  harvest_completed_at: string | null;
  harvest_notes: string | null;
  strain_id: string | null;
  strain_name: string | null;
  strain_abbreviation: string | null;
  grow_room_id: string | null;
  grow_room_code: string | null;
  grow_room_type: string | null;
  grow_room_capacity: number | null;
  dry_room_id: string | null;
  dry_room_code: string | null;
  batch_registry_id: string | null;
  batch_number: string | null;
  binning_session_id: string | null;
  dry_weight_grams: number | null;
  water_loss_grams: number | null;
  bin_date: string | null;
  binning_status: string | null;
  binning_completed_at: string | null;
  yield_percentage: number | null;
  avg_wet_per_plant: number | null;
  avg_dry_per_plant: number | null;
  days_in_dry: number | null;
}

export interface StrainAggregate {
  strain_name: string;
  strain_abbreviation: string | null;
  harvest_count: number;
  total_plants: number;
  total_wet_grams: number;
  total_dry_grams: number;
  avg_yield_pct: number | null;
  avg_wet_per_plant: number;
  avg_dry_per_plant: number | null;
  best_yield_pct: number | null;
  worst_yield_pct: number | null;
}

export interface RoomAggregate {
  grow_room_code: string;
  grow_room_type: string | null;
  harvest_count: number;
  total_plants: number;
  total_wet_grams: number;
  total_dry_grams: number;
  avg_yield_pct: number | null;
  avg_wet_per_plant: number;
  avg_dry_per_plant: number | null;
}

export interface HarvestTotals {
  harvest_count: number;
  total_plants: number;
  total_wet_grams: number;
  total_dry_grams: number;
  avg_yield_pct: number | null;
  avg_wet_per_plant: number;
  avg_dry_per_plant: number | null;
  avg_days_in_dry: number | null;
  total_waste_grams: number;
}

function computeTotals(rows: HarvestMetricRow[]): HarvestTotals {
  const completed = rows.filter((r) => r.harvest_status === 'completed');
  const totalPlants = completed.reduce((s, r) => s + r.plant_count_harvested, 0);
  const totalWet = completed.reduce((s, r) => s + r.effective_wet_weight_grams, 0);
  const totalDry = completed.reduce((s, r) => s + (r.dry_weight_grams ?? 0), 0);
  const totalWaste = completed.reduce((s, r) => s + (r.waste_grams ?? 0), 0);

  const withDry = completed.filter((r) => r.dry_weight_grams != null && r.dry_weight_grams > 0);
  const avgYield = withDry.length > 0 && totalWet > 0
    ? Math.round((totalDry / totalWet) * 1000) / 10
    : null;

  const daysArr = completed.map((r) => r.days_in_dry).filter((d): d is number => d != null && d > 0);
  const avgDays = daysArr.length > 0
    ? Math.round(daysArr.reduce((s, d) => s + d, 0) / daysArr.length)
    : null;

  return {
    harvest_count: completed.length,
    total_plants: totalPlants,
    total_wet_grams: totalWet,
    total_dry_grams: totalDry,
    avg_yield_pct: avgYield,
    avg_wet_per_plant: totalPlants > 0 ? Math.round(totalWet / totalPlants * 10) / 10 : 0,
    avg_dry_per_plant: totalPlants > 0 && totalDry > 0
      ? Math.round(totalDry / totalPlants * 10) / 10
      : null,
    avg_days_in_dry: avgDays,
    total_waste_grams: totalWaste,
  };
}

function computeStrainAggregates(rows: HarvestMetricRow[]): StrainAggregate[] {
  const completed = rows.filter((r) => r.harvest_status === 'completed');
  const byStrain = new Map<string, HarvestMetricRow[]>();
  for (const row of completed) {
    const key = row.strain_name ?? 'Unknown';
    const existing = byStrain.get(key) ?? [];
    existing.push(row);
    byStrain.set(key, existing);
  }

  return Array.from(byStrain.entries())
    .map(([name, sRows]) => {
      const totalPlants = sRows.reduce((s, r) => s + r.plant_count_harvested, 0);
      const totalWet = sRows.reduce((s, r) => s + r.effective_wet_weight_grams, 0);
      const totalDry = sRows.reduce((s, r) => s + (r.dry_weight_grams ?? 0), 0);
      const yields = sRows.map((r) => r.yield_percentage).filter((y): y is number => y != null);
      const avgYield = yields.length > 0
        ? Math.round(yields.reduce((s, y) => s + y, 0) / yields.length * 10) / 10
        : null;

      return {
        strain_name: name,
        strain_abbreviation: sRows[0]?.strain_abbreviation ?? null,
        harvest_count: sRows.length,
        total_plants: totalPlants,
        total_wet_grams: totalWet,
        total_dry_grams: totalDry,
        avg_yield_pct: avgYield,
        avg_wet_per_plant: totalPlants > 0 ? Math.round(totalWet / totalPlants * 10) / 10 : 0,
        avg_dry_per_plant: totalPlants > 0 && totalDry > 0
          ? Math.round(totalDry / totalPlants * 10) / 10
          : null,
        best_yield_pct: yields.length > 0 ? Math.max(...yields) : null,
        worst_yield_pct: yields.length > 0 ? Math.min(...yields) : null,
      };
    })
    .sort((a, b) => (b.total_dry_grams || b.total_wet_grams) - (a.total_dry_grams || a.total_wet_grams));
}

function computeRoomAggregates(rows: HarvestMetricRow[]): RoomAggregate[] {
  const completed = rows.filter((r) => r.harvest_status === 'completed' && r.grow_room_code);
  const byRoom = new Map<string, HarvestMetricRow[]>();
  for (const row of completed) {
    const key = row.grow_room_code!;
    const existing = byRoom.get(key) ?? [];
    existing.push(row);
    byRoom.set(key, existing);
  }

  return Array.from(byRoom.entries())
    .map(([code, rRows]) => {
      const totalPlants = rRows.reduce((s, r) => s + r.plant_count_harvested, 0);
      const totalWet = rRows.reduce((s, r) => s + r.effective_wet_weight_grams, 0);
      const totalDry = rRows.reduce((s, r) => s + (r.dry_weight_grams ?? 0), 0);
      const yields = rRows.map((r) => r.yield_percentage).filter((y): y is number => y != null);
      const avgYield = yields.length > 0
        ? Math.round(yields.reduce((s, y) => s + y, 0) / yields.length * 10) / 10
        : null;

      return {
        grow_room_code: code,
        grow_room_type: rRows[0]?.grow_room_type ?? null,
        harvest_count: rRows.length,
        total_plants: totalPlants,
        total_wet_grams: totalWet,
        total_dry_grams: totalDry,
        avg_yield_pct: avgYield,
        avg_wet_per_plant: totalPlants > 0 ? Math.round(totalWet / totalPlants * 10) / 10 : 0,
        avg_dry_per_plant: totalPlants > 0 && totalDry > 0
          ? Math.round(totalDry / totalPlants * 10) / 10
          : null,
      };
    })
    .sort((a, b) => (b.total_dry_grams || b.total_wet_grams) - (a.total_dry_grams || a.total_wet_grams));
}

export function useHarvestMetrics() {
  const [rows, setRows] = useState<HarvestMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('v_harvest_metrics')
        .select('*')
        .order('harvest_date', { ascending: false });

      if (fetchError) throw fetchError;
      setRows((data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        wet_weight_grams: Number(r.wet_weight_grams),
        effective_wet_weight_grams: Number(r.effective_wet_weight_grams),
        waste_grams: r.waste_grams != null ? Number(r.waste_grams) : null,
        plant_count_harvested: Number(r.plant_count_harvested),
        dry_weight_grams: r.dry_weight_grams != null ? Number(r.dry_weight_grams) : null,
        water_loss_grams: r.water_loss_grams != null ? Number(r.water_loss_grams) : null,
        yield_percentage: r.yield_percentage != null ? Number(r.yield_percentage) : null,
        avg_wet_per_plant: r.avg_wet_per_plant != null ? Number(r.avg_wet_per_plant) : null,
        avg_dry_per_plant: r.avg_dry_per_plant != null ? Number(r.avg_dry_per_plant) : null,
        days_in_dry: r.days_in_dry != null ? Number(r.days_in_dry) : null,
        grow_room_capacity: r.grow_room_capacity != null ? Number(r.grow_room_capacity) : null,
      })) as HarvestMetricRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load harvest metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = computeTotals(rows);
  const strainAggregates = computeStrainAggregates(rows);
  const roomAggregates = computeRoomAggregates(rows);

  return {
    rows,
    totals,
    strainAggregates,
    roomAggregates,
    loading,
    error,
    reload: load,
  };
}
