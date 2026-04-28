// Floor Plan, Live — variation C
// 1700×1200. Plan + side rail + bottom timeline.

const SeedGlyphFPL = window.SeedGlyph;

/* ─── Facility model — 40th St, reconciled with v_room_operational_state ─────
   Room shape mirrors hooks/useRoomOperationalState.RoomOperationalState
   so this view becomes a 1:1 spec for the production component.

   In-cycle rooms (inCycle: true) have full ops data.
   Off-cycle rooms (MOM, CLN, CURE) are real rooms not exposed by the view —
   they have no harvest cycle. Designed quieter; their data lives elsewhere.

   Phase I (left): MOM, CLN, VEG-01, WATER, FLW-01–04, DRY-01/02/03, VEG-05, CURE, LAB
   Phase II (right): VEG-02, FLW-06–11
   Corridor + egress doors run along the south edge. */

const PHASE_DIVIDER_X = 968; // x-coord of the Phase I / II boundary (between LAB and VEG-02)

/* In-cycle room shape mirrors RoomOperationalState. Off-cycle rooms (MOM/CLN/CURE)
   set inCycle:false and carry only what the design needs to represent them. */
const FACILITY = {
  building: { x: 20, y: 20, w: 1264, h: 280 },
  corridorY: 240,                // y of corridor top
  corridorH: 30,                 // corridor band height
  rooms: [
    /* ───────────────── PHASE I — West Wing ───────────────── */

    // West end — Clone over Mother (off-cycle: not in v_room_operational_state)
    { id: 'cln',  code: 'CLN',  name: 'Clone',  layoutType: 'clone',  inCycle: false, phase: 1,
      x: 30, y: 30,  w: 70, h: 90,
      total_plants: 482, strain_count: 5,
      caption: '482 cuttings' },
    { id: 'mom',  code: 'MOM',  name: 'Mother', layoutType: 'mother', inCycle: false, phase: 1,
      x: 30, y: 122, w: 70, h: 116,
      total_plants: 18, strain_count: 12,
      caption: 'genetic library' },

    // VEG-01 — huge (≈63′ wide on plan)
    { id: 'veg-01', code: 'VEG-01', name: 'Veg Room 1', layoutType: 'veg', inCycle: true, phase: 1,
      x: 102, y: 30, w: 280, h: 208,
      dominant_stage: 'veg', days_in_stage: 18, days_to_harvest: null,
      total_plants: 1840, capacity_plants: 2000, occupancy_status: 'occupied',
      strain_count: 14, urgency_score: 0,
      tasks_today: 8, tasks_completed_today: 5 },

    // WATER — support (off-cycle)
    { id: 'water', code: 'WATER', name: 'Water Room', layoutType: 'water', inCycle: false, phase: 1,
      x: 384, y: 30, w: 50, h: 208 },

    // Flower 01-04 — each ≈16′ wide, 42′ deep
    { id: 'flw-01', code: 'FLW-01', name: 'Flower 1', layoutType: 'flower', inCycle: true, phase: 1,
      x: 436, y: 30, w: 84, h: 208,
      dominant_stage: 'flower', days_in_stage: 49, days_to_harvest: 14,
      total_plants: 612, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 7, urgency_score: 2,
      tasks_today: 14, tasks_completed_today: 6,
      flag: 'VPD 1.32' },
    { id: 'flw-02', code: 'FLW-02', name: 'Flower 2', layoutType: 'flower', inCycle: true, phase: 1,
      x: 522, y: 30, w: 84, h: 208,
      dominant_stage: 'flower', days_in_stage: 42, days_to_harvest: 21,
      total_plants: 612, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 8, urgency_score: 3, focused: true,
      tasks_today: 11, tasks_completed_today: 4,
      flag: 'RH 64.2%' },
    { id: 'flw-03', code: 'FLW-03', name: 'Flower 3', layoutType: 'flower', inCycle: true, phase: 1,
      x: 608, y: 30, w: 84, h: 208,
      dominant_stage: 'flower', days_in_stage: 35, days_to_harvest: 28,
      total_plants: 590, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 6, urgency_score: 0,
      tasks_today: 9, tasks_completed_today: 9 },
    { id: 'flw-04', code: 'FLW-04', name: 'Flower 4', layoutType: 'flower', inCycle: true, phase: 1,
      x: 694, y: 30, w: 84, h: 208,
      dominant_stage: 'flower', days_in_stage: 28, days_to_harvest: 35,
      total_plants: 624, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 9, urgency_score: 2,
      tasks_today: 12, tasks_completed_today: 5,
      flag: 'CO₂ 1180' },

    // Dry stack — three rooms now (DRY-01/02/03)
    { id: 'dry-03', code: 'DRY-03', name: 'Dry Room 3', layoutType: 'dry', inCycle: true, phase: 1,
      x: 780, y: 30,  w: 50, h: 65,
      dominant_stage: 'dry', days_in_stage: 9, days_to_harvest: null,
      total_plants: 0, occupancy_status: 'occupied',
      strain_count: 3, urgency_score: 0,
      tasks_today: 2, tasks_completed_today: 1 },
    { id: 'dry-02', code: 'DRY-02', name: 'Dry Room 2', layoutType: 'dry', inCycle: true, phase: 1,
      x: 780, y: 99,  w: 50, h: 65,
      dominant_stage: 'dry', days_in_stage: 4, days_to_harvest: null,
      total_plants: 0, occupancy_status: 'occupied',
      strain_count: 2, urgency_score: 0,
      tasks_today: 1, tasks_completed_today: 1 },
    { id: 'dry-01', code: 'DRY-01', name: 'Dry Room 1', layoutType: 'dry', inCycle: true, phase: 1,
      x: 780, y: 168, w: 50, h: 70,
      dominant_stage: 'dry', days_in_stage: 1, days_to_harvest: null,
      total_plants: 0, occupancy_status: 'occupied',
      strain_count: 1, urgency_score: 0,
      tasks_today: 0, tasks_completed_today: 0 },

    // VEG-05 (replacing the fictional FLR-5; this is the real Phase I veg room)
    { id: 'veg-05', code: 'VEG-05', name: 'Veg Room 5', layoutType: 'veg', inCycle: true, phase: 1,
      x: 832, y: 30, w: 50, h: 208,
      dominant_stage: 'veg', days_in_stage: 21, days_to_harvest: null,
      total_plants: 320, capacity_plants: 400, occupancy_status: 'occupied',
      strain_count: 8, urgency_score: 0,
      tasks_today: 4, tasks_completed_today: 2 },

    // CURE — off-cycle, post-harvest
    { id: 'cure', code: 'CURE', name: 'Cure', layoutType: 'cure', inCycle: false, phase: 1,
      x: 884, y: 30, w: 38, h: 208,
      total_plants: 0, strain_count: 4,
      caption: '14 batches' },

    // LAB — combined Test/Lab/Bath into a single processing surface
    { id: 'lab', code: 'LAB', name: 'Lab / Processing', layoutType: 'lab', inCycle: false, phase: 1,
      x: 924, y: 30, w: 42, h: 208 },

    /* ───── Phase divider sits at x=968 ───── */

    /* ───────────────── PHASE II — East Wing ───────────────── */

    // VEG-02 — heavier strain density (mother farm for east-wing flower rooms)
    { id: 'veg-02', code: 'VEG-02', name: 'Veg Room 2', layoutType: 'veg', inCycle: true, phase: 2,
      x: 974, y: 30, w: 56, h: 208,
      dominant_stage: 'veg', days_in_stage: 5, days_to_harvest: null,
      total_plants: 480, capacity_plants: 520, occupancy_status: 'occupied',
      strain_count: 14, urgency_score: 1,
      tasks_today: 6, tasks_completed_today: 1,
      flag: 'EC drift' },

    // Flower 06-11
    { id: 'flw-06', code: 'FLW-06', name: 'Flower 6',  layoutType: 'flower', inCycle: true, phase: 2,
      x: 1032, y: 30, w: 40, h: 208,
      dominant_stage: 'flower', days_in_stage: 63, days_to_harvest: 0,
      total_plants: 612, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 7, urgency_score: 0,
      tasks_today: 18, tasks_completed_today: 12,
      flag: 'harvest Tue' },
    { id: 'flw-07', code: 'FLW-07', name: 'Flower 7',  layoutType: 'flower', inCycle: true, phase: 2,
      x: 1074, y: 30, w: 40, h: 208,
      dominant_stage: 'flower', days_in_stage: 14, days_to_harvest: 49,
      total_plants: 624, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 6, urgency_score: 0,
      tasks_today: 5, tasks_completed_today: 4 },
    { id: 'flw-08', code: 'FLW-08', name: 'Flower 8',  layoutType: 'flower', inCycle: true, phase: 2,
      x: 1116, y: 30, w: 40, h: 208,
      dominant_stage: 'flower', days_in_stage: 7, days_to_harvest: 56,
      total_plants: 612, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 8, urgency_score: 0,
      tasks_today: 4, tasks_completed_today: 4 },
    { id: 'flw-09', code: 'FLW-09', name: 'Flower 9',  layoutType: 'flower', inCycle: true, phase: 2,
      x: 1158, y: 30, w: 40, h: 208,
      dominant_stage: 'flower', days_in_stage: 56, days_to_harvest: 7,
      total_plants: 596, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 9, urgency_score: 1,
      tasks_today: 11, tasks_completed_today: 7 },
    { id: 'flw-10', code: 'FLW-10', name: 'Flower 10', layoutType: 'flower', inCycle: true, phase: 2,
      x: 1200, y: 30, w: 40, h: 208,
      dominant_stage: 'flower', days_in_stage: 49, days_to_harvest: 14,
      total_plants: 612, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 6, urgency_score: 0,
      tasks_today: 9, tasks_completed_today: 6 },
    { id: 'flw-11', code: 'FLW-11', name: 'Flower 11', layoutType: 'flower', inCycle: true, phase: 2,
      x: 1242, y: 30, w: 40, h: 208,
      dominant_stage: 'flower', days_in_stage: 35, days_to_harvest: 28,
      total_plants: 624, capacity_plants: 640, occupancy_status: 'full',
      strain_count: 5, urgency_score: 0,
      tasks_today: 7, tasks_completed_today: 7 },
  ],
};

