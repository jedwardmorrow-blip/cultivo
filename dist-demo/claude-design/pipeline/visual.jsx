// Pipeline · Visual alternatives
// Stage pipeline bar + revenue waterfall + layout compositions
(() => {
const { fmt, states } = PipelineData;
const { StageDot, AllocChip, RoomRow, AtRiskSummary } = window;
const M = "'IBM Plex Mono', ui-monospace, monospace";
const S = "'IBM Plex Sans', system-ui, sans-serif";

// Full-portfolio stage distribution (working numbers from fixture metadata)
const STAGES = [
  { name:'Cultivation', grams:40200, color:'#10B981', batches:87,
    notes:[ {label:'FLW-06 +5d',sev:'bad'}, {label:'FLW-10 18d'}, {label:'VEG-02 32d'} ]},
  { name:'Drying', grams:24800, color:'#F59E0B', batches:13,
    notes:[ {label:'FLW-08 d17',sev:'warn'} ]},
  { name:'Processing', grams:12400, color:'#8B5CF6', batches:27,
    notes:[ {label:'HSC d108',sev:'bad'}, {label:'GAP d144',sev:'bad'} ]},
  { name:'Inventory', grams:21012, color:'#6366F1', batches:67,
    notes:[ {label:'199 lbs unsold',sev:'warn'} ]},
];
const TOTAL_G = STAGES.reduce((s, st) => s + st.grams, 0);

// ── Stage Pipeline Bar ──────────────────────────────

function StagePipelineBar({ compact }) {
  const barH = compact ? 44 : 56;
  return <div style={{ background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)', padding:compact?'12px 16px':'16px 24px' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:compact?8:12 }}>
      <span style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)' }}>Grams in flight by stage</span>
      <span style={{ fontFamily:M, fontSize:compact?15:20, fontStyle:'italic', color:'var(--op-ink)', fontWeight:500 }}>{fmt(TOTAL_G)}g</span>
    </div>
    <div style={{ display:'flex', height:barH, borderRadius:'var(--r-xs)', overflow:'hidden', border:'1px solid var(--op-line)' }}>
      {STAGES.map((st, i) => {
        const pct = st.grams / TOTAL_G * 100;
        const stuck = st.notes.some(n => n.sev);
        return <div key={i} style={{
          width:pct+'%', minWidth:compact?44:60,
          background:stuck?'var(--op-surface-2)':'var(--op-canvas)',
          borderRight:i<STAGES.length-1?'1px solid var(--op-line-strong)':'none',
          padding:compact?'4px 6px 4px 10px':'6px 8px 6px 14px',
          display:'flex', flexDirection:'column', justifyContent:'center', gap:1,
          position:'relative',
        }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:st.color, opacity:0.7 }} />
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:st.color, flexShrink:0 }} />
            <span style={{ fontFamily:M, fontSize:compact?7:9, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--op-ink-3)', whiteSpace:'nowrap' }}>{st.name}</span>
          </div>
          <span style={{ fontFamily:M, fontSize:compact?14:18, fontWeight:500, color:'var(--op-ink)', fontStyle:'italic' }}>{fmt(st.grams)}g</span>
          <span style={{ fontFamily:M, fontSize:compact?7:8, color:'var(--op-ink-4)' }}>{st.batches} batches</span>
        </div>;
      })}
    </div>
    <div style={{ display:'flex', marginTop:compact?4:6 }}>
      {STAGES.map((st, i) => (
        <div key={i} style={{ width:(st.grams/TOTAL_G*100)+'%', display:'flex', flexWrap:'wrap', gap:'2px 6px', padding:'0 2px', minWidth:compact?44:60 }}>
          {st.notes.filter(n => n.sev).map((n, j) => (
            <span key={j} style={{ fontFamily:M, fontSize:compact?7:9, color:n.sev==='bad'?'var(--status-bad)':'var(--status-warn)', display:'inline-flex', alignItems:'center', gap:2, whiteSpace:'nowrap' }}>
              <span style={{ width:3, height:3, borderRadius:'50%', background:n.sev==='bad'?'var(--status-bad)':'var(--status-warn)', flexShrink:0 }} />{n.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>;
}

// ── Revenue Waterfall ───────────────────────────────

function RevenueWaterfall({ data, compact, tweaks }) {
  const max = data.projRevenue;
  const barH = compact ? 10 : 14;
  const gap = data.projRevenue - data.allocated;
  const ie = tweaks.italicMode === 'everywhere';
  const bars = [
    { label:'Projected', value:data.projRevenue, est:true, sub:'gross · derived 90d price', flag:'est', fill:'var(--accent)', op:0.3 },
    { label:'Allocated', value:data.allocated, est:false, sub:data.orders+' orders · '+data.lines+' lines', fill:'var(--op-ink)', op:0.25 },
    { label:'Realized', value:data.realized, est:false, sub:'$'+fmt(data.attrRealized)+' attr + $'+fmt(data.unattrRealized)+'u', fill:'var(--status-ok)', op:0.4 },
  ];
  return <div style={{ background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)', padding:compact?'12px 16px':'16px 24px' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:compact?10:14 }}>
      <span style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)' }}>Revenue flow</span>
      <span style={{ fontFamily:M, fontSize:compact?9:10, color:'var(--status-ok)', letterSpacing:'0.04em' }}>${fmt(gap)} sales headroom</span>
    </div>
    {bars.map((b, i) => (
      <div key={i} style={{ marginBottom:i<bars.length-1?(compact?10:14):0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:compact?2:3 }}>
          <span style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--op-ink-3)' }}>{b.label}</span>
          <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
            <span style={{ fontFamily:M, fontSize:compact?18:26, fontWeight:500, color:'var(--op-ink)', fontStyle:b.est&&ie?'italic':'normal' }}>${fmt(b.value)}</span>
            {b.flag && <span style={{ fontFamily:M, fontSize:8, fontStyle:'italic', color:'var(--op-ink-3)', textTransform:'uppercase' }}>{b.flag}</span>}
          </div>
        </div>
        <div style={{ position:'relative', height:barH, background:'var(--op-canvas)', borderRadius:2, border:'1px solid var(--op-line)', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:(b.value/max*100)+'%', background:b.fill, opacity:b.op, borderRadius:2 }} />
        </div>
        <div style={{ fontFamily:S, fontSize:compact?9:10, color:'var(--op-ink-3)', marginTop:2 }}>{b.sub}</div>
      </div>
    ))}
  </div>;
}

// ── Compact Room Strip ──────────────────────────────

function CompactRoomStrip({ data, tweaks, compact }) {
  return <div style={{ background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)', padding:compact?'12px 16px':'16px 24px' }}>
    <div style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--op-ink-3)', marginBottom:compact?6:8, display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:'#F43F5E', flexShrink:0 }} />Next room cohorts
    </div>
    {data.rooms.map((r, i) => <RoomRow key={i} d={r} tweaks={tweaks} compact={compact} />)}
    {data.overflow && tweaks.overflowPolicy !== 'hidden' && <div style={{ marginTop:4, fontSize:compact?9:10, fontFamily:M, color:data.overflow.severe>0?'var(--status-bad)':'var(--op-ink-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
      {tweaks.overflowPolicy==='severity'?`+${data.overflow.count} more · ${data.overflow.severe} severe`:`+${data.overflow.count} more`}
    </div>}
  </div>;
}

// ── Layout A: Vertical Story ────────────────────────

function VerticalStory({ data, tweaks, compact }) {
  return <div style={{ background:'var(--op-canvas)', padding:compact?'16px 20px':'24px 32px', display:'flex', flexDirection:'column', gap:compact?6:8 }}>
    <StagePipelineBar compact={compact} />
    <RevenueWaterfall data={data} compact={compact} tweaks={tweaks} />
    <CompactRoomStrip data={data} tweaks={tweaks} compact={compact} />
    <AtRiskSummary count={data.atRisk} sub={data.atRiskSub} compact={compact} />
  </div>;
}

// ── Layout B: Two-Column ────────────────────────────

function TwoColumnRollup({ data, tweaks, compact }) {
  return <div style={{ background:'var(--op-canvas)', padding:compact?'16px 20px':'24px 32px' }}>
    <div style={{ display:'grid', gridTemplateColumns:'5fr 3fr', gap:compact?6:8, alignItems:'start' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:compact?6:8 }}>
        <StagePipelineBar compact={compact} />
        <CompactRoomStrip data={data} tweaks={tweaks} compact={compact} />
      </div>
      <RevenueWaterfall data={data} compact={compact} tweaks={tweaks} />
    </div>
    <AtRiskSummary count={data.atRisk} sub={data.atRiskSub} compact={compact} />
  </div>;
}

// ── Layout C: Bento ─────────────────────────────────

function BentoRollup({ data, tweaks, compact }) {
  const ie = tweaks.italicMode === 'everywhere';
  const max = data.projRevenue;
  const tiles = [
    { label:'Gross projected', value:data.projRevenue, est:ie, sub:'gross · derived 90d', fill:'var(--accent)', op:0.25 },
    { label:'Allocated', value:data.allocated, est:false, sub:data.orders+' ord · '+data.lines+' ln', fill:'var(--op-ink)', op:0.2 },
    { label:'Realized', value:data.realized, est:false, sub:'$'+fmt(data.attrRealized)+'attr + $'+fmt(data.unattrRealized)+'u', fill:'var(--status-ok)', op:0.3 },
  ];
  return <div style={{ background:'var(--op-canvas)', padding:compact?'16px 20px':'24px 32px', display:'flex', flexDirection:'column', gap:compact?6:8 }}>
    <StagePipelineBar compact={compact} />
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1.2fr', gap:compact?6:8 }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ background:'var(--op-surface)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)', padding:compact?'10px 14px':'14px 20px' }}>
          <div style={{ fontFamily:M, fontSize:compact?9:10, textTransform:'uppercase', letterSpacing:'0.10em', color:'var(--op-ink-3)', marginBottom:compact?4:6 }}>{t.label}</div>
          <div style={{ fontFamily:M, fontSize:compact?20:28, fontWeight:500, color:'var(--op-ink)', fontStyle:t.est?'italic':'normal', lineHeight:1.1 }}>${fmt(t.value)}</div>
          <div style={{ height:compact?6:8, background:'var(--op-canvas)', borderRadius:2, marginTop:compact?6:8, border:'1px solid var(--op-line)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:(t.value/max*100)+'%', background:t.fill, opacity:t.op, borderRadius:2 }} />
          </div>
          <div style={{ fontFamily:S, fontSize:compact?8:9, color:'var(--op-ink-3)', marginTop:3 }}>{t.sub}</div>
        </div>
      ))}
      <CompactRoomStrip data={data} tweaks={tweaks} compact={compact} />
    </div>
    <AtRiskSummary count={data.atRisk} sub={data.atRiskSub} compact={compact} />
  </div>;
}

Object.assign(window, { StagePipelineBar, RevenueWaterfall, CompactRoomStrip, VerticalStory, TwoColumnRollup, BentoRollup });
})();
