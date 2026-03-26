import { useState, useCallback } from 'react';
import type { RoomOperationalState } from '../../hooks/useRoomOperationalState';
import type { GrowRoom } from '../../types';
import { ROOM_LAYOUT_MAP } from '../../constants/buildingLayout';
import { BuildingMapSVG } from './BuildingMapSVG';

interface BuildingMapViewProps {
  opsRooms: RoomOperationalState[];
  rooms: GrowRoom[];
  onRoomSelect: (room: GrowRoom) => void;
}

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
      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-cult-surface-raised border p-2.5 ${
              s.warn ? 'border-cult-warning/40' : 'border-cult-border'
            }`}
          >
            <div className="text-[8px] text-cult-text-muted uppercase tracking-wider font-semibold mb-1 font-mono">
              {s.label}
            </div>
            <div className={`text-xl font-extrabold font-mono ${s.warn ? 'text-cult-warning' : 'text-cult-white'}`}>
              {s.value}
              {s.sub && <span className="text-sm font-normal text-cult-text-muted ml-0.5">{s.sub}</span>}
            </div>
          </div>
        ))}
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
