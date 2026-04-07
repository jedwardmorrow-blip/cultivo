import { useMemo, useState, useCallback, useEffect } from 'react';
import { Package, Scale, Box, Leaf, Printer, Combine, AlertCircle, CheckCircle2, Archive, SlidersHorizontal, ArrowLeftRight, ShieldCheck, ShieldX } from 'lucide-react';
import { InventoryTable } from './InventoryTable';
import { StatsCard } from './StatsCard';
import { InventoryLabelPrintModal } from './InventoryLabelPrintModal';
import { MultiLabelPrintModal } from './MultiLabelPrintModal';
import { CombinePackagesModal } from './CombinePackagesModal';
import { QuickAdjustmentModal } from './QuickAdjustmentModal';
import { RebalanceWeightModal } from './RebalanceWeightModal';
import { RowActionMenu } from './RowActionMenu';
import type { RowAction } from './RowActionMenu';
import { QualityGradeBadge } from '@/shared/components';
import { qualityGradeService } from '@/services';
import { supabase } from '@/lib/supabase';
import { InventoryItemExtended } from '@/types';
import { useAuth } from '@/lib/auth';
import { useInventoryLabel } from '../hooks';
import { useMultiLabelPrint } from '../hooks/useMultiLabelPrint';
import { useAdjustment } from '../hooks/useAdjustment';
import { useInventoryReview } from '../hooks/useInventoryReview';
import type { ReviewFilter } from '../hooks/useInventoryReview';
import { getItemStage } from '../hooks/useInventoryFilters';
import {
  validateAdjustment as validateAdjustmentInput,
  calculateVariance,
} from '../types/adjustment.types';
import type { InventoryItem, AllInventoryStats, StageFilter, QuickAdjustmentModalState, VarianceReason } from '../types';
import type { SelectedPackage } from '../types/combine.types';
import { formatWeight } from '@/shared/utils/format';

interface AllInventoryViewProps {
  items: InventoryItem[];
  stats: AllInventoryStats;
  stageFilter: StageFilter;
  onStageFilterChange: (filter: StageFilter) => void;
  onDataRefresh?: () => void;
}

const stageBadgeStyles: Record<string, string> = {
  binned: 'bg-cult-stage-binned/30 text-cult-stage-binned',
  bucked: 'bg-cult-stage-bucked/30 text-cult-stage-bucked',
  bulk: 'bg-cult-stage-bulk/30 text-cult-stage-bulk',
  packaged: 'bg-cult-stage-packaged/30 text-cult-stage-packaged',
};

const stageBreakdownConfig = [
  { key: 'binnedCount' as const, label: 'Binned', icon: Leaf, color: 'text-cult-stage-binned', borderColor: 'border-cult-stage-binned/40' },
  { key: 'buckedCount' as const, label: 'Bucked', icon: Archive, color: 'text-cult-stage-bucked', borderColor: 'border-cult-stage-bucked/40' },
  { key: 'bulkCount' as const, label: 'Bulk', icon: Box, color: 'text-cult-stage-bulk', borderColor: 'border-cult-stage-bulk/40' },
  { key: 'packagedCount' as const, label: 'Packaged', icon: Package, color: 'text-cult-stage-packaged', borderColor: 'border-cult-stage-packaged/40' },
];

const defaultAdjustmentState: QuickAdjustmentModalState = {
  isOpen: false,
  inventoryItemId: null,
  currentQty: 0,
  packageId: '',
  productName: '',
  strain: null,
  batch: null,
  stage: '',
  unit: 'g',
  newQty: '',
  varianceReason: '',
  notes: '',
  varianceQty: 0,
  variancePercentage: 0,
  isLoading: false,
  isSaving: false,
  error: null,
  validation: { isValid: false, errors: {} },
};

