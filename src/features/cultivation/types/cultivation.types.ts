/**
 * Cultivation Types — derived from Database['public']['Tables']
 *
 * Core entity types (GrowRoom, PlantGroup, HarvestSession, etc.) are derived from
 * the generated database.types.ts following the pattern in batch.types.ts.
 * App-layer extensions (join fields, narrowed unions) use Omit + interface extension.
 * Input types, constants, and pure-app types remain manual.
 */

import type { Database } from '../../../lib/database/database.types';

// ═══════════════════════════════════════════════════════════════════════
// Database table type helpers
// ═══════════════════════════════════════════════════════════════════════

type Tables = Database['public']['Tables'];

// ═══════════════════════════════════════════════════════════════════════
// Union types (narrower than DB's plain `string`)
// ═══════════════════════════════════════════════════════════════════════

export type PlanStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type GrowthStage = 'clone' | 'veg' | 'flower' | 'harvested';
export type RoomType = 'clone' | 'veg' | 'flower' | 'mother' | 'mixed';
export type PlantSourceType = 'clone' | 'seed';
export type HarvestSessionStatus = 'active' | 'completed' | 'finalized' | 'cancelled';
export type HarvestType = 'flower' | 'fresh_frozen';
export type FreshFrozenPackageStatus = 'stored' | 'allocated' | 'washed' | 'sold';
export type BinningSessionStatus = 'active' | 'completed' | 'cancelled';

// ═══════════════════════════════════════════════════════════════════════
// Cultivation Plans (no DB table yet — manual)
// ═══════════════════════════════════════════════════════════════════════

