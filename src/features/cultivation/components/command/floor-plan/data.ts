// Verbatim port of Claude Design's coo-floorplan.jsx FACILITY model + TIME_ANCHORS.
// Room shape mirrors v_room_operational_state. Will rewire to real Supabase
// hook once visual shell is approved.

export type LayoutType = 'mother' | 'clone' | 'veg' | 'flower' | 'dry' | 'cure' | 'water' | 'lab';
export type RoomState = 'nominal' | 'active' | 'attention' | 'urgent';

export interface FacilityRoom {
  id: string;
  code: string;
  name: string;
  layoutType: LayoutType;
  inCycle: boolean;
  phase: 1 | 2;
  x: number; y: number; w: number; h: number;
  /** in-cycle fields (mirrors RoomOperationalState) */
  dominant_stage?: LayoutType;
  days_in_stage?: number;
  days_to_harvest?: number | null;
  total_plants?: number;
  capacity_plants?: number;
  occupancy_status?: 'occupied' | 'full' | 'empty';
  strain_count?: number;
  urgency_score?: number;
  tasks_today?: number;
  tasks_completed_today?: number;
  flag?: string;
  /** off-cycle (MOM/CLN/CURE/WATER/LAB) */
  caption?: string;
  focused?: boolean;
}

export const PHASE_DIVIDER_X = 968;