/* ─── Time anchors — corridor scrubber positions ───────────────────
   Each anchor describes the facility state at a past moment.
   Rooms can override day/state/flag at each anchor; otherwise inherit "now". */
const TIME_ANCHORS = [
  {
    id: 'now',     label: 'NOW',          stamp: 'Wed Mar 6 · 10:42 PT',
    sub: 'live · synced 0:14',           x: 1255, isLive: true,
    facilityRH: 58.4, facilityRHWarn: true,
    headline: null,
    overrides: {},
  },
  {
    id: 'm-2h',    label: '−2h',          stamp: 'Wed Mar 6 · 08:42 PT',
    sub: 'lights-on +2h',                 x: 1090,
    facilityRH: 56.8, facilityRHWarn: false,
    headline: null,
    overrides: {
      'flw-02': { state: 'attention', day: 'D42', flag: 'RH 60.1%' },
      'flw-04': { state: 'active',    day: 'D28', flag: null },
    },
  },
  {
    id: 'm-6h',    label: '−6h',          stamp: 'Wed Mar 6 · 04:42 PT',
    sub: 'lights-off · last hour',        x: 925,
    facilityRH: 54.2, facilityRHWarn: false,
    headline: null,
    overrides: {
      'flw-02': { state: 'active', day: 'D42', flag: null },
      'flw-04': { state: 'active', day: 'D28', flag: null },
      'veg-02': { state: 'active', day: 'D5',  flag: null },
    },
  },
  {
    id: 'd-1',     label: 'YESTERDAY',    stamp: 'Tue Mar 5 · 10:42 PT',
    sub: 'FLW-06 harvest day',             x: 720,
    facilityRH: 57.9, facilityRHWarn: false,
    headline: 'Blue Dream · FLW-06 cut at 14:20',
    overrides: {
      'flw-02': { state: 'active',    day: 'D41', flag: null },
      'flw-04': { state: 'active',    day: 'D27', flag: null },
      'flw-06': { state: 'urgent',    day: 'D62', flag: 'CUT TODAY' },
      'veg-02': { state: 'active',    day: 'D4',  flag: null },
    },
  },
  {
    id: 'd-3',     label: '−3d',          stamp: 'Sun Mar 3 · 10:42 PT',
    sub: 'pre-flush · FLW-06',             x: 530,
    facilityRH: 55.1, facilityRHWarn: false,
    headline: null,
    overrides: {
      'flw-02': { state: 'active', day: 'D39', flag: null },
      'flw-04': { state: 'active', day: 'D25', flag: null },
      'veg-02': { state: 'active', day: 'D2',  flag: null },
    },
  },
  {
    id: 'cyc-1',   label: 'LAST CYCLE',   stamp: 'Tue Jan 21 · same hour',
    sub: 'FLW-04 · day 42 · same strain',  x: 290,
    facilityRH: 65.4, facilityRHWarn: true,
    headline: 'FLW-04 same strain · same day · same drift',
    overrides: {
      'flw-02': { state: 'active',    day: '—',   flag: null,         dim: true },
      'flw-04': { state: 'urgent',    day: 'D42', flag: 'RH 65.4%',  isPattern: true, focused: true },
      'flw-03': { state: 'active',    day: '—',   flag: null,         dim: true },
      'flw-01': { state: 'active',    day: '—',   flag: null,         dim: true },
      'veg-02': { state: 'active',    day: '—',   flag: null,         dim: true },
      // Ghost most other rooms — focus the moment The Seed wants to show you
      'veg-05':  { state: 'nominal', day: '—', flag: null, dim: true },
      'flw-06':  { state: 'nominal', day: '—', flag: null, dim: true },
      'flw-07':  { state: 'nominal', day: '—', flag: null, dim: true },
      'flw-08':  { state: 'nominal', day: '—', flag: null, dim: true },
      'flw-09':  { state: 'nominal', day: '—', flag: null, dim: true },
      'flw-10': { state: 'nominal', day: '—', flag: null, dim: true },
      'flw-11': { state: 'nominal', day: '—', flag: null, dim: true },
      'veg-01':  { state: 'active',  day: '—', flag: null, dim: true },
    },
  },
];

