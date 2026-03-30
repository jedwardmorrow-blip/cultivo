/**
 * Interim Cultivation Types
 *
 * These are manually-specified types matching the CULTIVATION-ARCHITECTURE.md specification.
 * After C-2 migration runs and creates the cultivation tables, regenerate database.types.ts
 * via `npm run types:generate` and convert these to derive from Database['public']['Tables']
 * following the pattern in batch.types.ts.
 *
 * C-5A: Added RoomSection, RoomTable, UpdateRoomSectionInput for run date tracking.
 * C-5B: Added room_table_id/room_section_id to PlantGroup; added CreateRoomTableInput,
 *        UpdateRoomTableInput, CreateRoomSectionInput, UpdatePlantGroupPlacementInput,
 *        FlipRoomInput new service types.
 * D-2/D-3: Added BinningSessionStatus, DryRoom, BinningSession, CreateDryRoomInput,
 *           UpdateDryRoomInput, CreateBinningSessionInput.
 * E-1: Added IndividualPlant, AddIndividualPlantInput, BulkImportPlantResult;
 *      added batch_registry_id to PlantGroup.
 * D-9: Removed group_number from PlantGroup. Batch number (from batch_registry) is
 *      the sole human-readable identifier throughout the UI.
 */

export type GrowthStage = 'clone' | 'veg' | 'flower' | 'harvested';
export type RoomType = 'clone' | 'veg' | 'flower' | 'mother' | 'mixed';
export type PlantSourceType = 'clone' | 'seed';
export type HarvestSessionStatus = 'active' | 'completed' | 'finalized' | 'cancelled';
export type HarvestType = 'flower' | 'fresh_frozen';
export type FreshFrozenPackageStatus = 'stored' | 'allocated' | 'washed' | 'sold';

