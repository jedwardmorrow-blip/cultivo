import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, ChevronDown, ChevronRight, Package, AlertTriangle,
  RefreshCw, CheckCircle2, Clock, Send, Loader2, ShieldCheck, FlaskConical,
  Award, Tag, Gift, Boxes, TrendingUp,
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
  COA_STATUS_CONFIG,
  GRADE_COLOR_MAP,
} from '../hooks/useOrderFulfillment';
import type {
  OrderGroup, OrderLineItem, InventoryPackage, DispatchItemStatus,
} from '../hooks/useOrderFulfillment';
import {
  STAGE_TREATMENTS,
} from '../hooks/useProductionDispatch';
import type { ProcessingStage } from '../hooks/useProductionDispatch';

// ─── Shared helpers ─────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<string, { badge: string; glow: string }> = {
  overdue: { badge: 'bg-cult-danger-muted text-cult-danger border-cult-danger/30', glow: 'shadow-[0_0_12px_rgba(220,69,69,0.15)]' },
  urgent:  { badge: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]' },
  soon:    { badge: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30', glow: '' },
  normal:  { badge: 'bg-cult-success-muted text-cult-success border-cult-success/30', glow: '' },
  no_date: { badge: 'bg-gray-500/15 text-gray-400 border-gray-500/30', glow: '' },
};
const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue', urgent: 'Urgent', soon: 'Soon', normal: 'On Track', no_date: 'No Date',
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  const style = URGENCY_STYLES[urgency] || URGENCY_STYLES.no_date;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style.badge}`}>
      {URGENCY_LABELS[urgency] ?? urgency}
    </span>
  );
}

function COABadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = COA_STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.color}`}>
      <ShieldCheck className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function GradeBadge({ code, label }: { code: string | null; label: string | null }) {
  if (!code || code === 'UNDEFINED') return null;
  const color = GRADE_COLOR_MAP[code] || GRADE_COLOR_MAP.UNDEFINED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${color}`}>
      <Award className="w-3 h-3" />
      {label || code}
    </span>
  );
}

function THCBadge({ thc }: { thc: number | null }) {
  if (thc == null) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border text-violet-400 bg-violet-500/15 border-violet-500/30">
      <FlaskConical className="w-3 h-3" />
      {thc.toFixed(1)}% THC
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function getDeliveryCountdown(dateStr: string | null): { label: string; color: string } | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(dateStr + 'T00:00:00');
  const diffMs = delivery.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-cult-danger' };
  if (diffDays === 0) return { label: 'Today', color: 'text-cult-danger font-black' };
  if (diffDays === 1) return { label: 'Tomorrow', color: 'text-cult-warning' };
  if (diffDays <= 3) return { label: `${diffDays} days`, color: 'text-cult-warning' };
  return { label: `${diffDays} days`, color: 'text-cult-text-muted' };
}

function formatWeightNeeded(weightPerUnit: number | null, unitsRemaining: number): string | null {
  if (!weightPerUnit || unitsRemaining <= 0) return null;
  return formatG(weightPerUnit * unitsRemaining);
}

// ─── Stage visuals ──────────────────────────────────────────────────────────

const STAGE_THEME: Record<string, { dot: string; bg: string; border: string; text: string; gradient: string }> = {
  'Raw (binned)':            { dot: 'bg-indigo-400', bg: 'bg-indigo-500/[0.06]',  border: 'border-indigo-500/20', text: 'text-indigo-300', gradient: 'from-indigo-500/10 to-transparent' },
  'Bucked':                  { dot: 'bg-blue-400',   bg: 'bg-blue-500/[0.06]',    border: 'border-blue-500/20',   text: 'text-blue-300',   gradient: 'from-blue-500/10 to-transparent' },
  'Flower — Ready to Pack':  { dot: 'bg-cyan-400',   bg: 'bg-cyan-500/[0.06]',    border: 'border-cyan-500/20',   text: 'text-cyan-300',   gradient: 'from-cyan-500/10 to-transparent' },
  'Smalls — Ready to Pack':  { dot: 'bg-sky-400',    bg: 'bg-sky-500/[0.06]',     border: 'border-sky-500/20',    text: 'text-sky-300',    gradient: 'from-sky-500/10 to-transparent' },
  'Trim / Shake':            { dot: 'bg-teal-400',   bg: 'bg-teal-500/[0.06]',    border: 'border-teal-500/20',   text: 'text-teal-300',   gradient: 'from-teal-500/10 to-transparent' },
  'Packaged':                { dot: 'bg-emerald-400', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', text: 'text-emerald-300', gradient: 'from-emerald-500/10 to-transparent' },
};

function getStageTheme(stage: string) {
  return STAGE_THEME[stage] || { dot: 'bg-gray-400', bg: 'bg-gray-500/[0.06]', border: 'border-gray-500/20', text: 'text-gray-300', gradient: 'from-gray-500/10 to-transparent' };
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
  const activeDispatches = dispatchItems.filter(d => d.order_item_id === item.order_item_id);
  const inProgress = activeDispatches.filter(d => d.status === 'in_progress').length;
  const queued = activeDispatches.filter(d => d.status === 'pending').length;
  const weightNeeded = formatWeightNeeded(item.weight_per_unit_g, item.units_remaining);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClickItem(); }}
      className={`w-full text-left px-4 py-3.5 rounded-cult border transition-all duration-200 group animate-[card-fade-up_0.3s_ease-out] ${
        isFullyAssigned
          ? 'border-cult-success/20 bg-gradient-to-r from-cult-success/[0.04] to-transparent'
          : 'border-cult-surface/60 bg-gradient-to-r from-cult-mid-gray/[0.04] to-transparent hover:border-cult-accent/30 hover:from-cult-accent/[0.03] cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Row 1: Strain + format + batch */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-cult-text-primary tracking-tight">{item.strain_name}</span>
            <span className="text-xs text-cult-text-muted font-medium">{item.format_label}</span>
            {item.batch_number && (
              <span className="text-[11px] font-mono text-cult-text-faint bg-cult-mid-gray/20 px-1.5 py-0.5 rounded border border-cult-surface/30">
                {item.batch_number}
              </span>
            )}
            {item.is_sample && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/30">
                <Gift className="w-2.5 h-2.5" />
                Sample
              </span>
            )}
          </div>

          {/* Row 2: Badges */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {isFullyAssigned ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cult-success-muted text-cult-success border border-cult-success/30">
                <CheckCircle2 className="w-3 h-3" />
                Assigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cult-warning-muted text-cult-warning border border-cult-warning/30">
                <Clock className="w-3 h-3" />
                Needs Work
              </span>
            )}
            <COABadge status={item.coa_status} />
            <THCBadge thc={item.thc_percentage} />
            <GradeBadge code={item.batch_grade_code} label={item.batch_grade_label} />
            {inProgress > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cult-info-muted text-cult-info border border-cult-info/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                {inProgress} processing
              </span>
            )}
            {queued > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {queued} queued
              </span>
            )}
          </div>
        </div>

        {/* Right side: weight, price, units */}
        <div className="flex items-center gap-4 shrink-0">
          {weightNeeded && !isFullyAssigned && (
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-cult-text-secondary tabular-nums">{weightNeeded}</div>
              <div className="text-[11px] text-cult-text-faint">needed</div>
            </div>
          )}
          {item.subtotal != null && item.subtotal > 0 && (
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-cult-success/90 tabular-nums">{formatCurrency(item.subtotal)}</div>
              <div className="text-[11px] text-cult-text-faint">{item.unit_price != null ? `@${formatCurrency(item.unit_price)}/ea` : ''}</div>
            </div>
          )}
          <div className="text-right min-w-[60px]">
            <div className="text-sm font-bold text-cult-text-primary tabular-nums">
              {item.units_assigned} <span className="text-cult-text-muted text-xs font-normal">/ {item.quantity}</span>
            </div>
            <div className="text-[11px] text-cult-text-muted">assigned</div>
          </div>
          <ChevronRight className="w-4 h-4 text-cult-text-muted shrink-0 group-hover:text-cult-accent transition-colors" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-1 rounded-full bg-cult-surface/40 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isFullyAssigned
              ? 'bg-cult-success'
              : fillPct > 0
              ? 'bg-gradient-to-r from-cult-accent to-cult-accent/60'
              : 'bg-cult-surface/60'
          }`}
          style={{ width: `${Math.max(fillPct, 2)}%` }}
        />
      </div>
    </button>
  );
}

// ─── Screen 1: Order Card ───────────────────────────────────────────────────

function OrderCard({
  order,
  onSelectLineItem,
  index,
}: {
  order: OrderGroup;
  onSelectLineItem: (item: OrderLineItem) => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItemStatus[]>([]);

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

  const urgencyStyle = URGENCY_STYLES[order.urgency] || URGENCY_STYLES.no_date;
  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;
  const countdown = getDeliveryCountdown(deliveryDate);

  return (
    <div
      className={`rounded-cult border overflow-hidden transition-all duration-200 ${urgencyStyle.glow} ${
        allAssigned
          ? 'border-cult-success/20 bg-gradient-to-r from-cult-success/[0.03] to-cult-black'
          : expanded
          ? 'border-cult-accent/25 bg-gradient-to-br from-cult-mid-gray/[0.06] to-cult-black'
          : 'border-cult-surface/60 bg-cult-black hover:border-cult-surface'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Order header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 group"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-bold text-cult-text-primary tracking-tight">{order.customer_name}</span>
            <UrgencyBadge urgency={order.urgency} />
            {order.is_sample && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/30">
                <Gift className="w-3 h-3" />
                Sample
              </span>
            )}
            {countdown && (
              <span className={`text-[11px] font-bold ${countdown.color}`}>{countdown.label}</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-1.5 text-xs text-cult-text-muted">
            <span className="font-mono text-cult-text-faint">{order.order_number}</span>
            <span className="w-px h-3 bg-cult-surface/60" />
            {deliveryDate && (
              <span>{order.scheduled_delivery_date ? 'Deliver' : 'Requested'} {formatDate(deliveryDate)}</span>
            )}
            <span className="w-px h-3 bg-cult-surface/60" />
            <span>{order.total_items} item{order.total_items !== 1 ? 's' : ''}</span>
            {order.order_total > 0 && (
              <>
                <span className="w-px h-3 bg-cult-surface/60" />
                <span className="font-semibold text-cult-success/80">{formatCurrency(order.order_total)}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: stats + ring */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-cult-text-primary tabular-nums">
              {order.assigned_items} <span className="text-cult-text-muted text-xs font-normal">/ {order.total_items}</span>
            </div>
            <div className="text-[11px] text-cult-text-muted">items ready</div>
          </div>

          {/* Progress ring with glow */}
          <div className="relative w-11 h-11 shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-cult-surface/40" />
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="2.5"
                strokeDasharray={`${progressPct * 0.88} 88`}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${
                  allAssigned ? 'text-cult-success drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                  : progressPct > 0 ? 'text-cult-accent drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]'
                  : 'text-cult-surface/60'
                }`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-cult-text-primary tabular-nums">
              {progressPct}%
            </span>
          </div>

          <div className="w-5 flex items-center justify-center">
            <ChevronDown className={`w-5 h-5 text-cult-text-muted transition-transform duration-200 ${expanded ? '' : '-rotate-90'} group-hover:text-cult-accent`} />
          </div>
        </div>
      </button>

      {/* Expanded line items */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2 border-t border-cult-surface/20 pt-3">
          {order.line_items.map((item, i) => (
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

// ─── Screen 3: Package Inventory Modal ──────────────────────────────────────

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
      const data = await fetchStrainInventory(lineItem.strain_name, lineItem.batch_id);
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

    // Packaged items go directly to order assignment (not dispatch)
    if (pkg.category.includes('packaged')) {
      setAssignBatchId(pkg.batch_id);
      setShowAssignModal(true);
      return;
    }

    const processingStage = getProcessingStageForCategory(pkg.category);
    if (!processingStage) return;

    const treatments = STAGE_TREATMENTS[processingStage as ProcessingStage];
    if (!treatments || treatments.length === 0) return;

    setSendingId(pkg.id);
    try {
      const { error } = await supabase.from('production_dispatch_items').insert({
        batch_registry_id: pkg.batch_id,
        inventory_item_id: pkg.id,
        order_item_id: processingStage === 'package_to_order' ? lineItem.order_item_id : null,
        processing_stage: processingStage,
        treatment_type: treatments[0],
        quantity_g: pkg.on_hand_qty,
        priority: 50,
        status: 'pending',
      });
      if (error) throw error;

      setSendSuccess(pkg.id);
      setTimeout(() => setSendSuccess(null), 2000);
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

  // Group packages by batch, then by stage
  const batchGroups = new Map<string, { batch_number: string; coa_status: string | null; thc: number | null; grade_code: string | null; grade_label: string | null; packages: InventoryPackage[] }>();
  for (const pkg of packages) {
    if (!batchGroups.has(pkg.batch_id)) {
      batchGroups.set(pkg.batch_id, {
        batch_number: pkg.batch_number,
        coa_status: pkg.coa_status,
        thc: pkg.thc_percentage,
        grade_code: pkg.grade_code,
        grade_label: pkg.grade_label,
        packages: [],
      });
    }
    batchGroups.get(pkg.batch_id)!.packages.push(pkg);
  }

  function groupByStage(pkgs: InventoryPackage[]) {
    const grouped = new Map<string, InventoryPackage[]>();
    for (const pkg of pkgs) {
      const existing = grouped.get(pkg.stage_label) || [];
      existing.push(pkg);
      grouped.set(pkg.stage_label, existing);
    }
    return grouped;
  }

  const isBatchFiltered = !!lineItem.batch_id;

  return (
    <>
      <BaseModal
        isOpen={isOpen && !showAssignModal}
        onClose={onClose}
        title={`${lineItem.strain_name} — ${lineItem.format_label}`}
        icon={<Package className="w-5 h-5 text-cult-accent" />}
        maxWidth="4xl"
      >
        {/* Context bar */}
        <div className="mb-5 p-4 rounded-cult border border-cult-surface/40 bg-gradient-to-r from-cult-mid-gray/[0.06] to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cult-accent/15 to-cult-accent/5 border border-cult-accent/20 flex items-center justify-center">
              <Tag className="w-4 h-4 text-cult-accent" />
            </div>
            <div>
              <div className="text-sm font-medium text-cult-text-primary">
                {lineItem.customer_name}
                <span className="text-cult-text-faint"> — </span>
                <span className="font-mono text-cult-text-muted text-xs">{lineItem.order_number}</span>
              </div>
              {isBatchFiltered && (
                <div className="text-[11px] text-cult-accent/80 mt-0.5 flex items-center gap-1">
                  <Boxes className="w-3 h-3" />
                  Showing batch {lineItem.batch_number} only
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-cult-text-primary tabular-nums leading-none">{lineItem.units_remaining}</div>
            <div className="text-[11px] text-cult-text-muted mt-0.5">of {lineItem.quantity} needed</div>
          </div>
        </div>

        {loadingPkgs ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cult-accent mb-3" />
            <p className="text-sm text-cult-text-muted">Loading inventory...</p>
          </div>
        ) : pkgError ? (
          <div className="p-4 rounded-cult border border-cult-danger/30 bg-cult-danger/[0.06] text-sm text-cult-danger flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="flex-1">{pkgError}</div>
            <button onClick={loadPackages} className="shrink-0 px-3 py-1.5 rounded-lg border border-cult-danger/30 text-xs font-semibold hover:bg-cult-danger/10 transition-colors">Retry</button>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-cult-text-muted">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-bold text-cult-text-secondary">No inventory found</p>
            <p className="text-xs mt-1 text-cult-text-faint">
              {isBatchFiltered
                ? `Batch ${lineItem.batch_number} has no available packages.`
                : `No active batches for ${lineItem.strain_name}.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(batchGroups.entries()).map(([batchId, group]) => {
              const stages = groupByStage(group.packages);
              const totalWeight = group.packages.reduce((sum, p) => sum + p.on_hand_qty, 0);

              return (
                <div key={batchId} className="animate-[card-fade-up_0.3s_ease-out]">
                  {/* Batch header */}
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-cult-surface/25">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-cult-mid-gray/20 border border-cult-surface/30 flex items-center justify-center">
                        <Boxes className="w-3.5 h-3.5 text-cult-text-muted" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-cult-text-primary font-mono tracking-tight">{group.batch_number}</span>
                        <span className="text-xs text-cult-text-faint ml-2">{formatG(totalWeight)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <COABadge status={group.coa_status} />
                      <THCBadge thc={group.thc} />
                      <GradeBadge code={group.grade_code} label={group.grade_label} />
                    </div>
                  </div>

                  {/* Stage groups */}
                  <div className="space-y-3 pl-2">
                    {Array.from(stages.entries()).map(([stageLabel, pkgs]) => {
                      const theme = getStageTheme(stageLabel);
                      return (
                        <div key={stageLabel}>
                          <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2 ${theme.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                            {stageLabel}
                            <span className="text-cult-text-faint font-normal tracking-normal">({pkgs.length})</span>
                          </h4>

                          <div className="space-y-1">
                            {pkgs.map(pkg => {
                              const action = getNextAction(pkg.category);
                              const isSending = sendingId === pkg.id;
                              const justSent = sendSuccess === pkg.id;
                              const t = getStageTheme(pkg.stage_label);

                              return (
                                <div
                                  key={pkg.id}
                                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border ${t.border} bg-gradient-to-r ${t.gradient} transition-all duration-150 hover:brightness-125`}
                                >
                                  <div className="min-w-0 flex-1 flex items-center gap-3">
                                    <span className="text-sm font-semibold text-cult-text-primary font-mono tracking-tight">
                                      {pkg.package_id}
                                    </span>
                                    <span className={`text-sm font-bold tabular-nums ${t.text}`}>
                                      {formatG(pkg.on_hand_qty)}
                                    </span>
                                    {pkg.reserved_qty > 0 && (
                                      <span className="text-[11px] text-amber-400/70 font-medium">
                                        ({formatG(pkg.reserved_qty)} held)
                                      </span>
                                    )}
                                    {pkg.room && (
                                      <span className="text-[11px] text-cult-text-faint">{pkg.room}</span>
                                    )}
                                  </div>

                                  {action && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendToProcessing(pkg)}
                                      disabled={isSending || pkg.available_qty <= 0}
                                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
                                        justSent
                                          ? 'bg-cult-success/20 text-cult-success border border-cult-success/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                          : isSending
                                          ? 'bg-cult-mid-gray/30 text-cult-text-muted cursor-wait'
                                          : pkg.available_qty <= 0
                                          ? 'bg-cult-mid-gray/10 text-cult-text-muted cursor-not-allowed opacity-30'
                                          : 'bg-cult-accent/10 text-cult-accent border border-cult-accent/25 hover:bg-cult-accent/20 hover:border-cult-accent/40 hover:shadow-[0_0_10px_rgba(255,255,255,0.06)]'
                                      }`}
                                    >
                                      {justSent ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5" /> Sent</>
                                      ) : isSending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <><Send className="w-3.5 h-3.5" /> {action}</>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BaseModal>

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
  const totalRevenue = orders.reduce((sum, o) => sum + o.order_total, 0);

  const kpis = [
    { label: 'Orders', value: String(totalOrders), sub: 'needing fulfillment' },
    { label: 'Line Items', value: `${totalAssigned}/${totalLineItems}`, sub: 'assigned' },
    { label: 'Pipeline', value: totalRevenue > 0 ? formatCurrency(totalRevenue) : '$0', sub: 'order value' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cult-accent" />
        <p className="text-sm text-cult-text-muted">Loading orders...</p>
      </div>
    );
  }

  return (
    <HubShell section="Order Fulfillment" icon={ClipboardList} kpis={kpis}>
      {error && (
        <div className="mb-4 p-3.5 rounded-cult border border-cult-danger/30 bg-cult-danger/[0.06] flex items-center gap-3 text-sm text-cult-danger">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={reload} className="shrink-0 px-3 py-1.5 rounded-lg border border-cult-danger/30 text-xs font-semibold hover:bg-cult-danger/10 transition-colors">Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-cult-text-muted">
          Click an order to expand, then click a line item to view inventory.
        </p>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cult-surface/60 text-xs font-medium text-cult-text-muted hover:text-cult-accent hover:border-cult-accent/30 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-cult-text-muted">
          <div className="w-16 h-16 rounded-cult bg-cult-success/10 border border-cult-success/20 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-cult-success/60" />
          </div>
          <p className="text-base font-bold text-cult-text-secondary">All caught up</p>
          <p className="text-sm mt-1 text-cult-text-faint">No orders needing fulfillment right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <OrderCard
              key={order.order_id}
              order={order}
              onSelectLineItem={setSelectedItem}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Package inventory modal */}
      <PackageInventoryModal
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        lineItem={selectedItem}
        onReload={reload}
      />
    </HubShell>
  );
}
