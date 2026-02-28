import { useState, useEffect } from 'react';
import { Sprout, Leaf, Scissors, Package, AlertTriangle, Flower, Wind } from 'lucide-react';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useHarvestSessions } from '../hooks/useHarvestSessions';
import { useDryRooms } from '../hooks/useDryRooms';
import { cultivationService } from '../services';
import { RoomDetailDrawer } from './RoomDetailDrawer';
import { PlantGroupDetailPanel } from './PlantGroupDetailPanel';
import { MoveToRoomModal } from './MoveToRoomModal';
import { isValidStrainAbbreviation, formatWeight } from '../utils';
import type { GrowRoom, PlantGroup, GrowthStage, DryRoom, HarvestSession } from '../types';
import { StatCard } from '../../../shared/components';

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  clone: 'veg',
  veg: 'flower',
  flower: 'harvested',
  harvested: null,
};

interface StageCountBadgeProps {
  stage: string;
  count: number;
}

function StageCountBadge({ stage, count }: StageCountBadgeProps) {
  const styles: Record<string, string> = {
    clone: 'bg-cult-stage-clone/10 border-cult-stage-clone/40 text-cult-stage-clone',
    veg: 'bg-cult-stage-veg/10 border-cult-stage-veg/40 text-cult-stage-veg',
    flower: 'bg-cult-stage-flower/10 border-cult-stage-flower/40 text-cult-stage-flower',
    harvested: 'bg-cult-stage-harvest/10 border-cult-stage-harvest/40 text-cult-stage-harvest',
  };
  const cls = styles[stage] ?? 'bg-cult-surface border-cult-border text-cult-text-muted';

  return (
    <div className={`flex items-center justify-between border px-3 py-2 ${cls}`}>
      <span className="text-xs uppercase tracking-wider font-semibold">{stage}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

const ROOM_TYPE_BORDER: Record<string, string> = {
  clone: 'border-l-cult-stage-clone',
  veg: 'border-l-cult-stage-veg',
  flower: 'border-l-cult-stage-flower',
  mother: 'border-l-cult-stage-harvest',
  mixed: 'border-l-cult-border',
};

interface RoomCardProps {
  room: GrowRoom;
  groupCount: number;
  plantCount: number;
  onClick: () => void;
}

function RoomCard({ room, groupCount, plantCount, onClick }: RoomCardProps) {
  const borderCls = ROOM_TYPE_BORDER[room.room_type] ?? ROOM_TYPE_BORDER.mixed;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-cult-near-black border border-cult-dark-gray border-l-4 ${borderCls} px-4 py-3 hover:border-cult-medium-gray hover:bg-cult-black transition-all group`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-cult-white">{room.room_code}</span>
            <span className="text-xs border border-cult-dark-gray text-cult-medium-gray px-1.5 py-0.5 uppercase tracking-wider">
              {room.room_type}
            </span>
          </div>
          <span className="text-cult-light-gray text-xs truncate mt-0.5">{room.name}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-xs text-cult-light-gray">{groupCount} group{groupCount !== 1 ? 's' : ''}</span>
          <span className="text-xs text-cult-medium-gray">{plantCount} plants</span>
        </div>
      </div>
    </button>
  );
}

interface RoomSectionGroupProps {
  title: string;
  rooms: GrowRoom[];
  groups: PlantGroup[];
  onRoomClick: (room: GrowRoom) => void;
}

function RoomSectionGroup({ title, rooms, groups, onRoomClick }: RoomSectionGroupProps) {
  if (rooms.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-cult-medium-gray uppercase tracking-widest font-semibold mb-2">
        {title}
      </p>
      <div className="space-y-1.5">
        {rooms.map((room) => {
          const roomGroups = groups.filter((g) => g.grow_room_id === room.id);
          const plantCount = roomGroups.reduce((s, g) => s + g.plant_count, 0);
          return (
            <RoomCard
              key={room.id}
              room={room}
              groupCount={roomGroups.length}
              plantCount={plantCount}
              onClick={() => onRoomClick(room)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DryRoomsSectionProps {
  onViewDryRooms?: () => void;
}

function DryRoomsSection({ onViewDryRooms }: DryRoomsSectionProps) {
  const { rooms: dryRooms, loading: dryLoading } = useDryRooms();
  const [dryingHarvests, setDryingHarvests] = useState<HarvestSession[]>([]);
  const [loadingHarvests, setLoadingHarvests] = useState(true);

  useEffect(() => {
    let cancelled = false;
    cultivationService.listDryingHarvests().then((data) => {
      if (!cancelled) {
        setDryingHarvests(data);
        setLoadingHarvests(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingHarvests(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (dryLoading || loadingHarvests) return null;

  const activeDryRooms = dryRooms.filter((r) => r.is_active);
  if (activeDryRooms.length === 0) return null;

  function getHarvestsForRoom(roomId: string) {
    return dryingHarvests.filter((h) => h.dry_room_id === roomId);
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs text-cult-light-gray uppercase tracking-wider flex items-center gap-2">
          <Wind className="w-4 h-4" />
          Dry Rooms
        </h2>
        {onViewDryRooms && (
          <button
            onClick={onViewDryRooms}
            className="text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors underline underline-offset-2"
          >
            Manage
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeDryRooms.map((room) => {
          const harvests = getHarvestsForRoom(room.id);
          const totalWeight = harvests.reduce(
            (s, h) => s + (h.adjusted_weight_grams ?? h.wet_weight_grams),
            0
          );
          const isEmpty = harvests.length === 0;

          return (
            <div
              key={room.id}
              className={`border ${isEmpty ? 'border-cult-dark-gray' : 'border-cyan-800'} p-4 ${
                isEmpty ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wind className={`w-4 h-4 ${isEmpty ? 'text-cult-medium-gray' : 'text-cyan-400'}`} />
                  <span className="font-mono text-sm font-bold text-cult-white">{room.room_code}</span>
                </div>
                {!isEmpty && (
                  <span className="text-xs text-cyan-400 font-mono">
                    {formatWeight(totalWeight)}
                  </span>
                )}
              </div>
              <p className="text-cult-light-gray text-xs mb-2">{room.name}</p>

              {isEmpty ? (
                <p className="text-cult-medium-gray text-xs italic">Empty</p>
              ) : (
                <div className="space-y-1">
                  {harvests.map((h) => {
                    const strainName = h.plant_groups?.strains?.name ?? 'Unknown';
                    const batchNumber = h.batch_registry?.batch_number;
                    const weight = h.adjusted_weight_grams ?? h.wet_weight_grams;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between bg-cult-black border border-cult-dark-gray px-2 py-1 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {batchNumber && (
                            <span className="text-cyan-400 font-mono">{batchNumber}</span>
                          )}
                          <span className="text-cult-light-gray truncate">{strainName}</span>
                        </div>
                        <span className="text-cult-white font-mono flex-shrink-0">
                          {formatWeight(weight)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {room.capacity_lbs != null && !isEmpty && (
                <p className="text-cult-medium-gray text-[10px] mt-2">
                  Capacity: {room.capacity_lbs} lbs
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
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

  const [selectedRoom, setSelectedRoom] = useState<GrowRoom | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const loading = roomsLoading || groupsLoading || sessionsLoading;

  const activeRooms = rooms.filter((r) => r.is_active);

  const motherRooms = activeRooms.filter((r) => r.room_type === 'mother');
  const vegRooms = activeRooms.filter((r) => r.room_type === 'veg');
  const flowerRooms = activeRooms.filter((r) => r.room_type === 'flower');
  const cloneRooms = activeRooms.filter((r) => r.room_type === 'clone');
  const mixedRooms = activeRooms.filter((r) => r.room_type === 'mixed');

  const stageCounts = {
    clone: groups.filter((g) => g.growth_stage === 'clone').length,
    veg: groups.filter((g) => g.growth_stage === 'veg').length,
    flower: groups.filter((g) => g.growth_stage === 'flower').length,
  };

  const totalPlants = groups.reduce((sum, g) => sum + g.plant_count, 0);
  const motherGroups = groups.filter((g) => g.is_mother);

  const strainsWithoutAbbrev = Array.from(
    new Set(
      groups
        .filter((g) => !isValidStrainAbbreviation(g.strains?.abbreviation))
        .map((g) => g.strains?.name ?? 'Unknown')
    )
  );

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
    return <div className="p-6 text-cult-light-gray">Loading cultivation data...</div>;
  }

  const advanceGroup = pendingAction?.type === 'advance' ? pendingAction.group : null;
  const nextStageForAdvance = advanceGroup ? NEXT_STAGE[advanceGroup.growth_stage] : null;
  const isCloneToVeg = advanceGroup?.growth_stage === 'clone' && nextStageForAdvance === 'veg';

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Cultivation</h1>
        <p className="text-cult-light-gray mt-2">Grow room management, plant tracking, and harvest sessions</p>
      </div>

      {strainsWithoutAbbrev.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-950 border border-amber-700 text-amber-300 p-4 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Abbreviation required for harvest: </span>
            {strainsWithoutAbbrev.join(', ')} — add 3-letter abbreviations in Products &gt; Strains.
          </div>
        </div>
      )}

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
          label="Mother Plants"
          value={motherGroups.length}
          icon={<Leaf className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-cult-near-black border border-cult-medium-gray p-5">
          <h2 className="text-xs text-cult-light-gray uppercase tracking-wider mb-4">Plants by Stage</h2>
          <div className="space-y-2">
            <StageCountBadge stage="clone" count={stageCounts.clone} />
            <StageCountBadge stage="veg" count={stageCounts.veg} />
            <StageCountBadge stage="flower" count={stageCounts.flower} />
          </div>
          {groups.length === 0 && (
            <p className="text-cult-medium-gray text-sm text-center py-4">No active plant groups</p>
          )}
        </div>

        <div className="bg-cult-near-black border border-cult-medium-gray p-5">
          <h2 className="text-xs text-cult-light-gray uppercase tracking-wider mb-4">Active Harvests</h2>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Flower className="w-8 h-8 text-cult-medium-gray" />
              <p className="text-cult-medium-gray text-sm">No active harvests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border border-cult-medium-gray px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-cult-white text-sm font-mono">
                      {s.batch_registry?.batch_number ?? '—'}
                    </span>
                    <span className="text-cult-light-gray text-xs">
                      {s.plant_groups?.strains?.name ?? 'Unknown Strain'}
                    </span>
                  </div>
                  <span className="text-cult-light-gray text-xs">
                    {s.wet_weight_grams >= 1000
                      ? `${(s.wet_weight_grams / 1000).toFixed(2)} kg`
                      : `${s.wet_weight_grams.toFixed(1)} g`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeRooms.length > 0 && (
        <div className="bg-cult-near-black border border-cult-medium-gray p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-cult-light-gray uppercase tracking-wider">Grow Rooms</h2>
            <a
              href="/settings"
              className="text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors underline underline-offset-2"
            >
              Manage in Settings
            </a>
          </div>
          <div className="space-y-5">
            <RoomSectionGroup
              title="Mother"
              rooms={motherRooms}
              groups={groups}
              onRoomClick={setSelectedRoom}
            />
            <RoomSectionGroup
              title="Clone"
              rooms={cloneRooms}
              groups={groups}
              onRoomClick={setSelectedRoom}
            />
            <RoomSectionGroup
              title="Veg"
              rooms={vegRooms}
              groups={groups}
              onRoomClick={setSelectedRoom}
            />
            <RoomSectionGroup
              title="Flower"
              rooms={flowerRooms}
              groups={groups}
              onRoomClick={setSelectedRoom}
            />
            <RoomSectionGroup
              title="Mixed"
              rooms={mixedRooms}
              groups={groups}
              onRoomClick={setSelectedRoom}
            />
          </div>
        </div>
      )}

      <DryRoomsSection />

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
              <button
                onClick={confirmAdvance}
                className="bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-cult-surface transition-all"
              >
                Confirm
              </button>
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