export const FACILITY = {
  building: { x: 20, y: 20, w: 1264, h: 280 },
  corridorY: 240,
  corridorH: 30,
  rooms: [
    // ── PHASE I — West Wing ──────────────────────────────────────────
    { id: 'cln', code: 'CLN', name: 'Clone', layoutType: 'clone', inCycle: false, phase: 1, x: 30, y: 30, w: 70, h: 90, total_plants: 482, strain_count: 5, caption: '482 cuttings' },
    { id: 'mom', code: 'MOM', name: 'Mother', layoutType: 'mother', inCycle: false, phase: 1, x: 30, y: 122, w: 70, h: 116, total_plants: 18, strain_count: 12, caption: 'genetic library' },
    { id: 'veg-01', code: 'VEG-01', name: 'Veg Room 1', layoutType: 'veg', inCycle: true, phase: 1, x: 102, y: 30, w: 280, h: 208, dominant_stage: 'veg', days_in_stage: 18, days_to_harvest: null, total_plants: 1840, capacity_plants: 2000, occupancy_status: 'occupied', strain_count: 14, urgency_score: 0, tasks_today: 8, tasks_completed_today: 5 },
    { id: 'water', code: 'WATER', name: 'Water Room', layoutType: 'water', inCycle: false, phase: 1, x: 384, y: 30, w: 50, h: 208 },
    { id: 'flw-01', code: 'FLW-01', name: 'Flower 1', layoutType: 'flower', inCycle: true, phase: 1, x: 436, y: 30, w: 84, h: 208, dominant_stage: 'flower', days_in_stage: 49, days_to_harvest: 14, total_plants: 612, capacity_plants: 640, occupancy_status: 'full', strain_count: 7, urgency_score: 2, tasks_today: 14, tasks_completed_today: 6, flag: 'VPD 1.32' },
    { id: 'flw-02', code: 'FLW-02', name: 'Flower 2', layoutType: 'flower', inCycle: true, phase: 1, x: 522, y: 30, w: 84, h: 208, dominant_stage: 'flower', days_in_stage: 42, days_to_harvest: 21, total_plants: 612, capacity_plants: 640, occupancy_status: 'full', strain_count: 8, urgency_score: 3, focused: true, tasks_today: 11, tasks_completed_today: 4, flag: 'RH 64.2%' },
    { id: 'flw-03', code: 'FLW-03', name: 'Flower 3', layoutType: 'flower', inCycle: true, phase: 1, x: 608, y: 30, w: 84, h: 208, dominant_stage: 'flower', days_in_stage: 35, days_to_harvest: 28, total_plants: 590, capacity_plants: 640, occupancy_status: 'full', strain_count: 6, urgency_score: 0, tasks_today: 9, tasks_completed_today: 9 },
    { id: 'flw-04', code: 'FLW-04', name: 'Flower 4', layoutType: 'flower', inCycle: true, phase: 1, x: 694, y: 30, w: 84, h: 208, dominant_stage: 'flower', days_in_stage: 28, days_to_harvest: 35, total_plants: 624, capacity_plants: 640, occupancy_status: 'full', strain_count: 9, urgency_score: 2, tasks_today: 12, tasks_completed_today: 5, flag: 'CO₂ 1180' },
    { id: 'dry-03', code: 'DRY-03', name: 'Dry Room 3', layoutType: 'dry', inCycle: true, phase: 1, x: 780, y: 30, w: 50, h: 65, dominant_stage: 'dry', days_in_stage: 9, days_to_harvest: null, total_plants: 0, occupancy_status: 'occupied', strain_count: 3, urgency_score: 0, tasks_today: 2, tasks_completed_today: 1 },
    { id: 'dry-02', code: 'DRY-02', name: 'Dry Room 2', layoutType: 'dry', inCycle: true, phase: 1, x: 780, y: 99, w: 50, h: 65, dominant_stage: 'dry', days_in_stage: 4, days_to_harvest: null, total_plants: 0, occupancy_status: 'occupied', strain_count: 2, urgency_score: 0, tasks_today: 1, tasks_completed_today: 1 },
    { id: 'dry-01', code: 'DRY-01', name: 'Dry Room 1', layoutType: 'dry', inCycle: true, phase: 1, x: 780, y: 168, w: 50, h: 70, dominant_stage: 'dry', days_in_stage: 1, days_to_harvest: null, total_plants: 0, occupancy_status: 'occupied', strain_count: 1, urgency_score: 0, tasks_today: 0, tasks_completed_today: 0 },
    { id: 'veg-05', code: 'VEG-05', name: 'Veg Room 5', layoutType: 'veg', inCycle: true, phase: 1, x: 832, y: 30, w: 50, h: 208, dominant_stage: 'veg', days_in_stage: 21, days_to_harvest: null, total_plants: 320, capacity_plants: 400, occupancy_status: 'occupied', strain_count: 8, urgency_score: 0, tasks_today: 4, tasks_completed_today: 2 },
    { id: 'cure', code: 'CURE', name: 'Cure', layoutType: 'cure', inCycle: false, phase: 1, x: 884, y: 30, w: 38, h: 208, total_plants: 0, strain_count: 4, caption: '14 batches' },
    { id: 'lab', code: 'LAB', name: 'Lab / Processing', layoutType: 'lab', inCycle: false, phase: 1, x: 924, y: 30, w: 42, h: 208 },

    // ── PHASE II — East Wing ─────────────────────────────────────────
    { id: 'veg-02', code: 'VEG-02', name: 'Veg Room 2', layoutType: 'veg', inCycle: true, phase: 2, x: 974, y: 30, w: 56, h: 208, dominant_stage: 'veg', days_in_stage: 5, days_to_harvest: null, total_plants: 480, capacity_plants: 520, occupancy_status: 'occupied', strain_count: 14, urgency_score: 1, tasks_today: 6, tasks_completed_today: 1, flag: 'EC drift' },
    { id: 'flw-06', code: 'FLW-06', name: 'Flower 6', layoutType: 'flower', inCycle: true, phase: 2, x: 1032, y: 30, w: 40, h: 208, dominant_stage: 'flower', days_in_stage: 63, days_to_harvest: 0, total_plants: 612, capacity_plants: 640, occupancy_status: 'full', strain_count: 7, urgency_score: 0, tasks_today: 18, tasks_completed_today: 12, flag: 'harvest Tue' },
    { id: 'flw-07', code: 'FLW-07', name: 'Flower 7', layoutType: 'flower', inCycle: true, phase: 2, x: 1074, y: 30, w: 40, h: 208, dominant_stage: 'flower', days_in_stage: 14, days_to_harvest: 49, total_plants: 624, capacity_plants: 640, occupancy_status: 'full', strain_count: 6, urgency_score: 0, tasks_today: 5, tasks_completed_today: 4 },
    { id: 'flw-08', code: 'FLW-08', name: 'Flower 8', layoutType: 'flower', inCycle: true, phase: 2, x: 1116, y: 30, w: 40, h: 208, dominant_stage: 'flower', days_in_stage: 7, days_to_harvest: 56, total_plants: 612, capacity_plants: 640, occupancy_status: 'full', strain_count: 8, urgency_score: 0, tasks_today: 4, tasks_completed_today: 4 },
    { id: 'flw-09', code: 'FLW-09', name: 'Flower 9', layoutType: 'flower', inCycle: true, phase: 2, x: 1158, y: 30, w: 40, h: 208, dominant_stage: 'flower', days_in_stage: 56, days_to_harvest: 7, total_plants: 596, capacity_plants: 640, occupancy_status: 'full', strain_count: 9, urgency_score: 1, tasks_today: 11, tasks_completed_today: 7 },
    { id: 'flw-10', code: 'FLW-10', name: 'Flower 10', layoutType: 'flower', inCycle: true, phase: 2, x: 1200, y: 30, w: 40, h: 208, dominant_stage: 'flower', days_in_stage: 49, days_to_harvest: 14, total_plants: 612, capacity_plants: 640, occupancy_status: 'full', strain_count: 6, urgency_score: 0, tasks_today: 9, tasks_completed_today: 6 },
    { id: 'flw-11', code: 'FLW-11', name: 'Flower 11', layoutType: 'flower', inCycle: true, phase: 2, x: 1242, y: 30, w: 40, h: 208, dominant_stage: 'flower', days_in_stage: 35, days_to_harvest: 28, total_plants: 624, capacity_plants: 640, occupancy_status: 'full', strain_count: 5, urgency_score: 0, tasks_today: 7, tasks_completed_today: 7 },
  ] as FacilityRoom[],
};

