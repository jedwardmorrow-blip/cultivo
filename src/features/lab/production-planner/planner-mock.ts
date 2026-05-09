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

/**
 * Lifecycle stage taxonomy. Mirrors Sostanza's Master Production Schedule
 * column set — the canonical 9-phase pipeline they (and most commercial
 * indoor cultivators) use. Cult Cannabis live data flattens several of
 * these into v_batch_lifecycle.lifecycle_state values that
 * useLabPlannerData maps back into specific phases.
 *
 * - clone:      cuts rooting in the mother room (16-21d)
 * - veg:        rooted clones in vegetative growth (14-30d)
 * - flower:     12/12 photoperiod, mid-cycle (56-70d)
 * - harvest:    cut day (1-2d, room cleaning bookends)
 * - drying:     wet→dry hang phase (10-14d)
 * - trim:       buck and trim wet/dry product (5-10d)
 * - cure:       jar/cure prior to test (5-14d)
 * - test:       Sample collection + lab QA (10-14d)
 * - pack:       grade, pack, batch ready for sale (1-3d)
 *
 * Legacy values kept for back-compat with the Cult mock fixture and
 * v_batch_lifecycle.lifecycle_state mapping:
 * - processing: catch-all for fresh_frozen / bucked when phase unknown
 * - inventory:  packaged + bulk_available
 * - closed:     archived
 */
export type LifecycleStage =
  | 'clone'
  | 'veg'
  | 'flower'
  | 'harvest'
  | 'drying'
  | 'trim'
  | 'cure'
  | 'test'
  | 'pack'
  | 'processing'
  | 'inventory'
  | 'closed';

/**
 * Display labels per stage. Aligned to Sostanza's Master Production
 * Schedule column vocabulary (file 2):
 *   Cloning · Vegetative · Flowering · Harvest/Drying · Drying/Trim ·
 *   Trim/Curing · Curing/Sample · Testing · Packing/AFS
 * Operators recognize their workflow step names; abbreviated dialect
 * stays in tight cells (badges) and the canonical name lives in
 * tooltips.
 */
export const STAGE_SHORT: Record<LifecycleStage, string> = {
  clone: 'Clone',
  veg: 'Veg',
  flower: 'Flower',
  harvest: 'Harvest',
  drying: 'Drying',
  trim: 'Trim',
  cure: 'Cure',
  test: 'Testing',
  pack: 'Pack-AFS',
  processing: 'Processing',
  inventory: 'Inventory',
  closed: 'Closed',
};

export const STAGE_LONG: Record<LifecycleStage, string> = {
  clone: 'Cloning',
  veg: 'Vegetative Phase',
  flower: 'Flowering Phase',
  harvest: 'Harvest / Drying Starts',
  drying: 'Drying Ends / Trim Starts',
  trim: 'Trim Ends / Curing Starts',
  cure: 'Curing Ends (Sample Collected)',
  test: 'Testing',
  pack: 'Packing, Batch Ready for Sale',
  processing: 'Post-Harvest Processing',
  inventory: 'Bulk Available',
  closed: 'Archived',
};

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

/**
 * Cycle constants. Pulled into a config object so a future tenant
 * settings table can override them per facility — different tenants
 * run different clone+veg lengths. CLONE_DAYS=7 + VEG_DAYS=28 = 35d
 * total clone-to-flower-ready, matching Cult Cannabis veg duration
 * (verified against strains.veg_days_avg in fonreynkfeqywshijqpi).
 *
 * NOT enforced as a hard rule — this is operator-default cadence,
 * not a system-wide constraint. Operators decide successor staging
 * via the Plan a Batch Group form.
 */
export interface CycleConfig {
  clone_days: number;
  veg_days: number;
  flower_days: number;
}

export const DEFAULT_CYCLE_CONFIG: CycleConfig = {
  clone_days: 7,
  veg_days: 28,
  flower_days: 63,
};

const CLONE_DAYS = DEFAULT_CYCLE_CONFIG.clone_days;
const VEG_DAYS = DEFAULT_CYCLE_CONFIG.veg_days;
const FLOWER_DAYS = DEFAULT_CYCLE_CONFIG.flower_days;

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