export interface GrowRoom {
  id: string;
  name: string;
  room_code: string;
  room_type: RoomType;
  capacity_plants: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface PlantGroup {
  id: string;
  name: string | null;
  strain_id: string;
  grow_room_id: string;
  mother_plant_group_id: string | null;
  room_table_id: string | null;
  room_section_id: string | null;
  batch_registry_id: string | null;
  source_type: PlantSourceType;
  is_mother: boolean;
  plant_count: number;
  growth_stage: GrowthStage;
  stage_entered_at: string;
  planted_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  strains?: { name: string; abbreviation: string | null };
  grow_rooms?: { name: string; room_code: string };
  mother_group?: { id: string; growth_stage: GrowthStage; batch_registry?: { batch_number: string } | null; individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[] };
  room_tables?: { table_number: number; table_name: string | null } | null;
  room_sections?: { section_label: string } | null;
  batch_registry?: { batch_number: string; clone_date: string | null } | null;
  cut_sessions?: PlantGroupCutSession[];
  individual_plants?: Pick<IndividualPlant, 'state_plant_id' | 'is_active'>[];
}

export interface PlantGroupCutSession {
  id: string;
  plant_group_id: string;
  mother_plant_group_id: string;
  cut_count: number;
  cut_date: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
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

export interface PlantGroupStageHistory {
  id: string;
  plant_group_id: string;
  from_stage: GrowthStage | null;
  to_stage: GrowthStage;
  transitioned_at: string;
  transitioned_by: string | null;
  notes: string | null;
}

export interface PlantGroupRoomHistory {
  id: string;
  plant_group_id: string;
  from_room_id: string;
  to_room_id: string;
  moved_at: string;
  moved_by: string | null;
  notes: string | null;
  from_room?: { name: string; room_code: string };
  to_room?: { name: string; room_code: string };
}

export interface HarvestWeightEntry {
  id: string;
  harvest_session_id: string;
  weight_grams: number;
  plant_count: number;
  entry_order: number;
  destination: HarvestType | null;
  location_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type CreateHarvestWeightEntryInput = Pick<HarvestWeightEntry, 'harvest_session_id' | 'weight_grams' | 'plant_count' | 'destination'> &
  Partial<Pick<HarvestWeightEntry, 'entry_order' | 'notes' | 'location_id'>>;

export interface HarvestSession {
  id: string;
  plant_group_id: string | null;
  harvest_date: string;
  wet_weight_grams: number;
  waste_grams: number | null;
  plant_count_harvested: number;
  adjusted_weight_grams: number | null;
  adjustment_reason: string | null;
  batch_registry_id: string;
  grow_room_id: string | null;
  session_status: HarvestSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
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

export interface RoomSection {
  id: string;
  room_table_id: string;
  section_label: string;
  section_sqft: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  flip_date: string | null;
  projected_harvest_date: string | null;
}

export interface RoomTable {
  id: string;
  grow_room_id: string;
  table_number: number;
  table_name: string | null;
  total_sqft: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  sections: RoomSection[];
}

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

export interface FreshFrozenPackage {
  id: string;
  batch_id: string;
  strain_id: string | null;
  package_number: number;
  weight_grams: number;
  vacuum_sealed_at: string | null;
  frozen_at: string | null;
  freezer_location: string | null;
  status: FreshFrozenPackageStatus;
  sold_price_per_gram: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  strains?: { name: string; abbreviation: string | null };
}

export type CreateFreshFrozenPackageInput = Pick<FreshFrozenPackage, 'batch_id' | 'weight_grams'> &
  Partial<Pick<FreshFrozenPackage, 'strain_id' | 'package_number' | 'vacuum_sealed_at' | 'frozen_at' | 'freezer_location' | 'notes'>>;

export type BinningSessionStatus = 'active' | 'completed' | 'cancelled';

export interface DryRoom {
  id: string;
  name: string;
  room_code: string;
  capacity_lbs: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface BinEntry {
  id: string;
  binning_session_id: string;
  bin_weight_grams: number;
  entry_order: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type CreateBinEntryInput = Pick<BinEntry, 'binning_session_id' | 'bin_weight_grams'> &
  Partial<Pick<BinEntry, 'entry_order' | 'notes'>>;

export interface BinningSession {
  id: string;
  harvest_session_id: string;
  dry_room_id: string;
  batch_registry_id: string;
  dry_weight_grams: number;
  water_loss_grams: number | null;
  bin_date: string;
  session_status: BinningSessionStatus;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  harvest_sessions?: Pick<HarvestSession, 'harvest_date' | 'wet_weight_grams' | 'adjusted_weight_grams'> & {
    plant_groups?: {
      strains?: { name: string; abbreviation: string | null };
    };
  };
  dry_rooms?: { name: string; room_code: string };
  batch_registry?: { batch_number: string };
}

export type CreateDryRoomInput = Pick<DryRoom, 'name' | 'room_code'> &
  Partial<Pick<DryRoom, 'capacity_lbs'>>;

export type UpdateDryRoomInput = Partial<Pick<DryRoom, 'name' | 'capacity_lbs' | 'is_active'>>;

export type CreateBinningSessionInput = Pick<BinningSession, 'harvest_session_id' | 'dry_room_id' | 'batch_registry_id' | 'bin_date'> &
  Partial<Pick<BinningSession, 'dry_weight_grams' | 'notes'>>;

export interface IndividualPlant {
  id: string;
  plant_group_id: string;
  state_plant_id: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

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

export type TaskType =
  | 'ipm_spray'
  | 'defoliation'
  | 'transplant'
  | 'cleaning'
  | 'harvest'
  | 'feeding'
  | 'scouting'
  | 'training'
  | 'clone_cutting'
  | 'maintenance'
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
  feeding: { label: 'Feeding', color: '#F59E0B', icon: 'Droplets' },
  scouting: { label: 'Scouting', color: '#EC4899', icon: 'Search' },
  training: { label: 'Training', color: '#14B8A6', icon: 'GitBranch' },
  clone_cutting: { label: 'Clone Cutting', color: '#0EA5E9', icon: 'Sprout' },
  maintenance: { label: 'Maintenance', color: '#78716C', icon: 'Wrench' },
  custom: { label: 'Custom', color: '#A6A6A6', icon: 'Settings' },
};

export type SchedulingMode = 'calendar' | 'phase_day';

export interface RoomTaskSchedule {
  id: string;
  room_id: string;
  task_type: TaskType;
  recurrence: string;
  day_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
  scheduling_mode: SchedulingMode;
  interval_days: number | null;
  phase_day_start: number | null;
  phase_day_end: number | null;
  default_config: Record<string, unknown>;
  scope: string;
  priority: string;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateTaskScheduleInput = Pick<
  RoomTaskSchedule,
  'room_id' | 'task_type' | 'recurrence' | 'start_date'
> &
  Partial<Pick<RoomTaskSchedule, 'day_of_week' | 'end_date' | 'default_config' | 'scope' | 'priority' | 'notes' | 'scheduling_mode' | 'interval_days' | 'phase_day_start' | 'phase_day_end'>>;

export type UpdateTaskScheduleInput = Partial<
  Pick<RoomTaskSchedule, 'recurrence' | 'day_of_week' | 'end_date' | 'default_config' | 'scope' | 'priority' | 'notes' | 'is_active' | 'scheduling_mode' | 'interval_days' | 'phase_day_start' | 'phase_day_end'>
>;

export interface DailyTaskInstance {
  id: string;
  schedule_id: string | null;
  room_id: string;
  task_date: string;
  task_type: TaskType;
  assigned_to: string | null;
  assigned_by: string | null;
  status: TaskStatus;
  scope: string;
  progress_data: Record<string, unknown>;
  completion_ref_table: string | null;
  completion_ref_id: string | null;
  estimated_duration: string | null;
  task_config: Record<string, unknown>;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyAttendance {
  id: string;
  staff_id: string;
  attendance_date: string;
  is_present: boolean;
  hours_worked: number | null;
  room_assignments: string[] | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
}

export type UpsertAttendanceInput = Pick<DailyAttendance, 'staff_id' | 'attendance_date' | 'is_present'> &
  Partial<Pick<DailyAttendance, 'hours_worked' | 'room_assignments'>>;

export interface IpmSprayLog {
  id: string;
  task_instance_id: string | null;
  room_id: string;
  applied_at: string;
  applied_by: string | null;
  product_name: string;
  product_type: string;
  concentration: string | null;
  volume_applied: string | null;
  application_method: string;
  target_pest: string | null;
  tables_sprayed: string[] | null;
  re_entry_hours: number | null;
  pre_harvest_days: number | null;
  notes: string | null;
  created_at: string;
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

export interface FeedingLog {
  id: string;
  task_instance_id: string | null;
  room_id: string;
  fed_at: string;
  fed_by: string | null;
  reservoir_id: string | null;
  nutrient_mix: string | null;
  ec_value: number | null;
  ph_value: number | null;
  volume_gallons: number | null;
  water_temp_f: number | null;
  notes: string | null;
  created_at: string;
}

export type CreateFeedingLogInput = Pick<FeedingLog, 'room_id'> &
  Partial<
    Pick<
      FeedingLog,
      'task_instance_id' | 'fed_by' | 'reservoir_id' | 'nutrient_mix' | 'ec_value' | 'ph_value' | 'volume_gallons' | 'water_temp_f' | 'notes'
    >
  >;

export interface DefoliationLog {
  id: string;
  task_instance_id: string | null;
  room_id: string;
  performed_at: string;
  performed_by: string | null;
  defoliation_type: string;
  sections_completed: string[] | null;
  sections_total: string[] | null;
  notes: string | null;
  created_at: string;
}

export type CreateDefoliationLogInput = Pick<DefoliationLog, 'room_id' | 'defoliation_type'> &
  Partial<
    Pick<DefoliationLog, 'task_instance_id' | 'performed_by' | 'sections_completed' | 'sections_total' | 'notes'>
  >;

export interface CleaningLog {
  id: string;
  task_instance_id: string | null;
  room_id: string;
  cleaned_at: string;
  cleaned_by: string | null;
  cleaning_type: string;
  notes: string | null;
  created_at: string;
}

export type CreateCleaningLogInput = Pick<CleaningLog, 'room_id' | 'cleaning_type'> &
  Partial<Pick<CleaningLog, 'task_instance_id' | 'cleaned_by' | 'notes'>>;

export interface ScoutingLog {
  id: string;
  task_instance_id: string | null;
  room_id: string;
  scouted_at: string;
  scouted_by: string | null;
  pest_found: boolean;
  pest_type: string | null;
  pest_severity: string | null;
  disease_found: boolean;
  disease_type: string | null;
  nutrient_issues: string | null;
  overall_health: string | null;
  sections_scouted: string[] | null;
  notes: string | null;
  created_at: string;
}

export type CreateScoutingLogInput = Pick<ScoutingLog, 'room_id'> &
  Partial<
    Pick<
      ScoutingLog,
      'task_instance_id' | 'scouted_by' | 'pest_found' | 'pest_type' | 'pest_severity' | 'disease_found' | 'disease_type' | 'nutrient_issues' | 'overall_health' | 'sections_scouted' | 'notes'
    >
  >;

export interface TrainingLog {
  id: string;
  task_instance_id: string | null;
  room_id: string;
  trained_at: string;
  trained_by: string | null;
  training_type: string;
  plant_count: number | null;
  sections_trained: string[] | null;
  notes: string | null;
  created_at: string;
}

export type CreateTrainingLogInput = Pick<TrainingLog, 'room_id' | 'training_type'> &
  Partial<Pick<TrainingLog, 'task_instance_id' | 'trained_by' | 'plant_count' | 'sections_trained' | 'notes'>>;

export interface CustomTaskLog {
  id: string;
  task_instance_id: string | null;
  room_id: string | null;
  performed_at: string;
  performed_by: string | null;
  task_name: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export type CreateCustomTaskLogInput = Pick<CustomTaskLog, 'task_name'> &
  Partial<Pick<CustomTaskLog, 'task_instance_id' | 'room_id' | 'performed_by' | 'description' | 'notes'>>;

export interface DailyLogAnnotation {
  id: string;
  room_id: string;
  annotation_date: string;
  created_by: string | null;
  category: AnnotationCategory;
  severity: AnnotationSeverity;
  title: string;
  body: string | null;
  related_task_id: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export type CreateAnnotationInput = Pick<DailyLogAnnotation, 'room_id' | 'category' | 'title'> &
  Partial<Pick<DailyLogAnnotation, 'annotation_date' | 'severity' | 'body' | 'related_task_id' | 'photo_urls'>>;

export type UpdateAnnotationInput = Partial<Pick<DailyLogAnnotation, 'category' | 'severity' | 'title' | 'body' | 'photo_urls'>>;

export interface PlantMortalityLog {
  id: string;
  plant_group_id: string;
  room_id: string;
  mortality_date: string;
  reported_by: string | null;
  quantity: number;
  cause: string | null;
  cause_detail: string | null;
  notes: string | null;
  created_at: string;
}

export type CreateMortalityLogInput = Pick<PlantMortalityLog, 'plant_group_id' | 'room_id'> &
  Partial<Pick<PlantMortalityLog, 'mortality_date' | 'reported_by' | 'quantity' | 'cause' | 'cause_detail' | 'notes'>>;

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
