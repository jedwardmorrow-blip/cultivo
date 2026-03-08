export interface HashPackage {
  id: string;
  wash_run_id: string;
  freeze_dry_run_id: string | null;
  strain_id: string;
  package_id: string;
  weight_grams: number;
  remaining_weight_grams: number;
  dried_date: string | null;
  status: 'available' | 'partial' | 'depleted' | 'reserved';
  notes: string | null;
  created_at: string;
  updated_at: string;
  wash_run: {
    id: string;
    batch: {
      batch_number: string;
    } | null;
  } | null;
  strain: {
    name: string;
    abbreviation: string;
  } | null;
}

export interface FreshFrozenPackage {
  id: string;
  batch_id: string;
  strain_id: string | null;
  package_number: number;
  weight_grams: number;
  vacuum_sealed_at: string | null;
  frozen_at: string | null;
  freezer_location: string | null;
  status: 'stored' | 'allocated' | 'washed' | 'sold';
  sold_price_per_gram: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  batch: {
    batch_number: string;
    harvest_date: string;
    strain: string;
  } | null;
  strain: {
    name: string;
    abbreviation: string;
  } | null;
}

export type RosinDestination = 'badder' | 'jam' | 'sauce' | 'fresh_press';
export type RosinStatus = 'fresh' | 'curing' | 'cured' | 'packaged' | 'sold';

export interface RosinPackage {
  id: string;
  press_run_id: string;
  strain_id: string;
  package_id: string;
  weight_grams: number;
  destination: RosinDestination;
  cure_session_id: string | null;
  inventory_item_id: string | null;
  status: RosinStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  press_run: {
    id: string;
    batch: {
      batch_number: string;
    } | null;
  } | null;
  strain: {
    name: string;
    abbreviation: string;
  } | null;
  cure_session: {
    status: string;
    target_consistency: string;
    start_date: string | null;
    target_end_date: string | null;
  } | null;
}

export type RosinLabScreen =
  | 'dashboard'
  | 'fresh-frozen'
  | 'hash'
  | 'rosin'
  | 'wash'
  | 'press'
  | 'log'
  | 'analytics';

export interface PipelineStageCount {
  stage: 'ff' | 'wash' | 'fd' | 'hash' | 'press' | 'cure';
  label: string;
  count: number;
  color: string;
  navKey: RosinLabScreen;
}

export interface ActivePipelineItem {
  stage: string;
  run_id: string;
  batch_number: string;
  strain_name: string;
  status: string;
  started_date: string;
  input_grams: number;
  output_grams: number | null;
  expected_completion: string | null;
}

export interface DashboardStats {
  avgWashYield: number;
  avgPressYield: number;
  totalRosin30d: number;
  needsAttention: number;
}

export const PIPELINE_STAGE_CONFIG: PipelineStageCount[] = [
  { stage: 'ff', label: 'Fresh Frozen', count: 0, color: '#06B6D4', navKey: 'fresh-frozen' },
  { stage: 'wash', label: 'Wash', count: 0, color: '#3B82F6', navKey: 'wash' },
  { stage: 'fd', label: 'Freeze Dry', count: 0, color: '#94A3B8', navKey: 'hash' },
  { stage: 'hash', label: 'Hash', count: 0, color: '#F59E0B', navKey: 'hash' },
  { stage: 'press', label: 'Press', count: 0, color: '#F97316', navKey: 'press' },
  { stage: 'cure', label: 'Cure', count: 0, color: '#8B5CF6', navKey: 'rosin' },
];

export const STAGE_NAV_MAP: Record<string, RosinLabScreen> = {
  ff: 'fresh-frozen',
  'fresh-frozen': 'fresh-frozen',
  wash: 'wash',
  fd: 'hash',
  'freeze-dry': 'hash',
  hash: 'hash',
  press: 'press',
  cure: 'rosin',
};

export interface BatchWithFF {
  id: string;
  batch_number: string;
  strain: string;
  strain_id: string | null;
}

export interface WashRunInput {
  id: string;
  wash_run_id: string;
  fresh_frozen_package_id: string;
  weight_grams: number;
  created_at: string;
  package?: {
    id: string;
    package_number: number;
    freezer_location: string | null;
  } | null;
}

