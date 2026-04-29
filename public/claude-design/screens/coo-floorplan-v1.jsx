// Floor Plan, Live — variation C
// 1700×1200. Plan + side rail + bottom timeline.

const SeedGlyphFPL = window.SeedGlyph;

/* ─── Facility model — 47,200 sqft Northbay ────────────────────── */
/* SVG coords: 1140 wide × 540 tall (frame + interior) */

const FACILITY = {
  building: { x: 20, y: 20, w: 1100, h: 500 },
  corridor: { x: 40, y: 250, w: 1060, h: 40 }, // central corridor
  loadingDock: { x: 1080, y: 470, w: 40, h: 50 },
  rooms: [
    // West end — support
    { id: 'mech',  label: 'MECH',  kind: 'support', x: 40,  y: 40,  w: 110, h: 90,  state: 'nominal' },
    { id: 'water', label: 'H₂O · RO', kind: 'support', x: 40, y: 130, w: 110, h: 110, state: 'nominal' },
    { id: 'mix',   label: 'MIX',   kind: 'support', x: 40,  y: 290, w: 110, h: 100, state: 'active' },
    { id: 'office',label: 'OFFICE',kind: 'support', x: 40,  y: 390, w: 110, h: 110, state: 'nominal' },

    // Propagation pipeline (top of building, west to east)
    { id: 'mother', code: 'MOM',     label: 'MOTHER',  strain: 'genetic library · 18',     kind: 'mother', x: 160, y: 40, w: 130, h: 200, day: '—', state: 'active' },
    { id: 'clone',  code: 'CLN',     label: 'CLONE',   strain: '482 cuttings · 5 strains',  kind: 'clone',  x: 300, y: 40, w: 130, h: 200, day: 'D9',  state: 'active' },
    { id: 'veg-1',  code: 'VEG-01',  label: 'VEG-01',  strain: 'Gelato 33 · Wedding Cake',  kind: 'veg',    x: 440, y: 40, w: 130, h: 200, day: 'D18', state: 'active' },
    { id: 'veg-2',  code: 'VEG-02',  label: 'VEG-02',  strain: 'Sundae Driver',             kind: 'veg',    x: 580, y: 40, w: 130, h: 200, day: 'D12', state: 'active' },
    { id: 'veg-3',  code: 'VEG-03',  label: 'VEG-03',  strain: 'Blue Dream · GG#4',         kind: 'veg',    x: 720, y: 40, w: 130, h: 200, day: 'D5',  state: 'attention', flag: 'EC drift' },

    // Post-harvest pipeline (top, east end)
    { id: 'dry-A',  code: 'DRY-A',  label: 'DRY-A',   strain: 'Wedding Cake (FLR-02 prev)', kind: 'dry',    x: 860, y: 40, w: 110, h: 95, day: 'D9',  state: 'active' },
    { id: 'dry-B',  code: 'DRY-B',  label: 'DRY-B',   strain: 'Zkittlez',                   kind: 'dry',    x: 980, y: 40, w: 110, h: 95, day: 'D4',  state: 'active' },
    { id: 'cure-1', code: 'CURE-1', label: 'CURE-1',  strain: 'Mac1 · Sundae Driver',       kind: 'cure',   x: 860, y: 145, w: 230, h: 95, day: 'D18', state: 'active' },

    // Flower production — south wing, two rows
    // Top row of flower (north side of south corridor)
    { id: 'flr-1', code: 'FLR-01', label: 'FLR-01', strain: 'Gelato 33',                    kind: 'flower', x: 160, y: 300, w: 180, h: 100, day: 'D49', state: 'attention', flag: 'VPD 1.32 hi' },
    { id: 'flr-2', code: 'FLR-02', label: 'FLR-02', strain: 'Wedding Cake',                 kind: 'flower', x: 350, y: 300, w: 180, h: 100, day: 'D42', state: 'urgent',    flag: 'RH 64.2%', focused: true },
    { id: 'flr-3', code: 'FLR-03', label: 'FLR-03', strain: 'Sundae Driver',                kind: 'flower', x: 540, y: 300, w: 180, h: 100, day: 'D35', state: 'active' },
    { id: 'flr-4', code: 'FLR-04', label: 'FLR-04', strain: 'Zkittlez · Mac1',              kind: 'flower', x: 730, y: 300, w: 180, h: 100, day: 'D28', state: 'attention', flag: 'CO₂ 1180' },

    // Bottom row of flower (south side)
    { id: 'flr-5', code: 'FLR-05', label: 'FLR-05', strain: 'Blue Dream',                   kind: 'flower', x: 160, y: 405, w: 180, h: 95, day: 'D21', state: 'active' },
    { id: 'flr-6', code: 'FLR-06', label: 'FLR-06', strain: 'GG#4',                         kind: 'flower', x: 350, y: 405, w: 180, h: 95, day: 'D14', state: 'active' },
    { id: 'flr-7', code: 'FLR-07', label: 'FLR-07', strain: 'Gelato 33',                    kind: 'flower', x: 540, y: 405, w: 180, h: 95, day: 'D7',  state: 'active' },
    { id: 'flr-8', code: 'FLR-08', label: 'FLR-08', strain: '— · prepping for Tue harvest', kind: 'flower', x: 730, y: 405, w: 180, h: 95, day: 'prep', state: 'active' },

    // Trim · Package · Cold (east end, bottom)
    { id: 'trim',  label: 'TRIM',    kind: 'support', x: 920, y: 300, w: 90, h: 100, state: 'active' },
    { id: 'pkg',   label: 'PKG',     kind: 'support', x: 1015, y: 300, w: 80, h: 100, state: 'active' },
    { id: 'cold',  label: 'COLD',    kind: 'support', x: 920, y: 405, w: 175, h: 60,  state: 'nominal' },
  ],
};

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

