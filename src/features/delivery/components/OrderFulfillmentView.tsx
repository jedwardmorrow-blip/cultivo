import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, ChevronDown, ChevronRight, Package, AlertTriangle,
  RefreshCw, CheckCircle2, Clock, Send, Loader2, X,
} from 'lucide-react';
import { HubShell } from '@/features/hub/components/HubShell';
import { BaseModal } from '@/shared/components/BaseModal';
import { PackageAssignmentModal } from '@/features/orders/components/PackageAssignmentModal';
import { supabase } from '@/lib/supabase';
import {
  useOrderFulfillment,
  fetchStrainInventory,
  fetchOrderDispatchItems,
  getNextAction,
  getProcessingStageForCategory,
} from '../hooks/useOrderFulfillment';
import type {
  OrderGroup, OrderLineItem, InventoryPackage, DispatchItemStatus,
} from '../hooks/useOrderFulfillment';
import {
  PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS, STAGE_TREATMENTS,
} from '../hooks/useProductionDispatch';
import type { ProcessingStage, TreatmentType } from '../hooks/useProductionDispatch';

// ─── Shared helpers ────────────────────────────���────────────────────────────

const URGENCY_STYLES: Record<string, string> = {
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
  urgent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  normal: 'bg-green-500/20 text-green-400 border-green-500/30',
  no_date: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};
