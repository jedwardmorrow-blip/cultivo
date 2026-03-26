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
import { RoomPolygon, RoomTooltip } from './RoomPolygon';

interface BuildingMapSVGProps {
  opsRooms: RoomOperationalState[];
  selectedCode: string | null;
  hoveredCode: string | null;
  onHover: (code: string | null) => void;
  onClick: (code: string) => void;
}

/** Background grid + building structure + atmosphere effects */
function BuildingStructure() {
  const vw = SVG_VIEWPORT.width;
  const vh = SVG_VIEWPORT.height;

  return (
    <g>
      {/* Defs: grid, noise texture, vignette */}
      <defs>
        <pattern id="bmap-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2E2E2E" strokeWidth={0.2} opacity={0.2} />
        </pattern>

        {/* Subtle noise texture */}
        <filter id="bmap-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
        </filter>

        {/* Radial vignette — darkens edges, focuses center */}
        <radialGradient id="bmap-vignette" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Base grid */}
      <rect width={vw} height={vh} fill="url(#bmap-grid)" />

      {/* Noise overlay — very subtle grain */}
      <rect width={vw} height={vh} fill="#111111" opacity={0.02} filter="url(#bmap-noise)" />

      {/* Vignette overlay */}
      <rect width={vw} height={vh} fill="url(#bmap-vignette)" />

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
        fontFamily="'Montserrat', system-ui"
        fontWeight={300}
        opacity={0.25}
        letterSpacing="0.2em"
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

      {/* Wing labels — Montserrat light weight for architectural wayfinding */}
      <text
        x={WING_LABELS.west.x}
        y={WING_LABELS.west.y}
        textAnchor="middle"
        fill="#404040"
        fontSize={7}
        fontFamily="'Montserrat', system-ui"
        fontWeight={300}
        opacity={0.2}
        letterSpacing="0.15em"
      >
        WEST WING
      </text>
      <text
        x={WING_LABELS.east.x}
        y={WING_LABELS.east.y}
        textAnchor="middle"
        fill="#404040"
        fontSize={7}
        fontFamily="'Montserrat', system-ui"
        fontWeight={300}
        opacity={0.2}
        letterSpacing="0.15em"
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
        fontFamily="'Montserrat', system-ui"
        fontWeight={300}
        opacity={0.15}
        letterSpacing="0.15em"
        transform={`rotate(-90, 18, ${130 + 60})`}
      >
        S. 40TH ST
      </text>

      {/* Compass */}
      <g transform={`translate(${vw - 30}, ${vh - 25})`} opacity={0.2}>
        <line x1={0} y1={-10} x2={0} y2={10} stroke="#404040" strokeWidth={0.8} />
        <line x1={-10} y1={0} x2={10} y2={0} stroke="#404040" strokeWidth={0.8} />
        <polygon points="0,-12 -2.5,-7 2.5,-7" fill="#404040" />
        <text x={0} y={-15} textAnchor="middle" fill="#404040" fontSize={7} fontFamily="'Montserrat', system-ui" fontWeight={700}>N</text>
      </g>
    </g>
  );
}

/** Inline SVG legend rendered at the bottom-left of the viewport */
function SVGLegend() {
  const items: { label: string; color: string }[] = [
    { label: 'Flower', color: LAYOUT_TYPE_COLORS.flower },
    { label: 'Veg', color: LAYOUT_TYPE_COLORS.veg },
    { label: 'Water', color: LAYOUT_TYPE_COLORS.water },
    { label: 'Dry', color: LAYOUT_TYPE_COLORS.dry },
    { label: 'Lab', color: LAYOUT_TYPE_COLORS.lab },
  ];

  const urgencyItems = [
    { label: 'Urgent', color: '#DC4545' },
    { label: 'Attn', color: '#F59E0B' },
  ];

  const y = SVG_VIEWPORT.height - 14;
  let cx = 40;

  return (
    <g opacity={0.6}>
      {/* Semi-transparent backdrop */}
      <rect
        x={30}
        y={y - 8}
        width={390}
        height={18}
        rx={1}
        fill="#0A0A0A"
        fillOpacity={0.7}
      />
      {items.map((item) => {
        const thisX = cx;
        cx += 50;
        return (
          <g key={item.label}>
            <rect x={thisX} y={y - 3} width={7} height={7} rx={1} fill={item.color} fillOpacity={0.55} stroke={item.color} strokeWidth={0.4} strokeOpacity={0.4} />
            <text x={thisX + 11} y={y + 4} fill="#999999" fontSize={7} fontFamily="'JetBrains Mono', monospace" fontWeight={600} letterSpacing="0.04em">
              {item.label}
            </text>
          </g>
        );
      })}
      {/* Separator */}
      <line x1={cx - 4} y1={y - 3} x2={cx - 4} y2={y + 5} stroke="#2E2E2E" strokeWidth={0.6} />
      {urgencyItems.map((item) => {
        const thisX = cx + 4;
        cx += 52;
        return (
          <g key={item.label}>
            <rect x={thisX} y={y - 3} width={7} height={7} rx={1} fill="transparent" stroke={item.color} strokeWidth={0.8}>
              <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </rect>
            <text x={thisX + 11} y={y + 4} fill="#999999" fontSize={7} fontFamily="'JetBrains Mono', monospace" fontWeight={600} letterSpacing="0.04em">
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function BuildingMapSVGInner({ opsRooms, selectedCode, hoveredCode, onHover, onClick }: BuildingMapSVGProps) {
  // Build a quick lookup: room_code → RoomOperationalState
  const opsMap = new Map<string, RoomOperationalState>();
  for (const ops of opsRooms) {
    opsMap.set(ops.room_code, ops);
  }

  const hoveredLayout = hoveredCode ? ROOM_LAYOUT_MAP[hoveredCode] : null;
  const hoveredOps = hoveredCode ? (opsMap.get(hoveredCode) ?? null) : null;

  return (
    <div className="relative">
      <div className="bg-cult-surface-raised border border-cult-border p-4 overflow-x-auto">
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
          <SVGLegend />
        </svg>

        {/* Selected room context badge */}
        {selectedCode && (
          <div
            className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-cult-near-black/90 border border-cult-border px-2.5 py-1"
            style={{ animation: 'badgeSlideIn 0.2s ease-out both' }}
          >
            <style>{`
              @keyframes badgeSlideIn {
                from { opacity: 0; transform: translateX(8px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div className="w-1.5 h-1.5 rounded-full bg-cult-white animate-pulse" />
            <span className="text-cult-white font-mono text-[10px] font-bold tracking-wide">{selectedCode}</span>
          </div>
        )}
      </div>

      {/* Hover tooltip — HTML overlay positioned by percentage */}
      {hoveredLayout && hoveredCode !== selectedCode && (
        <RoomTooltip layout={hoveredLayout} ops={hoveredOps} />
      )}
    </div>
  );
}

export const BuildingMapSVG = memo(BuildingMapSVGInner);
