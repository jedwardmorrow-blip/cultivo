import { useMemo, useState } from 'react';
import { TIME_ANCHORS } from '@/features/cultivation/components/command/floor-plan/data';
import { FloorPlanSVG } from '@/features/cultivation/components/command/floor-plan/FloorPlanSVG';
import { SideRail } from '@/features/cultivation/components/command/floor-plan/SideRail';
import { useFloorPlanData } from '@/features/cultivation/components/command/floor-plan/useFloorPlanData';
import '@/features/cultivation/components/command/floor-plan/floor-plan.css';

/**
 * Floor plan canvas, V4 Bureau Tier 2 instrument framing.
 *
 * The original `.fpl-canvas-cap` (eyebrow + h1 "Floor plan, live" + legend
 * stack) is hidden via dashboard-bureau.css. In its place this component
 * renders a Bureau serial plate above the SVG (FIG. 04 · FACILITY · 22
 * ROOMS · 40TH ST), an inline urgent/attention callouts strip, and a
 * compact live-state footer.
 *
 * Inline callouts surface signals the cell sections cannot show: per-room
 * urgency reason ("FLW-09 d56/63 flip critical") that's only knowable in
 * spatial context. This is the floor plan earning its real estate beyond
 * being a labeled section.
 *
 * SideRail click-to-drill behavior preserved per home_redesign_brief_v2.
 */

interface RoomCallout {
  code: string;
  state: 'urgent' | 'attention';
  reason: string;
}

function buildCallout(room: ReturnType<typeof useFloorPlanData>['rooms'][number]): RoomCallout | null {
  const score = room.urgency_score ?? 0;
  if (score < 1) return null;

  const state: 'urgent' | 'attention' = score >= 3 ? 'urgent' : 'attention';
  const stage = room.dominant_stage;
  const dis = room.days_in_stage;
  const dth = room.days_to_harvest;

  // Reason heuristics, ranked by which signal is most actionable. Skip
  // callouts when no actionable signal is available — better to show
  // fewer well-formed callouts than a strip of UNKNOWNs.
  let reason: string | null = null;
  if (dth !== null && dth !== undefined && dth <= 3 && dth >= 0) {
    reason = `${dth}d to harvest`;
  } else if (dth !== null && dth !== undefined && dth < 0) {
    reason = `${Math.abs(dth)}d overdue`;
  } else if (stage === 'flower' && dis !== null && dis !== undefined && dis >= 56) {
    reason = `d${dis} flip critical`;
  } else if (stage && dis !== null && dis !== undefined) {
    reason = `${stage} d${dis}`;
  } else if (stage) {
    reason = stage;
  }

  if (!reason) return null;

  return { code: room.code, state, reason };
}

export function FloorPlanCanvas() {
  const anchor = TIME_ANCHORS[0];
  const { rooms } = useFloorPlanData();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isRailOpen, setIsRailOpen] = useState(false);

  const offCycleStats = useMemo(() => {
    const mom = rooms.find((r) => r.code === 'MOM');
    const cln = rooms.find((r) => r.code === 'CLN');
    const stats: Array<{ label: string; value: string }> = [];
    if (mom) {
      stats.push({
        label: 'MOM',
        value: `${mom.total_plants ?? 0} mothers · ${mom.strain_count ?? 0} strains`,
      });
    }
    if (cln) {
      stats.push({
        label: 'CLN',
        value: `${cln.total_plants ?? 0} cuttings`,
      });
    }
    return stats;
  }, [rooms]);

  const callouts = useMemo(() => {
    return rooms
      .map(buildCallout)
      .filter((c): c is RoomCallout => c !== null)
      .sort((a, b) => {
        // Urgent before attention; within state, alphabetical by room code.
        if (a.state !== b.state) return a.state === 'urgent' ? -1 : 1;
        return a.code.localeCompare(b.code);
      });
  }, [rooms]);

  const roomCount = rooms.length;

  return (
    <div className="fpl-root is-embedded product home-floorplan">
      {/* Bureau serial plate header — replaces the legacy fpl-canvas-cap stack */}
      <div className="bv4-facility-plate">
        <div className="left">
          <span className="serial">FIG. 04</span>
          <span className="sep">·</span>
          <span>FACILITY</span>
          <span className="sep">·</span>
          <span>40TH ST</span>
          <span className="sep">·</span>
          <span>{roomCount} ROOMS</span>
          {offCycleStats.length > 0 && (
            <span className="offcycle">
              {offCycleStats.map((s) => (
                <span key={s.label}>
                  <strong>{s.label}</strong>
                  {s.value}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="bv4-legend">
          <span className="swatch-pill">
            <span className="swatch" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <span>NOMINAL</span>
          </span>
          <span className="swatch-pill">
            <span className="swatch" style={{ background: 'rgba(232,224,212,0.18)' }} />
            <span>ACTIVE</span>
          </span>
          <span className="swatch-pill">
            <span className="swatch" style={{ background: 'rgba(217,119,6,0.45)' }} />
            <span>ATTENTION</span>
          </span>
          <span className="swatch-pill">
            <span className="swatch" style={{ background: 'rgba(196,33,48,0.65)' }} />
            <span>URGENT</span>
          </span>
        </div>
      </div>

      {/* Inline callouts strip — what's actionable spatially right now */}
      {callouts.length > 0 && (
        <div className="bv4-callouts-strip" aria-label="Room urgency callouts">
          {callouts.map((c) => (
            <span
              key={c.code}
              className={`bv4-room-callout is-${c.state}`}
              onClick={() => {
                setSelectedCode(c.code);
                setIsRailOpen(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedCode(c.code);
                  setIsRailOpen(true);
                }
              }}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              <span className="dot" />
              <strong>{c.code}</strong>
              <span>{c.reason}</span>
            </span>
          ))}
        </div>
      )}

      <div className="fpl artb">
        <div className={`fpl-main ${isRailOpen ? 'rail-open' : 'rail-closed'}`}>
          <div className="fpl-canvas">
            {/* Legacy fpl-canvas-cap kept in DOM for compatibility but
                hidden via dashboard-bureau.css. Could be removed entirely
                when home rack is the only consumer of FloorPlanCanvas. */}
            <div className="fpl-canvas-cap">
              <div>
                <div className="fpl-canvas-eyebrow">FACILITY · 40TH ST · PHASE I + II · 22 ROOMS</div>
                <h1 className="fpl-canvas-h">Floor plan, live</h1>
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

      {/* Compact live-state footer (replaces the bigger off-cycle stats area) */}
      <div className="bv4-facility-foot">
        <span>
          <span className="live-dot" />
          FLOOR STATE LIVE
        </span>
        <span>
          {callouts.length > 0
            ? `${callouts.length} CALLOUT${callouts.length === 1 ? '' : 'S'}`
            : 'NO ACTIVE CALLOUTS'}
        </span>
        <span>COMPASS N · SCALE 50FT</span>
      </div>
    </div>
  );
}
