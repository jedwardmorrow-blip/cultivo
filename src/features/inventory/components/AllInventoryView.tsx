import { useMemo, useState, useCallback, useEffect } from 'react';
import { Package, Scale, Box, Leaf, Printer, Combine, AlertCircle, CheckCircle2, Archive } from 'lucide-react';
import { InventoryTable } from './InventoryTable';
import { StatsCard } from './StatsCard';
import { InventoryLabelPrintModal } from './InventoryLabelPrintModal';
import { CombinePackagesModal } from './CombinePackagesModal';
import { useInventoryLabel } from '../hooks';
import { getItemStage } from '../hooks/useInventoryFilters';
import type { InventoryItem, AllInventoryStats, StageFilter } from '../types';
import type { SelectedPackage } from '../types/combine.types';

interface AllInventoryViewProps {
  items: InventoryItem[];
  stats: AllInventoryStats;
  stageFilter: StageFilter;
  onStageFilterChange: (filter: StageFilter) => void;
}

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${grams.toFixed(0)}g`;
}

const stageBadgeStyles: Record<string, string> = {
  binned: 'bg-emerald-900/30 text-emerald-400',
  bucked: 'bg-blue-900/30 text-blue-400',
  bulk: 'bg-amber-900/30 text-amber-400',
  packaged: 'bg-teal-900/30 text-teal-400',
};

const stageBreakdownConfig = [
  { key: 'binnedCount' as const, label: 'Binned', icon: Leaf, color: 'text-emerald-400', borderColor: 'border-emerald-800/40' },
  { key: 'buckedCount' as const, label: 'Bucked', icon: Archive, color: 'text-blue-400', borderColor: 'border-blue-800/40' },
  { key: 'bulkCount' as const, label: 'Bulk', icon: Box, color: 'text-amber-400', borderColor: 'border-amber-800/40' },
  { key: 'packagedCount' as const, label: 'Packaged', icon: Package, color: 'text-teal-400', borderColor: 'border-teal-800/40' },
];

export function AllInventoryView({ items, stats, stageFilter }: AllInventoryViewProps) {
  const labelHook = useInventoryLabel();

  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineError, setCombineError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const filteredItems = useMemo(() => {
    if (stageFilter === 'all') return items;
    return items.filter((item) => getItemStage(item) === stageFilter);
  }, [items, stageFilter]);

  const selectedPackages = useMemo(() => {
    if (selectedPackageIds.size === 0) return [];
    return filteredItems
      .filter((item) => selectedPackageIds.has(item.id))
      .map((item): SelectedPackage => ({
        id: item.id,
        package_id: item.package_id,
        on_hand_qty: item.on_hand_qty,
        unit: item.unit || 'g',
        batch_id: item.batch_id || '',
        batch_number: item.batch_number || 'Unknown',
        product_id: item.product_id || '',
        product_name: item.product_name || 'Unknown',
        product_stage_id: item.product_stage_id || '',
        stage_name: item.stage_name || 'Unknown',
        strain: item.strain || 'Unknown',
      }));
  }, [filteredItems, selectedPackageIds]);

  const validateCombination = useCallback((): boolean => {
    setIsValidating(true);

    if (selectedPackages.length < 2) {
      setCombineError('Please select at least 2 packages to combine them into one');
      setIsValidating(false);
      return false;
    }

    const uniqueBatches = new Set(selectedPackages.map((p) => p.batch_id));
    if (uniqueBatches.size > 1) {
      const batchNumbers = Array.from(new Set(selectedPackages.map(p => p.batch_number)));
      setCombineError(`Cannot combine packages from different batches (${batchNumbers.join(', ')}). Select packages from the same batch.`);
      setIsValidating(false);
      return false;
    }

    const uniqueProducts = new Set(selectedPackages.map((p) => p.product_id));
    if (uniqueProducts.size > 1) {
      const productNames = Array.from(new Set(selectedPackages.map(p => p.product_name)));
      setCombineError(`Cannot combine different products (${productNames.join(', ')}). Select packages of the same product.`);
      setIsValidating(false);
      return false;
    }

    const uniqueStages = new Set(selectedPackages.map((p) => p.product_stage_id));
    if (uniqueStages.size > 1) {
      const stageNames = Array.from(new Set(selectedPackages.map(p => p.stage_name)));
      setCombineError(`Cannot combine packages at different stages (${stageNames.join(', ')}). Select packages at the same processing stage.`);
      setIsValidating(false);
      return false;
    }

    setCombineError(null);
    setIsValidating(false);
    return true;
  }, [selectedPackages]);

  const clearSelections = useCallback(() => {
    setSelectedPackageIds(new Set());
    setCombineError(null);
  }, []);

  const handleCombineClick = useCallback(() => {
    if (validateCombination()) {
      setShowCombineModal(true);
    }
  }, [validateCombination]);

  const handleCombineComplete = useCallback(() => {
    setShowCombineModal(false);
    setShowSuccessMessage(true);
    clearSelections();
    setTimeout(() => { setShowSuccessMessage(false); }, 3000);
  }, [clearSelections]);

  const handleCombineClose = useCallback(() => {
    setShowCombineModal(false);
  }, []);

  useEffect(() => {
    if (combineError && selectedPackageIds.size > 0) {
      setCombineError(null);
    }
  }, [selectedPackageIds, combineError]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="Total Packages"
          value={stats.totalPackages}
          icon={<Package className="w-5 h-5" />}
          accentColor="border-cult-medium-gray"
        />
        <StatsCard
          label="Total Weight"
          value={formatWeight(stats.totalWeight)}
          icon={<Scale className="w-5 h-5" />}
          accentColor="border-blue-800/40"
        />
        <StatsCard
          label="Unique Strains"
          value={stats.strainCount}
          icon={<Leaf className="w-5 h-5" />}
          accentColor="border-emerald-800/40"
        />
        <StatsCard
          label="Packaged Units"
          value={stats.packagedCount}
          icon={<Box className="w-5 h-5" />}
          accentColor="border-teal-800/40"
        />
      </div>

      {showSuccessMessage && (
        <div className="bg-emerald-900/15 border border-emerald-800/40 rounded-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-300">
                Packages combined successfully!
              </p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Your inventory has been updated with the new combined package.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedPackageIds.size > 0 && (
        <div className={`rounded-lg p-4 mb-6 transition-all ${
          combineError
            ? 'bg-red-900/15 border border-red-800/40'
            : 'bg-blue-900/15 border border-blue-800/40'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 min-w-0">
              {combineError ? (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              ) : (
                <Package className="w-5 h-5 text-blue-400 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${combineError ? 'text-red-300' : 'text-blue-300'}`}>
                  {selectedPackageIds.size} package{selectedPackageIds.size !== 1 ? 's' : ''} selected
                </p>
                {combineError && (
                  <p className="text-sm text-red-400/80 mt-1">
                    {combineError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCombineClick}
                disabled={isValidating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                <Combine className="w-4 h-4" />
                {isValidating ? 'Validating...' : 'Combine Packages'}
              </button>
              <button
                onClick={clearSelections}
                className="px-4 py-2 bg-cult-medium-gray text-cult-silver rounded-lg hover:bg-cult-lighter-gray/30 hover:text-cult-white transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stageBreakdownConfig.map(({ key, label, icon: Icon, color, borderColor }) => (
          <div key={key} className={`bg-cult-near-black border ${borderColor} rounded-lg p-4 transition-all duration-200 hover:border-cult-lighter-gray/50`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs font-medium uppercase tracking-wider text-cult-silver">{label}</span>
            </div>
            <div className="text-2xl font-bold text-cult-white tabular-nums">{stats[key]}</div>
          </div>
        ))}
      </div>

      <InventoryTable
        items={filteredItems}
        searchable
        searchPlaceholder="Search all inventory..."
        selectable
        selectedIds={selectedPackageIds}
        onSelectionChange={setSelectedPackageIds}
        columns={[
          {
            header: 'Stage',
            accessor: (item) => getItemStage(item),
            align: 'center',
            sortable: false,
            format: (stage) => {
              const s = stage as string | null;
              const name = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
              return (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stageBadgeStyles[s || ''] || 'bg-cult-medium-gray/50 text-cult-lighter-gray'}`}>
                  {name}
                </span>
              );
            },
          },
          {
            header: 'Package ID',
            accessor: 'package_id',
            format: (val) => <span className="font-medium text-cult-white">{val}</span>,
          },
          {
            header: 'Product',
            accessor: 'product_name',
            format: (val) => <span className="text-cult-white">{val || '-'}</span>,
          },
          {
            header: 'Strain',
            accessor: 'strain',
            format: (val) => <span className="text-cult-white">{val}</span>,
          },
          {
            header: 'Batch',
            accessor: 'batch_number',
            format: (val) => <span className="text-cult-silver">{val || '-'}</span>,
          },
          {
            header: 'Room',
            accessor: 'room',
            format: (val) => <span className="text-cult-silver">{val || '-'}</span>,
          },
          {
            header: 'Available Qty',
            accessor: 'available_qty',
            align: 'right',
            format: (val, item) => {
              const stage = getItemStage(item);
              const isPackaged = stage === 'packaged';
              const formattedQty = isPackaged ? (val || 0).toFixed(0) : (val || 0).toFixed(1);
              const unit = isPackaged ? 'units' : 'g';
              return (
                <span className="font-medium text-cult-white tabular-nums">
                  {formattedQty} <span className="text-cult-silver text-xs">{unit}</span>
                </span>
              );
            },
          },
          {
            header: 'Status',
            accessor: (item) => item,
            align: 'center',
            sortable: false,
            format: (_, item) => {
              if (item.available_qty === 0 && item.on_hand_qty > 0) {
                return (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-900/30 text-amber-400">
                    Reserved
                  </span>
                );
              }
              return (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/30 text-emerald-400">
                  {item.status || 'Active'}
                </span>
              );
            },
          },
          {
            header: '',
            accessor: (item) => item,
            align: 'center',
            sortable: false,
            format: (_, item) => (
              <button
                onClick={() => labelHook.openLabel(item)}
                className="p-1.5 rounded-md hover:bg-cult-medium-gray/60 text-cult-lighter-gray hover:text-cult-white transition-colors"
                title="Print Label"
              >
                <Printer className="w-4 h-4" />
              </button>
            ),
          },
        ]}
        emptyMessage="No inventory found"
        emptySubtext="Import inventory or complete sessions to populate"
      />

      <InventoryLabelPrintModal
        isOpen={labelHook.isOpen}
        isLoading={labelHook.isLoading}
        isPrinting={labelHook.isPrinting}
        labelData={labelHook.labelData}
        logoDataUrl={labelHook.logoDataUrl}
        error={labelHook.error}
        onClose={labelHook.closeLabel}
        onPrint={labelHook.printLabel}
      />

      <CombinePackagesModal
        isOpen={showCombineModal}
        onClose={handleCombineClose}
        onComplete={handleCombineComplete}
        preselected_packages={selectedPackages}
      />
    </>
  );
}
