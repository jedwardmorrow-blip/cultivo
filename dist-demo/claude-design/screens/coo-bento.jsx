// COO Desk — Variation 2 · Editorial bento
// Asymmetric 12-col grid. Hero cell on FLR-02. No card chrome.

const SeedGlyphV2 = window.SeedGlyph;

const BENTO_ROOMS = {
  veg: [
    { code: 'VEG-01', strain: 'Gelato 33 · Wedding Cake', day: 18, of: 21, env: 'in band',  envState: 'ok',   dot: 'var(--stage-veg)' },
    { code: 'VEG-02', strain: 'Sundae Driver',            day: 12, of: 21, env: 'in band',  envState: 'ok',   dot: 'var(--stage-veg)' },
    { code: 'VEG-03', strain: 'Blue Dream · GG#4',        day: 5,  of: 21, env: 'EC drift', envState: 'warn', dot: 'var(--stage-veg)' },
  ],
  flower: [
    { code: 'FLR-01', strain: 'Gelato 33',     day: 49, of: 63, env: 'VPD 1.32 hi',  envState: 'warn', dot: 'var(--stage-flower)' },
    { code: 'FLR-02', strain: 'Wedding Cake',  day: 42, of: 63, env: 'RH 64.2%',     envState: 'bad',  dot: 'var(--stage-flower)', focused: true },
    { code: 'FLR-03', strain: 'Sundae Driver', day: 35, of: 63, env: 'in band',      envState: 'ok',   dot: 'var(--stage-flower)' },
    { code: 'FLR-04', strain: 'Zkittlez · Mac1', day: 28, of: 63, env: 'CO₂ 1180',   envState: 'warn', dot: 'var(--stage-flower)' },
    { code: 'FLR-05', strain: 'Blue Dream',    day: 21, of: 63, env: 'in band',      envState: 'ok',   dot: 'var(--stage-flower)' },
    { code: 'FLR-06', strain: 'GG#4',          day: 14, of: 63, env: 'in band',      envState: 'ok',   dot: 'var(--stage-flower)' },
    { code: 'FLR-07', strain: 'Gelato 33',     day: 7,  of: 63, env: 'in band',      envState: 'ok',   dot: 'var(--stage-flower)' },
  ],
  drycure: [
    { code: 'DRY-A',  strain: 'Wedding Cake',         day: 9,  of: 14, env: '60°F · 60% RH', envState: 'ok', dot: 'var(--op-ink-3)' },
    { code: 'DRY-B',  strain: 'Zkittlez',             day: 4,  of: 14, env: '60°F · 60% RH', envState: 'ok', dot: 'var(--op-ink-3)' },
    { code: 'CURE-1', strain: 'Mac1 · Sundae Driver', day: 18, of: 21, env: 'O₂ burped 6h',  envState: 'ok', dot: 'var(--stage-cure)' },
  ],
};

const BENTO_ALERTS = [
  { id: 'a1', tone: 'urgent',    origin: 'FLR-01', kind: 'environment',  time: '1h',  title: 'VPD trending high — 1.32 kPa, target 1.20.' },
  { id: 'a2', tone: 'attention', origin: 'FLR-04', kind: 'environment',  time: '2h',  title: 'CO₂ 1,180 ppm — 80 above ceiling.' },
  { id: 'a3', tone: 'attention', origin: 'VEG-03', kind: 'irrigation',   time: '4h',  title: 'Runoff EC 2.1 — first signs of drift.' },
  { id: 'a4', tone: 'watch',     origin: 'FLR-08', kind: 'harvest prep', time: '6h',  title: 'Harvest Tue — clean room walkthrough overdue.' },
  { id: 'a5', tone: 'watch',     origin: 'DRY-B',  kind: 'environment',  time: '8h',  title: 'Temp delta 2.1°F across sensors — recalibrate.' },
];