// Curated multi-strain fixture, drawn entirely from real Cult Cannabis
// strain names verified against batch_registry in fonreynkfeqywshijqpi.
// Every flower room runs a multi-strain batch group (4-5 strains
// sharing a clone-cut date). Strains repeat across rooms at different
// cohort dates exactly like real cultivation: Magic Marker shows up
// in three different flower rooms at three different prefixes.
//
// Cycle staggering: 8 flower batch groups separated by ~8 days, so
// harvests cascade roughly weekly. One in-flight veg batch group in
// VEG-01 demonstrates the queue without prescribing a successor cadence
// (operators decide cycle timing themselves via the Plan a Batch Group
// form). VEG-02 and clone-stage capacity in MOM-01 are open for
// hand-planning.
//
// Batch numbers follow YYMMDD-STRAIN_ABBREV where YYMMDD is the
// shared clone-cut date for every strain in the batch group.
const SEEDS: BatchSeed[] = [
  // ── FLW-01 batch group (260203) · late-flower, 3d to harvest ──────
  {
    strain_id: 's-bd', strain_name: 'Blue Dream', strain_abbrev: 'BD',
    cloneDaysAgo: 95, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-bd', mom_strain_name: 'Blue Dream',
  },
  {
    strain_id: 's-gg4', strain_name: 'Gorilla Glue #4', strain_abbrev: 'GG4',
    cloneDaysAgo: 95, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-gg4', mom_strain_name: 'Gorilla Glue #4',
  },
  {
    strain_id: 's-icc', strain_name: 'Ice Cream Cake', strain_abbrev: 'ICC',
    cloneDaysAgo: 95, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-icc', mom_strain_name: 'Ice Cream Cake',
  },
  {
    strain_id: 's-mm', strain_name: 'Magic Marker', strain_abbrev: 'MM',
    cloneDaysAgo: 95, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-mm', mom_strain_name: 'Magic Marker',
  },

  // ── FLW-02 batch group (260211) · mid-late flower, 11d to harvest ──
  {
    strain_id: 's-hsc', strain_name: 'Hawaiian Snowcone', strain_abbrev: 'HSC',
    cloneDaysAgo: 87, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-02',
    plant_count: 22, mom_plant_group_id: 's-hsc', mom_strain_name: 'Hawaiian Snowcone',
  },
  {
    strain_id: 's-ssl', strain_name: 'Singapore Sling', strain_abbrev: 'SSL',
    cloneDaysAgo: 87, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-02',
    plant_count: 22, mom_plant_group_id: 's-ssl', mom_strain_name: 'Singapore Sling',
  },
  {
    strain_id: 's-caz', strain_name: 'Chile Azul', strain_abbrev: 'CAZ',
    cloneDaysAgo: 87, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-02',
    plant_count: 22, mom_plant_group_id: 's-caz', mom_strain_name: 'Chile Azul',
  },
  {
    strain_id: 's-pap', strain_name: 'Papaya', strain_abbrev: 'PAP',
    cloneDaysAgo: 87, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-02',
    plant_count: 22, mom_plant_group_id: null, mom_strain_name: 'External clone vendor',
  },

  // ── FLW-03 batch group (260219) · mid-flower, 19d to harvest ──────
  {
    strain_id: 's-pbb', strain_name: 'Peanut Butter Breath', strain_abbrev: 'PBB',
    cloneDaysAgo: 79, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-03',
    plant_count: 22, mom_plant_group_id: 's-pbb', mom_strain_name: 'Peanut Butter Breath',
  },
  {
    strain_id: 's-g41', strain_name: 'Gelato 41', strain_abbrev: 'G41',
    cloneDaysAgo: 79, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-03',
    plant_count: 22, mom_plant_group_id: 's-g41', mom_strain_name: 'Gelato 41',
  },
  {
    strain_id: 's-bm', strain_name: 'Black Maple', strain_abbrev: 'BM',
    cloneDaysAgo: 79, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-03',
    plant_count: 22, mom_plant_group_id: 's-bm', mom_strain_name: 'Black Maple',
  },
  {
    strain_id: 's-stp', strain_name: 'Stay Puft', strain_abbrev: 'STP',
    cloneDaysAgo: 79, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-03',
    plant_count: 22, mom_plant_group_id: 's-stp', mom_strain_name: 'Stay Puft',
  },

  // ── FLW-04 batch group (260227) · mid-flower, 27d to harvest ──────
  {
    strain_id: 's-mm', strain_name: 'Magic Marker', strain_abbrev: 'MM',
    cloneDaysAgo: 71, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-04',
    plant_count: 22, mom_plant_group_id: 's-mm', mom_strain_name: 'Magic Marker',
  },
  {
    strain_id: 's-hsc', strain_name: 'Hawaiian Snowcone', strain_abbrev: 'HSC',
    cloneDaysAgo: 71, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-04',
    plant_count: 22, mom_plant_group_id: 's-hsc', mom_strain_name: 'Hawaiian Snowcone',
  },
  {
    strain_id: 's-bd', strain_name: 'Blue Dream', strain_abbrev: 'BD',
    cloneDaysAgo: 71, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-04',
    plant_count: 22, mom_plant_group_id: 's-bd', mom_strain_name: 'Blue Dream',
  },
  {
    strain_id: 's-gg4', strain_name: 'Gorilla Glue #4', strain_abbrev: 'GG4',
    cloneDaysAgo: 71, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-04',
    plant_count: 22, mom_plant_group_id: 's-gg4', mom_strain_name: 'Gorilla Glue #4',
  },

  // ── FLW-05 batch group (260307) · early flower, 35d to harvest ────
  {
    strain_id: 's-ssl', strain_name: 'Singapore Sling', strain_abbrev: 'SSL',
    cloneDaysAgo: 63, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-05',
    plant_count: 29, mom_plant_group_id: 's-ssl', mom_strain_name: 'Singapore Sling',
  },
  {
    strain_id: 's-caz', strain_name: 'Chile Azul', strain_abbrev: 'CAZ',
    cloneDaysAgo: 63, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-05',
    plant_count: 29, mom_plant_group_id: 's-caz', mom_strain_name: 'Chile Azul',
  },
  {
    strain_id: 's-pap', strain_name: 'Papaya', strain_abbrev: 'PAP',
    cloneDaysAgo: 63, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-05',
    plant_count: 29, mom_plant_group_id: null, mom_strain_name: 'External clone vendor',
  },
  {
    strain_id: 's-pbb', strain_name: 'Peanut Butter Breath', strain_abbrev: 'PBB',
    cloneDaysAgo: 63, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-05',
    plant_count: 29, mom_plant_group_id: 's-pbb', mom_strain_name: 'Peanut Butter Breath',
  },

  // ── FLW-06 batch group (260315) · early flower, 43d to harvest ────
  {
    strain_id: 's-g41', strain_name: 'Gelato 41', strain_abbrev: 'G41',
    cloneDaysAgo: 55, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-06',
    plant_count: 45, mom_plant_group_id: 's-g41', mom_strain_name: 'Gelato 41',
  },
  {
    strain_id: 's-bm', strain_name: 'Black Maple', strain_abbrev: 'BM',
    cloneDaysAgo: 55, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-06',
    plant_count: 45, mom_plant_group_id: 's-bm', mom_strain_name: 'Black Maple',
  },
  {
    strain_id: 's-stp', strain_name: 'Stay Puft', strain_abbrev: 'STP',
    cloneDaysAgo: 55, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-06',
    plant_count: 45, mom_plant_group_id: 's-stp', mom_strain_name: 'Stay Puft',
  },
  {
    strain_id: 's-icc', strain_name: 'Ice Cream Cake', strain_abbrev: 'ICC',
    cloneDaysAgo: 55, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-06',
    plant_count: 45, mom_plant_group_id: 's-icc', mom_strain_name: 'Ice Cream Cake',
  },

  // ── FLW-07 batch group (260323) · early flower, 51d to harvest ────
  {
    strain_id: 's-mm', strain_name: 'Magic Marker', strain_abbrev: 'MM',
    cloneDaysAgo: 47, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-07',
    plant_count: 36, mom_plant_group_id: 's-mm', mom_strain_name: 'Magic Marker',
  },
  {
    strain_id: 's-hsc', strain_name: 'Hawaiian Snowcone', strain_abbrev: 'HSC',
    cloneDaysAgo: 47, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-07',
    plant_count: 36, mom_plant_group_id: 's-hsc', mom_strain_name: 'Hawaiian Snowcone',
  },
  {
    strain_id: 's-bd', strain_name: 'Blue Dream', strain_abbrev: 'BD',
    cloneDaysAgo: 47, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-07',
    plant_count: 36, mom_plant_group_id: 's-bd', mom_strain_name: 'Blue Dream',
  },
  {
    strain_id: 's-gg4', strain_name: 'Gorilla Glue #4', strain_abbrev: 'GG4',
    cloneDaysAgo: 47, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-07',
    plant_count: 36, mom_plant_group_id: 's-gg4', mom_strain_name: 'Gorilla Glue #4',
  },
  {
    strain_id: 's-pap', strain_name: 'Papaya', strain_abbrev: 'PAP',
    cloneDaysAgo: 47, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-07',
    plant_count: 36, mom_plant_group_id: null, mom_strain_name: 'External clone vendor',
  },

  // ── FLW-08 batch group (260331) · just-flipped, 59d to harvest ────
  {
    strain_id: 's-ssl', strain_name: 'Singapore Sling', strain_abbrev: 'SSL',
    cloneDaysAgo: 39, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-08',
    plant_count: 45, mom_plant_group_id: 's-ssl', mom_strain_name: 'Singapore Sling',
  },
  {
    strain_id: 's-caz', strain_name: 'Chile Azul', strain_abbrev: 'CAZ',
    cloneDaysAgo: 39, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-08',
    plant_count: 45, mom_plant_group_id: 's-caz', mom_strain_name: 'Chile Azul',
  },
  {
    strain_id: 's-pbb', strain_name: 'Peanut Butter Breath', strain_abbrev: 'PBB',
    cloneDaysAgo: 39, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-08',
    plant_count: 45, mom_plant_group_id: 's-pbb', mom_strain_name: 'Peanut Butter Breath',
  },
  {
    strain_id: 's-g41', strain_name: 'Gelato 41', strain_abbrev: 'G41',
    cloneDaysAgo: 39, current_stage: 'flower',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-08',
    plant_count: 45, mom_plant_group_id: 's-g41', mom_strain_name: 'Gelato 41',
  },

  // ── VEG-01 batch group (260415) · mid-veg in-flight ───────────────
  // Single in-flight veg group so the queue concept is visible. Successor
  // assignment is left to the operator to plan via the form, not driven
  // by a system-wide cycle constraint.
  {
    strain_id: 's-bm', strain_name: 'Black Maple', strain_abbrev: 'BM',
    cloneDaysAgo: 24, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-bm', mom_strain_name: 'Black Maple',
  },
  {
    strain_id: 's-stp', strain_name: 'Stay Puft', strain_abbrev: 'STP',
    cloneDaysAgo: 24, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-stp', mom_strain_name: 'Stay Puft',
  },
  {
    strain_id: 's-g41', strain_name: 'Gelato 41', strain_abbrev: 'G41',
    cloneDaysAgo: 24, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-g41', mom_strain_name: 'Gelato 41',
  },
  {
    strain_id: 's-mm', strain_name: 'Magic Marker', strain_abbrev: 'MM',
    cloneDaysAgo: 24, current_stage: 'veg',
    clone_room_id: 'r-mom-01', veg_room_id: 'r-veg-01', flower_room_id: 'r-flw-01',
    plant_count: 22, mom_plant_group_id: 's-mm', mom_strain_name: 'Magic Marker',
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
  capacity: number | null,
  square_footage: number | null
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
    square_footage,
    total_plants,
    strain_count: strains.length,
    capacity_utilization_pct: capacity ? Math.round((total_plants / capacity) * 100) : null,
    strains,
    plannedCycles: [],
  };
}

