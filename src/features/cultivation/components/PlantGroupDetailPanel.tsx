import { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { cultivationService } from '../services';
import type { PlantGroup, PlantGroupStageHistory, PlantGroupRoomHistory } from '../types';

interface PlantGroupDetailPanelProps {
  group: PlantGroup;
  onClose: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-cult-light-gray uppercase tracking-wider">{label}</span>
      <span className="text-cult-white text-sm font-semibold">{value}</span>
    </div>
  );
}

export function PlantGroupDetailPanel({ group, onClose }: PlantGroupDetailPanelProps) {
  const [stageHistory, setStageHistory] = useState<PlantGroupStageHistory[]>([]);
  const [roomHistory, setRoomHistory] = useState<PlantGroupRoomHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sh, rh] = await Promise.all([
          cultivationService.getStageHistory(group.id),
          cultivationService.getRoomHistory(group.id),
        ]);
        setStageHistory(sh);
        setRoomHistory(rh);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [group.id]);

  const daysInStage = Math.floor(
    (Date.now() - new Date(group.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-cult-near-black border-l border-cult-medium-gray w-full max-w-sm h-full overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-cult-medium-gray">
          <div>
            <div className="font-mono text-sm font-bold text-cult-white">{group.group_number}</div>
            <div className="text-xs text-cult-light-gray">{group.strains?.name ?? 'Unknown Strain'}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-cult-medium-gray hover:text-cult-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Stage" value={group.growth_stage} />
            <Stat label="Days in Stage" value={String(daysInStage)} />
            <Stat label="Plant Count" value={String(group.plant_count)} />
            <Stat label="Room" value={group.grow_rooms?.room_code ?? '—'} />
            {group.planted_date && <Stat label="Planted" value={formatDate(group.planted_date)} />}
            <Stat label="Mother" value={group.is_mother ? 'Yes' : 'No'} />
          </div>

          {group.notes && (
            <div>
              <span className="text-xs text-cult-light-gray uppercase tracking-wider">Notes</span>
              <p className="text-cult-white text-sm mt-1">{group.notes}</p>
            </div>
          )}

          {loading ? (
            <p className="text-cult-medium-gray text-sm">Loading history...</p>
          ) : (
            <>
              <div>
                <h4 className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Stage History</h4>
                {stageHistory.length === 0 ? (
                  <p className="text-cult-medium-gray text-xs">No transitions yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {stageHistory.map((h) => (
                      <div key={h.id} className="flex items-center gap-2 text-xs">
                        <span className="text-cult-medium-gray">{h.from_stage ?? 'start'}</span>
                        <ArrowRight className="w-3 h-3 text-cult-medium-gray flex-shrink-0" />
                        <span className="text-cult-white font-semibold">{h.to_stage}</span>
                        <span className="text-cult-medium-gray ml-auto">{formatDate(h.transitioned_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs text-cult-light-gray uppercase tracking-wider mb-2">Room History</h4>
                {roomHistory.length === 0 ? (
                  <p className="text-cult-medium-gray text-xs">No room transfers</p>
                ) : (
                  <div className="space-y-1.5">
                    {roomHistory.map((h) => (
                      <div key={h.id} className="flex items-center gap-2 text-xs">
                        <span className="text-cult-medium-gray">{h.from_room?.room_code ?? h.from_room_id.slice(0, 6)}</span>
                        <ArrowRight className="w-3 h-3 text-cult-medium-gray flex-shrink-0" />
                        <span className="text-cult-white font-semibold">{h.to_room?.room_code ?? h.to_room_id.slice(0, 6)}</span>
                        <span className="text-cult-medium-gray ml-auto">{formatDate(h.moved_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