export interface TimeAnchor {
  id: string;
  label: string;
  stamp: string;
  sub: string;
  x: number;
  isLive?: boolean;
  facilityRH: number;
  facilityRHWarn: boolean;
  headline: string | null;
  overrides: Record<string, { state?: RoomState; day?: string; flag?: string | null; dim?: boolean; isPattern?: boolean; focused?: boolean }>;
}

export const TIME_ANCHORS: TimeAnchor[] = [
  { id: 'now', label: 'NOW', stamp: 'Wed Mar 6 · 10:42 PT', sub: 'live · synced 0:14', x: 1255, isLive: true, facilityRH: 58.4, facilityRHWarn: true, headline: null, overrides: {} },
  { id: 'm-2h', label: '−2h', stamp: 'Wed Mar 6 · 08:42 PT', sub: 'lights-on +2h', x: 1090, facilityRH: 56.8, facilityRHWarn: false, headline: null, overrides: { 'flw-02': { state: 'attention', day: 'D42', flag: 'RH 60.1%' }, 'flw-04': { state: 'active', day: 'D28', flag: null } } },
  { id: 'm-6h', label: '−6h', stamp: 'Wed Mar 6 · 04:42 PT', sub: 'lights-off · last hour', x: 925, facilityRH: 54.2, facilityRHWarn: false, headline: null, overrides: { 'flw-02': { state: 'active', day: 'D42', flag: null }, 'flw-04': { state: 'active', day: 'D28', flag: null }, 'veg-02': { state: 'active', day: 'D5', flag: null } } },
  { id: 'd-1', label: 'YESTERDAY', stamp: 'Tue Mar 5 · 10:42 PT', sub: 'FLW-06 harvest day', x: 720, facilityRH: 57.9, facilityRHWarn: false, headline: 'Blue Dream · FLW-06 cut at 14:20', overrides: { 'flw-02': { state: 'active', day: 'D41', flag: null }, 'flw-04': { state: 'active', day: 'D27', flag: null }, 'flw-06': { state: 'urgent', day: 'D62', flag: 'CUT TODAY' }, 'veg-02': { state: 'active', day: 'D4', flag: null } } },
  { id: 'd-3', label: '−3d', stamp: 'Sun Mar 3 · 10:42 PT', sub: 'pre-flush · FLW-06', x: 530, facilityRH: 55.1, facilityRHWarn: false, headline: null, overrides: { 'flw-02': { state: 'active', day: 'D39', flag: null }, 'flw-04': { state: 'active', day: 'D25', flag: null }, 'veg-02': { state: 'active', day: 'D2', flag: null } } },
  { id: 'cyc-1', label: 'LAST CYCLE', stamp: 'Tue Jan 21 · same hour', sub: 'FLW-04 · day 42 · same strain', x: 290, facilityRH: 65.4, facilityRHWarn: true, headline: 'FLW-04 same strain · same day · same drift', overrides: {
    'flw-02': { state: 'active', day: '—', flag: null, dim: true },
    'flw-04': { state: 'urgent', day: 'D42', flag: 'RH 65.4%', isPattern: true, focused: true },
    'flw-03': { state: 'active', day: '—', flag: null, dim: true },
    'flw-01': { state: 'active', day: '—', flag: null, dim: true },
    'veg-02': { state: 'active', day: '—', flag: null, dim: true },
    'veg-05': { state: 'nominal', day: '—', flag: null, dim: true },
    'flw-06': { state: 'nominal', day: '—', flag: null, dim: true },
    'flw-07': { state: 'nominal', day: '—', flag: null, dim: true },
    'flw-08': { state: 'nominal', day: '—', flag: null, dim: true },
    'flw-09': { state: 'nominal', day: '—', flag: null, dim: true },
    'flw-10': { state: 'nominal', day: '—', flag: null, dim: true },
    'flw-11': { state: 'nominal', day: '—', flag: null, dim: true },
    'veg-01': { state: 'active', day: '—', flag: null, dim: true },
  } },
];

