/* global React */

function SystemRef() {
  return (
    <div className="theme-dark" style={{
      width: 1440, padding: 56,
      background: 'var(--bg)', color: 'var(--text)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="caps" style={{ color: 'var(--accent)', marginBottom: 8 }}>Cultivo · Design Language v1</div>
          <div className="font-editorial" style={{ fontSize: 64, fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            A working surface<br />
            for complex operations.
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 28, maxWidth: 600, lineHeight: 1.55 }}>
            Cultivo is a seed-to-sale operations platform. The interface is dense by necessity. This system makes that density legible — through hairlines, tabular numerics, and a disciplined three-tier reveal: <em>glance, scan, drill.</em>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Caps>Operator daylight</Caps>
          <div className="font-mono tnum" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>v1.0 · 2026.04</div>
        </div>
      </div>

      {/* ── Principles ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <SectionHeader kicker="01 · Principles" title="Five rules for handling complexity" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
          {[
            { n: '01', t: 'Glance, scan, drill', d: 'Every screen states ≤5 numbers, exposes a working surface, then opens a detail rail. Never all three at once.' },
            { n: '02', t: 'Hairlines, not boxes', d: '1px dividers replace cards where possible. A card earns its elevation; most rows do not need one.' },
            { n: '03', t: 'Numbers are the design', d: 'Tabular mono numerics, right-aligned. Deltas in tiny caps. No decoration where a number suffices.' },
            { n: '04', t: 'Status is shape + position', d: 'Color is reinforcement, not a load-bearing channel. A square chip = stage. A pill = state. A dot = live.' },
            { n: '05', t: 'The Eye is contextual', d: 'AI surfaces what the screen needs. Floating, but pre-loaded with prompts derived from current view + selection.' },
          ].map(p => (
            <div key={p.n}>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8 }}>{p.n}</div>
              <div className="font-editorial" style={{ fontSize: 18, fontWeight: 400, marginBottom: 8, letterSpacing: '-0.01em' }}>{p.t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Type ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <SectionHeader kicker="02 · Typography" title="Three voices, one conversation" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, alignItems: 'flex-start' }}>
          <div>
            <Caps>Display · Source Serif</Caps>
            <div className="font-editorial" style={{ fontSize: 56, lineHeight: 1, fontWeight: 300, marginTop: 12, letterSpacing: '-0.02em' }}>Aa</div>
            <div className="font-editorial" style={{ fontSize: 22, marginTop: 16, fontWeight: 400 }}>Page titles, KPI heroes, one editorial moment per screen.</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>weights 300, 400 · onum, pnum</div>
          </div>
          <div>
            <Caps>UI · Inter</Caps>
            <div style={{ fontSize: 56, lineHeight: 1, fontWeight: 400, marginTop: 12, letterSpacing: '-0.02em' }}>Aa</div>
            <div style={{ fontSize: 14, marginTop: 16, lineHeight: 1.55 }}>Body, labels, table cells, buttons. Calm geometric grotesk; gets out of the way.</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>weights 400, 500, 600 · ss01, cv11</div>
          </div>
          <div>
            <Caps>Numerics · JetBrains Mono</Caps>
            <div className="font-mono" style={{ fontSize: 56, lineHeight: 1, fontWeight: 400, marginTop: 12, letterSpacing: '-0.04em' }}>0123</div>
            <div className="font-mono tnum" style={{ fontSize: 14, marginTop: 16, lineHeight: 1.55 }}>4,872 lbs · $128,440 · 67.3% · 2026-04-25</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>tnum, zero-slash · always right-aligned in tables</div>
          </div>
        </div>

        <div style={{ marginTop: 32, padding: 24, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
          <Caps style={{ marginBottom: 12 }}>Scale</Caps>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 32, flexWrap: 'wrap' }}>
            {[
              { s: 64, l: 'Display', f: 'editorial' },
              { s: 40, l: 'Title', f: 'editorial' },
              { s: 24, l: 'Hero num', f: 'mono' },
              { s: 18, l: 'Section', f: 'editorial' },
              { s: 14, l: 'Body', f: 'ui' },
              { s: 12, l: 'Meta', f: 'ui' },
              { s: 10, l: 'Caps', f: 'caps' },
            ].map(item => (
              <div key={item.l} style={{ textAlign: 'left' }}>
                <div
                  className={item.f === 'editorial' ? 'font-editorial' : item.f === 'mono' ? 'font-mono tnum' : ''}
                  style={{
                    fontSize: item.s, lineHeight: 1, fontWeight: item.f === 'editorial' ? 300 : 400,
                    letterSpacing: item.s > 30 ? '-0.02em' : 0,
                    textTransform: item.f === 'caps' ? 'uppercase' : 'none',
                    fontWeight: item.f === 'caps' ? 500 : (item.f === 'editorial' ? 300 : 400),
                  }}
                >Cultivo</div>
                <div className="caps" style={{ marginTop: 6 }}>{item.l} · {item.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Color ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <SectionHeader kicker="03 · Color" title="Neutral first. Color reinforces, never carries." />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 32 }}>
          {/* Surfaces */}
          <div>
            <Caps style={{ marginBottom: 12 }}>Surfaces · daylight</Caps>
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)' }}>
              {[
                { c: '#FAF7F2', n: 'bg' },
                { c: '#F4EFE6', n: 'inset' },
                { c: '#FFFFFF', n: 'surface' },
                { c: '#F8F4EC', n: 'alt' },
                { c: '#E8E1D2', n: 'border' },
              ].map(s => (
                <div key={s.n} style={{ flex: 1, background: s.c, height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8, borderRight: '1px solid rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 10, color: '#1A1A1A', opacity: 0.6, fontFamily: 'JetBrains Mono, monospace' }}>{s.c}</div>
                  <div style={{ fontSize: 10, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.n}</div>
                </div>
              ))}
            </div>

            <Caps style={{ marginBottom: 12, marginTop: 20 }}>Surfaces · command (dark)</Caps>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { c: '#0E1410', n: 'bg' },
                { c: '#0A0F0C', n: 'inset' },
                { c: '#161D18', n: 'surface' },
                { c: '#1B231D', n: 'alt' },
                { c: '#2A332D', n: 'border' },
              ].map(s => (
                <div key={s.n} style={{ flex: 1, background: s.c, height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
                  <div className="font-mono" style={{ fontSize: 10, color: '#0A0A0A', opacity: 0.7 }}>{s.c}</div>
                  <div className="caps" style={{ color: '#0A0A0A' }}>{s.n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand */}
          <div>
            <Caps style={{ marginBottom: 12 }}>Brand</Caps>
            <div style={{ background: 'var(--accent)', height: 80, padding: 12, color: '#0A0A0A' }}>
              <div className="caps" style={{ color: '#0A0A0A', opacity: 0.7 }}>Olive · Accent</div>
              <div className="font-mono" style={{ fontSize: 11, marginTop: 4 }}>#5C6B3F</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, background: 'var(--accent-soft)', height: 40, padding: 8 }}>
                <div className="font-mono" style={{ fontSize: 10, color: '#1A1A1A', opacity: 0.7 }}>#8A9968</div>
              </div>
              <div style={{ flex: 1, background: '#0A0A0A', height: 40, padding: 8 }}>
                <div className="font-mono" style={{ fontSize: 10, color: '#0A0A0A', opacity: 0.7 }}>#3A4527</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
              One olive. Echoes plant without leaning into "weed green." Used for: brand mark, primary CTAs, kicker labels, the live-data dot.
            </div>
          </div>

          {/* Stages */}
          <div>
            <Caps style={{ marginBottom: 12 }}>Stages</Caps>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['clone', '#5BA8C7', 'Clone'],
                ['veg', '#5C8F5C', 'Veg'],
                ['flower', '#C77D7D', 'Flower'],
                ['harvest', '#D4A24C', 'Harvest'],
                ['cure', '#8A6FA8', 'Cure'],
                ['package', '#5C6B9F', 'Package'],
              ].map(([k, c, l]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, background: c, borderRadius: 1 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{l}</span>
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Components ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <SectionHeader kicker="04 · Components" title="Atoms in the wild" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <Caps style={{ marginBottom: 12 }}>KPI block — three densities</Caps>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <KPI hero label="Active plants" value="4,872" delta="+312 this wk" deltaDir="up" sub="Across 14 rooms · 8 strains" />
              <KPI label="In flower" value="2,140" delta="44%" deltaDir="flat" />
              <KPI label="Days to next harvest" value="7" unit="d" />
            </div>
          </div>

          <div>
            <Caps style={{ marginBottom: 12 }}>Pills + chips</Caps>
            <div style={{ display: 'flex', gap: 8, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
              <Pill tone="success">Live</Pill>
              <Pill tone="warning">Stale 4m</Pill>
              <Pill tone="danger">Over-allocated</Pill>
              <Pill tone="info">Pending QA</Pill>
              <Pill tone="accent">In flight</Pill>
              <Pill>Idle</Pill>
              <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
              <Stage kind="veg" label="Veg · 14d" />
              <Stage kind="flower" label="Flower · 42d" />
              <Stage kind="harvest" label="Harvest · 2d" />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <Caps style={{ marginBottom: 12 }}>Hairline data row — the workhorse</Caps>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1.5fr 1fr 1fr 1fr 1fr 80px', gap: 16, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
                <Caps>#</Caps>
                <Caps>Batch · Strain</Caps>
                <Caps>Stage</Caps>
                <Caps>Plants</Caps>
                <Caps style={{ textAlign: 'right' }}>Day</Caps>
                <Caps style={{ textAlign: 'right' }}>Yield est.</Caps>
                <Caps style={{ textAlign: 'right' }}>Δ</Caps>
              </div>
              {[
                ['01', '260214-PB', 'Pink Buffalo', 'flower', 480, 42, '124 lbs', 'up', '+3%'],
                ['02', '260301-GG', 'GG #4', 'flower', 312, 28, '78 lbs', 'flat', '0%'],
                ['03', '260318-WW', 'White Widow', 'veg', 248, 14, '—', 'down', '−2 pl'],
                ['04', '260322-LM', 'Lemon Meringue', 'harvest', 196, 56, '52 lbs', 'up', '+1%'],
              ].map((r, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '32px 1.5fr 1fr 1fr 1fr 1fr 80px',
                  gap: 16, padding: '10px 16px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center', fontSize: 13,
                }}>
                  <span className="font-mono" style={{ color: 'var(--text-faint)', fontSize: 11 }}>{r[0]}</span>
                  <div>
                    <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r[1]}</div>
                    <div style={{ fontWeight: 500 }}>{r[2]}</div>
                  </div>
                  <Stage kind={r[3]} label={r[3].replace(/^./, c => c.toUpperCase())} />
                  <span className="font-mono tnum">{r[4].toLocaleString()}</span>
                  <span className="font-mono tnum" style={{ textAlign: 'right' }}>{r[5]}</span>
                  <span className="font-mono tnum" style={{ textAlign: 'right' }}>{r[6]}</span>
                  <span style={{ textAlign: 'right' }}><Delta dir={r[7]} value={r[8]} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────  */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid var(--border)' }}>
        <Caps>Cultivo · Operator Daylight · 2026</Caps>
        <Caps>Demo-ready · v1.0</Caps>
      </div>
    </div>
  );
}

window.SystemRef = SystemRef;