/* Color/glow per state — uses CSS vars */
const STATE_FILL = {
  nominal:   { fill: 'rgba(255,255,255,0.025)', stroke: 'rgba(255,255,255,0.08)',  text: 'rgba(245,244,241,0.32)' },
  active:    { fill: 'rgba(232,224,212,0.05)',  stroke: 'rgba(232,224,212,0.18)',  text: 'rgba(245,244,241,0.78)' },
  attention: { fill: 'rgba(200,148,58,0.10)',   stroke: 'rgba(200,148,58,0.55)',   text: '#E8C886' },
  urgent:    { fill: 'rgba(197,106,106,0.16)',  stroke: 'rgba(197,106,106,0.85)',  text: '#F5A9A9' },
};

const KIND_DOT = {
  mother: '#D97706', clone: '#0EA5E9', veg: '#10B981',
  flower: '#F43F5E', dry: 'rgba(245,244,241,0.50)', cure: '#8B5CF6',
  support: 'rgba(245,244,241,0.30)',
};

/* ─── Floor plan SVG — long horizontal building ──────────────────── */

/* Vertical text component for narrow rooms */
function VLabel({ x, y, text, fill, opacity = 1, weight = 400, size = 9, letterSpacing = '0.06em', mono = true }) {
  return (
    <text
      transform={`translate(${x}, ${y}) rotate(-90)`}
      fontFamily={mono ? 'IBM Plex Mono' : 'IBM Plex Sans'}
      fontSize={size}
      letterSpacing={letterSpacing}
      fill={fill}
      opacity={opacity}
      style={{ fontWeight: weight }}
    >
      {text}
    </text>
  );
}

