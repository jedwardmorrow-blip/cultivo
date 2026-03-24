import { useState, useEffect } from 'react';
import {
  CreditCard as Edit2, Trash2, Package, CheckCircle, AlertCircle,
  Circle, Printer, Gift, ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { PackageAssignmentModal } from './PackageAssignmentModal';
import { AssignedPackagesDisplay } from './AssignedPackagesDisplay';
import { OrderItemLabelPrintModal } from './OrderItemLabelPrintModal';
import { useTotalAssignedQuantity } from '../hooks';
import { useOrderItemLabels } from '../hooks/useOrderItemLabels';
import { fulfillmentValidationService } from '../services/fulfillmentValidation.service';
import { QualityGradeBadge } from '@/shared/components';
import type { FulfillmentStatus } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  product_name: string;
  product_type: string;
  strain: string;
  status: string;
  pricing_unit?: string;
  product_category?: string;
  batch_id?: string | null;
  is_sample?: boolean;
}

interface BatchInfo {
  batch_id: string;
  batch_number: string;
  strain: string;
  status: string;
  has_bucked: boolean;
  has_bulk_flower: boolean;
  has_bulk_smalls: boolean;
  has_bulk_trim: boolean;
  has_packaged: boolean;
  total_available_grams: number;
}

interface OrderItemCardProps {
  item: OrderItem;
  orderId: string;
  onStatusUpdate: (itemId: string, orderId: string, newStatus: string) => void;
  onQuantityUpdate: (itemId: string, orderId: string, newQuantity: number) => void;
  onPriceUpdate: (itemId: string, orderId: string, newPrice: number) => void;
  onBatchUpdate: (itemId: string, orderId: string, batchId: string | null, strain: string | null) => void;
  onSampleToggle?: (itemId: string, orderId: string, isSample: boolean) => void;
  onDelete: (itemId: string, orderId: string) => void;
}

// ─── Fulfillment Badge ──────────────────────────────────────────────────────

