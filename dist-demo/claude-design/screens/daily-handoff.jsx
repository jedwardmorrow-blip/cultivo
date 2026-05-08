// Cultivo — Daily Handoff Sheet (printed, paper)
// 850×1100 letter portrait. Black ink on warm-white. No color, no chrome.
// Tonal counterweight to the screens — the working-instrument aesthetic.

/* ─── Data ───────────────────────────────────────────────────────── */
const DH_ROOMS = [
  { code: 'FLR-01', strain: 'Gelato 33',    day: '49 / 63', flag: 'VPD high' },
  { code: 'FLR-02', strain: 'Wedding Cake', day: '42 / 63', flag: 'RH spike — investigation open' },
  { code: 'FLR-03', strain: 'Sundae Driver', day: '35 / 63', flag: '' },
  { code: 'FLR-04', strain: 'Zkittlez',     day: '28 / 63', flag: 'CO₂ ceiling' },
  { code: 'FLR-05', strain: 'Blue Dream',   day: '21 / 63', flag: '' },
  { code: 'FLR-06', strain: 'GG#4',         day: '14 / 63', flag: '' },
  { code: 'FLR-07', strain: 'Gelato 33',    day: '7 / 63',  flag: '' },
  { code: 'VEG-01', strain: 'Gelato 33',    day: '18 / 21', flag: '' },
  { code: 'VEG-02', strain: 'Sundae Driver', day: '12 / 21', flag: '' },
  { code: 'VEG-03', strain: 'Blue Dream',   day: '5 / 21',  flag: 'EC drift' },
  { code: 'DRY-A',  strain: 'Wedding Cake', day: '9 / 14',  flag: '' },
  { code: 'DRY-B',  strain: 'Zkittlez',     day: '4 / 14',  flag: '' },
  { code: 'CURE-1', strain: 'Mac1 · S.D.',  day: '18 / 21', flag: '' },
];

const DH_TASKS = [
  { time: '06:00', t: 'AM walkthrough · visual + IPM', who: 'D.R' },
  { time: '06:30', t: 'Reservoir mix · week 4 batch', who: 'A.T' },
  { time: '07:15', t: 'Defoliation · FLR-03 lower', who: 'M.C' },
  { time: '08:00', t: 'Trellis adjust · FLR-06 raise top net', who: 'M.C' },
  { time: '09:30', t: 'Transplant · VEG-01 → FLR-08', who: 'A.T' },
  { time: '10:00', t: 'Investigation · FLR-02 RH spike · SOP-074', who: 'D.R', urgent: true },
  { time: '12:00', t: 'Mid-day environment check (all rooms)', who: 'rot.' },
  { time: '13:00', t: 'Harvest prep · FLR-08 clean-room walkthrough', who: 'team' },
  { time: '14:30', t: 'Trellis pass · FLR-04', who: 'M.C' },
  { time: '15:30', t: 'Dry transfer · CURE-1 burp + log', who: 'A.T' },
  { time: '16:30', t: 'PM walkthrough · log readings', who: 'D.R' },
];

/* ─── Components ─────────────────────────────────────────────────── */