const BENTO_HQ = [
  { num: 4,  name: 'Mon', past: true },
  { num: 5,  name: 'Tue', past: true,  pill: { kind: 'harvest', room: 'FLR-08', strain: 'Gelato 33',   plants: 240 } },
  { num: 6,  name: 'Wed', today: true, pill: { kind: 'harvest', room: 'FLR-09', strain: 'Wedding Cake', plants: 220 } },
  { num: 7,  name: 'Thu' },
  { num: 8,  name: 'Fri', pill: { kind: 'harvest', room: 'FLR-10', strain: 'GG#4',      plants: 260 } },
  { num: 9,  name: 'Sat', weekend: true },
  { num: 10, name: 'Sun', weekend: true, pill: { kind: 'dry',     room: 'DRY-A', strain: 'transfer in', plants: 460 } },
  { num: 11, name: 'Mon' },
  { num: 12, name: 'Tue', pill: { kind: 'cure',    room: 'CURE-1', strain: 'transfer in', plants: 480 } },
  { num: 13, name: 'Wed', pill: { kind: 'package', room: 'PKG',    strain: 'Mac1 batch',  plants: 380 } },
  { num: 14, name: 'Thu' },
  { num: 15, name: 'Fri', pill: { kind: 'harvest', room: 'FLR-01', strain: 'Gelato 33',   plants: 280 } },
  { num: 16, name: 'Sat', weekend: true },
  { num: 17, name: 'Sun', weekend: true },
];

const BENTO_TASKS = [
  { time: '06:30', title: 'AM walkthrough — visual scan, IPM check', who: 'D.Reyes', done: true },
  { time: '07:15', title: 'Defoliation — FLR-03 lower canopy',       who: 'M.Chen',  done: true },
  { time: '08:00', title: 'Reservoir mix — week 4 nutrient batch',   who: 'A.Torres', done: true },
  { time: '09:30', title: 'Trellis adjust — FLR-06, raise top net',  who: 'M.Chen',  done: false },
  { time: '10:00', title: 'Investigate FLR-02 RH spike',             who: 'D.Reyes', done: false, urgent: true },
  { time: '11:00', title: 'Transplant — VEG-01 to FLR-08',           who: 'A.Torres', done: false },
  { time: '13:00', title: 'Harvest prep — FLR-08 clean room',        who: 'team',    done: false },
];

const BENTO_STAFF = [
  { init: 'DR', name: 'Diego Reyes',  role: 'Head Grower · FLR-02', active: true },
  { init: 'MC', name: 'Maria Chen',   role: 'Cultivator · FLR-06',  active: true },
  { init: 'AT', name: 'Andre Torres', role: 'Cultivator · mix',     active: true },
  { init: 'JK', name: 'Jamal Kerr',   role: 'IPM Lead · VEG-03',    active: true },
];

function Spark2({ d, color = 'rgba(232,224,212,0.5)', w = 92, h = 24 }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none" className="bnt-kpi-spark">
      <path d={d} stroke={color} strokeWidth="1" />
    </svg>
  );
}

