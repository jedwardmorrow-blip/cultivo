// Cultivo — Room Detail (FLR-02 deep-dive)
// Opens when COO clicks the urgent FLR-02 cell or alert.
// 1700×2160, same surface system as COO Desk Ledger.

const SeedGlyphRD = window.SeedGlyph;

/* ─── Trigger trail data ─────────────────────────────────────────── */
const RD_EVENTS = [
  { t: '03:42', tone: 'bad',     label: 'RH 62%',          note: 'crossed upper band, sensor R-02-A' },
  { t: '04:08', tone: 'bad',     label: 'RH 64.2% · peak', note: 'second sensor confirmed, dehumid call high' },
  { t: '05:15', tone: 'watch',   label: 'Light cycle on',  note: 'photoperiod resumed, +2°F canopy' },
  { t: '06:00', tone: 'watch',   label: 'AM walkthrough',  note: 'D.Reyes — no visible bud rot, marked for follow-up' },
  { t: '07:30', tone: 'ok',      label: 'Dehumid 2 swap',  note: 'unit 2 brought online, RH falling' },
  { t: '09:11', tone: 'ok',      label: 'RH 58.8%',        note: 'back inside band' },
  { t: '10:00', tone: 'urgent',  label: 'Investigation',   note: 'D.Reyes assigned · SOP-074' },
];

/* ─── Action ledger ──────────────────────────────────────────────── */
const RD_ACTIONS = [
  { time: '04:15', action: 'Auto-call dehumidifier 1',          who: 'system',   result: 'no response · service flag' },
  { time: '07:30', action: 'Manual swap to dehumidifier 2',     who: 'D.Reyes',  result: 'RH falling within 12 min' },
  { time: '08:45', action: 'IPM scan — lower canopy, 12 plants', who: 'M.Chen',  result: 'no fungal signs · clean' },
  { time: '10:00', action: 'Open investigation — SOP-074',      who: 'D.Reyes',  result: 'in progress' },
];

const RD_PLAYBOOK = [
  { ord: '01', txt: 'Pull dehumid 1 service log — last filter, last coil clean.' },
  { ord: '02', txt: 'Inspect AC return for pooling. Dry-clean, photo for record.' },
  { ord: '03', txt: 'Sweep lower canopy 4–6", every plant, mark anything off.' },
  { ord: '04', txt: 'If clean at 12:00 — close ticket, log to playbook.' },
];

/* ─── Live vitals ────────────────────────────────────────────────── */
const RD_VITALS = [
  { label: 'RH',         val: '58.8',  unit: '%',     band: '55–60',  state: 'ok',   delta: '−5.4 since peak' },
  { label: 'VPD',        val: '1.18',  unit: 'kPa',   band: '1.10–1.25', state: 'ok', delta: 'in band' },
  { label: 'Temp',       val: '78.4',  unit: '°F',    band: '76–80',  state: 'ok',   delta: '+0.4 vs am' },
  { label: 'CO₂',        val: '1,040', unit: 'ppm',   band: '900–1,100', state: 'ok', delta: 'in band' },
  { label: 'Leaf surface', val: '76.2', unit: '°F',  band: 'Δ 2.2',  state: 'ok',   delta: 'healthy gap' },
  { label: 'Substrate',  val: '52',    unit: '% WC',  band: '50–60',  state: 'ok',   delta: 'last irrigation 06:00' },
];