export interface CultivationPlan {
  id: string;
  room_id: string;
  strain_id: string | null;
  batch_id: string;
  feed_program_id: string | null;
  plan_name: string | null;
  plan_status: PlanStatus;
  planned_plant_count: number | null;
  planned_clone_count: number | null;
  clone_date: string | null;
  veg_start_date: string | null;
  flower_date: string | null;
  harvest_date: string | null;
  dry_date: string | null;
  clone_days: number | null;
  veg_days: number | null;
  flower_days: number | null;
  dry_days: number | null;
  turnaround_days: number | null;
  actual_clone_date: string | null;
  actual_veg_start_date: string | null;
  actual_flower_date: string | null;
  actual_harvest_date: string | null;
  actual_dry_date: string | null;
  mother_plant_group_id: string | null;
  projected_wet_weight_g: number | null;
  projected_dry_weight_g: number | null;
  projected_packaged_weight_g: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CultivationPlanInput = Pick<CultivationPlan, 'room_id'> &
  Partial<Pick<CultivationPlan,
    | 'strain_id'
    | 'feed_program_id'
    | 'plan_name'
    | 'plan_status'
    | 'planned_plant_count'
    | 'planned_clone_count'
    | 'clone_date'
    | 'veg_start_date'
    | 'flower_date'
    | 'harvest_date'
    | 'dry_date'
    | 'clone_days'
    | 'veg_days'
    | 'flower_days'
    | 'dry_days'
    | 'turnaround_days'
    | 'projected_wet_weight_g'
    | 'projected_dry_weight_g'
    | 'notes'
  >>;

// ═══════════════════════════════════════════════════════════════════════
// Grow Rooms — from DB
// ═══════════════════════════════════════════════════════════════════════

type GrowRoomRow = Tables['grow_rooms']['Row'];

export interface GrowRoom extends Omit<GrowRoomRow, 'room_type'> {
  room_type: RoomType;
}

// ═══════════════════════════════════════════════════════════════════════
// Plant Groups — from DB + join fields
// ═══════════════════════════════════════════════════════════════════════

type PlantGroupRow = Tables['plant_groups']['Row'];

export interface PlantGroup extends Omit<PlantGroupRow, 'growth_stage' | 'source_type'> {
  growth_stage: GrowthStage;
  source_type: PlantSourceType;
  // Join fields populated by select queries
  strains?: { name: string; abbreviation: string | null };
  grow_rooms?: { name: string; room_code: string };
  mother_group?: { id: string; growth_stage: GrowthStage; batch_registry?: { batch_number: string } | null; individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[] };
  room_tables?: { table_number: number; table_name: string | null } | null;
  room_sections?: { section_label: string } | null;
  batch_registry?: { batch_number: string; clone_date: string | null } | null;
  cut_sessions?: PlantGroupCutSession[];
  individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[];
}

// ═══════════════════════════════════════════════════════════════════════
// Plant Group Cut Sessions — from DB + join fields
// ═══════════════════════════════════════════════════════════════════════

type PlantGroupCutSessionRow = Tables['plant_group_cut_sessions']['Row'];

export interface PlantGroupCutSession extends PlantGroupCutSessionRow {
  mother_group?: {
    id: string;
    growth_stage: GrowthStage;
    strains?: { name: string; abbreviation: string | null };
    batch_registry?: { batch_number: string } | null;
    individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[];
  };
}

export type CreatePlantGroupCutSessionInput = {
  plant_group_id: string;
  mother_plant_group_id: string;
  cut_count: number;
  cut_date?: string;
  notes?: string;
};

// ═══════════════════════════════════════════════════════════════════════
// Stage & Room History — from DB + join fields
// ═══════════════════════════════════════════════════════════════════════

type PlantGroupStageHistoryRow = Tables['plant_group_stage_history']['Row'];

export interface PlantGroupStageHistory extends Omit<PlantGroupStageHistoryRow, 'from_stage' | 'to_stage'> {
  from_stage: GrowthStage | null;
  to_stage: GrowthStage;
}

type PlantGroupRoomHistoryRow = Tables['plant_group_room_history']['Row'];

export interface PlantGroupRoomHistory extends PlantGroupRoomHistoryRow {
  from_room?: { name: string; room_code: string };
  to_room?: { name: string; room_code: string };
}

export interface PlantGroupRoomHistoryFull extends PlantGroupRoomHistory {
  // These fields are already on PlantGroupRoomHistoryRow (from_table_id, etc.)
  // but listed here for clarity — the Full variant adds join context
}

// ═══════════════════════════════════════════════════════════════════════
// Harvest Weight Entries — from DB
// ═══════════════════════════════════════════════════════════════════════

type HarvestWeightEntryRow = Tables['harvest_weight_entries']['Row'];

export interface HarvestWeightEntry extends Omit<HarvestWeightEntryRow, 'destination'> {
  destination: HarvestType | null;
}

export type CreateHarvestWeightEntryInput = Pick<HarvestWeightEntry, 'harvest_session_id' | 'weight_grams' | 'plant_count' | 'destination'> &
  Partial<Pick<HarvestWeightEntry, 'entry_order' | 'notes' | 'location_id'>>;

// ═══════════════════════════════════════════════════════════════════════
// Harvest Sessions — from DB + join fields
// ═══════════════════════════════════════════════════════════════════════

type HarvestSessionRow = Tables['harvest_sessions']['Row'];

export interface HarvestSession extends Omit<HarvestSessionRow, 'session_status' | 'batch_registry_id'> {
  session_status: HarvestSessionStatus;
  batch_registry_id: string; // Non-null in app context (set on completion)
  // Join fields
  plant_groups?: {
    strain_id: string;
    grow_room_id: string;
    strains?: { name: string; abbreviation: string | null };
    grow_rooms?: { room_code: string };
  };
  grow_rooms?: { name: string; room_code: string } | null;
  batch_registry?: { batch_number: string } | null;
  harvest_weight_entries?: Array<{
    destination: HarvestType | null;
    location_id: string | null;
    dry_rooms?: { room_code: string } | null;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════
// Room Layout — from DB
// ═══════════════════════════════════════════════════════════════════════

export type RoomSection = Tables['room_sections']['Row'];

type RoomTableRow = Tables['room_tables']['Row'];

export interface RoomTable extends RoomTableRow {
  sections: RoomSection[];
}

// ═══════════════════════════════════════════════════════════════════════
// Dry Rooms — from DB
// ═══════════════════════════════════════════════════════════════════════

export type DryRoom = Tables['dry_rooms']['Row'];

// ═══════════════════════════════════════════════════════════════════════
// Bin Entries — from DB
// ═══════════════════════════════════════════════════════════════════════

export type BinEntry = Tables['bin_entries']['Row'];

export type CreateBinEntryInput = Pick<BinEntry, 'binning_session_id' | 'bin_weight_grams'> &
  Partial<Pick<BinEntry, 'entry_order' | 'notes'>>;

// ═══════════════════════════════════════════════════════════════════════
// Binning Sessions — from DB + join fields
// ═══════════════════════════════════════════════════════════════════════

type BinningSessionRow = Tables['binning_sessions']['Row'];

export interface BinningSession extends Omit<BinningSessionRow, 'session_status'> {
  session_status: BinningSessionStatus;
  // Join fields
  harvest_sessions?: Pick<HarvestSession, 'harvest_date' | 'wet_weight_grams' | 'adjusted_weight_grams'> & {
    plant_groups?: {
      strains?: { name: string; abbreviation: string | null };
    };
  };
  dry_rooms?: { name: string; room_code: string };
  batch_registry?: { batch_number: string };
}

// ═══════════════════════════════════════════════════════════════════════
// Fresh Frozen Packages — from DB + join fields
// ═══════════════════════════════════════════════════════════════════════

type FreshFrozenPackageRow = Tables['fresh_frozen_packages']['Row'];

export interface FreshFrozenPackage extends Omit<FreshFrozenPackageRow, 'status'> {
  status: FreshFrozenPackageStatus;
  strains?: { name: string; abbreviation: string | null };
}

export type CreateFreshFrozenPackageInput = Pick<FreshFrozenPackage, 'batch_id' | 'weight_grams'> &
  Partial<Pick<FreshFrozenPackage, 'strain_id' | 'package_number' | 'vacuum_sealed_at' | 'frozen_at' | 'freezer_location' | 'notes'>>;

// ═══════════════════════════════════════════════════════════════════════
// Individual Plants — from DB
// ═══════════════════════════════════════════════════════════════════════

export type IndividualPlant = Tables['individual_plants']['Row'];

export type AddIndividualPlantInput = {
  plant_group_id: string;
  state_plant_id: string;
  notes?: string;
};

export type BulkImportPlantResult = {
  imported: number;
  skipped: string[];
  errors: { state_plant_id: string; reason: string }[];
};

// ═══════════════════════════════════════════════════════════════════════
// Input types (app-layer — not derived from DB)
// ═══════════════════════════════════════════════════════════════════════

export type CreateGrowRoomInput = Pick<GrowRoom, 'name' | 'room_code' | 'room_type'> &
  Partial<Pick<GrowRoom, 'capacity_plants'>>;

export type UpdateGrowRoomInput = Partial<Pick<GrowRoom, 'name' | 'room_type' | 'capacity_plants' | 'is_active'>>;

export type CreateRoomTableInput = {
  grow_room_id: string;
  table_number: number;
  table_name?: string | null;
  total_sqft?: number | null;
};

export type UpdateRoomTableInput = Partial<{
  table_name: string | null;
  total_sqft: number | null;
  is_active: boolean;
}>;

export type CreateRoomSectionInput = {
  room_table_id: string;
  section_label: string;
  section_sqft?: number | null;
};

export type UpdateRoomSectionInput = Partial<Pick<RoomSection, 'flip_date' | 'projected_harvest_date' | 'section_sqft' | 'is_active'>>;

export type UpdatePlantGroupPlacementInput = {
  room_table_id: string | null;
  room_section_id: string | null;
};

export type PlacementEntry = {
  table_id: string;
  section_id: string;
  plant_count: number;
};

export type SplitAndMoveInput = {
  source_group_id: string;
  to_room_id: string;
  placements: PlacementEntry[];
};

export type SplitAndMoveMultiInput = {
  source_group_ids: string[];
  to_room_id: string;
  placements: PlacementEntry[];
  kill_count?: number;
};

export interface StrainCount {
  abbreviation: string;
  count: number;
}

export interface SectionOccupancy {
  total_plants: number;
  strain_counts: StrainCount[];
}

export type FlipRoomInput = {
  grow_room_id: string;
  flip_date: string;
  projected_harvest_date?: string;
};

export type CreatePlantGroupInput = Pick<PlantGroup, 'strain_id' | 'grow_room_id' | 'plant_count'> &
  Partial<Pick<PlantGroup, 'name' | 'planted_date' | 'notes' | 'is_mother' | 'mother_plant_group_id' | 'source_type'>> & {
    cut_sessions?: Omit<CreatePlantGroupCutSessionInput, 'plant_group_id'>[];
  };

export type CreateHarvestSessionInput = Pick<HarvestSession, 'batch_registry_id' | 'harvest_date' | 'wet_weight_grams' | 'plant_count_harvested'> &
  Partial<Pick<HarvestSession, 'notes' | 'waste_grams' | 'grow_room_id' | 'plant_group_id'>>;

export type CreateDryRoomInput = Pick<DryRoom, 'name' | 'room_code'> &
  Partial<Pick<DryRoom, 'capacity_lbs'>>;

export type UpdateDryRoomInput = Partial<Pick<DryRoom, 'name' | 'capacity_lbs' | 'is_active'>>;

export type CreateBinningSessionInput = Pick<BinningSession, 'harvest_session_id' | 'dry_room_id' | 'batch_registry_id' | 'bin_date'> &
  Partial<Pick<BinningSession, 'dry_weight_grams' | 'notes'>>;

// ═══════════════════════════════════════════════════════════════════════
// Task Scheduling & Daily Operations
// ═══════════════════════════════════════════════════════════════════════

export type TaskType =
  | 'ipm_spray'
  | 'defoliation'
  | 'transplant'
  | 'cleaning'
  | 'harvest'
  | 'batch_tank_mix'
  | 'saturation_check'
  | 'irrigation_audit'
  | 'scouting'
  | 'training'
  | 'clone_cutting'
  | 'maintenance'
  | 'concentrate_mix'
  | 'custom';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'carry_forward';

export type AnnotationCategory = 'observation' | 'concern' | 'decision' | 'action_taken' | 'note';

export type AnnotationSeverity = 'info' | 'warning' | 'critical';

export type TaskTypeConfigEntry = {
  label: string;
  color: string;
  icon: string;
};

export const TASK_TYPE_CONFIG: Record<TaskType, TaskTypeConfigEntry> = {
  ipm_spray: { label: 'IPM Spray', color: '#0EA5E9', icon: 'SprayCan' },
  defoliation: { label: 'Defoliation', color: '#10B981', icon: 'Scissors' },
  transplant: { label: 'Transplant', color: '#8B5CF6', icon: 'ArrowRightLeft' },
  cleaning: { label: 'Cleaning', color: '#6B7280', icon: 'Sparkles' },
  harvest: { label: 'Harvest', color: '#F43F5E', icon: 'Wheat' },
  batch_tank_mix: { label: 'Batch Tank Mix', color: '#3B82F6', icon: 'Beaker' },
  saturation_check: { label: 'Saturation Check', color: '#F59E0B', icon: 'Droplets' },
  irrigation_audit: { label: 'Irrigation Audit', color: '#06B6D4', icon: 'Timer' },
  scouting: { label: 'Scouting', color: '#EC4899', icon: 'Search' },
  training: { label: 'Training', color: '#14B8A6', icon: 'GitBranch' },
  clone_cutting: { label: 'Clone Cutting', color: '#0EA5E9', icon: 'Sprout' },
  maintenance: { label: 'Maintenance', color: '#78716C', icon: 'Wrench' },
  concentrate_mix: { label: 'Concentrate Mix', color: '#6366F1', icon: 'FlaskConical' },
  custom: { label: 'Custom', color: '#A6A6A6', icon: 'Settings' },
};

const LEGACY_TASK_TYPE_CONFIG: Record<string, TaskTypeConfigEntry> = {
  feeding: { label: 'Feeding (legacy)', color: '#3B82F6', icon: 'Droplets' },
};

export function getTaskTypeConfig(taskType: string): TaskTypeConfigEntry {
  return TASK_TYPE_CONFIG[taskType as TaskType]
    ?? LEGACY_TASK_TYPE_CONFIG[taskType]
    ?? TASK_TYPE_CONFIG.custom;
}

export type SchedulingMode = 'calendar' | 'phase_day';

// Room Task Schedules — from DB
type RoomTaskScheduleRow = Tables['room_task_schedules']['Row'];

export interface RoomTaskSchedule extends Omit<RoomTaskScheduleRow, 'task_type' | 'scheduling_mode' | 'day_of_week' | 'default_config'> {
  task_type: TaskType;
  scheduling_mode: SchedulingMode;
  day_of_week: number[] | null;
  default_config: Record<string, unknown>;
}

export type CreateTaskScheduleInput = Pick<
  RoomTaskSchedule,
  'room_id' | 'task_type' | 'recurrence' | 'start_date'
> &
  Partial<Pick<RoomTaskSchedule, 'day_of_week' | 'end_date' | 'default_config' | 'scope' | 'priority' | 'notes' | 'scheduling_mode' | 'interval_days' | 'phase_day_start' | 'phase_day_end'>>;

export type UpdateTaskScheduleInput = Partial<
  Pick<RoomTaskSchedule, 'recurrence' | 'day_of_week' | 'end_date' | 'default_config' | 'scope' | 'priority' | 'notes' | 'is_active' | 'scheduling_mode' | 'interval_days' | 'phase_day_start' | 'phase_day_end'>
>;

// Daily Task Instances — from DB
type DailyTaskInstanceRow = Tables['daily_task_instances']['Row'];

export interface DailyTaskInstance extends Omit<DailyTaskInstanceRow, 'task_type' | 'status' | 'progress_data' | 'task_config'> {
  task_type: TaskType;
  status: TaskStatus;
  progress_data: Record<string, unknown>;
  task_config: Record<string, unknown>;
}

// Daily Attendance — from DB
export type DailyAttendance = Tables['daily_attendance']['Row'];

export type UpsertAttendanceInput = Pick<DailyAttendance, 'staff_id' | 'attendance_date' | 'is_present'> &
  Partial<Pick<DailyAttendance, 'hours_worked' | 'room_assignments'>>;

// ═══════════════════════════════════════════════════════════════════════
// Activity Logs — from DB
// ═══════════════════════════════════════════════════════════════════════

// IPM Spray Log
type IpmSprayLogRow = Tables['ipm_spray_log']['Row'];

export interface IpmSprayLog extends Omit<IpmSprayLogRow, 'tables_sprayed'> {
  tables_sprayed: string[] | null;
}

export type CreateSprayLogInput = Pick<
  IpmSprayLog,
  'room_id' | 'product_name' | 'product_type' | 'application_method'
> &
  Partial<
    Pick<
      IpmSprayLog,
      'task_instance_id' | 'applied_by' | 'concentration' | 'volume_applied' | 'target_pest' | 'tables_sprayed' | 're_entry_hours' | 'pre_harvest_days' | 'notes'
    >
  >;

// Feeding Log
type FeedingLogRow = Tables['feeding_log']['Row'];

export interface FeedingLog extends FeedingLogRow {}

export type CreateFeedingLogInput = Pick<FeedingLog, 'room_id'> &
  Partial<
    Pick<
      FeedingLog,
      'task_instance_id' | 'fed_by' | 'reservoir_id' | 'nutrient_mix' | 'ec_value' | 'ph_value' | 'volume_gallons' | 'water_temp_f' | 'notes'
    >
  >;

// Defoliation Log
type DefoliationLogRow = Tables['defoliation_log']['Row'];

export interface DefoliationLog extends Omit<DefoliationLogRow, 'sections_completed' | 'sections_total'> {
  sections_completed: string[] | null;
  sections_total: string[] | null;
}

export type CreateDefoliationLogInput = Pick<DefoliationLog, 'room_id' | 'defoliation_type'> &
  Partial<
    Pick<DefoliationLog, 'task_instance_id' | 'performed_by' | 'sections_completed' | 'sections_total' | 'notes'>
  >;

// Cleaning Log
export type CleaningLog = Tables['cleaning_log']['Row'];

export type CreateCleaningLogInput = Pick<CleaningLog, 'room_id' | 'cleaning_type'> &
  Partial<Pick<CleaningLog, 'task_instance_id' | 'cleaned_by' | 'notes'>>;

// Scouting Log
type ScoutingLogRow = Tables['scouting_log']['Row'];

export interface ScoutingLog extends Omit<ScoutingLogRow, 'sections_scouted'> {
  sections_scouted: string[] | null;
}

export type CreateScoutingLogInput = Pick<ScoutingLog, 'room_id'> &
  Partial<
    Pick<
      ScoutingLog,
      'task_instance_id' | 'scouted_by' | 'pest_found' | 'pest_type' | 'pest_severity' | 'disease_found' | 'disease_type' | 'nutrient_issues' | 'overall_health' | 'sections_scouted' | 'notes'
    >
  >;

// Training Log
type TrainingLogRow = Tables['training_log']['Row'];

export interface TrainingLog extends Omit<TrainingLogRow, 'sections_trained'> {
  sections_trained: string[] | null;
}

export type CreateTrainingLogInput = Pick<TrainingLog, 'room_id' | 'training_type'> &
  Partial<Pick<TrainingLog, 'task_instance_id' | 'trained_by' | 'plant_count' | 'sections_trained' | 'notes'>>;

// Custom Task Log
export type CustomTaskLog = Tables['custom_task_log']['Row'];

export type CreateCustomTaskLogInput = Pick<CustomTaskLog, 'task_name'> &
  Partial<Pick<CustomTaskLog, 'task_instance_id' | 'room_id' | 'performed_by' | 'description' | 'notes'>>;

// Daily Log Annotations
type DailyLogAnnotationRow = Tables['daily_log_annotations']['Row'];

export interface DailyLogAnnotation extends Omit<DailyLogAnnotationRow, 'category' | 'severity' | 'photo_urls'> {
  category: AnnotationCategory;
  severity: AnnotationSeverity;
  photo_urls: string[] | null;
}

export type CreateAnnotationInput = Pick<DailyLogAnnotation, 'room_id' | 'category' | 'title'> &
  Partial<Pick<DailyLogAnnotation, 'annotation_date' | 'severity' | 'body' | 'related_task_id' | 'photo_urls'>>;

export type UpdateAnnotationInput = Partial<Pick<DailyLogAnnotation, 'category' | 'severity' | 'title' | 'body' | 'photo_urls'>>;

// Plant Mortality Log
export type PlantMortalityLog = Tables['plant_mortality_log']['Row'];

export type CreateMortalityLogInput = Pick<PlantMortalityLog, 'plant_group_id' | 'room_id'> &
  Partial<Pick<PlantMortalityLog, 'mortality_date' | 'reported_by' | 'quantity' | 'cause' | 'cause_detail' | 'notes'>>;

// ═══════════════════════════════════════════════════════════════════════
// Feed System
// ═══════════════════════════════════════════════════════════════════════

export type FeedProduct = Tables['feed_products']['Row'];

export type FeedProgram = Tables['feed_programs']['Row'];

type FeedProgramWeekRow = Tables['feed_program_weeks']['Row'];

export interface FeedProgramWeek extends Omit<FeedProgramWeekRow, 'phase'> {
  phase: 'clone' | 'veg' | 'flower' | 'flush';
}

export type FeedProgramEntry = Tables['feed_program_entries']['Row'];

// ═══════════════════════════════════════════════════════════════════════
// Mix Log Types (2-way confirmation)
// ═══════════════════════════════════════════════════════════════════════

export type MixLogStatus = 'prescribed' | 'in_progress' | 'completed' | 'rejected';

export interface PrescribedProduct {
  feed_product_id: string;
  product_name: string;
  rate_per_unit: number;
  rate_max: number | null;
  mixing_order: number;
  calculated_amount: number;
  unit: string;
}

export interface ActualProduct {
  feed_product_id: string;
  product_name: string;
  amount_used: number;
  unit: string;
  confirmed: boolean;
}

// Batch Tank Mix Log — from DB
type BatchTankMixLogRow = Tables['batch_tank_mix_log']['Row'];

export interface BatchTankMixLog extends Omit<BatchTankMixLogRow, 'status' | 'prescribed_products' | 'actual_products'> {
  status: MixLogStatus;
  prescribed_products: PrescribedProduct[];
  actual_products: ActualProduct[];
}

// Concentrate Mix Log — from DB
type ConcentrateMixLogRow = Tables['concentrate_mix_log']['Row'];

export interface ConcentrateMixLog extends Omit<ConcentrateMixLogRow, 'status' | 'prescribed_products' | 'actual_products'> {
  status: MixLogStatus;
  prescribed_products: Record<string, unknown>[];
  actual_products: Record<string, unknown>[];
}

// ═══════════════════════════════════════════════════════════════════════
// Computed / Summary types (app-layer only)
// ═══════════════════════════════════════════════════════════════════════

export interface RoomSummaryStrain {
  name: string;
  plant_count: number;
}

export interface RoomSummary {
  room_id: string;
  room_name: string;
  room_code: string;
  room_type: RoomType;
  strains: RoomSummaryStrain[];
  earliest_projected_harvest: string | null;
  earliest_flip_date: string | null;
  total_plant_count: number;
  groups: { id: string; strain: string; stage: GrowthStage; plant_count: number; days_in_stage: number }[];
}

export interface DailyDigest {
  date: string;
  completedTasks: DailyTaskInstance[];
  attendance: DailyAttendance[];
  annotations: DailyLogAnnotation[];
  sprayLogs: IpmSprayLog[];
  feedingLogs: FeedingLog[];
  mortalityLogs: PlantMortalityLog[];
}
