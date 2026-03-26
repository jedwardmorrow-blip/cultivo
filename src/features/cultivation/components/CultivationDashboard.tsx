import { useState } from 'react';
import { Sprout, Scissors, Package, AlertTriangle, Calendar, Map, LayoutGrid } from 'lucide-react';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useHarvestSessions } from '../hooks/useHarvestSessions';
import { useRoomSummaries } from '../hooks/useRoomSummaries';
import { useRoomOperationalState, type RoomOperationalState } from '../hooks/useRoomOperationalState';
import { RoomDetailDrawer } from './RoomDetailDrawer';
import { PlantGroupDetailPanel } from './PlantGroupDetailPanel';
import { MoveToRoomModal } from './MoveToRoomModal';
import { BuildingMapView } from './building-map';
import { isValidStrainAbbreviation } from '../utils';
import { daysBetween, todayIso } from '../utils/dateUtils';
import { ROOM_TYPE_LEFT_BORDER, ROOM_TYPE_TEXT } from '../constants/stageColors';
import type { GrowRoom, PlantGroup, GrowthStage } from '../types';
import { Button, StatCard, PageSkeleton } from '../../../shared/components';

type CultivationViewMode = 'map' | 'cards';

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  clone: 'veg',
  veg: 'flower',
  flower: 'harvested',
  harvested: null,
};

function computeHarvestDays(harvestDate: string | null): number | null {
  if (!harvestDate) return null;
  return daysBetween(todayIso(), harvestDate);
}





interface RoomCommandCardProps {
  state: RoomOperationalState;
  onClick: () => void;
}