/* ─── Activity log ───────────────────────────────────────────────── */
const RD_LOG = [
  { ts: '10:00', kind: 'task',   actor: 'D.Reyes',  txt: 'Investigation opened · SOP-074',         tag: 'open' },
  { ts: '09:11', kind: 'env',    actor: 'system',   txt: 'RH back in band · 58.8%',                tag: 'ok' },
  { ts: '08:45', kind: 'task',   actor: 'M.Chen',   txt: 'IPM scan complete — 12 plants, clean',   tag: 'done' },
  { ts: '08:02', kind: 'seed',   actor: 'The Seed', txt: 'RH-recovery slope normal · confidence 0.81', tag: 'note' },
  { ts: '07:30', kind: 'task',   actor: 'D.Reyes',  txt: 'Dehumid 2 brought online manually',      tag: 'done' },
  { ts: '06:00', kind: 'task',   actor: 'D.Reyes',  txt: 'AM walkthrough — no visible bud rot',    tag: 'done' },
  { ts: '04:15', kind: 'system', actor: 'system',   txt: 'Auto-call dehumid 1 · no response',      tag: 'flag' },
  { ts: '04:08', kind: 'env',    actor: 'system',   txt: 'RH peak 64.2% · sensor R-02-B',           tag: 'bad' },
  { ts: '03:42', kind: 'env',    actor: 'system',   txt: 'RH crossed upper band · 62.0%',          tag: 'bad' },
  { ts: '00:00', kind: 'env',    actor: 'system',   txt: 'Lights off · cycle began',                tag: 'log' },
  { ts: 'Yest', kind: 'task',    actor: 'M.Chen',   txt: 'Defoliation — lower canopy pass complete', tag: 'done' },
  { ts: 'Yest', kind: 'task',    actor: 'A.Torres', txt: 'Reservoir mix · week 4 nutrient batch',   tag: 'done' },
];

/* ─── RH chart sparkline (24h, 5min sampling, simulated) ─────────── */
function rdGenRH() {
  const pts = [];
  // baseline 56-58, spike 03:42-08:00, recovery
  for (let i = 0; i < 96; i++) {
    const hour = i / 4;
    let v = 56.5 + Math.sin(i / 6) * 0.6;
    if (hour > 3.5 && hour < 5) v += (hour - 3.5) * 12;     // climb
    if (hour >= 5 && hour < 7.5) v = 64 - (hour - 5) * 0.6;  // hold
    if (hour >= 7.5 && hour < 10) v = 62 - (hour - 7.5) * 1.4; // drop
    pts.push(v);
  }
  return pts;
}

