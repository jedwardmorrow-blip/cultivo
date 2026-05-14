import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  BatchLifecycleRow,
  GrowRoomRow,
  MotherBatchGroupRow,
  RoomOccupancy,
  StrainCultivationStats,
  CalendarRoom,
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

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function lifecycleStateToStage(lifecycleState: string | null, fallbackStage: string | null): string {
  switch (lifecycleState) {
    case 'created': return 'clone';
    case 'veg': return 'veg';
    case 'flower':
    case 'pre_harvest': return 'flower';
    case 'drying':
    case 'fresh_frozen':
    case 'bucked': return 'harvested';
    default:
      if (fallbackStage === 'drying') return 'harvested';
      return fallbackStage ?? 'flower';
  }
}

function defaultStageDays(stage: string, strainId: string, statsById: Map<string, StrainCultivationStats>): number {
  const stats = statsById.get(strainId);
  switch (stage) {
    case 'flower': return stats?.flowering_time_days ?? 63;
    case 'veg': return stats?.veg_days_avg ?? 30;
    case 'clone': return 16;
    default: return 14;
  }
}

function cloneCutFromBatchCode(batchCode: string | null, fallbackISO: string): string {
  const match = batchCode?.match(/^(\d{2})(\d{2})(\d{2})/);
  if (!match) return fallbackISO;
  const yy = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const dd = parseInt(match[3], 10);
  const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function cohortFromBatch(batchCode: string | null, batchId: string, cycleId?: string | null) {
  if (cycleId) return { key: `cycle:${cycleId}`, label: `Cycle ${cycleId.slice(0, 8)}` };
  const prefix = batchCode?.match(/^(\d{6})/)?.[1];
  if (prefix) return { key: `prefix:${prefix}`, label: prefix };
  return { key: `batch:${batchId}`, label: batchCode ?? batchId.slice(0, 8) };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to load production planner data';
}

export function useProductionPlanner() {
  const [occupancy, setOccupancy] = useState<RoomOccupancy[]>([]);
  const [lifecycleRows, setLifecycleRows] = useState<BatchLifecycleRow[]>([]);
  const [growRooms, setGrowRooms] = useState<GrowRoomRow[]>([]);
  const [motherBatchGroups, setMotherBatchGroups] = useState<MotherBatchGroupRow[]>([]);
  const [batchCycles, setBatchCycles] = useState<Record<string, { cycle_id: string | null; cycle_code: string | null }>>({});
  const [strainStats, setStrainStats] = useState<StrainCultivationStats[]>([]);
  const [plannedTimeline, setPlannedTimeline] = useState<PlannedCycleTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('current');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [occResult, lifecycleResult, roomsResult, motherGroupsResult, statsResult] = await Promise.all([
        supabase.from('v_room_occupancy').select('*'),
        supabase.from('v_batch_lifecycle')
          .select('batch_id, batch_code, strain_id, strain_name, room_id, room_code, lifecycle_state, stage, flower_plants, veg_plants, next_harvest_date, days_in_stage, age_days, confidence, harvest_date')
          .in('stage', ['cultivation', 'drying']),
        supabase.from('grow_rooms')
          .select('id, name, room_code, room_type, capacity_plants, square_footage, is_active')
          .eq('is_active', true),
        supabase.from('v_mother_batch_groups')
          .select('mother_batch_group_key, source_cycle_id, source_cycle_code, source_batch_registry_id, source_batch_number, room_id, room_code, room_name, strain_id, strain_name, plant_group_count, active_plant_group_count, plant_count, active_plant_count, planted_date_min, last_stage_entered_at, last_created_at, has_retired_moms, moms'),
        supabase.from('v_strain_cultivation_stats').select('*'),
      ]);

      if (occResult.error) throw occResult.error;
      if (statsResult.error) throw statsResult.error;

      setOccupancy(occResult.data ?? []);
      setLifecycleRows(lifecycleResult.error ? [] : ((lifecycleResult.data ?? []) as BatchLifecycleRow[]));
      setGrowRooms(roomsResult.error ? [] : ((roomsResult.data ?? []) as GrowRoomRow[]));
      setMotherBatchGroups(motherGroupsResult.error ? [] : ((motherGroupsResult.data ?? []) as MotherBatchGroupRow[]));
      setStrainStats(statsResult.data ?? []);

      const batchIds = lifecycleResult.error
        ? []
        : ((lifecycleResult.data ?? []) as BatchLifecycleRow[]).map((row) => row.batch_id);
      if (batchIds.length === 0) {
        setBatchCycles({});
        return;
      }

      const registryResult = await supabase
        .from('batch_registry')
        .select('id, cycle_id')
        .in('id', batchIds);

      if (registryResult.error) {
        setBatchCycles({});
        return;
      }

      const registryRows = (registryResult.data ?? []) as { id: string; cycle_id: string | null }[];
      const cycleIds = Array.from(new Set(
        registryRows.map((row) => row.cycle_id).filter((id): id is string => Boolean(id))
      ));
      let cycleCodeById = new Map<string, string>();
      if (cycleIds.length > 0) {
        const cyclesResult = await supabase
          .from('cycles')
          .select('id, cycle_code')
          .in('id', cycleIds);
        if (!cyclesResult.error) {
          cycleCodeById = new Map(
            ((cyclesResult.data ?? []) as { id: string; cycle_code: string | null }[])
              .map((row) => [row.id, row.cycle_code ?? row.id.slice(0, 8)])
          );
        }
      }

      const nextCycles: Record<string, { cycle_id: string | null; cycle_code: string | null }> = {};
      for (const row of registryRows) {
        nextCycles[row.id] = {
          cycle_id: row.cycle_id,
          cycle_code: row.cycle_id ? cycleCodeById.get(row.cycle_id) ?? null : null,
        };
      }
      setBatchCycles(nextCycles);
    } catch (err: unknown) {
      setError(errorMessage(err));
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

  /** Aggregate rows into CalendarRoom objects, preferring batch lifecycle identity when available. */
  const rooms = useMemo<CalendarRoom[]>(() => {
    if (lifecycleRows.length > 0) {
      const statsById = new Map<string, StrainCultivationStats>();
      for (const s of strainStats) statsById.set(s.strain_id, s);

      const roomMap = new Map<string, CalendarRoom>();
      for (const room of growRooms) {
        roomMap.set(room.id, {
          room_id: room.id,
          room_name: room.name ?? room.room_code ?? 'Room',
          room_code: room.room_code ?? deriveRoomCode(room.name ?? 'Room'),
          room_type: room.room_type ?? 'mixed',
          capacity_plants: room.capacity_plants,
          square_footage: room.square_footage,
          total_plants: 0,
          strain_count: 0,
          capacity_utilization_pct: null,
          strains: [],
          plannedCycles: [],
        });
      }

      const today = todayISO();
      for (const row of lifecycleRows) {
        if (!row.room_id) continue;
        const roomCode = row.room_code ?? row.room_id.slice(0, 6).toUpperCase();
        if (!roomMap.has(row.room_id)) {
          roomMap.set(row.room_id, {
            room_id: row.room_id,
            room_name: roomCode,
            room_code: roomCode,
            room_type: row.stage === 'drying' ? 'harvested' : 'mixed',
            capacity_plants: null,
            square_footage: null,
            total_plants: 0,
            strain_count: 0,
            capacity_utilization_pct: null,
            strains: [],
            plannedCycles: [],
          });
        }

        const stage = lifecycleStateToStage(row.lifecycle_state, row.stage);
        const stageStart = row.days_in_stage != null ? addDays(today, -row.days_in_stage) : today;
        const estimatedEnd = row.next_harvest_date ?? addDays(stageStart, defaultStageDays(stage, row.strain_id, statsById));
        const plantCount = stage === 'veg'
          ? (row.veg_plants ?? row.flower_plants ?? 0)
          : (row.flower_plants ?? row.veg_plants ?? 0);
        const cycle = batchCycles[row.batch_id] ?? { cycle_id: null, cycle_code: null };
        const cohort = cohortFromBatch(row.batch_code, row.batch_id, cycle.cycle_id);
        const isSynthetic = !row.next_harvest_date;
        const isQuarantined = row.confidence === 'orphan' || row.confidence === 'cultivation_only';

        roomMap.get(row.room_id)!.strains.push({
          strain_id: row.strain_id,
          strain_name: row.strain_name ?? 'Unknown strain',
          plant_count: plantCount,
          growth_stage: stage,
          earliest_planted_date: cloneCutFromBatchCode(row.batch_code, stageStart),
          estimated_harvest_date: estimatedEnd,
          stage_entered_at: stageStart,
          days_in_stage: row.days_in_stage,
          is_mother: false,
          batch_id: row.batch_id,
          batch_code: row.batch_code,
          cycle_id: cycle.cycle_id,
          cycle_code: cycle.cycle_code,
          cohort_key: cohort.key,
          cohort_label: cycle.cycle_code ?? cohort.label,
          confidence: row.confidence,
          is_synthetic: isSynthetic,
          synthetic_reason: isSynthetic ? 'Projected from lifecycle stage and strain defaults because no next_harvest_date exists.' : null,
          is_quarantined: isQuarantined,
          quarantine_reason: isQuarantined ? `confidence tier "${row.confidence}"` : null,
        });
      }

      for (const room of roomMap.values()) {
        room.total_plants = room.strains.reduce((sum, strain) => sum + strain.plant_count, 0);
        room.strain_count = new Set(room.strains.map((strain) => strain.strain_id)).size;
        room.capacity_utilization_pct = room.capacity_plants
          ? Math.round((room.total_plants / room.capacity_plants) * 100)
          : null;
      }

      if (viewMode === 'planning') {
        for (const plan of plannedTimeline) {
          if (!roomMap.has(plan.room_id)) {
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
    }

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
  }, [batchCycles, growRooms, lifecycleRows, occupancy, plannedTimeline, strainStats, viewMode]);

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
    motherBatchGroups,
    harvestAlerts,
    loading,
    error,
    reload: load,
    reloadPlanned: loadPlanned,
    viewMode,
    setViewMode,
  };
}