function RoomCommandCard({ state, onClick }: RoomCommandCardProps) {
  const isEmpty = state.occupancy_status === 'empty';
  
  let pulseClass = '';
  let urgencyBadge = null;
  if (!isEmpty) {
    if (state.urgency_score === 3) {
      pulseClass = 'animate-[pulseUrgentRed_2s_infinite] border-cult-red shadow-[0_0_15px_rgba(184,29,36,0.3)] z-10';
      urgencyBadge = <span className="bg-cult-red/20 text-cult-red text-xs uppercase font-bold px-1.5 py-0.5 border border-cult-red/50">Urgent</span>;
    } else if (state.urgency_score === 2) {
      pulseClass = 'animate-[pulseUrgentAmber_2s_infinite] border-cult-stage-harvest shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10';
      urgencyBadge = <span className="bg-cult-stage-harvest/20 text-cult-stage-harvest text-xs uppercase font-bold px-1.5 py-0.5 border border-cult-stage-harvest/50">Attention</span>;
    } else if (state.urgency_score === 1) {
      urgencyBadge = <span className="text-yellow-500 border border-yellow-500/50 bg-yellow-500/10 text-xs uppercase font-bold px-1.5 py-0.5">Watch</span>;
    }
  }

  const borderCls = ROOM_TYPE_LEFT_BORDER[state.room_type] ?? ROOM_TYPE_LEFT_BORDER.mixed;
  const typeTextCls = ROOM_TYPE_TEXT[state.room_type] ?? ROOM_TYPE_TEXT.mixed;

  const totalTasks = Number(state.tasks_today) || 0;
  const doneTasks = Number(state.tasks_completed_today) || 0;
  const inProgressTasks = Number(state.tasks_in_progress_today) || 0;
  const donePct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const inProgPct = totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left bg-cult-near-black border ${pulseClass || 'border-cult-dark-gray'} border-l-4 ${!isEmpty ? borderCls : 'border-l-cult-dark-gray'} hover:bg-cult-black transition-all group flex flex-col h-full ${isEmpty ? 'opacity-50 grayscale-[0.5]' : ''}`}
    >
      <div className="p-4 flex-1 space-y-4 w-full">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-cult-white">{state.room_code}</span>
            {urgencyBadge}
          </div>
          <span className={`text-xs px-1.5 py-0.5 uppercase tracking-wider font-bold border ${isEmpty ? 'border-cult-dark-gray text-cult-medium-gray' : typeTextCls}`}>
            {isEmpty ? 'Empty' : state.room_type}
          </span>
        </div>

        {!isEmpty && (
          <div className="space-y-3">
            <div className="text-xs text-cult-light-gray flex items-center justify-between">
              <span>{state.total_plants} plants &middot; {state.strain_count} strains</span>
              {state.days_in_stage !== null && (
                <span>Day {state.days_in_stage}</span>
              )}
            </div>
            
            {state.strain_names && state.strain_names.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {state.strain_names.slice(0, 4).map(s => (
                  <span key={s} className="text-xs border border-cult-dark-gray text-cult-light-gray px-1.5 py-0.5 bg-cult-surface-overlay flex-shrink-0">{s}</span>
                ))}
                {state.strain_names.length > 4 && (
                  <span className="text-xs text-cult-medium-gray px-1 inline-flex items-center">+{state.strain_names.length - 4}</span>
                )}
              </div>
            )}

            {state.room_type === 'flower' && (
              <div className="bg-cult-surface-overlay border border-cult-border p-2 space-y-1.5 mt-2">
                {state.days_to_harvest !== null && state.days_to_harvest > 0 && (
                  <div className="text-xs text-cult-light-gray flex items-center justify-between">
                    <span>Harvest in {state.days_to_harvest} days</span>
                  </div>
                )}
                {state.days_to_harvest !== null && state.days_to_harvest <= 0 && (
                  <div className="text-xs font-bold text-cult-red flex items-center justify-between animate-flicker">
                    <span>OVERDUE by {Math.abs(state.days_to_harvest)} days</span>
                  </div>
                )}
                {state.groups_near_harvest !== null && state.groups_near_harvest > 0 && (
                  <div className="text-xs text-cult-stage-harvest font-medium tracking-wide">
                    {state.groups_near_harvest} groups ready
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full border-t border-cult-dark-gray bg-cult-surface p-2 mt-auto">
        <div className="flex items-center justify-between text-xs text-cult-medium-gray mb-1 px-1 font-mono">
          <span>{doneTasks}/{totalTasks} tasks done</span>
          {inProgressTasks > 0 && <span className="text-cult-stage-harvest font-bold">{inProgressTasks} active</span>}
        </div>
        <div className="h-1.5 w-full bg-cult-dark-gray flex overflow-hidden rounded-sm">
          {totalTasks > 0 && (
            <>
              <div className="h-full bg-cult-green transition-all" style={{ width: `${donePct}%` }} />
              <div className="h-full bg-cult-stage-harvest transition-all opacity-80" style={{ width: `${inProgPct}%` }} />
            </>
          )}
        </div>
      </div>
    </button>
  );
}

type PendingAction =
  | { type: 'detail'; group: PlantGroup }
  | { type: 'move'; group: PlantGroup }
  | { type: 'advance'; group: PlantGroup }
  | { type: 'mother'; group: PlantGroup }
  | { type: 'plants'; group: PlantGroup }
  | { type: 'printGroup'; group: PlantGroup }
  | { type: 'printPlants'; group: PlantGroup };



export function CultivationDashboard() {
  const { rooms, loading: roomsLoading } = useGrowRooms();
  const { groups, loading: groupsLoading, advanceStage, moveToRoom, setMotherStatus } = usePlantGroups({ stage: 'active' });
  const { sessions, loading: sessionsLoading } = useHarvestSessions({ status: 'active' });
  const { summaries, loading: summariesLoading } = useRoomSummaries();
  const { rooms: opsRooms, loading: opsLoading } = useRoomOperationalState();

  const [selectedRoom, setSelectedRoom] = useState<GrowRoom | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CultivationViewMode>(() => {
    try { return (localStorage.getItem('cult-view-mode') as CultivationViewMode) || 'map'; } catch { return 'map'; }
  });

  const loading = roomsLoading || groupsLoading || sessionsLoading || summariesLoading || opsLoading;

  const activeRooms = rooms.filter((r) => r.is_active);

  const totalPlants = groups.reduce((sum, g) => sum + g.plant_count, 0);

  const strainsWithoutAbbrev = Array.from(
    new Set(
      groups
        .filter((g) => !isValidStrainAbbreviation(g.strains?.abbreviation))
        .map((g) => g.strains?.name ?? 'Unknown')
    )
  );

  const nextHarvestDays = summaries.reduce<number | null>((min, s) => {
    const d = computeHarvestDays(s.earliest_projected_harvest);
    if (d === null) return min;
    if (min === null) return d;
    return d < min ? d : min;
  }, null);

  function handleGroupAction(group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants' | 'printGroup' | 'printPlants') {
    setPendingAction({ type: action, group } as PendingAction);
  }

  async function confirmAdvance() {
    if (!pendingAction || pendingAction.type !== 'advance') return;
    const group = pendingAction.group;
    const nextStage = NEXT_STAGE[group.growth_stage];
    if (!nextStage) return;
    setAdvanceError(null);
    try {
      await advanceStage(group.id, nextStage);
      setPendingAction(null);
    } catch (err: unknown) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to advance stage.');
    }
  }

  async function handleMoveRoom(toRoomId: string) {
    if (!pendingAction || pendingAction.type !== 'move') return;
    await moveToRoom(pendingAction.group.id, toRoomId);
    setPendingAction(null);
  }

  async function handleToggleMother() {
    if (!pendingAction || pendingAction.type !== 'mother') return;
    const group = pendingAction.group;
    try {
      await setMotherStatus(group.id, !group.is_mother);
    } catch {
      // silent
    }
    setPendingAction(null);
  }

  if (loading) {
    return <PageSkeleton variant="cards" />;
  }

  const advanceGroup = pendingAction?.type === 'advance' ? pendingAction.group : null;
  const nextStageForAdvance = advanceGroup ? NEXT_STAGE[advanceGroup.growth_stage] : null;
  const isCloneToVeg = advanceGroup?.growth_stage === 'clone' && nextStageForAdvance === 'veg';

  function renderNextHarvestLabel(): string {
    if (nextHarvestDays === null) return 'No date set';
    if (nextHarvestDays < 0) return `${Math.abs(nextHarvestDays)}d overdue`;
    if (nextHarvestDays === 0) return 'Today';
    return `In ${nextHarvestDays}d`;
  }

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Cultivation</h1>
          <p className="text-cult-light-gray mt-2">Grow room management, plant tracking, and harvest sessions</p>
        </div>
        <div className="flex border border-cult-border overflow-hidden">
          <button
            onClick={() => { setViewMode('map'); try { localStorage.setItem('cult-view-mode', 'map'); } catch {} }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
              viewMode === 'map'
                ? 'bg-cult-surface-overlay text-cult-white'
                : 'text-cult-text-muted hover:text-cult-text-secondary'
            }`}
          >
            <Map className="w-3 h-3" />
            Map
          </button>
          <button
            onClick={() => { setViewMode('cards'); try { localStorage.setItem('cult-view-mode', 'cards'); } catch {} }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
              viewMode === 'cards'
                ? 'bg-cult-surface-overlay text-cult-white'
                : 'text-cult-text-muted hover:text-cult-text-secondary'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            Cards
          </button>
        </div>
      </div>

      {strainsWithoutAbbrev.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-950 border border-amber-700 text-amber-300 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Abbreviation required for harvest: </span>
            {strainsWithoutAbbrev.join(', ')} &mdash; add 3-letter abbreviations in Products &gt; Strains.
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Rooms"
            value={activeRooms.length}
            icon={<Package className="w-4 h-4" />}
          />
          <StatCard
            label="Active Groups"
            value={groups.length}
            icon={<Sprout className="w-4 h-4" />}
            subtitle={`${totalPlants.toLocaleString()} total plants`}
          />
          <StatCard
            label="Active Harvests"
            value={sessions.length}
            icon={<Scissors className="w-4 h-4" />}
            variant={sessions.length > 0 ? 'accent' : 'default'}
          />
          <StatCard
            label="Next Harvest"
            value={renderNextHarvestLabel()}
            icon={<Calendar className="w-4 h-4" />}
            variant={nextHarvestDays !== null && nextHarvestDays <= 7 ? 'accent' : 'default'}
          />
        </div>

        {activeRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Package className="w-10 h-10 text-cult-medium-gray" />
            <p className="text-cult-medium-gray text-sm">No active grow rooms</p>
          </div>
        ) : viewMode === 'map' ? (
          <BuildingMapView
            opsRooms={opsRooms}
            rooms={rooms}
            onRoomSelect={setSelectedRoom}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {opsRooms.map((opsState) => {
                const fullRoom = rooms.find((r) => r.id === opsState.room_id);
                return (
                  <RoomCommandCard
                    key={opsState.room_id}
                    state={opsState}
                    onClick={() => { if (fullRoom) setSelectedRoom(fullRoom); }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedRoom && (
        <RoomDetailDrawer
          room={selectedRoom}
          preloadedGroups={groups}
          onClose={() => setSelectedRoom(null)}
          onGroupAction={handleGroupAction}
        />
      )}

      {pendingAction?.type === 'detail' && (
        <PlantGroupDetailPanel
          group={pendingAction.group}
          onClose={() => setPendingAction(null)}
        />
      )}

      {pendingAction?.type === 'plants' && (
        <PlantGroupDetailPanel
          group={pendingAction.group}
          onClose={() => setPendingAction(null)}
          initialTab="plants"
        />
      )}

      {pendingAction?.type === 'move' && (
        <MoveToRoomModal
          group={pendingAction.group}
          rooms={rooms}
          onMove={handleMoveRoom}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction?.type === 'mother' && (
        (() => { void handleToggleMother(); return null; })()
      )}

      {pendingAction?.type === 'advance' && advanceGroup && nextStageForAdvance && nextStageForAdvance !== 'harvested' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider">
              Advance Stage
            </h3>

            {isCloneToVeg && (
              <div className="flex items-start gap-2.5 bg-sky-950 border border-sky-700 text-sky-300 p-3 text-sm">
                <Sprout className="w-4 h-4 mt-0.5 flex-shrink-0 text-sky-400" />
                <div>
                  <span className="font-semibold block mb-0.5">Plant IDs will be auto-generated</span>
                  {advanceGroup.plant_count} unique placeholder IDs will be created for this group.
                  You can replace them with state-issued IDs at any time from the Plant IDs tab.
                </div>
              </div>
            )}

            <p className="text-cult-light-gray text-sm">
              Move{' '}
              <span className="text-cult-white font-mono">
                {advanceGroup.batch_registry?.batch_number ?? advanceGroup.strains?.name ?? 'this group'}
              </span>{' '}
              from <span className="text-cult-white">{advanceGroup.growth_stage}</span> to{' '}
              <span className="text-cult-white">{nextStageForAdvance}</span>? This cannot be reversed.
            </p>

            {advanceError && (
              <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {advanceError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={confirmAdvance}
                size="sm"
              >
                Confirm
              </Button>
              <button
                onClick={() => { setPendingAction(null); setAdvanceError(null); }}
                className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
