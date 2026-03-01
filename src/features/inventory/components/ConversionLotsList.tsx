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

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    applyFilters({ search, status: statusFilter });
  };

  const handleStatusFilter = (status: ConversionLotStatus[]) => {
    setStatusFilter(status);
    applyFilters({ search: searchTerm, status });
  };

  const toggleStatus = (status: ConversionLotStatus) => {
    const newStatuses = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    handleStatusFilter(newStatuses);
  };

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-silver w-5 h-5" />
          <input
            type="text"
            placeholder="Search by batch, strain, or product..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-silver focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters
              ? 'bg-green-900/30 border-green-600 text-green-400'
              : 'bg-cult-dark-gray border-cult-medium-gray text-cult-silver hover:bg-cult-near-black'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filters
        </button>

        <button
          onClick={() => applySort({ field: 'strain_name', direction: 'asc' })}
          className="flex items-center gap-2 px-4 py-2 border border-cult-medium-gray rounded-lg bg-cult-dark-gray text-cult-silver hover:bg-cult-near-black transition-colors"
        >
          <ArrowUpDown className="w-5 h-5" />
          Sort
        </button>
      </div>

      {showFilters && (
        <div className="bg-cult-dark-gray border border-cult-medium-gray rounded-lg p-4">
          <div>
            <h3 className="text-sm font-medium text-cult-silver mb-3">Status</h3>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes('active')}
                  onChange={() => toggleStatus('active')}
                  className="rounded border-cult-medium-gray bg-cult-near-black text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-cult-light-gray">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes('completed_today')}
                  onChange={() => toggleStatus('completed_today')}
                  className="rounded border-cult-medium-gray bg-cult-near-black text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-cult-light-gray">Completed Today</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}

      {!isLoading && lots.length === 0 && (
        <div className="bg-cult-dark-gray border border-cult-medium-gray rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-cult-silver mx-auto mb-3" />
          <h3 className="text-lg font-medium text-cult-white mb-1">No conversions pending</h3>
          <p className="text-sm text-cult-light-gray">
            Complete trim or packaging sessions to create pending conversions.
          </p>
        </div>
      )}

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
          ? 'bg-green-900/20 border-green-600 hover:bg-green-900/30'
          : lot.is_locked
          ? 'bg-cult-dark-gray border-cult-medium-gray opacity-75 cursor-not-allowed'
          : 'bg-cult-near-black border-cult-medium-gray hover:border-green-500/50 hover:bg-cult-dark-gray'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-cult-white truncate">
              {lot.strain_name}
            </h3>
            <span className="text-xs font-medium text-cult-silver">
              {lot.batch_name}
            </span>
          </div>

          <p className="text-sm text-cult-light-gray mb-2">
            {lot.product_name} · {lot.product_type}
          </p>

          {lot.is_locked && !isCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/30 border border-amber-600 rounded px-2 py-1 inline-flex">
              <Lock className="w-3 h-3" />
              <span>Converting: {lot.locked_by_name}</span>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/30 border border-green-600 rounded px-2 py-1 inline-flex">
              <Package className="w-3 h-3" />
              <span>Completed Today</span>
            </div>
          )}
        </div>

        <div className="text-right">
          {isBulk ? (
            <>
              <div className="text-2xl font-bold text-cult-white">
                {lot.remaining_weight?.toFixed(0) || 0}
                <span className="text-sm font-normal text-cult-silver ml-1">g</span>
              </div>
              <div className="text-xs text-cult-silver mt-1">
                of {lot.total_weight?.toFixed(0) || 0}g total
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-cult-white">
                {lot.remaining_units || 0}
                <span className="text-sm font-normal text-cult-silver ml-1">units</span>
              </div>
              <div className="text-xs text-cult-silver mt-1">
                of {lot.total_units || 0} total
              </div>
            </>
          )}

          <div className="text-xs text-cult-silver mt-2">
            {lot.contributing_session_count} session{lot.contributing_session_count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </button>
  );
}