/**
 * Mother types. Mother batch groups inherit cohort identity from a
 * source flower batch group: when a flower batch group transitions
 * veg→flower, 2 plants per strain are held back as moms. Those held-
 * back plants form a Mother Batch Group, sharing the YYMMDD prefix
 * of their source flower batch group.
 *
 * Within a group, individual moms have their own health, age, cuts
 * taken, and last-cut date — they're tracked separately because moms
 * within the same group can degrade at different rates. The form's
 * mom selector groups moms by their batch group for UX purposes
 * (operators select a group, cuts available are summed across the
 * group's individual moms), but per-mom audit history is preserved.
 *
 * Live mapping (Phase 4 of cycles unification):
 *   - Mother batch group identity = (room_id, source_flower_cycle_id)
 *   - Individual mom = plant_groups row WHERE is_mother=true
 *   - cuts_taken_lifetime = count of batch_registry rows that linked
 *     to this plant_groups.id via mother_plant_group_ids
 *   - last_cut_date = max(batch_registry.clone_date) for those linkages
 *   - health = new column on plant_groups (audit-captured)
 */
export type MotherHealth = 'healthy' | 'declining' | 'needs_replacement';

export interface MotherIndividual {
  /** Stable mom id; matches plant_groups.id in live mode. */
  id: string;
  strain_id: string;
  strain_name: string;
  /** When the cut was taken from a parent (clone-cut date of source). */
  planted_date: string;
  /** When this plant was held back as a mom (= source flower flip date). */
  became_mom_date: string;
  /** Last time cuts were taken from this individual mom. */
  last_cut_date: string | null;
  /** Lifetime number of cutback sessions performed on this mom. */
  cuts_taken_lifetime: number;
  /** Operator-set rotation cap. After cuts_max_rotations sessions, mom is exhausted. */
  cuts_max_rotations: number;
  /** Operator-captured health from the mother audit. */
  health: MotherHealth;
  /** Operator marked retired (e.g., culled, replaced). Excluded from cut allocation. */
  retired: boolean;
}

