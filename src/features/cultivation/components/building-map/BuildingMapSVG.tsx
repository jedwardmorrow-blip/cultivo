import { memo } from 'react';
import type { RoomOperationalState } from '../../hooks/useRoomOperationalState';
import {
  ROOM_LAYOUT,
  ROOM_LAYOUT_MAP,
  SVG_VIEWPORT,
  CORRIDOR,
  CORRIDOR_GAP,
  BUILDING_OUTLINE,
  WING_LABELS,
  LAYOUT_TYPE_COLORS,
  type RoomLayoutType,
} from '../../constants/buildingLayout';
import { RoomPolygon } from './RoomPolygon';

interface BuildingMapSVGProps {
  opsRooms: RoomOperationalState[];
  selectedCode: string | null;
  hoveredCode: string | null;
  onHover: (code: string | null) => void;
  onClick: (code: string) => void;
}

/** Background grid + building structure */
function BuildingStructure() {
  return (
    <g>
      {/* Subtle grid pattern */}
      <defs>
        <pattern id="bmap-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2E2E2E" strokeWidth={0.2} opacity={0.2} />
        </pattern>
      </defs>
      <rect width={SVG_VIEWPORT.width} height={SVG_VIEWPORT.height} fill="url(#bmap-grid)" />

      {/* Building outline */}
      <rect
        x={BUILDING_OUTLINE.x}
        y={BUILDING_OUTLINE.y}
        width={BUILDING_OUTLINE.width}
        height={BUILDING_OUTLINE.height}
        rx={2}
        fill="none"
        stroke="#2E2E2E"
        strokeWidth={1}
        strokeDasharray="6,3"
        opacity={0.25}
      />

      {/* Corridor — full width along south wall */}
      <rect
        x={CORRIDOR.x}
        y={CORRIDOR.y}
        width={CORRIDOR.width}
        height={CORRIDOR.height}
        rx={1}
        fill="#1e1e1e"
        fillOpacity={0.06}
        stroke="#2E2E2E"
        strokeWidth={0.5}
        strokeDasharray="8,4"
        opacity={0.3}
      />
      <text
        x={CORRIDOR.x + CORRIDOR.width / 2}
        y={CORRIDOR.y + CORRIDOR.height / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#404040"
        fontSize={7}
        fontFamily="system-ui"
        opacity={0.25}
        letterSpacing="0.15em"
      >
        CORRIDOR
      </text>

      {/* Corridor gap dashed lines */}
      <line
        x1={CORRIDOR_GAP.leftX} y1={CORRIDOR_GAP.topY}
        x2={CORRIDOR_GAP.leftX} y2={CORRIDOR_GAP.bottomY}
        stroke="#2E2E2E" strokeWidth={0.5} strokeDasharray="4,3" opacity={0.3}
      />
      <line
        x1={CORRIDOR_GAP.rightX} y1={CORRIDOR_GAP.topY}
        x2={CORRIDOR_GAP.rightX} y2={CORRIDOR_GAP.bottomY}
        stroke="#2E2E2E" strokeWidth={0.5} strokeDasharray="4,3" opacity={0.3}
      />

      {/* Wing labels */}
      <text
        x={WING_LABELS.west.x}
        y={WING_LABELS.west.y}
        textAnchor="middle"
        fill="#404040"
        fontSize={7}
        fontFamily="system-ui"
        opacity={0.2}
        letterSpacing="0.12em"
      >
        WEST WING
      </text>
      <text
        x={WING_LABELS.east.x}
        y={WING_LABELS.east.y}
        textAnchor="middle"
        fill="#404040"
        fontSize={7}
        fontFamily="system-ui"
        opacity={0.2}
        letterSpacing="0.12em"
      >
        EAST WING
      </text>

      {/* Street label */}
      <text
        x={18}
        y={130 + 60}
        textAnchor="middle"
        fill="#404040"
        fontSize={8}
        fontFamily="system-ui"
        opacity={0.15}
        letterSpacing="0.12em"
        transform={`rotate(-90, 18, ${130 + 60})`}
      >
        S. 40TH ST
      </text>

      {/* Compass */}
      <g transform={`translate(${SVG_VIEWPORT.width - 30}, ${SVG_VIEWPORT.height - 25})`} opacity={0.2}>
        <line x1={0} y1={-10} x2={0} y2={10} stroke="#404040" strokeWidth={0.8} />
        <line x1={-10} y1={0} x2={10} y2={0} stroke="#404040" strokeWidth={0.8} />
        <polygon points="0,-12 -2.5,-7 2.5,-7" fill="#404040" />
        <text x={0} y={-15} textAnchor="middle" fill="#404040" fontSize={7} fontWeight={700}>N</text>
      </g>
    </g>
  );
}

/** Map legend row */
function MapLegend() {
  const items: { label: string; type: RoomLayoutType }[] = [
    { label: 'Flower', type: 'flower' },
    { label: 'Veg', type: 'veg' },
    { label: 'Water', type: 'water' },
    { label: 'Dry', type: 'dry' },
    { label: 'Lab', type: 'lab' },
  ];

  return (
    <div className="flex gap-3.5 flex-wrap items-center">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm opacity-50"
            style={{
              background: LAYOUT_TYPE_COLORS[item.type],
              border: `1px solid ${LAYOUT_TYPE_COLORS[item.type]}80`,
            }}
          />
          <span className="text-cult-text-muted text-[8px] uppercase tracking-wider font-semibold font-mono">
            {item.label}
          </span>
        </div>
      ))}

      {/* Urgency indicators */}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm border border-cult-red" style={{ boxShadow: '0 0 5px rgba(220,69,69,0.6)' }} />
        <span className="text-cult-text-muted text-[8px] uppercase tracking-wider font-semibold font-mono">Urgent</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm border border-cult-warning" style={{ boxShadow: '0 0 5px rgba(245,158,11,0.5)' }} />
        <span className="text-cult-text-muted text-[8px] uppercase tracking-wider font-semibold font-mono">Attention</span>
      </div>
    </div>
  );
}

function BuildingMapSVGInner({ opsRooms, selectedCode, hoveredCode, onHover, onClick }: BuildingMapSVGProps) {
  // Build a quick lookup: room_code → RoomOperationalState
  const opsMap = new Map<string, RoomOperationalState>();
  for (const ops of opsRooms) {
    opsMap.set(ops.room_code, ops);
  }

  return (
    <div>
      <div className="bg-cult-surface-raised border border-cult-border p-4 mb-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_VIEWPORT.width} ${SVG_VIEWPORT.height}`}
          style={{ width: '100%', height: 'auto', minHeight: 420 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <BuildingStructure />
          {ROOM_LAYOUT.map((layout) => (
            <RoomPolygon
              key={layout.code}
              layout={layout}
              ops={opsMap.get(layout.code) ?? null}
              isSelected={selectedCode === layout.code}
              isHovered={hoveredCode === layout.code}
              onHover={onHover}
              onClick={onClick}
            />
          ))}
        </svg>
      </div>
      <MapLegend />
    </div>
  );
}

export const BuildingMapSVG = memo(BuildingMapSVGInner);
