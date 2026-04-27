import { useState } from 'react';
import { TIME_ANCHORS } from './data';
import { FloorPlanSVG } from './FloorPlanSVG';
import { SideRail } from './SideRail';
import { FacilityStateStrip } from './FacilityStateStrip';
import { BottomTimeline } from './BottomTimeline';
import './floor-plan.css';

export function FloorPlanLive() {
  const [anchorIdx, setAnchorIdx] = useState(0);
  const anchor = TIME_ANCHORS[anchorIdx];
  const isLive = !!anchor.isLive;

  return (
    <div className={`fpl-root product`}>
      <div className={`fpl artb ${isLive ? '' : 'is-scrubbed'}`}>
        {/* Top nav (shared chrome from coo-desk) */}
        <div className="coo-nav">
          <div className="coo-nav-l">
            <span className="coo-nav-word">CULTIVO</span>
            <div className="coo-nav-sep" />
            <div className="coo-nav-tabs">
              <span className="coo-nav-tab is-active">Cultivation</span>
              <span className="coo-nav-tab">Distribution</span>
              <span className="coo-nav-tab">Compliance</span>
              <span className="coo-nav-tab">Finance</span>
              <span className="coo-nav-tab">People</span>
            </div>
          </div>
          <div className="coo-nav-r">
            <span>40th St Facility · Phase I + II</span>
            <span className="role">D.Reyes — Head Grower</span>
            <span className="build">v2.4.7 · synced 0:14</span>
          </div>
        </div>
        <div className="coo-subnav">
          <span className="coo-subtab is-active">Floor<span className="count">·live</span></span>
          <span className="coo-subtab">Rooms<span className="count">22</span></span>
          <span className="coo-subtab">Plants<span className="count">8,420</span></span>
          <span className="coo-subtab">Schedule</span>
          <span className="coo-subtab">Environment</span>
          <span className="coo-subtab">Harvest<span className="count">3 due</span></span>
          <span className="coo-subtab">Inputs</span>
          <span className="coo-subtab">Reports</span>
        </div>

        <FacilityStateStrip anchor={anchor} onReturnLive={() => setAnchorIdx(0)} />

        <div className="fpl-main">
          <div className="fpl-canvas">
            <div className="fpl-canvas-cap">
              <div>
                <div className="fpl-canvas-eyebrow">
                  FACILITY · 40TH ST · PHASE I + II · 22 ROOMS
                  {!isLive && <span className="fpl-canvas-replay">  —  replaying · {anchor.label}</span>}
                </div>
                <h1 className="fpl-canvas-h">
                  {isLive ? 'Floor plan, live' : 'Floor plan, replayed'}
                  <em>{isLive ? 'state at 10:42:18' : `state at ${anchor.stamp.split(' · ')[1] || anchor.stamp}`}</em>
                </h1>
                {anchor.headline ? (
                  <div className="fpl-canvas-headline">◇ {anchor.headline}</div>
                ) : null}
              </div>
              <div className="fpl-canvas-legend">
                <span><span className="swatch" style={{ background: 'rgba(255,255,255,0.04)' }} />nominal</span>
                <span><span className="swatch" style={{ background: 'rgba(232,224,212,0.18)' }} />active</span>
                <span><span className="swatch" style={{ background: 'rgba(200,148,58,0.45)' }} />attention</span>
                <span><span className="swatch" style={{ background: 'rgba(197,106,106,0.65)' }} />urgent</span>
              </div>
            </div>
            <div className="fpl-svg-wrap">
              <FloorPlanSVG anchor={anchor} anchorIdx={anchorIdx} onScrub={setAnchorIdx} />
              <div className="fpl-compass">
                <span style={{ fontSize: 11, color: 'var(--op-ink-2)' }}>N</span>
                <svg width="18" height="22" viewBox="0 0 18 22">
                  <path d="M9 0 L9 22 M9 0 L4 6 M9 0 L14 6"
                        stroke="rgba(245,244,241,0.32)" strokeWidth="1" fill="none" />
                </svg>
              </div>
              <div className="fpl-scalebar">
                <div className="fpl-scalebar-line" />
                <span>50 FT</span>
              </div>
            </div>
          </div>

          <SideRail />
        </div>

        <BottomTimeline />
      </div>
    </div>
  );
}
