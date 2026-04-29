// Cultivation — Floor tablet (1024×1366) and Mobile glance (390×844)

const SeedGlyphMark = window.SeedGlyph;

/* ─────────────────────────────────────────────────────────────────────
   FLOOR TABLET — Worker register
   ───────────────────────────────────────────────────────────────────── */

const FLOOR_ROOMS = [
  { code: 'FLR-02', strain: 'Wedding Cake',  day: 42, of: 63, status: 'urgent', tasks: 4, dot: 'var(--status-bad)' },
  { code: 'FLR-03', strain: 'Sundae Driver', day: 35, of: 63, status: 'ok',     tasks: 1, dot: 'var(--stage-flower)' },
  { code: 'FLR-06', strain: 'GG#4',          day: 14, of: 63, status: 'ok',     tasks: 2, dot: 'var(--stage-flower)' },
  { code: 'VEG-01', strain: 'Gelato 33',     day: 18, of: 21, status: 'ok',     tasks: 1, dot: 'var(--stage-veg)' },
  { code: 'VEG-03', strain: 'Blue Dream',    day: 5,  of: 21, status: 'watch',  tasks: 1, dot: 'var(--stage-veg)' },
  { code: 'DRY-A',  strain: 'Wedding Cake',  day: 9,  of: 14, status: 'ok',     tasks: 1, dot: 'var(--op-ink-3)' },
];

const FLOOR_TASKS = [
  {
    id: 't1', urgent: true, time: '10:00',
    title: 'Investigate FLR-02 RH spike — check dehumid + AC return',
    meta: ['SOP-074 · 25min', 'Diego · head grower'],
    metaTone: 'bad',
    primary: 'Begin task',
  },
  {
    id: 't2', time: '07:15', done: true,
    title: 'Defoliation — lower canopy pass complete',
    meta: ['SOP-031 · 45min', 'Maria — done 7:58'],
  },
  {
    id: 't3', time: '12:00',
    title: 'Mid-day environment check — log readings',
    meta: ['SOP-002 · 8min', 'rotating'],
    primary: 'Begin task',
  },
  {
    id: 't4', time: '14:30',
    title: 'Trellis adjust — top net to 56 inches, secure with zip ties',
    meta: ['SOP-052 · 35min', 'Maria + 1'],
    primary: 'Begin task',
  },
  {
    id: 't5', time: '16:00',
    title: 'PM walkthrough — visual scan, IPM check, log anomalies',
    meta: ['SOP-001 · 20min', 'Diego'],
  },
];