/* ─── Floor plan SVG ─────────────────────────────────────────────── */

function FloorPlanSVG() {
  const W = 1140, H = 540;
  const focused = FACILITY.rooms.find(r => r.focused);
  const pattern = FACILITY.rooms.find(r => r.code === 'FLR-04'); // The Seed pattern partner

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
            fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {/* Loading dock */}
      <rect x={FACILITY.loadingDock.x} y={FACILITY.loadingDock.y}
            width={FACILITY.loadingDock.w} height={FACILITY.loadingDock.h}
            fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"
            strokeDasharray="3 3" />
      <text x={FACILITY.loadingDock.x + 20} y={FACILITY.loadingDock.y + 30}
            fontFamily="IBM Plex Mono" fontSize="7" letterSpacing="0.12em"
            fill="rgba(245,244,241,0.32)" textAnchor="middle">DOCK</text>

      {/* Glow halos for urgent/attention/focused — drawn first so they sit behind rooms */}
      {FACILITY.rooms.filter(r => r.state === 'urgent').map(r => (
        <ellipse key={`glow-${r.id}`}
          cx={r.x + r.w/2} cy={r.y + r.h/2}
          rx={r.w * 0.8} ry={r.h * 1.1}
          fill="url(#fpl-glow-bad)"
          style={{ animation: 'fpl-pulse-bad 2s ease-in-out infinite' }} />
      ))}
      {FACILITY.rooms.filter(r => r.state === 'attention').map(r => (
        <ellipse key={`glow-${r.id}`}
          cx={r.x + r.w/2} cy={r.y + r.h/2}
          rx={r.w * 0.7} ry={r.h * 0.9}
          fill="url(#fpl-glow-warn)"
          style={{ animation: 'fpl-pulse-warn 3s ease-in-out infinite' }} />
      ))}

      {/* The Seed — pattern connection ghost overlay */}
      {focused && pattern && (
        <g opacity="0.7">
          <line
            x1={focused.x + focused.w/2} y1={focused.y}
            x2={pattern.x + pattern.w/2} y2={pattern.y}
            stroke="rgba(232,224,212,0.40)" strokeWidth="1"
            strokeDasharray="3 3" />
          <circle cx={focused.x + focused.w/2} cy={focused.y} r="3"
                  fill="rgba(232,224,212,0.7)" />
          <circle cx={pattern.x + pattern.w/2} cy={pattern.y} r="3"
                  fill="rgba(232,224,212,0.7)" />
          <text x={(focused.x + pattern.x + focused.w + pattern.w)/4} y={focused.y - 8}
                fontFamily="IBM Plex Mono" fontSize="8" letterSpacing="0.18em"
                fill="rgba(232,224,212,0.6)" textAnchor="middle"
                style={{ textTransform: 'uppercase' }}>
            ⊙ THE SEED · PATTERN
          </text>
        </g>
      )}

      {/* Rooms */}
      {FACILITY.rooms.map(r => {
        const s = STATE_FILL[r.state];
        const isFocus = r.focused;
        return (
          <g key={r.id}>
            {/* Focused tight halo */}
            {isFocus && (
              <ellipse cx={r.x + r.w/2} cy={r.y + r.h/2}
                rx={r.w * 0.65} ry={r.h * 0.95}
                fill="url(#fpl-glow-focus)" />
            )}
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={s.fill} stroke={s.stroke} strokeWidth={isFocus ? 1.5 : 0.8} />
            {/* Stage marker dot top-left of named rooms */}
            {r.code && r.kind !== 'support' && (
              <circle cx={r.x + 8} cy={r.y + 8} r="2.5" fill={KIND_DOT[r.kind]} />
            )}
            {/* Code (mono) */}
            {r.code ? (
              <>
                <text x={r.x + 16} y={r.y + 12}
                      fontFamily="IBM Plex Mono" fontSize="9"
                      letterSpacing="0.06em" fill={s.text}
                      style={{ fontWeight: 500 }}>
                  {r.label}
                </text>
                {r.strain && (
                  <text x={r.x + 8} y={r.y + 26}
                        fontFamily="IBM Plex Sans" fontSize="9"
                        fill={s.text} opacity="0.7">
                    {r.strain.length > 28 ? r.strain.slice(0, 26) + '…' : r.strain}
                  </text>
                )}
                {r.day && r.day !== '—' && (
                  <text x={r.x + r.w - 8} y={r.y + 12}
                        fontFamily="IBM Plex Mono" fontSize="9"
                        letterSpacing="0.04em" fill={s.text}
                        textAnchor="end" style={{ fontWeight: 500 }}>
                    {r.day}
                  </text>
                )}
                {r.flag && (
                  <text x={r.x + 8} y={r.y + r.h - 10}
                        fontFamily="IBM Plex Mono" fontSize="8"
                        letterSpacing="0.10em" fill={s.text}
                        style={{ textTransform: 'uppercase' }}>
                    {r.flag}
                  </text>
                )}
              </>
            ) : (
              <text x={r.x + r.w/2} y={r.y + r.h/2 + 3}
                    fontFamily="IBM Plex Mono" fontSize="9"
                    letterSpacing="0.14em" fill={s.text}
                    textAnchor="middle"
                    style={{ textTransform: 'uppercase' }}>
                {r.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Central corridor — drawn as floor markers, not a room */}
      <text x={FACILITY.building.x + FACILITY.building.w/2} y={270}
            fontFamily="IBM Plex Mono" fontSize="8"
            letterSpacing="0.20em" fill="rgba(245,244,241,0.20)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>
        — — — — — — — — — — — central corridor — — — — — — — — — — —
      </text>

      {/* Quadrant labels */}
      <text x={95} y={32} fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.18em" fill="rgba(245,244,241,0.28)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>SUPPORT</text>
      <text x={505} y={32} fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.18em" fill="rgba(245,244,241,0.28)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>PROPAGATION</text>
      <text x={975} y={32} fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.18em" fill="rgba(245,244,241,0.28)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>POST-HARVEST</text>
      <text x={535} y={510} fontFamily="IBM Plex Mono" fontSize="7"
            letterSpacing="0.18em" fill="rgba(245,244,241,0.28)"
            textAnchor="middle" style={{ textTransform: 'uppercase' }}>FLOWER PRODUCTION · 8 ROOMS · 32,400 SQFT CANOPY</text>
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
        <div className="fpl-rail-code">FLR-02 · FLOWER WK 6 · SOUTH WING</div>
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
          This room is tracing the <strong>same RH curve as FLR-04 last cycle</strong> — which finished 11% under yield.
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

function FacilityStateStrip() {
  return (
    <div className="fpl-state">
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow"><span className="fpl-state-pulse" />NORTHBAY · LIVE</div>
        <div className="fpl-state-val">Wed Mar 6 · 10:42 PT</div>
        <div className="fpl-state-sub">13 active rooms · 6,692 plants · 47,200 sqft</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">TEMP</div>
        <div className="fpl-state-val">74.2<span className="unit">°F</span></div>
        <div className="fpl-state-sub">target 72–76</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">RH · FACILITY AVG</div>
        <div className="fpl-state-val warn">58.4<span className="unit">%</span></div>
        <div className="fpl-state-sub" style={{ color: 'var(--status-warn)' }}>FLR-02 over</div>
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
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--status-bad)' }} /><strong>1</strong> urgent · FLR-02</div>
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--status-warn)' }} /><strong>2</strong> attention · FLR-01, FLR-04</div>
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--accent)' }} /><strong>1</strong> from the Seed</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom timeline ────────────────────────────────────────────── */

const FPL_TL = [
  { num: 4,  name: 'Mon', past: true },
  { num: 5,  name: 'Tue', past: true,  pill: { kind: 'harvest', room: 'FLR-08', strain: 'Gelato 33' } },
  { num: 6,  name: 'Wed', today: true, pill: { kind: 'harvest', room: 'FLR-09', strain: 'Wedding Cake' } },
  { num: 7,  name: 'Thu' },
  { num: 8,  name: 'Fri', pill: { kind: 'harvest', room: 'FLR-10', strain: 'GG#4' } },
  { num: 9,  name: 'Sat', weekend: true },
  { num: 10, name: 'Sun', weekend: true, pill: { kind: 'dry', room: 'DRY-A', strain: 'transfer' } },
  { num: 11, name: 'Mon' },
  { num: 12, name: 'Tue', pill: { kind: 'cure', room: 'CURE-1', strain: 'transfer' } },
  { num: 13, name: 'Wed', pill: { kind: 'package', room: 'PKG', strain: 'Mac1' } },
  { num: 14, name: 'Thu' },
  { num: 15, name: 'Fri', pill: { kind: 'harvest', room: 'FLR-01', strain: 'Gelato 33' } },
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
  return (
    <div className="fpl artb">
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
          <span>Northbay Facility · 47,200 sqft</span>
          <span className="role">D.Reyes — Head Grower</span>
          <span className="build">v2.4.7 · synced 0:14</span>
        </div>
      </div>
      <div className="coo-subnav">
        <span className="coo-subtab is-active">Floor<span className="count">·live</span></span>
        <span className="coo-subtab">Rooms<span className="count">13</span></span>
        <span className="coo-subtab">Plants<span className="count">6,692</span></span>
        <span className="coo-subtab">Schedule</span>
        <span className="coo-subtab">Environment</span>
        <span className="coo-subtab">Harvest<span className="count">3 due</span></span>
        <span className="coo-subtab">Inputs</span>
        <span className="coo-subtab">Reports</span>
      </div>

      <FacilityStateStrip />

      <div className="fpl-main">
        <div className="fpl-canvas">
          <div className="fpl-canvas-cap">
            <div>
              <div className="fpl-canvas-eyebrow">FACILITY · NORTHBAY · 47,200 SQFT</div>
              <h1 className="fpl-canvas-h">Floor plan, live<em>state at 10:42:18</em></h1>
            </div>
            <div className="fpl-canvas-legend">
              <span><span className="swatch" style={{ background: 'rgba(255,255,255,0.04)' }} />nominal</span>
              <span><span className="swatch" style={{ background: 'rgba(232,224,212,0.18)' }} />active</span>
              <span><span className="swatch" style={{ background: 'rgba(200,148,58,0.45)' }} />attention</span>
              <span><span className="swatch" style={{ background: 'rgba(197,106,106,0.65)' }} />urgent</span>
            </div>
          </div>
          <div className="fpl-svg-wrap">
            <FloorPlanSVG />
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
