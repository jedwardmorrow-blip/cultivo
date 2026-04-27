import type { TimeAnchor } from './data';

interface Props { anchor: TimeAnchor; onReturnLive: () => void; }

export function FacilityStateStrip({ anchor, onReturnLive }: Props) {
  const isLive = !!anchor.isLive;
  return (
    <div className={`fpl-state ${isLive ? '' : 'is-scrubbed'}`}>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">
          {isLive
            ? <><span className="fpl-state-pulse" />NORTHBAY · LIVE</>
            : <><span className="fpl-state-pulse scrubbed" />NORTHBAY · REPLAYING</>}
        </div>
        <div className="fpl-state-val">{anchor.stamp}</div>
        <div className="fpl-state-sub">
          {isLive
            ? '22 active rooms · 8,420 plants · 40th St facility'
            : <>{anchor.sub} · <button type="button" className="fpl-return-live" onClick={onReturnLive}>↩ return to live</button></>}
        </div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">TEMP</div>
        <div className="fpl-state-val">74.2<span className="unit">°F</span></div>
        <div className="fpl-state-sub">target 72–76</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">RH · FACILITY AVG</div>
        <div className={`fpl-state-val ${anchor.facilityRHWarn ? 'warn' : ''}`}>
          {anchor.facilityRH.toFixed(1)}<span className="unit">%</span>
        </div>
        <div className="fpl-state-sub"
             style={{ color: anchor.facilityRHWarn ? 'var(--status-warn)' : 'var(--op-ink-3)' }}>
          {anchor.facilityRHWarn
            ? (anchor.id === 'cyc-1' ? 'FLW-04 over · cycle Q1' : 'FLW-02 over')
            : 'within range'}
        </div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">VPD</div>
        <div className="fpl-state-val">1.18<span className="unit">kPa</span></div>
        <div className="fpl-state-sub">target 1.10–1.30</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">CO₂</div>
        <div className="fpl-state-val">1,042<span className="unit">ppm</span></div>
        <div className="fpl-state-sub">target 950–1,100</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">YIELD/SQFT · 30D</div>
        <div className="fpl-state-val">62.3<span className="unit">g</span></div>
        <div className="fpl-state-sub" style={{ color: 'var(--status-ok)' }}>+1.9 vs Q4</div>
      </div>
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">OPEN ATTENTION</div>
        <div className="fpl-alerts-stack">
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--status-bad)' }} /><strong>1</strong> urgent · FLW-02</div>
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--status-warn)' }} /><strong>4</strong> attention · FLW-01, FLW-04, FLW-09, VEG-02</div>
          <div className="fpl-alerts-line"><span className="dot" style={{ background: 'var(--accent)' }} /><strong>1</strong> from the Seed</div>
        </div>
      </div>
    </div>
  );
}
