/* global React, Caps, Num, Delta, Pill, Icon */

function ExecutiveDashboard() {
  return (
    <div className="theme-dark" style={{
      width: 1440, height: 960,
      background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Top bar (compact) */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
              <span className="font-editorial" style={{ color: '#0A0A0A', fontSize: 16, fontWeight: 400, lineHeight: 1 }}>c</span>
            </div>
            <div className="font-editorial" style={{ fontSize: 18, fontWeight: 400 }}>Cultivo</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>Dashboard</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <span className="live-dot" /><span className="font-mono tnum">Live · production</span>
        </span>
      </div>

      <div style={{ flex: 1, padding: '32px 56px', overflow: 'auto' }} className="scroll-area">
        {/* Editorial header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <div>
            <Caps style={{ color: 'var(--accent)', marginBottom: 8 }}>Saturday · April 25, 2026</Caps>
            <div className="font-editorial" style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              Revenue is on pace.<br />
              <span style={{ color: 'var(--text-muted)' }}>Inventory is tight in Week 18.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, textAlign: 'right' }}>
            <div>
              <Caps>Month</Caps>
              <Num value="$284,400" size={20} />
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>78% to goal</div>
            </div>
            <div>
              <Caps>Quarter</Caps>
              <Num value="$812,000" size={20} />
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Q2 · 31 days left</div>
            </div>
          </div>
        </div>

        {/* Hero KPI band - 4 large + 1 hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 0, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 24 }}>
          {/* Hero — revenue today */}
          <div style={{ padding: 24, borderRight: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
            <Caps>Revenue · today</Caps>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <span className="font-editorial num-display" style={{ fontSize: 56, fontWeight: 300, letterSpacing: '-0.03em' }}>$24,180</span>
              <Delta dir="up" value="+18% vs Sat avg" />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              {['$18K','$22K','$24K','$19K','$23K','$28K','$24K'].map((v,i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div style={{ height: 36, background: 'var(--bg-inset)', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${[60,75,82,65,78,95,82][i]}%`, background: i === 6 ? 'var(--accent)' : 'var(--text-faint)', opacity: i === 6 ? 1 : 0.4 }} />
                  </div>
                  <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>{['M','T','W','T','F','S','S'][i]}</div>
                </div>
              ))}
            </div>
          </div>
          {[
            { l: 'Active orders', v: '47', d: '+5', dd: 'up', s: '12 ship today' },
            { l: 'Inventory · packaged', v: '1,284', unit: 'units', s: '14 days runway' },
            { l: 'A/R outstanding', v: '$94K', d: '−$8K', dd: 'down', s: '6 over 30d' },
          ].map((k, i) => (
            <div key={i} style={{ padding: 24, borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <Caps style={{ marginBottom: 10 }}>{k.l}</Caps>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <Num value={k.v} unit={k.unit} size={32} weight={400} />
              </div>
              {k.d && <div style={{ marginTop: 4 }}><Delta dir={k.dd} value={k.d} /></div>}
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* Bento grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Inventory funnel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <Caps>Inventory funnel</Caps>
                <div className="font-editorial" style={{ fontSize: 20, fontWeight: 400, marginTop: 4 }}>Seed → Sale</div>
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                <Pill tone="success">Healthy</Pill>
              </div>
            </div>
            {[
              { stage: 'Live plants',     v: '4,872', sub: '14 rooms',           pct: 100 },
              { stage: 'Drying',          v: '1,680', sub: '4 dry rooms · 4–7d', pct: 35 },
              { stage: 'Cured · bulk',    v: '892',   sub: 'lbs · 12 batches',   pct: 18 },
              { stage: 'Packaged',        v: '1,284', sub: 'units in lockup',    pct: 26 },
              { stage: 'Allocated',       v: '784',   sub: 'units · 47 orders',  pct: 16 },
            ].map((r, i) => (
              <div key={r.stage} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 16, alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.stage}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{r.sub}</div>
                </div>
                <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 0, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${r.pct}%`, background: 'var(--accent)' }} />
                </div>
                <span className="font-mono tnum" style={{ fontSize: 16, textAlign: 'right' }}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Top accounts */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <Caps style={{ marginBottom: 4 }}>Top accounts · MTD</Caps>
            <div className="font-editorial" style={{ fontSize: 20, fontWeight: 400, marginBottom: 16 }}>Concentration</div>
            {[
              ['High Tide Co.',     '$48,200', 'up',   '+12%'],
              ['Greenhouse 21',     '$32,400', 'up',   '+4%'],
              ['Verdant Provisions','$28,900', 'flat', '0%'],
              ['Farside Coop',      '$21,100', 'down', '−8%'],
              ['Westline',          '$18,400', 'up',   '+22%'],
            ].map(([n, v, dd, d], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{String(i+1).padStart(2,'0')}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono tnum" style={{ fontSize: 14 }}>{v}</div>
                  <Delta dir={dd} value={d} />
                </div>
              </div>
            ))}
          </div>

          {/* Order status */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <Caps style={{ marginBottom: 4 }}>Orders</Caps>
            <div className="font-editorial" style={{ fontSize: 20, fontWeight: 400, marginBottom: 16 }}>47 active</div>
            {[
              ['Draft',           4,  'neutral'],
              ['Confirmed',       18, 'info'],
              ['Allocated',       12, 'accent'],
              ['Out for delivery',8,  'warning'],
              ['Awaiting payment',5,  'pending'],
            ].map(([s, c, tone], i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 13 }}>{s}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, height: 3, background: 'var(--bg-inset)' }}>
                    <div style={{ width: `${(c/47)*100}%`, height: '100%', background: tone === 'warning' ? '#B8862E' : tone === 'info' ? '#3D6B9F' : tone === 'accent' ? 'var(--accent)' : tone === 'pending' ? '#7B6FA8' : 'var(--text-faint)' }} />
                  </div>
                  <span className="font-mono tnum" style={{ fontSize: 14, width: 24, textAlign: 'right' }}>{c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Production sessions row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <Caps style={{ marginBottom: 4 }}>Production · live</Caps>
            <div className="font-editorial" style={{ fontSize: 20, fontWeight: 400, marginBottom: 16 }}>3 sessions in flight</div>
            {[
              { type: 'Trim',    crew: 'Crew B', strain: 'Pink Buffalo', progress: 0.62, eta: '14:30' },
              { type: 'Pack',    crew: 'Crew A', strain: 'GG #4',         progress: 0.38, eta: '16:00' },
              { type: 'Bucking', crew: 'Crew C', strain: 'Lemon Meringue', progress: 0.85, eta: '12:15' },
            ].map((p, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.type} · {p.strain}</span>
                  <span className="font-mono tnum" style={{ fontSize: 12, color: 'var(--text-muted)' }}>ETA {p.eta}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 60 }}>{p.crew}</span>
                  <div style={{ flex: 1, height: 3, background: 'var(--bg-inset)' }}>
                    <div style={{ width: `${p.progress * 100}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <span className="font-mono tnum" style={{ fontSize: 11, width: 32, textAlign: 'right' }}>{Math.round(p.progress * 100)}%</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <Caps style={{ marginBottom: 4 }}>Pipeline · 6 weeks</Caps>
            <div className="font-editorial" style={{ fontSize: 20, fontWeight: 400, marginBottom: 16 }}>2,140 lbs projected</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 }}>
              {[420, 380, 290, 410, 360, 280].map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span className="font-mono tnum" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{v}</span>
                  <div style={{ width: '100%', background: i === 0 ? 'var(--accent)' : 'var(--text-faint)', opacity: i === 0 ? 1 : 0.35, height: `${(v / 420) * 70}%` }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {['W17','W18','W19','W20','W21','W22'].map(w => <div key={w} className="font-mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>{w}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* The Eye */}
      <div style={{ position: 'absolute', right: 32, bottom: 24, width: 44, height: 44, borderRadius: 22, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(14,20,16,0.25)' }}>
        <Icon name="eye" size={18} color="#B8C485" />
      </div>
    </div>
  );
}

window.ExecutiveDashboard = ExecutiveDashboard;
