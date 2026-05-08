// Cultivation Command Center — built on Cultivo
// COO surface (1700×2160). Mirrors data model from CommandCenter.tsx,
// adds The Seed as a fourth alert tone + nav strip.

const { useState } = React;

/* ─── Inline SVG glyph for The Seed ─────────────────────────────── */
const SeedGlyph = ({ size = 14, color = '#E8E0D4' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.4">
    <ellipse cx="12" cy="12" rx="5.5" ry="9" transform="rotate(-30 12 12)" />
    <path d="M12 21 V18" />
    <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
  </svg>
);

const Spark = ({ d, color = 'rgba(232,224,212,0.5)' }) => (
  <svg viewBox="0 0 92 28" width="92" height="28" fill="none">
    <path d={d} stroke={color} strokeWidth="1" />
  </svg>
);

/* ─── Data ────────────────────────────────────────────────────────── */
const ROOMS = {
  veg: [
    { code: 'VEG-01', strains: 'Gelato 33 · Wedding Cake', day: 18, of: 21, cap: 0.92, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
    { code: 'VEG-02', strains: 'Sundae Driver',             day: 12, of: 21, cap: 0.88, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
    { code: 'VEG-03', strains: 'Blue Dream · GG#4',         day: 5,  of: 21, cap: 0.74, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
  ],
  flower: [
    { code: 'FLR-01', strains: 'Gelato 33',                 day: 49, of: 63, cap: 0.96, flag: 'attention', env: 'VPD 1.32 hi',                  envState: 'warn' },
    { code: 'FLR-02', strains: 'Wedding Cake',              day: 42, of: 63, cap: 0.94, flag: 'urgent',    env: 'RH 64.2%',                     envState: 'bad', focused: true },
    { code: 'FLR-03', strains: 'Sundae Driver',             day: 35, of: 63, cap: 0.91, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
    { code: 'FLR-04', strains: 'Zkittlez · Mac1',           day: 28, of: 63, cap: 0.95, flag: 'attention', env: 'CO₂ 1180',                     envState: 'warn' },
    { code: 'FLR-05', strains: 'Blue Dream',                day: 21, of: 63, cap: 0.89, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
    { code: 'FLR-06', strains: 'GG#4',                      day: 14, of: 63, cap: 0.83, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
    { code: 'FLR-07', strains: 'Gelato 33',                 day: 7,  of: 63, cap: 0.78, flag: 'ok',        env: 'all in band',                  envState: 'ok' },
  ],
  drycure: [
    { code: 'DRY-A',  strains: 'Wedding Cake (FLR-02 prev)', day: 9,  of: 14, cap: 0.62, flag: 'ok',  env: '60°F · 60% RH',  envState: 'ok' },
    { code: 'DRY-B',  strains: 'Zkittlez',                   day: 4,  of: 14, cap: 0.55, flag: 'ok',  env: '60°F · 60% RH',  envState: 'ok' },
    { code: 'CURE-1', strains: 'Mac1 · Sundae Driver',       day: 18, of: 21, cap: 0.71, flag: 'ok',  env: 'O₂ burped 6h',   envState: 'ok' },
  ],
};

const STAGE_META = {
  veg:     { name: 'VEGETATIVE', color: 'var(--stage-veg)',     totals: '3 rooms · 1,820 plants' },
  flower:  { name: 'FLOWERING',  color: 'var(--stage-flower)',  totals: '7 rooms · 4,260 plants' },
  drycure: { name: 'DRY · CURE', color: 'var(--stage-cure)',    totals: '3 rooms · 612 lbs wet' },
};

const ALERTS = [
  {
    id: 'a1', tone: 'urgent', origin: 'FLR-02', kind: 'environment', time: '14m ago',
    title: 'Humidity 64.2% — past upper bound for week 6',
    detail: 'Sustained 38 minutes. Bud-rot risk window opens at 65%. AC return temp climbing in tandem.',
    metric: { label: 'RH', val: '64.2%', target: 'target ≤ 58%' },
    primary: 'Open dehumid program', secondary: ['Page Diego', 'Snooze 15m'],
  },
  {
    id: 'seed', tone: 'seed', origin: 'THE SEED', kind: 'pattern noticed', time: 'just now',
    title: <>FLR-02 is following the same RH curve as <em>FLR-04 last cycle</em> — which finished 11% under yield.</>,
    detail: 'Same strain, same stage day, same lights-off window. The signature is hour-three of dark cycle, when the AC return lags. You corrected it last time on day 44.',
    seedMeta: { obs: '14d window', basis: '12 rooms', confidence: 'high' },
    primary: 'Pull last cycle\'s log', secondary: ['Mark useful', 'Later'],
  },
  {
    id: 'a2', tone: 'attention', origin: 'FLR-01', kind: 'environment', time: '1h ago',
    title: 'VPD trending high — 1.32 kPa, target 1.20',
    detail: 'Drift over 4 hours. Not yet stress-zone but climbing. Likely AC short-cycling on new schedule.',
    metric: { label: 'VPD', val: '1.32 kPa', target: 'target 1.20' },
    primary: 'Adjust HVAC', secondary: ['Watch for 30m'],
  },
  {
    id: 'a3', tone: 'attention', origin: 'FLR-04', kind: 'environment', time: '2h ago',
    title: 'CO₂ 1,180 ppm — 80 above ceiling',
    detail: 'Injector valve may be sticking. Reading consistent across both sensors.',
    metric: { label: 'CO₂', val: '1,180 ppm', target: 'ceiling 1,100' },
    primary: 'Throttle injector', secondary: ['Schedule inspection'],
  },
  {
    id: 'a4', tone: 'watch', origin: 'VEG-03', kind: 'irrigation', time: '4h ago',
    title: 'Runoff EC 2.1 — first signs of drift',
    detail: 'Nutrient solution recipe holding, but output reading climbing. Suggest testing reservoir tomorrow.',
    primary: 'Add to QA tomorrow', secondary: ['Dismiss'],
  },
];

const TODAY_TASKS = [
  { time: '06:00', title: 'Lights on — flower rooms FLR-01 through FLR-07',     room: 'all flower', who: 'system', done: true },
  { time: '06:30', title: 'AM walkthrough — visual scan, IPM check',             room: 'all',        who: 'D.Reyes', done: true },
  { time: '07:15', title: 'Defoliation — FLR-03 lower canopy',                   room: 'FLR-03',     who: 'M.Chen',  done: true },
  { time: '08:00', title: 'Reservoir mix — flower week 4 nutrient batch',        room: 'mix room',   who: 'A.Torres', done: true },
  { time: '09:30', title: 'Trellis adjust — FLR-06, raise top net',              room: 'FLR-06',     who: 'M.Chen',  done: false },
  { time: '10:00', title: 'Investigate FLR-02 RH spike — dehumid + AC return',  room: 'FLR-02',     who: 'D.Reyes', done: false, urgent: true },
  { time: '11:00', title: 'Transplant — VEG-01 to FLR-08 (12 plants)',           room: 'VEG-01',     who: 'A.Torres', done: false },
  { time: '13:00', title: 'Harvest — FLR-08 prep (clean room, racks, totes)',    room: 'FLR-08',     who: 'team',    done: false },
  { time: '14:30', title: 'Pheno-hunt notes — Gelato 33 selection round 2',      room: 'VEG-02',     who: 'D.Reyes', done: false },
];

const HQ_DAYS = [
  { num: 4,  name: 'Mon', past: true },
  { num: 5,  name: 'Tue', past: true,  pill: { kind: 'harvest',  room: 'FLR-08', strain: 'Gelato 33',   plants: 240 } },
  { num: 6,  name: 'Wed', today: true, pill: { kind: 'harvest',  room: 'FLR-09', strain: 'Wedding Cake', plants: 220 } },
  { num: 7,  name: 'Thu' },
  { num: 8,  name: 'Fri', pill: { kind: 'harvest', room: 'FLR-10', strain: 'GG#4',       plants: 260 } },
  { num: 9,  name: 'Sat', weekend: true },
  { num: 10, name: 'Sun', weekend: true, pill: { kind: 'dry', room: 'DRY-A', strain: 'transfer in', plants: 460 } },
  { num: 11, name: 'Mon' },
  { num: 12, name: 'Tue', pill: { kind: 'cure', room: 'CURE-1', strain: 'transfer in', plants: 480 } },
  { num: 13, name: 'Wed', pill: { kind: 'package', room: 'PKG', strain: 'Mac1 batch',  plants: 380 } },
  { num: 14, name: 'Thu' },
  { num: 15, name: 'Fri', pill: { kind: 'harvest', room: 'FLR-01', strain: 'Gelato 33', plants: 280 } },
  { num: 16, name: 'Sat', weekend: true },
  { num: 17, name: 'Sun', weekend: true },
];

const STAFF = [
  { init: 'DR', name: 'Diego Reyes',  role: 'Head Grower',  active: true,  loc: 'FLR-02' },
  { init: 'MC', name: 'Maria Chen',   role: 'Cultivator',   active: true,  loc: 'FLR-06' },
  { init: 'AT', name: 'Andre Torres', role: 'Cultivator',   active: true,  loc: 'mix' },
  { init: 'JK', name: 'Jamal Kerr',   role: 'IPM Lead',     active: true,  loc: 'VEG-03' },
  { init: 'SP', name: 'Sara Park',    role: 'Trim Lead',    active: false, loc: 'off shift' },
  { init: 'RM', name: 'Rosa Marín',   role: 'Cultivator',   active: false, loc: 'off shift' },
];

/* ─── Components ──────────────────────────────────────────────────── */

function CooNav() {
  return (
    <>
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
        <span className="coo-subtab is-active">Command<span className="count">·now</span></span>
        <span className="coo-subtab">Rooms<span className="count">13</span></span>
        <span className="coo-subtab">Plants<span className="count">6,692</span></span>
        <span className="coo-subtab">Schedule<span className="count">7d</span></span>
        <span className="coo-subtab">Environment</span>
        <span className="coo-subtab">Harvest<span className="count">3 due</span></span>
        <span className="coo-subtab">Inputs</span>
        <span className="coo-subtab">Reports</span>
      </div>
    </>
  );
}

function CooHeader() {
  return (
    <div className="coo-head">
      <div className="coo-head-cell">
        <div className="coo-head-eyebrow"><span className="coo-live-dot" />LIVE · WED MAR 6</div>
        <div className="coo-head-date">10:42:18 PT</div>
        <div className="coo-head-date-sub">Day 67 of cycle 24-Q1 · 13 active rooms</div>
      </div>
      <div className="coo-head-cell">
        <div className="coo-head-eyebrow">FACILITY ENVIRONMENT — ROLLING AVG · 5 MIN</div>
        <div className="coo-env-row">
          <div className="coo-env-cell">
            <div className="coo-env-label">Temp</div>
            <div className="coo-env-val">74.2<span className="unit">°F</span></div>
            <div className="coo-env-target ok">target 72–76</div>
          </div>
          <div className="coo-env-cell">
            <div className="coo-env-label">RH</div>
            <div className="coo-env-val">58.4<span className="unit">%</span></div>
            <div className="coo-env-target warn">FLR-02 over</div>
          </div>
          <div className="coo-env-cell">
            <div className="coo-env-label">VPD</div>
            <div className="coo-env-val">1.18<span className="unit">kPa</span></div>
            <div className="coo-env-target ok">target 1.10–1.30</div>
          </div>
          <div className="coo-env-cell">
            <div className="coo-env-label">CO₂</div>
            <div className="coo-env-val">1,042<span className="unit">ppm</span></div>
            <div className="coo-env-target ok">target 950–1,100</div>
          </div>
          <div className="coo-env-cell">
            <div className="coo-env-label">PPFD</div>
            <div className="coo-env-val">912<span className="unit">μmol</span></div>
            <div className="coo-env-target ok">target 900–950</div>
          </div>
        </div>
      </div>
      <div className="coo-head-cell">
        <div className="coo-alerts-summary">
          <div className="coo-alerts-tot">
            <small>OPEN ALERTS</small>
            5
          </div>
          <div className="coo-alerts-pills">
            <div className="coo-alerts-pill"><span className="dot urgent" /><strong>1</strong> urgent</div>
            <div className="coo-alerts-pill"><span className="dot attention" /><strong>2</strong> attention</div>
            <div className="coo-alerts-pill"><span className="dot watch" /><strong>1</strong> watch</div>
            <div className="coo-alerts-pill"><span className="dot seed" /><strong>1</strong> from the Seed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeedStrip() {
  return (
    <div className="coo-seed-strip">
      <div className="coo-seed-mark"><SeedGlyph size={14} /></div>
      <div className="coo-seed-label">The Seed · pattern noticed</div>
      <div className="coo-seed-says">
        <em>FLR-02</em> is tracing the same RH curve as <em>FLR-04 last cycle</em> — which finished 11% under yield.
      </div>
      <div className="coo-seed-actions">
        <span className="primary">Pull last cycle</span>
        <span>Mark useful</span>
        <span>Later</span>
      </div>
    </div>
  );
}

function KpiStrip() {
  return (
    <div className="coo-kpi-strip">
      <div className="coo-kpi">
        <div className="coo-kpi-label">PLANTS UNDER CULTIVATION</div>
        <div className="coo-kpi-row">
          <div className="coo-kpi-val">6,692</div>
          <div className="coo-kpi-delta up">+128 wk</div>
        </div>
        <div className="coo-kpi-context">across 13 active rooms · canopy 38,400 sqft</div>
        <Spark d="M0,18 L13,16 L26,14 L39,15 L52,11 L65,9 L78,7 L92,5" />
      </div>
      <div className="coo-kpi">
        <div className="coo-kpi-label">PROJECTED HARVEST · 90D</div>
        <div className="coo-kpi-row">
          <div className="coo-kpi-val">2,840<span className="coo-kpi-unit">lbs</span></div>
          <div className="coo-kpi-delta up">+4.2% vs plan</div>
        </div>
        <div className="coo-kpi-context">11 batches scheduled · next FLR-08 (Tue)</div>
        <Spark d="M0,20 L13,17 L26,18 L39,12 L52,11 L65,9 L78,8 L92,6" />
      </div>
      <div className="coo-kpi">
        <div className="coo-kpi-label">YIELD PER SQFT · 30D AVG</div>
        <div className="coo-kpi-row">
          <div className="coo-kpi-val">62.3<span className="coo-kpi-unit">g</span></div>
          <div className="coo-kpi-delta up">+1.9 vs Q4</div>
        </div>
        <div className="coo-kpi-context">flower rooms only · target 60.0</div>
        <Spark d="M0,16 L13,18 L26,15 L39,17 L52,14 L65,12 L78,10 L92,9" />
      </div>
      <div className="coo-kpi">
        <div className="coo-kpi-label">COST PER GRAM · LIVE</div>
        <div className="coo-kpi-row">
          <div className="coo-kpi-val">$0.84</div>
          <div className="coo-kpi-delta down">−$0.03 wk</div>
        </div>
        <div className="coo-kpi-context">labor 0.31 · power 0.26 · nutrients 0.14</div>
        <Spark d="M0,8 L13,9 L26,11 L39,10 L52,12 L65,14 L78,15 L92,17" color="rgba(110,170,141,0.5)" />
      </div>
    </div>
  );
}

function RoomRow({ r }) {
  return (
    <div className={`coo-room ${r.focused ? 'is-focused' : ''}`}>
      <div className="coo-room-code">{r.code}</div>
      <div className="coo-room-strains">{r.strains}</div>
      <div className="coo-room-day">D<strong>{r.day}</strong>/{r.of}</div>
      <div className="coo-room-cap">
        <div className="coo-room-cap-bar"><div className={`coo-room-cap-fill ${r.cap > 0.9 ? 'full' : r.cap > 0.7 ? '' : 'low'}`} style={{ width: `${r.cap*100}%` }} /></div>
        <div className="coo-room-cap-text">{Math.round(r.cap*100)}% capacity</div>
      </div>
      <div className="coo-room-env">
        <span className={r.envState}>{r.env}</span>
      </div>
      <div className={`coo-room-flag ${r.flag}`}>
        {r.flag === 'urgent' ? '● urgent' : r.flag === 'attention' ? '○ attention' : 'nominal'}
      </div>
    </div>
  );
}

function StageGroup({ stage, rooms }) {
  const meta = STAGE_META[stage];
  return (
    <div className="coo-stage-group">
      <div className="coo-stage-row">
        <div className="coo-stage-name">
          <span className="coo-stage-dot" style={{ background: meta.color }} />
          {meta.name}
          <span className="meta">/ {rooms.length} rooms</span>
        </div>
        <div className="coo-stage-totals">{meta.totals}</div>
      </div>
      {rooms.map(r => <RoomRow key={r.code} r={r} />)}
    </div>
  );
}

function RoomsBoard() {
  return (
    <div className="coo-col-rooms">
      <div className="coo-panel-head">
        <div className="coo-panel-title">
          ROOM BOARD
          <span className="count">13 rooms · 6,692 plants · all stages</span>
        </div>
        <div className="coo-panel-actions">
          <span className="is-on">By stage</span>
          <span>By alert</span>
          <span>By strain</span>
          <span>Floor map ↗</span>
        </div>
      </div>
      <StageGroup stage="veg" rooms={ROOMS.veg} />
      <StageGroup stage="flower" rooms={ROOMS.flower} />
      <StageGroup stage="drycure" rooms={ROOMS.drycure} />
    </div>
  );
}

function Alert({ a }) {
  return (
    <div className={`coo-alert ${a.tone}`}>
      <div className="coo-alert-bar" />
      <div className="coo-alert-head">
        <span className="origin">{a.origin}</span>
        <span className="kind">/ {a.kind}</span>
        <span className="tone">— {a.tone === 'seed' ? 'observation' : a.tone}</span>
      </div>
      <div className="coo-alert-time">{a.time}</div>
      <div className="coo-alert-title">{a.title}</div>
      <div className="coo-alert-detail">{a.detail}</div>
      {a.metric && (
        <div className="coo-alert-metric">
          <span className="m-label">{a.metric.label}</span>
          <span className="m-val">{a.metric.val}</span>
          <span className="m-target">{a.metric.target}</span>
        </div>
      )}
      {a.seedMeta && (
        <div className="coo-seed-meta">
          <span>obs · <strong>{a.seedMeta.obs}</strong></span>
          <span>basis · <strong>{a.seedMeta.basis}</strong></span>
          <span>confidence · <strong>{a.seedMeta.confidence}</strong></span>
        </div>
      )}
      <div className="coo-alert-actions">
        <button className="coo-alert-btn primary">{a.primary}</button>
        {a.secondary?.map(s => <button key={s} className="coo-alert-btn">{s}</button>)}
      </div>
    </div>
  );
}

function AlertsPanel() {
  return (
    <div className="coo-col-alerts">
      <div className="coo-panel-head">
        <div className="coo-panel-title">
          ATTENTION
          <span className="count">5 open · sorted by priority</span>
        </div>
        <div className="coo-panel-actions">
          <span className="is-on">All</span>
          <span>Mine</span>
          <span>Snoozed (3)</span>
        </div>
      </div>
      {ALERTS.map(a => <Alert key={a.id} a={a} />)}
      <div className="coo-panel-foot">
        <span>3 snoozed · 12 closed today</span>
        <span>history ↗</span>
      </div>
    </div>
  );
}

function EnvCard({ name, room, dot, charts, meta }) {
  return (
    <div className="coo-env-card">
      <div className="coo-env-card-head">
        <div className="coo-env-card-name">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
          {name} · {room}
        </div>
        <div className="coo-env-card-meta">{meta}</div>
      </div>
      <div className="coo-env-card-grid">
        {charts.map((c, i) => (
          <div key={i} className="coo-env-chart">
            <div className="coo-env-chart-label">
              <span>{c.label}</span>
              <span className="now">{c.now}</span>
            </div>
            <svg viewBox="0 0 200 56" width="100%" height="56">
              <line x1="0" y1={56-(c.targetMax-c.min)/(c.max-c.min)*56} x2="200" y2={56-(c.targetMax-c.min)/(c.max-c.min)*56} stroke="rgba(232,224,212,0.18)" strokeDasharray="2 3" />
              <line x1="0" y1={56-(c.targetMin-c.min)/(c.max-c.min)*56} x2="200" y2={56-(c.targetMin-c.min)/(c.max-c.min)*56} stroke="rgba(232,224,212,0.18)" strokeDasharray="2 3" />
              <path d={c.path} stroke={c.color} strokeWidth="1.4" fill="none" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvRail() {
  return (
    <div className="coo-env-rail">
      <EnvCard
        name="FLR-02 · WEDDING CAKE" room="day 42 · flower week 6" dot="var(--status-bad)"
        meta="last 4 hours · 1m resolution"
        charts={[
          { label: 'RH', now: '64.2%',  min: 50, max: 70, targetMin: 52, targetMax: 58, color: 'var(--status-bad)',
            path: 'M0,30 L20,28 L40,26 L60,24 L80,20 L100,16 L120,12 L140,10 L160,8 L180,6 L200,4' },
          { label: 'TEMP', now: '76.4°F', min: 70, max: 82, targetMin: 72, targetMax: 76, color: 'var(--accent)',
            path: 'M0,28 L20,26 L40,28 L60,30 L80,32 L100,34 L120,32 L140,30 L160,28 L180,26 L200,24' },
          { label: 'VPD', now: '1.05 kPa', min: 0.8, max: 1.6, targetMin: 1.10, targetMax: 1.30, color: 'var(--accent)',
            path: 'M0,20 L20,22 L40,24 L60,28 L80,32 L100,36 L120,38 L140,40 L160,42 L180,42 L200,42' },
          { label: 'CO₂', now: '1,050', min: 800, max: 1200, targetMin: 950, targetMax: 1100, color: 'var(--accent)',
            path: 'M0,30 L20,28 L40,26 L60,24 L80,22 L100,24 L120,26 L140,24 L160,22 L180,20 L200,22' },
        ]}
      />
      <EnvCard
        name="FLR-01 · GELATO 33" room="day 49 · flower week 7" dot="var(--status-warn)"
        meta="last 4 hours · 1m resolution"
        charts={[
          { label: 'VPD', now: '1.32 kPa', min: 0.8, max: 1.6, targetMin: 1.10, targetMax: 1.30, color: 'var(--status-warn)',
            path: 'M0,32 L20,30 L40,26 L60,22 L80,18 L100,16 L120,14 L140,12 L160,10 L180,9 L200,8' },
          { label: 'TEMP', now: '74.8°F', min: 70, max: 82, targetMin: 72, targetMax: 76, color: 'var(--accent)',
            path: 'M0,30 L20,28 L40,26 L60,24 L80,26 L100,28 L120,30 L140,28 L160,26 L180,24 L200,26' },
          { label: 'RH', now: '54.1%',  min: 50, max: 65, targetMin: 50, targetMax: 56, color: 'var(--accent)',
            path: 'M0,30 L20,32 L40,34 L60,32 L80,30 L100,28 L120,30 L140,32 L160,30 L180,28 L200,30' },
          { label: 'CO₂', now: '1,020', min: 800, max: 1200, targetMin: 950, targetMax: 1100, color: 'var(--accent)',
            path: 'M0,28 L20,30 L40,28 L60,26 L80,28 L100,30 L120,28 L140,26 L160,28 L180,30 L200,28' },
        ]}
      />
      <EnvCard
        name="VEG-03 · BLUE DREAM · GG#4" room="day 5 · veg week 1" dot="var(--stage-veg)"
        meta="last 4 hours · 1m resolution"
        charts={[
          { label: 'EC RUNOFF', now: '2.10', min: 1.4, max: 2.4, targetMin: 1.6, targetMax: 2.0, color: 'var(--status-warn)',
            path: 'M0,40 L20,38 L40,34 L60,30 L80,26 L100,22 L120,18 L140,14 L160,12 L180,10 L200,9' },
          { label: 'TEMP', now: '76.0°F', min: 70, max: 82, targetMin: 75, targetMax: 78, color: 'var(--accent)',
            path: 'M0,28 L20,28 L40,28 L60,30 L80,32 L100,30 L120,28 L140,30 L160,32 L180,30 L200,28' },
          { label: 'RH', now: '62.0%',  min: 55, max: 70, targetMin: 60, targetMax: 65, color: 'var(--accent)',
            path: 'M0,30 L20,28 L40,30 L60,32 L80,30 L100,28 L120,30 L140,32 L160,28 L180,30 L200,30' },
          { label: 'PPFD', now: '420', min: 300, max: 600, targetMin: 400, targetMax: 500, color: 'var(--accent)',
            path: 'M0,32 L20,30 L40,28 L60,30 L80,32 L100,28 L120,30 L140,32 L160,30 L180,28 L200,30' },
        ]}
      />
    </div>
  );
}

function TodayPanel() {
  return (
    <div>
      <div className="coo-panel-head">
        <div className="coo-panel-title">
          TODAY · OPS
          <span className="count">9 tasks · 4 complete</span>
        </div>
        <div className="coo-panel-actions">
          <span className="is-on">Now</span>
          <span>Mine</span>
          <span>Print SOP</span>
        </div>
      </div>
      {TODAY_TASKS.map((t, i) => (
        <div key={i} className={`coo-task ${t.done ? 'done' : ''}`}>
          <div className={`coo-task-check ${t.done ? 'done' : ''}`} />
          <div className="coo-task-time">{t.time}</div>
          <div className="coo-task-title" style={t.urgent ? { color: 'var(--status-bad)' } : null}>{t.title}</div>
          <div className="coo-task-room">{t.room}</div>
          <div className="coo-task-who">{t.who}</div>
        </div>
      ))}
    </div>
  );
}

function HarvestQueue() {
  return (
    <div className="coo-hq">
      <div className="coo-panel-title" style={{ marginBottom: 4 }}>
        HARVEST QUEUE · 14 DAYS
        <span className="count" style={{ marginLeft: 10 }}>3 due · 1 dry · 1 cure · 1 package</span>
      </div>
      <div className="coo-hq-strip">
        {HQ_DAYS.map(d => (
          <div key={d.num} className={`coo-hq-day ${d.today ? 'is-today' : ''} ${d.weekend ? 'is-weekend' : ''}`}>
            <div className="coo-hq-day-head">
              <div className="coo-hq-day-num">{d.num}</div>
              <div className="coo-hq-day-name">{d.name}</div>
            </div>
            {d.pill && (
              <div className={`coo-hq-pill ${d.pill.kind}`}>
                <div className="coo-hq-pill-room">{d.pill.room}</div>
                <div className="coo-hq-pill-strain">{d.pill.strain}</div>
                <div className="coo-hq-pill-plants">{d.pill.plants} pl</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffStrip() {
  return (
    <div className="coo-staff">
      {STAFF.map(s => (
        <div key={s.init} className={`coo-staff-cell ${s.active ? '' : 'inactive'}`}>
          <div className="coo-staff-init">{s.init}</div>
          <div className="coo-staff-info">
            <div className="coo-staff-name">{s.name}</div>
            <div className="coo-staff-role">{s.role} · {s.loc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CooDesk() {
  return (
    <div className="artb">
      <CooNav />
      <CooHeader />
      <SeedStrip />
      <KpiStrip />
      <div className="coo-main">
        <RoomsBoard />
        <AlertsPanel />
      </div>
      <EnvRail />
      <div className="coo-ops-grid">
        <TodayPanel />
        <HarvestQueue />
      </div>
      <StaffStrip />
    </div>
  );
}

window.CooDesk = CooDesk;
window.SeedGlyph = SeedGlyph;
