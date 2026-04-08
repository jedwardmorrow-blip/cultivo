import { Flower, ChevronRight } from 'lucide-react';
import type { GrowRoom, PlantGroup } from '../../types';

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_HOVER = 'hover:bg-white/[0.09] hover:border-white/[0.14] hover:scale-[1.01] transition-all duration-300';

interface HarvestRoomSelectProps {
  flowerRooms: GrowRoom[];
  groups: PlantGroup[];
  onSelectRoom: (room: GrowRoom) => void;
}

export function HarvestRoomSelect({ flowerRooms, groups, onSelectRoom }: HarvestRoomSelectProps) {
  if (flowerRooms.length === 0) {
    return (
      <div className={`${GLASS} p-12 text-center`}>
        <Flower className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/30">No flower rooms with active plant groups</p>
        <p className="text-[10px] text-white/15 mt-1">
          Move plant groups to a flower room before harvesting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold mb-1">
          Step 1 — Select Room
        </h2>
        <p className="text-sm text-white/50">
          Choose a flower room to harvest from.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {flowerRooms.map((room) => {
          const roomGroups = groups.filter(
            (g) => g.grow_room_id === room.id && g.growth_stage === 'flower'
          );
          const totalPlants = roomGroups.reduce((s, g) => s + g.plant_count, 0);

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`w-full text-left ${GLASS} ${GLASS_HOVER} p-5 active:scale-[0.98] group`}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: 'rgba(244,63,94,0.4)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-white">
                      {room.room_code}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-300/70 uppercase tracking-wider border border-rose-500/20">
                      flower
                    </span>
                  </div>
                  <span className="text-xs text-white/40 truncate mt-1">{room.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm text-white/80 font-semibold">
                      {roomGroups.length} group{roomGroups.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {totalPlants} plant{totalPlants !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
