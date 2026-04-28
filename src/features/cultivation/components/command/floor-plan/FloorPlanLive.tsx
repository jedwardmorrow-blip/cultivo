import { useEffect, useMemo, useState } from 'react';
import { TIME_ANCHORS } from './data';
import { FloorPlanSVG } from './FloorPlanSVG';
import { SideRail } from './SideRail';
import { FacilityStateStrip } from './FacilityStateStrip';
import { BottomTimeline } from './BottomTimeline';
import { InventoryRibbon } from './InventoryRibbon';
import { useFloorPlanData } from './useFloorPlanData';
import './floor-plan.css';

interface FloorPlanLiveProps {
  /** Hide the section chrome when mounted inside HubShell or the home dashboard. */
  embedded?: boolean;
}

export function FloorPlanLive({ embedded = false }: FloorPlanLiveProps) {
  const [anchorIdx, setAnchorIdx] = useState(0);
  const anchor = TIME_ANCHORS[anchorIdx];
  const isLive = !!anchor.isLive;

  const { rooms } = useFloorPlanData();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isRailOpen, setIsRailOpen] = useState(false);

  // Collapsed by default. The dashboard does NOT decide what's urgent for the
  // operator — they pick the focus by clicking. X dismisses. Click a different
  // room while closed: rail re-opens with the new room.
  const handleRoomClick = (code: string) => {
    setSelectedCode(code);
    setIsRailOpen(true);
  };
  const handleRailClose = () => {
    setIsRailOpen(false);
  };

  // Off-cycle micro-stats: pull plant/strain counts from FACILITY fixture
  // for rooms not in v_room_operational_state (CLN/MOM/LAB/WATER).
  // CURE removed 2026-04-27 — does not exist in the real 40th St facility.
  const offCycleStats = useMemo(() => {
    const mom = rooms.find((r) => r.code === 'MOM');
    const cln = rooms.find((r) => r.code === 'CLN');
    return [
      mom && {
        label: 'MOM',
        value: `${mom.total_plants ?? 0} mothers · ${mom.strain_count ?? 0} strains`,
      },
      cln && {
        label: 'CLN',
        value: `${cln.total_plants ?? 0} cuttings`,
      },
    ].filter(Boolean) as Array<{ label: string; value: string }>;
  }, [rooms]);

  return (
    <div className={`fpl-root ${embedded ? 'is-embedded' : ''} product`}>
      <div className={`fpl artb ${isLive ? '' : 'is-scrubbed'}`}>
        {/* Internal coo-nav suppressed when embedded inside the cultivo TopNav. */}
        {embedded ? null : (
        <>
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
        </>
        )}

        <FacilityStateStrip rooms={rooms} />

        <div className={`fpl-main ${isRailOpen ? 'rail-open' : 'rail-closed'}`}>
          <div className="fpl-canvas">
            <div className="fpl-canvas-cap">
              <div>
                <div className="fpl-canvas-eyebrow">
                  FACILITY · 40TH ST · PHASE I + II · 22 ROOMS
                  {!isLive && <span className="fpl-canvas-replay">  —  replaying · {anchor.label}</span>}
                </div>
                <h1 className="fpl-canvas-h">
                  Floor plan, live
                </h1>
              </div>
              <div className="fpl-canvas-legend">
                <span><span className="swatch" style={{ background: 'rgba(255,255,255,0.04)' }} />nominal</span>
                <span><span className="swatch" style={{ background: 'rgba(232,224,212,0.18)' }} />active</span>
                <span><span className="swatch" style={{ background: 'rgba(200,148,58,0.45)' }} />attention</span>
                <span><span className="swatch" style={{ background: 'rgba(197,106,106,0.65)' }} />urgent</span>
              </div>
            </div>
            <div className="fpl-svg-wrap">
              <FloorPlanSVG
                anchor={anchor}
                anchorIdx={anchorIdx}
                onScrub={setAnchorIdx}
                liveRooms={rooms}
                selectedCode={selectedCode}
                onRoomClick={handleRoomClick}
              />
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

            {offCycleStats.length > 0 && (
              <div className="fpl-offcycle">
                {offCycleStats.map((s) => (
                  <span key={s.label}>
                    <strong>{s.label}</strong>
                    {s.value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isRailOpen && (
            <SideRail
              rooms={rooms}
              selectedCode={selectedCode}
              onClose={handleRailClose}
            />
          )}
        </div>

        <InventoryRibbon />

        <BottomTimeline />
      </div>
    </div>
  );
}
