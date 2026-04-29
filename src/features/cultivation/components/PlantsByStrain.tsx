/**
 * Plants by Strain — strain-grouped plant view for Command Center
 *
 * Condensed: Strain / Batch / Count with checkboxes
 * Expanded: Accordion with individual plant IDs, multi-select, actions
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Printer, Skull, ArrowRightLeft, MoreHorizontal } from 'lucide-react';
import { cultivationService } from '../services';
import { usePlantGroupLabel } from '../hooks/usePlantGroupLabel';
import { useMortalityLog } from '../hooks';
import type { PlantGroup, IndividualPlant, GrowRoom, SplitAndMoveInput, SplitAndMoveMultiInput } from '../types';
import { MoveToRoomModal } from './MoveToRoomModal';
import { PlantGroupLabelPrintModal } from './PlantGroupLabelPrintModal';
import { DeadPlantForm } from './DeadPlantForm';

const GLASS_ACTION = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95';

// ═══════════════════════════════════════════════════════════════
// Data transformation: plant groups → strain groups
// ═══════════════════════════════════════════════════════════════

interface StrainGroup {
  strainName: string;
  strainId: string;
  batchNumber: string;
  plantCount: number;
  activePlantCount: number;
  growthStage: string;
  groups: PlantGroup[];
  groupIds: string[];
}

function groupByStrain(groups: PlantGroup[]): StrainGroup[] {
  const map = new Map<string, StrainGroup>();

  for (const g of groups) {
    const strainName = g.strains?.name ?? 'Unknown';
    const key = `${g.strain_id}-${g.batch_registry_id ?? 'no-batch'}`;

    let entry = map.get(key);
    if (!entry) {
      entry = {
        strainName,
        strainId: g.strain_id,
        batchNumber: g.batch_registry?.batch_number ?? '—',
        plantCount: 0,
        activePlantCount: 0,
        growthStage: g.growth_stage,
        groups: [],
        groupIds: [],
      };
      map.set(key, entry);
    }
    entry.plantCount += g.plant_count;
    entry.groups.push(g);
    entry.groupIds.push(g.id);
  }

  return [...map.values()].sort((a, b) => b.plantCount - a.plantCount);
}

// ═══════════════════════════════════════════════════════════════
// Compact view (sidebar card)
// ═══════════════════════════════════════════════════════════════

interface PlantsByStrainCompactProps {
  groups: PlantGroup[];
}

export function PlantsByStrainCompact({ groups }: PlantsByStrainCompactProps) {
  const strainGroups = useMemo(() => groupByStrain(groups), [groups]);

  if (strainGroups.length === 0) {
    return <div className="text-[10px] text-white/20">No plants in this room</div>;
  }

  return (
    <div className="space-y-1 max-h-[100px] overflow-hidden">
      {strainGroups.slice(0, 4).map(sg => (
        <div key={`${sg.strainId}-${sg.batchNumber}`} className="flex items-center justify-between text-[10px]">
          <span className="text-white/40 truncate">{sg.strainName}</span>
          <span className="text-white/25 font-mono ml-2">{sg.plantCount}p</span>
        </div>
      ))}
      {strainGroups.length > 4 && (
        <div className="text-[10px] text-white/15">+{strainGroups.length - 4} more</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Expanded view (main panel)
// ═══════════════════════════════════════════════════════════════

interface PlantsByStrainExpandedProps {
  groups: PlantGroup[];
  roomId: string;
  rooms: GrowRoom[];
  onMoveToRoom: (groupId: string, toRoomId: string) => Promise<void>;
  onSplitAndMove: (input: SplitAndMoveInput) => Promise<void>;
  onSplitAndMoveMultiple: (input: SplitAndMoveMultiInput) => Promise<void>;
}

export function PlantsByStrainExpanded({
  groups, roomId, rooms, onMoveToRoom, onSplitAndMove, onSplitAndMoveMultiple,
}: PlantsByStrainExpandedProps) {
  const strainGroups = useMemo(() => groupByStrain(groups), [groups]);
  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);
  const [selectedStrains, setSelectedStrains] = useState<Set<string>>(new Set());
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());

  // Action modals
  const [showMove, setShowMove] = useState(false);
  const [showKill, setShowKill] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const {
    isOpen: labelIsOpen, isLoading: labelIsLoading, isPrinting: labelIsPrinting,
    labelData, logoDataUrl, error: labelError,
    openGroupLabel, openPlantLabels, openSelectedPlantLabels, printLabels, closeLabel,
  } = usePlantGroupLabel();

  // Get selected groups for actions
  const selectedGroups = useMemo(() => {
    const groupSet = new Set<string>();
    for (const sg of strainGroups) {
      const key = `${sg.strainId}-${sg.batchNumber}`;
      if (selectedStrains.has(key)) {
        sg.groupIds.forEach(id => groupSet.add(id));
      }
    }
    return groups.filter(g => groupSet.has(g.id));
  }, [selectedStrains, strainGroups, groups]);

  const hasSelection = selectedStrains.size > 0 || selectedPlantIds.size > 0;

  function toggleStrain(key: string) {
    setSelectedStrains(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePlant(plantId: string) {
    setSelectedPlantIds(prev => {
      const next = new Set(prev);
      if (next.has(plantId)) next.delete(plantId);
      else next.add(plantId);
      return next;
    });
  }

  async function handleBulkDeactivate() {
    for (const plantId of selectedPlantIds) {
      await cultivationService.deactivateIndividualPlant(plantId);
    }
    setSelectedPlantIds(new Set());
  }

  async function handlePrintSelected() {
    // If individual plants are selected, print those as plant tags
    if (selectedPlantIds.size > 0) {
      // Find the plants and their parent group
      const allActivePlants: IndividualPlant[] = [];
      let parentGroup: PlantGroup | null = null;
      for (const sg of strainGroups) {
        for (const g of sg.groups) {
          const plants = await cultivationService.listIndividualPlants(g.id);
          const matched = plants.filter(p => p.is_active && selectedPlantIds.has(p.id));
          if (matched.length > 0) {
            allActivePlants.push(...matched);
            if (!parentGroup) parentGroup = g;
          }
        }
      }
      if (parentGroup && allActivePlants.length > 0) {
        await openSelectedPlantLabels(allActivePlants, parentGroup);
        setShowPrint(true);
      }
      return;
    }
    // If strains selected but no individual plants, print all plant tags for that strain group
    if (selectedGroups.length > 0) {
      await openPlantLabels(selectedGroups[0]);
      setShowPrint(true);
    }
  }

  return (
    <div className="space-y-2">
      {/* Action bar — appears when anything is selected */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 py-2 px-3 rounded border border-cult-border-subtle bg-cult-surface-inset mb-2">
              <span className="text-[10px] text-white/30 flex-1">
                {selectedStrains.size > 0 && `${selectedStrains.size} strain${selectedStrains.size > 1 ? 's' : ''}`}
                {selectedStrains.size > 0 && selectedPlantIds.size > 0 && ' + '}
                {selectedPlantIds.size > 0 && `${selectedPlantIds.size} plant${selectedPlantIds.size > 1 ? 's' : ''}`}
                {' selected'}
              </span>
              {selectedGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMove(true)}
                  className={`${GLASS_ACTION} bg-white/5 text-white/50 hover:bg-white/10 flex items-center gap-1.5`}
                >
                  <ArrowRightLeft className="w-3 h-3" /> Move
                </button>
              )}
              {(selectedPlantIds.size > 0 || selectedGroups.length > 0) && (
                <button
                  type="button"
                  onClick={() => setShowKill(true)}
                  className={`${GLASS_ACTION} bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1.5`}
                >
                  <Skull className="w-3 h-3" /> Kill
                </button>
              )}
              <button
                type="button"
                onClick={handlePrintSelected}
                className={`${GLASS_ACTION} bg-white/5 text-white/50 hover:bg-white/10 flex items-center gap-1.5`}
              >
                <Printer className="w-3 h-3" /> Print
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strain rows */}
      {strainGroups.map(sg => {
        const key = `${sg.strainId}-${sg.batchNumber}`;
        const isExpanded = expandedStrain === key;
        const isSelected = selectedStrains.has(key);

        return (
          <div key={key}>
            <div className="flex items-center gap-2 py-2.5 px-3 rounded bg-cult-surface-inset hover:bg-cult-surface-subtle transition-colors">
              {/* Checkbox */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleStrain(key); }}
                className="flex-shrink-0 active:scale-90 transition-transform"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/15 hover:border-white/30'
                }`}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
              </button>

              {/* Expand arrow */}
              <button
                type="button"
                onClick={() => setExpandedStrain(isExpanded ? null : key)}
                className="flex-shrink-0 text-white/20 hover:text-white/40 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
              </button>

              {/* Strain info */}
              <div className="flex-1 min-w-0" onClick={() => setExpandedStrain(isExpanded ? null : key)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70 font-medium truncate">{sg.strainName}</span>
                  <span className="text-[10px] font-mono text-white/25">{sg.batchNumber}</span>
                </div>
              </div>

              {/* Count */}
              <span className="text-xs font-mono text-white/40 flex-shrink-0">{sg.plantCount}p</span>
            </div>

            {/* Individual plants dropdown */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <IndividualPlantsDropdown
                    groups={sg.groups}
                    selectedPlantIds={selectedPlantIds}
                    onTogglePlant={togglePlant}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Move Modal */}
      {showMove && selectedGroups.length > 0 && (
        <MoveToRoomModal
          group={selectedGroups[0]}
          groups={selectedGroups.length > 1 ? selectedGroups : undefined}
          rooms={rooms as any}
          onMove={async (toRoomId) => {
            await onMoveToRoom(selectedGroups[0].id, toRoomId);
            setShowMove(false);
            setSelectedStrains(new Set());
          }}
          onSplitAndMove={async (input) => {
            await onSplitAndMove(input);
            setShowMove(false);
            setSelectedStrains(new Set());
          }}
          onSplitAndMoveMultiple={async (input) => {
            await onSplitAndMoveMultiple(input);
            setShowMove(false);
            setSelectedStrains(new Set());
          }}
          onCancel={() => setShowMove(false)}
        />
      )}

      {/* Kill Modal */}
      {showKill && (
        <DeadPlantForm
          prefilledRoomId={roomId}
          onComplete={() => {
            setShowKill(false);
            setSelectedStrains(new Set());
            setSelectedPlantIds(new Set());
          }}
          onClose={() => setShowKill(false)}
        />
      )}

      {/* Print Modal */}
      <PlantGroupLabelPrintModal
        isOpen={labelIsOpen}
        isLoading={labelIsLoading}
        isPrinting={labelIsPrinting}
        labelData={labelData}
        logoDataUrl={logoDataUrl}
        error={labelError}
        onClose={() => { setShowPrint(false); closeLabel(); }}
        onPrint={printLabels}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Individual Plants Dropdown
// ═══════════════════════════════════════════════════════════════

function IndividualPlantsDropdown({ groups, selectedPlantIds, onTogglePlant }: {
  groups: PlantGroup[];
  selectedPlantIds: Set<string>;
  onTogglePlant: (id: string) => void;
}) {
  const [plants, setPlants] = useState<IndividualPlant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const allPlants: IndividualPlant[] = [];
      for (const g of groups) {
        const p = await cultivationService.listIndividualPlants(g.id);
        allPlants.push(...p);
      }
      setPlants(allPlants.filter(p => p.is_active));
      setLoading(false);
    }
    load();
  }, [groups]);

  if (loading) {
    return <div className="ml-10 py-2 text-[10px] text-white/15 animate-pulse">Loading plant IDs...</div>;
  }

  if (plants.length === 0) {
    return <div className="ml-10 py-2 text-[10px] text-white/15">No individual plant IDs recorded</div>;
  }

  return (
    <div className="ml-10 py-1 space-y-0.5 max-h-[200px] overflow-y-auto">
      {plants.map(plant => {
        const isSelected = selectedPlantIds.has(plant.id);
        return (
          <button
            key={plant.id}
            type="button"
            onClick={() => onTogglePlant(plant.id)}
            className="w-full flex items-center gap-2 py-1 px-2 rounded hover:bg-cult-surface-inset transition-colors text-left"
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
              isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/10 hover:border-white/20'
            }`}>
              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
            </div>
            <span className="text-[11px] font-mono text-white/40">{plant.state_plant_id}</span>
          </button>
        );
      })}
    </div>
  );
}
