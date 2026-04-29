import { useState, useMemo } from 'react';
import { Package, ShoppingCart, ArrowRight, Check, X, AlertTriangle, Loader2, ChevronRight, Layers } from 'lucide-react';
import { useAvailablePackagesForStrain, useBatchAssign } from '../hooks/useBatchAssign';
import { useBatchesForStrain } from '../hooks/useBatchPlanning';
import type { BatchAssignContext, BatchPlanData, OrderLineItem, Urgency } from '../types';
import type { AvailablePackage } from '@/features/orders/services';
import { formatDateShort, formatWeight } from '@/shared/utils/format';
import { BatchCOAStatusBadge } from '@/features/batches/components/BatchCOAStatusBadge';

// ─── Sub-components ──────────────────────────────────────────────────────────

function UrgencyDot({ urgency }: { urgency: Urgency }) {
  const colors: Record<Urgency, string> = {
    overdue: 'bg-cult-danger',
    urgent: 'bg-cult-warning',
    soon: 'bg-cult-warning',
    normal: 'bg-cult-success',
    no_date: 'bg-gray-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[urgency]}`} />;
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface BatchAssignPanelProps {
  context: BatchAssignContext;
  onClose: () => void;
  onCommitComplete?: () => void;
}

export function BatchAssignPanel({ context, onClose, onCommitComplete }: BatchAssignPanelProps) {
  const { strainId, strainName, formatLabel, productCategory, orderItems } = context;

  // Fetch available packages for this strain + category
  const { packages, loading: packagesLoading, refetch: refetchPackages } = useAvailablePackagesForStrain(
    strainName,
    productCategory
  );

  // Fetch raw batches for this strain (new unified source)
  const { batches, loading: batchesLoading, refetch: refetchBatches } = useBatchesForStrain(strainId);

  // Batch assign state machine
  const ba = useBatchAssign();

  // Sort orders FIFO by delivery date (decision #5)
  const sortedOrders = useMemo(() => {
    return [...orderItems].sort((a, b) => {
      // Orders with delivery dates come first
      const dateA = a.requested_delivery_date || a.scheduled_delivery_date;
      const dateB = b.requested_delivery_date || b.scheduled_delivery_date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, [orderItems]);

  // ─── Assign Step ─────────────────────────────────────────────────────────

  if (ba.step === 'assign') {
    return (
      <div className="bg-cult-black/80 border border-cult-border/50 rounded-lg mx-4 my-2">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cult-border/30">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cult-info" />
            <span className="text-sm font-medium text-white">
              Batch Assign — {strainName} · {formatLabel}
            </span>
            {ba.totalDraftCount > 0 && (
              <span className="text-xs bg-cult-info-muted text-cult-info px-2 py-0.5 rounded-full">
                {ba.totalDraftCount} assignment{ba.totalDraftCount !== 1 ? 's' : ''} drafted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ba.totalDraftCount > 0 && (
              <button
                onClick={ba.goToPreview}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-cult-info hover:bg-cult-info/80 text-white rounded transition-colors"
              >
                Review & Confirm <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-cult-border/30" style={{ minHeight: '280px' }}>
          {/* LEFT: Available Packages */}
          <div className="p-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Available Packages
            </div>

            {packagesLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading inventory…
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No available packages for this strain.
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {packages.map(pkg => {
                  const remaining = ba.getRemainingPackageQty(pkg.package_id, pkg.available_qty);
                  const fullyDrafted = remaining <= 0;
                  return (
                    <PackageRow
                      key={pkg.id}
                      pkg={pkg}
                      remainingQty={remaining}
                      fullyDrafted={fullyDrafted}
                      orders={sortedOrders}
                      onAssign={(orderItem, qty) => {
                        ba.addDraft({
                          packageId: pkg.package_id,
                          packageLabel: pkg.package_id,
                          orderItemId: orderItem.order_item_id,
                          orderId: orderItem.order_id,
                          orderNumber: orderItem.order_number,
                          customerName: orderItem.customer_name,
                          quantityToAssign: qty,
                          packageAvailableQty: pkg.available_qty,
                          orderItemRemainingQty: orderItem.quantity,
                        });
                      }}
                      getRemainingOrderItemQty={ba.getRemainingOrderItemQty}
                    />
                  );
                })}
              </div>
            )}

            {/* Raw Batches section */}
            <div className="text-xs uppercase tracking-wider text-gray-500 mt-4 mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Raw Batches
            </div>

            {batchesLoading ? (
              <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading batches…
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-xs">
                No raw batches for this strain.
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {batches.map(batch => {
                  const remainingG = ba.getRemainingBatchCapacity(batch.batch_id, batch.total_available_g);
                  const fullyDrafted = remainingG <= 0;
                  return (
                    <BatchRow
                      key={batch.batch_id}
                      batch={batch}
                      remainingG={remainingG}
                      fullyDrafted={fullyDrafted}
                      orders={sortedOrders}
                      onAllocate={(orderItem, weightG, stage) => {
                        ba.addBatchDraft({
                          batchId: batch.batch_id,
                          batchNumber: batch.batch_number,
                          orderItemId: orderItem.order_item_id,
                          orderId: orderItem.order_id,
                          orderNumber: orderItem.order_number,
                          customerName: orderItem.customer_name,
                          allocationStage: stage,
                          weightGrams: weightG,
                          batchAvailableG: batch.total_available_g,
                          orderItemRemainingG: orderItem.line_demand_g,
                        });
                      }}
                      getRemainingOrderItemGrams={ba.getRemainingOrderItemGrams}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Orders needing this strain+format (FIFO) */}
          <div className="p-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> Orders — FIFO by Delivery Date
            </div>

            {sortedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No orders need this product.</div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sortedOrders.map(order => {
                  const needed = ba.getRemainingOrderItemQty(order.order_item_id, order.quantity);
                  const partiallyDrafted = needed < order.quantity && needed > 0;
                  const fullyDrafted = needed <= 0;
                  return (
                    <div
                      key={order.order_item_id}
                      className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                        fullyDrafted
                          ? 'bg-cult-success-muted border border-cult-success/20'
                          : partiallyDrafted
                          ? 'bg-cult-info-muted border border-cult-info/20'
                          : 'bg-cult-surface/30 border border-transparent'
                      }`}
                    >
                      <UrgencyDot urgency={order.urgency} />
                      <span className="text-gray-400 w-16 text-xs">{order.order_number}</span>
                      <span className="text-gray-300 w-32 truncate text-xs">{order.customer_name}</span>
                      <span className="text-gray-400 w-20 text-xs">{formatDateShort(order.requested_delivery_date)}</span>
                      <span className="text-right flex-1 text-xs">
                        {fullyDrafted ? (
                          <span className="text-cult-success flex items-center justify-end gap-1">
                            <Check className="w-3 h-3" /> Drafted
                          </span>
                        ) : (
                          <span className={partiallyDrafted ? 'text-cult-info' : 'text-gray-300'}>
                            {needed} of {order.quantity} needed
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drafted assignments summary bar */}
        {ba.totalDraftCount > 0 && (
          <div className="border-t border-cult-border/30 px-4 py-2">
            <div className="flex flex-wrap gap-1">
              {ba.drafts.map(d => (
                <span
                  key={d.draftId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-cult-info-muted text-cult-info rounded text-xs border border-cult-info/20"
                >
                  <Package className="w-3 h-3" />
                  {d.packageLabel.slice(-8)} → {d.orderNumber} ({d.quantityToAssign})
                  <button
                    onClick={() => ba.removeDraft(d.draftId)}
                    className="hover:text-cult-danger ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {ba.batchDrafts.map(d => (
                <span
                  key={d.draftId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded text-xs border border-indigo-500/20"
                >
                  <Layers className="w-3 h-3" />
                  {d.batchNumber} → {d.orderNumber} ({formatWeight(d.weightGrams)})
                  <button
                    onClick={() => ba.removeBatchDraft(d.draftId)}
                    className="hover:text-cult-danger ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Preview Step ────────────────────────────────────────────────────────

  if (ba.step === 'preview') {
    return (
      <div className="bg-cult-black/80 border border-cult-border/50 rounded-lg mx-4 my-2">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cult-border/30">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cult-success" />
            <span className="text-sm font-medium text-white">
              Review Assignments — {strainName} · {formatLabel}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3">
          {/* Summary stats */}
          <div className={`grid gap-4 mb-4 ${ba.preview.totalBatchAllocations > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="bg-cult-surface/40 rounded p-3 text-center">
              <div className="text-lg font-bold text-white">{ba.preview.totalOrderItemsTouched}</div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Orders Filled</div>
            </div>
            {ba.preview.totalUnitsAssigned > 0 && (
              <div className="bg-cult-surface/40 rounded p-3 text-center">
                <div className="text-lg font-bold text-white">{ba.preview.totalUnitsAssigned}</div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Pkg Units</div>
              </div>
            )}
            {ba.preview.totalPackagesUsed > 0 && (
              <div className="bg-cult-surface/40 rounded p-3 text-center">
                <div className="text-lg font-bold text-white">{ba.preview.totalPackagesUsed}</div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Packages Used</div>
              </div>
            )}
            {ba.preview.totalBatchAllocations > 0 && (
              <div className="bg-cult-surface/40 rounded p-3 text-center">
                <div className="text-lg font-bold text-white">{formatWeight(ba.preview.totalBatchWeightG)}</div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Batch Weight</div>
              </div>
            )}
          </div>

          {/* Detailed list — package assignments */}
          <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
            {ba.drafts.map(d => (
              <div
                key={d.draftId}
                className="flex items-center gap-3 px-3 py-2 bg-cult-surface/20 rounded text-sm text-gray-300"
              >
                <Package className="w-3 h-3 text-cult-info/60" />
                <span className="font-mono text-xs">{d.packageLabel.slice(-12)}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span>{d.orderNumber}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">{d.customerName}</span>
                <span className="ml-auto font-medium text-white">{d.quantityToAssign} units</span>
              </div>
            ))}
            {ba.batchDrafts.map(d => (
              <div
                key={d.draftId}
                className="flex items-center gap-3 px-3 py-2 bg-indigo-500/5 rounded text-sm text-gray-300"
              >
                <Layers className="w-3 h-3 text-indigo-400/60" />
                <span className="font-mono text-xs">{d.batchNumber}</span>
                <span className="text-xs text-gray-500">({d.allocationStage})</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span>{d.orderNumber}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">{d.customerName}</span>
                <span className="ml-auto font-medium text-white">{formatWeight(d.weightGrams)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-cult-border/30">
          <button
            onClick={ba.goBackToAssign}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← Back to Editing
          </button>
          <button
            onClick={ba.commitAll}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-cult-success hover:bg-cult-success/80 text-white rounded transition-colors"
          >
            <Check className="w-4 h-4" /> Confirm {ba.totalDraftCount} Assignment{ba.totalDraftCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  }

  // ─── Committing Step ─────────────────────────────────────────────────────

  if (ba.step === 'committing') {
    const pct = ba.commitProgress.total > 0
      ? Math.round((ba.commitProgress.done / ba.commitProgress.total) * 100)
      : 0;

    return (
      <div className="bg-cult-black/80 border border-cult-border/50 rounded-lg mx-4 my-2">
        <div className="px-4 py-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-cult-info mx-auto mb-3" />
          <div className="text-sm text-gray-300 mb-2">
            Committing assignments… {ba.commitProgress.done}/{ba.commitProgress.total}
          </div>
          <div className="w-48 mx-auto bg-cult-surface rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-cult-info transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Done Step ───────────────────────────────────────────────────────────

  if (ba.step === 'done') {
    const hasErrors = ba.commitErrors.length > 0;
    return (
      <div className="bg-cult-black/80 border border-cult-border/50 rounded-lg mx-4 my-2">
        <div className="px-4 py-6 text-center">
          {hasErrors ? (
            <AlertTriangle className="w-6 h-6 text-cult-warning mx-auto mb-3" />
          ) : (
            <Check className="w-6 h-6 text-cult-success mx-auto mb-3" />
          )}
          <div className="text-sm text-gray-300 mb-2">
            {hasErrors
              ? `Completed with ${ba.commitErrors.length} error${ba.commitErrors.length !== 1 ? 's' : ''}`
              : `All ${ba.commitProgress.total} assignments completed successfully!`}
          </div>
          {hasErrors && (
            <div className="max-w-md mx-auto text-left mb-3 space-y-1">
              {ba.commitErrors.map((e, i) => (
                <div key={i} className="text-xs text-cult-danger bg-cult-danger-muted px-2 py-1 rounded">{e}</div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              ba.reset();
              refetchPackages();
              refetchBatches();
              onCommitComplete?.();
            }}
            className="px-4 py-2 text-sm font-medium bg-cult-surface hover:bg-cult-border text-white rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Package Row (with quick-assign to orders) ───────────────────────────────

interface PackageRowProps {
  pkg: AvailablePackage;
  remainingQty: number;
  fullyDrafted: boolean;
  orders: OrderLineItem[];
  onAssign: (orderItem: OrderLineItem, qty: number) => void;
  getRemainingOrderItemQty: (orderItemId: string, originalNeeded: number) => number;
}

function PackageRow({ pkg, remainingQty, fullyDrafted, orders, onAssign, getRemainingOrderItemQty }: PackageRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [assignQtys, setAssignQtys] = useState<Record<string, number>>({});

  return (
    <div className={`rounded border ${fullyDrafted ? 'border-cult-success/20 bg-cult-success/5' : 'border-cult-border/20 bg-cult-surface/20'}`}>
      {/* Package header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-cult-surface/30"
        onClick={() => !fullyDrafted && setExpanded(!expanded)}
      >
        {!fullyDrafted && (
          <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
        {fullyDrafted && <Check className="w-3 h-3 text-cult-success" />}
        <span className="font-mono text-xs text-gray-300">{pkg.package_id.slice(-10)}</span>
        <span className="text-xs text-gray-500">{pkg.batch_number || pkg.batch || ''}</span>
        <span className="ml-auto text-xs">
          {fullyDrafted ? (
            <span className="text-cult-success">Fully drafted</span>
          ) : (
            <span className="text-gray-300">{remainingQty} avail</span>
          )}
        </span>
        {pkg.room && <span className="text-xs text-gray-500 ml-1">{pkg.room}</span>}
      </div>

      {/* Expanded: assign to orders */}
      {expanded && !fullyDrafted && (
        <div className="border-t border-cult-border/20 px-3 py-2 space-y-1">
          {orders.map(order => {
            const orderRemaining = getRemainingOrderItemQty(order.order_item_id, order.quantity);
            if (orderRemaining <= 0) return null;

            const maxAssignable = Math.min(remainingQty, orderRemaining);
            const currentQty = assignQtys[order.order_item_id] ?? Math.min(maxAssignable, orderRemaining);

            return (
              <div key={order.order_item_id} className="flex items-center gap-2 text-xs">
                <UrgencyDot urgency={order.urgency} />
                <span className="text-gray-400 w-14">{order.order_number}</span>
                <span className="text-gray-500 w-24 truncate">{order.customer_name}</span>
                <span className="text-gray-500 w-14">{formatDateShort(order.requested_delivery_date)}</span>
                <span className="text-gray-500">needs {orderRemaining}</span>
                <input
                  type="number"
                  min={1}
                  max={maxAssignable}
                  value={currentQty}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(maxAssignable, parseInt(e.target.value) || 1));
                    setAssignQtys(prev => ({ ...prev, [order.order_item_id]: v }));
                  }}
                  className="w-14 px-1 py-0.5 bg-cult-surface border border-cult-border/30 rounded text-xs text-white text-center"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(order, currentQty);
                    // Clear the qty input for this order
                    setAssignQtys(prev => {
                      const next = { ...prev };
                      delete next[order.order_item_id];
                      return next;
                    });
                  }}
                  disabled={maxAssignable <= 0}
                  className="px-2 py-0.5 bg-cult-info hover:bg-cult-info/80 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Assign
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Batch Row (with quick-allocate to orders, weight-based) ──────────────────

interface BatchRowProps {
  batch: BatchPlanData;
  remainingG: number;
  fullyDrafted: boolean;
  orders: OrderLineItem[];
  onAllocate: (orderItem: OrderLineItem, weightG: number, stage: string) => void;
  getRemainingOrderItemGrams: (orderItemId: string, originalNeededG: number, weightPerUnitG: number) => number;
}

/** Auto-detect best allocation stage from batch inventory */
function detectBestStage(batch: BatchPlanData): string {
  if (batch.packaged_g > 0) return 'packaged';
  if (batch.bulk_g > 0) return 'bulk';
  if (batch.bucked_g > 0) return 'bucked';
  if (batch.binned_g > 0) return 'binned';
  if (batch.trim_g > 0) return 'trim';
  return 'bulk';
}

function batchStageLabel(batch: BatchPlanData): string {
  const parts: string[] = [];
  if (batch.packaged_g > 0) parts.push(`${formatWeight(batch.packaged_g)} pkgd`);
  if (batch.bulk_g > 0) parts.push(`${formatWeight(batch.bulk_g)} bulk`);
  if (batch.bucked_g > 0) parts.push(`${formatWeight(batch.bucked_g)} bucked`);
  if (batch.binned_g > 0) parts.push(`${formatWeight(batch.binned_g)} binned`);
  if (batch.trim_g > 0) parts.push(`${formatWeight(batch.trim_g)} trim`);
  return parts.join(' · ') || 'empty';
}

function BatchRow({ batch, remainingG, fullyDrafted, orders, onAllocate, getRemainingOrderItemGrams }: BatchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [allocWeights, setAllocWeights] = useState<Record<string, number>>({});

  const bestStage = detectBestStage(batch);
  const coaBlocked = batch.coa_status !== null && batch.coa_status !== 'available';

  return (
    <div className={`rounded border ${
      fullyDrafted
        ? 'border-cult-success/20 bg-cult-success/5'
        : coaBlocked
        ? 'border-cult-warning/20 bg-cult-warning/5'
        : 'border-indigo-500/10 bg-indigo-500/5'
    }`}>
      {/* Batch header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-indigo-500/10"
        onClick={() => !fullyDrafted && !coaBlocked && setExpanded(!expanded)}
      >
        {!fullyDrafted && !coaBlocked && (
          <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
        {fullyDrafted && <Check className="w-3 h-3 text-cult-success" />}
        {coaBlocked && !fullyDrafted && <AlertTriangle className="w-3 h-3 text-cult-warning" />}
        <span className="font-mono text-xs text-gray-300">{batch.batch_number}</span>
        <span className="text-xs text-gray-500">{batchStageLabel(batch)}</span>
        {batch.coa_status && <BatchCOAStatusBadge status={batch.coa_status} size="xs" />}
        <span className="ml-auto text-xs">
          {fullyDrafted ? (
            <span className="text-cult-success">Fully drafted</span>
          ) : coaBlocked ? (
            <span className="text-cult-warning">COA required</span>
          ) : (
            <span className="text-gray-300">{formatWeight(remainingG)} avail</span>
          )}
        </span>
      </div>

      {/* Expanded: allocate weight to orders */}
      {expanded && !fullyDrafted && (
        <div className="border-t border-indigo-500/10 px-3 py-2 space-y-1">
          {orders.map(order => {
            const orderRemainingG = getRemainingOrderItemGrams(
              order.order_item_id,
              order.line_demand_g,
              order.weight_per_unit_g
            );
            if (orderRemainingG <= 0) return null;

            const maxAllocG = Math.min(remainingG, orderRemainingG);
            const currentG = allocWeights[order.order_item_id] ?? Math.round(Math.min(maxAllocG, orderRemainingG));

            return (
              <div key={order.order_item_id} className="flex items-center gap-2 text-xs">
                <UrgencyDot urgency={order.urgency} />
                <span className="text-gray-400 w-14">{order.order_number}</span>
                <span className="text-gray-500 w-24 truncate">{order.customer_name}</span>
                <span className="text-gray-500 w-14">{formatDateShort(order.requested_delivery_date)}</span>
                <span className="text-gray-500">needs {formatWeight(orderRemainingG)}</span>
                <input
                  type="number"
                  min={1}
                  max={Math.round(maxAllocG)}
                  value={currentG}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(Math.round(maxAllocG), parseInt(e.target.value) || 1));
                    setAllocWeights(prev => ({ ...prev, [order.order_item_id]: v }));
                  }}
                  className="w-16 px-1 py-0.5 bg-cult-surface border border-cult-border/30 rounded text-xs text-white text-center"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-gray-500">g</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAllocate(order, currentG, bestStage);
                    setAllocWeights(prev => {
                      const next = { ...prev };
                      delete next[order.order_item_id];
                      return next;
                    });
                  }}
                  disabled={maxAllocG <= 0}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Allocate
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