export interface MotherBatchGroup {
  /** YYMMDD prefix matching the source flower batch group. */
  group_prefix: string;
  /** Room code where these moms reside (typically MOM-01). */
  room_code: string;
  /** Cohort label, e.g., "MBG · 260203 (FLW-01 source)". */
  label: string;
  /** Source flower batch group these moms were held back from. */
  source_flower_room_code: string;
  /** When the group's clone cuts were taken (= source flower batch group's clone-cut date). */
  cut_date: string;
  /** When held back as moms (= source flower batch group's flower-flip date). */
  became_moms_date: string;
  /** Individual moms in this group. */
  moms: MotherIndividual[];
}

/**
 * Build the demo's mother batch groups. Three groups sourced from the
 * three oldest flower batch groups in the fixture (FLW-01 / FLW-02 /
 * FLW-03). Each group has the source flower batch group's strains ×
 * 2 moms per strain. Cut histories are mocked plausibly — moms haven't
 * been heavily worked yet (0-2 lifetime rotations), some declining,
 * one needs replacement so the operator-action surface stays
 * exercised.
 */
function buildMotherBatchGroups(): MotherBatchGroup[] {
  // Source flower batch groups (must match SEEDS above).
  const sources = [
    { prefix: '260203', cloneDaysAgo: 95, flowerRoom: 'FLW-01', strains: [
      { strain_id: 's-bd', strain_name: 'Blue Dream' },
      { strain_id: 's-gg4', strain_name: 'Gorilla Glue #4' },
      { strain_id: 's-icc', strain_name: 'Ice Cream Cake' },
      { strain_id: 's-mm', strain_name: 'Magic Marker' },
    ] },
    { prefix: '260211', cloneDaysAgo: 87, flowerRoom: 'FLW-02', strains: [
      { strain_id: 's-hsc', strain_name: 'Hawaiian Snowcone' },
      { strain_id: 's-ssl', strain_name: 'Singapore Sling' },
      { strain_id: 's-caz', strain_name: 'Chile Azul' },
      { strain_id: 's-pap', strain_name: 'Papaya' },
    ] },
    { prefix: '260219', cloneDaysAgo: 79, flowerRoom: 'FLW-03', strains: [
      { strain_id: 's-pbb', strain_name: 'Peanut Butter Breath' },
      { strain_id: 's-g41', strain_name: 'Gelato 41' },
      { strain_id: 's-bm', strain_name: 'Black Maple' },
      { strain_id: 's-stp', strain_name: 'Stay Puft' },
    ] },
  ];

  // Per-mom variation table: index 0 is the "A" mom (healthier on average),
  // index 1 is the "B" mom (some declining or needing replacement). Cut
  // histories vary so the demo shows non-uniform cut tracking within a
  // group. cloneDaysAgoRelative is days_ago_at_cut_event for the mom's
  // most recent cut session.
  const variants = [
    [
      { health: 'healthy' as MotherHealth, cuts_taken: 1, last_cut_days_ago: 28 },
      { health: 'healthy' as MotherHealth, cuts_taken: 1, last_cut_days_ago: 28 },
    ],
    [
      { health: 'healthy' as MotherHealth, cuts_taken: 2, last_cut_days_ago: 14 },
      { health: 'declining' as MotherHealth, cuts_taken: 2, last_cut_days_ago: 14 },
    ],
    [
      { health: 'declining' as MotherHealth, cuts_taken: 1, last_cut_days_ago: 21 },
      { health: 'needs_replacement' as MotherHealth, cuts_taken: 3, last_cut_days_ago: 7 },
    ],
  ];

  return sources.map((src, srcIdx) => {
    const cutDate = offsetDate(-src.cloneDaysAgo);
    const becameMomsDate = offsetDate(-src.cloneDaysAgo + 35);
    const moms: MotherIndividual[] = [];
    src.strains.forEach((strain, strainIdx) => {
      // 2 moms per strain in the group.
      for (let i = 0; i < 2; i++) {
        const v = variants[(srcIdx + strainIdx + i) % variants.length][i];
        const lastCutDate = v.cuts_taken > 0
          ? offsetDate(-v.last_cut_days_ago)
          : null;
        moms.push({
          id: `mom-${src.prefix}-${strain.strain_id}-${i === 0 ? 'A' : 'B'}`,
          strain_id: strain.strain_id,
          strain_name: strain.strain_name,
          planted_date: cutDate,
          became_mom_date: becameMomsDate,
          last_cut_date: lastCutDate,
          cuts_taken_lifetime: v.cuts_taken,
          cuts_max_rotations: 4,
          health: v.health,
          retired: false,
        });
      }
    });
    return {
      group_prefix: src.prefix,
      room_code: 'MOM-01',
      label: `MBG · ${src.prefix} (${src.flowerRoom} source)`,
      source_flower_room_code: src.flowerRoom,
      cut_date: cutDate,
      became_moms_date: becameMomsDate,
      moms,
    };
  });
}

