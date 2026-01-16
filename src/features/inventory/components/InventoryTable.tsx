import { ReactNode } from 'react';
import type { InventoryItem } from '../types';

interface Column {
  header: string;
  accessor: keyof InventoryItem | ((item: InventoryItem) => ReactNode);
  align?: 'left' | 'center' | 'right';
  format?: (value: any, item: InventoryItem) => ReactNode;
}

interface InventoryTableProps {
  items: InventoryItem[];
  columns: Column[];
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  emptySubtext?: string;
  rowClassName?: (item: InventoryItem) => string;

  // Multi-select props (optional)
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  isSelectable?: (item: InventoryItem) => boolean;
}

export function InventoryTable({
  items,
  columns,
  emptyIcon,
  emptyMessage = 'No items found',
  emptySubtext = 'Import a CSV file to see inventory',
  rowClassName,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  isSelectable = () => true,
}: InventoryTableProps) {
  // Handle select all checkbox
  const selectableItems = items.filter(isSelectable);
  const allSelectableSelected = selectableItems.length > 0 &&
    selectableItems.every(item => selectedIds.has(item.id));
  const someSelected = selectableItems.some(item => selectedIds.has(item.id));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (allSelectableSelected) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all selectable
      const newSelection = new Set(selectableItems.map(item => item.id));
      onSelectionChange(newSelection);
    }
  };

  const handleSelectItem = (itemId: string) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    onSelectionChange(newSelection);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        {emptyIcon}
        <p className="text-cult-light-gray">{emptyMessage}</p>
        <p className="text-gray-400 text-sm mt-1">{emptySubtext}</p>
      </div>
    );
  }

  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-cult-medium-gray">
            <tr>
              {/* Select all checkbox */}
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someSelected && !allSelectableSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-xs font-medium text-gray-700 uppercase ${
                    column.align === 'right' ? 'text-right' :
                    column.align === 'center' ? 'text-center' :
                    'text-left'
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const itemIsSelectable = isSelectable(item);
              const isSelected = selectedIds.has(item.id);

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-700 ${isSelected ? 'bg-blue-50' : ''} ${
                    rowClassName ? rowClassName(item) : ''
                  }`}
                >
                  {/* Row checkbox */}
                  {selectable && (
                    <td className="px-4 py-3 w-12">
                      {itemIsSelectable ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      ) : (
                        <span className="text-xs text-gray-400" title="Not selectable">
                          -
                        </span>
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
