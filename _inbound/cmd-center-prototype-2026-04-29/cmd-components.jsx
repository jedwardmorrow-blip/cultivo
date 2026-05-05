/* ═══════════════════════════════════════════════════════════════
   Command Center v3 — React Components
   Interactive instrument with live state
   ═══════════════════════════════════════════════════════════════ */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ── Utilities ────────────────────────────────────────────────
function formatTime() {
  const d = new Date();
  return d.toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}

const DOT_CLASS = { flower:'d-flower', veg:'d-veg', clone:'d-clone', mother:'d-mother' };

function Dot({ type, status, className = '' }) {
  const c = status ? `d-${status}` : (DOT_CLASS[type] || 'd-muted');
  return <span className={`d ${c} ${className}`} />;
}

function Spark({ data, marker, height = 20 }) {
  const max = Math.max(...data, 1);
  return (
    <span className="cell-spark" style={{ height }}>
      {data.map((v, i) => (
        <span key={i} className="cell-spark-bar" style={{
          height: `${(v / max) * height}px`,
          background: i === data.length - 1 ? (marker === 'ok' ? 'var(--status-ok)' : marker === 'warn' ? 'var(--status-warn)' : 'var(--op-ink-2)') : undefined,
        }} />
      ))}
    </span>
  );
}

function Timestamp({ prefix = 'updated' }) {
  const [time, setTime] = useState(formatTime);
  useEffect(() => { const t = setInterval(() => setTime(formatTime()), 1000); return () => clearInterval(t); }, []);
  return <div className="ft-ts">{prefix} {time}</div>;
}

// ── PendingCell (honesty pattern) ────────────────────────────
function PendingCell({ label, reason, path }) {
  const [open, setOpen] = useState(false);
  return (
    <button className="cell" onClick={() => setOpen(!open)} style={{ borderBottom: '1px dotted var(--op-line-strong)', cursor: 'pointer' }}>
      <span className="cell-label" style={{ color: 'var(--op-ink-4)' }}>{label}</span>
      <span className="cell-val" style={{ color: 'var(--op-ink-4)', fontSize: 16 }}>—</span>
      <span className="cell-sub" style={{ color: 'var(--op-ink-4)' }}>{reason}</span>
      {open && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--op-ink-3)', marginTop: 4, lineHeight: 1.5, borderTop: '1px solid var(--op-line)', paddingTop: 4 }}>
          {path}
        </span>
      )}
    </button>
  );
}

// ── Task-specific completion forms ───────────────────────────
const TASK_FORMS = {
  'Batch Tank Mix': { fields: [
    { key: 'ec', label: 'EC Reading', placeholder: '2.4', type: 'number' },
    { key: 'ph', label: 'pH Reading', placeholder: '6.2', type: 'number' },
    { key: 'gallons', label: 'Gallons Mixed', placeholder: '50', type: 'number' },
    { key: 'duration', label: 'Duration', placeholder: '15m' },
  ]},
  'Scouting': { fields: [
    { key: 'pests', label: 'Pest Pressure', placeholder: 'none / low / medium / high' },
    { key: 'disease', label: 'Disease Signs', placeholder: 'none / powdery mildew / botrytis / other' },
    { key: 'overall', label: 'Overall Health', placeholder: 'good / fair / poor' },
    { key: 'notes', label: 'Notes', placeholder: 'Observations...' },
  ]},
  'IPM Spray': { fields: [
    { key: 'product', label: 'Product', placeholder: 'e.g. Regalia CG' },
    { key: 'rate', label: 'Rate', placeholder: 'e.g. 2oz/gal' },
    { key: 'coverage', label: 'Coverage', placeholder: 'full canopy / undersides / spot' },
    { key: 'duration', label: 'Duration', placeholder: '20m' },
  ]},
  'Environmental Check': { fields: [
    { key: 'temp', label: 'Temp (°F)', placeholder: '78', type: 'number' },
    { key: 'rh', label: 'RH (%)', placeholder: '55', type: 'number' },
    { key: 'co2', label: 'CO₂ (ppm)', placeholder: '1200', type: 'number' },
    { key: 'vpd', label: 'VPD (kPa)', placeholder: '1.2', type: 'number' },
  ]},
};