const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue', urgent: 'Urgent', soon: 'Soon', normal: 'On Track', no_date: 'No Date',
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${URGENCY_STYLES[urgency] || URGENCY_STYLES.no_date}`}>
      {URGENCY_LABELS[urgency] ?? urgency}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

// ─── Screen 2: Line Item Row ────────────────────────────────────────────────

function LineItemRow({
  item,
  dispatchItems,
  onClickItem,
}: {
  item: OrderLineItem;
  dispatchItems: DispatchItemStatus[];
  onClickItem: () => void;
}) {
  const isFullyAssigned = item.units_remaining === 0;
  const fillPct = item.quantity > 0 ? Math.round((item.units_assigned / item.quantity) * 100) : 0;

  // Count active dispatch items for this line item
  const activeDispatches = dispatchItems.filter(d => d.order_item_id === item.order_item_id);
  const inProgress = activeDispatches.filter(d => d.status === 'in_progress').length;
  const queued = activeDispatches.filter(d => d.status === 'pending').length;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClickItem(); }}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
        isFullyAssigned
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-cult-dark-gray bg-cult-mid-gray/10 hover:border-cult-accent/40 hover:bg-cult-accent/5 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cult-text-primary">{item.strain_name}</span>
            <span className="text-xs text-cult-text-muted">{item.format_label}</span>
          </div>

          {/* Status chips */}
          <div className="flex items-center gap-2 mt-1.5">
            {isFullyAssigned ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Assigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Clock className="w-3 h-3" />
                Needs Work
              </span>
            )}
            {inProgress > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                {inProgress} processing
              </span>
            )}
            {queued > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {queued} queued
              </span>
            )}
          </div>
        </div>

        {/* Quantity + progress */}
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-cult-text-primary">
            {item.units_assigned} <span className="text-cult-text-muted text-xs">/ {item.quantity}</span>
          </div>
          <div className="text-xs text-cult-text-muted">assigned</div>
        </div>

        <ChevronRight className="w-4 h-4 text-cult-text-muted shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 rounded-full bg-cult-dark-gray overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFullyAssigned ? 'bg-green-500' : 'bg-cult-accent'}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </button>
  );
}

// ─── Screen 1: Order Card ───────────────────────────────────────────────────

function OrderCard({
  order,
  onSelectLineItem,
}: {
  order: OrderGroup;
  onSelectLineItem: (item: OrderLineItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItemStatus[]>([]);

  // Fetch dispatch items when expanded
  useEffect(() => {
    if (!expanded) return;
    const ids = order.line_items.map(i => i.order_item_id);
    fetchOrderDispatchItems(ids)
      .then(setDispatchItems)
      .catch(() => setDispatchItems([]));
  }, [expanded, order.line_items]);

  const allAssigned = order.processing_items === 0;
  const progressPct = order.total_items > 0
    ? Math.round((order.assigned_items / order.total_items) * 100)
    : 0;

  return (
    <div className={`rounded-xl border transition-all ${
      allAssigned
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-cult-dark-gray bg-cult-mid-gray/10'
    }`}>
      {/* Order header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-cult-text-primary">{order.customer_name}</span>
            <UrgencyBadge urgency={order.urgency} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-cult-text-muted">
            <span className="font-mono">{order.order_number}</span>
            {order.scheduled_delivery_date && (
              <span>Deliver {formatDate(order.scheduled_delivery_date)}</span>
            )}
            {!order.scheduled_delivery_date && order.requested_delivery_date && (
              <span>Requested {formatDate(order.requested_delivery_date)}</span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-sm font-semibold text-cult-text-primary">
              {order.assigned_items} <span className="text-cult-text-muted text-xs">/ {order.total_items}</span>
            </div>
            <div className="text-xs text-cult-text-muted">items ready</div>
          </div>

          {/* Mini progress ring */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
                className="text-cult-dark-gray" />
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                strokeDasharray={`${progressPct * 0.88} 88`}
                strokeLinecap="round"
                className={allAssigned ? 'text-green-500' : 'text-cult-accent'} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-cult-text-primary">
              {progressPct}%
            </span>
          </div>

          {expanded
            ? <ChevronDown className="w-5 h-5 text-cult-text-muted" />
            : <ChevronRight className="w-5 h-5 text-cult-text-muted" />
          }
        </div>
      </button>

      {/* Screen 2: Expanded line items */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2 border-t border-cult-dark-gray/50 pt-3">
          {order.line_items.map(item => (
            <LineItemRow
              key={item.order_item_id}
              item={item}
              dispatchItems={dispatchItems}
              onClickItem={() => onSelectLineItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Screen 3: Package Inventory Modal ────────���─────────────────────────────

function PackageInventoryModal({
  isOpen,
  onClose,
  lineItem,
  onReload,
}: {
  isOpen: boolean;
  onClose: () => void;
  lineItem: OrderLineItem | null;
  onReload: () => void;
}) {
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    if (!lineItem) return;
    setLoadingPkgs(true);
    setPkgError(null);
    try {
      const data = await fetchStrainInventory(lineItem.strain_name);
      setPackages(data);
    } catch (err: any) {
      setPkgError(err.message || 'Failed to load inventory');
    } finally {
      setLoadingPkgs(false);
    }
  }, [lineItem]);

  useEffect(() => {
    if (isOpen && lineItem) {
      loadPackages();
    }
  }, [isOpen, lineItem, loadPackages]);

  async function handleSendToProcessing(pkg: InventoryPackage) {
    if (!lineItem) return;

    const processingStage = getProcessingStageForCategory(pkg.category);
    if (!processingStage) return;

    // For package_to_order, use the assign modal instead
    if (processingStage === 'package_to_order') {
      setAssignBatchId(pkg.batch_id);
      setShowAssignModal(true);
      return;
    }

    // Determine default treatment
    const treatments = STAGE_TREATMENTS[processingStage as ProcessingStage];
    if (!treatments || treatments.length === 0) return;
    const defaultTreatment = treatments[0];

    setSendingId(pkg.id);
    try {
      const { error } = await supabase.from('production_dispatch_items').insert({
        batch_registry_id: pkg.batch_id,
        order_item_id: processingStage === 'package_to_order' ? lineItem.order_item_id : null,
        processing_stage: processingStage,
        treatment_type: defaultTreatment,
        quantity_g: pkg.on_hand_qty,
        priority: 50,
        status: 'pending',
      });
      if (error) throw error;

      setSendSuccess(pkg.id);
      setTimeout(() => setSendSuccess(null), 2000);

      // Refresh the package list
      await loadPackages();
      onReload();
    } catch (err: any) {
      console.error('Failed to dispatch:', err);
      setPkgError(err.message || 'Failed to send to processing');
    } finally {
      setSendingId(null);
    }
  }

  if (!lineItem) return null;

  // Group packages by stage
  const grouped = new Map<string, InventoryPackage[]>();
  for (const pkg of packages) {
    const existing = grouped.get(pkg.stage_label) || [];
    existing.push(pkg);
    grouped.set(pkg.stage_label, existing);
  }

  return (
    <>
      <BaseModal
        isOpen={isOpen && !showAssignModal}
        onClose={onClose}
        title={`${lineItem.strain_name} — ${lineItem.format_label}`}
        icon={<Package className="w-5 h-5 text-cult-accent" />}
        maxWidth="3xl"
      >
        {/* Line item context bar */}
        <div className="mb-4 p-3 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/10 flex items-center justify-between">
          <div>
            <span className="text-sm text-cult-text-muted">Order </span>
            <span className="text-sm font-mono text-cult-text-primary">{lineItem.order_number}</span>
            <span className="text-sm text-cult-text-muted"> — {lineItem.customer_name}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-cult-text-primary">{lineItem.units_remaining}</span>
            <span className="text-cult-text-muted"> of {lineItem.quantity} still needed</span>
          </div>
        </div>

        {loadingPkgs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cult-accent" />
          </div>
        ) : pkgError ? (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {pkgError}
            <button onClick={loadPackages} className="ml-auto underline text-xs">Retry</button>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
            <Package className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No inventory found for {lineItem.strain_name}</p>
            <p className="text-xs mt-1">This strain has no available packages in any stage.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(grouped.entries()).map(([stageLabel, pkgs]) => (
              <div key={stageLabel}>
                <h3 className="text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    stageLabel.includes('Bin') ? 'bg-indigo-400'
                    : stageLabel.includes('Bucked') ? 'bg-blue-400'
                    : stageLabel.includes('Bulk') || stageLabel.includes('bulk') ? 'bg-cyan-400'
                    : stageLabel.includes('Packaged') ? 'bg-green-400'
                    : 'bg-gray-400'
                  }`} />
                  {stageLabel}
                  <span className="text-cult-text-faint">({pkgs.length})</span>
                </h3>

                <div className="space-y-1.5">
                  {pkgs.map(pkg => {
                    const action = getNextAction(pkg.category);
                    const isSending = sendingId === pkg.id;
                    const justSent = sendSuccess === pkg.id;

                    return (
                      <div
                        key={pkg.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-cult-text-primary font-mono">
                              {pkg.package_id.substring(0, 8)}
                            </span>
                            <span className="text-xs text-cult-text-muted">{pkg.batch_number}</span>
                            {pkg.room && (
                              <span className="text-xs text-cult-text-faint">{pkg.room}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-cult-text-muted">
                            <span className="font-semibold text-cult-text-secondary">{formatG(pkg.on_hand_qty)}</span>
                            {pkg.reserved_qty > 0 && (
                              <span className="text-amber-400">({formatG(pkg.reserved_qty)} reserved)</span>
                            )}
                          </div>
                        </div>

                        {action && (
                          <button
                            type="button"
                            onClick={() => handleSendToProcessing(pkg)}
                            disabled={isSending || pkg.available_qty <= 0}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                              justSent
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : isSending
                                ? 'bg-cult-mid-gray/30 text-cult-text-muted cursor-wait'
                                : pkg.available_qty <= 0
                                ? 'bg-cult-mid-gray/20 text-cult-text-muted cursor-not-allowed opacity-50'
                                : 'bg-cult-accent/10 text-cult-accent border border-cult-accent/30 hover:bg-cult-accent/20'
                            }`}
                          >
                            {justSent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sent
                              </>
                            ) : isSending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                {action}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseModal>

      {/* Package Assignment sub-modal for packaged items */}
      {lineItem && showAssignModal && (
        <PackageAssignmentModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssignmentComplete={async () => {
            setShowAssignModal(false);
            await loadPackages();
            onReload();
          }}
          orderId={lineItem.order_id}
          orderItemId={lineItem.order_item_id}
          productName={`${lineItem.strain_name} ${lineItem.format_label}`}
          orderItemQuantity={lineItem.quantity}
          unit="units"
          batchId={assignBatchId}
        />
      )}
    </>
  );
}

// ─── Main View ──────────────────────────────────────────────────────────────

export function OrderFulfillmentView() {
  const { orders, loading, error, reload } = useOrderFulfillment();
  const [selectedItem, setSelectedItem] = useState<OrderLineItem | null>(null);

  const totalOrders = orders.length;
  const totalLineItems = orders.reduce((sum, o) => sum + o.total_items, 0);
  const totalAssigned = orders.reduce((sum, o) => sum + o.assigned_items, 0);

  const kpis = [
    { label: 'Orders', value: String(totalOrders), sub: 'needing fulfillment' },
    { label: 'Line Items', value: String(totalLineItems), sub: `${totalAssigned} assigned` },
    { label: 'Needs Work', value: String(totalLineItems - totalAssigned), sub: 'items to process' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
      </div>
    );
  }

  return (
    <HubShell section="Order Fulfillment" icon={ClipboardList} kpis={kpis}>
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={reload} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-cult-text-muted">
          Click an order to see line items. Click a line item to see available inventory.
        </p>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cult-dark-gray text-xs text-cult-text-muted hover:text-cult-text-primary hover:border-cult-accent/40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-cult-text-muted">
          <CheckCircle2 className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-base font-medium">All orders are fulfilled</p>
          <p className="text-sm mt-1">No open demand right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <OrderCard
              key={order.order_id}
              order={order}
              onSelectLineItem={setSelectedItem}
            />
          ))}
        </div>
      )}

      {/* Screen 3: Package inventory modal */}
      <PackageInventoryModal
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        lineItem={selectedItem}
        onReload={reload}
      />
    </HubShell>
  );
}