export function AllInventoryView({ items, stats, stageFilter, onDataRefresh }: AllInventoryViewProps) {
  const labelHook = useInventoryLabel();
  const multiLabelHook = useMultiLabelPrint();
  const { isAdmin } = useAuth();
  const { applyAdjustment } = useAdjustment();

  const { toggleReviewStatus } = useInventoryReview();

  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineError, setCombineError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [adjustmentState, setAdjustmentState] = useState<QuickAdjustmentModalState>(defaultAdjustmentState);
  const [rebalanceSource, setRebalanceSource] = useState<InventoryItem | null>(null);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);

  // Temporary audit: review status filter + optimistic overrides
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [reviewOverrides, setReviewOverrides] = useState<Map<string, boolean>>(new Map());

  const handleReviewToggle = useCallback((item: InventoryItem) => {
    toggleReviewStatus(item, (itemId, verified) => {
      setReviewOverrides(prev => {
        const next = new Map(prev);
        next.set(itemId, verified);
        return next;
      });
    });
  }, [toggleReviewStatus]);

  // Helper: get effective review status accounting for optimistic overrides
  const isItemVerified = useCallback((item: InventoryItem): boolean => {
    if (reviewOverrides.has(item.id)) return reviewOverrides.get(item.id)!;
    return item.review_status === 'verified';
  }, [reviewOverrides]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (stageFilter !== 'all') {
      result = result.filter((item) => getItemStage(item) === stageFilter);
    }
    if (reviewFilter !== 'all') {
      result = result.filter((item) => {
        const verified = isItemVerified(item);
        return reviewFilter === 'verified' ? verified : !verified;
      });
    }
    return result;
  }, [items, stageFilter, reviewFilter, isItemVerified]);

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

  const handlePrintLabelsClick = useCallback(() => {
    const selectedItems = filteredItems.filter((item) => selectedPackageIds.has(item.id));
    if (selectedItems.length > 0) {
      multiLabelHook.openMultiLabel(selectedItems);
    }
  }, [filteredItems, selectedPackageIds, multiLabelHook]);

  const openAdjustmentModal = useCallback((item: InventoryItem) => {
    const stage = getItemStage(item) || 'unknown';
    setAdjustmentState({
      ...defaultAdjustmentState,
      isOpen: true,
      inventoryItemId: item.id,
      currentQty: item.on_hand_qty || 0,
      packageId: item.package_id,
      productName: item.product_name || '',
      strain: item.strain || null,
      batch: item.batch_number || null,
      stage,
      unit: stage === 'packaged' ? 'unit' : 'g',
    });
  }, []);

  const closeAdjustmentModal = useCallback(() => {
    setAdjustmentState(defaultAdjustmentState);
  }, []);

  const handleNewQtyChange = useCallback((value: string) => {
    setAdjustmentState(prev => {
      const qty = parseFloat(value);
      const { varianceQty, variancePercentage } = isNaN(qty)
        ? { varianceQty: 0, variancePercentage: 0 }
        : calculateVariance(prev.currentQty, qty);
      const validation = validateAdjustmentInput(value, prev.varianceReason, prev.notes, prev.currentQty);
      return { ...prev, newQty: value, varianceQty, variancePercentage, validation };
    });
  }, []);

  const handleVarianceReasonChange = useCallback((reason: VarianceReason | '') => {
    setAdjustmentState(prev => {
      const validation = validateAdjustmentInput(prev.newQty, reason, prev.notes, prev.currentQty);
      return { ...prev, varianceReason: reason, validation };
    });
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    setAdjustmentState(prev => {
      const validation = validateAdjustmentInput(prev.newQty, prev.varianceReason, notes, prev.currentQty);
      return { ...prev, notes, validation };
    });
  }, []);

  const handleAdjustmentSubmit = useCallback(async () => {
    if (!adjustmentState.inventoryItemId) return;
    setAdjustmentState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      await applyAdjustment({
        inventory_item_id: adjustmentState.inventoryItemId,
        new_qty: parseFloat(adjustmentState.newQty),
        variance_reason: adjustmentState.varianceReason as VarianceReason,
        notes: adjustmentState.notes,
      });
      closeAdjustmentModal();
      onDataRefresh?.();
    } catch {
      setAdjustmentState(prev => ({ ...prev, isSaving: false, error: 'Failed to apply adjustment' }));
    }
  }, [adjustmentState, applyAdjustment, closeAdjustmentModal, onDataRefresh]);

  const openRebalanceModal = useCallback((item: InventoryItem) => {
    setRebalanceSource(item);
    setShowRebalanceModal(true);
  }, []);

  const closeRebalanceModal = useCallback(() => {
    setRebalanceSource(null);
    setShowRebalanceModal(false);
  }, []);

  const handleRebalanceComplete = useCallback(() => {
    onDataRefresh?.();
  }, [onDataRefresh]);

  const renderRowActions = useCallback((item: InventoryItem) => {
    const actions: RowAction[] = [
      {
        label: 'Print Label',
        icon: <Printer className="w-4 h-4" />,
        onClick: () => labelHook.openLabel(item),
      },
      {
        label: 'Adjust Quantity',
        icon: <SlidersHorizontal className="w-4 h-4" />,
        onClick: () => openAdjustmentModal(item),
        visible: isAdmin,
      },
      {
        label: 'Rebalance Weight',
        icon: <ArrowLeftRight className="w-4 h-4" />,
        onClick: () => openRebalanceModal(item),
        visible: isAdmin && (item.on_hand_qty || 0) > 0,
      },
    ];
    return <RowActionMenu actions={actions} />;
  }, [labelHook, openAdjustmentModal, openRebalanceModal, isAdmin]);

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
          accentColor="border-cult-info/40"
        />
        <StatsCard
          label="Unique Strains"
          value={stats.strainCount}
          icon={<Leaf className="w-5 h-5" />}
          accentColor="border-cult-success/40"
        />
        <StatsCard
          label="Packaged Units"
          value={stats.packagedCount}
          icon={<Box className="w-5 h-5" />}
          accentColor="border-cult-stage-packaged/40"
        />
      </div>

      {showSuccessMessage && (
        <div className="bg-cult-success-muted border border-cult-success/40 rounded-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-cult-success flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-cult-success">
                Packages combined successfully!
              </p>
              <p className="text-xs text-cult-success/70 mt-1">
                Your inventory has been updated with the new combined package.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedPackageIds.size > 0 && (
        <div className={`rounded-lg p-4 mb-6 transition-all ${
          combineError
            ? 'bg-cult-danger-muted border border-cult-danger/40'
            : 'bg-cult-info-muted border border-cult-info/40'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 min-w-0">
              {combineError ? (
                <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0" />
              ) : (
                <Package className="w-5 h-5 text-cult-info flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${combineError ? 'text-cult-danger' : 'text-cult-info'}`}>
                  {selectedPackageIds.size} package{selectedPackageIds.size !== 1 ? 's' : ''} selected
                </p>
                {combineError && (
                  <p className="text-sm text-cult-danger/80 mt-1">
                    {combineError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintLabelsClick}
                className="px-4 py-2 bg-cult-success text-white rounded-lg hover:bg-cult-success/80 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print Labels
              </button>
              <button
                onClick={handleCombineClick}
                disabled={isValidating}
                className="px-4 py-2 bg-cult-info text-white rounded-lg hover:bg-cult-info/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
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

      {/* Temporary Audit: Verification filter bar */}
      {(() => {
        const stageItems = stageFilter === 'all' ? items : items.filter(i => getItemStage(i) === stageFilter);
        const verifiedCount = stageItems.filter(i => isItemVerified(i)).length;
        const totalCount = stageItems.length;
        const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;
        return (
          <div className="flex items-center justify-between gap-4 mb-4 px-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cult-lighter-gray" />
              <div className="flex gap-0.5 p-0.5 bg-cult-dark-gray rounded-lg border border-cult-medium-gray">
                {([
                  { key: 'all' as ReviewFilter, label: 'All' },
                  { key: 'verified' as ReviewFilter, label: 'Verified' },
                  { key: 'unverified' as ReviewFilter, label: 'Unverified' },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setReviewFilter(key)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      reviewFilter === key
                        ? key === 'verified'
                          ? 'bg-cult-success-muted text-cult-success border border-cult-success/50'
                          : key === 'unverified'
                          ? 'bg-cult-warning-muted text-cult-warning border border-cult-warning/50'
                          : 'bg-cult-medium-gray text-cult-white shadow-sm'
                        : 'text-cult-lighter-gray hover:text-cult-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-cult-dark-gray rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cult-success rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-cult-lighter-gray tabular-nums">
                  {verifiedCount}/{totalCount} verified
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      <InventoryTable
        items={filteredItems}
        searchable
        searchPlaceholder="Search all inventory..."
        gradeFilterable
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
            header: 'Grade',
            accessor: (item) => item,
            align: 'center',
            sortable: false,
            format: (_, item) => (
              <QualityGradeBadge
                gradeId={(item as InventoryItemExtended).quality_grade_id}
                editable
                onGradeChange={async (newGradeId) => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    await qualityGradeService.assignItemGrade(item.id, newGradeId, user?.id || null);
                    onDataRefresh?.();
                  } catch (err) {
                    console.error('Failed to update grade:', err);
                  }
                }}
              />
            ),
          },
          {
            header: 'Status',
            accessor: (item) => item,
            align: 'center',
            sortable: false,
            format: (_, item) => {
              if (item.available_qty === 0 && item.on_hand_qty > 0) {
                return (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-cult-warning-muted text-cult-warning">
                    Reserved
                  </span>
                );
              }
              return (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-cult-success-muted text-cult-success">
                  {item.status || 'Active'}
                </span>
              );
            },
          },
          {
            header: 'Verified',
            accessor: (item) => item,
            align: 'center',
            sortable: false,
            format: (_, item) => {
              const verified = isItemVerified(item);
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReviewToggle(item);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                    verified
                      ? 'bg-cult-success-muted text-cult-success hover:bg-cult-success/20'
                      : 'bg-cult-medium-gray/30 text-cult-lighter-gray hover:bg-cult-medium-gray/50 hover:text-cult-silver'
                  }`}
                  title={verified ? 'Click to mark as unverified' : 'Click to mark as verified'}
                >
                  {verified ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldX className="w-3.5 h-3.5" />
                  )}
                  {verified ? 'Yes' : 'No'}
                </button>
              );
            },
          },
        ]}
        renderRowActions={renderRowActions}
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

      <MultiLabelPrintModal
        isOpen={multiLabelHook.isOpen}
        isLoading={multiLabelHook.isLoading}
        isPrinting={multiLabelHook.isPrinting}
        labels={multiLabelHook.labels}
        logoDataUrl={multiLabelHook.logoDataUrl}
        error={multiLabelHook.error}
        onClose={multiLabelHook.closeMultiLabel}
        onPrint={multiLabelHook.printLabels}
      />

      <CombinePackagesModal
        isOpen={showCombineModal}
        onClose={handleCombineClose}
        onComplete={handleCombineComplete}
        preselected_packages={selectedPackages}
      />

      <QuickAdjustmentModal
        state={adjustmentState}
        onClose={closeAdjustmentModal}
        onNewQtyChange={handleNewQtyChange}
        onVarianceReasonChange={handleVarianceReasonChange}
        onNotesChange={handleNotesChange}
        onSubmit={handleAdjustmentSubmit}
      />

      <RebalanceWeightModal
        isOpen={showRebalanceModal}
        sourceItem={rebalanceSource}
        allItems={filteredItems}
        onClose={closeRebalanceModal}
        onComplete={handleRebalanceComplete}
      />
    </>
  );
}