export const MOCK_MOTHER_BATCH_GROUPS: MotherBatchGroup[] = buildMotherBatchGroups();

// Mother room is special: surface the mother strains as room.strains so the
// existing mother-bar render continues to work. These are NOT batches; they
// are the genetics library. Per-strain plant_count rolls up from all moms
// across all mother batch groups.
function motherRoom(): CalendarRoom {
  const byStrain = new Map<string, { strain_id: string; strain_name: string; plant_count: number; earliest_planted: string; latest_stage_entered: string }>();
  for (const mbg of MOCK_MOTHER_BATCH_GROUPS) {
    for (const mom of mbg.moms) {
      if (mom.retired) continue;
      const existing = byStrain.get(mom.strain_id);
      if (!existing) {
        byStrain.set(mom.strain_id, {
          strain_id: mom.strain_id,
          strain_name: mom.strain_name,
          plant_count: 1,
          earliest_planted: mom.planted_date,
          latest_stage_entered: mom.became_mom_date,
        });
      } else {
        existing.plant_count += 1;
        if (mom.planted_date < existing.earliest_planted) existing.earliest_planted = mom.planted_date;
        if (mom.became_mom_date > existing.latest_stage_entered) existing.latest_stage_entered = mom.became_mom_date;
      }
    }
  }
  const motherStrains: CalendarRoomStrain[] = Array.from(byStrain.values()).map(s => ({
    strain_id: s.strain_id,
    strain_name: s.strain_name,
    plant_count: s.plant_count,
    growth_stage: 'mother',
    earliest_planted_date: s.earliest_planted,
    estimated_harvest_date: null,
    stage_entered_at: s.latest_stage_entered,
    days_in_stage: 0,
    is_mother: true,
  }));
  const total = motherStrains.reduce((a, s) => a + s.plant_count, 0);
  return {
    room_id: 'r-mom-01',
    room_name: 'Mother Room',
    room_code: 'MOM-01',
    room_type: 'mother',
    capacity_plants: 36,
    square_footage: 200,
    total_plants: total,
    strain_count: motherStrains.length,
    capacity_utilization_pct: Math.round((total / 36) * 100),
    strains: motherStrains,
    plannedCycles: [],
  };
}

