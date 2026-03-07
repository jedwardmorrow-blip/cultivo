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
