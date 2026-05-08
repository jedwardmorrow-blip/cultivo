import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  CalendarRoom,
  CalendarRoomStrain,
  CalendarPlannedEntry,
  PlannedCycleTimelineRow,
  StrainCultivationStats,
} from '@/features/production-planner/types';
import { plannedCyclesService } from '@/features/production-planner/services/plannedCyclesService';
import type { Batch, BatchSegment, LifecycleStage } from './planner-mock';
import {
  MOCK_BATCHES,
  MOCK_ROOMS,
  MOCK_PLANNED,
  MOCK_STRAIN_STATS,
} from './planner-mock';
import {
  SOSTANZA_BATCHES,
  SOSTANZA_ROOMS,
  SOSTANZA_PLANNED,
  SOSTANZA_STRAIN_STATS,
  SOSTANZA_MOTHER_LOTS,
} from './sostanza-mock';
import type { MotherLot } from './LabPlanCycleForm';

/**
 * Production Planner data layer (lab edition).
 *
 * Per session 443 architecture decision:
 * - Primary read is v_batch_lifecycle (the canonical consumer-contract
 *   primitive deployed to fonreynkfeqywshijqpi 2026-04-11). Filters to
 *   stage IN ('cultivation','drying') since the planner Gantt is a
 *   pre-harvest instrument.
 * - Sidecar reads plant_groups for cohort stage_entered_at + mother
 *   lineage. is_mother=true rows feed the Mother Room genetics library.
 * - Quarantine signal flows from confidence tier ('orphan' /
 *   'cultivation_only' → batch-level pill). Synthetic-cohort burst
 *   fingerprint (2026-04-27 audit-import) flags mother lots.
 * - When v_batch_lifecycle.next_harvest_date is null (~90% of in-scope
 *   batches today), the segment renders with is_synthetic=true on the
 *   end-date and the projection is derived from the strain's
 *   v_strain_cultivation_stats.flowering_time_days.
 *
 * Honors cultivo_planner_data_lineage v2: schema presence is not
 * capture; back-filled values render quarantined.
 */

/**
 * Where the rendered data came from this tick.
 *
 * - 'mock'        → Cult-flavor mock fixture (?mock=1 in URL)
 * - 'sostanza'    → Sostanza-flavor mock fixture (?demo=sostanza)
 * - 'live'        → Authenticated read of v_batch_lifecycle from Cult prod
 * - 'fallback'    → Live read failed; rendering Cult mock with the error
 *                   surfaced in FIG. 01 so the operator knows it's stale
 */
export type LabDataSource = 'mock' | 'sostanza' | 'live' | 'fallback';

export interface LabPlannerData {
  source: LabDataSource;
  loadedAt: Date;
  batches: Batch[];
  rooms: CalendarRoom[];
  plannedByRoom: Record<string, CalendarPlannedEntry[]>;
  strainStats: StrainCultivationStats[];
  motherLots: MotherLot[];
  error: string | null;
  loading: boolean;
  /**
   * Re-read live state. No-op in mock mode. Used by the surface after a
   * successful planned_cycles write so the new row appears without a
   * full reload.
   */
  refresh: () => Promise<void>;
}

const SYNTHETIC_MOTHER_BURST_START = new Date('2026-04-27T03:00:00Z').getTime();
const SYNTHETIC_MOTHER_BURST_END = new Date('2026-04-27T05:00:00Z').getTime();

/**
 * Resolve which fixture (or live read) the surface should render.
 * Returns null when the surface should attempt a live read.
 *
 * - ?mock=1            → 'mock'      (Cult-flavor fixture)
 * - ?demo=sostanza     → 'sostanza'  (Sostanza interactive-artifact fixture)
 * - any other ?demo=*  → 'mock'      (reserved: future prospect fixtures
 *                                     fall through to Cult mock until
 *                                     a real fixture lands for them)
 * - no flag            → null        (caller does the live fetch)
 */
function detectFixtureMode(): 'mock' | 'sostanza' | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mock') === '1') return 'mock';
  const demo = params.get('demo');
  if (demo === 'sostanza') return 'sostanza';
  if (demo) return 'mock'; // unknown demo flag → fall through to Cult mock
  return null;
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

function lifecycleStateToStage(lifecycleState: string | null): LifecycleStage {
  switch (lifecycleState) {
    case 'created': return 'clone';
    case 'veg': return 'veg';
    case 'flower': return 'flower';
    case 'pre_harvest': return 'flower';
    case 'drying': return 'drying';
    case 'fresh_frozen':
    case 'bucked': return 'processing';
    case 'packaged':
    case 'bulk_available': return 'inventory';
    case 'archived': return 'closed';
    default: return 'flower';
  }
}