// Room sqft from grow_rooms in fonreynkfeqywshijqpi (verified 2026-05-09):
// FLW-01..04 → 352 sqft, FLW-05 → 469 sqft, FLW-06..08 → 720 sqft.
// MOM-01 and VEG-01..02 sqft are NULL in prod (operator hasn't captured).
// Mocked here; quarantine treatment per cultivo_planner_data_lineage
// applies once the live mode reads NULL from grow_rooms.
export const MOCK_ROOMS: CalendarRoom[] = [
  motherRoom(),
  buildRoom('r-veg-01', 'Veg Room 1', 'VEG-01', 'veg', 360, 220),
  buildRoom('r-veg-02', 'Veg Room 2', 'VEG-02', 'veg', 360, 220),
  buildRoom('r-flw-01', 'Flower Room 1', 'FLW-01', 'flower', 88, 352),
  buildRoom('r-flw-02', 'Flower Room 2', 'FLW-02', 'flower', 88, 352),
  buildRoom('r-flw-03', 'Flower Room 3', 'FLW-03', 'flower', 88, 352),
  buildRoom('r-flw-04', 'Flower Room 4', 'FLW-04', 'flower', 88, 352),
  buildRoom('r-flw-05', 'Flower Room 5', 'FLW-05', 'flower', 117, 469),
  buildRoom('r-flw-06', 'Flower Room 6', 'FLW-06', 'flower', 180, 720),
  buildRoom('r-flw-07', 'Flower Room 7', 'FLW-07', 'flower', 180, 720),
  buildRoom('r-flw-08', 'Flower Room 8', 'FLW-08', 'flower', 180, 720),
];

