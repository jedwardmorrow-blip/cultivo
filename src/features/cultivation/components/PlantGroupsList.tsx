import { useState } from 'react';
import { Plus, ArrowRight, Home, Star, Info, AlertTriangle } from 'lucide-react';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { NewPlantGroupModal } from './NewPlantGroupModal';
import { MoveToRoomModal } from './MoveToRoomModal';
import { PlantGroupDetailPanel } from './PlantGroupDetailPanel';
import { isValidStrainAbbreviation } from '../utils';
import type { PlantGroup, GrowthStage } from '../types';

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  clone: 'veg',
  veg: 'flower',
  flower: 'harvested',
  harvested: null,
};

const STAGE_COLORS: Record<GrowthStage, string> = {
  clone: 'bg-sky-950 border-sky-700 text-sky-400',
  veg: 'bg-green-950 border-green-700 text-green-400',
  flower: 'bg-rose-950 border-rose-700 text-rose-400',
  harvested: 'bg-amber-950 border-amber-700 text-amber-400',
};

interface PlantGroupRowProps {
  group: PlantGroup;
  onAdvanceStage: (g: PlantGroup, toStage: GrowthStage) => void;
  onMoveRoom: (g: PlantGroup) => void;
  onToggleMother: (g: PlantGroup) => void;
  onDetail: (g: PlantGroup) => void;
}

function PlantGroupRow({ group, onAdvanceStage, onMoveRoom, onToggleMother, onDetail }: PlantGroupRowProps) {
  const nextStage = NEXT_STAGE[group.growth_stage];
  const stageCls = STAGE_COLORS[group.growth_stage] ?? '';
  const hasAbbrev = isValidStrainAbbreviation(group.strains?.abbreviation);

  const daysInStage = Math.floor(
    (Date.now() - new Date(group.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="border border-cult-medium-gray bg-cult-near-black hover:border-cult-lighter-gray transition-all">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-cult-white">{group.group_number}</span>
            <span className={`text-xs border px-1.5 py-0.5 uppercase tracking-wider ${stageCls}`}>
              {group.growth_stage}
            </span>
            {group.is_mother && (
              <span className="text-xs border border-amber-700 text-amber-400 px-1.5 py-0.5 uppercase tracking-wider">
                Mother
              </span>
            )}
            {!hasAbbrev && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                No abbreviation
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-cult-light-gray text-xs truncate">{group.strains?.name ?? 'Unknown'}</span>
            <span className="text-cult-medium-gray text-xs">·</span>
            <span className="text-cult-light-gray text-xs">{group.plant_count} plants</span>
            <span className="text-cult-medium-gray text-xs">·</span>
            <span className="text-cult-light-gray text-xs">{group.grow_rooms?.room_code ?? '—'}</span>
            <span className="text-cult-medium-gray text-xs">·</span>
            <span className="text-cult-medium-gray text-xs">{daysInStage}d in stage</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {nextStage && nextStage !== 'harvested' && (
            <button
              onClick={() => onAdvanceStage(group, nextStage)}
              title={`Advance to ${nextStage}`}
              className="flex items-center gap-1 text-xs border border-cult-medium-gray text-cult-light-gray px-2.5 py-1.5 hover:border-cult-lighter-gray hover:text-cult-white transition-all uppercase tracking-wider"
            >
              <ArrowRight className="w-3 h-3" />
              {nextStage}
            </button>
          )}
          <button
            onClick={() => onMoveRoom(group)}
            title="Move to different room"
            className="p-1.5 text-cult-medium-gray hover:text-cult-white transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleMother(group)}
            title={group.is_mother ? 'Remove mother status' : 'Mark as mother'}
            className={`p-1.5 transition-colors ${group.is_mother ? 'text-amber-400 hover:text-amber-300' : 'text-cult-medium-gray hover:text-amber-400'}`}
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDetail(group)}
            title="View details"
            className="p-1.5 text-cult-medium-gray hover:text-cult-white transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlantGroupsList() {
  const { groups, loading, error, createGroup, advanceStage, moveToRoom, setMotherStatus } = usePlantGroups({ stage: 'active' });
  const { rooms } = useGrowRooms();

  const [showNewModal, setShowNewModal] = useState(false);
  const [movingGroup, setMovingGroup] = useState<PlantGroup | null>(null);
  const [detailGroup, setDetailGroup] = useState<PlantGroup | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<{ group: PlantGroup; toStage: GrowthStage } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function confirmAdvance() {
    if (!advanceTarget) return;
    setActionError(null);
    try {
      await advanceStage(advanceTarget.group.id, advanceTarget.toStage);
      setAdvanceTarget(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to advance stage.');
    }
  }

  async function handleMoveRoom(group: PlantGroup, toRoomId: string) {
    await moveToRoom(group.id, toRoomId);
    setMovingGroup(null);
  }

  async function handleToggleMother(group: PlantGroup) {
    try {
      await setMotherStatus(group.id, !group.is_mother);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update mother status.');
    }
  }

  if (loading) {
    return <div className="p-6 text-cult-light-gray">Loading plant groups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Plant Groups</h1>
          <p className="text-cult-light-gray mt-2">Track plant groups through clone, veg, and flower stages</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-all shadow-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {(error || actionError) && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error || actionError}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
          <p className="text-cult-medium-gray text-sm uppercase tracking-wider">No active plant groups</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <PlantGroupRow
              key={g.id}
              group={g}
              onAdvanceStage={(grp, stage) => setAdvanceTarget({ group: grp, toStage: stage })}
              onMoveRoom={setMovingGroup}
              onToggleMother={handleToggleMother}
              onDetail={setDetailGroup}
            />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewPlantGroupModal
          rooms={rooms}
          onCreate={async (input) => {
            const group = await createGroup(input);
            setShowNewModal(false);
            return group;
          }}
          onCancel={() => setShowNewModal(false)}
        />
      )}

      {movingGroup && (
        <MoveToRoomModal
          group={movingGroup}
          rooms={rooms}
          onMove={(toRoomId) => handleMoveRoom(movingGroup, toRoomId)}
          onCancel={() => setMovingGroup(null)}
        />
      )}

      {detailGroup && (
        <PlantGroupDetailPanel
          group={detailGroup}
          onClose={() => setDetailGroup(null)}
        />
      )}

      {advanceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-2">Advance Stage</h3>
            <p className="text-cult-light-gray text-sm mb-5">
              Move <span className="text-cult-white font-mono">{advanceTarget.group.group_number}</span> from{' '}
              <span className="text-cult-white">{advanceTarget.group.growth_stage}</span> to{' '}
              <span className="text-cult-white">{advanceTarget.toStage}</span>? This cannot be reversed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmAdvance}
                className="bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setAdvanceTarget(null)}
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
