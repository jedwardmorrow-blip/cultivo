import { useState, useMemo } from 'react';
import {
  Search, X, ChevronLeft, ChevronDown, AlertCircle,
  Package, Layers, Scissors, Leaf, Plus, FileCheck, ShieldCheck,
} from 'lucide-react';
import {
  useStrainInventorySummary,
  useStrainBatchAvailability,
  useCustomerOrderHistory,
  useStrainDemandPressure,
  formatDaysAgo,
  getAvailabilityLevel,
} from '../hooks/useStrainInventory';
import type {
  StrainInventorySummary,
  BatchStageDetail,
  CustomerStrainHistory,
  CustomerProductHistory,
  StrainDemandPressure,
} from '../hooks/useStrainInventory';
import type { OrderableProduct } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BatchSelection {
  batch_id: string;
  batch_number: string;
  strain: string;
  grade_code: string | null;
  grade_label: string | null;
}

interface StrainCatalogProps {
  products: OrderableProduct[];
  customerId: string | null;
  customerName: string | null;
  cartItems: { product_id: string; quantity: number }[];
  customerPrices: Map<string, number> | null;
  onAddToCart: (product: OrderableProduct, batch?: BatchSelection) => void;
}

type FilterMode = 'all' | 'new_for_customer' | 'in_stock' | 'has_coa';

// ─── Stage Labels ────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  bulk_flower: 'Flower',
  bulk_smalls: 'Smalls',
  bulk_trim: 'Trim',
  bucked: 'Bucked',
  packaged: 'Packaged',
};

// ─── Availability Dot ────────────────────────────────────────────────────────

function AvailabilityDot({ level }: { level: 'high' | 'medium' | 'low' | 'out' }) {
  const colors = {
    high: 'bg-cult-success',
    medium: 'bg-cult-warning',
    low: 'bg-cult-danger',
    out: 'bg-cult-text-faint',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[level]}`} />;
}

// ─── Format Weight ───────────────────────────────────────────────────────────

function formatWeight(grams: number): string {
  if (grams === 0) return '0g';
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

// ─── Grade Badge ─────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  gray: 'bg-cult-surface-overlay text-cult-text-faint border-cult-border',
};

function GradeBadge({ code, color }: { code: string; color: string | null }) {
  const colorClass = GRADE_COLORS[color || 'gray'] || GRADE_COLORS.gray;
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${colorClass}`}>
      {code}
    </span>
  );
}

// ─── Strain Card ─────────────────────────────────────────────────────────────