function TaskModal({ task, room, onComplete, onClose }) {
  const formDef = TASK_FORMS[task.type];
  const fields = formDef ? formDef.fields : [
    { key: 'duration', label: 'Duration', placeholder: 'e.g. 15m' },
    { key: 'notes', label: 'Notes', placeholder: 'Optional' },
  ];
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = ''; });
    return init;
  });
  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <span className="ml">Complete · {task.type}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-bd">
          <div className="modal-row"><span className="modal-key">Room</span><span className="modal-val">{room.code}</span></div>
          <div className="modal-row"><span className="modal-key">Task</span><span className="modal-val">{task.type}</span></div>
          {fields.map(f => (
            <div key={f.key} className="modal-row">
              <span className="modal-key">{f.label}</span>
              <input className="modal-input" placeholder={f.placeholder} type={f.type || 'text'}
                value={values[f.key]} onChange={e => set(f.key, e.target.value)}
                autoFocus={f === fields[0]} />
            </div>
          ))}
        </div>
        <div className="modal-ft">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="act-btn" onClick={() => onComplete(values)} style={{ flex: 1 }}>Complete Task</button>
        </div>
      </div>
    </div>
  );
}

// ── Harvest Modal ────────────────────────────────────────────
function HarvestModal({ room, onClose }) {
  const [step, setStep] = useState(0); // 0: confirm, 1: weights, 2: done
  const [weights, setWeights] = useState(() => room.groups.map(g => ({ ...g, wet: '' })));

  const totalWet = weights.reduce((s, w) => s + (parseFloat(w.wet) || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <span className="ml">{step === 0 ? 'Start Harvest' : step === 1 ? 'Record Weights' : 'Harvest Complete'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 0 && (
          <div className="modal-bd">
            <div className="modal-row"><span className="modal-key">Room</span><span className="modal-val">{room.code}</span></div>
            <div className="modal-row"><span className="modal-key">Plants</span><span className="modal-val">{room.plants}</span></div>
            <div className="modal-row"><span className="modal-key">Strains</span><span className="modal-val">{room.strains.join(' · ')}</span></div>
            <div className="modal-row"><span className="modal-key">Day</span><span className="modal-val">{room.day} of {room.cycleDays}</span></div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-3)', margin: '12px 0 0', lineHeight: 1.5 }}>
              This will start the harvest workflow for {room.code}. You'll record wet weights per batch and assign a dry room.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="modal-bd">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, alignItems: 'center' }}>
              <span className="ml">Strain / Group</span>
              <span className="ml" style={{ textAlign: 'right' }}>Plants</span>
              <span className="ml" style={{ textAlign: 'right' }}>Wet lbs</span>
              {weights.map((w, i) => (
                <React.Fragment key={w.id}>
                  <span style={{ color: 'var(--op-ink-2)' }}>{w.abbr} · {w.section}</span>
                  <span style={{ color: 'var(--op-ink)', textAlign: 'right' }}>{w.count}</span>
                  <input className="modal-input" style={{ textAlign: 'right', padding: '4px 8px' }}
                    placeholder="0.0" value={w.wet}
                    onChange={e => { const nw = [...weights]; nw[i] = {...w, wet: e.target.value}; setWeights(nw); }}
                  />
                </React.Fragment>
              ))}
            </div>
            {totalWet > 0 && (
              <div style={{ borderTop: '1px solid var(--op-line-strong)', marginTop: 12, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                <span style={{ color: 'var(--op-ink-2)' }}>Total wet</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{totalWet.toFixed(1)} lbs</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="modal-bd" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--status-ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: 'var(--op-canvas)' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--op-ink)', marginBottom: 4 }}>Harvest recorded</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--op-ink-3)' }}>{room.code} · {room.plants} plants · {totalWet.toFixed(1)} lbs wet</div>
          </div>
        )}

        <div className="modal-ft">
          {step === 0 && <>
            <button className="modal-cancel" onClick={onClose}>Cancel</button>
            <button className="act-btn" onClick={() => setStep(1)} style={{ flex: 1 }}>Record Weights →</button>
          </>}
          {step === 1 && <>
            <button className="modal-cancel" onClick={() => setStep(0)}>← Back</button>
            <button className="act-btn" onClick={() => setStep(2)} style={{ flex: 1 }} disabled={totalWet === 0}>Confirm Harvest</button>
          </>}
          {step === 2 && <button className="act-btn" onClick={onClose} style={{ flex: 1 }}>Done</button>}
        </div>
      </div>
    </div>
  );
}

// ── Task Row ─────────────────────────────────────────────────
function TaskRow({ task, onToggle, onOpenLog }) {
  const isDone = task.status === 'done';
  const isActive = task.status === 'active';

  function handleClick() {
    if (isDone) return;
    if (isActive) { onOpenLog(task); return; }
    onToggle(task.id);
  }

  return (
    <div className="tl-row" onClick={handleClick}>
      <div className={`tl-chk ${isDone ? 'done' : isActive ? 'act' : ''}`}></div>
      <span className={`tl-name ${isDone ? 'struck' : ''}`}>{task.type}</span>
      {task.assignee
        ? <span className="tl-who">{task.assignee}</span>
        : <span className="tl-who" style={{ color: 'var(--status-warn)' }}>UNASSIGNED</span>
      }
      <span className="tl-time">{task.time || '—'}</span>
    </div>
  );
}

// ── Room Layout Grid (interactive) ───────────────────────────
function LayoutGrid({ sections, onSelect }) {
  const cols = sections.length <= 4 ? sections.length : Math.ceil(sections.length / 2);
  return (
    <div className="lay-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {sections.map(s => (
        <button key={s.id} className={`lay-cell ${s.count > 0 ? 'occ' : ''}`}
          onClick={() => s.count > 0 && onSelect && onSelect(s)}
          style={{ cursor: s.count > 0 ? 'pointer' : 'default', border: 0, background: s.count > 0 ? 'var(--op-surface-2)' : 'transparent', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--op-line)' }}>
          <span>{s.label}</span>
          {s.count > 0 && <span className="lay-cell-ct">{s.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Attention Strip (auto-hide) ──────────────────────────────
function AttentionStrip({ rooms, onRoomClick }) {
  const items = rooms.filter(r => r.urgency >= 2).sort((a, b) => b.urgency - a.urgency);
  if (items.length === 0) return null; // silence = signal

  return (
    <div className="attn">
      <span className="ml" style={{ flexShrink: 0 }}>Attention</span>
      {items.map(r => {
        const msg = r.harvestDays !== null && r.harvestDays <= 0
          ? `${Math.abs(r.harvestDays)}d overdue`
          : r.harvestDays !== null && r.harvestDays <= 7
          ? `Harvest in ${r.harvestDays}d`
          : r.day && r.day > 35 && r.type === 'veg'
          ? `${r.day}d in veg`
          : 'Needs attention';
        return (
          <button key={r.code} className="attn-item" onClick={() => onRoomClick(r.code)}>
            <Dot status={r.urgency >= 3 ? 'bad' : 'warn'} />
            <span className="attn-code">{r.code}</span>
            <span style={{ color: r.urgency >= 3 ? 'var(--status-bad)' : 'var(--status-warn)' }}>{msg}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Room Card ────────────────────────────────────────────────
function RoomCard({ room, onClick }) {
  const empty = room.plants === 0;
  const doneCount = room.tasks.filter(t => t.status === 'done').length;
  const actCount = room.tasks.filter(t => t.status === 'active').length;
  const pendCount = room.tasks.length - doneCount - actCount;

  const urgClass = room.urgency >= 3 ? 'urgent' : room.urgency >= 2 ? 'warning' : '';
  const urgLabel = room.harvestDays !== null && room.harvestDays <= 0
    ? `Overdue ${Math.abs(room.harvestDays)}d`
    : room.harvestDays !== null && room.harvestDays <= 7
    ? `${room.harvestDays}d to harvest`
    : room.day && room.day > 35 && room.type === 'veg'
    ? `${room.day}d` : null;

  const harvLabel = room.harvestDays !== null
    ? (room.harvestDays <= 0
      ? `projected ${room.harvestDate?.replace('2026-','').replace('-','/')}`
      : `${room.harvestDays}d · projected ${room.harvestDate?.replace('2026-0','').replace('-',' ')}`)
    : room.type === 'veg' && room.day
    ? `~${Math.max(0, (room.cycleDays || 42) - room.day)}d to flip`
    : room.type === 'clone'
    ? `${Math.max(0, (room.cycleDays || 21) - (room.day || 0))}d to transplant`
    : room.type === 'mother' ? 'perpetual' : '';

  return (
    <button className={`rm ${urgClass} ${empty ? 'empty' : ''}`} onClick={empty ? undefined : onClick}>
      <div className="rm-top">
        <Dot type={room.type} />
        <span className="rm-code">{room.code}</span>
        <span className="rm-type">{room.type}</span>
        {urgLabel && <span className="rm-urg" style={{ color: room.urgency >= 3 ? 'var(--status-bad)' : room.urgency >= 2 ? 'var(--status-warn)' : 'var(--op-ink-3)' }}>{urgLabel}</span>}
      </div>
      {!empty ? <>
        <span className="rm-big">{room.plants}</span>
        <span className="rm-stats">
          <span>{room.strains.length} strain{room.strains.length !== 1 ? 's' : ''}</span>
          {room.day !== null && <span>Day {room.day}</span>}
        </span>
        {room.strains.length > 0 && room.strains.length <= 5 && (
          <div className="rm-strains">
            {room.strains.slice(0, 4).map(s => <span key={s} className="rm-strain">{s}</span>)}
            {room.strains.length > 4 && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--op-ink-4)' }}>+{room.strains.length-4}</span>}
          </div>
        )}
        <div className="rm-ft">
          <span className="rm-harv" style={{ color: room.urgency >= 3 ? 'var(--status-bad)' : room.urgency >= 2 ? 'var(--status-warn)' : 'var(--op-ink-3)' }}>{harvLabel}</span>
          {room.tasks.length > 0 && (
            <div className="rm-tasks">
              <div className="tbar">
                {doneCount > 0 && <span className="tseg done" style={{ width: doneCount * 6 }}></span>}
                {actCount > 0 && <span className="tseg act" style={{ width: actCount * 6 }}></span>}
                {pendCount > 0 && <span className="tseg pend" style={{ width: pendCount * 6 }}></span>}
              </div>
              {doneCount}/{room.tasks.length}
            </div>
          )}
        </div>
      </> : <span className="rm-stats" style={{ marginTop:'auto', color:'var(--op-ink-4)' }}>Empty</span>}
    </button>
  );
}

// ── Expanded Room View ───────────────────────────────────────
// ── Compact task summary (shown in sidebar when a card is focused) ────
function TaskSummaryCompact({ tasks, onClick }) {
  const done = tasks.filter(t => t.status === 'done').length;
  const active = tasks.filter(t => t.status === 'active').length;
  const pend = tasks.length - done - active;
  return (
    <button className="sc" style={{ cursor: 'pointer', border: '1px solid var(--op-line)', width: '100%', textAlign: 'left', background: 'var(--op-surface)', font: 'inherit', color: 'inherit', padding: 0 }} onClick={onClick}>
      <div className="sc-hd" style={{ borderBottom: '1px solid var(--op-line)' }}>
        <span className="ml">Tasks</span>
        <span className="ml-sm">{done}/{tasks.length} done · tap to focus</span>
      </div>
      <div className="sc-bd">
        <div style={{ display: 'flex', gap: 2, height: 4, marginBottom: 8 }}>
          {done > 0 && <span style={{ flex: done, height: 4, borderRadius: 1, background: 'var(--status-ok)' }}></span>}
          {active > 0 && <span style={{ flex: active, height: 4, borderRadius: 1, background: 'var(--status-warn)' }}></span>}
          {pend > 0 && <span style={{ flex: pend, height: 4, borderRadius: 1, background: 'var(--op-ink-4)' }}></span>}
        </div>
        <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--op-ink-3)' }}>
          <span>{done} done</span>
          {active > 0 && <span style={{ color: 'var(--status-warn)' }}>{active} active</span>}
          {pend > 0 && <span>{pend} pending</span>}
        </div>
      </div>
    </button>
  );
}

// ── Sidebar card content renderers (for promoted view) ───────────────
function ScheduleExpanded({ room }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {room.schedule.length > 0 ? room.schedule.map((s, i) => (
          <div key={i} className="sched-row" style={{ padding: '8px 0' }}>
            <span className="sched-day" style={i === 0 ? { color: 'var(--accent)', fontSize: 11 } : { fontSize: 11 }}>{s.day}</span>
            <span className="sched-tasks" style={{ fontSize: 13 }}>{s.tasks}</span>
          </div>
        )) : <div className="pending-hint">No schedules configured → Task Settings</div>}
      </div>
      {room.milestones.length > 0 && (
        <div style={{ borderTop: '1px solid var(--op-line)', paddingTop: 12 }}>
          <div className="ml" style={{ marginBottom: 8 }}>Milestones</div>
          {room.milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: i < room.milestones.length - 1 ? '1px solid var(--op-line)' : 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: m.warn ? 'var(--status-warn)' : 'var(--op-ink-2)', width: 60 }}>Day {m.phaseDay}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--op-ink)' }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-4)', marginLeft: 'auto' }}>{m.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlantsExpanded({ room }) {
  return (
    <div>
      {room.groups.map(g => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--op-line)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--op-ink)', width: 56 }}>{g.abbr}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--op-ink)' }}>{g.count}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-3)' }}>{g.strain}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-4)', marginLeft: 'auto' }}>{g.section}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <span style={{ color: 'var(--op-ink-2)' }}>Total</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{room.plants}</span>
      </div>
    </div>
  );
}

function LayoutExpanded({ room, sections, selectedSection, setSelectedSection }) {
  const cols = sections.length <= 4 ? sections.length : Math.ceil(sections.length / 2);
  return (
    <div>
      <div className="lay-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {sections.map(s => (
          <button key={s.id}
            className={`lay-cell ${s.count > 0 ? 'occ' : ''}`}
            onClick={() => s.count > 0 && setSelectedSection(s.id === selectedSection?.id ? null : s)}
            style={{
              cursor: s.count > 0 ? 'pointer' : 'default',
              aspectRatio: '1',
              borderWidth: 1, borderStyle: 'solid',
              borderColor: selectedSection?.id === s.id ? 'var(--accent)' : 'var(--op-line)',
              background: selectedSection?.id === s.id ? 'var(--op-surface-2)' : s.count > 0 ? 'var(--op-surface-2)' : 'transparent',
            }}>
            <span style={{ fontSize: 12 }}>{s.label}</span>
            {s.count > 0 && <span className="lay-cell-ct" style={{ fontSize: 22 }}>{s.count}</span>}
          </button>
        ))}
      </div>
      {selectedSection && (
        <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--op-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--op-ink)' }}>{selectedSection.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-3)', marginTop: 2 }}>{selectedSection.count} plants</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="act-btn" style={{ fontSize: 10, padding: '5px 12px' }}>Move</button>
            <button className="act-btn" style={{ fontSize: 10, padding: '5px 12px' }}>Print</button>
          </div>
        </div>
      )}
    </div>
  );
}