export interface WashRun {
  id: string;
  batch_id: string;
  strain_id: string | null;
  wash_date: string;
  operator_id: string | null;
  equipment_id: string | null;
  water_temp_f: number | null;
  num_washes: number | null;
  total_input_weight_grams: number | null;
  total_output_weight_grams: number | null;
  waste_weight_grams: number | null;
  yield_percentage: number | null;
  micron_grades: Record<string, number> | null;
  notes: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  batch?: { batch_number: string; strain: string } | null;
  strain?: { name: string } | null;
  equipment?: { id: string; name: string } | null;
  inputs?: WashRunInput[];
  freeze_dry?: { id: string; status: string }[] | null;
}

export interface FreezeDryRun {
  id: string;
  wash_run_id: string;
  equipment_id: string | null;
  start_time: string | null;
  end_time: string | null;
  input_weight_grams: number;
  output_weight_grams: number | null;
  waste_weight_grams: number | null;
  moisture_loss_percentage: number | null;
  temperature_f: number | null;
  notes: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  wash_run?: {
    id: string;
    batch?: { batch_number: string; strain: string } | null;
    strain?: { name: string } | null;
  } | null;
  equipment?: { id: string; name: string } | null;
}

export interface RosinLabEquipment {
  id: string;
  name: string;
  equipment_type: string;
  status: string;
}

export interface PressRun {
  id: string;
  freeze_dry_run_id: string | null;
  wash_run_id: string | null;
  equipment_id: string | null;
  press_date: string;
  operator_id: string | null;
  temperature_f: number | null;
  pressure_psi: number | null;
  press_time_seconds: number | null;
  bag_micron: number | null;
  input_weight_grams: number | null;
  output_weight_grams: number | null;
  waste_weight_grams: number | null;
  yield_percentage: number | null;
  notes: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  wash_run?: {
    strain_id?: string | null;
    batch?: { batch_number: string } | null;
    strain?: { name: string; abbreviation: string } | null;
  } | null;
  equipment?: { name: string } | null;
  rosin_packages?: RosinPackage[];
}

export interface PressRunInput {
  id: string;
  press_run_id: string;
  hash_package_id: string;
  weight_grams: number;
  created_at: string;
  hash_package?: {
    package_id: string;
    remaining_weight_grams: number;
    strain?: { name: string } | null;
  } | null;
}

export interface CureSession {
  id: string;
  press_run_id: string | null;
  wash_run_id: string | null;
  start_time: string | null;
  end_time: string | null;
  cure_temp_f: number | null;
  target_consistency: 'badder' | 'jam' | 'sauce';
  actual_consistency: 'badder' | 'jam' | 'sauce' | null;
  input_weight_grams: number | null;
  output_weight_grams: number | null;
  waste_weight_grams: number | null;
  cure_loss_percentage: number | null;
  notes: string | null;
  status: 'curing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  press_run?: {
    id: string;
    wash_run?: {
      batch?: { batch_number: string } | null;
    } | null;
  } | null;
  rosin_packages?: RosinPackage[];
}

export const CURE_TIME_ESTIMATES: Record<string, number> = {
  badder: 7,
  jam: 14,
  sauce: 21,
};

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsKpis {
  totalRuns: number;
  avgYield: number;
  totalOutput: number;
  avgCureLoss: number;
  activeStrains: number;
}

export interface YieldTrendPoint {
  id: string;
  press_date: string;
  yield_percentage: number;
  input_weight_grams: number;
  output_weight_grams: number;
  strain_name: string;
}

export interface ThroughputBucket {
  label: string;
  totalGrams: number;
  runCount: number;
}

export interface ConsistencyBreakdownItem {
  destination: string;
  totalWeight: number;
  count: number;
}

export interface StrainLeaderboardEntry {
  strain_id: string;
  strain_name: string;
  strain_abbreviation: string;
  total_runs: number;
  avg_yield_percentage: number;
  min_yield_percentage: number;
  max_yield_percentage: number;
  last_pressed: string;
  total_input_grams?: number;
  total_output_grams?: number;
}
