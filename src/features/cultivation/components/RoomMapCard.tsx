// Build cache bust: 2026-03-09T20
import { useState, useCallback, useEffect, memo } from 'react';
import { ChevronDown, ChevronRight, Flower2, Settings, MapPin } from 'lucide-react';
import { cultivationService } from '../services';
import { useRoomSections } from '../hooks/useRoomSections';
import { FlipRoomModal } from './FlipRoomModal';
import { todayIso, daysBetween } from '../utils/dateUtils';
import type { GrowRoom, PlantGroup, RoomTable, RoomSection } from '../types';

const ROOM_TYPE_COLORS: Record<string, string> = {
  clone: 'border-sky-700 bg-sky-950/20',
  veg: 'border-green-700 bg-green-950/20',
  flower: 'border-rose-700 bg-rose-950/10',
  mother: 'border-amber-700 bg-amber-950/20',
  mixed: 'border-cult-medium-gray bg-cult-near-black',
};

const STAGE_BADGE: Record<string, string> = {
  clone: 'text-sky-400 border-sky-800 bg-sky-950',
  veg: 'text-green-400 border-green-800 bg-green-950',
  flower: 'text-rose-400 border-rose-800 bg-rose-950',
  harvested: 'text-cult-medium-gray border-cult-dark-gray bg-cult-near-black',
};

interface PlacedGroup {
  group: PlantGroup;
  tableId: string;
  sectionId: string;
}

