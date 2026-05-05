import { useEffect, useState } from 'react';
import { X, ArrowRight, Scissors, Sprout, Home, TrendingUp } from 'lucide-react';
import { cultivationService } from '../services';
import { IndividualPlantsTab } from './IndividualPlantsTab';
import { formatDate } from '../utils/dateUtils';
import type { PlantGroup, PlantGroupStageHistory, PlantGroupRoomHistory, PlantGroupCutSession } from '../types';

type Tab = 'history' | 'plants';

interface PlantGroupDetailPanelProps {
  group: PlantGroup;
  onClose: () => void;
  initialTab?: Tab;
  onMove?: () => void;
  onAdvanceStage?: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-cult-text-muted uppercase tracking-wider">{label}</span>
      <span className="text-cult-text-primary text-sm font-semibold">{value}</span>
    </div>
  );
}

export function PlantGroupDetailPanel({ group, onClose, initialTab = 'history', onMove, onAdvanceStage }: PlantGroupDetailPanelProps) {
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
  const canAdvance = group.growth_stage !== 'harvested' && group.growth_stage !== 'flower';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-cult-surface border-l border-cult-border w-full max-w-sm h-full overflow-y-auto">
        <div className="p-5 border-b border-cult-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-cult-text-primary">{batchNumber ?? '—'}</span>
                {group.is_mother && (
                  <span className="text-xs border border-cult-warning/40 text-cult-warning px-1.5 py-0.5 uppercase tracking-wider">Mother</span>
                )}
              </div>
              <div className="text-xs text-cult-text-muted">{group.strains?.name ?? 'Unknown Strain'}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-cult-border hover:text-cult-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {(onMove || (onAdvanceStage && canAdvance)) && (
            <div className="flex gap-2">
              {onMove && (
                <button
                  onClick={() => { onClose(); onMove(); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-cult-border text-cult-text-muted hover:border-cult-text-muted hover:text-cult-text-primary transition-all"
                >
                  <Home className="w-3.5 h-3.5" />
                  Move
                </button>
              )}
              {onAdvanceStage && canAdvance && (
                <button
                  onClick={() => { onClose(); onAdvanceStage(); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-emerald-800 text-emerald-400 hover:border-emerald-600 hover:text-emerald-300 transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Advance Stage
                </button>
              )}
            </div>
          )}
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
              <span className="text-xs text-cult-text-muted uppercase tracking-wider">Notes</span>
              <p className="text-cult-text-primary text-sm mt-1">{group.notes}</p>
            </div>
          )}

          <div className="flex border-b border-cult-border">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'text-cult-text-primary border-b-2 border-white -mb-px'
                  : 'text-cult-border hover:text-cult-text-muted'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('plants')}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                activeTab === 'plants'
                  ? 'text-cult-text-primary border-b-2 border-white -mb-px'
                  : 'text-cult-border hover:text-cult-text-muted'
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
              <p className="text-cult-border text-sm">Loading history...</p>
            ) : (
              <>
                {group.source_type === 'clone' && (
                  <div>
                    <h4 className="text-xs text-cult-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Scissors className="w-3 h-3" />
                      Cut Sessions
                    </h4>
                    {cutSessions.length === 0 ? (
                      <p className="text-cult-border text-xs">No cut sessions recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {cutSessions.map((cs, idx) => {
                          const motherPlantId = cs.mother_group?.individual_plants?.find((p) => p.is_active)?.state_plant_id;
                          const motherBatch = cs.mother_group?.batch_registry?.batch_number;
                          const motherStrain = cs.mother_group?.strains?.name ?? 'Unknown';
                          const label = motherBatch ? `${motherBatch} — ${motherStrain}` : motherStrain;
                          return (
                            <div key={cs.id} className="flex items-start gap-2 text-xs border-l-2 border-cult-surface pl-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-cult-text-primary font-semibold truncate">Cut {idx + 1}: {label}</div>
                                {motherPlantId && (
                                  <div className="text-cult-text-muted font-mono text-xs">Mother ID: {motherPlantId}</div>
                                )}
                                <div className="text-cult-border">{cs.cut_count} cuts{cs.cut_date ? ` · ${formatDate(cs.cut_date)}` : ''}</div>
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
                    <h4 className="text-xs text-cult-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sprout className="w-3 h-3" />
                      Origin
                    </h4>
                    <p className="text-cult-border text-xs">Seed origin — no mother lineage</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs text-cult-text-muted uppercase tracking-wider mb-2">Stage History</h4>
                  {stageHistory.length === 0 ? (
                    <p className="text-cult-border text-xs">No transitions yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {stageHistory.map((h) => (
                        <div key={h.id} className="flex items-center gap-2 text-xs">
                          <span className="text-cult-border">{h.from_stage ?? 'start'}</span>
                          <ArrowRight className="w-3 h-3 text-cult-border flex-shrink-0" />
                          <span className="text-cult-text-primary font-semibold">{h.to_stage}</span>
                          <span className="text-cult-border ml-auto">{formatDate(h.transitioned_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs text-cult-text-muted uppercase tracking-wider mb-2">Room History</h4>
                  {roomHistory.length === 0 ? (
                    <p className="text-cult-border text-xs">No room transfers</p>
                  ) : (
                    <div className="space-y-1.5">
                      {roomHistory.map((h) => (
                        <div key={h.id} className="flex items-center gap-2 text-xs">
                          <span className="text-cult-border">{h.from_room?.room_code ?? h.from_room_id.slice(0, 6)}</span>
                          <ArrowRight className="w-3 h-3 text-cult-border flex-shrink-0" />
                          <span className="text-cult-text-primary font-semibold">{h.to_room?.room_code ?? h.to_room_id.slice(0, 6)}</span>
                          <span className="text-cult-border ml-auto">{formatDate(h.moved_at)}</span>
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
