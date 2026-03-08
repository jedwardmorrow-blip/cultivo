import { useState } from 'react';
import { Sprout, Scissors, Package, AlertTriangle, Calendar } from 'lucide-react';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useHarvestSessions } from '../hooks/useHarvestSessions';
import { useRoomSummaries } from '../hooks/useRoomSummaries';
import { RoomDetailDrawer } from './RoomDetailDrawer';
import { PlantGroupDetailPanel } from './PlantGroupDetailPanel';
import { MoveToRoomModal } from './MoveToRoomModal';
import { RoomGroup } from './RoomGroup';
import { StrainPills } from './StrainPills';
import { FlowerRunProgress } from './FlowerRunProgress';
import { HarvestCountdown } from './HarvestCountdown';
import { isValidStrainAbbreviation } from '../utils';
import { daysBetween, todayIso } from '../utils/dateUtils';
import type { GrowRoom, PlantGroup, GrowthStage, RoomType, RoomSummary } from '../types';
import { Button, StatCard, PageSkeleton } from '../../../shared/components';

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  clone: 'veg',
  veg: 'flower',
  flower: 'harvested',
  harvested: null,
};

const STAGE_GLOW: Record<RoomType, string> = {
  clone: 'rgba(14,165,233,0.06)',
  veg: 'rgba(16,185,129,0.06)',
  flower: 'rgba(244,63,94,0.06)',
  mother: 'rgba(245,158,11,0.06)',
  mixed: 'rgba(64,64,64,0.06)',
};

const ROOM_TYPE_BORDER: Record<string, string> = {
  clone: 'border-l-cult-stage-clone',
  veg: 'border-l-cult-stage-veg',
  flower: 'border-l-cult-stage-flower',
  mother: 'border-l-cult-stage-harvest',
  mixed: 'border-l-cult-border',
};

const DEFAULT_FLOWER_DAYS = 63;

function computeHarvestDays(harvestDate: string | null): number | null {
  if (!harvestDate) return null;
  return daysBetween(todayIso(), harvestDate);
}

function computeDayInFlower(flipDate: string | null): number | null {
  if (!flipDate) return null;
  const days = daysBetween(flipDate, todayIso());
  return Math.max(0, days) + 1;
}

interface EnhancedRoomCardProps {
  room: GrowRoom;
  summary: RoomSummary | undefined;
  onClick: () => void;
}

function EnhancedRoomCard({ room, summary, onClick }: EnhancedRoomCardProps) {
  const borderCls = ROOM_TYPE_BORDER[room.room_type] ?? ROOM_TYPE_BORDER.mixed;
  const glow = STAGE_GLOW[room.room_type] ?? STAGE_GLOW.mixed;
  const isFlower = room.room_type === 'flower';
  const groupCount = summary?.groups.length ?? 0;
  const plantCount = summary?.total_plant_count ?? 0;
  const harvestDays = isFlower ? computeHarvestDays(summary?.earliest_projected_harvest ?? null) : null;
  const dayInFlower = isFlower ? computeDayInFlower(summary?.earliest_flip_date ?? null) : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-cult-near-black border border-cult-dark-gray border-l-4 ${borderCls} px-4 py-3.5 hover:border-cult-medium-gray hover:bg-cult-black transition-all group space-y-2.5`}
      style={{ boxShadow: `inset 0 0 20px ${glow}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-cult-white">{room.room_code}</span>
          <span className="text-xs border border-cult-dark-gray text-cult-medium-gray px-1.5 py-0.5 uppercase tracking-wider">
            {room.room_type}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-cult-light-gray">{groupCount} group{groupCount !== 1 ? 's' : ''}</span>
          <span className="text-xs text-cult-medium-gray">{plantCount} plants</span>
        </div>
      </div>

      {summary && summary.strains.length > 0 && (
        <StrainPills strains={summary.strains} />
      )}

      {isFlower && dayInFlower !== null && (
        <FlowerRunProgress dayInFlower={dayInFlower} estimatedFlowerDays={DEFAULT_FLOWER_DAYS} />
      )}

      {isFlower && (
        <HarvestCountdown daysUntilHarvest={harvestDays} />
      )}
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

const ROOM_TYPE_ORDER: RoomType[] = ['mother', 'clone', 'veg', 'flower', 'mixed'];

export function CultivationDashboard() {
  const { rooms, loading: roomsLoading } = useGrowRooms();
  const { groups, loading: groupsLoading, advanceStage, moveToRoom, setMotherStatus } = usePlantGroups({ stage: 'active' });
  const { sessions, loading: sessionsLoading } = useHarvestSessions({ status: 'active' });
  const { summaries, loading: summariesLoading } = useRoomSummaries();

  const [selectedRoom, setSelectedRoom] = useState<GrowRoom | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const loading = roomsLoading || groupsLoading || sessionsLoading || summariesLoading;

  const activeRooms = rooms.filter((r) => r.is_active);
  const summaryMap = new Map(summaries.map((s) => [s.room_id, s]));

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

  const roomsByType = ROOM_TYPE_ORDER.map((type) => ({
    type,
    rooms: activeRooms.filter((r) => r.room_type === type).sort((a, b) => a.room_code.localeCompare(b.room_code)),
  })).filter((g) => g.rooms.length > 0);

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Cultivation</h1>
        <p className="text-cult-light-gray mt-2">Grow room management, plant tracking, and harvest sessions</p>
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
        ) : (
          <div className="space-y-6">
            {roomsByType.map(({ type, rooms: typeRooms }) => (
              <RoomGroup key={type} roomType={type} count={typeRooms.length}>
                {typeRooms.map((room) => (
                  <EnhancedRoomCard
                    key={room.id}
                    room={room}
                    summary={summaryMap.get(room.id)}
                    onClick={() => setSelectedRoom(room)}
                  />
                ))}
              </RoomGroup>
            ))}
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