function defaultStageDays(
  stage: LifecycleStage,
  strainId: string,
  statsById: Map<string, StrainCultivationStats>
): number {
  const stats = statsById.get(strainId);
  switch (stage) {
    case 'flower': return stats?.flowering_time_days ?? 63;
    case 'veg': return stats?.veg_days_avg ?? 30;
    case 'clone': return 16;
    case 'drying': return 14;
    case 'processing': return 7;
    default: return 30;
  }
}

function plannedRowsToByRoom(
  rows: PlannedCycleTimelineRow[]
): Record<string, CalendarPlannedEntry[]> {
  const out: Record<string, CalendarPlannedEntry[]> = {};
  for (const r of rows) {
    if (r.status === 'cancelled' || r.status === 'completed') continue;
    const entry: CalendarPlannedEntry = {
      id: r.cycle_id,
      strain_id: r.strain_id,
      strain_name: r.strain_name,
      planned_plant_count: r.planned_plant_count,
      clone_cut_date: r.clone_cut_date,
      veg_start_date: r.veg_start_date,
      flower_start_date: r.flower_start_date,
      estimated_harvest_date: r.estimated_harvest_date,
      status: r.status,
      forecast_yield_grams: r.forecast_yield_grams,
      forecast_price_per_gram: r.forecast_price_per_gram,
    };
    const list = out[r.room_id] ?? [];
    list.push(entry);
    out[r.room_id] = list;
  }
  return out;
}

interface RawLifecycleRow {
  batch_id: string;
  batch_code: string | null;
  strain_id: string;
  strain_name: string | null;
  room_id: string | null;
  room_code: string | null;
  lifecycle_state: string | null;
  stage: string | null;
  flower_plants: number | null;
  veg_plants: number | null;
  next_harvest_date: string | null;
  days_in_stage: number | null;
  age_days: number | null;
  confidence: string | null;
  harvest_date: string | null;
}

interface RawPlantGroup {
  id: string;
  batch_registry_id: string | null;
  strain_id: string | null;
  grow_room_id: string | null;
  mother_plant_group_id: string | null;
  is_mother: boolean | null;
  plant_count: number | null;
  growth_stage: string | null;
  stage_entered_at: string | null;
  planted_date: string | null;
  estimated_harvest_date: string | null;
  created_at: string | null;
  source_type: string | null;
}

interface RawGrowRoom {
  id: string;
  name: string | null;
  room_code: string | null;
  room_type: string | null;
  capacity_plants: number | null;
  square_footage: number | null;
  is_active: boolean | null;
}

interface LiveAssembly {
  batches: Batch[];
  rooms: CalendarRoom[];
  strainStats: StrainCultivationStats[];
  motherLots: MotherLot[];
  plannedByRoom: Record<string, CalendarPlannedEntry[]>;
}

