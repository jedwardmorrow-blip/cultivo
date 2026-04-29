// Fixture data shaped to match the real Supabase views.
// Will be replaced by useRoomOperationalState + useDailyTasks + useTaskAssignments
// once the visual shell is approved.

import type { RoomLayoutType } from '../../constants/buildingLayout';

// ── Room operational state (mirrors v_room_operational_state shape) ─
export type Urgency = 0 | 1 | 2 | 3;

export interface RoomState {
  /** Matches buildingLayout ROOM_LAYOUT.code */
  code: string;
  layoutType: RoomLayoutType;
  /** Stage of dominant plant group, drives the type chip on detail view */
  dominantStage: 'clone' | 'veg' | 'flower' | 'mother' | 'mixed' | null;
  plants: number;
  capacity: number;
  /** Day in current stage (e.g. 42 of 63 for flower week 6) */
  dayInStage: number | null;
  cycleDays: number | null;
  strainCount: number;
  strains: string[];
  /** 0 = calm/green, 1 = watch/yellow, 2 = attention/amber, 3 = urgent/red */
  urgency: Urgency;
  /** Why the urgency is what it is. Shown in attention strip + status pill. */
  urgencyReason: string | null;
  /** Days to projected harvest (flower rooms only) */
  harvestInDays: number | null;
  envSummary: string;
  envState: 'ok' | 'warn' | 'bad';
}

export const ROOM_STATES: Record<string, RoomState> = {
  // Dry stack
  'DRY-03': { code: 'DRY-03', layoutType: 'dry', dominantStage: null, plants: 0, capacity: 200, dayInStage: null, cycleDays: 14, strainCount: 0, strains: [], urgency: 0, urgencyReason: null, harvestInDays: null, envSummary: '60°F · 60% RH', envState: 'ok' },
  'DRY-02': { code: 'DRY-02', layoutType: 'dry', dominantStage: null, plants: 196, capacity: 200, dayInStage: 4, cycleDays: 14, strainCount: 1, strains: ['Zkittlez'], urgency: 0, urgencyReason: null, harvestInDays: null, envSummary: '60°F · 60% RH', envState: 'ok' },
  'DRY-01': { code: 'DRY-01', layoutType: 'dry', dominantStage: null, plants: 180, capacity: 200, dayInStage: 9, cycleDays: 14, strainCount: 1, strains: ['Wedding Cake'], urgency: 0, urgencyReason: null, harvestInDays: null, envSummary: '60°F · 60% RH', envState: 'ok' },

  // Main row
  'VEG-01': { code: 'VEG-01', layoutType: 'veg', dominantStage: 'veg', plants: 288, capacity: 300, dayInStage: 18, cycleDays: 28, strainCount: 2, strains: ['Wedding Cake', 'Gelato 41'], urgency: 0, urgencyReason: null, harvestInDays: null, envSummary: 'all in band', envState: 'ok' },
  'WATER': { code: 'WATER', layoutType: 'water', dominantStage: null, plants: 0, capacity: 0, dayInStage: null, cycleDays: null, strainCount: 0, strains: [], urgency: 0, urgencyReason: null, harvestInDays: null, envSummary: 'EC 1.2 · pH 6.0', envState: 'ok' },
  'FLW-01': { code: 'FLW-01', layoutType: 'flower', dominantStage: 'flower', plants: 392, capacity: 400, dayInStage: 49, cycleDays: 63, strainCount: 1, strains: ['Gelato 33'], urgency: 1, urgencyReason: 'VPD 1.32 hi · 4h drift', harvestInDays: 14, envSummary: 'VPD 1.32 hi', envState: 'warn' },
  'FLW-02': { code: 'FLW-02', layoutType: 'flower', dominantStage: 'flower', plants: 388, capacity: 400, dayInStage: 42, cycleDays: 63, strainCount: 1, strains: ['Wedding Cake'], urgency: 3, urgencyReason: 'RH 64.2% · past upper bound for 38m', harvestInDays: 21, envSummary: 'RH 64.2%', envState: 'bad' },
  'FLW-03': { code: 'FLW-03', layoutType: 'flower', dominantStage: 'flower', plants: 401, capacity: 400, dayInStage: 35, cycleDays: 63, strainCount: 1, strains: ['Sundae Driver'], urgency: 0, urgencyReason: null, harvestInDays: 28, envSummary: 'in band', envState: 'ok' },
  'FLW-04': { code: 'FLW-04', layoutType: 'flower', dominantStage: 'flower', plants: 399, capacity: 400, dayInStage: 28, cycleDays: 63, strainCount: 2, strains: ['Zkittlez', 'Mac1'], urgency: 2, urgencyReason: 'CO₂ 1,180ppm · 80 above ceiling', harvestInDays: 35, envSummary: 'CO₂ 1180', envState: 'warn' },
  'VEG-05': { code: 'VEG-05', layoutType: 'veg', dominantStage: 'veg', plants: 240, capacity: 300, dayInStage: 11, cycleDays: 28, strainCount: 2, strains: ['Zkittlez', 'Runtz'], urgency: 1, urgencyReason: 'Runoff EC 2.1 · drift', harvestInDays: null, envSummary: 'EC drift', envState: 'warn' },
  'LAB': { code: 'LAB', layoutType: 'lab', dominantStage: null, plants: 0, capacity: 0, dayInStage: null, cycleDays: null, strainCount: 0, strains: [], urgency: 0, urgencyReason: null, harvestInDays: null, envSummary: 'COA pending B-2031', envState: 'ok' },
  'VEG-02': { code: 'VEG-02', layoutType: 'veg', dominantStage: 'veg', plants: 296, capacity: 300, dayInStage: 24, cycleDays: 28, strainCount: 2, strains: ['GG#4', 'Blue Dream'], urgency: 2, urgencyReason: 'IPM scout open · spider mite eggs row 3', harvestInDays: null, envSummary: 'in band', envState: 'ok' },
  'FLW-06': { code: 'FLW-06', layoutType: 'flower', dominantStage: 'flower', plants: 360, capacity: 400, dayInStage: 14, cycleDays: 63, strainCount: 1, strains: ['GG#4'], urgency: 0, urgencyReason: null, harvestInDays: 49, envSummary: 'in band', envState: 'ok' },
  'FLW-07': { code: 'FLW-07', layoutType: 'flower', dominantStage: 'flower', plants: 348, capacity: 400, dayInStage: 7, cycleDays: 63, strainCount: 1, strains: ['Gelato 33'], urgency: 0, urgencyReason: null, harvestInDays: 56, envSummary: 'in band', envState: 'ok' },
  'FLW-08': { code: 'FLW-08', layoutType: 'flower', dominantStage: 'flower', plants: 392, capacity: 400, dayInStage: 61, cycleDays: 63, strainCount: 1, strains: ['Gelato 33'], urgency: 2, urgencyReason: 'Harvest in 2d · clean room walkthrough overdue', harvestInDays: 2, envSummary: 'in band', envState: 'ok' },
  'FLW-09': { code: 'FLW-09', layoutType: 'flower', dominantStage: 'flower', plants: 380, capacity: 400, dayInStage: 56, cycleDays: 63, strainCount: 1, strains: ['Wedding Cake'], urgency: 1, urgencyReason: 'Harvest in 7d', harvestInDays: 7, envSummary: 'in band', envState: 'ok' },
  'FLW-10': { code: 'FLW-10', layoutType: 'flower', dominantStage: 'flower', plants: 400, capacity: 400, dayInStage: 49, cycleDays: 63, strainCount: 1, strains: ['GG#4'], urgency: 0, urgencyReason: null, harvestInDays: 14, envSummary: 'in band', envState: 'ok' },
  'FLW-11': { code: 'FLW-11', layoutType: 'flower', dominantStage: 'flower', plants: 348, capacity: 400, dayInStage: 21, cycleDays: 63, strainCount: 1, strains: ['Blue Dream'], urgency: 0, urgencyReason: null, harvestInDays: 42, envSummary: 'in band', envState: 'ok' },
};

