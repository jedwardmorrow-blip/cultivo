import { useRef, useCallback } from 'react';

interface ShiftSelectConfig<T> {
  items: T[];
  getKey: (item: T) => string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isSelectable?: (item: T) => boolean;
}

export function useShiftSelect<T>({
  items,
  getKey,
  selectedIds,
  onSelectionChange,
  isSelectable = () => true,
}: ShiftSelectConfig<T>) {
  const anchorRef = useRef<{ index: number; action: 'select' | 'deselect' } | null>(null);

  const handleItemClick = useCallback((id: string, shiftKey: boolean) => {
    const clickedIndex = items.findIndex(item => getKey(item) === id);
    if (clickedIndex === -1) return;
    if (!isSelectable(items[clickedIndex])) return;

    const wasSelected = selectedIds.has(id);
    const action: 'select' | 'deselect' = wasSelected ? 'deselect' : 'select';

    if (shiftKey && anchorRef.current !== null) {
      const anchorIndex = anchorRef.current.index;
      const anchorAction = anchorRef.current.action;
      const start = Math.min(anchorIndex, clickedIndex);
      const end = Math.max(anchorIndex, clickedIndex);
      const next = new Set(selectedIds);

      for (let i = start; i <= end; i++) {
        const item = items[i];
        if (!item || !isSelectable(item)) continue;
        const key = getKey(item);
        if (anchorAction === 'select') {
          next.add(key);
        } else {
          next.delete(key);
        }
      }

      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      if (action === 'select') {
        next.add(id);
      } else {
        next.delete(id);
      }
      anchorRef.current = { index: clickedIndex, action };
      onSelectionChange(next);
    }
  }, [items, getKey, selectedIds, onSelectionChange, isSelectable]);

  return { handleItemClick };
}
