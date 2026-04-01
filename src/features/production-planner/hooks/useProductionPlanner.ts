import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  RoomOccupancy,
  StrainCultivationStats,
  CalendarRoom,
  CalendarRoomStrain,
  CalendarPlannedEntry,
  PlannedCycleTimelineRow,
  ViewMode,
} from '../types';
import { ROOM_TYPE_ORDER } from '../types';

export const WEEKS_AFTER_CURRENT = 16;
export const WEEKS_AFTER_PLANNING = 26;

function deriveRoomCode(name: string): string {
  if (name.startsWith('Flower Room')) return `FLW-${name.replace('Flower Room ', '').padStart(2, '0')}`;
  if (name.startsWith('Veg Room')) return `VEG-${name.replace('Veg Room ', '').replace('Veg Room', '').trim().padStart(2, '0')}`;
  if (name === 'Mother Room') return 'MOM-01';
  return name.substring(0, 6).toUpperCase();
}

export function useProductionPlanner() {
  const [occupancy, setOccupancy] = useState<RoomOccupancy[]>([]);
  const [strainStats, setStrainStats] = useState<StrainCultivationStats[]>([]);
  const [plannedTimeline, setPlannedTimeline] = useState<PlannedCycleTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [occResult, statsResult] = await Promise.all([
        supabase.from('v_room_occupancy').select('*'),
        supabase.from('v_strain_cultivation_stats').select('*'),
      ]);

      if (occResult.error) throw occResult.error;
      if (statsResult.error) throw statsResult.error;

      setOccupancy(occResult.data ?? []);
      setStrainStats(statsResult.data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load production planner data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlanned = useCallback(async () => {
    try {
      const { data, error: planErr } = await supabase
        .from('v_planned_cycles_timeline')
        .select('*');
      // Table may not exist yet (CUL-62 in progress) — fail silently
      if (!planErr) {
        setPlannedTimeline((data ?? []) as PlannedCycleTimelineRow[]);
      }
    } catch {
      // Silently ignore — DBA migration may not be applied yet
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (viewMode === 'planning') {
      loadPlanned();
    }
  }, [viewMode, loadPlanned]);

  /** Aggregate occupancy rows into CalendarRoom objects, sorted by room type */
  const rooms = useMemo<CalendarRoom[]>(() => {
    const roomMap = new Map<string, CalendarRoom>();

    for (const row of occupancy) {
      if (!roomMap.has(row.room_id)) {
        roomMap.set(row.room_id, {
          room_id: row.room_id,
          room_name: row.room_name,
          room_code: deriveRoomCode(row.room_name),
          room_type: row.room_type,
          capacity_plants: row.capacity_plants,
          square_footage: row.square_footage,
          total_plants: row.total_plants,
          strain_count: row.strain_count,
          capacity_utilization_pct: row.capacity_utilization_pct,
          strains: [],
          plannedCycles: [],
        });
      }

      const room = roomMap.get(row.room_id)!;
      if (row.strain_id && row.strain_name) {
        room.strains.push({
          strain_id: row.strain_id,
          strain_name: row.strain_name,
          plant_count: row.plant_count ?? 0,
          growth_stage: row.growth_stage ?? 'unknown',
          earliest_planted_date: row.earliest_planted_date,
          estimated_harvest_date: row.estimated_harvest_date,
          stage_entered_at: row.stage_entered_at,
          days_in_stage: row.days_in_stage,
          is_mother: row.is_mother ?? false,
        });
      }
    }

    // Merge planned cycles when in planning mode
    if (viewMode === 'planning') {
      for (const plan of plannedTimeline) {
        if (!roomMap.has(plan.room_id)) {
          // Room exists only in planned data (e.g. not yet occupied) — create shell
          roomMap.set(plan.room_id, {
            room_id: plan.room_id,
            room_name: plan.room_name,
            room_code: deriveRoomCode(plan.room_name),
            room_type: plan.room_type,
            capacity_plants: plan.capacity_plants,
            square_footage: null,
            total_plants: 0,
            strain_count: 0,
            capacity_utilization_pct: null,
            strains: [],
            plannedCycles: [],
          });
        }
        const entry: CalendarPlannedEntry = {
          id: plan.cycle_id,
          strain_id: plan.strain_id,
          strain_name: plan.strain_name,
          planned_plant_count: plan.planned_plant_count,
          clone_cut_date: plan.clone_cut_date,
          veg_start_date: plan.veg_start_date,
          flower_start_date: plan.flower_start_date,
          estimated_harvest_date: plan.estimated_harvest_date,
          status: plan.status,
          forecast_yield_grams: plan.forecast_yield_grams,
          forecast_price_per_gram: plan.forecast_price_per_gram,
        };
        roomMap.get(plan.room_id)!.plannedCycles!.push(entry);
      }
    }

    return Array.from(roomMap.values()).sort(
      (a, b) => (ROOM_TYPE_ORDER[a.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room_type] ?? 9)
    );
  }, [occupancy, plannedTimeline, viewMode]);

  /** Strain stats lookup by ID */
  const strainStatsById = useMemo(() => {
    const map = new Map<string, StrainCultivationStats>();
    for (const s of strainStats) map.set(s.strain_id, s);
    return map;
  }, [strainStats]);

  /** Harvest alerts: rooms within 21 days of projected harvest */
  const harvestAlerts = useMemo(() => {
    const today = new Date();
    const alerts: { room_code: string; room_name: string; strain_name: string; days_until: number; estimated_date: string }[] = [];

    for (const room of rooms) {
      for (const strain of room.strains) {
        if (strain.estimated_harvest_date) {
          const est = new Date(strain.estimated_harvest_date);
          const diff = Math.ceil((est.getTime() - today.getTime()) / 86400000);
          if (diff >= 0 && diff <= 21) {
            alerts.push({
              room_code: room.room_code,
              room_name: room.room_name,
              strain_name: strain.strain_name,
              days_until: diff,
              estimated_date: strain.estimated_harvest_date,
            });
          }
        }
      }
    }

    return alerts.sort((a, b) => a.days_until - b.days_until);
  }, [rooms]);

  return {
    rooms,
    strainStats,
    strainStatsById,
    harvestAlerts,
    loading,
    error,
    reload: load,
    reloadPlanned: loadPlanned,
    viewMode,
    setViewMode,
  };
}
