import { useMemo, useState, useCallback, useEffect } from 'react';
import { Package, Archive, Box, Leaf, Printer, Combine, AlertCircle, CheckCircle2 } from 'lucide-react';
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

/**
 * AllInventoryView Component
 *
 * Displays all inventory items across all stages (Binned, Bucked, Bulk, Packaged) in a unified table.
 * Filtering is controlled by the sidebar navigation - clicking stage buttons filters the view.
 *
 * Stage Flow: Binned → Bucked → Bulk → Packaged
 * - Binned: Fresh flower directly from harvest
 * - Bucked: Flower that has been bucked (stems removed)
 * - Bulk: Processed flower, smalls, and trim ready for packaging
 * - Packaged: Final packaged products ready for distribution
 */
export function AllInventoryView({ items, stats, stageFilter }: AllInventoryViewProps) {
  const labelHook = useInventoryLabel();

  // Multi-select state for combining packages
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineError, setCombineError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Filter items based on selected stage
  const filteredItems = useMemo(() => {
    if (stageFilter === 'all') {
      return items;
    }

    return items.filter((item) => {
      const itemStage = getItemStage(item);
      return itemStage === stageFilter;
    });
  }, [items, stageFilter]);

  // Get badge color for stage indicator
  const getStageBadgeColor = (stage: string | null) => {
    switch (stage) {
      case 'binned':
        return 'bg-green-100 text-green-700';
      case 'bucked':
        return 'bg-blue-100 text-blue-700';
      case 'bulk':
        return 'bg-orange-100 text-orange-700';
      case 'packaged':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get stage display name
  const getStageDisplayName = (stage: string | null) => {
    if (!stage) return 'Unknown';
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedPackageIds(new Set());
    setCombineError(null);
  }, []);

  // Get selected packages data (memoized for performance)
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

  // Validate package selection for combining
  const validateCombination = useCallback((): boolean => {
    setIsValidating(true);

    if (selectedPackages.length < 2) {
      setCombineError('Please select at least 2 packages to combine them into one');
      setIsValidating(false);
      return false;
    }

    // Check batch compatibility
    const uniqueBatches = new Set(selectedPackages.map((p) => p.batch_id));
    if (uniqueBatches.size > 1) {
      const batchNumbers = Array.from(new Set(selectedPackages.map(p => p.batch_number)));
      setCombineError(`Cannot combine packages from different batches (${batchNumbers.join(', ')}). Select packages from the same batch.`);
      setIsValidating(false);
      return false;
    }

    // Check product compatibility
    const uniqueProducts = new Set(selectedPackages.map((p) => p.product_id));
    if (uniqueProducts.size > 1) {
      const productNames = Array.from(new Set(selectedPackages.map(p => p.product_name)));
      setCombineError(`Cannot combine different products (${productNames.join(', ')}). Select packages of the same product.`);
      setIsValidating(false);
      return false;
    }

    // Check stage compatibility
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

  // Open combine modal
  const handleCombineClick = useCallback(() => {
    if (validateCombination()) {
      setShowCombineModal(true);
    }
  }, [validateCombination]);

  // Handle combine completion
  const handleCombineComplete = useCallback(() => {
    setShowCombineModal(false);
    setShowSuccessMessage(true);
    clearSelections();

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);

    // Parent component will refresh data via subscription
  }, [clearSelections]);

  // Handle combine modal close
  const handleCombineClose = useCallback(() => {
    setShowCombineModal(false);
  }, []);

  // Auto-clear error when selection changes
  useEffect(() => {
    if (combineError && selectedPackageIds.size > 0) {
      setCombineError(null);
    }
  }, [selectedPackageIds, combineError]);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="Total Packages"
          value={stats.totalPackages}
          icon={<Package className="w-8 h-8 text-white" />}
        />
        <StatsCard
          label="Total Weight (g)"
          value={stats.totalWeight.toFixed(0)}
          icon={<Archive className="w-8 h-8 text-blue-400" />}
        />
        <StatsCard
          label="Unique Strains"
          value={stats.strainCount}
          icon={<Leaf className="w-8 h-8 text-green-400" />}
        />
        <StatsCard
          label="Packaged Units"
          value={stats.packagedCount}
          icon={<Box className="w-8 h-8 text-purple-400" />}
        />
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Packages combined successfully!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Your inventory has been updated with the new combined package.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selection Banner */}
      {selectedPackageIds.size > 0 && (
        <div className={`rounded-lg p-4 mb-6 transition-all ${
          combineError ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {combineError ? (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : (
                <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  combineError ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {selectedPackageIds.size} package{selectedPackageIds.size !== 1 ? 's' : ''} selected
                </p>
                {combineError && (
                  <p className="text-sm text-red-700 mt-1 flex items-start gap-2">
                    <span className="font-medium">Error:</span>
                    <span>{combineError}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCombineClick}
                disabled={isValidating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Combine className="w-4 h-4" />
                {isValidating ? 'Validating...' : 'Combine Packages'}
              </button>
              <button
                onClick={clearSelections}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Binned</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.binnedCount}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Bucked</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.buckedCount}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Box className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Bulk</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.bulkCount}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Packaged</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.packagedCount}</div>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable
        items={filteredItems}
        selectable
        selectedIds={selectedPackageIds}
        onSelectionChange={setSelectedPackageIds}
        columns={[
          {
            header: 'Stage',
            accessor: (item) => getItemStage(item),
            align: 'center',
            format: (stage) => (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getStageBadgeColor(
                  stage as string | null
                )}`}
              >
                {getStageDisplayName(stage as string | null)}
              </span>
            ),
          },
          {
            header: 'Package ID',
            accessor: 'package_id',
            format: (val) => <span className="font-medium text-white">{val}</span>,
          },
          {
            header: 'Product Name',
            accessor: 'product_name',
            format: (val) => <span className="text-white">{val || '-'}</span>,
          },
          {
            header: 'Strain',
            accessor: 'strain',
            format: (val) => <span className="text-white">{val}</span>,
          },
          {
            header: 'Batch',
            accessor: 'batch_number',
            format: (val) => <span className="text-cult-light-gray">{val || '-'}</span>,
          },
          {
            header: 'Room',
            accessor: 'room',
            format: (val) => <span className="text-cult-light-gray">{val || '-'}</span>,
          },
          {
            header: 'Available Qty',
            accessor: 'available_qty',
            align: 'right',
            format: (val, item) => {
              const stage = getItemStage(item);
              const isPackaged = stage === 'packaged';
              const formattedQty = isPackaged
                ? (val || 0).toFixed(0)
                : (val || 0).toFixed(1);
              const unit = isPackaged ? 'units' : 'g';
              return (
                <span className="font-medium text-white">
                  {formattedQty} {unit}
                </span>
              );
            },
          },
          {
            header: 'Status',
            accessor: (item) => item,
            align: 'center',
            format: (_, item) => {
              if (item.available_qty === 0 && item.on_hand_qty > 0) {
                return (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    Reserved
                  </span>
                );
              }
              return (
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  {item.status || 'Active'}
                </span>
              );
            },
          },
          {
            header: 'Actions',
            accessor: (item) => item,
            align: 'center',
            format: (_, item) => (
              <button
                onClick={() => labelHook.openLabel(item)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Print Label"
              >
                <Printer className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            ),
          },
        ]}
        emptyIcon={<Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
        emptyMessage="No inventory found"
        emptySubtext="Import a CSV file or add inventory to get started"
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
