import { useState } from 'react';
import { Plus, AlertTriangle, Sprout } from 'lucide-react';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { usePlantGroupLabel } from '../hooks/usePlantGroupLabel';
import { NewPlantGroupModal } from './NewPlantGroupModal';
import { MoveToRoomModal } from './MoveToRoomModal';
import { PlantGroupDetailPanel } from './PlantGroupDetailPanel';
import { PlantGroupActionsMenu } from './PlantGroupActionsMenu';
import { PlantGroupLabelPrintModal } from './PlantGroupLabelPrintModal';
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

type PendingAction =
  | { type: 'detail'; group: PlantGroup }
  | { type: 'move'; group: PlantGroup }
  | { type: 'advance'; group: PlantGroup }
  | { type: 'mother'; group: PlantGroup }
  | { type: 'plants'; group: PlantGroup }
  | { type: 'printGroup'; group: PlantGroup }
  | { type: 'printPlants'; group: PlantGroup };

interface PlantGroupRowProps {
  group: PlantGroup;
  onAction: (group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants' | 'printGroup' | 'printPlants') => void;
  onRefresh: () => void;
}

function PlantGroupRow({ group, onAction, onRefresh }: PlantGroupRowProps) {
  const stageCls = STAGE_COLORS[group.growth_stage] ?? '';
  const hasAbbrev = isValidStrainAbbreviation(group.strains?.abbreviation);

  const daysInStage = Math.floor(
    (Date.now() - new Date(group.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="border border-cult-medium-gray bg-cult-near-black hover:border-cult-lighter-gray transition-all">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-cult-white">{group.batch_registry?.batch_number ?? '—'}</span>
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
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-cult-light-gray text-xs truncate">{group.strains?.name ?? 'Unknown'}</span>
            <span className="text-cult-medium-gray text-xs">·</span>
            <span className="text-cult-light-gray text-xs">{group.plant_count} plants</span>
            <span className="text-cult-medium-gray text-xs">·</span>
            <span className="text-cult-light-gray text-xs">{group.grow_rooms?.room_code ?? '—'}</span>
            <span className="text-cult-medium-gray text-xs">·</span>
            <span className="text-cult-medium-gray text-xs">{daysInStage}d in stage</span>
          </div>
        </div>

        <PlantGroupActionsMenu
          group={group}
          onDetail={() => onAction(group, 'detail')}
          onMove={() => onAction(group, 'move')}
          onAdvance={() => onAction(group, 'advance')}
          onToggleMother={() => onAction(group, 'mother')}
          onViewPlants={() => onAction(group, 'plants')}
          onPrintGroupLabel={() => onAction(group, 'printGroup')}
          onPrintPlantLabels={() => onAction(group, 'printPlants')}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}

export function PlantGroupsList() {
  const { groups, loading, error, reload, createGroup, advanceStage, moveToRoom, setMotherStatus } = usePlantGroups({ stage: 'active' });
  const { rooms } = useGrowRooms();
  const label = usePlantGroupLabel();

  const [showNewModal, setShowNewModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleAction(group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants' | 'printGroup' | 'printPlants') {
    setActionError(null);
    if (action === 'mother') {
      void (async () => {
        try {
          await setMotherStatus(group.id, !group.is_mother);
        } catch (err: unknown) {
          setActionError(err instanceof Error ? err.message : 'Failed to update mother status.');
        }
      })();
      return;
    }
    if (action === 'printGroup') {
      void label.openGroupLabel(group);
      return;
    }
    if (action === 'printPlants') {
      void label.openPlantLabels(group);
      return;
    }
    setPendingAction({ type: action, group } as PendingAction);
  }

  async function confirmAdvance() {
    if (!pendingAction || pendingAction.type !== 'advance') return;
    const group = pendingAction.group;
    const nextStage = NEXT_STAGE[group.growth_stage];
    if (!nextStage) return;
    setActionError(null);
    try {
      await advanceStage(group.id, nextStage);
      setPendingAction(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to advance stage.');
    }
  }

  async function handleMoveRoom(toRoomId: string) {
    if (!pendingAction || pendingAction.type !== 'move') return;
    await moveToRoom(pendingAction.group.id, toRoomId);
    setPendingAction(null);
  }

  const advanceGroup = pendingAction?.type === 'advance' ? pendingAction.group : null;
  const nextStageForAdvance = advanceGroup ? NEXT_STAGE[advanceGroup.growth_stage] : null;
  const isCloneToVeg = advanceGroup?.growth_stage === 'clone' && nextStageForAdvance === 'veg';

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
              onAction={handleAction}
              onRefresh={reload}
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

      {pendingAction?.type === 'move' && (
        <MoveToRoomModal
          group={pendingAction.group}
          rooms={rooms}
          onMove={handleMoveRoom}
          onCancel={() => setPendingAction(null)}
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

      <PlantGroupLabelPrintModal
        isOpen={label.isOpen}
        isLoading={label.isLoading}
        isPrinting={label.isPrinting}
        labelData={label.labelData}
        logoDataUrl={label.logoDataUrl}
        error={label.error}
        onClose={label.closeLabel}
        onPrint={(ref) => { void label.printLabels(ref); }}
      />

      {pendingAction?.type === 'advance' && advanceGroup && nextStageForAdvance && nextStageForAdvance !== 'harvested' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider">Advance Stage</h3>

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

            {actionError && (
              <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {actionError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={confirmAdvance}
                className="bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setPendingAction(null)}
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