function StrainCard({
  summary,
  customerHistory,
  customerName,
  demandPressure,
  isSelected,
  onClick,
}: {
  summary: StrainInventorySummary;
  customerHistory: CustomerStrainHistory | undefined;
  customerName: string | null;
  demandPressure: StrainDemandPressure | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  const level = getAvailabilityLevel(summary);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left p-3 rounded-cult border transition-all active:scale-[0.98] ${
        isSelected
          ? 'bg-cult-accent/8 border-cult-accent/30 ring-1 ring-cult-accent/20'
          : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
      }`}
    >
      {/* Strain Name + Availability */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-body text-cult-text-primary truncate">
          {summary.strain}
        </div>
        <AvailabilityDot level={level} />
      </div>

      {/* Inventory Summary */}
      <div className="space-y-0.5 text-caption text-cult-text-muted">
        {summary.packaged_units_available > 0 && (
          <div>{Math.round(summary.packaged_units_available)} packaged</div>
        )}
        {(summary.bulk_flower_grams + summary.bulk_smalls_grams) > 0 && (
          <div>{formatWeight(summary.bulk_flower_grams + summary.bulk_smalls_grams)} bulk</div>
        )}
        {summary.packaged_units_available === 0 && summary.bulk_flower_grams + summary.bulk_smalls_grams === 0 && (
          <div>{formatWeight(summary.total_available_grams)} total</div>
        )}
      </div>

      {/* Batch count */}
      <div className="mt-1.5 text-[10px] text-cult-text-faint">
        {summary.active_batch_count} batch{summary.active_batch_count !== 1 ? 'es' : ''}
      </div>

      {/* Demand pressure bar — weight-based comparison */}
      {summary.total_available_grams > 0 && (() => {
        const committedGrams = demandPressure?.total_committed_weight_grams || 0;
        const availableGrams = summary.total_available_grams;
        const pressureRatio = availableGrams > 0 ? Math.min(committedGrams / availableGrams, 1) : 0;
        const barColor = pressureRatio > 0.8 ? 'bg-cult-danger' : pressureRatio > 0.5 ? 'bg-cult-warning' : 'bg-cult-success';
        const fmtW = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(1)}kg` : `${Math.round(g)}g`;

        return (
          <div className="mt-2">
            <div className="h-[3px] bg-cult-border rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${Math.max(100 - pressureRatio * 100, 5)}%` }}
              />
            </div>
            {committedGrams > 0 && (
              <div className="text-[9px] text-cult-text-faint mt-0.5">
                {fmtW(committedGrams)} committed · {demandPressure?.pending_order_count} order{demandPressure?.pending_order_count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      })()}

      {/* Customer history — ambient text */}
      {customerName && (
        <div className="mt-2 text-[10px] text-cult-text-faint truncate">
          {customerHistory
            ? `${customerName}: ${Math.round(customerHistory.total_quantity)} units, ${formatDaysAgo(customerHistory.last_order_date)}`
            : `${customerName}: never ordered`
          }
        </div>
      )}
    </button>
  );
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

function StrainFilterBar({
  activeFilters,
  onToggleFilter,
  hasCustomer,
  searchTerm,
  onSearchChange,
  resultCount,
}: {
  activeFilters: Set<FilterMode>;
  onToggleFilter: (filter: FilterMode) => void;
  hasCustomer: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  resultCount: number;
}) {
  const chips: { filter: FilterMode; label: string; requiresCustomer?: boolean }[] = [
    { filter: 'all', label: 'All' },
    { filter: 'new_for_customer', label: 'New for customer', requiresCustomer: true },
    { filter: 'in_stock', label: 'In stock' },
  ];

  return (
    <div className="flex-shrink-0 px-4 lg:px-5 py-3 border-b border-cult-border bg-cult-surface space-y-2.5">
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {chips.map(({ filter, label, requiresCustomer }) => {
          if (requiresCustomer && !hasCustomer) return null;
          const isActive = filter === 'all'
            ? activeFilters.size === 0
            : activeFilters.has(filter);

          return (
            <button
              key={filter}
              type="button"
              onClick={() => onToggleFilter(filter)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-cult transition-all uppercase tracking-wider ${
                isActive
                  ? 'bg-cult-text-primary text-cult-surface'
                  : 'bg-cult-surface-raised text-cult-text-muted border border-cult-border hover:border-cult-border-strong hover:text-cult-text-secondary'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cult-text-muted w-4 h-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search strains…"
          className="w-full pl-10 pr-10 py-2.5 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-text-muted hover:text-cult-text-primary transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {searchTerm && (
        <p className="text-[11px] text-cult-text-muted">
          {resultCount} strain{resultCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ─── Strain Detail Panel ─────────────────────────────────────────────────────

function StrainDetailPanel({
  strain,
  products,
  batches,
  batchesLoading,
  customerName,
  productHistory,
  demandPressure,
  cartItems,
  customerPrices,
  onAddToCart,
  onBack,
}: {
  strain: string;
  products: OrderableProduct[];
  batches: BatchStageDetail[];
  batchesLoading: boolean;
  customerName: string | null;
  productHistory: Map<string, CustomerProductHistory>;
  demandPressure: StrainDemandPressure | undefined;
  cartItems: { product_id: string; quantity: number }[];
  customerPrices: Map<string, number> | null;
  onAddToCart: (product: OrderableProduct, batch?: BatchSelection) => void;
  onBack: () => void;
}) {
  const [expandedBatchStage, setExpandedBatchStage] = useState<string | null>(null);

  // Group products by category for this strain
  const strainProducts = products.filter(
    p => p.strain?.name === strain || p.strain === strain
  );

  const packaged = strainProducts.filter(p => p.product_category === 'packaged');
  const prerolls = strainProducts.filter(p => p.product_category === 'preroll');
  const bulk = strainProducts.filter(p => p.product_category === 'bulk');

  // Group bulk by stage
  const bulkByStage = bulk.reduce((acc, p) => {
    const stageName = (p.product_stage?.name || 'Other').toLowerCase();
    let stageKey = 'trimmed';
    if (p.name.startsWith('Binned')) stageKey = 'binned';
    else if (p.name.startsWith('Bucked')) stageKey = 'bucked';
    else if (p.name.startsWith('Bulk')) stageKey = 'trimmed';

    if (!acc[stageKey]) acc[stageKey] = [];
    acc[stageKey].push(p);
    return acc;
  }, {} as Record<string, OrderableProduct[]>);

  // Get batch availability grouped by stage
  const batchesByStage = batches.reduce((acc, b) => {
    if (!acc[b.stage]) acc[b.stage] = [];
    acc[b.stage].push(b);
    return acc;
  }, {} as Record<string, BatchStageDetail[]>);

  // Sort batches within each stage by harvest date (oldest first = FIFO)
  Object.values(batchesByStage).forEach(arr =>
    arr.sort((a, b) => (a.harvest_date || '').localeCompare(b.harvest_date || ''))
  );

  function getCartQuantity(productId: string): number {
    return cartItems.find(item => item.product_id === productId)?.quantity || 0;
  }

  function formatProductHistory(productId: string): string | null {
    const hist = productHistory.get(productId);
    if (!hist || !customerName) return null;
    return `last: ${Math.round(hist.total_quantity)} units, ${formatDaysAgo(hist.last_order_date)}`;
  }

  function getStageAvailableGrams(stageKey: string): number {
    const stageMap: Record<string, string> = {
      trimmed: 'bulk_flower',
      bucked: 'bucked',
      binned: 'binned',
    };
    // Sum all relevant stages for 'trimmed' (bulk_flower + bulk_smalls + bulk_trim)
    if (stageKey === 'trimmed') {
      return (
        (batchesByStage['bulk_flower'] || []).reduce((s, b) => s + b.available_weight_grams, 0) +
        (batchesByStage['bulk_smalls'] || []).reduce((s, b) => s + b.available_weight_grams, 0) +
        (batchesByStage['bulk_trim'] || []).reduce((s, b) => s + b.available_weight_grams, 0)
      );
    }
    const mapped = stageMap[stageKey] || stageKey;
    return (batchesByStage[mapped] || []).reduce((s, b) => s + b.available_weight_grams, 0);
  }

  // Map bulk product material type to batch stage for showing per-product availability
  function getBulkProductBatchStage(product: OrderableProduct): string {
    const name = product.name.toLowerCase();
    if (name.includes('flower') && !name.includes('fresh frozen')) return 'bulk_flower';
    if (name.includes('smalls')) return 'bulk_smalls';
    if (name.includes('trim')) return 'bulk_trim';
    if (name.includes('fresh frozen')) return 'bulk_flower';
    if (name.includes('preroll')) return 'bulk_smalls';
    return 'bulk_flower';
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 lg:px-5 py-3 border-b border-cult-border bg-cult-surface">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-cult-text-secondary hover:text-cult-text-primary transition-colors py-1 -ml-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-caption font-medium uppercase tracking-wider">Back to strains</span>
        </button>
        <div className="mt-2 flex items-center gap-3">
          <h2 className="text-h3 font-semibold text-cult-text-primary">{strain}</h2>
          <span className="text-caption text-cult-text-muted">
            {batches.length > 0 ? `${new Set(batches.map(b => b.batch_id)).size} batches` : ''}
          </span>
        </div>
        {/* Concurrent-order awareness */}
        {demandPressure && demandPressure.pending_order_count > 0 && (
          <div className="mt-2 px-2.5 py-1.5 bg-cult-warning/8 border border-cult-warning/15 rounded-cult">
            <p className="text-[11px] text-cult-warning">
              {(() => {
                const g = demandPressure.total_committed_weight_grams;
                const w = g >= 1000 ? `${(g / 1000).toFixed(1)}kg` : `${Math.round(g)}g`;
                return w;
              })()} committed across {demandPressure.pending_order_count} pending order{demandPressure.pending_order_count !== 1 ? 's' : ''}
              {(() => {
                const customers = [...new Set(demandPressure.pending_order_details.map(d => d.customer_name))];
                if (customers.length <= 3) return ` — ${customers.join(', ')}`;
                return ` — ${customers.slice(0, 2).join(', ')} +${customers.length - 2} more`;
              })()}
            </p>
          </div>
        )}
      </div>

      {/* SKU List */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4 space-y-5">
        {/* PACKAGED */}
        {packaged.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-3.5 h-3.5 text-cult-text-muted" />
              <span className="text-caption font-semibold text-cult-text-secondary uppercase tracking-wider">
                Packaged
              </span>
            </div>
            <div className="space-y-1.5">
              {packaged.map(product => {
                const inCart = getCartQuantity(product.id);
                const packagedBatches = batchesByStage['packaged'] || [];
                const stageAvail = packagedBatches.reduce((s, b) => s + b.available_weight_grams, 0);
                const historyText = formatProductHistory(product.id);
                const price = customerPrices?.get(product.id) ?? product.price_per_unit ?? 0;
                const format = product.name.replace(/^(Packaged|Prerolls)\s*-\s*[^-]+\s*-\s*/, '');
                const batchDetailKey = `packaged-${product.id}`;

                return (
                  <div key={product.id}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-cult border transition-all ${
                        inCart
                          ? 'bg-cult-accent/5 border-cult-accent/20'
                          : stageAvail > 0
                          ? 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                          : 'bg-cult-surface-raised border-cult-border opacity-50'
                      }`}
                    >
                      {packagedBatches.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedBatchStage(
                            expandedBatchStage === batchDetailKey ? null : batchDetailKey
                          )}
                          className="p-0.5 text-cult-text-faint hover:text-cult-text-muted transition-colors"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${
                            expandedBatchStage === batchDetailKey ? 'rotate-180' : ''
                          }`} />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body text-cult-text-primary font-medium">{format}</span>
                          {inCart > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cult-accent/15 text-cult-accent rounded-cult">
                              {inCart} in cart
                            </span>
                          )}
                        </div>
                        {historyText && (
                          <div className="text-[10px] text-cult-text-faint mt-0.5">{historyText}</div>
                        )}
                      </div>
                      <div className="text-right text-caption text-cult-text-muted whitespace-nowrap">
                        {price > 0 ? `$${price.toFixed(2)}` : '—'}
                      </div>
                      <div className="text-right text-caption text-cult-text-muted whitespace-nowrap min-w-[48px]">
                        {Math.round(stageAvail)} avail
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                        className="w-9 h-9 flex items-center justify-center rounded-cult border border-cult-border text-cult-text-secondary hover:bg-cult-surface-overlay hover:border-cult-border-strong active:scale-95 transition-all flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Batch breakdown — selectable rows */}
                    {expandedBatchStage === batchDetailKey && packagedBatches.length > 0 && (
                      <div className="ml-8 mt-1.5 mb-2 space-y-1">
                        {packagedBatches.map(batch => (
                          <button
                            key={`${batch.batch_id}-${batch.stage}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(product, {
                                batch_id: batch.batch_id,
                                batch_number: batch.batch_number,
                                strain: batch.strain,
                                grade_code: batch.grade_code,
                                grade_label: batch.grade_label,
                              });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-cult-text-muted rounded-cult border border-transparent hover:border-cult-accent/20 hover:bg-cult-accent/5 transition-all group"
                          >
                            <span className="font-mono text-cult-text-secondary">{batch.batch_number}</span>
                            {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                              <GradeBadge code={batch.grade_code} color={batch.grade_color} />
                            )}
                            {batch.has_coa && (
                              <FileCheck className="w-3 h-3 text-cult-success flex-shrink-0" />
                            )}
                            {batch.thc_percentage != null && (
                              <span className="text-[10px] text-cult-text-secondary">{batch.thc_percentage}% THC</span>
                            )}
                            <span className="text-cult-text-faint">
                              {batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                            <span className="ml-auto font-medium text-cult-text-primary">{formatWeight(batch.available_weight_grams)}</span>
                            <Plus className="w-3 h-3 text-cult-text-faint group-hover:text-cult-accent transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PREROLLS */}
        {prerolls.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-3.5 h-3.5 text-cult-text-muted" />
              <span className="text-caption font-semibold text-cult-text-secondary uppercase tracking-wider">
                Prerolls
              </span>
            </div>
            <div className="space-y-1.5">
              {prerolls.map(product => {
                const inCart = getCartQuantity(product.id);
                const historyText = formatProductHistory(product.id);
                const price = customerPrices?.get(product.id) ?? product.price_per_unit ?? 0;
                const format = product.name.replace(/^Packaged\s*-\s*[^-]+\s*-\s*/, '');
                const prerollBatches = batchesByStage['packaged'] || [];
                const batchDetailKey = `preroll-${product.id}`;

                return (
                  <div key={product.id}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-cult border transition-all ${
                        inCart
                          ? 'bg-cult-accent/5 border-cult-accent/20'
                          : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                      }`}
                    >
                      {prerollBatches.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedBatchStage(
                            expandedBatchStage === batchDetailKey ? null : batchDetailKey
                          )}
                          className="p-0.5 text-cult-text-faint hover:text-cult-text-muted transition-colors"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${
                            expandedBatchStage === batchDetailKey ? 'rotate-180' : ''
                          }`} />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body text-cult-text-primary font-medium">{format}</span>
                          {inCart > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cult-accent/15 text-cult-accent rounded-cult">
                              {inCart} in cart
                            </span>
                          )}
                        </div>
                        {historyText && (
                          <div className="text-[10px] text-cult-text-faint mt-0.5">{historyText}</div>
                        )}
                      </div>
                      <div className="text-right text-caption text-cult-text-muted whitespace-nowrap">
                        {price > 0 ? `$${price.toFixed(2)}/g` : '—'}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                        className="w-9 h-9 flex items-center justify-center rounded-cult border border-cult-border text-cult-text-secondary hover:bg-cult-surface-overlay hover:border-cult-border-strong active:scale-95 transition-all flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {expandedBatchStage === batchDetailKey && prerollBatches.length > 0 && (
                      <div className="ml-8 mt-1.5 mb-2 space-y-1">
                        {prerollBatches.map(batch => (
                          <button
                            key={`${batch.batch_id}-${batch.stage}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(product, {
                                batch_id: batch.batch_id,
                                batch_number: batch.batch_number,
                                strain: batch.strain,
                                grade_code: batch.grade_code,
                                grade_label: batch.grade_label,
                              });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-cult-text-muted rounded-cult border border-transparent hover:border-cult-accent/20 hover:bg-cult-accent/5 transition-all group"
                          >
                            <span className="font-mono text-cult-text-secondary">{batch.batch_number}</span>
                            {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                              <GradeBadge code={batch.grade_code} color={batch.grade_color} />
                            )}
                            {batch.has_coa && (
                              <FileCheck className="w-3 h-3 text-cult-success flex-shrink-0" />
                            )}
                            {batch.thc_percentage != null && (
                              <span className="text-[10px] text-cult-text-secondary">{batch.thc_percentage}% THC</span>
                            )}
                            <span className="text-cult-text-faint">
                              {batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                            <span className="ml-auto font-medium text-cult-text-primary">{formatWeight(batch.available_weight_grams)}</span>
                            <Plus className="w-3 h-3 text-cult-text-faint group-hover:text-cult-accent transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BULK — grouped by stage */}
        {Object.entries(bulkByStage).map(([stageKey, stageProducts]) => {
          const stageLabel = stageKey === 'trimmed' ? 'Bulk — Trimmed'
            : stageKey === 'bucked' ? 'Bulk — Bucked'
            : stageKey === 'binned' ? 'Bulk — Binned'
            : `Bulk — ${stageKey}`;
          const totalAvail = getStageAvailableGrams(stageKey);

          return (
            <div key={stageKey}>
              <div className="flex items-center gap-2 mb-3">
                {stageKey === 'trimmed' ? <Scissors className="w-3.5 h-3.5 text-cult-text-muted" /> :
                 stageKey === 'bucked' ? <Layers className="w-3.5 h-3.5 text-cult-text-muted" /> :
                 <Package className="w-3.5 h-3.5 text-cult-text-muted" />}
                <span className="text-caption font-semibold text-cult-text-secondary uppercase tracking-wider">
                  {stageLabel}
                </span>
                <span className="text-[10px] text-cult-text-faint">
                  {formatWeight(totalAvail)} available
                </span>
              </div>
              <div className="space-y-1.5">
                {stageProducts.map(product => {
                  const inCart = getCartQuantity(product.id);
                  const historyText = formatProductHistory(product.id);
                  const price = customerPrices?.get(product.id) ?? product.price_per_unit ?? 0;

                  // Extract material type from name (e.g., "Bulk - Animal Tsunami - Flower" → "Flower")
                  const nameParts = product.name.split(' - ');
                  const materialType = nameParts[nameParts.length - 1] || product.name;

                  // Get batch-level availability for this specific material type
                  const batchStageKey = getBulkProductBatchStage(product);
                  const stageBatches = batchesByStage[batchStageKey] || [];
                  const materialAvail = stageBatches.reduce((s, b) => s + b.available_weight_grams, 0);
                  const batchDetailKey = `${stageKey}-${materialType}`;

                  return (
                    <div key={product.id}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-cult border transition-all ${
                          inCart
                            ? 'bg-cult-accent/5 border-cult-accent/20'
                            : materialAvail > 0
                            ? 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                            : 'bg-cult-surface-raised border-cult-border opacity-50'
                        }`}
                      >
                        {/* Expand toggle for batch detail */}
                        <button
                          type="button"
                          onClick={() => setExpandedBatchStage(
                            expandedBatchStage === batchDetailKey ? null : batchDetailKey
                          )}
                          className="p-0.5 text-cult-text-faint hover:text-cult-text-muted transition-colors"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${
                            expandedBatchStage === batchDetailKey ? 'rotate-180' : ''
                          }`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-body text-cult-text-primary font-medium">{materialType}</span>
                            {inCart > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cult-accent/15 text-cult-accent rounded-cult">
                                {inCart} in cart
                              </span>
                            )}
                          </div>
                          {historyText && (
                            <div className="text-[10px] text-cult-text-faint mt-0.5">{historyText}</div>
                          )}
                        </div>
                        <div className="text-right text-caption text-cult-text-muted whitespace-nowrap">
                          {price > 0 ? `$${price.toFixed(2)}/lb` : '—'}
                        </div>
                        <div className="text-right text-caption text-cult-text-muted whitespace-nowrap min-w-[56px]">
                          {formatWeight(materialAvail)}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                          disabled={materialAvail === 0}
                          className="w-9 h-9 flex items-center justify-center rounded-cult border border-cult-border text-cult-text-secondary hover:bg-cult-surface-overlay hover:border-cult-border-strong active:scale-95 transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Batch breakdown — selectable rows */}
                      {expandedBatchStage === batchDetailKey && stageBatches.length > 0 && (
                        <div className="ml-8 mt-1.5 mb-2 space-y-1">
                          {stageBatches.map(batch => (
                            <button
                              key={`${batch.batch_id}-${batch.stage}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(product, {
                                  batch_id: batch.batch_id,
                                  batch_number: batch.batch_number,
                                  strain: batch.strain,
                                  grade_code: batch.grade_code,
                                  grade_label: batch.grade_label,
                                });
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-cult-text-muted rounded-cult border border-transparent hover:border-cult-accent/20 hover:bg-cult-accent/5 transition-all group"
                            >
                              <span className="font-mono text-cult-text-secondary">{batch.batch_number}</span>
                              {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                                <GradeBadge code={batch.grade_code} color={batch.grade_color} />
                              )}
                              {batch.has_coa && (
                                <FileCheck className="w-3 h-3 text-cult-success flex-shrink-0" />
                              )}
                              {batch.thc_percentage != null && (
                                <span className="text-[10px] text-cult-text-secondary">{batch.thc_percentage}% THC</span>
                              )}
                              <span className="text-cult-text-faint">
                                {batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                              </span>
                              <span className="ml-auto font-medium text-cult-text-primary">{formatWeight(batch.available_weight_grams)}</span>
                              <Plus className="w-3 h-3 text-cult-text-faint group-hover:text-cult-accent transition-colors flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {packaged.length === 0 && prerolls.length === 0 && bulk.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-cult-text-muted">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-body">No products found for {strain}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main StrainCatalog Component ────────────────────────────────────────────

export function StrainCatalog({
  products,
  customerId,
  customerName,
  cartItems,
  customerPrices,
  onAddToCart,
}: StrainCatalogProps) {
  const { strains, loading: strainsLoading, error: strainsError } = useStrainInventorySummary();
  const { strainHistory, productHistory } = useCustomerOrderHistory(customerId);
  const { demandMap } = useStrainDemandPressure();

  const [selectedStrain, setSelectedStrain] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterMode>>(new Set());

  const { batches, loading: batchesLoading } = useStrainBatchAvailability(selectedStrain);

  // Filter strains
  const filteredStrains = useMemo(() => {
    let result = strains;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => s.strain.toLowerCase().includes(term));
    }

    // Active filters
    if (activeFilters.has('in_stock')) {
      result = result.filter(s => s.total_available_grams > 0);
    }

    if (activeFilters.has('new_for_customer') && customerId) {
      result = result.filter(s => {
        const history = strainHistory.get(s.strain);
        if (!history) return true; // never ordered = new
        // Check if last order was more than 90 days ago
        const daysSince = (Date.now() - new Date(history.last_order_date).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 90;
      });
    }

    return result;
  }, [strains, searchTerm, activeFilters, customerId, strainHistory]);

  function handleToggleFilter(filter: FilterMode) {
    if (filter === 'all') {
      setActiveFilters(new Set());
      return;
    }
    const next = new Set(activeFilters);
    if (next.has(filter)) {
      next.delete(filter);
    } else {
      next.add(filter);
    }
    setActiveFilters(next);
  }

  // ─── Loading State ───────────────────────────────────────────────────────

  if (strainsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-cult-text-muted border-t-cult-text-primary rounded-full animate-spin" />
        <p className="mt-3 text-caption text-cult-text-muted">Loading strains…</p>
      </div>
    );
  }

  if (strainsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-cult-danger">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-body">{strainsError}</p>
      </div>
    );
  }

  // ─── Strain Detail View ──────────────────────────────────────────────────

  if (selectedStrain) {
    return (
      <StrainDetailPanel
        strain={selectedStrain}
        products={products}
        batches={batches}
        batchesLoading={batchesLoading}
        customerName={customerName}
        productHistory={productHistory}
        demandPressure={demandMap.get(selectedStrain)}
        cartItems={cartItems}
        customerPrices={customerPrices}
        onAddToCart={onAddToCart}
        onBack={() => setSelectedStrain(null)}
      />
    );
  }

  // ─── Strain Grid View ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <StrainFilterBar
        activeFilters={activeFilters}
        onToggleFilter={handleToggleFilter}
        hasCustomer={!!customerId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        resultCount={filteredStrains.length}
      />

      <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4">
        {filteredStrains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Search className="w-8 h-8 text-cult-text-muted mb-2" />
            <p className="text-body text-cult-text-muted">No strains match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredStrains.map(summary => (
              <StrainCard
                key={summary.strain}
                summary={summary}
                customerHistory={strainHistory.get(summary.strain)}
                customerName={customerName}
                demandPressure={demandMap.get(summary.strain)}
                isSelected={false}
                onClick={() => setSelectedStrain(summary.strain)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
