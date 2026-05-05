import { X, Layers, Sprout, BarChart3 } from 'lucide-react';
import type { CalendarRoom } from '../types';
import { STAGE_HEX } from '../types';
import {
  STAGE_BADGE,
  ROOM_TYPE_BORDER,
  ROOM_TYPE_DOT,
  ROOM_TYPE_COLORS,
  CHIP_STAGE_COLORS,
} from '@/features/cultivation/constants/stageColors';

interface RoomDetailCardProps {
  room: CalendarRoom;
  onStrainClick: (strainId: string) => void;
  onClose: () => void;
}

export function RoomDetailCard({ room, onStrainClick, onClose }: RoomDetailCardProps) {
  const isEmpty = room.strains.length === 0;
  const isMother = room.room_type === 'mother';

  // Sort strains by plant count descending
  const sortedStrains = [...room.strains].sort((a, b) => b.plant_count - a.plant_count);
  const totalPlants = room.total_plants;

  // Proportional color bar data
  const barSegments = sortedStrains.map((s) => ({
    strain_name: s.strain_name,
    pct: totalPlants > 0 ? (s.plant_count / totalPlants) * 100 : 0,
    color: STAGE_HEX[s.growth_stage] ?? '#6B7280',
  }));

  // Harvest countdown for flower rooms
  const nextHarvest = sortedStrains
    .filter((s) => s.estimated_harvest_date)
    .sort((a, b) => (a.estimated_harvest_date! > b.estimated_harvest_date! ? 1 : -1))[0];

  const daysToHarvest = nextHarvest?.estimated_harvest_date
    ? Math.ceil((new Date(nextHarvest.estimated_harvest_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-l-4 ${ROOM_TYPE_BORDER[room.room_type] ?? 'border-cult-border'} ${ROOM_TYPE_COLORS[room.room_type] ?? ''}`}>
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${ROOM_TYPE_DOT[room.room_type] ?? 'bg-cult-border'}`} />
            <h2 className="text-base font-bold text-cult-text-primary font-mono">{room.room_code}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CHIP_STAGE_COLORS[room.room_type] ?? CHIP_STAGE_COLORS.mixed}`}>
              {room.room_type}
            </span>
          </div>
          <p className="text-xs text-cult-text-muted mt-0.5">{room.room_name}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-cult-surface text-cult-text-muted hover:text-cult-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-cult-border">
        <div className="bg-cult-surface rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-cult-text-primary">{room.total_plants}</div>
          <div className="text-xs text-cult-text-secondary uppercase tracking-wide">Plants</div>
        </div>
        <div className="bg-cult-surface rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-cult-text-primary">{room.strain_count}</div>
          <div className="text-xs text-cult-text-secondary uppercase tracking-wide">Strains</div>
        </div>
        <div className="bg-cult-surface rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-cult-text-primary">
            {room.square_footage ? `${room.square_footage}` : '—'}
          </div>
          <div className="text-xs text-cult-text-secondary uppercase tracking-wide">Sq Ft</div>
        </div>
      </div>

      {/* Capacity utilization bar */}
      {room.capacity_utilization_pct !== null && (
        <div className="px-4 py-2 border-b border-cult-border">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-cult-text-muted">Capacity</span>
            <span className="text-cult-text-primary font-medium">{room.capacity_utilization_pct}%</span>
          </div>
          <div className="h-1.5 bg-cult-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-cult-accent rounded-full transition-all"
              style={{ width: `${Math.min(room.capacity_utilization_pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Proportional color bar */}
      {!isEmpty && (
        <div className="px-4 py-2 border-b border-cult-border">
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {barSegments.map((seg, i) => (
              <div
                key={i}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${Math.max(seg.pct, 2)}%`, backgroundColor: seg.color }}
                title={`${seg.strain_name} ${seg.pct.toFixed(0)}%`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Harvest countdown */}
      {daysToHarvest !== null && (
        <div className="px-4 py-2 border-b border-cult-border">
          <div className="flex items-center gap-2 text-sm">
            <Sprout className="w-4 h-4 text-cult-stage-harvest" />
            <span className="text-cult-text-secondary">Next harvest:</span>
            <span className={`font-semibold ${daysToHarvest <= 7 ? 'text-cult-stage-harvest' : 'text-cult-text-primary'}`}>
              {daysToHarvest <= 0 ? 'Due now' : `${daysToHarvest} days`}
            </span>
          </div>
        </div>
      )}

      {/* Strain list */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && !isMother && (
          <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
            <Layers className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">Empty Room</p>
            <p className="text-xs mt-1">No active plant groups</p>
          </div>
        )}

        {isMother && isEmpty && (
          <div className="flex flex-col items-center justify-center py-12 text-cult-stage-harvest">
            <Sprout className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm font-medium">Mother Room</p>
            <p className="text-xs mt-1 text-cult-text-muted">No mother plants registered yet</p>
          </div>
        )}

        {sortedStrains.map((strain) => {
          const pctOfRoom = totalPlants > 0 ? ((strain.plant_count / totalPlants) * 100).toFixed(0) : '0';
          const stageBadge = STAGE_BADGE[strain.growth_stage] ?? STAGE_BADGE.clone;

          return (
            <div
              key={strain.strain_id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-cult-border/30 cursor-pointer hover:bg-cult-surface/60 transition-colors"
              onClick={() => onStrainClick(strain.strain_id)}
            >
              <div
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: STAGE_HEX[strain.growth_stage] ?? '#6B7280' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-cult-text-primary truncate">{strain.strain_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${stageBadge}`}>
                    {strain.growth_stage}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-cult-text-muted">
                  <span>{strain.plant_count} plants</span>
                  <span>{pctOfRoom}% of room</span>
                  {strain.days_in_stage !== null && <span>{strain.days_in_stage}d in stage</span>}
                </div>
              </div>
              <BarChart3 className="w-3.5 h-3.5 text-cult-text-muted flex-shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