export const STATE_FILL: Record<RoomState, { fill: string; stroke: string; text: string }> = {
  nominal:   { fill: 'rgba(255,255,255,0.025)', stroke: 'rgba(255,255,255,0.08)',  text: 'rgba(245,244,241,0.32)' },
  active:    { fill: 'rgba(232,224,212,0.05)',  stroke: 'rgba(232,224,212,0.18)',  text: 'rgba(245,244,241,0.78)' },
  attention: { fill: 'rgba(200,148,58,0.10)',   stroke: 'rgba(200,148,58,0.55)',   text: '#E8C886' },
  urgent:    { fill: 'rgba(197,106,106,0.16)',  stroke: 'rgba(197,106,106,0.85)',  text: '#F5A9A9' },
};

export const KIND_DOT: Record<LayoutType, string> = {
  mother: '#D97706', clone: '#0EA5E9', veg: '#10B981',
  flower: '#F43F5E', dry: 'rgba(245,244,241,0.50)', cure: '#8B5CF6',
  water: 'rgba(245,244,241,0.30)', lab: 'rgba(245,244,241,0.30)',
};

// 14-day post-harvest pipeline (verbatim)
export interface TimelineDay {
  num: number;
  name: string;
  past?: boolean;
  today?: boolean;
  weekend?: boolean;
  pill?: { kind: 'harvest' | 'dry' | 'cure' | 'package'; room: string; strain: string };
}

export const FPL_TL: TimelineDay[] = [
  { num: 4, name: 'Mon', past: true },
  { num: 5, name: 'Tue', past: true, pill: { kind: 'harvest', room: 'FLW-06', strain: 'Blue Dream' } },
  { num: 6, name: 'Wed', today: true, pill: { kind: 'harvest', room: 'FLW-09', strain: 'Wedding Cake' } },
  { num: 7, name: 'Thu' },
  { num: 8, name: 'Fri', pill: { kind: 'harvest', room: 'FLW-10', strain: 'Sundae Driver' } },
  { num: 9, name: 'Sat', weekend: true },
  { num: 10, name: 'Sun', weekend: true, pill: { kind: 'dry', room: 'DRY-01', strain: 'transfer' } },
  { num: 11, name: 'Mon' },
  { num: 12, name: 'Tue', pill: { kind: 'cure', room: 'CURE', strain: 'transfer' } },
  { num: 13, name: 'Wed', pill: { kind: 'package', room: 'LAB', strain: 'Mac1 QA' } },
  { num: 14, name: 'Thu' },
  { num: 15, name: 'Fri', pill: { kind: 'harvest', room: 'FLW-01', strain: 'Gelato 33' } },
  { num: 16, name: 'Sat', weekend: true },
  { num: 17, name: 'Sun', weekend: true },
];
