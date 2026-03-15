import { useState, useMemo } from 'react';
import { Package, ShoppingCart, ArrowRight, Check, X, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { useAvailablePackagesForStrain, useBatchAssign } from '../hooks/useBatchAssign';
import type { BatchAssignContext, OrderLineItem, Urgency } from '../types';
import type { AvailablePackage } from '@/features/orders/services';

// ─── Sub-components ──────────────────────────────────────────────────────────

function UrgencyDot({ urgency }: { urgency: Urgency }) {
  const colors: Record<Urgency, string> = {
    overdue: 'bg-red-400',
    urgent: 'bg-amber-400',
    soon: 'bg-yellow-400',
    normal: 'bg-green-400',
    no_date: 'bg-gray-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[urgency]}`} />;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface BatchAssignPanelProps {
  context: BatchAssignContext;
  onClose: () => void;
  onCommitComplete?: () => void;
}

export function BatchAssignPanel({ context, onClose, onCommitComplete }: BatchAssignPanelProps) {
  const { strainName, formatLabel, productCategory, orderItems } = context;

  // Fetch available packages for this strain + category
  const { packages, loading: packagesLoading, refetch: refetchPackages } = useAvailablePackagesForStrain(
    strainName,
    productCategory
  );

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
      <div className="bg-cult-black/80 border border-cult-medium-gray/50 rounded-lg mx-4 my-2">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cult-medium-gray/30">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">
              Batch Assign — {strainName} · {formatLabel}
            </span>
            {ba.drafts.length > 0 && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                {ba.drafts.length} assignment{ba.drafts.length !== 1 ? 's' : ''} drafted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ba.drafts.length > 0 && (
              <button
                onClick={ba.goToPreview}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
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
        <div className="grid grid-cols-2 divide-x divide-cult-medium-gray/30" style={{ minHeight: '280px' }}>
          {/* LEFT: Available Packages */}
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
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
              <div className="space-y-1 max-h-64 overflow-y-auto">
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
          </div>

          {/* RIGHT: Orders needing this strain+format (FIFO) */}
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
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
                          ? 'bg-green-500/10 border border-green-500/20'
                          : partiallyDrafted
                          ? 'bg-blue-500/10 border border-blue-500/20'
                          : 'bg-cult-dark-gray/30 border border-transparent'
                      }`}
                    >
                      <UrgencyDot urgency={order.urgency} />
                      <span className="text-gray-400 w-16 text-xs">{order.order_number}</span>
                      <span className="text-gray-300 w-32 truncate text-xs">{order.customer_name}</span>
                      <span className="text-gray-400 w-20 text-xs">{formatDate(order.requested_delivery_date)}</span>
                      <span className="text-right flex-1 text-xs">
                        {fullyDrafted ? (
                          <span className="text-green-400 flex items-center justify-end gap-1">
                            <Check className="w-3 h-3" /> Drafted
                          </span>
                        ) : (
                          <span className={partiallyDrafted ? 'text-blue-300' : 'text-gray-300'}>
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
        {ba.drafts.length > 0 && (
          <div className="border-t border-cult-medium-gray/30 px-4 py-2">
            <div className="flex flex-wrap gap-1">
              {ba.drafts.map(d => (
                <span
                  key={d.draftId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-300 rounded text-[11px] border border-blue-500/20"
                >
                  {d.packageLabel.slice(-8)} → {d.orderNumber} ({d.quantityToAssign})
                  <button
                    onClick={() => ba.removeDraft(d.draftId)}
                    className="hover:text-red-400 ml-1"
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
      <div className="bg-cult-black/80 border border-cult-medium-gray/50 rounded-lg mx-4 my-2">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cult-medium-gray/30">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
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
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-cult-dark-gray/40 rounded p-3 text-center">
              <div className="text-lg font-bold text-white">{ba.preview.totalUnitsAssigned}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Units Assigned</div>
            </div>
            <div className="bg-cult-dark-gray/40 rounded p-3 text-center">
              <div className="text-lg font-bold text-white">{ba.preview.totalPackagesUsed}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Packages Used</div>
            </div>
            <div className="bg-cult-dark-gray/40 rounded p-3 text-center">
              <div className="text-lg font-bold text-white">{ba.preview.totalOrderItemsTouched}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Orders Filled</div>
            </div>
          </div>

          {/* Detailed list */}
          <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
            {ba.drafts.map(d => (
              <div
                key={d.draftId}
                className="flex items-center gap-3 px-3 py-2 bg-cult-dark-gray/20 rounded text-sm text-gray-300"
              >
                <Package className="w-3 h-3 text-gray-500" />
                <span className="font-mono text-xs">{d.packageLabel.slice(-12)}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span>{d.orderNumber}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">{d.customerName}</span>
                <span className="ml-auto font-medium text-white">{d.quantityToAssign} units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-cult-medium-gray/30">
          <button
            onClick={ba.goBackToAssign}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← Back to Editing
          </button>
          <button
            onClick={ba.commitAll}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
          >
            <Check className="w-4 h-4" /> Confirm {ba.drafts.length} Assignment{ba.drafts.length !== 1 ? 's' : ''}
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
      <div className="bg-cult-black/80 border border-cult-medium-gray/50 rounded-lg mx-4 my-2">
        <div className="px-4 py-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-3" />
          <div className="text-sm text-gray-300 mb-2">
            Assigning packages… {ba.commitProgress.done}/{ba.commitProgress.total}
          </div>
          <div className="w-48 mx-auto bg-cult-dark-gray rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
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
      <div className="bg-cult-black/80 border border-cult-medium-gray/50 rounded-lg mx-4 my-2">
        <div className="px-4 py-6 text-center">
          {hasErrors ? (
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-3" />
          ) : (
            <Check className="w-6 h-6 text-green-400 mx-auto mb-3" />
          )}
          <div className="text-sm text-gray-300 mb-2">
            {hasErrors
              ? `Completed with ${ba.commitErrors.length} error${ba.commitErrors.length !== 1 ? 's' : ''}`
              : `All ${ba.commitProgress.total} assignments completed successfully!`}
          </div>
          {hasErrors && (
            <div className="max-w-md mx-auto text-left mb-3 space-y-1">
              {ba.commitErrors.map((e, i) => (
                <div key={i} className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">{e}</div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              ba.reset();
              refetchPackages();
              onCommitComplete?.();
            }}
            className="px-4 py-2 text-sm font-medium bg-cult-dark-gray hover:bg-cult-medium-gray text-white rounded transition-colors"
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
    <div className={`rounded border ${fullyDrafted ? 'border-green-500/20 bg-green-500/5' : 'border-cult-medium-gray/20 bg-cult-dark-gray/20'}`}>
      {/* Package header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-cult-dark-gray/30"
        onClick={() => !fullyDrafted && setExpanded(!expanded)}
      >
        {!fullyDrafted && (
          <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
        {fullyDrafted && <Check className="w-3 h-3 text-green-400" />}
        <span className="font-mono text-xs text-gray-300">{pkg.package_id.slice(-10)}</span>
        <span className="text-[10px] text-gray-500">{pkg.batch_number || pkg.batch || ''}</span>
        <span className="ml-auto text-xs">
          {fullyDrafted ? (
            <span className="text-green-400">Fully drafted</span>
          ) : (
            <span className="text-gray-300">{remainingQty} avail</span>
          )}
        </span>
        {pkg.room && <span className="text-[10px] text-gray-500 ml-1">{pkg.room}</span>}
      </div>

      {/* Expanded: assign to orders */}
      {expanded && !fullyDrafted && (
        <div className="border-t border-cult-medium-gray/20 px-3 py-2 space-y-1">
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
                <span className="text-gray-500 w-14">{formatDate(order.requested_delivery_date)}</span>
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
                  className="w-14 px-1 py-0.5 bg-cult-dark-gray border border-cult-medium-gray/30 rounded text-xs text-white text-center"
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
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-[10px] font-medium transition-colors"
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