function FloorPlanSVG({ anchor, anchorIdx, onScrub }) {
  const W = 1300, H = 320;
  const corridorY = 250;
  const corridorH = 22;

  // Apply per-anchor overrides to base rooms.
  // Derive legacy display fields (state/day/label/kind/strain) from the new
  // RoomOperationalState shape so the rendering pipeline below stays the same.
  const rooms = FACILITY.rooms.map(r => {
    // urgency_score → state bucket (0 = active, 1-2 = attention, 3+ = urgent)
    const baseState = !r.inCycle
      ? (r.layoutType === 'water' || r.layoutType === 'lab' ? 'nominal' : 'active')
      : r.urgency_score >= 3 ? 'urgent'
      : r.urgency_score >= 1 ? 'attention'
      : 'active';

    // days → 'D49' display string. Off-cycle rooms show '—'.
    const dayStr = r.inCycle && typeof r.days_in_stage === 'number'
      ? 'D' + r.days_in_stage
      : '—';

    // Strain caption: explicit caption (off-cycle) > strain count (in-cycle veg/flower)
    const strainCaption = r.caption
      || (r.inCycle && r.strain_count
            ? r.strain_count + (r.strain_count === 1 ? ' strain' : ' strains')
            : null);

    const derived = {
      ...r,
      state: baseState,
      day: dayStr,
      label: r.code,
      kind: r.layoutType,
      strain: strainCaption,
    };

    const o = anchor.overrides[r.id];
    if (!o) return { ...derived, focused: anchor.isLive ? r.focused : false };
    return {
      ...derived,
      ...o,
      focused: o.focused !== undefined ? o.focused : (anchor.isLive ? r.focused : false),
    };
  });

  const focused = rooms.find(r => r.focused);
  // Pattern partner: at NOW it's FLW-04 (the room The Seed is comparing against);
  // at LAST CYCLE it's FLW-02 (where the pattern will recur).
  const pattern = anchor.id === 'cyc-1'
    ? rooms.find(r => r.code === 'FLW-02')
    : rooms.find(r => r.code === 'FLW-04');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fpl-svg" xmlns="http://www.w3.org/2000/svg">
      {/* Subtle grid backdrop */}
      <defs>
        <pattern id="fpl-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="fpl-glow-bad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(197,106,106,0.45)" />
          <stop offset="100%" stopColor="rgba(197,106,106,0)" />
        </radialGradient>
        <radialGradient id="fpl-glow-warn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200,148,58,0.30)" />
          <stop offset="100%" stopColor="rgba(200,148,58,0)" />
        </radialGradient>
        <radialGradient id="fpl-glow-focus" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(232,224,212,0.18)" />
          <stop offset="100%" stopColor="rgba(232,224,212,0)" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#fpl-grid)" />

      {/* Building outline */}
      <rect x={FACILITY.building.x} y={FACILITY.building.y}
            width={FACILITY.building.w} height={FACILITY.building.h}
            fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1" />

      {/* Phase divider — vertical line + label */}
      <line x1={PHASE_DIVIDER_X} y1={20} x2={PHASE_DIVIDER_X} y2={300}
            stroke="rgba(168,184,154,0.35)" strokeWidth="0.8"
            strokeDasharray="6 4" />
      <text x={PHASE_DIVIDER_X} y={14}
            fontFamily="IBM Plex Mono" fontSize="8.5"
            letterSpacing="0.22em" fill="rgba(168,184,154,0.85)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>
        ◀  PHASE I    ·    PHASE II  ▶
      </text>

      {/* Glow halos for urgent/attention */}
      {rooms.filter(r => r.state === 'urgent').map(r => (
        <ellipse key={`glow-${r.id}`}
          cx={r.x + r.w/2} cy={r.y + r.h/2}
          rx={r.w * 1.0} ry={r.h * 0.7}
          fill="url(#fpl-glow-bad)"
          style={{ animation: 'fpl-pulse-bad 2s ease-in-out infinite' }} />
      ))}
      {rooms.filter(r => r.state === 'attention').map(r => (
        <ellipse key={`glow-${r.id}`}
          cx={r.x + r.w/2} cy={r.y + r.h/2}
          rx={r.w * 0.9} ry={r.h * 0.6}
          fill="url(#fpl-glow-warn)"
          style={{ animation: 'fpl-pulse-warn 3s ease-in-out infinite' }} />
      ))}

      {/* The Seed — pattern connection ghost overlay */}
      {focused && pattern && focused.id !== pattern.id && (
        <g opacity="0.85">
          <path
            d={`M ${focused.x + focused.w/2} ${focused.y - 4}
                Q ${(focused.x + pattern.x + focused.w + pattern.w)/4} ${focused.y - 18}
                  ${pattern.x + pattern.w/2} ${pattern.y - 4}`}
            stroke="rgba(232,224,212,0.55)" strokeWidth="1"
            strokeDasharray="3 3" fill="none" />
          <circle cx={focused.x + focused.w/2} cy={focused.y - 4} r="2.5"
                  fill="rgba(232,224,212,0.85)" />
          <circle cx={pattern.x + pattern.w/2} cy={pattern.y - 4} r="2.5"
                  fill="rgba(232,224,212,0.85)" />
          <text x={(focused.x + focused.w/2 + pattern.x + pattern.w/2)/2}
                y={focused.y - 22}
                fontFamily="IBM Plex Mono" fontSize="7.5"
                letterSpacing="0.20em" fill="rgba(232,224,212,0.75)"
                textAnchor="middle" style={{ textTransform: 'uppercase' }}>
            ◇ THE SEED · same curve
          </text>
        </g>
      )}

      {/* Rooms */}
      {rooms.map(r => {
        const s = STATE_FILL[r.state];
        const dimOpacity = r.dim ? 0.32 : 1;
        const isFocus = r.focused;
        const narrow = r.w < 70; // narrow rooms get vertical labels
        const tall = r.h > 100;

        return (
          <g key={r.id} opacity={dimOpacity}>
            {/* Focused halo */}
            {isFocus && (
              <ellipse cx={r.x + r.w/2} cy={r.y + r.h/2}
                rx={r.w * 0.85} ry={r.h * 0.65}
                fill="url(#fpl-glow-focus)" />
            )}
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={s.fill} stroke={s.stroke} strokeWidth={isFocus ? 1.6 : 0.8} />

            {/* Stage marker dot top-left for named rooms */}
            {r.code && (
              <circle cx={r.x + 6} cy={r.y + 6} r="2.5" fill={KIND_DOT[r.kind]} />
            )}

            {r.code && narrow && tall ? (
              /* NARROW + TALL — vertical labels (most flower rooms in Phase II, Veg-2) */
              <>
                <VLabel x={r.x + r.w/2 + 4} y={r.y + r.h - 8}
                        text={r.label} fill={s.text} weight={500}
                        letterSpacing="0.10em" size={9.5} />
                {r.day && r.day !== '—' && (
                  <VLabel x={r.x + r.w/2 - 8} y={r.y + r.h - 8}
                          text={r.day} fill={s.text} weight={400}
                          letterSpacing="0.06em" size={9} />
                )}
                {r.strain && (
                  <VLabel x={r.x + r.w/2 - 20} y={r.y + r.h - 8}
                          text={r.strain.length > 22 ? r.strain.slice(0, 20) + '…' : r.strain}
                          fill={s.text} opacity={0.65}
                          letterSpacing="0" size={8.5} mono={false} />
                )}
                {r.flag && (
                  <VLabel x={r.x + r.w - 6} y={r.y + r.h - 8}
                          text={r.flag} fill={s.text} weight={500}
                          letterSpacing="0.14em" size={7.5} />
                )}
              </>
            ) : r.code && narrow && !tall ? (
              /* NARROW + SHORT — Dry/Cure rooms — horizontal compact */
              <>
                <text x={r.x + r.w/2} y={r.y + r.h/2 - 4}
                      fontFamily="IBM Plex Mono" fontSize="9"
                      letterSpacing="0.10em" fill={s.text}
                      textAnchor="middle" style={{ fontWeight: 500 }}>
                  {r.label}
                </text>
                {r.day && r.day !== '—' && (
                  <text x={r.x + r.w/2} y={r.y + r.h/2 + 8}
                        fontFamily="IBM Plex Mono" fontSize="8.5"
                        letterSpacing="0.04em" fill={s.text}
                        textAnchor="middle" opacity="0.75">
                    {r.day}
                  </text>
                )}
              </>
            ) : r.code ? (
              /* WIDE rooms — horizontal layout (Veg-1, Mom, Clone, Phase I flower) */
              <>
                <text x={r.x + 13} y={r.y + 11}
                      fontFamily="IBM Plex Mono" fontSize="9.5"
                      letterSpacing="0.08em" fill={s.text}
                      style={{ fontWeight: 500 }}>
                  {r.label}
                </text>
                {r.day && r.day !== '—' && (
                  <text x={r.x + r.w - 6} y={r.y + 11}
                        fontFamily="IBM Plex Mono" fontSize="9"
                        letterSpacing="0.04em" fill={s.text}
                        textAnchor="end" style={{ fontWeight: 500 }}>
                    {r.day}
                  </text>
                )}
                {r.strain && r.w > 70 && (
                  /* Strain runs vertically up the middle of tall flower rooms,
                     OR horizontally across the top of wide veg/mom rooms */
                  r.h > r.w
                    ? <VLabel x={r.x + r.w/2 + 5} y={r.y + r.h - 8}
                              text={r.strain.length > 26 ? r.strain.slice(0, 24) + '…' : r.strain}
                              fill={s.text} opacity={0.62}
                              letterSpacing="0" size={9} mono={false} />
                    : <text x={r.x + 6} y={r.y + 26}
                            fontFamily="IBM Plex Sans" fontSize="9.5"
                            fill={s.text} opacity="0.70"
                            style={{ fontStyle: 'italic' }}>
                        {r.strain.length > 38 ? r.strain.slice(0, 36) + '…' : r.strain}
                      </text>
                )}
                {r.flag && (
                  r.h > r.w
                    ? <VLabel x={r.x + r.w - 6} y={r.y + r.h - 8}
                              text={r.flag} fill={s.text} weight={500}
                              letterSpacing="0.14em" size={7.5} />
                    : <text x={r.x + 6} y={r.y + r.h - 8}
                            fontFamily="IBM Plex Mono" fontSize="8"
                            letterSpacing="0.14em" fill={s.text}
                            style={{ textTransform: 'uppercase', fontWeight: 500 }}>
                        {r.flag}
                      </text>
                )}
              </>
            ) : (
              /* Support room — single centered label */
              <text x={r.x + r.w/2} y={r.y + r.h/2 + 3}
                    fontFamily="IBM Plex Mono" fontSize="9"
                    letterSpacing="0.18em" fill={s.text}
                    textAnchor="middle"
                    style={{ textTransform: 'uppercase' }}>
                {r.label}
              </text>
            )}

            {/* Tasks progress — bottom-edge hairline (real data: tasks_completed/tasks_today) */}
            {r.inCycle && r.tasks_today > 0 && (() => {
              const pct = Math.min(1, (r.tasks_completed_today || 0) / r.tasks_today);
              const inset = 4;
              const barY = r.y + r.h - 2.5;
              const barW = r.w - inset * 2;
              return (
                <g>
                  <line x1={r.x + inset} y1={barY} x2={r.x + r.w - inset} y2={barY}
                        stroke="rgba(245,244,241,0.10)" strokeWidth="1" />
                  <line x1={r.x + inset} y1={barY} x2={r.x + inset + barW * pct} y2={barY}
                        stroke="rgba(232,224,212,0.55)" strokeWidth="1" />
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* Corridor — doubles as time scrubber */}
      <rect x={FACILITY.building.x} y={corridorY}
            width={FACILITY.building.w} height={corridorH}
            fill="rgba(245,244,241,0.022)"
            stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
      {/* Corridor scrubber rail */}
      <line x1={FACILITY.building.x + 12} y1={corridorY + corridorH/2}
            x2={FACILITY.building.x + FACILITY.building.w - 12} y2={corridorY + corridorH/2}
            stroke="rgba(245,244,241,0.14)" strokeWidth="0.6" strokeDasharray="2 4" />
      {/* corridor label, faded — reads as "central corridor / time" */}
      <text x={FACILITY.building.x + 18} y={corridorY + corridorH + 14}
            fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.30em" fill="rgba(245,244,241,0.30)"
            style={{ textTransform: 'uppercase' }}>
        ◀  earlier · drag to scrub time
      </text>
      <text x={FACILITY.building.x + FACILITY.building.w - 18} y={corridorY + corridorH + 14}
            fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.30em" fill="rgba(245,244,241,0.30)"
            textAnchor="end" style={{ textTransform: 'uppercase' }}>
        now  ▶
      </text>
      {/* Time anchor ticks */}
      {TIME_ANCHORS.map((a, i) => {
        const isActive = i === anchorIdx;
        return (
          <g key={a.id}
             style={{ cursor: 'pointer' }}
             onClick={() => onScrub(i)}>
            {/* hit area */}
            <rect x={a.x - 22} y={corridorY - 4}
                  width="44" height={corridorH + 22}
                  fill="transparent" />
            <line x1={a.x} y1={corridorY + 2} x2={a.x} y2={corridorY + corridorH - 2}
                  stroke={isActive ? 'var(--accent, #A8B89A)' : 'rgba(245,244,241,0.30)'}
                  strokeWidth={isActive ? 1.4 : 0.8} />
            <text x={a.x} y={corridorY - 4}
                  fontFamily="IBM Plex Mono" fontSize="7.5"
                  letterSpacing="0.16em"
                  fill={isActive ? 'var(--accent, #A8B89A)' : 'rgba(245,244,241,0.42)'}
                  textAnchor="middle"
                  style={{ textTransform: 'uppercase', fontWeight: isActive ? 600 : 400 }}>
              {a.label}
            </text>
          </g>
        );
      })}
      {/* Active anchor handle — sits on the corridor */}
      {(() => {
        const a = TIME_ANCHORS[anchorIdx];
        return (
          <g style={{ pointerEvents: 'none' }}>
            {/* vertical guide-line from corridor up through plan, dashed */}
            <line x1={a.x} y1={20} x2={a.x} y2={corridorY}
                  stroke="rgba(168,184,154,0.22)" strokeWidth="0.6"
                  strokeDasharray="2 4" />
            {/* handle */}
            <rect x={a.x - 7} y={corridorY - 1}
                  width="14" height={corridorH + 2}
                  fill="rgba(168,184,154,0.18)"
                  stroke="var(--accent, #A8B89A)" strokeWidth="1" />
            <line x1={a.x} y1={corridorY + 3} x2={a.x} y2={corridorY + corridorH - 3}
                  stroke="var(--accent, #A8B89A)" strokeWidth="0.6" />
            {a.isLive && (
              <circle cx={a.x} cy={corridorY + corridorH/2} r="2.5"
                      fill="var(--status-ok, #6FA98C)"
                      style={{ animation: 'fpl-blink 2s ease-in-out infinite' }} />
            )}
          </g>
        );
      })()}

      {/* North arrow (top-right corner) */}
      <g transform="translate(1280, 6)">
        <path d="M0 12 L0 0 M0 0 L-3 4 M0 0 L3 4"
              stroke="rgba(245,244,241,0.40)" strokeWidth="0.8" fill="none" />
        <text x={6} y={6} fontFamily="IBM Plex Mono" fontSize="7"
              letterSpacing="0.10em" fill="rgba(245,244,241,0.40)">N</text>
      </g>
    </svg>
  );
}

/* ─── Side rail ──────────────────────────────────────────────────── */

function FplSpark({ d, color = 'var(--accent)', target }) {
  return (
    <svg viewBox="0 0 200 22" preserveAspectRatio="none" width="100%" height="22" fill="none" className="fpl-env-row-spark">
      {target && <line x1="0" y1={target} x2="200" y2={target} stroke="rgba(232,224,212,0.16)" strokeDasharray="2 3" />}
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function SideRail() {
  return (
    <div className="fpl-rail">
      <div className="fpl-rail-head">
        <div className="fpl-rail-eyebrow">
          <span className="pulse" />
          FOCUS · NEEDS YOU · 14M ELAPSED
        </div>
        <div className="fpl-rail-code">FLW-02 · FLOWER WK 6 · PHASE I</div>
        <h2 className="fpl-rail-name">Wedding Cake</h2>
        <div className="fpl-rail-meta">
          <span><strong>Plants</strong>612</span>
          <span><strong>Canopy</strong>3,200 sqft</span>
          <span><strong>Lighting</strong>12/12</span>
          <span><strong>In-room</strong>D.Reyes</span>
        </div>
      </div>

      <div className="fpl-rail-progress">
        <div className="fpl-rail-progress-row">
          <div className="fpl-rail-day">42<span className="of">/63</span></div>
          <div className="fpl-rail-day-meta">
            21d to harvest<br/>
            <span style={{ color: 'var(--op-ink-3)' }}>est Mar 27</span>
          </div>
        </div>
        <div className="fpl-rail-bar">
          <div className="fpl-rail-bar-fill" style={{ width: '66.6%' }} />
        </div>
      </div>

      <div className="fpl-rail-section">
        <span>ENVIRONMENT</span>
        <span className="meta">last 4h · 1m</span>
      </div>
      <div className="fpl-env-stack">
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">RH</div>
          <FplSpark d="M0,18 L20,16 L40,14 L60,12 L80,10 L100,8 L120,6 L140,5 L160,4 L180,3 L200,2"
                    color="var(--status-bad)" target={6} />
          <div className="fpl-env-row-val bad">64.2<span className="unit">%</span></div>
          <div className="fpl-env-row-target">target ≤58</div>
        </div>
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">TEMP</div>
          <FplSpark d="M0,14 L20,13 L40,12 L60,11 L80,10 L100,9 L120,8 L140,9 L160,10 L180,11 L200,10" />
          <div className="fpl-env-row-val">76.4<span className="unit">°F</span></div>
          <div className="fpl-env-row-target">72–76</div>
        </div>
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">VPD</div>
          <FplSpark d="M0,10 L20,11 L40,12 L60,14 L80,15 L100,16 L120,17 L140,17 L160,18 L180,18 L200,18" />
          <div className="fpl-env-row-val">1.05<span className="unit">kPa</span></div>
          <div className="fpl-env-row-target">1.10–1.30</div>
        </div>
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">CO₂</div>
          <FplSpark d="M0,12 L20,11 L40,10 L60,11 L80,13 L100,12 L120,11 L140,10 L160,9 L180,10 L200,11" />
          <div className="fpl-env-row-val">1,050<span className="unit">ppm</span></div>
          <div className="fpl-env-row-target">950–1,100</div>
        </div>
      </div>

      <div className="fpl-rail-alert urgent">
        <div className="fpl-rail-alert-meta">
          <span style={{ color: 'var(--op-ink)' }}>OPEN ALERT</span>
          <span className="tone">— urgent</span>
          <span className="time">14m ago</span>
        </div>
        <div className="fpl-rail-alert-title">Humidity 64.2% — past upper bound for week 6</div>
        <div className="fpl-rail-alert-detail">
          Sustained 38 minutes. Bud-rot risk window opens at 65%. AC return temp climbing in tandem.
        </div>
      </div>

      <div className="fpl-rail-seed">
        <div className="fpl-rail-seed-eyebrow">
          <SeedGlyphFPL size={12} />
          THE SEED · PATTERN NOTICED
        </div>
        <div className="fpl-rail-seed-says">
          This room is tracing the <strong>same RH curve as FLW-04 last cycle</strong> — which finished 11% under yield.
        </div>
        <div className="fpl-rail-seed-detail">
          Same strain, same stage day, same lights-off window. Diego corrected it last time on day 44.
        </div>
        <div className="fpl-rail-seed-prov">
          <span><strong>obs</strong> 14d</span>
          <span><strong>basis</strong> 12 rooms</span>
          <span><strong>confidence</strong> high</span>
        </div>
      </div>

      <div className="fpl-rail-actions">
        <button className="fpl-rail-btn primary">Open dehumid program</button>
        <button className="fpl-rail-btn">Pull last cycle</button>
        <button className="fpl-rail-btn">Page Diego</button>
      </div>
    </div>
  );
}

/* ─── State strip ────────────────────────────────────────────────── */

function FacilityStateStrip({ anchor, onReturnLive }) {
  const isLive = anchor.isLive;
  return (
    <div className={`fpl-state ${isLive ? '' : 'is-scrubbed'}`}>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">
          {isLive
            ? <><span className="fpl-state-pulse" />NORTHBAY · LIVE</>
            : <><span className="fpl-state-pulse scrubbed" />NORTHBAY · REPLAYING</>}
        </div>
        <div className="fpl-state-val">{anchor.stamp}</div>
        <div className="fpl-state-sub">
          {isLive
            ? '22 active rooms · 8,420 plants · 40th St facility'
            : <>{anchor.sub} · <button className="fpl-return-live" onClick={onReturnLive}>↩ return to live</button></>}
        </div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">TEMP</div>
        <div className="fpl-state-val">74.2<span className="unit">°F</span></div>
        <div className="fpl-state-sub">target 72–76</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">RH · FACILITY AVG</div>
        <div className={`fpl-state-val ${anchor.facilityRHWarn ? 'warn' : ''}`}>
          {anchor.facilityRH.toFixed(1)}<span className="unit">%</span>
        </div>
        <div className="fpl-state-sub"
             style={{ color: anchor.facilityRHWarn ? 'var(--status-warn)' : 'var(--op-ink-3)' }}>
          {anchor.facilityRHWarn
            ? (anchor.id === 'cyc-1' ? 'FLW-04 over · cycle Q1' : 'FLW-02 over')
            : 'within range'}
        </div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">VPD</div>
        <div className="fpl-state-val">1.18<span className="unit">kPa</span></div>
        <div className="fpl-state-sub">target 1.10–1.30</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">CO₂</div>
        <div className="fpl-state-val">1,042<span className="unit">ppm</span></div>
        <div className="fpl-state-sub">target 950–1,100</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">YIELD/SQFT · 30D</div>
        <div className="fpl-state-val">62.3<span className="unit">g</span></div>
        <div className="fpl-state-sub" style={{ color: 'var(--status-ok)' }}>+1.9 vs Q4</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">OPEN ATTENTION</div>
        <div className="fpl-alerts-stack">
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--status-bad)' }} /><strong>1</strong> urgent · FLW-02</div>
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--status-warn)' }} /><strong>4</strong> attention · FLW-01, FLW-04, FLW-09, VEG-02</div>
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--accent)' }} /><strong>1</strong> from the Seed</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom timeline ────────────────────────────────────────────── */

const FPL_TL = [
  { num: 4,  name: 'Mon', past: true },
  { num: 5,  name: 'Tue', past: true,  pill: { kind: 'harvest', room: 'FLW-06', strain: 'Blue Dream' } },
  { num: 6,  name: 'Wed', today: true, pill: { kind: 'harvest', room: 'FLW-09', strain: 'Wedding Cake' } },
  { num: 7,  name: 'Thu' },
  { num: 8,  name: 'Fri', pill: { kind: 'harvest', room: 'FLW-10', strain: 'Sundae Driver' } },
  { num: 9,  name: 'Sat', weekend: true },
  { num: 10, name: 'Sun', weekend: true, pill: { kind: 'dry', room: 'DRY-01', strain: 'transfer' } },
  { num: 11, name: 'Mon' },
  { num: 12, name: 'Tue', pill: { kind: 'cure', room: 'CURE', strain: 'transfer' } },
  { num: 13, name: 'Wed', pill: { kind: 'package', room: 'LAB', strain: 'Mac1 QA' } },
  { num: 14, name: 'Thu' },
  { num: 15, name: 'Fri', pill: { kind: 'harvest', room: 'FLW-01', strain: 'Gelato 33' } },
  { num: 16, name: 'Sat', weekend: true },
  { num: 17, name: 'Sun', weekend: true },
];

function BottomTimeline() {
  return (
    <div className="fpl-timeline">
      <div className="fpl-timeline-cap">
        <div className="fpl-timeline-eyebrow">14 DAYS · POST-HARVEST PIPELINE</div>
        <div className="fpl-timeline-h">Harvest queue<em>3 due · 1 dry · 1 cure · 1 pkg</em></div>
      </div>
      <div className="fpl-timeline-strip">
        {FPL_TL.map(d => (
          <div key={d.num} className={`fpl-tl-day ${d.today ? 'is-today' : ''} ${d.weekend ? 'is-weekend' : ''}`}>
            <div className="fpl-tl-num">{d.num}</div>
            <div className="fpl-tl-name">{d.name}</div>
            {d.pill && (
              <div className={`fpl-tl-pill ${d.pill.kind}`}>
                <div className="fpl-tl-pill-room">{d.pill.room}</div>
                <div className="fpl-tl-pill-strain">{d.pill.strain}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Compose ────────────────────────────────────────────────────── */

function CooDeskFloorPlan() {
  const [anchorIdx, setAnchorIdx] = React.useState(0); // 0 = NOW (live)
  const anchor = TIME_ANCHORS[anchorIdx];
  const isLive = anchor.isLive;
  return (
    <div className={`fpl artb ${isLive ? '' : 'is-scrubbed'}`}>
      {/* nav reused from coo-desk */}
      <div className="coo-nav">
        <div className="coo-nav-l">
          <span className="coo-nav-word">CULTIVO</span>
          <div className="coo-nav-sep" />
          <div className="coo-nav-tabs">
            <span className="coo-nav-tab is-active">Cultivation</span>
            <span className="coo-nav-tab">Distribution</span>
            <span className="coo-nav-tab">Compliance</span>
            <span className="coo-nav-tab">Finance</span>
            <span className="coo-nav-tab">People</span>
          </div>
        </div>
        <div className="coo-nav-r">
          <span>40th St Facility · Phase I + II</span>
          <span className="role">D.Reyes — Head Grower</span>
          <span className="build">v2.4.7 · synced 0:14</span>
        </div>
      </div>
      <div className="coo-subnav">
        <span className="coo-subtab is-active">Floor<span className="count">·live</span></span>
        <span className="coo-subtab">Rooms<span className="count">22</span></span>
        <span className="coo-subtab">Plants<span className="count">8,420</span></span>
        <span className="coo-subtab">Schedule</span>
        <span className="coo-subtab">Environment</span>
        <span className="coo-subtab">Harvest<span className="count">3 due</span></span>
        <span className="coo-subtab">Inputs</span>
        <span className="coo-subtab">Reports</span>
      </div>

      <FacilityStateStrip anchor={anchor} onReturnLive={() => setAnchorIdx(0)} />

      <div className="fpl-main">
        <div className="fpl-canvas">
          <div className="fpl-canvas-cap">
            <div>
              <div className="fpl-canvas-eyebrow">
                FACILITY · 40TH ST · PHASE I + II · 22 ROOMS
                {!isLive && <span className="fpl-canvas-replay">  —  replaying · {anchor.label}</span>}
              </div>
              <h1 className="fpl-canvas-h">
                {isLive ? 'Floor plan, live' : 'Floor plan, replayed'}
                <em>{isLive ? 'state at 10:42:18' : `state at ${anchor.stamp.split(' · ')[1] || anchor.stamp}`}</em>
              </h1>
              {anchor.headline && (
                <div className="fpl-canvas-headline">◇ {anchor.headline}</div>
              )}
            </div>
            <div className="fpl-canvas-legend">
              <span><span className="swatch" style={{ background: 'rgba(255,255,255,0.04)' }} />nominal</span>
              <span><span className="swatch" style={{ background: 'rgba(232,224,212,0.18)' }} />active</span>
              <span><span className="swatch" style={{ background: 'rgba(200,148,58,0.45)' }} />attention</span>
              <span><span className="swatch" style={{ background: 'rgba(197,106,106,0.65)' }} />urgent</span>
            </div>
          </div>
          <div className="fpl-svg-wrap">
            <FloorPlanSVG anchor={anchor} anchorIdx={anchorIdx} onScrub={setAnchorIdx} />
            <div className="fpl-compass">
              <span style={{ fontSize: 11, color: 'var(--op-ink-2)' }}>N</span>
              <svg width="18" height="22" viewBox="0 0 18 22">
                <path d="M9 0 L9 22 M9 0 L4 6 M9 0 L14 6"
                      stroke="rgba(245,244,241,0.32)" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <div className="fpl-scalebar">
              <div className="fpl-scalebar-line" />
              <span>50 FT</span>
            </div>
          </div>
        </div>

        <SideRail />
      </div>

      <BottomTimeline />
    </div>
  );
}

window.CooDeskFloorPlan = CooDeskFloorPlan;