function FulfillmentBadge({
  totalAssigned,
  quantity,
  unit,
}: {
  totalAssigned: number;
  quantity: number;
  unit: string;
}) {
  const pct = quantity > 0 ? (totalAssigned / quantity) * 100 : 0;
  const isComplete = totalAssigned >= quantity;
  const isPartial = totalAssigned > 0 && totalAssigned < quantity;

  if (totalAssigned === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-cult-text-muted">
        <Circle className="w-3 h-3" />
        Unassigned
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1 text-xs font-semibold ${
        isComplete ? 'text-cult-success' : 'text-cult-warning'
      }`}>
        {isComplete ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {totalAssigned}/{quantity} {unit}
      </span>
      <div className="w-16 h-1.5 bg-cult-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? 'bg-cult-success' : 'bg-cult-warning'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Label Progress ─────────────────────────────────────────────────────────

function LabelProgress({ stats }: { stats: { total: number; printed: number; pending: number } }) {
  if (stats.total === 0) return null;
  const pct = stats.total > 0 ? (stats.printed / stats.total) * 100 : 0;
  const isComplete = stats.pending === 0;

  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1 text-xs ${
        isComplete ? 'text-cult-success' : stats.printed > 0 ? 'text-cult-warning' : 'text-cult-text-muted'
      }`}>
        <Printer className="w-3 h-3" />
        {stats.printed}/{stats.total}
      </span>
      <div className="w-12 h-1.5 bg-cult-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isComplete ? 'bg-cult-success' : stats.printed > 0 ? 'bg-cult-warning' : 'bg-cult-text-muted'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OrderItemCard({
  item,
  orderId,
  onQuantityUpdate,
  onPriceUpdate,
  onBatchUpdate,
  onSampleToggle,
  onDelete,
}: OrderItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [quantityValue, setQuantityValue] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const [availableBatches, setAvailableBatches] = useState<BatchInfo[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAssignedPackages, setShowAssignedPackages] = useState(false);
  const [showLabelPrintModal, setShowLabelPrintModal] = useState(false);
  const [batchGradeId, setBatchGradeId] = useState<string | null>(null);

  const { totalAssigned, loading: loadingAssigned, refetch: refetchAssigned } = useTotalAssignedQuantity(item.id);
  const { stats, loading: labelsLoading } = useOrderItemLabels(item.id);

  const fulfillmentPercentage = item.quantity > 0 ? (totalAssigned / item.quantity) * 100 : 0;
  const isFullyAssigned = totalAssigned >= item.quantity;
  const isPartiallyAssigned = totalAssigned > 0 && totalAssigned < item.quantity;

  let fulfillmentStatus: FulfillmentStatus = 'unfulfilled';
  if (isFullyAssigned) fulfillmentStatus = 'fully_fulfilled';
  else if (isPartiallyAssigned) fulfillmentStatus = 'partially_fulfilled';

  // ─── Data loading ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!item.strain) return;
    let cancelled = false;
    setBatchesLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_batches_for_strain', { p_strain: item.strain });
        if (cancelled) return;
        setAvailableBatches(error ? [] : (data || []));
      } catch {
        if (!cancelled) setAvailableBatches([]);
      } finally {
        if (!cancelled) { setBatchesLoading(false); setBatchesLoaded(true); }
      }
    })();

    return () => { cancelled = true; };
  }, [item.strain]);

  useEffect(() => {
    if (!item.batch_id) { setBatchGradeId(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('batch_registry')
        .select('quality_grade_id')
        .eq('id', item.batch_id!)
        .maybeSingle();
      if (!cancelled) setBatchGradeId(data?.quality_grade_id || null);
    })();
    return () => { cancelled = true; };
  }, [item.batch_id]);

  // ─── Inline editing ───────────────────────────────────────────────────

  const startEditingQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingQuantity(true);
    setQuantityValue(item.quantity.toString());
  };

  const saveQuantity = () => {
    const newValue = parseInt(quantityValue);
    if (!isNaN(newValue) && newValue > 0) {
      onQuantityUpdate(item.id, orderId, newValue);
    }
    setEditingQuantity(false);
  };

  const startEditingPrice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrice(true);
    setPriceValue(item.unit_price.toString());
  };

  const savePrice = () => {
    const newValue = parseFloat(priceValue);
    if (!isNaN(newValue) && newValue >= 0) {
      onPriceUpdate(item.id, orderId, newValue);
    }
    setEditingPrice(false);
  };

  // ─── Category icon ────────────────────────────────────────────────────

  const categoryIcon = item.product_category === 'bulk' ? '🔲'
    : item.product_category === 'preroll' ? '🚬'
    : item.product_category === 'packaged' ? '📦'
    : null;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <div className={`border rounded-cult transition-all ${
        isExpanded ? 'border-cult-border-strong bg-cult-surface-raised' : 'border-cult-border bg-cult-surface hover:bg-cult-surface-raised'
      }`}>
        {/* ─── Summary Row (always visible) ──────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Expand icon */}
          <div className="flex-shrink-0 text-cult-text-muted">
            {isExpanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {categoryIcon && <span className="text-xs">{categoryIcon}</span>}
              <span className="text-sm font-semibold text-cult-text-primary truncate" title={item.product_name}>
                {item.product_name}
              </span>
              {item.is_sample && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold uppercase bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult flex-shrink-0">
                  <Gift className="w-2.5 h-2.5" />
                  Sample
                </span>
              )}
            </div>
            {item.strain && (
              <span className="text-xs text-cult-text-muted">{item.strain}</span>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Fulfillment status */}
            {!loadingAssigned && (
              <FulfillmentBadge
                totalAssigned={totalAssigned}
                quantity={item.quantity}
                unit={item.pricing_unit || 'units'}
              />
            )}

            {/* Label progress */}
            {!labelsLoading && stats.total > 0 && (
              <LabelProgress stats={stats} />
            )}

            {/* Qty × Price = Subtotal */}
            <div className="text-right">
              <span className="text-sm font-bold text-cult-text-primary">{item.quantity}</span>
              <span className="text-xs text-cult-text-muted mx-1">×</span>
              <span className="text-sm text-cult-text-secondary">{formatCurrency(Number(item.unit_price))}</span>
            </div>
            <span className="text-sm font-bold text-cult-success w-20 text-right">
              {formatCurrency(Number(item.subtotal))}
            </span>
          </div>
        </div>

        {/* ─── Expanded Detail ───────────────────────────────────────── */}
        {isExpanded && (
          <div className="border-t border-cult-border px-4 py-4 space-y-4 animate-fade-in">
            {/* Row 1: Batch + Quality Grade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">
                  Batch Assignment
                </label>
                <select
                  value={item.batch_id || ''}
                  onChange={(e) => onBatchUpdate(item.id, orderId, e.target.value || null, item.strain)}
                  disabled={!item.strain || batchesLoading}
                  className={`w-full px-3 py-2 text-sm border bg-cult-surface text-cult-text-primary rounded-cult focus:outline-none focus:border-cult-success transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    !item.batch_id && item.strain && batchesLoaded && availableBatches.length > 0
                      ? 'border-cult-warning/50'
                      : 'border-cult-border'
                  }`}
                >
                  <option value="">
                    {!item.strain ? 'No strain selected' : batchesLoading ? 'Loading...' : 'No Batch Assigned'}
                  </option>
                  {availableBatches.map(batch => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_number}
                    </option>
                  ))}
                </select>
                {item.batch_id && batchGradeId && (
                  <div className="mt-1.5">
                    <QualityGradeBadge gradeId={batchGradeId} />
                  </div>
                )}
                {!item.strain && (
                  <p className="text-xs text-cult-danger mt-1">Product missing strain</p>
                )}
                {item.strain && !item.batch_id && batchesLoaded && availableBatches.length > 0 && (
                  <p className="text-xs text-cult-warning mt-1">Assign batch to track inventory</p>
                )}
                {item.strain && batchesLoaded && availableBatches.length === 0 && (
                  <p className="text-xs text-cult-warning mt-1">No batches for {item.strain}</p>
                )}
              </div>

              {/* Inline Qty + Price editing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">
                    Quantity
                  </label>
                  {editingQuantity ? (
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={quantityValue}
                      onChange={(e) => setQuantityValue(e.target.value)}
                      onBlur={saveQuantity}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveQuantity();
                        if (e.key === 'Escape') setEditingQuantity(false);
                      }}
                      className="w-full px-3 py-2 text-sm border border-cult-success bg-cult-surface text-cult-text-primary rounded-cult focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={startEditingQuantity}
                      className="w-full px-3 py-2 text-sm text-left border border-cult-border bg-cult-surface text-cult-text-primary rounded-cult hover:border-cult-border-strong transition-colors flex items-center justify-between"
                    >
                      <span>{item.quantity} <span className="text-cult-text-muted text-xs">{item.pricing_unit || 'units'}</span></span>
                      <Edit2 className="w-3 h-3 text-cult-text-muted" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">
                    Unit Price
                  </label>
                  {editingPrice ? (
                    <input
                      type="number"
                      step="0.01"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      onBlur={savePrice}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') savePrice();
                        if (e.key === 'Escape') setEditingPrice(false);
                      }}
                      className="w-full px-3 py-2 text-sm border border-cult-success bg-cult-surface text-cult-text-primary rounded-cult focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={startEditingPrice}
                      className="w-full px-3 py-2 text-sm text-left border border-cult-border bg-cult-surface text-cult-text-primary rounded-cult hover:border-cult-border-strong transition-colors flex items-center justify-between"
                    >
                      <span>{formatCurrency(Number(item.unit_price))}</span>
                      <Edit2 className="w-3 h-3 text-cult-text-muted" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Assigned packages (if any) */}
            {!loadingAssigned && totalAssigned > 0 && (
              <div>
                <button
                  onClick={() => setShowAssignedPackages(!showAssignedPackages)}
                  className="text-xs text-cult-text-secondary hover:text-cult-text-primary flex items-center gap-1 mb-2 transition-colors"
                >
                  {showAssignedPackages ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  View assigned packages ({totalAssigned} of {item.quantity})
                </button>
                {showAssignedPackages && (
                  <div className="bg-cult-surface border border-cult-border rounded-cult p-3">
                    <AssignedPackagesDisplay
                      orderItemId={item.id}
                      unit={item.pricing_unit || 'units'}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Row 3: Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-cult-border">
              <button
                onClick={() => setShowAssignmentModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-cult transition-all ${
                  isFullyAssigned
                    ? 'bg-cult-success/15 text-cult-success border border-cult-success/30 hover:bg-cult-success/25'
                    : isPartiallyAssigned
                    ? 'bg-cult-warning/15 text-cult-warning border border-cult-warning/30 hover:bg-cult-warning/25'
                    : 'bg-cult-surface-overlay text-cult-text-secondary border border-cult-border hover:border-cult-border-strong'
                }`}
              >
                {isFullyAssigned ? <CheckCircle className="w-3 h-3" /> : isPartiallyAssigned ? <AlertCircle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                {isFullyAssigned ? 'Assigned' : isPartiallyAssigned ? 'Partial' : 'Assign'}
              </button>

              {!labelsLoading && stats.total > 0 && (
                <button
                  onClick={() => setShowLabelPrintModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-cult transition-all ${
                    stats.pending === 0
                      ? 'bg-cult-success/15 text-cult-success border border-cult-success/30 hover:bg-cult-success/25'
                      : stats.printed > 0
                      ? 'bg-cult-warning/15 text-cult-warning border border-cult-warning/30 hover:bg-cult-warning/25'
                      : 'bg-cult-surface-overlay text-cult-text-secondary border border-cult-border hover:border-cult-border-strong'
                  }`}
                >
                  <Printer className="w-3 h-3" />
                  Print ({stats.total})
                </button>
              )}

              {onSampleToggle && (
                <button
                  onClick={() => onSampleToggle(item.id, orderId, !item.is_sample)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-cult transition-all ${
                    item.is_sample
                      ? 'bg-cult-warning/15 text-cult-warning border border-cult-warning/30 hover:bg-cult-warning/25'
                      : 'bg-cult-surface-overlay text-cult-text-secondary border border-cult-border hover:border-cult-border-strong'
                  }`}
                  title={item.is_sample ? 'Remove sample flag' : 'Mark as sample'}
                >
                  <Gift className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={() => onDelete(item.id, orderId)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-cult-danger hover:text-cult-danger/80 bg-cult-danger/10 border border-cult-danger/20 rounded-cult transition-all ml-auto"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      <PackageAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onAssignmentComplete={async () => {
          await refetchAssigned();
          setShowAssignmentModal(false);
        }}
        orderId={orderId}
        orderItemId={item.id}
        productName={item.product_name}
        orderItemQuantity={item.quantity}
        unit={item.pricing_unit || 'units'}
      />

      <OrderItemLabelPrintModal
        isOpen={showLabelPrintModal}
        onClose={() => setShowLabelPrintModal(false)}
        orderItemId={item.id}
        productName={item.product_name}
      />
    </>
  );
}
