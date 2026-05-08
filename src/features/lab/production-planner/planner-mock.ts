import type { CalendarRoom, CalendarRoomStrain, StrainCultivationStats } from '@/features/production-planner/types';

/**
 * Batch-keyed mock fixture for /lab/production-planner?mock=1
 *
 * Per cultivo_planner_data_lineage doctrine + batch_naming_convention_drift
 * resolution (clone-date prefix), the unifying primitive for the planner is
 * `batch_id` (matching `batch_registry.id` in production), not strain.
 * batch_code = `${YYMMDD-clone-cut}-${STRAIN-ABBREV}`.
 *
 * Each batch has stage segments — one per (stage, room) pairing the batch
 * has occupied or will occupy. The Gantt iterates batches and renders the
 * relevant segment in each room's row, with connector arrows linking
 * consecutive segments belonging to the same batch.
 *
 * Stage cycle defaults (per growth_stage_durations brain row):
 *   clone:  16d
 *   veg:    30d
 *   flower: 63d
 */

export type LifecycleStage =
  | 'clone'
  | 'veg'
  | 'flower'
  | 'drying'
  | 'processing'
  | 'inventory'
  | 'closed';

export interface BatchSegment {
  stage: LifecycleStage;
  room_id: string;
  start: string; // ISO date
  end: string;   // ISO date (or projected if in future)
  plant_count: number;
  /** True for the segment that is the batch's current stage on today. */
  is_current: boolean;
  /** True for segments anchored entirely in the future (planning view). */
  is_projected: boolean;
  /**
   * True when one or more source fields backing this segment are null or
   * came from a synthetic back-fill rather than operator capture. Per the
   * cultivo_planner_data_lineage doctrine, segments with this flag must
   * render with quarantine treatment.
   */
  is_synthetic?: boolean;
  /** Human-readable explanation surfaced in the segment tooltip. */
  synthetic_reason?: string;
}

export interface Batch {
  batch_id: string;
  batch_code: string; // YYMMDD-STRAIN
  strain_id: string;
  strain_name: string;
  strain_abbrev: string;
  /** Authoritative lifecycle anchor per Justin's confirmation 2026-05-07. */
  clone_cut_date: string;
  current_stage: LifecycleStage;
  current_room_id: string;
  /** Mother lineage if cut from in-house mom; null if external. */
  mom_plant_group_id: string | null;
  mom_strain_name: string | null;
  /** All stage segments, ordered chronologically. */
  segments: BatchSegment[];
  /** Cycle status (mirrors planned_cycles.status). */
  status: 'active' | 'committed' | 'draft' | 'completed';
  forecast_yield_grams?: number;
  /**
   * Batch-level quarantine flag. Set when v_batch_lifecycle.confidence is
   * one of 'orphan' or 'cultivation_only', meaning the batch has data
   * lineage hazards per the four-state doctrine. Drawer renders a pill,
   * Gantt segment renders a dotted underline.
   */
  is_quarantined?: boolean;
  /** Reason text surfaced when hovering the batch quarantine pill. */
  quarantine_reason?: string;
  /**
   * Days since v_batch_lifecycle.lifecycle_state changed. Plumbed from
   * the canonical primitive so the Gantt's urgency engine can detect
   * stuck-in-stage cohorts without reverse-engineering it from segment
   * dates (which can underestimate when plant_groups.stage_entered_at
   * has been overwritten by a downstream lifecycle transition).
   */
  days_in_stage?: number;
  /**
   * v_batch_lifecycle.lifecycle_state. Surfaces post-cultivation states
   * (drying, fresh_frozen, bucked, packaged, bulk_available, archived)
   * that the lab's broader stage classification collapses.
   */
  lifecycle_state?: string | null;
}

const MOCK_TODAY = new Date();
MOCK_TODAY.setHours(0, 0, 0, 0);