// ── Tasks (mirrors daily_task_instances + task_assignments shape) ────
export type TaskType = 'feed' | 'ipm' | 'defo' | 'scout' | 'transplant' | 'harvest' | 'training' | 'cleaning' | 'maintenance' | 'custom';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface CrewMember { staff_id: string; init: string; name: string; role: 'lead' | 'crew'; active: boolean; }

export interface RoomTask {
  id: string;
  roomCode: string;
  type: TaskType;
  label: string;
  status: TaskStatus;
  assignees: CrewMember[];
  scheduledFor: string; // HH:MM
  notes?: string;
  recipe?: { program: string; week: number; ec: number; ph: number; products: { name: string; mlPerGal: number }[] };
}

export const TASK_TYPE_META: Record<TaskType, { label: string; color: string }> = {
  feed: { label: 'Feed', color: '#3B82F6' },
  ipm: { label: 'IPM', color: '#14B8A6' },
  defo: { label: 'Defo', color: '#10B981' },
  scout: { label: 'Scout', color: '#EC4899' },
  transplant: { label: 'Transplant', color: '#8B5CF6' },
  harvest: { label: 'Harvest', color: '#F43F5E' },
  training: { label: 'Training', color: '#14B8A6' },
  cleaning: { label: 'Cleaning', color: '#6B7280' },
  maintenance: { label: 'Maintenance', color: '#78716C' },
  custom: { label: 'Custom', color: '#A6A6A6' },
};

export const STAFF: CrewMember[] = [
  { staff_id: 'dr', init: 'DR', name: 'Diego Reyes', role: 'lead', active: true },
  { staff_id: 'mc', init: 'MC', name: 'Maria Chen', role: 'crew', active: true },
  { staff_id: 'at', init: 'AT', name: 'Andre Torres', role: 'crew', active: true },
  { staff_id: 'jk', init: 'JK', name: 'Jamal Kerr', role: 'crew', active: true },
  { staff_id: 'pk', init: 'PK', name: 'Priya K.', role: 'crew', active: true },
];

