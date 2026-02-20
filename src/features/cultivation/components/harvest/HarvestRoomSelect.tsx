import { Flower, ChevronRight } from 'lucide-react';
import type { GrowRoom, PlantGroup } from '../../types';

interface HarvestRoomSelectProps {
  flowerRooms: GrowRoom[];
  groups: PlantGroup[];
  onSelectRoom: (room: GrowRoom) => void;
}

export function HarvestRoomSelect({ flowerRooms, groups, onSelectRoom }: HarvestRoomSelectProps) {
  if (flowerRooms.length === 0) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray p-12 text-center">
        <Flower className="w-10 h-10 text-cult-medium-gray mx-auto mb-3" />
        <p className="text-cult-medium-gray text-sm uppercase tracking-wider">
          No flower rooms with active plant groups
        </p>
        <p className="text-cult-medium-gray text-xs mt-1">
          Move plant groups to a flower room before harvesting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs text-cult-light-gray uppercase tracking-widest font-semibold mb-1">
          Step 1
        </h2>
        <p className="text-cult-light-gray text-sm">
          Select a flower room to harvest from.
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
              className="w-full text-left bg-cult-near-black border border-cult-dark-gray border-l-4 border-l-rose-700 px-5 py-4 hover:border-cult-medium-gray hover:bg-cult-black transition-all group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-cult-white">
                      {room.room_code}
                    </span>
                    <span className="text-xs border border-rose-800 text-rose-400 px-1.5 py-0.5 uppercase tracking-wider">
                      flower
                    </span>
                  </div>
                  <span className="text-cult-light-gray text-xs truncate mt-1">{room.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm text-cult-white font-semibold">
                      {roomGroups.length} group{roomGroups.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-cult-medium-gray">
                      {totalPlants} plant{totalPlants !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-cult-medium-gray group-hover:text-cult-white transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
