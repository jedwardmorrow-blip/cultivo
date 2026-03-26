import { useState, useCallback } from 'react';
import { Map, Sprout, Layers, AlertTriangle, Clock, DoorOpen } from 'lucide-react';
import type { RoomOperationalState } from '../../hooks/useRoomOperationalState';
import type { GrowRoom } from '../../types';
import { ROOM_LAYOUT_MAP } from '../../constants/buildingLayout';
import { BuildingMapSVG } from './BuildingMapSVG';

interface BuildingMapViewProps {
  opsRooms: RoomOperationalState[];
  rooms: GrowRoom[];
  onRoomSelect: (room: GrowRoom) => void;
}

/** Stat card icon mapping — tiny contextual icons for visual identity */
const STAT_ICONS: Record<string, typeof Sprout> = {
  'Active Rooms': DoorOpen,
  'Total Plants': Sprout,
  'Strains': Layers,
  'Attention': AlertTriangle,
  'Next Harvest': Clock,
};

/**
 * Building Map View — container component.
 * Wraps the SVG map with a stat bar and handles room selection.
 * Designed to slot into CultivationDashboard as an alternate view mode.
 */
export function BuildingMapView({ opsRooms, rooms, onRoomSelect }: BuildingMapViewProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  // Aggregate stats
  const growOps = opsRooms.filter((r) => {
    const layout = ROOM_LAYOUT_MAP[r.room_code];
    return layout && layout.layoutType !== 'non-grow';
  });
  const activeOps = growOps.filter((r) => r.occupancy_status !== 'empty');
  const totalPlants = opsRooms.reduce((s, r) => s + r.total_plants, 0);
  const uniqueStrains = new Set(opsRooms.flatMap((r) => r.strain_names ?? []));
  const urgentCount = opsRooms.filter((r) => r.urgency_score >= 2).length;
  const nearestHarvest = opsRooms
    .filter((r) => r.days_to_harvest !== null)
    .sort((a, b) => (a.days_to_harvest ?? 999) - (b.days_to_harvest ?? 999))[0];

  const handleClick = useCallback(
    (code: string) => {
      // Toggle selection
      const newCode = selectedCode === code ? null : code;
      setSelectedCode(newCode);

      // Find the GrowRoom and fire the parent callback
      if (newCode) {
        const fullRoom = rooms.find(
          (r) => r.room_code === newCode || r.room_code.toUpperCase() === newCode
        );
        if (fullRoom) {
          onRoomSelect(fullRoom);
        }
      }
    },
    [selectedCode, rooms, onRoomSelect]
  );

  const handleHover = useCallback((code: string | null) => {
    setHoveredCode(code);
  }, []);

  // Format nearest harvest display
  function formatHarvest(): { value: string; isWarn: boolean } {
    if (!nearestHarvest || nearestHarvest.days_to_harvest === null) {
      return { value: '—', isWarn: false };
    }
    const d = nearestHarvest.days_to_harvest;
    if (d <= 0) return { value: `${Math.abs(d)}d overdue`, isWarn: true };
    if (d <= 7) return { value: `${d}d`, isWarn: true };
    return { value: `${d}d`, isWarn: false };
  }

  const harvest = formatHarvest();

  const stats = [
    { label: 'Active Rooms', value: `${activeOps.length}`, sub: `/${growOps.length}`, warn: false },
    { label: 'Total Plants', value: totalPlants.toLocaleString(), warn: false },
    { label: 'Strains', value: `${uniqueStrains.size}`, warn: false },
    { label: 'Attention', value: `${urgentCount}`, warn: urgentCount > 0 },
    { label: 'Next Harvest', value: harvest.value, warn: harvest.isWarn },
  ];

  return (
    <div className="space-y-4">
      {/* Section header with accent line */}
      <div>
        <h2 className="text-sm font-bold text-cult-text-muted uppercase tracking-wider flex items-center gap-2">
          <Map className="w-3.5 h-3.5" />
          Building Map
          <span className="text-cult-text-faint font-normal text-xs normal-case tracking-normal ml-1">40th St · Phase 2</span>
        </h2>
        <div className="mt-1.5 h-px w-10 bg-cult-green/30" />
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stats.map((s) => {
          const Icon = STAT_ICONS[s.label];
          return (
            <div
              key={s.label}
              className={`relative border p-2.5 overflow-hidden ${
                s.warn
                  ? 'bg-cult-warning/[0.04] border-cult-warning/40'
                  : 'bg-cult-surface-raised border-cult-border'
              }`}
            >
              {/* Micro-icon watermark */}
              {Icon && (
                <Icon
                  className={`absolute top-1.5 right-1.5 w-4 h-4 ${
                    s.warn ? 'text-cult-warning' : 'text-cult-text-faint'
                  }`}
                  style={{ opacity: 0.12 }}
                  strokeWidth={1.5}
                />
              )}
              <div className="text-[8px] text-cult-text-muted uppercase tracking-wider font-semibold mb-1 font-mono">
                {s.label}
              </div>
              <div className={`text-xl font-extrabold font-mono ${s.warn ? 'text-cult-warning' : 'text-cult-white'}`}>
                {s.value}
                {s.sub && <span className="text-sm font-normal text-cult-text-muted ml-0.5">{s.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* SVG Map */}
      <BuildingMapSVG
        opsRooms={opsRooms}
        selectedCode={selectedCode}
        hoveredCode={hoveredCode}
        onHover={handleHover}
        onClick={handleClick}
      />
    </div>
  );
}