// Tasks per room (only some rooms get tasks today)
export const ROOM_TASKS: Record<string, RoomTask[]> = {
  'FLW-02': [
    { id: 't1', roomCode: 'FLW-02', type: 'feed', label: 'Feed · flower week 6', status: 'completed', assignees: [{ ...STAFF[0], role: 'lead' }, { ...STAFF[2], role: 'crew' }], scheduledFor: '08:00', recipe: { program: 'Bloom B', week: 6, ec: 2.4, ph: 6.0, products: [{ name: 'CalMag', mlPerGal: 5 }, { name: 'Bloom A', mlPerGal: 8 }, { name: 'Bloom B', mlPerGal: 8 }, { name: 'PK Boost', mlPerGal: 4 }] } },
    { id: 't2', roomCode: 'FLW-02', type: 'scout', label: 'Investigate RH spike · dehumid + AC return', status: 'in_progress', assignees: [{ ...STAFF[0], role: 'lead' }], scheduledFor: '10:00', notes: 'RH at 64.2 for 38m. Bud-rot risk window opens at 65.' },
    { id: 't3', roomCode: 'FLW-02', type: 'defo', label: 'Defoliation · lower canopy pass', status: 'pending', assignees: [{ ...STAFF[1], role: 'lead' }], scheduledFor: '14:00' },
  ],
  'FLW-01': [
    { id: 't4', roomCode: 'FLW-01', type: 'feed', label: 'Feed · flower week 7', status: 'completed', assignees: [{ ...STAFF[2], role: 'lead' }], scheduledFor: '08:00' },
    { id: 't5', roomCode: 'FLW-01', type: 'maintenance', label: 'Adjust HVAC · VPD trending high', status: 'pending', assignees: [], scheduledFor: '11:00', notes: 'VPD 1.32, target 1.20.' },
  ],
  'FLW-04': [
    { id: 't6', roomCode: 'FLW-04', type: 'feed', label: 'Feed · flower week 4', status: 'completed', assignees: [{ ...STAFF[2], role: 'lead' }], scheduledFor: '08:00' },
    { id: 't7', roomCode: 'FLW-04', type: 'maintenance', label: 'Throttle CO₂ injector', status: 'pending', assignees: [], scheduledFor: '12:00' },
  ],
  'FLW-08': [
    { id: 't8', roomCode: 'FLW-08', type: 'harvest', label: 'Harvest prep · clean room, racks, totes', status: 'pending', assignees: [{ ...STAFF[3], role: 'lead' }, { ...STAFF[1], role: 'crew' }, { ...STAFF[2], role: 'crew' }], scheduledFor: '13:00' },
  ],
  'VEG-01': [
    { id: 't9', roomCode: 'VEG-01', type: 'transplant', label: 'Transplant 12 plants → FLR-08', status: 'pending', assignees: [{ ...STAFF[2], role: 'lead' }], scheduledFor: '11:00' },
  ],
  'VEG-02': [
    { id: 't10', roomCode: 'VEG-02', type: 'scout', label: 'IPM scout · spider mite eggs row 3', status: 'pending', assignees: [{ ...STAFF[3], role: 'lead' }], scheduledFor: '10:00' },
  ],
  'VEG-05': [
    { id: 't11', roomCode: 'VEG-05', type: 'feed', label: 'Reservoir mix · veg week 2', status: 'completed', assignees: [{ ...STAFF[2], role: 'lead' }], scheduledFor: '08:30' },
  ],
  'FLW-06': [
    { id: 't12', roomCode: 'FLW-06', type: 'training', label: 'Trellis adjust · raise top net', status: 'pending', assignees: [{ ...STAFF[1], role: 'lead' }], scheduledFor: '09:30' },
  ],
};

// ── Room layout grid (mirrors room_tables × room_sections) ───────────
export interface RoomGridCell { row: number; col: number; strain?: string; plants?: number; }
export interface RoomGrid { rows: number; cols: number; cells: RoomGridCell[]; }

export const ROOM_GRIDS: Record<string, RoomGrid> = {
  'FLW-02': {
    rows: 4, cols: 8,
    cells: Array.from({ length: 32 }, (_, i) => ({ row: Math.floor(i / 8), col: i % 8, strain: 'Wedding Cake', plants: 12 })),
  },
  'FLW-01': {
    rows: 4, cols: 8,
    cells: Array.from({ length: 32 }, (_, i) => ({ row: Math.floor(i / 8), col: i % 8, strain: 'Gelato 33', plants: 12 })),
  },
  'VEG-01': {
    rows: 6, cols: 10,
    cells: Array.from({ length: 60 }, (_, i) => ({ row: Math.floor(i / 10), col: i % 10, strain: i < 30 ? 'Wedding Cake' : 'Gelato 41', plants: 5 })),
  },
};

// ── Today header ─────────────────────────────────────────────────────
export const TODAY_LABEL = 'Tuesday, Apr 26 · 11:42 PT';
