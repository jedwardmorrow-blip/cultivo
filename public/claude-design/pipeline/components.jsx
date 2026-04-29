// Pipeline · Rollup Row Components
// Operator canvas · IBM Plex Sans + Mono · Hairlines not cards
(() => {
const { fmt } = PipelineData;
const M = "'IBM Plex Mono', ui-monospace, monospace";
const S = "'IBM Plex Sans', system-ui, sans-serif";

// ── Atoms ───────────────────────────────────────────

function StageDot({ stage, size }) {
  const s = size || 6;
  const c = { clone:'#0EA5E9', veg:'#10B981', flower:'#F43F5E', harvest:'#F59E0B', cure:'#8B5CF6', package:'#6366F1' };
  return <span style={{ display:'inline-block', width:s, height:s, borderRadius:'50%', background:c[stage]||'#F43F5E', flexShrink:0 }} />;
}

function AllocChip({ state, mode }) {
  const m = mode || 'dot';
  const c = state === 'allocated' ? 'var(--status-ok)' : state === 'partial' ? 'var(--status-warn)' : 'var(--op-ink-4)';
  const label = state === 'none' ? 'none' : state;
  if (m === 'dot') return <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:M, fontSize:10, color:'var(--op-ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
    <span style={{ width:4, height:4, borderRadius:'50%', background:c, flexShrink:0 }} />{label}
  </span>;
  if (m === 'filled') return <span style={{ display:'inline-block', padding:'1px 6px', borderRadius:3, background:c, fontFamily:M, fontSize:9, color:'var(--op-canvas)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:500 }}>{label}</span>;
  return <span style={{ display:'inline-block', padding:'0 5px', borderRadius:3, border:`1px solid ${c}`, fontFamily:M, fontSize:9, color:c, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>;
}

// ── Tiles ────────────────────────────────────────────

function RollupTile({ eyebrow, value, sub, estimate, flag, compact, dot }) {
  const p = compact ? '12px 16px' : '20px 24px';
  const ns = compact ? 22 : 34;
  return <div style={{ padding:p, borderRight:'1px solid var(--op-line)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
    <div style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)', marginBottom:compact?4:8, display:'flex', alignItems:'center', gap:6 }}>
      {dot && <StageDot stage={dot} />}{eyebrow}
    </div>
    <div style={{ fontFamily:M, fontSize:ns, fontWeight:500, color:'var(--op-ink)', fontStyle:estimate?'italic':'normal', lineHeight:1.1, display:'flex', alignItems:'baseline', gap:8 }}>
      {value}
      {flag && <span style={{ fontFamily:M, fontSize:9, fontStyle:'italic', color:'var(--op-ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{flag}</span>}
    </div>
    {sub && <div style={{ fontFamily:S, fontSize:compact?10:12, color:'var(--op-ink-2)', marginTop:compact?3:6 }}>{sub}</div>}
  </div>;
}

// ── Room Roll Strip ─────────────────────────────────

function RoomRow({ d, tweaks, compact }) {
  const rh = compact ? 26 : 34;
  const fs = compact ? 11 : 12;
  const dc = d.ds === 'overdue' ? 'var(--status-bad)' : d.ds === 'stuck' ? 'var(--status-warn)' : 'var(--op-ink)';
  const di = d.ds === 'future';
  const showCo = d.co && tweaks.calloutVerbosity !== 'hidden';
  const coText = d.co && tweaks.calloutVerbosity === 'terse' ? d.co.t.split(' · ')[0] : d.co?.t;
  const showStr = tweaks.strainColumn === 'visible';
  const cols = showStr ? '56px 44px 1fr 32px 60px' : '56px 44px 1fr 60px';
  const showPerRow = tweaks.stageDotBinding === 'per-row';

  return <div>
    <div style={{ display:'grid', gridTemplateColumns:cols, alignItems:'center', height:rh, fontSize:fs, borderBottom:'1px solid var(--op-line)', gap:0, paddingRight:4 }}>
      <span style={{ fontFamily:M, fontWeight:500, color:'var(--op-ink)', fontSize:fs, display:'flex', alignItems:'center', gap:5 }}>
        {showPerRow && <StageDot stage={d.stg} size={5} />}{d.room}
      </span>
      <span style={{ fontFamily:M, color:dc, fontStyle:di?'italic':'normal', fontWeight:d.ds!=='future'?500:400, fontSize:fs }}>{d.days}</span>
      <span style={{ fontFamily:M, color:'var(--op-ink-2)', fontStyle:'italic', fontSize:fs }}>{d.g != null ? fmt(d.g)+'g' : 'tbd'}</span>
      {showStr && <span style={{ fontFamily:M, color:'var(--op-ink-3)', textAlign:'center', fontSize:fs-1 }}>{d.str}</span>}
      <AllocChip state={d.alc} mode={tweaks.allocChip} />
    </div>
    {showCo && <div style={{ display:'flex', alignItems:'center', gap:5, paddingLeft:14, height:compact?18:22, fontSize:compact?9:10, fontFamily:M, textTransform:'uppercase', letterSpacing:'0.04em', color:d.co.sev==='bad'?'var(--status-bad)':'var(--status-warn)' }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:d.co.sev==='bad'?'var(--status-bad)':'var(--status-warn)', flexShrink:0 }} />{coText}
    </div>}
  </div>;
}

function RoomRollStrip({ data, tweaks, compact }) {
  const showStr = tweaks.strainColumn === 'visible';
  const cols = showStr ? '56px 44px 1fr 32px 60px' : '56px 44px 1fr 60px';
  const showOvf = data.overflow && tweaks.overflowPolicy !== 'hidden';
  const ovfText = data.overflow
    ? (tweaks.overflowPolicy === 'severity' ? `+${data.overflow.count} more · ${data.overflow.severe} severe` : `+${data.overflow.count} more`)
    : '';

  return <div style={{ padding:compact?'12px 16px':'20px 24px', borderRight:'1px solid var(--op-line)', display:'flex', flexDirection:'column' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:compact?6:10 }}>
      <span style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)', display:'flex', alignItems:'center', gap:6 }}>
        {tweaks.stageDotBinding !== 'none' && <StageDot stage="flower" />}Next room cohorts
      </span>
      <span style={{ fontFamily:M, fontSize:compact?11:13, fontStyle:'italic', color:'var(--op-ink-2)' }}>{fmt(data.gramsInFlight)}g</span>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:cols, fontSize:compact?8:9, fontFamily:M, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--op-ink-4)', paddingBottom:3, borderBottom:'1px solid var(--op-line)', marginBottom:2 }}>
      <span>Room</span><span>Days</span><span>Proj. g</span>
      {showStr && <span style={{ textAlign:'center' }}>Str</span>}
      <span>Alc</span>
    </div>
    {data.rooms.map((r, i) => <RoomRow key={i} d={r} tweaks={tweaks} compact={compact} />)}
    {showOvf && <div style={{ marginTop:4, fontSize:compact?9:10, fontFamily:M, color:data.overflow.severe>0?'var(--status-bad)':'var(--op-ink-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{ovfText}</div>}
  </div>;
}

// ── Full Row ────────────────────────────────────────

function PageHeader({ compact, persona }) {
  const p = persona || 'COO';
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:compact?'8px 0':'12px 0', borderBottom:'1px solid var(--op-line)', marginBottom:compact?8:12, fontSize:compact?10:11 }}>
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <span style={{ fontFamily:M, fontWeight:500, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:compact?10:11, border:'1px solid var(--op-line-strong)', padding:'4px 10px', borderRadius:'var(--r-xs)' }}>{p} ▾</span>
      <span style={{ fontFamily:M, fontSize:compact?10:11, color:'var(--op-ink-2)' }}>26 Apr 2026</span>
      <span style={{ fontFamily:M, fontSize:compact?9:10, color:'var(--op-ink-3)' }}>updated 2m ago</span>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ fontFamily:M, fontSize:compact?9:10, color:'var(--op-ink-3)', border:'1px solid var(--op-line)', padding:'3px 8px', borderRadius:'var(--r-xs)' }}>23 hidden · ▾</span>
      <span style={{ fontFamily:M, fontSize:compact?9:10, color:'var(--op-ink-3)', border:'1px solid var(--op-line)', padding:'3px 8px', borderRadius:'var(--r-xs)' }}>{compact ? '▣ Compact' : '◻ Comfortable'}</span>
    </div>
  </div>;
}

function BannerTicker({ text, compact }) {
  return <div style={{ padding:compact?'6px 0':'8px 0', borderBottom:'1px solid var(--op-line)', marginBottom:compact?8:12 }}>
    <p style={{ fontFamily:S, fontSize:compact?11:12, color:'var(--op-ink-2)', fontStyle:'italic', margin:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{text}</p>
  </div>;
}

function RollupRow({ data, tweaks, compact }) {
  const ie = tweaks.italicMode === 'everywhere';
  return <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)' }}>
    <RoomRollStrip data={data} tweaks={tweaks} compact={compact} />
    <RollupTile eyebrow="Gross projected revenue" value={'$'+fmt(data.projRevenue)} sub="gross · derived 90d price" estimate={ie} flag="est" compact={compact} />
    <RollupTile eyebrow="Allocated to orders" value={'$'+fmt(data.allocated)} sub={data.orders+' orders · '+data.lines+' lines'} compact={compact} />
    <RollupTile eyebrow="Realized revenue" value={'$'+fmt(data.realized)} sub={'$'+fmt(data.attrRealized)+' attr + $'+fmt(data.unattrRealized)+'u'} compact={compact} />
  </div>;
}

function AtRiskSummary({ count, sub, compact }) {
  if (count === 0) return <div style={{ fontFamily:M, fontSize:compact?10:11, color:'var(--op-ink-3)', padding:'8px 0', textTransform:'uppercase', letterSpacing:'0.06em' }}>No at-risk batches</div>;
  return <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', fontFamily:M, fontSize:compact?10:11, color:count>=3?'var(--status-bad)':'var(--status-warn)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:count>=3?'var(--status-bad)':'var(--status-warn)' }} />
    {count} at risk{sub ? ' · '+sub : ''}
  </div>;
}

// ── State variants ──────────────────────────────────

function SkeletonRow({ compact }) {
  const p = compact ? '12px 16px' : '20px 24px';
  const nh = compact ? 18 : 28;
  const sh = compact ? 10 : 14;
  return <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)' }}>
    {[0,1,2,3].map(i => <div key={i} style={{ padding:p, borderRight:i<3?'1px solid var(--op-line)':'none' }}>
      <div className="skel" style={{ width:i===0?120:100, height:8, marginBottom:compact?6:10 }} />
      <div className="skel" style={{ width:i===0?'80%':80, height:nh, marginBottom:compact?4:8 }} />
      <div className="skel" style={{ width:i===0?'60%':60, height:sh }} />
      {i===0 && <>
        <div className="skel" style={{ width:'90%', height:sh, marginTop:compact?4:8 }} />
        <div className="skel" style={{ width:'90%', height:sh, marginTop:4 }} />
        <div className="skel" style={{ width:'70%', height:sh, marginTop:4 }} />
      </>}
    </div>)}
  </div>;
}

function ErrorRow({ compact }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)', padding:compact?'24px':'40px', gap:10 }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--status-bad)' }} />
    <span style={{ fontFamily:M, fontSize:compact?11:12, color:'var(--status-bad)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Pipeline data unavailable · Supabase timeout · retry in 30s</span>
  </div>;
}

function ColdStartRow({ compact }) {
  return <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)' }}>
    <div style={{ padding:compact?'12px 16px':'20px 24px', borderRight:'1px solid var(--op-line)' }}>
      <div style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)', marginBottom:compact?4:8, display:'flex', alignItems:'center', gap:6 }}>
        <StageDot stage="flower" />Next room cohorts
      </div>
      <div style={{ fontFamily:S, fontSize:compact?12:14, color:'var(--op-ink-3)', lineHeight:1.5 }}>No active rooms.<br />Create your first batch to begin.</div>
    </div>
    {['Gross projected revenue', 'Allocated to orders', 'Realized revenue'].map((label, i) => (
      <div key={i} style={{ padding:compact?'12px 16px':'20px 24px', borderRight:i<2?'1px solid var(--op-line)':'none', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)', marginBottom:compact?4:8 }}>{label}</div>
        <div style={{ fontFamily:M, fontSize:compact?22:34, fontWeight:500, color:'var(--op-ink-4)' }}>—</div>
      </div>
    ))}
  </div>;
}

// ── Composition wrapper ─────────────────────────────

function PipelineComposition({ data, tweaks, compact, showHeader, showBanner, showAtRisk }) {
  const banner = "Pipeline saw 3 batches clear drying this week. FLW-06 KMS harvest is 5d overdue — operations follow-up.";
  return <div style={{ background:'var(--op-canvas)', padding:compact?'16px 20px':'24px 32px', fontFamily:S }}>
    {showHeader !== false && <PageHeader compact={compact} />}
    {showBanner !== false && <BannerTicker text={banner} compact={compact} />}
    <RollupRow data={data} tweaks={tweaks} compact={compact} />
    {showAtRisk !== false && <AtRiskSummary count={data.atRisk} sub={data.atRiskSub} compact={compact} />}
  </div>;
}

Object.assign(window, {
  StageDot, AllocChip, RollupTile, RoomRow, RoomRollStrip,
  PageHeader, BannerTicker, RollupRow, AtRiskSummary,
  SkeletonRow, ErrorRow, ColdStartRow, PipelineComposition,
});
})();
