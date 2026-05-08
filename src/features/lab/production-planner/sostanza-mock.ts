import type { CalendarRoom, CalendarRoomStrain, StrainCultivationStats } from '@/features/production-planner/types';
import type { Batch, BatchSegment, LifecycleStage } from './planner-mock';
import type { MotherLot } from './LabPlanCycleForm';

/**
 * Sostanza-flavor mock fixture for /lab/production-planner?demo=sostanza
 *
 * Mirrors the Sostanza Master Production Planning Schedule:
 * - Pink Kush monoculture across FLW-01..04 (4 flower rooms, 28 sqft each)
 * - 800 g/sqft yield, 22.4 kg per harvest
 * - Sequential integer batch numbers (288-311) carried through
 *   batch_code; YYMMDD-PK rendered as the secondary code in tooltips
 * - Cycle durations from their parameter row:
 *     Mother Cutback → Cloning      16d
 *     Cloning → Veg                 18d
 *     Veg → Flower                  14d
 *     Flower → Harvest              69d
 *     Harvest → Cleaning            1d
 *     Cleaning → Trim               4d
 *     Trim → Cure                   10d
 *     Cure → Cure End (sample)      5d
 *     Cure End → Grade              14d
 *     Grade → Pack/AFS              1d
 *   Total ≈ 152 days from cut to AFS
 * - Mother Cutback dates seeded for the genetics library
 * - Operators (Tony, Deron, Philipp, Juan) carried as a resource list for
 *   later resource-row work; not rendered yet on the Gantt
 *
 * The fixture is anchored to MOCK_TODAY so Sostanza viewers see a live
 * snapshot of "what's happening this week" regardless of when they open
 * the artifact. 24-batch yearly cadence covers ~26 weeks of past +
 * present + planned.
 */

const SOSTANZA_TODAY = new Date();
SOSTANZA_TODAY.setHours(0, 0, 0, 0);

