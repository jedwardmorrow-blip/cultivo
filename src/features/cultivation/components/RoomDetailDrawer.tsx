import { useState, useCallback, useEffect } from 'react';
import { X, Flower2, MapPin, Settings, MoreVertical } from 'lucide-react';
import { cultivationService } from '../services';
import { useRoomSections } from '../hooks/useRoomSections';
import { FlipRoomModal } from './FlipRoomModal';
import { PlantGroupActionsMenu } from './PlantGroupActionsMenu';
import type { GrowRoom, PlantGroup, RoomTable, RoomSection } from '../types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000
  );
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ROOM_TYPE_BORDER: Record<string, string> = {
  clone: 'border-sky-700',
  veg: 'border-green-700',
  flower: 'border-rose-700',
  mother: 'border-amber-700',
  mixed: 'border-cult-medium-gray',
};

const STAGE_BADGE: Record<string, string> = {
  clone: 'text-sky-400 border-sky-800 bg-sky-950',
  veg: 'text-green-400 border-green-800 bg-green-950',
  flower: 'text-rose-400 border-rose-800 bg-rose-950',
  harvested: 'text-cult-medium-gray border-cult-dark-gray bg-cult-near-black',
};

function buildGridData(groups: PlantGroup[]): Map<string, PlantGroup[]> {
  const placedMap = new Map<string, PlantGroup[]>();
  for (const g of groups) {
    if (g.room_table_id && g.room_section_id) {
      const key = `${g.room_table_id}:${g.room_section_id}`;
      if (!placedMap.has(key)) placedMap.set(key, []);
      placedMap.get(key)!.push(g);
    }
  }
  return placedMap;
}

interface DrawerGridCellProps {
  groups: PlantGroup[];
  onGroupAction: (group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants') => void;
  onRefresh: () => void;
}

function DrawerGridCell({ groups, onGroupAction, onRefresh }: DrawerGridCellProps) {
  if (groups.length === 0) {
    return (
      <div className="border border-cult-dark-gray bg-cult-black/30 h-16 flex items-center justify-center">
        <span className="text-xs text-cult-dark-gray">—</span>
      </div>
    );
  }

  return (
    <div className="border border-cult-medium-gray bg-cult-black h-16 p-1.5 overflow-hidden">
      {groups.map((g) => (
        <div key={g.id} className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-bold text-cult-white font-mono truncate">
              {g.strains?.abbreviation ?? '???'}
            </span>
            <span className="text-xs text-cult-medium-gray">{g.plant_count}p</span>
          </div>
          <PlantGroupActionsMenu
            group={g}
            onDetail={() => onGroupAction(g, 'detail')}
            onMove={() => onGroupAction(g, 'move')}
            onAdvance={() => onGroupAction(g, 'advance')}
            onToggleMother={() => onGroupAction(g, 'mother')}
            onViewPlants={() => onGroupAction(g, 'plants')}
            onRefresh={onRefresh}
            compact
          />
        </div>
      ))}
    </div>
  );
}

interface DrawerGridProps {
  tables: RoomTable[];
  groups: PlantGroup[];
  onGroupAction: (group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants') => void;
  onRefresh: () => void;
}

function DrawerGrid({ tables, groups, onGroupAction, onRefresh }: DrawerGridProps) {
  const placedMap = buildGridData(groups);

  if (tables.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-cult-medium-gray italic py-4 border border-cult-dark-gray px-3">
        <Settings className="w-3.5 h-3.5" />
        No tables configured. Configure the layout in Settings &rarr; Grow Rooms.
      </div>
    );
  }

