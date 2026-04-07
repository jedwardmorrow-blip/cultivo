import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Home, ArrowRight, Star, Info, Leaf, Printer } from 'lucide-react';
import type { PlantGroup, GrowthStage } from '../types';

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  clone: 'veg',
  veg: 'flower',
  flower: 'harvested',
  harvested: null,
};

const ADVANCE_LABELS: Record<GrowthStage, string> = {
  clone: 'Move to Veg',
  veg: 'Move to Flower',
  flower: 'Ready to Harvest',
  harvested: '',
};

interface PlantGroupActionsMenuProps {
  group: PlantGroup;
  onDetail: () => void;
  onMove: () => void;
  onAdvance: () => void;
  onToggleMother: () => void;
  onViewPlants: () => void;
  onPrintGroupLabel: () => void;
  onPrintPlantLabels: () => void;
  onRefresh: () => void;
  compact?: boolean;
}

interface DropdownPos {
  top: number;
  left: number;
  openUpward: boolean;
}

export function PlantGroupActionsMenu({
  group,
  onDetail,
  onMove,
  onAdvance,
  onToggleMother,
  onViewPlants,
  onPrintGroupLabel,
  onPrintPlantLabels,
  compact = false,
}: PlantGroupActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, openUpward: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const nextStage = NEXT_STAGE[group.growth_stage];
  const canAdvance = nextStage !== null && nextStage !== 'harvested';
  const canBeMother = group.growth_stage !== 'clone';

  const computePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    setPos({
      top: openUpward ? rect.top : rect.bottom + 4,
      left: rect.right,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    computePosition();

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, computePosition]);

  function handle(fn: () => void) {
    setOpen(false);
    fn();
  }

  const dropdown = open
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-cult-near-black border border-cult-medium-gray shadow-xl min-w-44"
          style={{
            top: pos.openUpward ? undefined : pos.top,
            bottom: pos.openUpward ? window.innerHeight - pos.top : undefined,
            left: pos.left - 176,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {canAdvance && nextStage && (
            <button
              onClick={() => handle(onAdvance)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
            >
              <ArrowRight className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
              {ADVANCE_LABELS[group.growth_stage]}
            </button>
          )}

          <button
            onClick={() => handle(onMove)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
          >
            <Home className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
            Move to Room
          </button>

          {canBeMother ? (
            <button
              onClick={() => handle(onToggleMother)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
            >
              <Star className={`w-3.5 h-3.5 flex-shrink-0 ${group.is_mother ? 'text-cult-warning' : 'text-cult-medium-gray'}`} />
              {group.is_mother ? 'Remove Mother Status' : 'Mark as Mother'}
            </button>
          ) : (
            <div
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-dark-gray cursor-not-allowed"
              title="Must be in Veg or Flower stage to designate as mother"
            >
              <Star className="w-3.5 h-3.5 flex-shrink-0 text-cult-dark-gray" />
              Mark as Mother
            </div>
          )}

          <div className="border-t border-cult-dark-gray my-0.5" />

          <button
            onClick={() => handle(onViewPlants)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
          >
            <Leaf className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
            View Plant IDs
          </button>

          <button
            onClick={() => handle(onPrintGroupLabel)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
          >
            <Printer className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
            Print Group Label
          </button>

          <button
            onClick={() => handle(onPrintPlantLabels)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
          >
            <Printer className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
            Print All Plant Labels
          </button>

          <div className="border-t border-cult-dark-gray my-0.5" />

          <button
            onClick={() => handle(onDetail)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-cult-white hover:bg-cult-black transition-colors text-left"
          >
            <Info className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
            View History
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`transition-colors text-cult-medium-gray hover:text-cult-white ${compact ? 'p-0.5' : 'p-1.5'}`}
        title="Actions"
      >
        <MoreVertical className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>
      {dropdown}
    </div>
  );
}
