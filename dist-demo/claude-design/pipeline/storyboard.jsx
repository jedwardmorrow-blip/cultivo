// Pipeline · COO Morning Arc — 6-frame storyboard
// Static filmstrip, not motion. Tests that the surface behaves as a moment in someone's day.
(() => {
const M = "'IBM Plex Mono', ui-monospace, monospace";
const S = "'IBM Plex Sans', system-ui, sans-serif";
const C = "'Caveat', cursive";

function StoryFrame({ number, caption, children, note }) {
  return <div style={{ display:'flex', flexDirection:'column', gap:6, width:210, flexShrink:0 }}>
    <div style={{ fontFamily:M, fontSize:9, color:'var(--op-ink-4)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Frame {number}</div>
    <div style={{ background:'var(--op-canvas)', border:'1px solid var(--op-line)', borderRadius:'var(--r-sm)', height:150, position:'relative', overflow:'hidden', padding:8 }}>
      {children}
    </div>
    <div style={{ fontFamily:C, fontSize:15, color:'var(--accent)', lineHeight:1.3 }}>{caption}</div>
    {note && <div style={{ fontFamily:M, fontSize:8, color:'var(--op-ink-4)', lineHeight:1.4, letterSpacing:'0.02em' }}>{note}</div>}
  </div>;
}

function MiniHeader({ persona }) {
  return <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
    <div style={{ fontFamily:M, fontSize:6, color:'var(--accent)', background:'var(--op-surface-2)', padding:'1px 4px', borderRadius:2, border:'1px solid var(--op-line-strong)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{persona || 'COO'}</div>
    <div style={{ flex:1 }} />
    <div style={{ fontFamily:M, fontSize:5, color:'var(--op-ink-4)' }}>26 Apr</div>
  </div>;
}

function MiniBanner() {
  return <div style={{ height:8, borderBottom:'1px solid var(--op-line)', marginBottom:4, display:'flex', alignItems:'center' }}>
    <div style={{ width:'80%', height:3, background:'var(--op-ink-4)', borderRadius:1, opacity:0.5 }} />
  </div>;
}

function MiniStrip({ highlight }) {
  const rooms = [
    { code:'06', color:'var(--status-bad)', w:'30%' },
    { code:'08', color:'var(--op-ink-4)', w:'45%' },
    { code:'10', color:'var(--op-ink-4)', w:'25%' },
  ];
  return <div style={{ background:'var(--op-surface)', borderRadius:2, padding:4, position:'relative' }}>
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
      <div style={{ width:40, height:3, background:'var(--op-ink-4)', borderRadius:1 }} />
      <div style={{ fontFamily:M, fontSize:5, color:'var(--op-ink-3)', fontStyle:'italic' }}>98,412g</div>
    </div>
    {rooms.map((r, i) => (
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, height:10, borderBottom:'1px solid var(--op-line)', opacity: highlight === r.code ? 1 : 0.6 }}>
        <div style={{ fontFamily:M, fontSize:5.5, color:r.color, fontWeight:500, width:14 }}>F-{r.code}</div>
        <div style={{ width:r.w, height:3, background:r.color, borderRadius:1, opacity:0.5 }} />
      </div>
    ))}
    {highlight && <div style={{ position:'absolute', top: highlight==='06'?14:highlight==='08'?24:34, left:2, right:2, height:12, border:'1.5px solid var(--status-warn)', borderRadius:2, pointerEvents:'none' }} />}
  </div>;
}

function MiniTiles() {
  return <div style={{ display:'flex', gap:2, marginTop:2 }}>
    {[0,1,2].map(i => (
      <div key={i} style={{ flex:1, background:'var(--op-surface)', borderRadius:2, padding:3 }}>
        <div style={{ width:'60%', height:2, background:'var(--op-ink-4)', borderRadius:1, marginBottom:3, opacity:0.4 }} />
        <div style={{ width:'80%', height:5, background:'var(--op-ink-4)', borderRadius:1 }} />
      </div>
    ))}
  </div>;
}

function MiniRow() {
  return <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:2, marginTop:2 }}>
    <MiniStrip />
    {[0,1,2].map(i => (
      <div key={i} style={{ background:'var(--op-surface)', borderRadius:2, padding:3 }}>
        <div style={{ width:'60%', height:2, background:'var(--op-ink-4)', borderRadius:1, marginBottom:3, opacity:0.4 }} />
        <div style={{ width:'80%', height:5, background:'var(--op-ink-4)', borderRadius:1 }} />
      </div>
    ))}
  </div>;
}

function MiniOverlay() {
  return <div style={{ position:'absolute', top:6, left:6, right:6, bottom:6, background:'var(--op-surface-2)', border:'1px solid var(--op-line-strong)', borderRadius:'var(--r-sm)', padding:8 }}>
    <div style={{ fontFamily:M, fontSize:6, color:'var(--op-ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Batch deep-dive</div>
    <div style={{ fontFamily:M, fontSize:9, color:'var(--op-ink)', marginBottom:2 }}>251212-SWF</div>
    <div style={{ fontFamily:S, fontSize:7, color:'var(--op-ink-2)', marginBottom:6 }}>Swamp Water Fumez · FLW-08 · Drying d17</div>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
      {['5,799g projected', '$18,210 revenue', 'd17 in stage', '0 allocated'].map((t, i) => (
        <div key={i} style={{ background:'var(--op-canvas)', borderRadius:2, padding:'2px 4px' }}>
          <div style={{ fontFamily:M, fontSize:6, color:'var(--op-ink-2)' }}>{t}</div>
        </div>
      ))}
    </div>
    <div style={{ marginTop:6, borderTop:'1px solid var(--op-line)', paddingTop:4 }}>
      <div style={{ fontFamily:M, fontSize:5, color:'var(--op-ink-3)', textTransform:'uppercase', marginBottom:3 }}>Stage timeline</div>
      <div style={{ display:'flex', gap:2 }}>
        {['cult','dry','proc','inv'].map((s, i) => (
          <div key={i} style={{ flex:1, height:4, background:i<=1?'var(--status-ok)':'var(--op-ink-4)', borderRadius:1, opacity:i<=1?0.6:0.2 }} />
        ))}
      </div>
    </div>
  </div>;
}

function MiniAtRisk() {
  return <div style={{ position:'absolute', right:6, top:20, bottom:6, width:'42%', background:'var(--op-surface-2)', border:'1px solid var(--op-line-strong)', borderRadius:'var(--r-sm)', padding:6 }}>
    <div style={{ fontFamily:M, fontSize:6, color:'var(--status-warn)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5, display:'flex', alignItems:'center', gap:3 }}>
      <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--status-warn)' }} />5 at risk
    </div>
    {['251230-KMS','251127-HSC','251203-GAP','251231-STP','260127-ORS'].map((code, i) => (
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:3, paddingBottom:3, borderBottom:'1px solid var(--op-line)' }}>
        <span style={{ width:3, height:3, borderRadius:'50%', background:i<2?'var(--status-bad)':'var(--status-warn)', flexShrink:0 }} />
        <span style={{ fontFamily:M, fontSize:5.5, color:'var(--op-ink-2)' }}>{code}</span>
      </div>
    ))}
  </div>;
}

function Storyboard() {
  return <div style={{ display:'flex', gap:20, padding:'8px 0', overflowX:'auto' }}>
    <StoryFrame number={1} caption="Start of day. Rollup loads. Five-second scan begins." note="Banner pauses 12s before cycling.">
      <MiniHeader />
      <MiniBanner />
      <MiniRow />
    </StoryFrame>

    <StoryFrame number={2} caption="Eye lands on FLW-06 +5d. Red callout announces overdue harvest." note="Status-bad color pulls attention without motion.">
      <MiniHeader />
      <MiniBanner />
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:2, marginTop:2 }}>
        <MiniStrip highlight="06" />
        {[0,1,2].map(i => (
          <div key={i} style={{ background:'var(--op-surface)', borderRadius:2, padding:3 }}>
            <div style={{ width:'60%', height:2, background:'var(--op-ink-4)', borderRadius:1, marginBottom:3, opacity:0.4 }} />
            <div style={{ width:'80%', height:5, background:'var(--op-ink-4)', borderRadius:1 }} />
          </div>
        ))}
      </div>
      <div style={{ position:'absolute', top:30, right:10, fontFamily:C, fontSize:12, color:'var(--status-bad)', transform:'rotate(-3deg)' }}>← FLW-06 +5d</div>
    </StoryFrame>

    <StoryFrame number={3} caption="Drills into FLW-08. Deep-dive overlay shows SWF drying d17." note="Out of scope for this session — wireframe only.">
      <MiniHeader />
      <MiniOverlay />
    </StoryFrame>

    <StoryFrame number={4} caption="Closes overlay. Returns to rollup. Scan continues." note="AnimatePresence exit, layoutId back.">
      <MiniHeader />
      <MiniBanner />
      <MiniRow />
      <div style={{ position:'absolute', top:20, right:8, fontFamily:C, fontSize:11, color:'var(--op-ink-3)', transform:'rotate(-2deg)' }}>← back</div>
    </StoryFrame>

    <StoryFrame number={5} caption="Persona → Cultivation Manager. Emphasis shifts to cycle-time, plant counts." note="Same data, different filter-and-emphasis.">
      <MiniHeader persona="CM" />
      <MiniBanner />
      <MiniRow />
      <div style={{ position:'absolute', top:4, left:4, fontFamily:C, fontSize:11, color:'var(--accent)', transform:'rotate(-1deg)' }}>persona swap →</div>
    </StoryFrame>

    <StoryFrame number={6} caption="Opens at-risk list. Five items, badge-first scan." note="At-risk panel slides in from right rail.">
      <MiniHeader />
      <MiniBanner />
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:2, marginTop:2, opacity:0.5 }}>
        <MiniStrip />
        {[0,1,2].map(i => <div key={i} style={{ background:'var(--op-surface)', borderRadius:2, padding:3 }}>
          <div style={{ width:'60%', height:2, background:'var(--op-ink-4)', borderRadius:1, marginBottom:3, opacity:0.4 }} />
          <div style={{ width:'80%', height:5, background:'var(--op-ink-4)', borderRadius:1 }} />
        </div>)}
      </div>
      <MiniAtRisk />
    </StoryFrame>
  </div>;
}

window.Storyboard = Storyboard;
})();