// Legacy planned-cycle export still needed for the form's Finalize path.
// Empty by default — plans created in the lab land here on Finalize.
export const MOCK_PLANNED: Record<string, import('@/features/production-planner/types').CalendarPlannedEntry[]> = {};

// Strain stats for the drawer + form (unchanged from earlier milestone).
interface StatRowInput {
  strain_id: string;
  strain_name: string;
  flowering_time_days: number;
  veg_days_avg: number;
  feed_group: 'A' | 'B' | 'C';
  flowering_time_class: 'short' | 'medium' | 'long';
  big_bud: number;
  trim_per_hr: number;
  /** g/sqft yield (operator's working unit; range 55-78 around 65 avg). */
  yield_per_sqft: number;
  rosin_pct: number;
  thc: number;
  terps: number;
  demand_total: number;
  demand_unassigned: number;
  /** Historical rooting rate, displayed not auto-applied. */
  rooting: number;
  /** Historical veg→flower survival rate, displayed not auto-applied. */
  vegToFlower: number;
  /** Cuts per cutback session per mom, 50-90 range. */
  cutsPerSession: number;
}

function statRow(input: StatRowInput): StrainCultivationStats {
  return {
    strain_id: input.strain_id,
    strain_name: input.strain_name,
    display_name: input.strain_name,
    dominance_type: 'hybrid',
    category: 'flower',
    is_active: true,
    flowering_time_days: input.flowering_time_days,
    veg_days_avg: input.veg_days_avg,
    feed_group: input.feed_group,
    flowering_time_class: input.flowering_time_class,
    harvest_count: 8,
    // Per-plant yield derived from yield/sqft × 4 sqft per plant (typical
    // commercial density). Cult uses ~4 sqft per plant in flower rooms.
    avg_wet_weight_per_plant_g: Math.round(input.yield_per_sqft * 4),
    last_harvest_date: offsetDate(-21),
    avg_wet_g_per_sqft: input.yield_per_sqft,
    avg_big_bud_pct: input.big_bud,
    avg_small_bud_pct: 100 - input.big_bud - 18,
    avg_trim_pct: 14,
    avg_waste_pct: 4,
    avg_trim_grams_per_hour: input.trim_per_hr,
    trim_session_count: 12,
    avg_rosin_yield_pct: input.rosin_pct,
    press_run_count: 6,
    avg_thc_pct: input.thc,
    avg_total_terpenes_mg_g: input.terps,
    coa_count: 4,
    demand_total_units: input.demand_total,
    demand_unassigned_units: input.demand_unassigned,
    order_count: 22,
    conversion_confidence: 'high',
    conversion_sessions: 18,
    historical_rooting_success_rate: input.rooting,
    historical_veg_to_flower_survival_rate: input.vegToFlower,
    cuts_per_session_per_mom: input.cutsPerSession,
  };
}