function RdChart() {
  const W = 920, H = 280, P = 32;
  const pts = rdGenRH();
  const yMin = 50, yMax = 68;
  const sx = (i) => P + (i / (pts.length - 1)) * (W - P * 2);
  const sy = (v) => P + (1 - (v - yMin) / (yMax - yMin)) * (H - P * 2);
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)} ${sy(v)}`).join(' ');
  const area = `${path} L${sx(pts.length - 1)} ${H - P} L${P} ${H - P} Z`;
  // band region 55-60
  const bandTop = sy(60), bandBot = sy(55);
  // tick hours
  const hours = [0, 4, 8, 12, 16, 20, 24];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rdt-chart-svg" preserveAspectRatio="none">
      {/* band */}
      <rect x={P} y={bandTop} width={W - P * 2} height={bandBot - bandTop}
            fill="rgba(168,184,154,0.06)" />
      <line x1={P} y1={bandTop} x2={W - P} y2={bandTop} stroke="rgba(168,184,154,0.18)" strokeDasharray="2 4" />
      <line x1={P} y1={bandBot} x2={W - P} y2={bandBot} stroke="rgba(168,184,154,0.18)" strokeDasharray="2 4" />
      {/* axis labels */}
      <text x={W - P + 4} y={bandTop + 3} fill="rgba(168,184,154,0.7)" fontSize="9.5" fontFamily="IBM Plex Mono">60</text>
      <text x={W - P + 4} y={bandBot + 3} fill="rgba(168,184,154,0.7)" fontSize="9.5" fontFamily="IBM Plex Mono">55</text>
      <text x={W - P + 4} y={sy(64.2) + 3} fill="rgba(220,80,70,0.85)" fontSize="9.5" fontFamily="IBM Plex Mono">64.2</text>
      {/* peak line */}
      <line x1={P} y1={sy(64.2)} x2={W - P} y2={sy(64.2)} stroke="rgba(220,80,70,0.20)" strokeDasharray="2 3" />
      {/* hour ticks */}
      {hours.map((h) => (
        <g key={h}>
          <line x1={sx((h / 24) * 96)} y1={H - P} x2={sx((h / 24) * 96)} y2={H - P + 4} stroke="rgba(255,255,255,0.16)" />
          <text x={sx((h / 24) * 96)} y={H - 8} fill="rgba(255,255,255,0.36)" fontSize="9.5"
                fontFamily="IBM Plex Mono" textAnchor="middle">{String(h).padStart(2, '0')}:00</text>
        </g>
      ))}
      {/* area + line */}
      <path d={area} fill="rgba(245,244,241,0.04)" />
      <path d={path} fill="none" stroke="#E8E0D4" strokeWidth="1.5" />
      {/* incident pins */}
      {[
        { h: 3.7, v: 62, tone: 'bad', label: 'crossed' },
        { h: 4.13, v: 64.2, tone: 'bad', label: 'peak 64.2' },
        { h: 7.5, v: 62, tone: 'ok', label: 'dehumid 2 on' },
        { h: 9.18, v: 58.8, tone: 'ok', label: 'in band' },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={sx((p.h / 24) * 96)} cy={sy(p.v)} r="3.5"
                  fill={p.tone === 'bad' ? '#DC5046' : '#A8B89A'}
                  stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function RdSpark({ tone = 'ok' }) {
  const pts = Array.from({ length: 24 }, (_, i) => 50 + Math.sin(i / 2) * 6 + (Math.random() - 0.5) * 4);
  const max = Math.max(...pts), min = Math.min(...pts);
  const path = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * 80;
    const y = 24 - ((v - min) / (max - min)) * 22;
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ');
  return (
    <svg width="80" height="24" viewBox="0 0 80 24">
      <path d={path} fill="none"
            stroke={tone === 'bad' ? '#DC5046' : tone === 'warn' ? '#D8A648' : '#A8B89A'}
            strokeWidth="1" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
function CooRoomDetail() {
  return (
    <div className="artb rdt">
      {/* TOP NAV — mirrors COO desk */}
      <div className="coo-nav">
        <div className="coo-nav-l">
          <div className="coo-nav-word">CULTIVO</div>
          <div className="coo-nav-sep" />
          <div className="coo-nav-tabs">
            <div className="coo-nav-tab">Cultivation</div>
            <div className="coo-nav-tab">Harvest</div>
            <div className="coo-nav-tab">Inventory</div>
            <div className="coo-nav-tab">Compliance</div>
          </div>
        </div>
        <div className="coo-nav-r">
          <span>Sun · 16 Mar · 10:14</span>
          <span className="coo-live-dot" />
          <span>live</span>
          <span className="role">D. Reyes · COO</span>
        </div>
      </div>

      {/* BREADCRUMB */}
      <div className="rdt-crumb">
        <span className="rdt-crumb-back">← Cultivation</span>
        <span className="rdt-crumb-sep">›</span>
        <span className="rdt-crumb-cur">FLR-02 · detail</span>
        <span className="rdt-crumb-flag">INVESTIGATION OPEN</span>
      </div>

      {/* HERO HEADER */}
      <div className="rdt-hero">
        <div className="rdt-hero-l">
          <div className="rdt-hero-eyebrow">
            <span className="rdt-stage-dot" style={{ background: 'var(--stage-flower)' }} />
            FLOWER · ROOM · DAY 42 OF 63
          </div>
          <h1 className="rdt-hero-title">
            FLR-02 · <em>Wedding Cake</em>
          </h1>
          <div className="rdt-hero-progress">
            <div className="rdt-hero-bar">
              <div className="rdt-hero-bar-fill" style={{ width: '66.6%' }} />
              <div className="rdt-hero-bar-mark" style={{ left: '66.6%' }} />
            </div>
            <div className="rdt-hero-progress-meta">
              <span>Day 42 / 63</span>
              <span>Harvest <strong>Apr 6</strong></span>
              <span>21 days remain</span>
            </div>
          </div>
        </div>
        <div className="rdt-hero-r">
          {[
            { lbl: 'RH',   val: '58.8', unit: '%',   tone: 'ok',  hint: 'recovered' },
            { lbl: 'PEAK', val: '64.2', unit: '%',   tone: 'bad', hint: '04:08 today' },
            { lbl: 'VPD',  val: '1.18', unit: 'kPa', tone: 'ok',  hint: 'in band' },
            { lbl: 'TEMP', val: '78.4', unit: '°F',  tone: 'ok',  hint: '+0.4 am' },
          ].map((f, i) => (
            <div className="rdt-hero-fig" key={i}>
              <div className="rdt-hero-fig-lbl">{f.lbl}</div>
              <div className={`rdt-hero-fig-val ${f.tone}`}>{f.val}<span className="unit">{f.unit}</span></div>
              <div className={`rdt-hero-fig-hint ${f.tone}`}>{f.hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* THE SEED — wide strip */}
      <div className="rdt-seed">
        <div className="rdt-seed-mark"><SeedGlyphRD size={20} /></div>
        <div className="rdt-seed-body">
          <div className="rdt-seed-label">THE SEED</div>
          <div className="rdt-seed-says">
            Recovery slope is steeper than the last two FLR-02 RH events. Investigate <em>why dehumid 1 didn't auto-call</em> before closing the ticket — that's the recurring failure, not the room.
          </div>
          <div className="rdt-seed-meta">
            <span>OBSERVED · 08:02</span>
            <span>BASIS · last 6 RH excursions, this room, 90 days</span>
            <span>CONFIDENCE · 0.81</span>
          </div>
        </div>
        <div className="rdt-seed-actions">
          <button className="rdt-btn">Pin to investigation</button>
          <button className="rdt-btn">Defer</button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="rdt-grid">
        {/* TRIGGER TRAIL — 8 col */}
        <div className="rdt-card rdt-trail">
          <div className="rdt-card-h">
            <div className="rdt-card-eyebrow">TRIGGER TRAIL · LAST 24H</div>
            <h2 className="rdt-card-title">RH spike, recovery, follow-through.</h2>
            <div className="rdt-card-actions">
              <button className="rdt-btn ghost">RH</button>
              <button className="rdt-btn ghost dim">VPD</button>
              <button className="rdt-btn ghost dim">Temp</button>
              <button className="rdt-btn ghost dim">CO₂</button>
            </div>
          </div>
          <div className="rdt-chart"><RdChart /></div>
          <div className="rdt-trail-events">
            {RD_EVENTS.map((e, i) => (
              <div className={`rdt-event tone-${e.tone}`} key={i}>
                <div className="rdt-event-t">{e.t}</div>
                <div className="rdt-event-dot" />
                <div className="rdt-event-l">{e.label}</div>
                <div className="rdt-event-n">{e.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LIVE VITALS — 4 col */}
        <div className="rdt-card rdt-vitals">
          <div className="rdt-card-h">
            <div className="rdt-card-eyebrow">LIVE · FLR-02</div>
            <h2 className="rdt-card-title">Vitals.</h2>
          </div>
          <div className="rdt-vitals-list">
            {RD_VITALS.map((v, i) => (
              <div className="rdt-vital" key={i}>
                <div className="rdt-vital-l">
                  <div className="rdt-vital-lbl">{v.label}</div>
                  <div className="rdt-vital-band">{v.band}</div>
                </div>
                <div className="rdt-vital-r">
                  <div className={`rdt-vital-val ${v.state}`}>{v.val}<span className="unit">{v.unit}</span></div>
                  <div className="rdt-vital-spark"><RdSpark tone={v.state} /></div>
                </div>
                <div className="rdt-vital-delta">{v.delta}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTION LEDGER — 8 col */}
        <div className="rdt-card rdt-actions">
          <div className="rdt-card-h">
            <div className="rdt-card-eyebrow">ACTION LEDGER · INCIDENT</div>
            <h2 className="rdt-card-title">What's been tried.</h2>
            <div className="rdt-card-actions">
              <button className="rdt-btn">Add entry</button>
              <button className="rdt-btn ghost">SOP-074</button>
            </div>
          </div>
          <div className="rdt-actions-table">
            <div className="rdt-actions-row head">
              <span>TIME</span><span>ACTION</span><span>OPERATOR</span><span>RESULT</span>
            </div>
            {RD_ACTIONS.map((a, i) => (
              <div className="rdt-actions-row" key={i}>
                <span className="rdt-mono">{a.time}</span>
                <span>{a.action}</span>
                <span className="rdt-mono dim">{a.who}</span>
                <span className="rdt-mono">{a.result}</span>
              </div>
            ))}
          </div>
          <div className="rdt-playbook">
            <div className="rdt-playbook-h">RECOMMENDED NEXT · SOP-074</div>
            {RD_PLAYBOOK.map((p, i) => (
              <div className="rdt-play-row" key={i}>
                <span className="rdt-play-ord">{p.ord}</span>
                <span>{p.txt}</span>
                <span className="rdt-play-cta">→</span>
              </div>
            ))}
          </div>
        </div>

        {/* TERMINAL PROJECTION — 4 col */}
        <div className="rdt-card rdt-projection">
          <div className="rdt-card-h">
            <div className="rdt-card-eyebrow">TERMINAL · IF HELD</div>
            <h2 className="rdt-card-title">Projection.</h2>
          </div>
          <div className="rdt-proj-grade">
            <div className="rdt-proj-grade-val">A−</div>
            <div className="rdt-proj-grade-meta">
              <div>Quality grade if recovery sustained.</div>
              <div className="rdt-proj-grade-sub">Was A. Drops to B if a second excursion within 48h.</div>
            </div>
          </div>
          <div className="rdt-proj-row">
            <span className="rdt-proj-lbl">Yield · projected</span>
            <span className="rdt-proj-val">52.4 lb</span>
            <span className="rdt-proj-delta dim">target 54.0 · −1.6</span>
          </div>
          <div className="rdt-proj-row">
            <span className="rdt-proj-lbl">Harvest date</span>
            <span className="rdt-proj-val">Apr 6</span>
            <span className="rdt-proj-delta dim">unchanged</span>
          </div>
          <div className="rdt-proj-row">
            <span className="rdt-proj-lbl">Symptom window</span>
            <span className="rdt-proj-val">36–60h</span>
            <span className="rdt-proj-delta">if rot · visible by Tue</span>
          </div>
          <div className="rdt-proj-row">
            <span className="rdt-proj-lbl">Confidence</span>
            <span className="rdt-proj-val">0.78</span>
            <span className="rdt-proj-delta dim">model · 6mo</span>
          </div>
          <div className="rdt-proj-foot">
            Re-projects every 6 hours. Manually triggered after any logged action.
          </div>
        </div>
      </div>

      {/* ACTIVITY LOG — full width */}
      <div className="rdt-card rdt-log">
        <div className="rdt-card-h">
          <div className="rdt-card-eyebrow">ACTIVITY · 48 HOURS · 47 ENTRIES</div>
          <h2 className="rdt-card-title">Everything that touched this room.</h2>
          <div className="rdt-card-actions">
            <button className="rdt-btn ghost">All</button>
            <button className="rdt-btn ghost dim">Tasks</button>
            <button className="rdt-btn ghost dim">Env</button>
            <button className="rdt-btn ghost dim">Seed</button>
          </div>
        </div>
        <div className="rdt-log-table">
          <div className="rdt-log-row head">
            <span>TIME</span><span>KIND</span><span>ACTOR</span><span>ENTRY</span><span>STATUS</span>
          </div>
          {RD_LOG.map((l, i) => (
            <div className={`rdt-log-row kind-${l.kind}`} key={i}>
              <span className="rdt-mono">{l.ts}</span>
              <span className="rdt-mono dim upper">{l.kind}</span>
              <span className="rdt-mono">{l.actor}</span>
              <span className={l.kind === 'seed' ? 'rdt-log-seed' : ''}>{l.txt}</span>
              <span className={`rdt-mono upper tag-${l.tag}`}>{l.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="rdt-foot">
        <span>FLR-02 · WEDDING CAKE · DAY 42 / 63</span>
        <span>NEXT ACTION · 12:00 ENVIRONMENT CHECK</span>
        <span>OWNED BY · D.REYES</span>
        <span>CULTIVO · CULTIVATION</span>
      </div>
    </div>
  );
}

window.CooRoomDetail = CooRoomDetail;