// "Pen" handwriting wrapper — adds a subtle ink jitter via random transforms
function Pen({ children, rotate = 0, dx = 0, dy = 0, scale = 1, weight = 500, color = '#1a2440' }) {
  return (
    <span
      className="dh-pen"
      style={{
        transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg) scale(${scale})`,
        fontWeight: weight,
        color,
      }}
    >
      {children}
    </span>
  );
}

function Checkbox({ checked = false, x = false, half = false }) {
  return (
    <span className="dh-cb">
      <span className="dh-cb-box" />
      {checked ? (
        <svg className="dh-cb-mark" viewBox="0 0 14 14">
          <path d="M2 8 L6 11 L13 2" fill="none" stroke="#1a2440" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {x ? (
        <svg className="dh-cb-mark" viewBox="0 0 14 14">
          <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="#1a2440" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : null}
      {half ? (
        <svg className="dh-cb-mark" viewBox="0 0 14 14">
          <path d="M3 7 L11 7" fill="none" stroke="#1a2440" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : null}
    </span>
  );
}

/* ─── The shared sheet shell ─────────────────────────────────────── */
function HandoffSheet({ marked = false }) {
  // Rooms with annotations when marked
  const roomNotes = marked ? {
    'FLR-02': { rh: '64.2', vpd: '1.18', t: '78', co2: '1040', circle: true },
    'FLR-01': { rh: '57',   vpd: '1.32', t: '79', co2: '1090' },
    'FLR-03': { rh: '58',   vpd: '1.20', t: '78', co2: '1010' },
    'FLR-04': { rh: '58',   vpd: '1.22', t: '78', co2: '1180' },
    'FLR-05': { rh: '58',   vpd: '1.18', t: '78', co2: '1020' },
    'FLR-06': { rh: '57',   vpd: '1.20', t: '77', co2: '1030' },
    'VEG-03': { rh: '62',   vpd: '0.95', t: '76', co2: '900',  circle: true },
  } : {};

  return (
    <div className={`artb dh-sheet${marked ? ' marked' : ''}`}>
      {/* Paper background grain */}
      <div className="dh-paper" />

      {/* HEADER */}
      <div className="dh-head">
        <div className="dh-head-l">
          <div className="dh-mark">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#1a1a18" strokeWidth="1.2" />
              <path d="M12 4 Q15 8 12 12 Q9 16 12 20" fill="none" stroke="#1a1a18" strokeWidth="1.2" />
            </svg>
            <span className="dh-mark-word">CULTIVO</span>
          </div>
          <div className="dh-doc-title">Daily Handoff</div>
          <div className="dh-doc-sub">Cultivation · shift lead → COO</div>
        </div>
        <div className="dh-head-r">
          <div className="dh-meta-row">
            <span className="dh-meta-l">Date</span>
            <span className="dh-meta-rule">
              {marked ? <Pen dx={2}>Sun · 16 Mar · 2026</Pen> : null}
            </span>
          </div>
          <div className="dh-meta-row">
            <span className="dh-meta-l">Shift</span>
            <span className="dh-meta-rule">
              {marked ? <Pen dx={2}>06:00 — 14:00</Pen> : null}
            </span>
          </div>
          <div className="dh-meta-row">
            <span className="dh-meta-l">Lead</span>
            <span className="dh-meta-rule">
              {marked ? <Pen dx={2} rotate={-1}>D. Reyes</Pen> : null}
            </span>
          </div>
          <div className="dh-meta-row">
            <span className="dh-meta-l">Page</span>
            <span className="dh-meta-rule plain">1 / 1</span>
          </div>
        </div>
      </div>

      {/* SEED OVERNIGHT NOTE */}
      <div className="dh-seed">
        <div className="dh-seed-l">THE SEED · OVERNIGHT</div>
        <div className="dh-seed-r">
          <div className="dh-seed-says">
            <em>RH spike on FLR-02 at 04:08 — recovery slope steeper than the last two.
            Likely dehumid 1 service issue, not the room. Pull its log before closing the ticket.</em>
          </div>
          <div className="dh-seed-meta">obs 08:02 · basis last 6 RH events · confidence 0.81</div>
        </div>
      </div>

      {/* ROOMS · the worksheet grid */}
      <div className="dh-section">
        <div className="dh-section-h">
          <span className="dh-section-num">01</span>
          <span className="dh-section-title">Rooms — log readings on walk</span>
          <span className="dh-section-rule" />
          <span className="dh-section-meta">13 rooms · log RH / VPD / Temp / CO₂</span>
        </div>
        <table className="dh-rooms">
          <thead>
            <tr>
              <th style={{ width: 78 }}>Room</th>
              <th style={{ width: 170 }}>Strain</th>
              <th style={{ width: 78 }}>Day</th>
              <th style={{ width: 60 }}>RH</th>
              <th style={{ width: 60 }}>VPD</th>
              <th style={{ width: 50 }}>°F</th>
              <th style={{ width: 70 }}>CO₂</th>
              <th>Flag</th>
              <th style={{ width: 36 }}>OK</th>
            </tr>
          </thead>
          <tbody>
            {DH_ROOMS.map((r, i) => {
              const note = roomNotes[r.code];
              return (
                <tr key={r.code} className={note?.circle ? 'circled' : ''}>
                  <td className="dh-room-code">{r.code}</td>
                  <td className="dh-strain">{r.strain}</td>
                  <td className="dh-day">{r.day}</td>
                  <td className="dh-fill">{note ? <Pen rotate={Math.sin(i)*1.5} dx={Math.cos(i)*1}>{note.rh}</Pen> : null}</td>
                  <td className="dh-fill">{note ? <Pen rotate={Math.cos(i)*1.5}>{note.vpd}</Pen> : null}</td>
                  <td className="dh-fill">{note ? <Pen rotate={Math.sin(i+1)*1.5}>{note.t}</Pen> : null}</td>
                  <td className="dh-fill">{note ? <Pen rotate={Math.cos(i+2)*1.5}>{note.co2}</Pen> : null}</td>
                  <td className="dh-flag">{r.flag}</td>
                  <td className="dh-fill ok">
                    {marked && !note?.circle ? <Checkbox checked /> : null}
                    {marked && note?.circle ? <Checkbox x /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TASKS */}
      <div className="dh-section">
        <div className="dh-section-h">
          <span className="dh-section-num">02</span>
          <span className="dh-section-title">Today — tasks</span>
          <span className="dh-section-rule" />
          <span className="dh-section-meta">11 items · check on completion · note time + initials</span>
        </div>
        <ol className="dh-tasks">
          {DH_TASKS.map((t, i) => {
            // marked-up state: first 5 done, 6th in-progress (the FLR-02 investigation), rest blank
            let cb = null;
            if (marked) {
              if (i < 5) cb = <Checkbox checked />;
              else if (i === 5) cb = <Checkbox half />;
            }
            return (
              <li key={i} className={`dh-task${t.urgent ? ' urgent' : ''}`}>
                <span className="dh-task-cb">{cb}</span>
                <span className="dh-task-time">{t.time}</span>
                <span className="dh-task-text">{t.t}</span>
                <span className="dh-task-who">{t.who}</span>
                <span className="dh-task-actual">
                  {marked && i < 5 ? <Pen rotate={Math.sin(i)*1.2} weight={500}>{['06:14','06:42','07:58','08:23','09:55'][i]}</Pen> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* HARVEST + TRANSFERS */}
      <div className="dh-twocol">
        <div className="dh-section dh-half">
          <div className="dh-section-h">
            <span className="dh-section-num">03</span>
            <span className="dh-section-title">This week</span>
            <span className="dh-section-rule" />
          </div>
          <ul className="dh-flat">
            <li><span className="dh-mono">Tue 5</span> Harvest · FLR-08 · Gelato 33 · 240 plants</li>
            <li><span className="dh-mono">Wed 6</span> Harvest · FLR-09 · Wedding Cake · 220</li>
            <li><span className="dh-mono">Fri 8</span> Harvest · FLR-10 · GG#4 · 260</li>
            <li><span className="dh-mono">Sun 10</span> Dry transfer in · DRY-A · 460</li>
            <li><span className="dh-mono">Tue 12</span> Cure transfer in · CURE-1 · 480</li>
            <li><span className="dh-mono">Wed 13</span> Package · Mac1 batch · 380</li>
          </ul>
        </div>
        <div className="dh-section dh-half">
          <div className="dh-section-h">
            <span className="dh-section-num">04</span>
            <span className="dh-section-title">Open from yesterday</span>
            <span className="dh-section-rule" />
          </div>
          <ul className="dh-flat">
            <li>FLR-02 dehumid 1 — service ticket pending {marked ? <Pen dx={4} rotate={-1}>called Hank — Mon</Pen> : null}</li>
            <li>VEG-03 EC drift — recheck runoff after morning feed</li>
            <li>DRY-B sensor delta 2.1°F — recalibrate before noon</li>
            <li>SOP-074 update — Diego to add 'pull dehumid log' step {marked ? <Pen dx={4} rotate={-1.5}>done</Pen> : null}</li>
          </ul>
        </div>
      </div>

      {/* SIGN-OFF */}
      <div className="dh-signoff">
        <div className="dh-sig">
          <div className="dh-sig-rule">
            {marked ? <Pen rotate={-3} dx={6} dy={-4} scale={1.3} weight={400}>Diego R.</Pen> : null}
          </div>
          <div className="dh-sig-l">SHIFT LEAD · signature</div>
        </div>
        <div className="dh-sig">
          <div className="dh-sig-rule">
            {marked ? <Pen rotate={-2} dx={6} dy={-2} scale={1.2} weight={400}>—</Pen> : null}
          </div>
          <div className="dh-sig-l">RECEIVED · COO</div>
        </div>
        <div className="dh-sig small">
          <div className="dh-sig-rule">
            {marked ? <Pen rotate={0} dx={2}>14:08</Pen> : null}
          </div>
          <div className="dh-sig-l">TIME OUT</div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="dh-foot">
        <span>CULTIVO · CULTIVATION</span>
        <span>FORM HO-001 · REV 4 · MAR 2026</span>
        <span>{marked ? 'FILED · BIN 03' : 'PRINT AT 06:00'}</span>
      </div>

      {/* Stamp on marked-up version */}
      {marked ? (
        <div className="dh-stamp">
          <div className="dh-stamp-inner">
            <div>FILED</div>
            <div className="dh-stamp-d">16 MAR</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HandoffBlank()  { return <HandoffSheet marked={false} />; }
function HandoffMarked() { return <HandoffSheet marked={true}  />; }

window.HandoffBlank = HandoffBlank;
window.HandoffMarked = HandoffMarked;