// 12 strains, all verified against batch_registry.strain in cult prod
// (project fonreynkfeqywshijqpi). Yield centered around 65 g/sqft
// with strain-specific variation (range 55-78). Flowering times match
// strains.flowering_time_days from prod (Black Maple/Stay Puft 60d,
// Chile Azul 87d outlier, Papaya 70d, others 63d). Veg days = 28
// matches strains.veg_days_avg in prod. Historical rooting + survival
// rates are mocked operator-collected statistics, displayed in the
// form as context — NOT auto-applied to plant counts.
export const MOCK_STRAIN_STATS: StrainCultivationStats[] = [
  statRow({ strain_id: 's-bd',  strain_name: 'Blue Dream',           flowering_time_days: 63, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 60, trim_per_hr: 360, yield_per_sqft: 55, rosin_pct: 4.5, thc: 22.0, terps: 18, demand_total: 1200, demand_unassigned: 240, rooting: 0.78, vegToFlower: 0.93, cutsPerSession: 65 }),
  statRow({ strain_id: 's-gg4', strain_name: 'Gorilla Glue #4',      flowering_time_days: 63, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 65, trim_per_hr: 380, yield_per_sqft: 78, rosin_pct: 4.7, thc: 25.5, terps: 21, demand_total: 980,  demand_unassigned: 180, rooting: 0.74, vegToFlower: 0.91, cutsPerSession: 80 }),
  statRow({ strain_id: 's-icc', strain_name: 'Ice Cream Cake',       flowering_time_days: 63, veg_days_avg: 28, feed_group: 'A', flowering_time_class: 'medium', big_bud: 64, trim_per_hr: 340, yield_per_sqft: 72, rosin_pct: 5.0, thc: 26.4, terps: 24, demand_total: 880,  demand_unassigned: 320, rooting: 0.70, vegToFlower: 0.89, cutsPerSession: 75 }),
  statRow({ strain_id: 's-mm',  strain_name: 'Magic Marker',         flowering_time_days: 63, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 66, trim_per_hr: 380, yield_per_sqft: 68, rosin_pct: 4.6, thc: 29.1, terps: 24, demand_total: 600,  demand_unassigned: 140, rooting: 0.72, vegToFlower: 0.91, cutsPerSession: 70 }),
  statRow({ strain_id: 's-hsc', strain_name: 'Hawaiian Snowcone',    flowering_time_days: 63, veg_days_avg: 28, feed_group: 'A', flowering_time_class: 'medium', big_bud: 65, trim_per_hr: 360, yield_per_sqft: 58, rosin_pct: 4.7, thc: 28.2, terps: 22, demand_total: 540,  demand_unassigned: 120, rooting: 0.68, vegToFlower: 0.88, cutsPerSession: 55 }),
  statRow({ strain_id: 's-ssl', strain_name: 'Singapore Sling',      flowering_time_days: 63, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 62, trim_per_hr: 350, yield_per_sqft: 62, rosin_pct: 4.3, thc: 27.1, terps: 20, demand_total: 360,  demand_unassigned: 60,  rooting: 0.71, vegToFlower: 0.90, cutsPerSession: 60 }),
  statRow({ strain_id: 's-caz', strain_name: 'Chile Azul',           flowering_time_days: 87, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'long',   big_bud: 67, trim_per_hr: 370, yield_per_sqft: 65, rosin_pct: 4.5, thc: 28.6, terps: 23, demand_total: 480,  demand_unassigned: 80,  rooting: 0.69, vegToFlower: 0.87, cutsPerSession: 60 }),
  statRow({ strain_id: 's-pap', strain_name: 'Papaya',               flowering_time_days: 70, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 65, trim_per_hr: 380, yield_per_sqft: 70, rosin_pct: 4.2, thc: 22.6, terps: 26, demand_total: 480,  demand_unassigned: 120, rooting: 0.75, vegToFlower: 0.92, cutsPerSession: 75 }),
  statRow({ strain_id: 's-pbb', strain_name: 'Peanut Butter Breath', flowering_time_days: 63, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 62, trim_per_hr: 350, yield_per_sqft: 64, rosin_pct: 4.6, thc: 27.2, terps: 23, demand_total: 540,  demand_unassigned: 60,  rooting: 0.73, vegToFlower: 0.91, cutsPerSession: 65 }),
  statRow({ strain_id: 's-g41', strain_name: 'Gelato 41',            flowering_time_days: 63, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 68, trim_per_hr: 400, yield_per_sqft: 75, rosin_pct: 4.4, thc: 27.8, terps: 22, demand_total: 720,  demand_unassigned: 180, rooting: 0.77, vegToFlower: 0.93, cutsPerSession: 85 }),
  statRow({ strain_id: 's-bm',  strain_name: 'Black Maple',          flowering_time_days: 60, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 64, trim_per_hr: 360, yield_per_sqft: 60, rosin_pct: 4.4, thc: 28.4, terps: 22, demand_total: 420,  demand_unassigned: 100, rooting: 0.72, vegToFlower: 0.90, cutsPerSession: 60 }),
  statRow({ strain_id: 's-stp', strain_name: 'Stay Puft',            flowering_time_days: 60, veg_days_avg: 28, feed_group: 'B', flowering_time_class: 'medium', big_bud: 63, trim_per_hr: 360, yield_per_sqft: 66, rosin_pct: 4.4, thc: 28.0, terps: 21, demand_total: 480,  demand_unassigned: 80,  rooting: 0.70, vegToFlower: 0.89, cutsPerSession: 65 }),
];
