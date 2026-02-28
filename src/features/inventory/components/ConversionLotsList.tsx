/**
 * ConversionLotsList Component
 *
 * Displays a list of conversion lots with filtering and sorting.
 * Entry point for the conversion workflow.
 */

import { useState } from 'react';
import { Search, Filter, ArrowUpDown, Package, Lock } from 'lucide-react';
import { useConversionLots } from '../hooks';
import { ConversionLotSummary, ConversionLotStatus } from '@/types';

interface ConversionLotsListProps {
  onSelectLot: (lot: ConversionLotSummary) => void;
  selectedDate?: string;
}

export function ConversionLotsList({ onSelectLot, selectedDate }: ConversionLotsListProps) {
  const { lots, isLoading, error, applyFilters, applySort } = useConversionLots(selectedDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConversionLotStatus[]>(['active']);
  const [showFilters, setShowFilters] = useState(false);

  // Apply search filter
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    applyFilters({ search, status: statusFilter });
  };

  // Apply status filter
  const handleStatusFilter = (status: ConversionLotStatus[]) => {
    setStatusFilter(status);
    applyFilters({ search: searchTerm, status });
  };

  // Toggle status in filter
  const toggleStatus = (status: ConversionLotStatus) => {
    const newStatuses = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    handleStatusFilter(newStatuses);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search by batch, strain, or product..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-cult-border text-cult-text-muted hover:bg-cult-surface-sunken'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filters
        </button>

        {/* Sort button */}
        <button
          onClick={() => applySort({ field: 'strain_name', direction: 'asc' })}
          className="flex items-center gap-2 px-4 py-2 border border-cult-border rounded-lg bg-white text-cult-text-muted hover:bg-cult-surface-sunken transition-colors"
        >
          <ArrowUpDown className="w-5 h-5" />
          Sort
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-cult-surface-sunken border border-cult-border-subtle rounded-lg p-4">
          <div>
            <h3 className="text-sm font-medium text-cult-text-muted mb-3">Status</h3>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes('active')}
                  onChange={() => toggleStatus('active')}
                  className="rounded border-cult-border text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-cult-text-muted">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes('completed_today')}
                  onChange={() => toggleStatus('completed_today')}
                  className="rounded border-cult-border text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-cult-text-muted">Completed Today</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && lots.length === 0 && (
        <div className="bg-cult-surface-sunken border border-cult-border-subtle rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-cult-text-muted mx-auto mb-3" />
          <h3 className="text-lg font-medium text-cult-text-primary mb-1">No conversions pending</h3>
          <p className="text-sm text-cult-text-faint">
            Complete trim or packaging sessions to create pending conversions.
          </p>
        </div>
      )}

      {/* Lots list */}
      {!isLoading && lots.length > 0 && (
        <div className="space-y-3">
          {lots.map((lot) => (
            <ConversionLotCard
              key={lot.lot_id}
              lot={lot}
              onClick={() => onSelectLot(lot)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ConversionLotCardProps {
  lot: ConversionLotSummary;
  onClick: () => void;
}

function ConversionLotCard({ lot, onClick }: ConversionLotCardProps) {
  const isBulk = lot.total_weight !== null;
  const isCompleted = lot.status === 'completed_today';

  return (
    <button
      onClick={onClick}
      disabled={lot.is_locked && !isCompleted}
      className={`w-full text-left border rounded-lg p-4 transition-all ${
        isCompleted
          ? 'bg-green-50 border-green-200 hover:bg-green-100'
          : lot.is_locked
          ? 'bg-cult-surface-sunken border-cult-border-subtle opacity-75 cursor-not-allowed'
          : 'bg-white border-cult-border-subtle hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-cult-text-primary truncate">
              {lot.strain_name}
            </h3>
            <span className="text-xs font-medium text-cult-text-muted">
              {lot.batch_name}
            </span>
          </div>

          <p className="text-sm text-cult-text-faint mb-2">
            {lot.product_name} · {lot.product_type}
          </p>

          {/* Lock status */}
          {lot.is_locked && !isCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-flex">
              <Lock className="w-3 h-3" />
              <span>Converting: {lot.locked_by_name}</span>
            </div>
          )}

          {/* Completed status */}
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 border border-green-200 rounded px-2 py-1 inline-flex">
              <Package className="w-3 h-3" />
              <span>Completed Today</span>
            </div>
          )}
        </div>

        {/* Quantities */}
        <div className="text-right">
          {isBulk ? (
            <>
              <div className="text-2xl font-bold text-cult-text-primary">
                {lot.remaining_weight?.toFixed(0) || 0}
                <span className="text-sm font-normal text-cult-text-muted ml-1">g</span>
              </div>
              <div className="text-xs text-cult-text-muted mt-1">
                of {lot.total_weight?.toFixed(0) || 0}g total
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-cult-text-primary">
                {lot.remaining_units || 0}
                <span className="text-sm font-normal text-cult-text-muted ml-1">units</span>
              </div>
              <div className="text-xs text-cult-text-muted mt-1">
                of {lot.total_units || 0} total
              </div>
            </>
          )}

          {/* Session count */}
          <div className="text-xs text-cult-text-muted mt-2">
            {lot.contributing_session_count} session{lot.contributing_session_count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </button>
  );
}
