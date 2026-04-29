import { useMemo, useState } from 'react';
import { TIME_ANCHORS } from '@/features/cultivation/components/command/floor-plan/data';
import { FloorPlanSVG } from '@/features/cultivation/components/command/floor-plan/FloorPlanSVG';
import { SideRail } from '@/features/cultivation/components/command/floor-plan/SideRail';
import { useFloorPlanData } from '@/features/cultivation/components/command/floor-plan/useFloorPlanData';
import '@/features/cultivation/components/command/floor-plan/floor-plan.css';

/**
 * Floor plan canvas, stripped of FloorPlanLive's surrounding strips
 * (FacilityStateStrip, InventoryRibbon, BottomTimeline) since the new
 * home rack provides those signals as cold readings in dedicated sections.
 *
 * Click-room-expand reuses SideRail per home_redesign_brief_v2.
 */
export function FloorPlanCanvas() {
  const anchor = TIME_ANCHORS[0];
  const { rooms } = useFloorPlanData();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isRailOpen, setIsRailOpen] = useState(false);

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
    <div className="fpl-root is-embedded product home-floorplan">
      <div className="fpl artb">
        <div className={`fpl-main ${isRailOpen ? 'rail-open' : 'rail-closed'}`}>
          <div className="fpl-canvas">
            <div className="fpl-canvas-cap">
              <div>
                <div className="fpl-canvas-eyebrow">FACILITY · 40TH ST · PHASE I + II · 22 ROOMS</div>
                <h1 className="fpl-canvas-h">Floor plan, live</h1>
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
                anchorIdx={0}
                onScrub={() => {}}
                liveRooms={rooms}
                selectedCode={selectedCode}
                onRoomClick={(code: string) => {
                  setSelectedCode(code);
                  setIsRailOpen(true);
                }}
              />
              <div className="fpl-compass">
                <span style={{ fontSize: 11, color: 'var(--op-ink-2)' }}>N</span>
                <svg width="18" height="22" viewBox="0 0 18 22">
                  <path d="M9 0 L9 22 M9 0 L4 6 M9 0 L14 6" stroke="rgba(245,244,241,0.32)" strokeWidth="1" fill="none" />
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
              onClose={() => setIsRailOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