function offsetDate(days: number): string {
  const d = new Date(MOCK_TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function batchCode(cloneDays: number, abbrev: string): string {
  const d = new Date(MOCK_TODAY);
  d.setDate(d.getDate() + cloneDays);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}-${abbrev}`;
}

interface BatchSeed {
  strain_id: string;
  strain_name: string;
  strain_abbrev: string;
  /** Days relative to today when clones were cut (negative = in past). */
  cloneDaysAgo: number;
  current_stage: LifecycleStage;
  /** Room where cuts were rooted (usually the mother room). */
  clone_room_id: string;
  veg_room_id: string;
  /** Flower room for the current or upcoming flower phase. */
  flower_room_id: string;
  plant_count: number;
  mom_plant_group_id: string | null;
  mom_strain_name: string | null;
  status?: 'active' | 'committed' | 'draft' | 'completed';
}

const CLONE_DAYS = 16;
const VEG_DAYS = 30;
const FLOWER_DAYS = 63;

function buildBatch(seed: BatchSeed): Batch {
  const cloneStart = -seed.cloneDaysAgo; // cloneDaysAgo positive → cloneStart negative (past)
  const vegStart = cloneStart + CLONE_DAYS;
  const flowerStart = vegStart + VEG_DAYS;
  const harvest = flowerStart + FLOWER_DAYS;

  const segments: BatchSegment[] = [];

  // is_projected = segment is entirely in the future. Current trumps
  // projected: if the seed says the batch is currently in a stage, that
  // stage is happening now even if naive cycle math puts it in the future.
  segments.push({
    stage: 'clone',
    room_id: seed.clone_room_id,
    start: offsetDate(cloneStart),
    end: offsetDate(vegStart),
    plant_count: seed.plant_count,
    is_current: seed.current_stage === 'clone',
    is_projected: cloneStart > 0 && seed.current_stage !== 'clone',
  });

  segments.push({
    stage: 'veg',
    room_id: seed.veg_room_id,
    start: offsetDate(vegStart),
    end: offsetDate(flowerStart),
    plant_count: seed.plant_count,
    is_current: seed.current_stage === 'veg',
    is_projected: vegStart > 0 && seed.current_stage !== 'veg',
  });

  segments.push({
    stage: 'flower',
    room_id: seed.flower_room_id,
    start: offsetDate(flowerStart),
    end: offsetDate(harvest),
    plant_count: seed.plant_count,
    is_current: seed.current_stage === 'flower',
    is_projected: flowerStart > 0 && seed.current_stage !== 'flower',
  });

  return {
    batch_id: `b-${seed.strain_id}-${seed.cloneDaysAgo}`,
    batch_code: batchCode(cloneStart, seed.strain_abbrev),
    strain_id: seed.strain_id,
    strain_name: seed.strain_name,
    strain_abbrev: seed.strain_abbrev,
    clone_cut_date: offsetDate(cloneStart),
    current_stage: seed.current_stage,
    current_room_id: seed.current_stage === 'clone'
      ? seed.clone_room_id
      : seed.current_stage === 'veg'
        ? seed.veg_room_id
        : seed.flower_room_id,
    mom_plant_group_id: seed.mom_plant_group_id,
    mom_strain_name: seed.mom_strain_name,
    segments,
    status: seed.status ?? 'active',
    forecast_yield_grams: seed.plant_count * 720,
  };
}

const SEEDS: BatchSeed[] = [
  // Late-flower (harvest urgency)
  {
    strain_id: 's-bp', strain_name: 'Blue Pave', strain_abbrev: 'BP',
    cloneDaysAgo: 100, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-07',
    plant_count: 264, mom_plant_group_id: 's-bp', mom_strain_name: 'Blue Pave',
  },
  {
    strain_id: 's-eh', strain_name: "Earth's Healing", strain_abbrev: 'EH',
    cloneDaysAgo: 90, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 96, mom_plant_group_id: 's-eh', mom_strain_name: "Earth's Healing",
  },
  // Mid-flower
  {
    strain_id: 's-sld', strain_name: 'Story Long Distance', strain_abbrev: 'SLD',
    cloneDaysAgo: 75, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-02',
    plant_count: 168, mom_plant_group_id: 's-sld', mom_strain_name: 'Story Long Distance',
  },
  {
    strain_id: 's-bp', strain_name: 'Blue Pave', strain_abbrev: 'BP',
    cloneDaysAgo: 60, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-08',
    plant_count: 144, mom_plant_group_id: 's-bp', mom_strain_name: 'Blue Pave',
  },
  // Multi-pheno flower batch (FLW-06 pheno hunt)
  {
    strain_id: 's-ph-mix', strain_name: 'Pheno Hunt Cohort', strain_abbrev: 'PHX',
    cloneDaysAgo: 35, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-06',
    plant_count: 240, mom_plant_group_id: null, mom_strain_name: 'External pheno seed lot',
  },
  // Early-flower
  {
    strain_id: 's-rz', strain_name: 'Runtz', strain_abbrev: 'RZ',
    cloneDaysAgo: 50, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-05',
    plant_count: 120, mom_plant_group_id: null, mom_strain_name: 'External clone vendor',
  },
  // Veg-stage batches
  {
    strain_id: 's-pf', strain_name: 'Ponderosa Front', strain_abbrev: 'PF',
    cloneDaysAgo: 25, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-04',
    plant_count: 96, mom_plant_group_id: null, mom_strain_name: null,
  },
  {
    strain_id: 's-gmo', strain_name: 'GMO', strain_abbrev: 'GMO',
    cloneDaysAgo: 18, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-09',
    plant_count: 144, mom_plant_group_id: null, mom_strain_name: null,
  },
  {
    strain_id: 's-bp', strain_name: 'Blue Pave', strain_abbrev: 'BP',
    cloneDaysAgo: 12, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-11',
    plant_count: 192, mom_plant_group_id: 's-bp', mom_strain_name: 'Blue Pave',
  },
  // Clone-stage (fresh cuts)
  {
    strain_id: 's-dw', strain_name: 'Dog Walker', strain_abbrev: 'DW',
    cloneDaysAgo: 8, current_stage: 'clone',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-02', flower_room_id: 'r-flw-04',
    plant_count: 240, mom_plant_group_id: 's-dw', mom_strain_name: 'Dog Walker',
  },
  // Committed future plan (planning view)
  {
    strain_id: 's-bp', strain_name: 'Blue Pave', strain_abbrev: 'BP',
    cloneDaysAgo: -7, current_stage: 'clone',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-02', flower_room_id: 'r-flw-09',
    plant_count: 240, mom_plant_group_id: 's-bp', mom_strain_name: 'Blue Pave',
    status: 'committed',
  },
];

export const MOCK_BATCHES: Batch[] = SEEDS.map(buildBatch);

/**
 * Rooms still need to expose strain summaries for the drawer's room view.
 * Derive them from MOCK_BATCHES by collecting current-stage batches per room.
 */
function buildRoom(
  room_id: string,
  room_name: string,
  room_code: string,
  room_type: string,
  capacity: number | null
): CalendarRoom {
  const inRoom = MOCK_BATCHES.filter((b) => b.current_room_id === room_id && b.current_stage !== 'closed');
  const strains: CalendarRoomStrain[] = inRoom.map((b) => {
    const currentSeg = b.segments.find((s) => s.is_current) ?? b.segments[0];
    return {
      strain_id: b.strain_id,
      strain_name: b.strain_name,
      plant_count: currentSeg.plant_count,
      growth_stage: b.current_stage,
      earliest_planted_date: b.clone_cut_date,
      estimated_harvest_date:
        b.segments.find((s) => s.stage === 'flower')?.end ?? null,
      stage_entered_at: currentSeg.start,
      days_in_stage: 0,
      is_mother: false,
    };
  });
  const total_plants = strains.reduce((acc, s) => acc + s.plant_count, 0);
  return {
    room_id,
    room_name,
    room_code,
    room_type,
    capacity_plants: capacity,
    square_footage: null,
    total_plants,
    strain_count: strains.length,
    capacity_utilization_pct: capacity ? Math.round((total_plants / capacity) * 100) : null,
    strains,
    plannedCycles: [],
  };
}

// Mother room is special: surface the mother strains as room.strains so the
// existing mother-bar render and the plan-form's MotherLot derivation continue
// to work. These are NOT batches; they are the genetics library.
function motherRoom(): CalendarRoom {
  const motherStrains: CalendarRoomStrain[] = [
    { strain_id: 's-bp', strain_name: 'Blue Pave', plant_count: 4, growth_stage: 'mother', earliest_planted_date: offsetDate(-320), estimated_harvest_date: null, stage_entered_at: offsetDate(-21), days_in_stage: 21, is_mother: true },
    { strain_id: 's-eh', strain_name: "Earth's Healing", plant_count: 3, growth_stage: 'mother', earliest_planted_date: offsetDate(-410), estimated_harvest_date: null, stage_entered_at: offsetDate(-21), days_in_stage: 21, is_mother: true },
    { strain_id: 's-sld', strain_name: 'Story Long Distance', plant_count: 4, growth_stage: 'mother', earliest_planted_date: offsetDate(-290), estimated_harvest_date: null, stage_entered_at: offsetDate(-21), days_in_stage: 21, is_mother: true },
    { strain_id: 's-dw', strain_name: 'Dog Walker', plant_count: 3, growth_stage: 'mother', earliest_planted_date: offsetDate(-180), estimated_harvest_date: null, stage_entered_at: offsetDate(-21), days_in_stage: 21, is_mother: true },
    { strain_id: 's-gf', strain_name: 'Gas Face', plant_count: 2, growth_stage: 'mother', earliest_planted_date: offsetDate(-220), estimated_harvest_date: null, stage_entered_at: offsetDate(-21), days_in_stage: 21, is_mother: true },
    { strain_id: 's-ff', strain_name: 'Flavor Flav', plant_count: 2, growth_stage: 'mother', earliest_planted_date: offsetDate(-240), estimated_harvest_date: null, stage_entered_at: offsetDate(-21), days_in_stage: 21, is_mother: true },
  ];
  return {
    room_id: 'r-mom-01',
    room_name: 'Mother Room',
    room_code: 'MOM-01',
    room_type: 'mother',
    capacity_plants: 24,
    square_footage: 200,
    total_plants: motherStrains.reduce((a, s) => a + s.plant_count, 0),
    strain_count: motherStrains.length,
    capacity_utilization_pct: 75,
    strains: motherStrains,
    plannedCycles: [],
  };
}

export const MOCK_ROOMS: CalendarRoom[] = [
  motherRoom(),
  buildRoom('r-veg-01', 'Veg Room 1', 'VEG-01', 'veg', 480),
  buildRoom('r-veg-02', 'Veg Room 2', 'VEG-02', 'veg', 480),
  buildRoom('r-veg-03', 'Veg Room 3', 'VEG-03', 'veg', 480),
  buildRoom('r-flw-01', 'Flower Room 1', 'FLW-01', 'flower', 360),
  buildRoom('r-flw-02', 'Flower Room 2', 'FLW-02', 'flower', 360),
  buildRoom('r-flw-03', 'Flower Room 3', 'FLW-03', 'flower', 360),
  buildRoom('r-flw-04', 'Flower Room 4', 'FLW-04', 'flower', 360),
  buildRoom('r-flw-05', 'Flower Room 5', 'FLW-05', 'flower', 360),
  buildRoom('r-flw-06', 'Flower Room 6', 'FLW-06', 'flower', 360),
  buildRoom('r-flw-07', 'Flower Room 7', 'FLW-07', 'flower', 360),
  buildRoom('r-flw-08', 'Flower Room 8', 'FLW-08', 'flower', 360),
  buildRoom('r-flw-09', 'Flower Room 9', 'FLW-09', 'flower', 360),
  buildRoom('r-flw-10', 'Flower Room 10', 'FLW-10', 'flower', 360),
  buildRoom('r-flw-11', 'Flower Room 11', 'FLW-11', 'flower', 360),
];

// Legacy planned-cycle export still needed for the form's Finalize path.
// Empty by default — plans created in the lab land here on Finalize.
export const MOCK_PLANNED: Record<string, import('@/features/production-planner/types').CalendarPlannedEntry[]> = {};

// Strain stats for the drawer + form (unchanged from earlier milestone).
function statRow(
  strain_id: string,
  strain_name: string,
  flowering_time_days: number,
  veg_days_avg: number,
  feed_group: 'A' | 'B' | 'C',
  flowering_time_class: 'short' | 'medium' | 'long',
  big_bud: number,
  trim_per_hr: number,
  yield_per_sqft: number,
  rosin_pct: number,
  thc: number,
  terps: number,
  demand_total: number,
  demand_unassigned: number
): StrainCultivationStats {
  return {
    strain_id, strain_name, display_name: strain_name,
    dominance_type: 'hybrid', category: 'flower', is_active: true,
    flowering_time_days, veg_days_avg, feed_group, flowering_time_class,
    harvest_count: 8, avg_wet_weight_per_plant_g: 720,
    last_harvest_date: offsetDate(-21),
    avg_wet_g_per_sqft: yield_per_sqft,
    avg_big_bud_pct: big_bud, avg_small_bud_pct: 100 - big_bud - 18,
    avg_trim_pct: 14, avg_waste_pct: 4,
    avg_trim_grams_per_hour: trim_per_hr, trim_session_count: 12,
    avg_rosin_yield_pct: rosin_pct, press_run_count: 6,
    avg_thc_pct: thc, avg_total_terpenes_mg_g: terps, coa_count: 4,
    demand_total_units: demand_total, demand_unassigned_units: demand_unassigned,
    order_count: 22, conversion_confidence: 'high', conversion_sessions: 18,
  };
}

export const MOCK_STRAIN_STATS: StrainCultivationStats[] = [
  statRow('s-bp', 'Blue Pave', 63, 21, 'B', 'medium', 64, 380, 924, 4.6, 28.4, 22, 1240, 412),
  statRow('s-eh', "Earth's Healing", 70, 28, 'A', 'long', 58, 320, 880, 5.2, 26.1, 28, 720, 0),
  statRow('s-sld', 'Story Long Distance', 56, 18, 'B', 'short', 71, 410, 1024, 4.1, 30.2, 19, 980, 240),
  statRow('s-pf', 'Ponderosa Front', 63, 21, 'B', 'medium', 62, 360, 902, 4.4, 27.8, 24, 480, 0),
  statRow('s-gmo', 'GMO', 70, 24, 'C', 'long', 68, 290, 956, 5.8, 31.5, 32, 880, 180),
  statRow('s-rz', 'Runtz', 63, 21, 'B', 'medium', 66, 340, 912, 4.8, 29.3, 26, 1080, 320),
  statRow('s-dw', 'Dog Walker', 56, 18, 'A', 'short', 72, 420, 1048, 3.9, 24.6, 17, 540, 60),
  statRow('s-gf', 'Gas Face', 63, 21, 'B', 'medium', 60, 350, 894, 4.2, 28.9, 23, 360, 0),
  statRow('s-ff', 'Flavor Flav', 56, 18, 'B', 'short', 64, 390, 968, 4.5, 27.4, 21, 420, 80),
];
