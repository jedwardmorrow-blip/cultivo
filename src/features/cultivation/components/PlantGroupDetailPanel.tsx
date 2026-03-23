import { useEffect, useState } from 'react';
import { X, ArrowRight, Scissors, Sprout } from 'lucide-react';
import { cultivationService } from '../services';
import { IndividualPlantsTab } from './IndividualPlantsTab';
import { formatDate } from '../utils/dateUtils';
import type { PlantGroup, PlantGroupStageHistory, PlantGroupRoomHistory, PlantGroupCutSession } from '../types';

type Tab = 'history' | 'plants';

interface PlantGroupDetailPanelProps {
  group: PlantGroup;
  onClose: () => void;
  initialTab?: Tab;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-cult-light-gray uppercase tracking-wider">{label}</span>
      <span className="text-cult-white text-sm font-semibold">{value}</span>
    </div>
  );
}

export function PlantGroupDetailPanel({ group, onClose, initialTab = 'history' }: PlantGroupDetailPanelProps) {
  const [stageHistory, setStageHistory] = useState<PlantGroupStageHistory[]>([]);
  const [roomHistory, setRoomHistory] = useState<PlantGroupRoomHistory[]>([]);
  const [cutSessions, setCutSessions] = useState<PlantGroupCutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    async function load() {
      try {
        const [sh, rh, cs] = await Promise.all([
          cultivationService.getStageHistory(group.id),
          cultivationService.getRoomHistory(group.id),
          group.source_type === 'clone'
            ? cultivationService.listCutSessions(group.id)
            : Promise.resolve([]),
        ]);
        setStageHistory(sh);
        setRoomHistory(rh);
        setCutSessions(cs);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [group.id, group.source_type]);

  const daysInStage = Math.floor(
    (Date.now() - new Date(group.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const batchNumber = group.batch_registry?.batch_number ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-cult-near-black border-l border-cult-medium-gray w-full max-w-sm h-full overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-cult-medium-gray">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-cult-white">{batchNumber ?? '—'}</span>
              {group.is_mother && (
                <span className="text-xs border border-amber-700 text-amber-400 px-1.5 py-0.5 uppercase tracking-wider">Mother</span>
              )}
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat label="Stage" value={group.growth_stage} />
            <Stat label="Days in Stage" value={String(daysInStage)} />
            <Stat label="Plant Count" value={String(group.plant_count)} />
            <Stat label="Room" value={group.grow_rooms?.room_code ?? '—'} />
            {group.planted_date && <Stat label="Planted" value={formatDate(group.planted_date)} />}
            <Stat label="Mother" value={group.is_mother ? 'Yes' : 'No'} />
            <Stat label="Source" value={group.source_type === 'seed' ? 'Seed' : 'Clone'} />
          </div>

          {group.notes && (
            <div>
              <span className="text-xs text-cult-light-gray uppercase tracking-wider">Notes</span>
              <p className="text-cult-white text-sm mt-1">{group.notes}</p>
            </div>
          )}

          <div className="flex border-b border-cult-medium-gray">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'text-cult-white border-b-2 border-white -mb-px'
                  : 'text-cult-medium-gray hover:text-cult-light-gray'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('plants')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                activeTab === 'plants'
                  ? 'text-cult-white border-b-2 border-white -mb-px'
                  : 'text-cult-medium-gray hover:text-cult-light-gray'
              }`}
            >
              Plant IDs
            </button>
          </div>

          {activeTab === 'plants' && (
            <IndividualPlantsTab plantGroupId={group.id} plantCount={group.plant_count} />
          )}

          {activeTab === 'history' && (
            loading ? (
              <p className="text-cult-medium-gray text-sm">Loading history...</p>
            ) : (
              <>
                {group.source_type === 'clone' && (
                  <div>
                    <h4 className="text-xs text-cult-light-gray uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Scissors className="w-3 h-3" />
                      Cut Sessions
                    </h4>
                    {cutSessions.length === 0 ? (
                      <p className="text-cult-medium-gray text-xs">No cut sessions recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {cutSessions.map((cs, idx) => {
                          const motherPlantId = cs.mother_group?.individual_plants?.find((p) => p.is_active)?.state_plant_id;
                          const motherBatch = cs.mother_group?.batch_registry?.batch_number;
                          const motherStrain = cs.mother_group?.strains?.name ?? 'Unknown';
                          const label = motherBatch ? `${motherBatch} — ${motherStrain}` : motherStrain;
                          return (
                            <div key={cs.id} className="flex items-start gap-2 text-xs border-l-2 border-cult-dark-gray pl-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-cult-white font-semibold truncate">Cut {idx + 1}: {label}</div>
                                {motherPlantId && (
                                  <div className="text-cult-light-gray font-mono text-xs">Mother ID: {motherPlantId}</div>
                                )}
                                <div className="text-cult-medium-gray">{cs.cut_count} cuts{cs.cut_date ? ` · ${formatDate(cs.cut_date)}` : ''}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {group.source_type === 'seed' && (
                  <div>
                    <h4 className="text-xs text-cult-light-gray uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sprout className="w-3 h-3" />
                      Origin
                    </h4>
                    <p className="text-cult-medium-gray text-xs">Seed origin — no mother lineage</p>
                  </div>
                )}

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
            )
          )}
        </div>
      </div>
    </div>
  );
}