const FOCUS_CARDS = ['schedule', 'plants', 'layout'];
const FOCUS_LABELS = { schedule: 'Schedule', plants: 'Plants', layout: 'Layout' };

function ExpandedRoom({ room, tasks, onBack, onTaskUpdate }) {
  const [completingTask, setCompletingTask] = useState(null);
  const [showHarvest, setShowHarvest] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [focusedCard, setFocusedCard] = useState(null); // null = tasks in main, or 'schedule'|'plants'|'layout'

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const phasePct = room.day && room.cycleDays ? Math.min((room.day / room.cycleDays) * 100, 100) : 0;

  function handleToggleTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (t.status === 'pending') {
      onTaskUpdate(id, 'active');
    } else if (t.status === 'active') {
      setCompletingTask(t);
    }
  }

  function handleCompleteTask(duration, notes) {
    if (completingTask) {
      onTaskUpdate(completingTask.id, 'done', formatTime());
      setCompletingTask(null);
    }
  }

  const harvLabel = room.harvestDays !== null
    ? (room.harvestDays <= 0 ? `${Math.abs(room.harvestDays)}d overdue` : `Harvest in ${room.harvestDays}d`)
    : room.type === 'veg' ? `~${Math.max(0, (room.cycleDays || 42) - (room.day || 0))}d to flip` : '';

  return (
    <div className="exp">
      <div className="exp-hdr">
        <div className="exp-hdr-top">
          <button className="back-btn" onClick={onBack}>← Rooms</button>
          <Dot type={room.type} />
          <span className="exp-code">{room.code}</span>
          <span className="exp-meta">
            <span>{room.type}</span>
            {room.day !== null && <span>Day {room.day}</span>}
            <span>{room.plants} plants</span>
            <span>{room.strains.length} strains</span>
          </span>
          {harvLabel && <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color: room.urgency >= 3 ? 'var(--status-bad)' : room.urgency >= 2 ? 'var(--status-warn)' : 'var(--op-ink-3)' }}>{harvLabel}</span>}
          {room.type === 'flower' && <button className="act-btn" style={{ marginLeft: 16 }} onClick={() => setShowHarvest(true)}>Harvest</button>}
        </div>

        {/* Phase hero */}
        {room.cycleDays && (
          <div className="phase-hero">
            <div className="phase-track">
              <div className="phase-fill" style={{ width: `${phasePct}%` }}>
                <div className="phase-now"></div>
              </div>
              {room.type === 'flower' && (
                <div className="phase-markers">
                  <span className="phase-marker" style={{ left: '33%' }}>Stretch</span>
                  <span className="phase-marker" style={{ left: '57%' }}>Bulk</span>
                  <span className="phase-marker" style={{ left: '71%' }}>Flush</span>
                  <span className="phase-marker" style={{ left: '90%' }}>Ripen</span>
                </div>
              )}
              {room.type === 'veg' && (
                <div className="phase-markers">
                  <span className="phase-marker" style={{ left: '33%' }}>Establish</span>
                  <span className="phase-marker" style={{ left: '66%' }}>Growth</span>
                  <span className="phase-marker" style={{ left: '95%' }}>Flip</span>
                </div>
              )}
            </div>
            <div className="phase-labels">
              <span>{room.flipDate ? `Flip ${room.flipDate.slice(5).replace('-','/')}` : `Start Day 1`}</span>
              <span style={{ color: 'var(--accent)' }}>Day {room.day} — today</span>
              <span>{room.harvestDate ? `Harvest ~${room.harvestDate.slice(5).replace('-','/')}` : `Cycle ~Day ${room.cycleDays}`}</span>
            </div>
          </div>
        )}

        {/* Stats strip */}
        <div className="cells" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <div className="cell">
            <span className="cell-label"><Dot status={doneCount === tasks.length && tasks.length > 0 ? 'ok' : undefined} /> Tasks</span>
            <span className="cell-val">{doneCount}/{tasks.length}</span>
            <span className="cell-sub">{tasks.length - doneCount === 0 ? 'all done' : `${tasks.length - doneCount} remaining`}</span>
          </div>
          <div className="cell">
            <span className="cell-label">Countdown</span>
            <span className="cell-val proj">{room.harvestDays !== null ? `${Math.abs(room.harvestDays)}d` : room.cycleDays ? `${Math.max(0, room.cycleDays - (room.day||0))}d` : '—'}</span>
            <span className="cell-sub">{room.harvestDays !== null && room.harvestDays <= 0 ? 'overdue' : room.harvestDate ? `projected ${room.harvestDate.slice(5)}` : room.type === 'veg' ? 'to flip' : ''}</span>
          </div>
          <div className="cell">
            <span className="cell-label">Mortality</span>
            <span className="cell-val">0.4%</span>
            <span className="cell-sub">1 dead · 30d window</span>
          </div>
          <div className="cell">
            <span className="cell-label">Last Feed EC</span>
            <span className="cell-val">{room.feed ? room.feed.targetEC : '—'}</span>
            <span className="cell-sub">{room.feed ? 'target · last read 2.3' : 'no recipe'}</span>
          </div>
          <div className="cell">
            <span className="cell-label">Last Scout</span>
            <span className="cell-val">2d ago</span>
            <span className="cell-sub">no issues found</span>
          </div>
          <div className="cell">
            <span className="cell-label">Strains</span>
            <span className="cell-val">{room.strains.length}</span>
            <span className="cell-sub">{room.strains.slice(0,3).join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* Body — card swap layout */}
      <div className="exp-body">
        {/* Left: Main panel */}
        <div className="tl">
          {!focusedCard ? (
            <>
              <div className="sec-hd">
                <span className="ml">Today's Tasks</span>
                <span className="ml-sm ml-r">{doneCount}/{tasks.length} done</span>
              </div>
              {tasks.length > 0
                ? tasks.map(t => <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onOpenLog={setCompletingTask} />)
                : <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--op-ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>No tasks scheduled</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--op-ink-4)' }}>Configure schedules in Task Settings →</div>
                  </div>
              }
              <Timestamp />
            </>
          ) : (
            <>
              <div className="sec-hd">
                <span className="ml">{FOCUS_LABELS[focusedCard]}</span>
                <button className="ml-sm ml-r" onClick={() => { setFocusedCard(null); setSelectedSection(null); }}
                  style={{ cursor: 'pointer', background: 'none', border: 0, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ← Back to tasks
                </button>
              </div>
              <div style={{ padding: 16 }}>
                {focusedCard === 'schedule' && <ScheduleExpanded room={room} />}
                {focusedCard === 'plants' && <PlantsExpanded room={room} />}
                {focusedCard === 'layout' && <LayoutExpanded room={room} sections={room.sections} selectedSection={selectedSection} setSelectedSection={setSelectedSection} />}
              </div>
            </>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="sidebar-wrap">
          {/* Tasks compact (shown when a card is focused) */}
          {focusedCard && <TaskSummaryCompact tasks={tasks} onClick={() => setFocusedCard(null)} />}

          {/* Schedule + Plants */}
          <div className="sidebar-2col">
            {focusedCard !== 'schedule' && (
              <div className="sc" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard('schedule')}>
                <div className="sc-hd"><span className="ml">Schedule</span><span className="ml-sm">3-day</span></div>
                <div className="sc-bd">
                  {room.schedule.length > 0 ? room.schedule.slice(0, 2).map((s, i) => (
                    <div key={i} className="sched-row">
                      <span className="sched-day" style={i === 0 ? { color: 'var(--accent)' } : undefined}>{s.day}</span>
                      <span className="sched-tasks">{s.tasks}</span>
                    </div>
                  )) : <div className="pending-hint">No schedules → Settings</div>}
                  {room.schedule.length > 2 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--op-ink-4)', marginTop: 4 }}>+{room.schedule.length - 2} more · tap to expand</div>}
                </div>
              </div>
            )}

            {focusedCard !== 'plants' && (
              <div className="sc" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard('plants')}>
                <div className="sc-hd"><span className="ml">Plants</span><span className="ml-sm">{room.plants}</span></div>
                <div className="sc-bd">
                  {room.groups.length > 0 ? room.groups.slice(0, 3).map(g => (
                    <div key={g.id} className="sc-row">
                      <span className="sc-key">{g.abbr}</span>
                      <span className="sc-val">{g.count}</span>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--op-ink-4)', marginLeft:'auto' }}>{g.section}</span>
                    </div>
                  )) : <div className="pending-hint">No plant groups</div>}
                </div>
              </div>
            )}
          </div>

          {/* Layout */}
          {focusedCard !== 'layout' && (
            <div className="sc" style={{ cursor: 'pointer' }} onClick={() => setFocusedCard('layout')}>
              <div className="sc-hd">
                <span className="ml">Layout</span>
                <span className="ml-sm">{room.sections.filter(s => s.count > 0).length} occupied · tap to expand</span>
              </div>
              <div className="sc-bd">
                {room.sections.length > 0
                  ? <LayoutGrid sections={room.sections} />
                  : <div className="pending-hint">No sections → Room Setup</div>
                }
              </div>
            </div>
          )}

          {/* Feed */}
          {room.feed ? (
            <div className="sc">
              <div className="sc-hd" style={{ cursor: 'pointer' }} onClick={() => setFeedOpen(!feedOpen)}>
                <span className="ml">Feed Recipe</span>
                <span className="ml-sm">{feedOpen ? '▾ collapse' : '▸ expand'}</span>
              </div>
              <div className="sc-bd">
                {!feedOpen
                  ? <div className="feed-summary">{room.feed.summary.split('EC').map((part, i) => i === 0 ? part + 'EC' : <strong key={i}>{part}</strong>)}</div>
                  : <>
                      <div className="feed-row" style={{ color:'var(--op-ink-3)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                        <span>Nutrient</span><span style={{ textAlign:'right' }}>mL/gal</span><span style={{ textAlign:'right' }}>EC</span>
                      </div>
                      {room.feed.items.map((f, i) => (
                        <div key={i} className="feed-row">
                          <span className="feed-nm">{f.name}</span>
                          <span className="feed-v">{f.ml}</span>
                          <span className="feed-v">—</span>
                        </div>
                      ))}
                      <div className="feed-row" style={{ borderTop:'1px solid var(--op-line-strong)', paddingTop:8, marginTop:4 }}>
                        <span className="feed-nm" style={{ fontWeight:500, color:'var(--op-ink)' }}>Target</span>
                        <span className="feed-v">—</span>
                        <span className="feed-v" style={{ color:'var(--accent)' }}>{room.feed.targetEC}</span>
                      </div>
                    </>
                }
              </div>
            </div>
          ) : (
            <div className="sc">
              <div className="sc-hd"><span className="ml">Feed Recipe</span></div>
              <div className="sc-bd"><div className="pending-hint">No recipe assigned → Feed Programs</div></div>
            </div>
          )}
        </div>
      </div>

      {completingTask && <TaskModal task={completingTask} room={room} onComplete={handleCompleteTask} onClose={() => setCompletingTask(null)} />}
      {showHarvest && <HarvestModal room={room} onClose={() => setShowHarvest(false)} />}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
function CmdApp() {
  const { ROOMS_DATA, LABOR_SPARKS } = window.CMD_DATA;
  const [rooms, setRooms] = useState(() => ROOMS_DATA.map(r => ({ ...r, tasks: r.tasks.map(t => ({...t})) })));
  const [selectedRoom, setSelectedRoom] = useState(null);

  const allTasks = rooms.flatMap(r => r.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.status === 'done').length;
  const activeTasks = allTasks.filter(t => t.status === 'active').length;
  const pendingTasks = totalTasks - doneTasks - activeTasks;
  const activeRooms = rooms.filter(r => r.plants > 0);

  function handleTaskUpdate(taskId, newStatus, time) {
    setRooms(prev => prev.map(r => ({
      ...r,
      tasks: r.tasks.map(t => t.id === taskId ? { ...t, status: newStatus, time: time || t.time, assignee: t.assignee || 'YOU' } : t)
    })));
  }

  const [fadeClass, setFadeClass] = useState('');
  const currentRoom = selectedRoom ? rooms.find(r => r.code === selectedRoom) : null;

  function navigateTo(roomCode) {
    setFadeClass('fade-out');
    setTimeout(() => {
      setSelectedRoom(roomCode);
      setFadeClass('fade-in');
      setTimeout(() => setFadeClass(''), 150);
    }, 120);
  }

  function navigateBack() {
    setFadeClass('fade-out');
    setTimeout(() => {
      setSelectedRoom(null);
      setFadeClass('fade-in');
      setTimeout(() => setFadeClass(''), 150);
    }, 120);
  }

  return (
    <div className="cmd">
      <div className="hdr">
        <div className="hdr-l">
          <span className="hdr-title">Cultivation Command</span>
          <span className="hdr-meta">{formatDate()}</span>
          <span className="hdr-meta">tasks <strong>{doneTasks} / {totalTasks}</strong> today</span>
        </div>
        <div className="hdr-r">live</div>
      </div>

      <div className={`cmd-content ${fadeClass}`}>
      {!currentRoom ? (
        <>
          <AttentionStrip rooms={rooms} onRoomClick={navigateTo} />

          <div className="sec">
            <div className="sec-hd">
              <span className="ml">Labor</span>
              <span className="ml-sm ml-r">Mon · 5 staff on</span>
            </div>
            <div className="cells" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div className="cell">
                <span className="cell-label">Total Tasks</span>
                <span className="cell-val">{totalTasks}</span>
                <span className="cell-sub">across {activeRooms.length} rooms</span>
                <Spark data={LABOR_SPARKS.total} height={20} />
              </div>
              <div className="cell">
                <span className="cell-label"><Dot status="ok" /> Done</span>
                <span className="cell-val">{doneTasks}</span>
                <span className="cell-sub">{totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0}% complete</span>
                <Spark data={LABOR_SPARKS.done} marker="ok" height={20} />
              </div>
              <div className="cell">
                <span className="cell-label"><Dot status="warn" /> Active</span>
                <span className="cell-val">{activeTasks}</span>
                <span className="cell-sub">{activeTasks} in progress</span>
              </div>
              <div className="cell">
                <span className="cell-label">Pending</span>
                <span className="cell-val">{pendingTasks}</span>
                <span className="cell-sub">{allTasks.filter(t => !t.assignee && t.status !== 'done').length} unassigned</span>
              </div>
              <PendingCell label="Efficiency" reason="needs time-tracking" path="Lights up when task durations are logged. Avg minutes per task type." />
            </div>
            <Timestamp />
          </div>

          <div className="sec">
            <div className="sec-hd">
              <span className="ml">Rooms</span>
              <span className="ml-sm ml-r">{activeRooms.length} active · {rooms.length - activeRooms.length} empty</span>
            </div>
            <div className="rooms">
              {rooms.map(r => <RoomCard key={r.code} room={r} onClick={() => navigateTo(r.code)} />)}
            </div>
            <Timestamp />
          </div>
        </>
      ) : (
        <ExpandedRoom
          room={currentRoom}
          tasks={currentRoom.tasks}
          onBack={navigateBack}
          onTaskUpdate={handleTaskUpdate}
        />
      )}
      </div>
    </div>
  );
}

window.CmdApp = CmdApp;
