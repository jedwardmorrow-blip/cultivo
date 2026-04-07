import { Trophy, Home } from 'lucide-react';
import { formatWeight } from '../../utils';
import { ROOM_TYPE_BADGE as ROOM_TYPE_COLORS } from '../../constants/stageColors';
import type { RoomAggregate } from '../../hooks/useHarvestMetrics';

const MEDAL_COLORS = ['text-amber-400', 'text-cult-light-gray', 'text-amber-700'];

interface RoomLeaderboardProps {
  roomAggregates: RoomAggregate[];
}

export function RoomLeaderboard({ roomAggregates }: RoomLeaderboardProps) {
  if (roomAggregates.length === 0) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
        <p className="text-cult-medium-gray text-sm uppercase tracking-wider">No room data to display</p>
      </div>
    );
  }

  const maxDry = Math.max(...roomAggregates.map((r) => r.total_dry_grams || r.total_wet_grams), 1);

  return (
    <div className="space-y-3">
      {roomAggregates.map((room, idx) => {
        const barWidth = ((room.total_dry_grams || room.total_wet_grams) / maxDry) * 100;
        const typeClass = ROOM_TYPE_COLORS[room.grow_room_type ?? 'mixed'] ?? ROOM_TYPE_COLORS.mixed;

        return (
          <div
            key={room.grow_room_code}
            className="bg-cult-near-black border border-cult-dark-gray hover:border-cult-medium-gray transition-all"
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 flex-shrink-0 text-center">
                {idx < 3 ? (
                  <Trophy className={`w-5 h-5 mx-auto ${MEDAL_COLORS[idx]}`} />
                ) : (
                  <span className="text-cult-medium-gray font-mono text-sm">#{idx + 1}</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-28 flex-shrink-0">
                <span className={`flex items-center gap-1 text-xs font-mono border px-1.5 py-0.5 ${typeClass}`}>
                  <Home className="w-3 h-3" />
                  {room.grow_room_code}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-cult-medium-gray">Harvests </span>
                    <span className="text-cult-white font-mono">{room.harvest_count}</span>
                  </div>
                  <div>
                    <span className="text-cult-medium-gray">Plants </span>
                    <span className="text-cult-white font-mono">{room.total_plants}</span>
                  </div>
                  <div>
                    <span className="text-cult-medium-gray">Wet </span>
                    <span className="text-cult-light-gray font-mono">{formatWeight(room.total_wet_grams)}</span>
                  </div>
                  <div>
                    <span className="text-cult-medium-gray">Dry </span>
                    <span className="text-cult-white font-mono font-semibold">
                      {room.total_dry_grams > 0 ? formatWeight(room.total_dry_grams) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-cult-medium-gray">Yield </span>
                    {room.avg_yield_pct != null ? (
                      <span className="text-cult-success font-mono font-semibold">{room.avg_yield_pct}%</span>
                    ) : (
                      <span className="text-cult-medium-gray">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-cult-medium-gray">Dry/Plant </span>
                    <span className="text-cult-light-gray font-mono">
                      {room.avg_dry_per_plant != null ? formatWeight(room.avg_dry_per_plant) : '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 w-full bg-cult-dark-gray h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-cult-success transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