async function fetchLive(): Promise<LiveAssembly> {
  // planned_cycles read is best-effort — an empty timeline (the current
  // state at Cult per the doctrine v2 inspection) and a per-row failure
  // both fall through to plannedByRoom = {}. Lifecycle/stats/rooms/mom
  // failures still throw, since those drive the Gantt itself.
  const plannedPromise = plannedCyclesService.getTimeline().catch(() => [] as PlannedCycleTimelineRow[]);

  const [lifecycleRes, statsRes, roomsRes, motherRes, plannedRows] = await Promise.all([
    supabase.from('v_batch_lifecycle' as any)
      .select('batch_id, batch_code, strain_id, strain_name, room_id, room_code, lifecycle_state, stage, flower_plants, veg_plants, next_harvest_date, days_in_stage, age_days, confidence, harvest_date')
      .in('stage', ['cultivation', 'drying']),
    supabase.from('v_strain_cultivation_stats' as any).select('*'),
    supabase.from('grow_rooms')
      .select('id, name, room_code, room_type, capacity_plants, square_footage, is_active')
      .eq('is_active', true),
    supabase.from('plant_groups')
      .select('id, batch_registry_id, strain_id, grow_room_id, mother_plant_group_id, is_mother, plant_count, growth_stage, stage_entered_at, planted_date, estimated_harvest_date, created_at, source_type')
      .eq('is_mother', true),
    plannedPromise,
  ]);

  if (lifecycleRes.error) throw new Error(`v_batch_lifecycle: ${lifecycleRes.error.message}`);
  if (statsRes.error) throw new Error(`v_strain_cultivation_stats: ${statsRes.error.message}`);
  if (roomsRes.error) throw new Error(`grow_rooms: ${roomsRes.error.message}`);
  if (motherRes.error) throw new Error(`plant_groups (mothers): ${motherRes.error.message}`);

  const plannedByRoom = plannedRowsToByRoom(plannedRows);

  const lifecycleRows = ((lifecycleRes.data ?? []) as unknown) as RawLifecycleRow[];
  const strainStats = ((statsRes.data ?? []) as unknown) as StrainCultivationStats[];
  const grow_rooms = ((roomsRes.data ?? []) as unknown) as RawGrowRoom[];
  const motherGroups = ((motherRes.data ?? []) as unknown) as RawPlantGroup[];

  const statsById = new Map<string, StrainCultivationStats>();
  for (const s of strainStats) statsById.set(s.strain_id, s);

  // Sidecar: cohort plant_groups for the in-scope batches (stage_entered_at
  // anchors segment start; mother_plant_group_id resolves mom lineage).
  const batchIds = lifecycleRows.map(r => r.batch_id);
  let cohortGroups: RawPlantGroup[] = [];
  if (batchIds.length > 0) {
    const cohortRes = await supabase.from('plant_groups')
      .select('id, batch_registry_id, strain_id, grow_room_id, mother_plant_group_id, is_mother, plant_count, growth_stage, stage_entered_at, planted_date, estimated_harvest_date, created_at, source_type')
      .in('batch_registry_id', batchIds);
    if (cohortRes.error) throw new Error(`plant_groups (cohorts): ${cohortRes.error.message}`);
    cohortGroups = ((cohortRes.data ?? []) as unknown) as RawPlantGroup[];
  }

  const cohortByBatch = new Map<string, RawPlantGroup>();
  for (const pg of cohortGroups) {
    if (!pg.batch_registry_id) continue;
    if (!cohortByBatch.has(pg.batch_registry_id)) cohortByBatch.set(pg.batch_registry_id, pg);
  }

  const motherById = new Map<string, RawPlantGroup>();
  for (const m of motherGroups) motherById.set(m.id, m);

  const strainNameById = new Map<string, string>();
  for (const s of strainStats) {
    if (s.strain_id && s.strain_name) strainNameById.set(s.strain_id, s.strain_name);
  }
  for (const row of lifecycleRows) {
    if (row.strain_id && row.strain_name && !strainNameById.has(row.strain_id)) {
      strainNameById.set(row.strain_id, row.strain_name);
    }
  }

  const today = todayISO();
  const batches: Batch[] = lifecycleRows.map(row => {
    const cohort = cohortByBatch.get(row.batch_id);
    const stage = lifecycleStateToStage(row.lifecycle_state);
    const plantCount = stage === 'veg'
      ? (row.veg_plants ?? cohort?.plant_count ?? 0)
      : (row.flower_plants ?? cohort?.plant_count ?? 0);

    let segmentStart: string;
    let startSynthetic = false;
    if (cohort?.stage_entered_at) {
      segmentStart = cohort.stage_entered_at.slice(0, 10);
    } else if (row.days_in_stage !== null && row.days_in_stage !== undefined) {
      segmentStart = addDays(today, -row.days_in_stage);
      startSynthetic = true;
    } else {
      segmentStart = today;
      startSynthetic = true;
    }

    let segmentEnd: string;
    let endSynthetic = false;
    if (row.next_harvest_date) {
      segmentEnd = row.next_harvest_date;
    } else {
      const days = defaultStageDays(stage, row.strain_id, statsById);
      segmentEnd = addDays(segmentStart, days);
      endSynthetic = true;
    }

    const isSegSynthetic = startSynthetic || endSynthetic;
    const reasons: string[] = [];
    if (startSynthetic) reasons.push('start anchored to days_in_stage (no cohort stage_entered_at)');
    if (endSynthetic) reasons.push('end projected from strain stats (no operator-written next_harvest_date)');

    const segments: BatchSegment[] = [{
      stage,
      room_id: row.room_id ?? '',
      start: segmentStart,
      end: segmentEnd,
      plant_count: plantCount,
      is_current: true,
      is_projected: false,
      is_synthetic: isSegSynthetic || undefined,
      synthetic_reason: isSegSynthetic ? reasons.join('; ') : undefined,
    }];

    let momPlantGroupId: string | null = null;
    let momStrainName: string | null = null;
    if (cohort?.mother_plant_group_id) {
      momPlantGroupId = cohort.mother_plant_group_id;
      const m = motherById.get(cohort.mother_plant_group_id);
      if (m?.strain_id) momStrainName = strainNameById.get(m.strain_id) ?? null;
    }

    const isQuarantined = row.confidence === 'orphan' || row.confidence === 'cultivation_only';
    const quarantineReason = isQuarantined
      ? `confidence tier "${row.confidence}" — back-filled or skeleton-only data per cultivo_planner_data_lineage v2`
      : undefined;

    let cloneCutDate = segmentStart;
    if (row.batch_code) {
      const m = row.batch_code.match(/^(\d{2})(\d{2})(\d{2})/);
      if (m) {
        const yy = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const dd = parseInt(m[3], 10);
        const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
        cloneCutDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    }

    const strainAbbrev = (
      row.batch_code?.split('-')[1]
      ?? row.strain_name?.split(/\s+/).map(w => w[0]).join('').slice(0, 3)
      ?? '???'
    ).toUpperCase();

    return {
      batch_id: row.batch_id,
      batch_code: row.batch_code ?? row.batch_id.slice(0, 8),
      strain_id: row.strain_id,
      strain_name: row.strain_name ?? '—',
      strain_abbrev: strainAbbrev,
      clone_cut_date: cloneCutDate,
      current_stage: stage,
      current_room_id: row.room_id ?? '',
      mom_plant_group_id: momPlantGroupId,
      mom_strain_name: momStrainName,
      segments,
      status: 'active',
      forecast_yield_grams: plantCount * (statsById.get(row.strain_id)?.avg_wet_weight_per_plant_g ?? 720),
      is_quarantined: isQuarantined || undefined,
      quarantine_reason: quarantineReason,
      days_in_stage: row.days_in_stage ?? undefined,
      lifecycle_state: row.lifecycle_state ?? undefined,
    };
  });

  // Mother lots from is_mother plant_groups (genetics library)
  const motherByStrain = new Map<string, RawPlantGroup[]>();
  for (const m of motherGroups) {
    if (!m.strain_id) continue;
    const arr = motherByStrain.get(m.strain_id) ?? [];
    arr.push(m);
    motherByStrain.set(m.strain_id, arr);
  }
  const motherLots: MotherLot[] = [];
  for (const [strainId, group] of motherByStrain) {
    const total = group.reduce((s, m) => s + (m.plant_count ?? 0), 0);
    if (total === 0) continue;
    const syntheticCount = group.filter(m => {
      const t = m.created_at ? new Date(m.created_at).getTime() : 0;
      return t >= SYNTHETIC_MOTHER_BURST_START && t <= SYNTHETIC_MOTHER_BURST_END;
    }).length;
    motherLots.push({
      mom_plant_group_id: group[0].id,
      strain_id: strainId,
      strain_name: strainNameById.get(strainId) ?? '—',
      plant_count: total,
      synthetic: syntheticCount === group.length,
    });
  }
  motherLots.sort((a, b) => a.strain_name.localeCompare(b.strain_name));

  // Build CalendarRoom list, ordered mother → veg → flower → drying → processing
  const roomTypeOrder = ['mother', 'veg', 'flower', 'drying', 'processing'];
  const sortedRooms = [...grow_rooms].sort((a, b) => {
    const ai = roomTypeOrder.indexOf(a.room_type ?? '');
    const bi = roomTypeOrder.indexOf(b.room_type ?? '');
    const ra = ai === -1 ? 99 : ai;
    const rb = bi === -1 ? 99 : bi;
    if (ra !== rb) return ra - rb;
    return (a.room_code ?? '').localeCompare(b.room_code ?? '');
  });

  const motherStrains: CalendarRoomStrain[] = motherLots.map(ml => ({
    strain_id: ml.strain_id,
    strain_name: ml.strain_name,
    plant_count: ml.plant_count,
    growth_stage: 'mother',
    earliest_planted_date: null,
    estimated_harvest_date: null,
    stage_entered_at: null,
    days_in_stage: null,
    is_mother: true,
  }));

  const rooms: CalendarRoom[] = sortedRooms.map(r => {
    const isMotherRoom = r.room_type === 'mother';
    const inRoom = batches.filter(b => b.current_room_id === r.id);
    const strains: CalendarRoomStrain[] = isMotherRoom
      ? motherStrains
      : inRoom.map(b => {
          const seg = b.segments[0];
          return {
            strain_id: b.strain_id,
            strain_name: b.strain_name,
            plant_count: seg.plant_count,
            growth_stage: b.current_stage,
            earliest_planted_date: b.clone_cut_date,
            estimated_harvest_date: seg.end,
            stage_entered_at: seg.start,
            days_in_stage: 0,
            is_mother: false,
          };
        });
    const totalPlants = strains.reduce((acc, s) => acc + s.plant_count, 0);
    return {
      room_id: r.id,
      room_name: r.name ?? r.room_code ?? '—',
      room_code: r.room_code ?? '—',
      room_type: r.room_type ?? '—',
      capacity_plants: r.capacity_plants,
      square_footage: r.square_footage,
      total_plants: totalPlants,
      strain_count: strains.length,
      capacity_utilization_pct: r.capacity_plants
        ? Math.round((totalPlants / r.capacity_plants) * 100)
        : null,
      strains,
      plannedCycles: plannedByRoom[r.id] ?? [],
    };
  });

  return { batches, rooms, strainStats, motherLots, plannedByRoom };
}

function buildMockMotherLots(): MotherLot[] {
  const motherRoom = MOCK_ROOMS.find(r => r.room_type === 'mother');
  if (!motherRoom) return [];
  return motherRoom.strains.map(s => ({
    mom_plant_group_id: s.strain_id,
    strain_id: s.strain_id,
    strain_name: s.strain_name,
    plant_count: s.plant_count,
    synthetic: true,
  }));
}

interface InternalState {
  source: LabDataSource;
  loadedAt: Date;
  batches: Batch[];
  rooms: CalendarRoom[];
  plannedByRoom: Record<string, CalendarPlannedEntry[]>;
  strainStats: StrainCultivationStats[];
  motherLots: MotherLot[];
  error: string | null;
  loading: boolean;
}

function mockState(): InternalState {
  return {
    source: 'mock',
    loadedAt: new Date(),
    batches: MOCK_BATCHES,
    rooms: MOCK_ROOMS,
    plannedByRoom: MOCK_PLANNED,
    strainStats: MOCK_STRAIN_STATS,
    motherLots: buildMockMotherLots(),
    error: null,
    loading: false,
  };
}

function sostanzaState(): InternalState {
  return {
    source: 'sostanza',
    loadedAt: new Date(),
    batches: SOSTANZA_BATCHES,
    rooms: SOSTANZA_ROOMS,
    plannedByRoom: SOSTANZA_PLANNED,
    strainStats: SOSTANZA_STRAIN_STATS,
    motherLots: SOSTANZA_MOTHER_LOTS,
    error: null,
    loading: false,
  };
}

function fallbackState(error: string | null, loading: boolean): InternalState {
  return {
    source: 'fallback',
    loadedAt: new Date(),
    batches: MOCK_BATCHES,
    rooms: MOCK_ROOMS,
    plannedByRoom: MOCK_PLANNED,
    strainStats: MOCK_STRAIN_STATS,
    motherLots: buildMockMotherLots(),
    error,
    loading,
  };
}

export function useLabPlannerData(): LabPlannerData {
  const fixtureMode = useMemo(detectFixtureMode, []);

  const [state, setState] = useState<InternalState>(() => {
    if (fixtureMode === 'sostanza') return sostanzaState();
    if (fixtureMode === 'mock') return mockState();
    return fallbackState(null, true);
  });

  const loadLive = useCallback(async (signal: { cancelled: boolean }) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const live = await fetchLive();
      if (signal.cancelled) return;
      if (live.batches.length === 0) {
        setState(fallbackState(
          'No batches in scope (cultivation/drying). Falling back to mock fixture.',
          false
        ));
        return;
      }
      setState({
        source: 'live',
        loadedAt: new Date(),
        batches: live.batches,
        rooms: live.rooms,
        plannedByRoom: live.plannedByRoom,
        strainStats: live.strainStats,
        motherLots: live.motherLots,
        error: null,
        loading: false,
      });
    } catch (err: any) {
      if (signal.cancelled) return;
      setState(fallbackState(err?.message ?? 'Live fetch failed', false));
    }
  }, []);

  useEffect(() => {
    if (fixtureMode !== null) return;
    const signal = { cancelled: false };
    loadLive(signal);
    return () => { signal.cancelled = true; };
  }, [fixtureMode, loadLive]);

  const refresh = useCallback(async () => {
    if (fixtureMode !== null) return;
    await loadLive({ cancelled: false });
  }, [fixtureMode, loadLive]);

  return {
    source: state.source,
    loadedAt: state.loadedAt,
    batches: state.batches,
    rooms: state.rooms,
    plannedByRoom: state.plannedByRoom,
    strainStats: state.strainStats,
    motherLots: state.motherLots,
    error: state.error,
    loading: state.loading,
    refresh,
  };
}
