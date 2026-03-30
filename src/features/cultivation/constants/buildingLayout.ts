/**
 * Building Map Layout — 40th St Cultivation Phase 2 (20,100 GSF)
 *
 * Static spatial configuration mapping room_code → SVG position.
 * Coordinates derived from the approved v4 prototype.
 *
 * Layout (L→R):
 *   MAIN ROW: VEG-01, WATER, FLW-01→04, [DRY stack], VEG-05, LAB, gap, VEG-02, FLW-06→11
 *   DRY STACK: DRY-03/02/01 stacked vertically at the dry position
 *   CORRIDOR: Full-width strip along south wall
 */

// ── Geometry constants ──────────────────────────────────────────────

const GAP = 6;
const MAIN_Y = 130;
const MAIN_H = 120;
const CORRIDOR_Y = MAIN_Y + MAIN_H + 6;
const CORRIDOR_H = 24;
const DRY_W = 58;
const DRY_GAP = 3;
const DRY_EACH_H = Math.floor((MAIN_H - 2 * DRY_GAP) / 3); // ~38

// ── Sequential position builder ─────────────────────────────────────

type PositionEntry = { x: number; w: number };

function buildMainRow() {
  let x = 35;
  const r: Record<string, PositionEntry> = {};
  const add = (id: string, w: number) => {
    r[id] = { x, w };
    x += w + GAP;
  };

  add('VEG-01', 180);
  add('WATER', 65);
  add('FLW-01', 68);
  add('FLW-02', 68);
  add('FLW-03', 68);
  add('FLW-04', 68);

  // Dry rooms stack vertically here
  const dryX = x;
  x += DRY_W + GAP;

  add('VEG-05', 68);
  add('LAB', 65);

  // Narrow corridor gap
  x += 14;

  add('VEG-02', 95);
  add('FLW-06', 68);
  add('FLW-07', 68);
  add('FLW-08', 68);
  add('FLW-09', 68);
  add('FLW-10', 68);
  add('FLW-11', 68);

  return { positions: r, dryX, endX: x };
}

const { positions: mainPositions, dryX, endX } = buildMainRow();

// ── Public types ────────────────────────────────────────────────────

export interface RoomPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RoomLayoutType =
  | 'flower'
  | 'veg'
  | 'dry'
  | 'water'
  | 'lab'
  | 'non-grow';

export interface RoomLayoutEntry extends RoomPosition {
  /** Room code to match against RoomOperationalState.room_code */
  code: string;
  /** Display name */
  name: string;
  /** Layout category (determines color on map) */
  layoutType: RoomLayoutType;
}

// ── Room definitions ────────────────────────────────────────────────

function mainRoom(code: string, name: string, layoutType: RoomLayoutType): RoomLayoutEntry {
  const pos = mainPositions[code];
  if (!pos) throw new Error(`No position for room ${code}`);
  return { code, name, layoutType, x: pos.x, y: MAIN_Y, w: pos.w, h: MAIN_H };
}

function dryRoom(code: string, name: string, stackIndex: number): RoomLayoutEntry {
  return {
    code,
    name,
    layoutType: 'dry',
    x: dryX,
    y: MAIN_Y + stackIndex * (DRY_EACH_H + DRY_GAP),
    w: DRY_W,
    h: DRY_EACH_H,
  };
}

export const ROOM_LAYOUT: RoomLayoutEntry[] = [
  // Dry rooms — stacked vertically at the dry position
  dryRoom('DRY-03', 'Dry Room 3', 0),
  dryRoom('DRY-02', 'Dry Room 2', 1),
  dryRoom('DRY-01', 'Dry Room 1', 2),

  // Main row — left to right
  mainRoom('VEG-01', 'Veg Room 1', 'veg'),
  mainRoom('WATER', 'Water Room', 'water'),
  mainRoom('FLW-01', 'Flower 1', 'flower'),
  mainRoom('FLW-02', 'Flower 2', 'flower'),
  mainRoom('FLW-03', 'Flower 3', 'flower'),
  mainRoom('FLW-04', 'Flower 4', 'flower'),
  mainRoom('VEG-05', 'Veg Room 5', 'veg'),
  mainRoom('LAB', 'Lab / Processing', 'lab'),
  mainRoom('VEG-02', 'Veg Room 2', 'veg'),
  mainRoom('FLW-06', 'Flower 6', 'flower'),
  mainRoom('FLW-07', 'Flower 7', 'flower'),
  mainRoom('FLW-08', 'Flower 8', 'flower'),
  mainRoom('FLW-09', 'Flower 9', 'flower'),
  mainRoom('FLW-10', 'Flower 10', 'flower'),
  mainRoom('FLW-11', 'Flower 11', 'flower'),
];

/** Lookup by room_code for quick matching */
export const ROOM_LAYOUT_MAP: Record<string, RoomLayoutEntry> = Object.fromEntries(
  ROOM_LAYOUT.map((r) => [r.code, r])
);

// ── SVG viewport & structure ────────────────────────────────────────

export const SVG_VIEWPORT = {
  width: endX + 20,
  height: CORRIDOR_Y + CORRIDOR_H + 40,
};

export const CORRIDOR = {
  x: 30,
  y: CORRIDOR_Y,
  width: endX - 25,
  height: CORRIDOR_H,
};

/** West wing label center X, East wing label center X */
export const WING_LABELS = {
  west: {
    x: (mainPositions['VEG-01'].x + mainPositions['LAB'].x + mainPositions['LAB'].w) / 2,
    y: CORRIDOR_Y + CORRIDOR_H + 16,
  },
  east: {
    x: (mainPositions['VEG-02'].x + mainPositions['FLW-11'].x + mainPositions['FLW-11'].w) / 2,
    y: CORRIDOR_Y + CORRIDOR_H + 16,
  },
};

/** Corridor gap dashed lines (between LAB and VEG-02) */
export const CORRIDOR_GAP = {
  leftX: mainPositions['LAB'].x + mainPositions['LAB'].w + 2,
  rightX: mainPositions['VEG-02'].x - 2,
  topY: MAIN_Y,
  bottomY: MAIN_Y + MAIN_H,
};

/** Building outline */
export const BUILDING_OUTLINE = {
  x: 30,
  y: 25,
  width: endX - 25,
  height: CORRIDOR_Y + CORRIDOR_H - 20,
};

// ── Color mapping for SVG fills ─────────────────────────────────────

export const LAYOUT_TYPE_COLORS: Record<RoomLayoutType, string> = {
  flower: '#10b981',
  veg: '#0ea5e9',
  dry: '#78716c',
  water: '#06b6d4',
  lab: '#8b5cf6',
  'non-grow': '#1e1e1e',
};

export const URGENCY_STYLES = {
  3: { color: '#DC4545', shadow: '0 0 18px rgba(220,69,69,0.3)', label: 'URGENT' },
  2: { color: '#F59E0B', shadow: '0 0 15px rgba(245,158,11,0.25)', label: 'ATTN' },
  1: { color: '#eab308', shadow: '0 0 10px rgba(234,179,8,0.15)', label: 'WATCH' },
} as const;