  const allSections: RoomSection[] = tables.flatMap((t) => t.sections);
  const uniqueLabels = [...new Set(allSections.map((s) => s.section_label))].sort();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-cult-medium-gray uppercase tracking-wider font-normal py-1 pr-3 w-16">
              Section
            </th>
            {tables.map((t) => (
              <th key={t.id} className="text-center text-cult-medium-gray font-mono font-normal py-1 px-1 min-w-24">
                T{t.table_number}
                {t.table_name && (
                  <span className="block text-cult-dark-gray normal-case font-normal">{t.table_name}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uniqueLabels.map((label) => (
            <tr key={label}>
              <td className="pr-3 py-0.5">
                <span className="font-mono text-cult-light-gray font-bold">{label}</span>
              </td>
              {tables.map((t) => {
                const section = t.sections.find((s) => s.section_label === label);
                if (!section) {
                  return (
                    <td key={t.id} className="py-0.5 px-1">
                      <div className="border border-cult-dark-gray/30 bg-cult-black/10 h-16" />
                    </td>
                  );
                }
                const key = `${t.id}:${section.id}`;
                const cellGroups = placedMap.get(key) ?? [];
                return (
                  <td key={t.id} className="py-0.5 px-1">
                    <DrawerGridCell
                      groups={cellGroups}
                      onGroupAction={onGroupAction}
                      onRefresh={onRefresh}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface UnplacedGroupsDrawerProps {
  groups: PlantGroup[];
  onGroupAction: (group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants') => void;
  onRefresh: () => void;
}

function UnplacedGroupsDrawer({ groups, onGroupAction, onRefresh }: UnplacedGroupsDrawerProps) {
  if (groups.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs text-cult-medium-gray uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <MapPin className="w-3 h-3" />
        {groups.length} group{groups.length !== 1 ? 's' : ''} not placed on map
      </p>
      <div className="space-y-1">
        {groups.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3 px-3 py-2 border border-cult-dark-gray bg-cult-black hover:border-cult-medium-gray transition-colors"
          >
            <span className="font-mono text-xs font-bold text-cult-white">
              {g.batch_registry?.batch_number ?? '—'}
            </span>
            <span className="text-xs text-cult-light-gray truncate flex-1">
              {g.strains?.name ?? g.strain_id}
            </span>
            <span className="text-xs text-cult-medium-gray">{g.plant_count}p</span>
            <span className={`text-xs border px-1.5 py-0.5 uppercase tracking-wider ${STAGE_BADGE[g.growth_stage] ?? STAGE_BADGE.clone}`}>
              {g.growth_stage}
            </span>
            <PlantGroupActionsMenu
              group={g}
              onDetail={() => onGroupAction(g, 'detail')}
              onMove={() => onGroupAction(g, 'move')}
              onAdvance={() => onGroupAction(g, 'advance')}
              onToggleMother={() => onGroupAction(g, 'mother')}
              onViewPlants={() => onGroupAction(g, 'plants')}
              onRefresh={onRefresh}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RoomDetailDrawerProps {
  room: GrowRoom;
  preloadedGroups?: PlantGroup[];
  onClose: () => void;
  onGroupAction: (group: PlantGroup, action: 'detail' | 'move' | 'advance' | 'mother' | 'plants') => void;
}

export function RoomDetailDrawer({
  room,
  preloadedGroups,
  onClose,
  onGroupAction,
}: RoomDetailDrawerProps) {
  const [fetchedGroups, setFetchedGroups] = useState<PlantGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showFlipModal, setShowFlipModal] = useState(false);

  const { tables, loading: tablesLoading, reload: reloadTables } = useRoomSections(room.id);

  const groups = preloadedGroups
    ? preloadedGroups.filter((g) => g.grow_room_id === room.id && g.growth_stage !== 'harvested')
    : fetchedGroups;

  const loadGroups = useCallback(async () => {
    if (preloadedGroups) return;
    setLoadingGroups(true);
    try {
      const data = await cultivationService.listPlantGroupsByRoom(room.id);
      setFetchedGroups(data.filter((g) => g.growth_stage !== 'harvested'));
    } catch {
      // silent
    } finally {
      setLoadingGroups(false);
    }
  }, [room.id, preloadedGroups]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const today = todayIso();
  const allSections = tables.flatMap((t) => t.sections);
  const earliestFlipDate = allSections.map((s) => s.flip_date).filter(Boolean).sort()[0] ?? null;
  const earliestHarvestDate =
    allSections.map((s) => s.projected_harvest_date).filter(Boolean).sort()[0] ?? null;

  const dayOfRun = earliestFlipDate ? daysBetween(earliestFlipDate, today) + 1 : null;
  const daysToHarvest = earliestHarvestDate ? daysBetween(today, earliestHarvestDate) : null;

  const isFlower = room.room_type === 'flower';
  const typeBorderCls = ROOM_TYPE_BORDER[room.room_type] ?? ROOM_TYPE_BORDER.mixed;

  const placedGroups = groups.filter((g) => g.room_table_id && g.room_section_id);
  const unplacedGroups = groups.filter((g) => !g.room_table_id || !g.room_section_id);

  function countdownColor(): string {
    if (daysToHarvest === null) return 'text-cult-medium-gray';
    if (daysToHarvest < 0) return 'text-red-400';
    if (daysToHarvest <= 7) return 'text-amber-400';
    return 'text-cult-light-gray';
  }

  function countdownText(): string {
    if (daysToHarvest === null) return '';
    if (daysToHarvest === 0) return 'Harvest today';
    if (daysToHarvest < 0) return `${Math.abs(daysToHarvest)}d overdue`;
    return `${daysToHarvest}d to harvest`;
  }

  function handleFlipSuccess() {
    setShowFlipModal(false);
    void reloadTables();
    if (!preloadedGroups) void loadGroups();
  }

  function handleRefresh() {
    if (!preloadedGroups) void loadGroups();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-stretch bg-black/70"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className={`relative ml-auto bg-cult-near-black border-l-4 ${typeBorderCls} w-full max-w-4xl h-full flex flex-col overflow-hidden`}>
          <div className="flex items-start justify-between px-6 py-5 border-b border-cult-medium-gray flex-shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xl font-bold text-cult-white tracking-wider">
                  {room.room_code}
                </span>
                <span className="text-xs border border-cult-medium-gray text-cult-medium-gray px-2 py-0.5 uppercase tracking-wider">
                  {room.room_type}
                </span>
                <span className="text-xs text-cult-medium-gray">
                  {groups.length} group{groups.length !== 1 ? 's' : ''}
                  {room.capacity_plants ? ` · ${groups.reduce((s, g) => s + g.plant_count, 0)}/${room.capacity_plants} plants` : ''}
                </span>
              </div>
              <span className="text-cult-light-gray text-sm">{room.name}</span>

              {isFlower && (
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  {earliestFlipDate ? (
                    <>
                      <span className="text-xs text-cult-medium-gray">
                        Flip: <span className="text-cult-light-gray">{formatDate(earliestFlipDate)}</span>
                      </span>
                      {dayOfRun !== null && (
                        <span className="text-xs font-bold text-rose-400 border border-rose-800 bg-rose-950 px-1.5 py-0.5">
                          Day {dayOfRun}
                        </span>
                      )}
                      {earliestHarvestDate && (
                        <>
                          <span className="text-xs text-cult-medium-gray">
                            Proj. harvest: <span className="text-cult-light-gray">{formatDate(earliestHarvestDate)}</span>
                          </span>
                          <span className={`text-xs font-semibold ${countdownColor()}`}>
                            {countdownText()}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-cult-medium-gray italic">No flip date set</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {isFlower && (
                <button
                  onClick={() => setShowFlipModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-rose-700 text-rose-400 px-3 py-1.5 hover:border-rose-500 hover:text-rose-300 transition-colors"
                >
                  <Flower2 className="w-3.5 h-3.5" />
                  {earliestFlipDate ? 'Update Flip Date' : 'Flip Room'}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-cult-medium-gray hover:text-cult-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cult-light-gray uppercase tracking-wider">Room Map</h3>
              <a
                href="/settings"
                className="text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors underline underline-offset-2"
              >
                Configure in Settings
              </a>
            </div>

            {tablesLoading || loadingGroups ? (
              <p className="text-xs text-cult-medium-gray">Loading...</p>
            ) : (
              <>
                <DrawerGrid
                  tables={tables}
                  groups={placedGroups}
                  onGroupAction={onGroupAction}
                  onRefresh={handleRefresh}
                />
                <UnplacedGroupsDrawer
                  groups={unplacedGroups}
                  onGroupAction={onGroupAction}
                  onRefresh={handleRefresh}
                />
                {groups.length === 0 && (
                  <p className="text-xs text-cult-medium-gray italic">
                    No active plant groups in this room.
                  </p>
                )}
              </>
            )}

            {groups.length > 0 && (
              <div>
                <h3 className="text-xs text-cult-light-gray uppercase tracking-wider mb-3">
                  All Groups in Room
                </h3>
                <div className="space-y-1">
                  {groups.map((g) => {
                    const daysInStage = Math.floor(
                      (Date.now() - new Date(g.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div
                        key={g.id}
                        className="flex items-center gap-3 px-4 py-3 border border-cult-dark-gray bg-cult-black hover:border-cult-medium-gray transition-colors"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-cult-white">
                              {g.batch_registry?.batch_number ?? '—'}
                            </span>
                            <span className={`text-xs border px-1.5 py-0.5 uppercase tracking-wider ${STAGE_BADGE[g.growth_stage] ?? STAGE_BADGE.clone}`}>
                              {g.growth_stage}
                            </span>
                            {g.is_mother && (
                              <span className="text-xs border border-amber-700 text-amber-400 px-1.5 py-0.5 uppercase tracking-wider">
                                Mother
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-cult-light-gray">{g.strains?.name ?? 'Unknown'}</span>
                            <span className="text-cult-medium-gray text-xs">·</span>
                            <span className="text-xs text-cult-medium-gray">{g.plant_count} plants</span>
                            <span className="text-cult-medium-gray text-xs">·</span>
                            <span className="text-xs text-cult-medium-gray">{daysInStage}d in stage</span>
                          </div>
                        </div>
                        <PlantGroupActionsMenu
                          group={g}
                          onDetail={() => onGroupAction(g, 'detail')}
                          onMove={() => onGroupAction(g, 'move')}
                          onAdvance={() => onGroupAction(g, 'advance')}
                          onToggleMother={() => onGroupAction(g, 'mother')}
                          onViewPlants={() => onGroupAction(g, 'plants')}
                          onRefresh={handleRefresh}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showFlipModal && (
        <FlipRoomModal
          room={room}
          plantGroups={groups}
          onClose={() => setShowFlipModal(false)}
          onSuccess={handleFlipSuccess}
        />
      )}
    </>
  );
}