function buildGridData(tables: RoomTable[], groups: PlantGroup[]) {
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

interface GridCellProps {
  groups: PlantGroup[];
  onClick: (group: PlantGroup) => void;
}

const GridCell = memo(function GridCell({ groups, onClick }: GridCellProps) {
  if (groups.length === 0) {
    return (
      <div className="border border-cult-dark-gray bg-cult-black/30 h-14 flex items-center justify-center">
        <span className="text-xs text-cult-dark-gray">—</span>
      </div>
    );
  }

  const label = groups.map((g) => `${g.strains?.abbreviation ?? '???'} ${g.plant_count}p`).join(', ');

  return (
    <button
      type="button"
      aria-label={`Select group: ${label}`}
      className="border border-rose-900 bg-rose-950/20 h-14 p-1 space-y-0.5 overflow-hidden cursor-pointer hover:border-rose-700 transition-colors w-full text-left"
      onClick={() => onClick(groups[0])}
    >
      {groups.map((g) => (
        <div key={g.id} className="flex items-center gap-1">
          <span className="text-xs font-bold text-rose-300 font-mono truncate">
            {g.strains?.abbreviation ?? '???'}
          </span>
          <span className="text-xs text-cult-medium-gray">{g.plant_count}p</span>
        </div>
      ))}
    </button>
  );
});

interface BatchEntry {
  batchNumber: string;
  abbr: string | null;
  strainName: string;
  totalPlants: number;
  groupCount: number;
}

function buildBatchSummary(groups: PlantGroup[]): BatchEntry[] {
  const map = new Map<string, BatchEntry>();
  for (const g of groups) {
    const bn = g.batch_registry?.batch_number ?? g.id;
    if (!map.has(bn)) {
      map.set(bn, {
        batchNumber: g.batch_registry?.batch_number ?? '—',
        abbr: g.strains?.abbreviation ?? null,
        strainName: g.strains?.name ?? 'Unknown',
        totalPlants: 0,
        groupCount: 0,
      });
    }
    const entry = map.get(bn)!;
    entry.totalPlants += g.plant_count;
    entry.groupCount += 1;
  }
  return [...map.values()].sort((a, b) => a.batchNumber.localeCompare(b.batchNumber));
}

const MAX_BATCH_CHIPS = 6;

const CHIP_STAGE_COLORS: Record<string, string> = {
  clone: 'border-sky-600 bg-sky-950/40 text-sky-300',
  veg: 'border-green-600 bg-green-950/40 text-green-300',
  flower: 'border-rose-600 bg-rose-950/40 text-rose-300',
  mother: 'border-amber-600 bg-amber-950/40 text-amber-300',
  mixed: 'border-cult-medium-gray bg-cult-near-black text-cult-light-gray',
};

const INNER_GLOW: Record<string, string> = {
  clone: 'inset 0 0 30px rgba(14,165,233,0.06)',
  veg: 'inset 0 0 30px rgba(16,185,129,0.06)',
  flower: 'inset 0 0 30px rgba(244,63,94,0.06)',
  mother: 'inset 0 0 30px rgba(245,158,11,0.06)',
};

interface BatchSummaryChipsProps {
  groups: PlantGroup[];
  roomType: string;
}

function BatchSummaryChips({ groups, roomType }: BatchSummaryChipsProps) {
  const batches = buildBatchSummary(groups);
  if (batches.length === 0) return null;

  const visible = batches.slice(0, MAX_BATCH_CHIPS);
  const overflow = batches.length - MAX_BATCH_CHIPS;
  const chipColor = CHIP_STAGE_COLORS[roomType] ?? CHIP_STAGE_COLORS.mixed;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {visible.map((b) => (
        <span key={b.batchNumber} className={`flex items-center gap-1.5 border rounded px-2.5 py-1 ${chipColor}`}>
          <span className="font-mono text-sm font-bold tracking-wide w-10 text-center inline-block">{b.abbr ?? '???'}</span>
          <span className="text-sm opacity-70">×{b.totalPlants}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-sm text-cult-medium-gray self-center font-medium">+{overflow} more</span>
      )}
    </div>
  );
}

interface BatchLegendProps {
  groups: PlantGroup[];
}

function BatchLegend({ groups }: BatchLegendProps) {
  const batches = buildBatchSummary(groups);
  if (batches.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {batches.map((b) => (
        <div key={b.batchNumber} className="flex items-center gap-1.5 border border-rose-900 bg-rose-950/20 px-2 py-1">
          <span className="font-mono text-xs font-bold text-rose-300">{b.abbr ?? '???'}</span>
          <span className="text-xs text-cult-light-gray">{b.strainName}</span>
          <span className="text-xs text-cult-medium-gray">×{b.totalPlants}</span>
          {b.groupCount > 1 && (
            <span className="text-xs text-cult-medium-gray opacity-60">({b.groupCount} grps)</span>
          )}
        </div>
      ))}
    </div>
  );
}

interface RoomMapGridProps {
  tables: RoomTable[];
  groups: PlantGroup[];
  onGroupClick: (group: PlantGroup) => void;
}

function RoomMapGrid({ tables, groups, onGroupClick }: RoomMapGridProps) {
  const placedMap = buildGridData(tables, groups);

  if (tables.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-cult-medium-gray italic py-3 border border-cult-dark-gray px-3">
        <Settings className="w-3.5 h-3.5" />
        No tables configured. Go to Settings → Grow Rooms to configure the room layout.
      </div>
    );
  }

  const allSections: RoomSection[] = tables.flatMap((t) => t.sections);
  const uniqueSectionLabels = [...new Set(allSections.map((s) => s.section_label))].sort();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-cult-medium-gray uppercase tracking-wider font-normal py-1 pr-3 w-16">Section</th>
            {tables.map((t) => (
              <th key={t.id} className="text-center text-cult-medium-gray font-mono font-normal py-1 px-1 min-w-20">
                T{t.table_number}
                {t.table_name && <span className="block text-cult-dark-gray normal-case font-normal">{t.table_name}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uniqueSectionLabels.map((label) => (
            <tr key={label}>
              <td className="pr-3 py-0.5">
                <span className="font-mono text-cult-light-gray font-bold">{label}</span>
              </td>
              {tables.map((t) => {
                const section = t.sections.find((s) => s.section_label === label);
                if (!section) {
                  return (
                    <td key={t.id} className="py-0.5 px-1">
                      <div className="border border-cult-dark-gray/30 bg-cult-black/10 h-14" />
                    </td>
                  );
                }
                const key = `${t.id}:${section.id}`;
                const cellGroups = placedMap.get(key) ?? [];
                return (
                  <td key={t.id} className="py-0.5 px-1">
                    <GridCell groups={cellGroups} onClick={onGroupClick} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <BatchLegend groups={groups.filter((g) => g.room_table_id && g.room_section_id)} />
    </div>
  );
}

interface UnplacedGroupsProps {
  groups: PlantGroup[];
  onGroupClick: (group: PlantGroup) => void;
}

function UnplacedGroups({ groups, onGroupClick }: UnplacedGroupsProps) {
  if (groups.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs text-cult-medium-gray uppercase tracking-wider mb-2 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {groups.length} group{groups.length !== 1 ? 's' : ''} not placed on map
      </p>
      <div className="space-y-1">
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => onGroupClick(g)}
            className="flex items-center gap-3 px-3 py-2 border border-cult-dark-gray hover:border-cult-medium-gray cursor-pointer transition-colors"
          >
            <span className="font-mono text-xs font-bold text-cult-light-gray">{g.batch_registry?.batch_number ?? '—'}</span>
            <span className="text-xs text-cult-light-gray">{g.strains?.name ?? g.strain_id}</span>
            <span className="text-xs text-cult-medium-gray">{g.plant_count} plants</span>
            <span className={`text-xs border px-1.5 py-0.5 uppercase tracking-wider ml-auto ${STAGE_BADGE[g.growth_stage] ?? STAGE_BADGE.clone}`}>
              {g.growth_stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RoomMapCardProps {
  room: GrowRoom;
  onGroupSelect: (group: PlantGroup) => void;
  preloadedGroups?: PlantGroup[];
}

export function RoomMapCard({ room, onGroupSelect, preloadedGroups }: RoomMapCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [fetchedGroups, setFetchedGroups] = useState<PlantGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showFlipModal, setShowFlipModal] = useState(false);

  const { tables, loading: tablesLoading, reload: reloadTables } = useRoomSections(expanded ? room.id : null);

  const typeBorder = ROOM_TYPE_COLORS[room.room_type] ?? ROOM_TYPE_COLORS.mixed;
  const isFlower = room.room_type === 'flower';
  const today = todayIso();

  const groups = preloadedGroups
    ? preloadedGroups.filter((g) => g.grow_room_id === room.id && g.growth_stage !== 'harvested')
    : fetchedGroups;

  const loadGroups = useCallback(async () => {
    if (!expanded || preloadedGroups) return;
    setLoadingGroups(true);
    try {
      const data = await cultivationService.listPlantGroupsByRoom(room.id);
      setFetchedGroups(data.filter((g) => g.growth_stage !== 'harvested'));
    } catch {
      // silent
    } finally {
      setLoadingGroups(false);
    }
  }, [expanded, room.id, preloadedGroups]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const allSections = tables.flatMap((t) => t.sections);
  const earliestFlipDate = allSections
    .map((s) => s.flip_date)
    .filter(Boolean)
    .sort()[0] ?? null;
  const earliestHarvestDate = allSections
    .map((s) => s.projected_harvest_date)
    .filter(Boolean)
    .sort()[0] ?? null;

  const dayOfRun = earliestFlipDate ? daysBetween(earliestFlipDate, today) + 1 : null;
  const daysToHarvest = earliestHarvestDate ? daysBetween(today, earliestHarvestDate) : null;

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
    if (daysToHarvest === 0) return 'harvest today';
    if (daysToHarvest < 0) return `${Math.abs(daysToHarvest)}d overdue`;
    return `in ${daysToHarvest}d`;
  }

  function handleFlipSuccess() {
    setShowFlipModal(false);
    void reloadTables();
    if (!preloadedGroups) void loadGroups();
  }

  const totalPlants = groups.reduce((s, g) => s + g.plant_count, 0);
  const isEmpty = groups.length === 0;

  return (
    <>
      <div
        className={`border ${isEmpty ? 'border-dashed border-cult-dark-gray opacity-50' : typeBorder}`}
        style={!isEmpty ? { boxShadow: INNER_GLOW[room.room_type] ?? 'none' } : undefined}
      >
        <div
          className={`${isEmpty ? 'p-3' : 'p-5'} cursor-pointer select-none`}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-base font-bold text-cult-white">{room.room_code}</span>
                <span className={`text-xs border px-1.5 py-0.5 uppercase tracking-wider ${STAGE_BADGE[room.room_type] ?? 'text-cult-medium-gray border-cult-medium-gray'}`}>
                  {room.room_type}
                </span>
                {groups.length > 0 && (
                  <span className="text-xs text-cult-medium-gray">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
                )}
                {isEmpty && (
                  <span className="text-xs text-cult-dark-gray italic">Empty</span>
                )}
              </div>
              <span className={`text-sm font-semibold truncate ${isEmpty ? 'text-cult-medium-gray' : 'text-cult-white'}`}>{room.name}</span>

              {!expanded && groups.length > 0 && (
                <BatchSummaryChips groups={groups} roomType={room.room_type} />
              )}

              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {isFlower && dayOfRun !== null && (
                  <span className="text-xs font-bold text-rose-400 border border-rose-800 px-1.5 py-0.5 bg-rose-950">
                    Day {dayOfRun}
                  </span>
                )}
                {isFlower && earliestHarvestDate && (
                  <span className={`text-xs ${countdownColor()}`}>{countdownText()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {totalPlants > 0 && (
                <span className="text-2xl font-bold font-mono text-cult-white leading-none">{totalPlants}</span>
              )}
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-cult-medium-gray" />
              ) : (
                <ChevronRight className="w-4 h-4 text-cult-medium-gray" />
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-cult-dark-gray px-4 pb-4 pt-3 space-y-4">
            {isFlower && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {earliestFlipDate ? (
                    <div className="text-xs text-cult-light-gray">
                      <span className="text-cult-medium-gray">Flip date: </span>
                      {new Date(earliestFlipDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {dayOfRun !== null && (
                        <span className="ml-2 font-bold text-rose-400">Day {dayOfRun}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-cult-medium-gray italic">No flip date set</span>
                  )}
                  {earliestHarvestDate && (
                    <div className="text-xs text-cult-light-gray">
                      <span className="text-cult-medium-gray">Harvest: </span>
                      {new Date(earliestHarvestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className={`ml-2 font-bold ${countdownColor()}`}>{countdownText()}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFlipModal(true); }}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-rose-700 text-rose-400 px-3 py-1.5 hover:border-rose-500 hover:text-rose-300 transition-colors"
                >
                  <Flower2 className="w-3 h-3" />
                  {earliestFlipDate ? 'Update Flip Date' : 'Flip Room'}
                </button>
              </div>
            )}

            {(tablesLoading || loadingGroups) ? (
              <p className="text-xs text-cult-medium-gray">Loading...</p>
            ) : (
              <>
                <RoomMapGrid
                  tables={tables}
                  groups={placedGroups}
                  onGroupClick={onGroupSelect}
                />
                <UnplacedGroups
                  groups={unplacedGroups}
                  onGroupClick={onGroupSelect}
                />
                {groups.length === 0 && (
                  <p className="text-xs text-cult-medium-gray italic">No active plant groups in this room.</p>
                )}
              </>
            )}
          </div>
        )}
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
