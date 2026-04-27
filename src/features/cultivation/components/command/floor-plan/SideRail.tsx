function FplSpark({ d, color = 'var(--accent)', target }: { d: string; color?: string; target?: number }) {
  return (
    <svg viewBox="0 0 200 22" preserveAspectRatio="none" width="100%" height="22" fill="none" className="fpl-env-row-spark">
      {target ? <line x1="0" y1={target} x2="200" y2={target} stroke="rgba(232,224,212,0.16)" strokeDasharray="2 3" /> : null}
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function SideRail() {
  return (
    <div className="fpl-rail">
      <div className="fpl-rail-head">
        <div className="fpl-rail-eyebrow">
          <span className="pulse" />
          FOCUS · NEEDS YOU · 14M ELAPSED
        </div>
        <div className="fpl-rail-code">FLW-02 · FLOWER WK 6 · PHASE I</div>
        <h2 className="fpl-rail-name">Wedding Cake</h2>
        <div className="fpl-rail-meta">
          <span><strong>Plants</strong>612</span>
          <span><strong>Canopy</strong>3,200 sqft</span>
          <span><strong>Lighting</strong>12/12</span>
          <span><strong>In-room</strong>D.Reyes</span>
        </div>
      </div>

      <div className="fpl-rail-progress">
        <div className="fpl-rail-progress-row">
          <div className="fpl-rail-day">42<span className="of">/63</span></div>
          <div className="fpl-rail-day-meta">
            21d to harvest<br />
            <span style={{ color: 'var(--op-ink-3)' }}>est Mar 27</span>
          </div>
        </div>
        <div className="fpl-rail-bar">
          <div className="fpl-rail-bar-fill" style={{ width: '66.6%' }} />
        </div>
      </div>

      <div className="fpl-rail-section">
        <span>ENVIRONMENT</span>
        <span className="meta">last 4h · 1m</span>
      </div>
      <div className="fpl-env-stack">
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">RH</div>
          <FplSpark d="M0,18 L20,16 L40,14 L60,12 L80,10 L100,8 L120,6 L140,5 L160,4 L180,3 L200,2"
                    color="var(--status-bad)" target={6} />
          <div className="fpl-env-row-val bad">64.2<span className="unit">%</span></div>
          <div className="fpl-env-row-target">target ≤58</div>
        </div>
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">TEMP</div>
          <FplSpark d="M0,14 L20,13 L40,12 L60,11 L80,10 L100,9 L120,8 L140,9 L160,10 L180,11 L200,10" />
          <div className="fpl-env-row-val">76.4<span className="unit">°F</span></div>
          <div className="fpl-env-row-target">72–76</div>
        </div>
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">VPD</div>
          <FplSpark d="M0,10 L20,11 L40,12 L60,14 L80,15 L100,16 L120,17 L140,17 L160,18 L180,18 L200,18" />
          <div className="fpl-env-row-val">1.05<span className="unit">kPa</span></div>
          <div className="fpl-env-row-target">1.10–1.30</div>
        </div>
        <div className="fpl-env-row">
          <div className="fpl-env-row-label">CO₂</div>
          <FplSpark d="M0,12 L20,11 L40,10 L60,11 L80,13 L100,12 L120,11 L140,10 L160,9 L180,10 L200,11" />
          <div className="fpl-env-row-val">1,050<span className="unit">ppm</span></div>
          <div className="fpl-env-row-target">950–1,100</div>
        </div>
      </div>

      <div className="fpl-rail-alert urgent">
        <div className="fpl-rail-alert-meta">
          <span style={{ color: 'var(--op-ink)' }}>OPEN ALERT</span>
          <span className="tone">— urgent</span>
          <span className="time">14m ago</span>
        </div>
        <div className="fpl-rail-alert-title">Humidity 64.2% — past upper bound for week 6</div>
        <div className="fpl-rail-alert-detail">
          Sustained 38 minutes. Bud-rot risk window opens at 65%. AC return temp climbing in tandem.
        </div>
      </div>

      <button type="button" className="fpl-rail-chat-trigger">
        <span className="fpl-rail-chat-eyebrow">OPEN IN SEED →</span>
        <span className="fpl-rail-chat-prompt">FLW-02 pattern history across cycles</span>
      </button>

      <div className="fpl-rail-actions">
        <button type="button" className="fpl-rail-btn primary">Open dehumid program</button>
        <button type="button" className="fpl-rail-btn">Pull last cycle</button>
        <button type="button" className="fpl-rail-btn">Page Diego</button>
      </div>
    </div>
  );
}