function offsetDate(days: number): string {
  const d = new Date(SOSTANZA_TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function batchCode(daysFromToday: number, batchNum: number): string {
  const d = new Date(SOSTANZA_TODAY);
  d.setDate(d.getDate() + daysFromToday);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${batchNum} · ${yy}${mm}${dd}-PK`;
}

// Sostanza cycle parameter row (file 2):
const CUTBACK_DAYS = 16;
const CLONE_DAYS = 18;
const VEG_DAYS = 14;
const FLOWER_DAYS = 69;
const HARVEST_DAYS = 1;
const CLEANING_DAYS = 4;
const TRIM_DAYS = 10;
const CURE_DAYS = 5;
const TEST_DAYS = 14;
const GRADE_PACK_DAYS = 1;

interface SostanzaSeed {
  batch_num: number;
  /** Days relative to today when clones were cut. Negative = in past. */
  cloneDaysAgo: number;
  current_stage: LifecycleStage;
  flower_room_id: string;
  plant_count: number;
  status?: 'active' | 'committed' | 'draft' | 'completed';
  notes?: string;
}

/**
 * Build a Sostanza-shape batch with all 9 lifecycle segments stamped.
 * Current segment derived from cloneDaysAgo + each phase duration.
 */
function buildSostanzaBatch(seed: SostanzaSeed): Batch {
  // All anchors expressed as offsets from today.
  const cloneStart = -seed.cloneDaysAgo;
  const vegStart = cloneStart + CLONE_DAYS;
  const flowerStart = vegStart + VEG_DAYS;
  const harvestStart = flowerStart + FLOWER_DAYS;
  const dryStart = harvestStart + HARVEST_DAYS + CLEANING_DAYS;
  const trimStart = dryStart + 0; // Drying happens during the cleaning window in their model
  const cureStart = trimStart + TRIM_DAYS;
  const testStart = cureStart + CURE_DAYS;
  const gradeStart = testStart + TEST_DAYS;
  const afsStart = gradeStart + GRADE_PACK_DAYS;

  const segments: BatchSegment[] = [
    {
      stage: 'clone',
      room_id: 'r-mom-01',
      start: offsetDate(cloneStart),
      end: offsetDate(vegStart),
      plant_count: seed.plant_count,
      is_current: seed.current_stage === 'clone',
      is_projected: cloneStart > 0,
    },
    {
      stage: 'veg',
      room_id: 'r-veg-01',
      start: offsetDate(vegStart),
      end: offsetDate(flowerStart),
      plant_count: Math.round(seed.plant_count * 0.55), // attrition cuts → 4L
      is_current: seed.current_stage === 'veg',
      is_projected: vegStart > 0 && seed.current_stage !== 'veg',
    },
    {
      stage: 'flower',
      room_id: seed.flower_room_id,
      start: offsetDate(flowerStart),
      end: offsetDate(harvestStart),
      plant_count: Math.round(seed.plant_count * 0.50), // F-box transfer
      is_current: seed.current_stage === 'flower',
      is_projected: flowerStart > 0 && seed.current_stage !== 'flower',
    },
    {
      stage: 'harvest',
      room_id: seed.flower_room_id,
      start: offsetDate(harvestStart),
      end: offsetDate(dryStart),
      plant_count: Math.round(seed.plant_count * 0.45),
      is_current: seed.current_stage === 'harvest',
      is_projected: harvestStart > 0 && seed.current_stage !== 'harvest',
    },
    {
      stage: 'drying',
      room_id: 'r-dry-01',
      start: offsetDate(dryStart),
      end: offsetDate(trimStart + TRIM_DAYS),
      plant_count: Math.round(seed.plant_count * 0.45),
      is_current: seed.current_stage === 'drying',
      is_projected: dryStart > 0 && seed.current_stage !== 'drying',
    },
    {
      stage: 'trim',
      room_id: 'r-trim-01',
      start: offsetDate(trimStart),
      end: offsetDate(cureStart),
      plant_count: Math.round(seed.plant_count * 0.45),
      is_current: seed.current_stage === 'trim',
      is_projected: trimStart > 0 && seed.current_stage !== 'trim',
    },
    {
      stage: 'cure',
      room_id: 'r-cure-01',
      start: offsetDate(cureStart),
      end: offsetDate(testStart),
      plant_count: Math.round(seed.plant_count * 0.45),
      is_current: seed.current_stage === 'cure',
      is_projected: cureStart > 0 && seed.current_stage !== 'cure',
    },
    {
      stage: 'test',
      room_id: 'r-cure-01',
      start: offsetDate(testStart),
      end: offsetDate(gradeStart),
      plant_count: Math.round(seed.plant_count * 0.45),
      is_current: seed.current_stage === 'test',
      is_projected: testStart > 0 && seed.current_stage !== 'test',
    },
    {
      stage: 'pack',
      room_id: 'r-pack-01',
      start: offsetDate(gradeStart),
      end: offsetDate(afsStart),
      plant_count: Math.round(seed.plant_count * 0.45),
      is_current: seed.current_stage === 'pack',
      is_projected: gradeStart > 0 && seed.current_stage !== 'pack',
    },
  ];

  // current_room_id resolved from the segment that is current.
  const currentSeg = segments.find(s => s.is_current) ?? segments[0];

  return {
    batch_id: `sb-${seed.batch_num}`,
    batch_code: batchCode(cloneStart, seed.batch_num),
    strain_id: 's-pk',
    strain_name: 'Pink Kush',
    strain_abbrev: 'PK',
    clone_cut_date: offsetDate(cloneStart),
    current_stage: seed.current_stage,
    current_room_id: currentSeg.room_id,
    mom_plant_group_id: 'mom-pk-01',
    mom_strain_name: 'Pink Kush',
    segments,
    status: seed.status ?? 'active',
    forecast_yield_grams: 22400, // 22.4 kg per harvest, fixed per facility profile
    days_in_stage: undefined,
    lifecycle_state: undefined,
  };
}

/**
 * 16 batches in 4-room continuous rotation (file 2 cadence). Each
 * flower room sees a new flip every 4 × 30 ≈ 120 days, leaving
 * roughly 50 days of room-idle time between same-room flower
 * segments — which is what the gap analysis surfaces. Sostanza's
 * actual schedule shows similar 28-50d gaps depending on dry-room
 * availability and turnaround pace.
 *
 * Room rotation: r-flw-04 → r-flw-01 → r-flw-02 → r-flw-03 → repeat.
 *
 * cloneDaysAgo grid (30-day cadence) with current_stage chosen to
 * match where each batch lands today:
 *   188d → pack/test (oldest visible, post-AFS)
 *   158d → cure
 *   128d → trim
 *    98d → drying / harvest
 *    68d → flower (mid)
 *    38d → flower (early)
 *     8d → veg
 *   -22d → clone (fresh)
 *   -52d / -82d / -112d / -142d → committed future plans
 *
 * One deliberate scheduling collision in r-flw-02: a planned flip
 * lands 4d before the prior batch's projected harvest. Surfaces as
 * a single OVERLAP · 4d band so the gap-analysis demo has both
 * positive and negative cases visible without exploding the canvas.
 */
const SEEDS: SostanzaSeed[] = [
  // Currently mid-flower — one per room, staggered ~30 days apart
  { batch_num: 296, cloneDaysAgo: 98, current_stage: 'harvest', flower_room_id: 'r-flw-04', plant_count: 800 },
  { batch_num: 297, cloneDaysAgo: 68, current_stage: 'flower', flower_room_id: 'r-flw-01', plant_count: 800 },
  { batch_num: 298, cloneDaysAgo: 38, current_stage: 'flower', flower_room_id: 'r-flw-02', plant_count: 800 },
  { batch_num: 299, cloneDaysAgo: 8, current_stage: 'veg', flower_room_id: 'r-flw-03', plant_count: 800 },

  // Post-harvest pipeline — older batches still in dry/trim/cure/test/pack
  // Each in their dedicated processing room, lineage from a flower room
  { batch_num: 295, cloneDaysAgo: 128, current_stage: 'drying', flower_room_id: 'r-flw-03', plant_count: 800 },
  { batch_num: 294, cloneDaysAgo: 158, current_stage: 'trim',   flower_room_id: 'r-flw-02', plant_count: 800 },
  { batch_num: 293, cloneDaysAgo: 188, current_stage: 'cure',   flower_room_id: 'r-flw-01', plant_count: 800 },
  { batch_num: 292, cloneDaysAgo: 218, current_stage: 'test',   flower_room_id: 'r-flw-04', plant_count: 800 },
  { batch_num: 291, cloneDaysAgo: 248, current_stage: 'pack',   flower_room_id: 'r-flw-03', plant_count: 800 },

  // Future planned cycles — clone stage, committed status (planning view).
  // Maintain 4-room rotation continuing from the last past room (r-flw-03).
  // Cadence stays 30 days. cloneDaysAgo negative = future.
  { batch_num: 300, cloneDaysAgo: -22, current_stage: 'clone', flower_room_id: 'r-flw-04', plant_count: 800, status: 'committed' },
  { batch_num: 301, cloneDaysAgo: -52, current_stage: 'clone', flower_room_id: 'r-flw-01', plant_count: 800, status: 'committed' },
  { batch_num: 302, cloneDaysAgo: -82, current_stage: 'clone', flower_room_id: 'r-flw-02', plant_count: 800, status: 'committed' },
  { batch_num: 303, cloneDaysAgo: -112, current_stage: 'clone', flower_room_id: 'r-flw-03', plant_count: 800, status: 'committed' },

  // Deliberate scheduling collision — a draft plan in r-flw-02 lands
  // 4 days before batch 298's projected harvest. Surfaces the
  // OVERLAP · 4d band on FLW-02 in the gap-analysis demo.
  { batch_num: 304, cloneDaysAgo: -29, current_stage: 'clone', flower_room_id: 'r-flw-02', plant_count: 800, status: 'draft' },

  // Past completed batches — give the AFS row some history
  { batch_num: 290, cloneDaysAgo: 278, current_stage: 'pack', flower_room_id: 'r-flw-02', plant_count: 800, status: 'completed' },
  { batch_num: 289, cloneDaysAgo: 308, current_stage: 'pack', flower_room_id: 'r-flw-01', plant_count: 800, status: 'completed' },
];

export const SOSTANZA_BATCHES: Batch[] = SEEDS.map(buildSostanzaBatch);

function buildSostanzaRoom(
  room_id: string,
  room_name: string,
  room_code: string,
  room_type: string,
  capacity: number | null,
  square_footage: number | null
): CalendarRoom {
  const inRoom = SOSTANZA_BATCHES.filter(
    b => b.current_room_id === room_id && b.current_stage !== 'closed'
  );
  const strains: CalendarRoomStrain[] = inRoom.map(b => {
    const currentSeg = b.segments.find(s => s.is_current) ?? b.segments[0];
    return {
      strain_id: b.strain_id,
      strain_name: b.strain_name,
      plant_count: currentSeg.plant_count,
      growth_stage: b.current_stage,
      earliest_planted_date: b.clone_cut_date,
      estimated_harvest_date:
        b.segments.find(s => s.stage === 'flower')?.end ?? null,
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

function sostanzaMotherRoom(): CalendarRoom {
  // Per file 2 their genetics library is a single Pink Kush mother
  // bank kept on a 16-day cutback cadence. 24 mothers maintained for
  // continuous 800-cut harvests.
  const motherStrains: CalendarRoomStrain[] = [
    {
      strain_id: 's-pk',
      strain_name: 'Pink Kush',
      plant_count: 24,
      growth_stage: 'mother',
      earliest_planted_date: offsetDate(-540),
      estimated_harvest_date: null,
      stage_entered_at: offsetDate(-12), // last cutback 12 days ago
      days_in_stage: 12,
      is_mother: true,
    },
  ];
  return {
    room_id: 'r-mom-01',
    room_name: 'Mother Room',
    room_code: 'MOM-01',
    room_type: 'mother',
    capacity_plants: 32,
    square_footage: 120,
    total_plants: 24,
    strain_count: 1,
    capacity_utilization_pct: 75,
    strains: motherStrains,
    plannedCycles: [],
  };
}

export const SOSTANZA_ROOMS: CalendarRoom[] = [
  sostanzaMotherRoom(),
  buildSostanzaRoom('r-veg-01', 'Vegetative Room', 'VEG-01', 'veg', 1600, 80),
  buildSostanzaRoom('r-flw-01', 'Flower Room 1', 'FLW-01', 'flower', 800, 28),
  buildSostanzaRoom('r-flw-02', 'Flower Room 2', 'FLW-02', 'flower', 800, 28),
  buildSostanzaRoom('r-flw-03', 'Flower Room 3', 'FLW-03', 'flower', 800, 28),
  buildSostanzaRoom('r-flw-04', 'Flower Room 4', 'FLW-04', 'flower', 800, 28),
  buildSostanzaRoom('r-dry-01', 'Drying Room', 'DRY-01', 'drying', 3200, 120),
  buildSostanzaRoom('r-trim-01', 'Trim Room', 'TRIM-01', 'trim', 3200, 120),
  buildSostanzaRoom('r-cure-01', 'Cure & Test Room', 'CURE-01', 'cure', 6400, 180),
  buildSostanzaRoom('r-pack-01', 'Pack & AFS Room', 'PACK-01', 'pack', 3200, 100),
];

export const SOSTANZA_PLANNED: Record<string, import('@/features/production-planner/types').CalendarPlannedEntry[]> = {};

/**
 * Pink Kush at Sostanza-shape stats. Yield-per-sqft pinned to 800 per
 * their forecast model; flowering/veg time matches the cycle parameter
 * row.
 */
function pkStats(): StrainCultivationStats {
  return {
    strain_id: 's-pk',
    strain_name: 'Pink Kush',
    display_name: 'Pink Kush',
    dominance_type: 'indica',
    category: 'flower',
    is_active: true,
    flowering_time_days: 69,
    veg_days_avg: 14,
    feed_group: 'A',
    flowering_time_class: 'long',
    harvest_count: 24,
    avg_wet_weight_per_plant_g: 28, // 22400 g / 800 plants
    last_harvest_date: offsetDate(-21),
    avg_wet_g_per_sqft: 800,
    avg_big_bud_pct: 68,
    avg_small_bud_pct: 14,
    avg_trim_pct: 14,
    avg_waste_pct: 4,
    avg_trim_grams_per_hour: 380,
    trim_session_count: 24,
    avg_rosin_yield_pct: 4.6,
    press_run_count: 18,
    avg_thc_pct: 22.4,
    avg_total_terpenes_mg_g: 18,
    coa_count: 24,
    demand_total_units: 1860,
    demand_unassigned_units: 320,
    order_count: 42,
    conversion_confidence: 'high',
    conversion_sessions: 48,
  };
}

export const SOSTANZA_STRAIN_STATS: StrainCultivationStats[] = [pkStats()];

export const SOSTANZA_MOTHER_LOTS: MotherLot[] = [
  {
    mom_plant_group_id: 'mom-pk-01',
    strain_id: 's-pk',
    strain_name: 'Pink Kush',
    plant_count: 24,
    synthetic: false,
  },
];

/**
 * Operator roster from file 3's Production Calendar. Not yet rendered
 * on the Gantt; held here so a future operator-row phase can pull
 * them in without touching the fixture again.
 */
export const SOSTANZA_OPERATORS: Array<{ name: string; role: string }> = [
  { name: 'Tony', role: 'Cultivation Lead' },
  { name: 'Deron', role: 'IPM Lead' },
  { name: 'Philipp', role: 'Post-Production' },
  { name: 'Juan', role: 'Cloning + Veg' },
];