function EnvSpark({ d, color, target }) {
  return (
    <svg viewBox="0 0 200 32" preserveAspectRatio="none" width="100%" height="32" fill="none" className="bnt-env-spark">
      {target && <line x1="0" y1={target} x2="200" y2={target} stroke="rgba(232,224,212,0.16)" strokeDasharray="2 3" />}
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function CooNavBento() {
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

function HeroFocus() {
  return (
    <div className="bnt-cell bnt-hero">
      <div className="bnt-hero-eyebrow">
        <span className="pulse" />
        FOCUS · NEEDS YOU NOW · 14 MIN ELAPSED
      </div>
      <div className="bnt-hero-room">FLR-02 · WEDDING CAKE · DAY 42 OF 63 · FLOWER WK 6</div>
      <h1 className="bnt-hero-headline">
        Humidity has<br/>
        <em>climbed past</em><br/>
        the upper bound.
      </h1>
      <p className="bnt-hero-lede">
        64.2% sustained 38 minutes. The bud-rot risk window opens at 65%.
        AC return temp is climbing in tandem — likely a short-cycle on the new schedule.
        Diego is in-room.
      </p>
      <div className="bnt-hero-figs">
        <div className="bnt-hero-fig">
          <div className="bnt-hero-fig-label">RH NOW</div>
          <div className="bnt-hero-fig-val bad">64.2<span className="unit">%</span></div>
          <div className="bnt-hero-fig-sub bad">target ≤ 58 · over 6.2</div>
        </div>
        <div className="bnt-hero-fig">
          <div className="bnt-hero-fig-label">TEMP</div>
          <div className="bnt-hero-fig-val">76<span className="unit">°F</span></div>
          <div className="bnt-hero-fig-sub">climbing 0.1/m</div>
        </div>
        <div className="bnt-hero-fig">
          <div className="bnt-hero-fig-label">DAY</div>
          <div className="bnt-hero-fig-val">42<span className="unit">/63</span></div>
          <div className="bnt-hero-fig-sub">21d to harvest</div>
        </div>
        <div className="bnt-hero-fig">
          <div className="bnt-hero-fig-label">PLANTS</div>
          <div className="bnt-hero-fig-val">612</div>
          <div className="bnt-hero-fig-sub">3,200 sqft canopy</div>
        </div>
      </div>
      <div className="bnt-hero-actions">
        <button className="bnt-btn primary">Open dehumid program</button>
        <button className="bnt-btn">Page Diego</button>
        <button className="bnt-btn">Open room ↗</button>
      </div>
    </div>
  );
}

function SeedAside() {
  return (
    <div className="bnt-cell bnt-seed no-r">
      <div className="bnt-seed-eyebrow">
        <SeedGlyphV2 size={14} />
        THE SEED · PATTERN NOTICED
      </div>
      <p className="bnt-seed-says">
        FLR-02 is tracing the <em>same RH curve as FLR-04 last cycle</em> — which finished 11% under yield.
      </p>
      <p className="bnt-seed-detail">
        Same strain, same stage day, same lights-off window. The signature is hour-three of dark cycle, when the AC return lags. Diego corrected it last time on day 44.
      </p>
      <p className="bnt-seed-prov">
        Noticed across <strong>12 rooms</strong> over <strong>14 days</strong>.<br/>
        Confidence is high.
      </p>
      <div className="bnt-seed-actions">
        <button className="bnt-btn primary">Pull last cycle's log</button>
        <button className="bnt-btn">Mark useful</button>
      </div>
    </div>
  );
}

function KpiCells() {
  return (
    <>
      <div className="bnt-cell bnt-kpi">
        <Spark2 d="M0,18 L13,16 L26,14 L39,15 L52,11 L65,9 L78,7 L92,5" />
        <div className="bnt-kpi-label">PLANTS · LIVE</div>
        <div className="bnt-kpi-row">
          <div className="bnt-kpi-val">6,692</div>
          <div className="bnt-kpi-delta up">+128 wk</div>
        </div>
        <div className="bnt-kpi-context">13 active rooms · 38,400 sqft canopy</div>
      </div>
      <div className="bnt-cell bnt-kpi">
        <Spark2 d="M0,20 L13,17 L26,18 L39,12 L52,11 L65,9 L78,8 L92,6" />
        <div className="bnt-kpi-label">PROJECTED HARVEST · 90D</div>
        <div className="bnt-kpi-row">
          <div className="bnt-kpi-val">2,840<span className="unit">lbs</span></div>
          <div className="bnt-kpi-delta up">+4.2%</div>
        </div>
        <div className="bnt-kpi-context">11 batches · next FLR-08 Tue</div>
      </div>
      <div className="bnt-cell bnt-kpi">
        <Spark2 d="M0,16 L13,18 L26,15 L39,17 L52,14 L65,12 L78,10 L92,9" />
        <div className="bnt-kpi-label">YIELD/SQFT · 30D</div>
        <div className="bnt-kpi-row">
          <div className="bnt-kpi-val">62.3<span className="unit">g</span></div>
          <div className="bnt-kpi-delta up">+1.9</div>
        </div>
        <div className="bnt-kpi-context">flower only · target 60.0</div>
      </div>
      <div className="bnt-cell bnt-kpi no-r">
        <Spark2 d="M0,8 L13,9 L26,11 L39,10 L52,12 L65,14 L78,15 L92,17" color="rgba(110,170,141,0.5)" />
        <div className="bnt-kpi-label">COST/GRAM · LIVE</div>
        <div className="bnt-kpi-row">
          <div className="bnt-kpi-val">$0.84</div>
          <div className="bnt-kpi-delta down">−0.03 wk</div>
        </div>
        <div className="bnt-kpi-context">labor 0.31 · power 0.26 · nut 0.14</div>
      </div>
    </>
  );
}

function RoomsCell() {
  const stages = [
    { key: 'flower',  name: 'FLOWERING',  color: 'var(--stage-flower)', meta: '7 rooms · 4,260 plants' },
    { key: 'veg',     name: 'VEGETATIVE', color: 'var(--stage-veg)',    meta: '3 rooms · 1,820 plants' },
    { key: 'drycure', name: 'DRY · CURE', color: 'var(--stage-cure)',   meta: '3 rooms · 612 lbs wet' },
  ];
  return (
    <div className="bnt-cell bnt-rooms">
      <div className="bnt-rooms-head">
        <h2 className="bnt-rooms-h">Room board · <em>13 rooms</em>, by stage</h2>
        <div className="bnt-rooms-actions">
          <span className="is-on">Stage</span><span>Alert</span><span>Strain</span><span>Map ↗</span>
        </div>
      </div>
      <div className="bnt-rooms-grid">
        {stages.map(s => (
          <React.Fragment key={s.key}>
            <div className="bnt-stage-div">
              <span className="name"><span className="dot" style={{ background: s.color }} />{s.name}</span>
              <span className="meta">{s.meta}</span>
            </div>
            {BENTO_ROOMS[s.key].map(r => (
              <div key={r.code} className={`bnt-room ${r.focused ? 'is-focused' : ''}`}>
                <div className="bnt-room-code"><span className="dot" style={{ background: r.dot }} />{r.code}</div>
                <div className="bnt-room-mid">
                  <div className="bnt-room-strain">{r.strain}</div>
                  <div className="bnt-room-meta"><span className={r.envState}>{r.env}</span></div>
                </div>
                <div className="bnt-room-day">D<strong>{r.day}</strong>/{r.of}</div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AlertsCell() {
  return (
    <div className="bnt-cell bnt-alerts no-r">
      <div className="bnt-alerts-head">
        <h2 className="bnt-alerts-h">Other open</h2>
        <span className="bnt-alerts-count">5 alerts · sorted</span>
      </div>
      <div className="bnt-alerts-list">
        {BENTO_ALERTS.map(a => (
          <div key={a.id} className={`bnt-alert ${a.tone}`}>
            <div className="bnt-alert-meta">
              <span className="origin">{a.origin}</span>
              <span>/ {a.kind}</span>
              <span className="tone">— {a.tone}</span>
              <span className="time">{a.time}</span>
            </div>
            <div className="bnt-alert-title">{a.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HarvestQueueCell() {
  return (
    <div className="bnt-cell bnt-hq-cell no-r">
      <div className="bnt-hq-headline">
        <h2 className="bnt-hq-h">Harvest queue · the <em>next fourteen days</em></h2>
        <span className="bnt-hq-meta">3 harvests due · 1 dry · 1 cure · 1 package</span>
      </div>
      <div className="bnt-hq-strip">
        {BENTO_HQ.map(d => (
          <div key={d.num} className={`bnt-hq-day ${d.today ? 'is-today' : ''} ${d.weekend ? 'is-weekend' : ''}`}>
            <div className="bnt-hq-day-head">
              <div className="bnt-hq-day-num">{d.num}</div>
              <div className="bnt-hq-day-name">{d.name}</div>
            </div>
            {d.pill && (
              <div className={`bnt-hq-pill ${d.pill.kind}`}>
                <div className="bnt-hq-pill-room">{d.pill.room}</div>
                <div className="bnt-hq-pill-strain">{d.pill.strain}</div>
                <div className="bnt-hq-pill-plants">{d.pill.plants} pl</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayCell() {
  return (
    <div className="bnt-cell bnt-today">
      <h2 className="bnt-today-h">Today · ops</h2>
      <div className="bnt-today-list">
        {BENTO_TASKS.map((t, i) => (
          <div key={i} className={`bnt-task ${t.done ? 'done' : ''} ${t.urgent ? 'urgent' : ''}`}>
            <div className="bnt-task-check" />
            <div className="bnt-task-time">{t.time}</div>
            <div className="bnt-task-title">{t.title}</div>
            <div className="bnt-task-who">{t.who}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvCell() {
  const rows = [
    { label: 'TEMP',   val: '74.2', unit: '°F',   tone: '',     d: 'M0,16 L20,16 L40,17 L60,16 L80,15 L100,15 L120,16 L140,17 L160,16 L180,15 L200,16', target: 14 },
    { label: 'RH',     val: '58.4', unit: '%',    tone: 'warn', d: 'M0,20 L20,18 L40,16 L60,14 L80,12 L100,10 L120,8 L140,7 L160,6 L180,5 L200,4',     target: 16 },
    { label: 'VPD',    val: '1.18', unit: 'kPa',  tone: '',     d: 'M0,18 L20,17 L40,16 L60,17 L80,18 L100,17 L120,16 L140,15 L160,16 L180,17 L200,16', target: 14 },
    { label: 'CO₂',    val: '1042', unit: 'ppm',  tone: '',     d: 'M0,18 L20,16 L40,14 L60,16 L80,18 L100,16 L120,14 L140,16 L160,18 L180,16 L200,14', target: 14 },
    { label: 'PPFD',   val: '912',  unit: 'μmol', tone: '',     d: 'M0,28 L20,24 L40,20 L60,16 L80,14 L100,12 L120,10 L140,12 L160,14 L180,16 L200,18', target: 14 },
  ];
  return (
    <div className="bnt-cell bnt-env no-r">
      <h2 className="bnt-env-h">Facility env · <em>now</em></h2>
      <div className="bnt-env-list">
        {rows.map(r => (
          <div key={r.label} className="bnt-env-row">
            <div className="bnt-env-label">{r.label}</div>
            <EnvSpark d={r.d} color={r.tone === 'warn' ? 'var(--status-warn)' : 'var(--accent)'} target={r.target} />
            <div className={`bnt-env-val ${r.tone}`}>{r.val}<span className="unit">{r.unit}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffCell() {
  return (
    <div className="bnt-cell bnt-staff no-r no-b">
      <h2 className="bnt-staff-h">On shift</h2>
      <div className="bnt-staff-list">
        {BENTO_STAFF.map(s => (
          <div key={s.init} className={`bnt-staff-cell ${s.active ? '' : 'inactive'}`}>
            <div className="init">{s.init}</div>
            <div className="info">
              <div className="name">{s.name}</div>
              <div className="role">{s.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CooDeskBento() {
  return (
    <div className="bnt artb">
      <CooNavBento />
      <div className="bnt-grid">
        {/* Row 1 — hero (8) + seed (4) */}
        <HeroFocus />
        <SeedAside />
        {/* Row 2 — KPIs */}
        <KpiCells />
        {/* Row 3 — rooms (8) + alerts (4) */}
        <RoomsCell />
        <AlertsCell />
        {/* Row 4 — harvest queue full bleed */}
        <HarvestQueueCell />
        {/* Row 5 — today (5) + env (4) + staff (3) */}
        <TodayCell />
        <EnvCell />
        <StaffCell />
      </div>
    </div>
  );
}

window.CooDeskBento = CooDeskBento;
