import { ReactNode, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Package, Filter } from 'lucide-react';
import { useQualityGrades } from '@/hooks/useQualityGrades';
import { GRADE_COLOR_MAP } from '@/types';
import type { InventoryItem } from '../types';

interface Column {
  header: string;
  accessor: keyof InventoryItem | ((item: InventoryItem) => ReactNode);
  align?: 'left' | 'center' | 'right';
  format?: (value: any, item: InventoryItem) => ReactNode;
  sortable?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface InventoryTableProps {
  items: InventoryItem[];
  columns: Column[];
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  emptySubtext?: string;
  rowClassName?: (item: InventoryItem) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  isSelectable?: (item: InventoryItem) => boolean;
  gradeFilterable?: boolean;
}

function getRawValue(item: InventoryItem, accessor: Column['accessor']): any {
  if (typeof accessor === 'function') return accessor(item);
  return item[accessor];
}

export function InventoryTable({
  items,
  columns,
  emptyIcon,
  emptyMessage = 'No items found',
  emptySubtext,
  rowClassName,
  searchable = false,
  searchPlaceholder = 'Search by strain, package ID, or batch...',
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  isSelectable = () => true,
  gradeFilterable = false,
}: InventoryTableProps) {
  const [sortColumnIdx, setSortColumnIdx] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | 'all' | 'ungraded'>('all');
  const { grades: allGrades } = useQualityGrades();
  const assignableGrades = allGrades.filter(g => g.code !== 'UNDEFINED');

  const filteredItems = useMemo(() => {
    let result = items;

    if (searchable && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const fields = [item.package_id, item.strain, item.batch_number, item.batch_id, item.product_name, item.room];
        return fields.some((f) => f?.toLowerCase().includes(q));
      });
    }

    if (gradeFilterable && gradeFilter !== 'all') {
      if (gradeFilter === 'ungraded') {
        result = result.filter((item) => !(item as any).quality_grade_id);
      } else {
        result = result.filter((item) => (item as any).quality_grade_id === gradeFilter);
      }
    }

    return result;
  }, [items, searchQuery, searchable, gradeFilter, gradeFilterable]);

  const sortedItems = useMemo(() => {
    if (sortColumnIdx === null || sortDirection === null) return filteredItems;
    const col = columns[sortColumnIdx];
    if (!col) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      const aVal = getRawValue(a, col.accessor);
      const bVal = getRawValue(b, col.accessor);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aNum = typeof aVal === 'number' ? aVal : parseFloat(aVal);
      const bNum = typeof bVal === 'number' ? bVal : parseFloat(bVal);

      let cmp: number;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        cmp = aNum - bNum;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [filteredItems, sortColumnIdx, sortDirection, columns]);

  const handleSort = (idx: number) => {
    const col = columns[idx];
    if (col.sortable === false) return;

    if (sortColumnIdx === idx) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortColumnIdx(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortColumnIdx(idx);
      setSortDirection('asc');
    }
  };

  const selectableItems = sortedItems.filter(isSelectable);
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(item => selectedIds.has(item.id));
  const someSelected = selectableItems.some(item => selectedIds.has(item.id));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelectableSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(selectableItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(itemId)) newSelection.delete(itemId);
    else newSelection.add(itemId);
    onSelectionChange(newSelection);
  };

  if (items.length === 0 && !searchQuery) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="p-4 rounded-full bg-cult-dark-gray mb-4">
            {emptyIcon || <Package className="w-8 h-8 text-cult-lighter-gray" />}
          </div>
          <p className="text-cult-silver font-medium">{emptyMessage}</p>
          {emptySubtext && <p className="text-cult-lighter-gray text-sm mt-1">{emptySubtext}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cult-near-black rounded-lg border border-cult-medium-gray overflow-hidden">
      {(searchable || gradeFilterable) && (
        <div className="px-4 py-3 border-b border-cult-medium-gray space-y-3">
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-lighter-gray" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-sm text-cult-white placeholder-cult-lighter-gray focus:outline-none focus:border-cult-silver transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-lighter-gray hover:text-cult-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {gradeFilterable && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Filter className="w-3.5 h-3.5 text-cult-lighter-gray" />
                <div className="flex gap-0.5 p-0.5 bg-cult-dark-gray rounded-lg border border-cult-medium-gray">
                  <button
                    onClick={() => setGradeFilter('all')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      gradeFilter === 'all'
                        ? 'bg-cult-medium-gray text-cult-white shadow-sm'
                        : 'text-cult-lighter-gray hover:text-cult-white'
                    }`}
                  >
                    All
                  </button>
                  {assignableGrades.map((g) => {
                    const gColors = GRADE_COLOR_MAP[g.color_class] || GRADE_COLOR_MAP.gray;
                    const isActive = gradeFilter === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGradeFilter(g.id)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isActive
                            ? `${gColors.bg} ${gColors.text} ${gColors.border} border`
                            : 'text-cult-lighter-gray hover:text-cult-white'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setGradeFilter('ungraded')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      gradeFilter === 'ungraded'
                        ? 'bg-cult-medium-gray/30 text-cult-lighter-gray border border-cult-medium-gray/50'
                        : 'text-cult-lighter-gray hover:text-cult-white'
                    }`}
                  >
                    Ungraded
                  </button>
                </div>
              </div>
            )}
          </div>
          {(searchQuery || (gradeFilterable && gradeFilter !== 'all')) && (
            <p className="text-xs text-cult-lighter-gray">
              {sortedItems.length} result{sortedItems.length !== 1 ? 's' : ''} found
              {gradeFilterable && gradeFilter !== 'all' && (
                <button
                  onClick={() => setGradeFilter('all')}
                  className="ml-2 text-cult-silver hover:text-cult-white underline"
                >
                  Clear grade filter
                </button>
              )}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-medium-gray">
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected && !allSelectableSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-cult-medium-gray cursor-pointer accent-emerald-500"
                  />
                </th>
              )}
              {columns.map((column, idx) => {
                const isSortable = column.sortable !== false && typeof column.accessor !== 'function';
                const isActive = sortColumnIdx === idx;

                return (
                  <th
                    key={idx}
                    onClick={() => isSortable && handleSort(idx)}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cult-silver ${
                      column.align === 'right' ? 'text-right' :
                      column.align === 'center' ? 'text-center' :
                      'text-left'
                    } ${isSortable ? 'cursor-pointer select-none hover:text-cult-white transition-colors' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.header}
                      {isSortable && (
                        <span className="inline-flex flex-col">
                          {isActive && sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-cult-white" />
                          ) : isActive && sortDirection === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5 text-cult-white" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-cult-lighter-gray" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-medium-gray/50">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-10 text-cult-lighter-gray">
                  No results match your search
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const itemIsSelectable = isSelectable(item);
                const isSelected = selectedIds.has(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors duration-100 ${
                      isSelected ? 'bg-emerald-900/15' : 'hover:bg-cult-dark-gray/60'
                    } ${rowClassName ? rowClassName(item) : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3 w-12">
                        {itemIsSelectable ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(item.id)}
                            className="w-4 h-4 rounded border-cult-medium-gray cursor-pointer accent-emerald-500"
                          />
                        ) : (
                          <span className="text-xs text-cult-lighter-gray">-</span>
                        )}
                      </td>
                    )}
                    {columns.map((column, idx) => {
                      let value;
                      if (typeof column.accessor === 'function') {
                        value = column.accessor(item);
                      } else {
                        value = item[column.accessor];
                      }
                      const content = column.format ? column.format(value, item) : value;

                      return (
                        <td
                          key={idx}
                          className={`px-4 py-3 text-sm ${
                            column.align === 'right' ? 'text-right' :
                            column.align === 'center' ? 'text-center' :
                            'text-left'
                          }`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedItems.length > 0 && (
        <div className="px-4 py-2.5 border-t border-cult-medium-gray/50 flex items-center justify-between">
          <span className="text-xs text-cult-lighter-gray">
            {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
            {selectable && selectedIds.size > 0 && (
              <span className="ml-2 text-emerald-400">({selectedIds.size} selected)</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