function FloorTablet() {
  return (
    <div className="artb flr">
      <div className="flr-nav">
        <div className="flr-nav-l">
          <span className="flr-nav-word">CULTIVO</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-3)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Floor · Northbay
          </span>
        </div>
        <div className="flr-nav-r">
          <span className="role">Maria Chen — Cultivator</span>
          <span className="clock">10:42</span>
        </div>
      </div>

      <div className="flr-rooms-strip">
        {FLOOR_ROOMS.map((r, i) => (
          <div key={r.code} className={`flr-room-tab ${i === 0 ? 'is-active' : ''} ${r.tasks > 0 ? 'has-task' : ''}`}>
            <div className="flr-room-tab-code">
              <span className="dot" style={{ background: r.dot }} />
              {r.code}
            </div>
            <div className="flr-room-tab-meta">
              D{r.day}/{r.of} · {r.tasks} task{r.tasks !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="flr-seed">
        <div className="flr-seed-mark"><SeedGlyphMark size={18} /></div>
        <div className="flr-seed-says">
          From the Seed: <em>RH curve here matches FLR-04 last cycle</em>. Diego flagged it on day 44 last time.
        </div>
      </div>

      <div className="flr-focus-head">
        <div>
          <div className="flr-focus-eyebrow">YOU'RE IN · ROOM</div>
          <div className="flr-focus-title">FLR-02 · <em>Wedding Cake</em></div>
          <div className="flr-focus-meta">
            <span><strong>Stage</strong> Flower wk 6</span>
            <span><strong>Plants</strong> 612</span>
            <span><strong>Canopy</strong> 3,200 sqft</span>
            <span><strong>Last logged</strong> 09:30 · Diego</span>
          </div>
        </div>
        <div>
          <div className="flr-focus-eyebrow" style={{ textAlign: 'right' }}>DAY</div>
          <div className="flr-focus-day">42<span className="of">/63</span></div>
        </div>
      </div>

      <div className="flr-tasks-head">
        <span><strong>4 tasks</strong> for this room today</span>
        <span>SOP library ↗</span>
      </div>

      {FLOOR_TASKS.map(t => (
        <div key={t.id} className={`flr-task ${t.done ? 'done' : ''} ${t.urgent ? 'urgent' : ''}`}>
          <div className="flr-task-check">{t.done ? '✓' : ''}</div>
          <div className="flr-task-body">
            <div className="flr-task-title">{t.title}</div>
            <div className="flr-task-meta">
              <span className={t.metaTone === 'bad' ? 'tone-bad' : ''}>{t.time}</span>
              {t.meta.map((m, i) => <span key={i} className={t.metaTone === 'bad' && i === 0 ? 'tone-bad' : ''}>{m}</span>)}
            </div>
          </div>
          {t.primary && (
            <button className={`flr-task-action ${t.urgent ? 'primary' : ''}`}>{t.primary}</button>
          )}
        </div>
      ))}

      <div className="flr-env-strip">
        <div className="flr-env-cell">
          <div className="flr-env-cell-label">RH</div>
          <div className="flr-env-cell-val bad">64.2<span className="unit">%</span></div>
          <div className="flr-env-cell-target">target ≤ 58</div>
        </div>
        <div className="flr-env-cell">
          <div className="flr-env-cell-label">Temp</div>
          <div className="flr-env-cell-val">76.4<span className="unit">°F</span></div>
          <div className="flr-env-cell-target">target 72–76</div>
        </div>
        <div className="flr-env-cell">
          <div className="flr-env-cell-label">VPD</div>
          <div className="flr-env-cell-val">1.05<span className="unit">kPa</span></div>
          <div className="flr-env-cell-target">target 1.10–1.30</div>
        </div>
        <div className="flr-env-cell">
          <div className="flr-env-cell-label">CO₂</div>
          <div className="flr-env-cell-val">1,050<span className="unit">ppm</span></div>
          <div className="flr-env-cell-target">target 950–1,100</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MOBILE GLANCE — single-screen confidence check for COO
   ───────────────────────────────────────────────────────────────────── */

const MOB_ROOMS = [
  { code: 'FLR-02', strain: 'Wedding Cake', day: 'D42', flag: 'urgent',    flagText: 'rh hi',  dot: 'var(--status-bad)' },
  { code: 'FLR-01', strain: 'Gelato 33',    day: 'D49', flag: 'attention', flagText: 'vpd hi', dot: 'var(--status-warn)' },
  { code: 'FLR-04', strain: 'Zkittlez',     day: 'D28', flag: 'attention', flagText: 'co₂',    dot: 'var(--status-warn)' },
  { code: 'FLR-03', strain: 'Sundae Driver',day: 'D35', flag: '',          flagText: 'ok',     dot: 'var(--stage-flower)' },
  { code: 'FLR-05', strain: 'Blue Dream',   day: 'D21', flag: '',          flagText: 'ok',     dot: 'var(--stage-flower)' },
  { code: 'FLR-06', strain: 'GG#4',         day: 'D14', flag: '',          flagText: 'ok',     dot: 'var(--stage-flower)' },
  { code: 'VEG-03', strain: 'Blue Dream',   day: 'D5',  flag: '',          flagText: 'watch',  dot: 'var(--stage-veg)' },
];

function MobileGlance() {
  return (
    <div className="artb mob">
      <div className="mob-statusbar" />
      <div className="mob-nav">
        <div className="mob-nav-word">CULTIVO</div>
        <div className="mob-nav-time">10:42 · synced</div>
      </div>

      <div className="mob-headline">
        <div className="mob-headline-eyebrow">
          <span className="live-dot" />
          NORTHBAY · FACILITY
        </div>
        <div className="mob-headline-text">
          12 of 13 rooms<br />
          on plan. <em>One needs you.</em>
        </div>
        <div className="mob-headline-meta">
          6,692 plants · 90d projection +4.2% vs plan
        </div>
      </div>

      <div className="mob-status">
        <div className="mob-status-cell">
          <div className="mob-status-label">PLANTS</div>
          <div className="mob-status-val">6,692</div>
          <div className="mob-status-sub ok">+128 this week</div>
        </div>
        <div className="mob-status-cell">
          <div className="mob-status-label">YIELD/SQFT</div>
          <div className="mob-status-val">62.3<span className="unit">g</span></div>
          <div className="mob-status-sub ok">+1.9 vs Q4</div>
        </div>
        <div className="mob-status-cell">
          <div className="mob-status-label">COST/GRAM</div>
          <div className="mob-status-val">$0.84</div>
          <div className="mob-status-sub ok">−$0.03 wk</div>
        </div>
        <div className="mob-status-cell">
          <div className="mob-status-label">NEXT HARVEST</div>
          <div className="mob-status-val">Tue</div>
          <div className="mob-status-sub">FLR-08 · Gelato 33</div>
        </div>
      </div>

      <div className="mob-thing">
        <div className="mob-thing-eyebrow">
          <span className="dot" />
          NEEDS YOU
        </div>
        <div className="mob-thing-title">FLR-02 humidity 64.2% — past upper bound, 38 min sustained</div>
        <div className="mob-thing-detail">
          Diego is on it. Bud-rot risk window opens at 65%. AC return temp climbing.
        </div>
        <div className="mob-thing-actions">
          <button className="mob-thing-btn">Page Diego</button>
          <button className="mob-thing-btn primary">Open room</button>
        </div>
      </div>

      <div className="mob-seed">
        <div className="mob-seed-eyebrow">
          <span className="mob-seed-mark"><SeedGlyphMark size={14} /></span>
          THE SEED · PATTERN NOTICED
        </div>
        <div className="mob-seed-says">
          <em>FLR-02</em> is tracing the RH curve of <em>FLR-04 last cycle</em> — which finished 11% under yield. Same strain, same day, same lights-off window.
        </div>
        <div className="mob-seed-meta">obs · 14d window · basis 12 rooms · confidence high</div>
      </div>

      <div className="mob-rooms">
        <div className="mob-rooms-head">All rooms · 13</div>
        {MOB_ROOMS.map(r => (
          <div key={r.code} className="mob-room-line">
            <div className="code">
              <span className="dot" style={{ background: r.dot }} />
              {r.code}
            </div>
            <div className="strain">{r.strain} · {r.day}</div>
            <div className={`flag ${r.flag}`}>{r.flagText}</div>
          </div>
        ))}
      </div>

      <div className="mob-tabbar">
        <div className="mob-tab is-active">
          <span className="mob-tab-icon">◆</span>
          Glance
        </div>
        <div className="mob-tab">
          <span className="mob-tab-icon">▦</span>
          Rooms
        </div>
        <div className="mob-tab">
          <span className="mob-tab-icon">◐</span>
          Alerts
        </div>
        <div className="mob-tab">
          <span className="mob-tab-icon">⌗</span>
          Numbers
        </div>
        <div className="mob-tab">
          <span className="mob-tab-icon">≡</span>
          More
        </div>
      </div>
    </div>
  );
}

window.FloorTablet = FloorTablet;
window.MobileGlance = MobileGlance;
