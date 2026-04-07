import { useState, useMemo } from 'react';
import {
  Search, X, ChevronLeft, ChevronDown, AlertCircle,
  Package, Layers, Scissors, Leaf, Plus, FileCheck, ShieldCheck,
  Clock, Sparkles,
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
import { useSkuYield, type StrainAllocation } from '@/shared/hooks/useSkuYield';
import { formatWeight as sharedFormatWeight } from '@/shared/utils/format';
import type { OrderableProduct } from '@/types';
import type { ProductReservation } from '@/hooks/useProductReservations';

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
  productReservations?: Map<string, ProductReservation>;
  onAddToCart: (product: OrderableProduct, batch?: BatchSelection, quantity?: number) => void;
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

// ─── Pipeline-Derived Unit Availability ──────────────────────────────────────

/** Parse the per-unit weight in grams from a product name (e.g. "3.5g Flower" → 3.5, "1lb Flower (454g)" → 454). */
function parseUnitWeightGrams(productName: string): number | null {
  const name = productName.toLowerCase();
  if (name.includes('1lb') || name.includes('454g')) return 454;
  const match = name.match(/(\d+(?:\.\d+)?)g\b/);
  if (match) return parseFloat(match[1]);
  return null;
}

/**
 * Compute how many units of a packaged product the full pipeline can produce.
 * Includes packaged (ready), material-specific bulk, and all upstream stages
 * (bucked, binned) that could be processed into the final product.
 */
function getPipelineAvailableUnits(readyGrams: number, pipelineGrams: number, productName: string, upstreamGrams?: number): number | null {
  const unitWeight = parseUnitWeightGrams(productName);
  if (!unitWeight || unitWeight <= 0) return null;
  return Math.floor((readyGrams + pipelineGrams + (upstreamGrams ?? 0)) / unitWeight);
}

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

// ─── Format Weight (canonical lbs-based shared formatter) ────────────────────

const formatWeight = sharedFormatWeight;

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
  skuAllocation,
  isSelected,
  onClick,
}: {
  summary: StrainInventorySummary;
  customerHistory: CustomerStrainHistory | undefined;
  customerName: string | null;
  demandPressure: StrainDemandPressure | undefined;
  skuAllocation: StrainAllocation | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  const level = getAvailabilityLevel(summary);

  const hasSkuProjections = skuAllocation && (
    skuAllocation.total_proj_3_5g > 0 ||
    skuAllocation.total_proj_14g > 0 ||
    skuAllocation.total_proj_1lb > 0 ||
    skuAllocation.total_proj_preroll > 0 ||
    skuAllocation.total_proj_trim_g > 0
  );

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

      {/* SKU Projections — what this strain can produce */}
      {hasSkuProjections ? (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {skuAllocation!.total_proj_3_5g > 0 && (
            <span className="text-[10px] tabular-nums text-emerald-400" title={`${skuAllocation!.total_proj_3_5g} × 3.5g jars projected`}>
              <span className="font-semibold">{skuAllocation!.total_proj_3_5g}</span>
              <span className="text-cult-text-faint ml-0.5">3.5g</span>
            </span>
          )}
          {skuAllocation!.total_proj_14g > 0 && (
            <span className="text-[10px] tabular-nums text-sky-400" title={`${skuAllocation!.total_proj_14g} × 14g mylars projected`}>
              <span className="font-semibold">{skuAllocation!.total_proj_14g}</span>
              <span className="text-cult-text-faint ml-0.5">14g</span>
            </span>
          )}
          {skuAllocation!.total_proj_1lb > 0 && (
            <span className="text-[10px] tabular-nums text-violet-400" title={`${skuAllocation!.total_proj_1lb} × 1lb bags projected`}>
              <span className="font-semibold">{skuAllocation!.total_proj_1lb}</span>
              <span className="text-cult-text-faint ml-0.5">1lb</span>
            </span>
          )}
          {skuAllocation!.total_proj_preroll > 0 && (
            <span className="text-[10px] tabular-nums text-rose-400" title={`${skuAllocation!.total_proj_preroll} × 1g prerolls`}>
              <span className="font-semibold">{skuAllocation!.total_proj_preroll}</span>
              <span className="text-cult-text-faint ml-0.5">pre</span>
            </span>
          )}
          {skuAllocation!.total_proj_trim_g > 0 && (
            <span className="text-[10px] tabular-nums text-amber-400" title={`${formatWeight(skuAllocation!.total_proj_trim_g)} trim projected`}>
              <span className="font-semibold">{formatWeight(skuAllocation!.total_proj_trim_g)}</span>
              <span className="text-cult-text-faint ml-0.5">trim</span>
            </span>
          )}
        </div>
      ) : (
        /* Fallback: basic inventory summary */
        <div className="space-y-0.5 text-caption text-cult-text-muted mb-1.5">
          {summary.packaged_units_available > 0 && (
            <div>{Math.round(summary.packaged_units_available)} packaged</div>
          )}
          {(() => {
            const bulkTotal = summary.bulk_flower_grams + summary.bulk_smalls_grams + summary.bulk_trim_grams + summary.bucked_grams;
            return bulkTotal > 0 ? <div>{formatWeight(bulkTotal)} in pipeline</div> : null;
          })()}
          {summary.packaged_units_available === 0 && summary.bulk_flower_grams + summary.bulk_smalls_grams + summary.bulk_trim_grams + summary.bucked_grams === 0 && (
            <div>{formatWeight(summary.total_available_grams)} total</div>
          )}
        </div>
      )}

      {/* Batch count + weight */}
      <div className="mt-1 text-[10px] text-cult-text-faint">
        {skuAllocation
          ? `${skuAllocation.batch_count} batch${skuAllocation.batch_count !== 1 ? 'es' : ''} · ${formatWeight(skuAllocation.total_remaining_g)}`
          : `${summary.active_batch_count} batch${summary.active_batch_count !== 1 ? 'es' : ''}`
        }
      </div>

      {/* Demand pressure bar — weight-based comparison */}
      {summary.total_available_grams > 0 && (() => {
        const committedGrams = demandPressure?.total_committed_weight_grams || 0;
        const availableGrams = summary.total_available_grams;
        const pressureRatio = availableGrams > 0 ? Math.min(committedGrams / availableGrams, 1) : 0;
        const barColor = pressureRatio > 0.8 ? 'bg-cult-danger' : pressureRatio > 0.5 ? 'bg-cult-warning' : 'bg-cult-success';
        const fmtW = formatWeight;

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

      {/* Customer history */}
      {customerName && (
        <div className="mt-2 truncate">
          {customerHistory ? (
            <div className="flex items-center gap-1.5 text-[11px] text-cult-text-muted">
              <Clock className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
              <span className="font-medium tabular-nums">{Math.round(customerHistory.total_quantity)} units</span>
              <span className="text-cult-text-faint">·</span>
              <span>{formatDaysAgo(customerHistory.last_order_date)}</span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-cult bg-cult-accent/10 text-cult-accent">
              <Sparkles className="w-2.5 h-2.5" />
              New
            </span>
          )}
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
  productReservations,
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
  productReservations?: Map<string, ProductReservation>;
  onAddToCart: (product: OrderableProduct, batch?: BatchSelection, quantity?: number) => void;
  onBack: () => void;
}) {
  const [expandedBatchStage, setExpandedBatchStage] = useState<string | null>(null);
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({});

  // Group products by category for this strain
  const strainProducts = products.filter(
    p => p.strain?.name === strain || p.strain === strain
  );

  const packaged = strainProducts.filter(p => p.product_category === 'packaged');
  const prerolls = strainProducts.filter(p => p.product_category === 'preroll');
  const bulk = strainProducts.filter(p => p.product_category === 'bulk');

  // Group bulk by stage — only show Trimmed (sellable material)
  // Binned and Bucked are inventory tracking stages, not sellable products
  const SELLABLE_BULK_MATERIALS = ['flower', 'smalls', 'trim', 'fresh frozen'];
  const bulkByStage = bulk.reduce((acc, p) => {
    // Only include Trimmed stage (starts with "Bulk")
    if (!p.name.startsWith('Bulk')) return acc;

    // Only include sellable material types
    const nameLower = p.name.toLowerCase();
    const isSellable = SELLABLE_BULK_MATERIALS.some(mat => nameLower.includes(mat));
    if (!isSellable) return acc;

    const stageKey = 'trimmed';
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

  function getProductHistoryData(productId: string): CustomerProductHistory | null {
    if (!customerName) return null;
    return productHistory.get(productId) || null;
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

  // Map product name → relevant batch stage for material-specific pipeline
  function getMaterialBatchStage(product: OrderableProduct): string {
    const name = product.name.toLowerCase();
    if (name.includes('fresh frozen')) return 'bulk_flower'; // fresh frozen tracked under bulk_flower
    if (name.includes('flower')) return 'bulk_flower';
    if (name.includes('smalls')) return 'bulk_smalls';
    if (name.includes('trim')) return 'bulk_trim';
    if (name.includes('preroll')) return 'bulk_smalls';
    return 'bulk_flower';
  }

  // "Ready" = packaged stage weight (what's available to ship now)
  function getReadyGrams(): number {
    return (batchesByStage['packaged'] || []).reduce((s, b) => s + b.available_weight_grams, 0);
  }

  // "In pipeline" = material-specific weight across all processing stages
  function getPipelineGrams(product: OrderableProduct): number {
    const materialStage = getMaterialBatchStage(product);
    return (batchesByStage[materialStage] || []).reduce((s, b) => s + b.available_weight_grams, 0);
  }

  // "Upstream" = bucked + binned weight that could be processed into any material type
  function getUpstreamGrams(): number {
    return (
      (batchesByStage['bucked'] || []).reduce((s, b) => s + b.available_weight_grams, 0) +
      (batchesByStage['binned'] || []).reduce((s, b) => s + b.available_weight_grams, 0)
    );
  }

  // Total pipeline across ALL material types for the strain header
  const totalPipelineGrams = Object.values(batchesByStage)
    .flat()
    .reduce((s, b) => s + b.available_weight_grams, 0);

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
        {/* Pipeline inventory summary */}
        {totalPipelineGrams > 0 && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-cult-text-secondary">
            <span className="font-medium">{formatWeight(totalPipelineGrams)} total in pipeline</span>
            {Object.entries(batchesByStage).filter(([, arr]) => arr.length > 0).map(([stage, arr]) => {
              const stageGrams = arr.reduce((s, b) => s + b.available_weight_grams, 0);
              const label = stage === 'bulk_flower' ? 'Flower'
                : stage === 'bulk_smalls' ? 'Smalls'
                : stage === 'bulk_trim' ? 'Trim'
                : stage === 'packaged' ? 'Packaged'
                : stage === 'bucked' ? 'Bucked'
                : stage === 'binned' ? 'Binned'
                : stage;
              return (
                <span key={stage} className="text-cult-text-muted">
                  {formatWeight(stageGrams)} {label}
                </span>
              );
            })}
          </div>
        )}
        {/* Concurrent-order awareness */}
        {demandPressure && demandPressure.pending_order_count > 0 && (
          <div className="mt-2 px-2.5 py-1.5 bg-cult-warning/8 border border-cult-warning/15 rounded-cult">
            <p className="text-[11px] text-cult-warning">
              {formatWeight(demandPressure.total_committed_weight_grams)} committed across {demandPressure.pending_order_count} pending order{demandPressure.pending_order_count !== 1 ? 's' : ''}
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
                const readyGrams = getReadyGrams();
                const pipelineGrams = getPipelineGrams(product);
                // Show batches from ALL relevant stages (packaged + material pipeline)
                const materialStage = getMaterialBatchStage(product);
                const relevantBatches = [
                  ...(batchesByStage['packaged'] || []),
                  ...(batchesByStage[materialStage] || []),
                ].filter((b, i, arr) => arr.findIndex(x => x.batch_id === b.batch_id && x.stage === b.stage) === i);
                const prodHist = getProductHistoryData(product.id);
                const price = customerPrices?.get(product.id) ?? product.price_per_unit ?? 0;
                // Strip prefix: "Packaged - Strain - X" or "Bulk - Strain - X" → "X"
                const format = product.name.replace(/^(Packaged|Prerolls|Bulk)\s*-\s*[^-]+\s*-\s*/, '');
                const batchDetailKey = `packaged-${product.id}`;
                const qtyKey = product.id;
                const qtyVal = pendingQty[qtyKey] ?? '';
                const parsedQty = parseInt(qtyVal) || 1;
                const pricingUnit = product.pricing_unit || 'unit';
                const reservation = productReservations?.get(product.id);
                const reservedQty = reservation?.reserved_qty ?? 0;
                const staticAvailable = reservation?.net_available ?? (product.available_quantity ?? 0);
                // Use pipeline-derived availability: packaged + bulk material + upstream (bucked/binned)
                const upstreamGrams = getUpstreamGrams();
                const pipelineUnits = getPipelineAvailableUnits(readyGrams, pipelineGrams, product.name, upstreamGrams);
                const netAvailable = pipelineUnits != null ? Math.max(pipelineUnits - reservedQty, 0) : staticAvailable;
                const isOverReserved = parsedQty > netAvailable && netAvailable >= 0;
                const isFullyReserved = netAvailable === 0 && reservedQty > 0;

                return (
                  <div key={product.id}>
                    <div
                      className={`px-3 py-2.5 rounded-cult border transition-all ${
                        inCart
                          ? 'bg-cult-accent/5 border-cult-accent/20'
                          : isFullyReserved
                          ? 'bg-cult-danger/[0.03] border-cult-danger/20'
                          : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                      }`}
                    >
                      {/* Top row: product info */}
                      <div className="flex items-center gap-3">
                        {relevantBatches.length > 0 && (
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
                          {prodHist && (
                            <div className="flex items-center gap-1.5 text-[11px] text-cult-text-muted mt-0.5">
                              <Clock className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
                              <span className="font-medium tabular-nums">{Math.round(prodHist.total_quantity)} units</span>
                              <span className="text-cult-text-faint">·</span>
                              <span>{formatDaysAgo(prodHist.last_order_date)}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-caption text-cult-text-muted whitespace-nowrap">
                          {price > 0 ? `$${price.toFixed(2)}/${pricingUnit}` : '—'}
                        </div>
                        <div className="text-right text-[10px] text-cult-text-faint whitespace-nowrap">
                          {formatWeight(readyGrams)} ready
                          {pipelineGrams > 0 && (
                            <span className="text-cult-text-muted"> · {formatWeight(pipelineGrams)} in pipeline</span>
                          )}
                        </div>
                      </div>

                      {/* Reservation availability row */}
                      {(reservedQty > 0 || reservation) && (
                        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                          <span className="text-cult-text-faint">
                            reserved: <span className="text-cult-warning font-semibold tabular-nums">{reservedQty}</span>
                          </span>
                          <span className="text-cult-text-faint">·</span>
                          <span className={`font-semibold tabular-nums ${netAvailable > 0 ? 'text-cult-success' : 'text-cult-danger'}`}>
                            {netAvailable} net available
                          </span>
                          {pipelineUnits != null && pipelineUnits > 0 && staticAvailable === 0 && (
                            <span className="text-cult-text-muted">(from pipeline)</span>
                          )}
                          {isFullyReserved && (
                            <span className="flex items-center gap-0.5 text-cult-danger font-semibold ml-auto">
                              <AlertCircle className="w-3 h-3" />
                              fully reserved
                            </span>
                          )}
                        </div>
                      )}

                      {/* Inline qty + add row */}
                      <div className="flex items-center gap-2 mt-2 pl-0">
                        <input
                          type="number"
                          min="1"
                          placeholder={prodHist ? String(Math.round(prodHist.total_quantity / prodHist.order_count)) : '1'}
                          value={qtyVal}
                          onChange={(e) => setPendingQty(prev => ({ ...prev, [qtyKey]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              onAddToCart(product, undefined, parsedQty);
                              setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                            }
                          }}
                          className="w-16 px-2 py-1.5 bg-cult-surface border border-cult-border rounded-cult text-body text-cult-text-primary text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {prodHist ? (
                          <span className="text-[10px] text-cult-text-muted tabular-nums" title="Average qty per order">
                            prev {Math.round(prodHist.total_quantity / prodHist.order_count)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-cult-text-faint">unit</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(product, undefined, parsedQty);
                            setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-cult-text-primary text-cult-surface rounded-cult hover:bg-cult-accent-hover active:scale-95 transition-all"
                        >
                          Add
                        </button>
                        {isOverReserved && (
                          <span className="flex items-center gap-0.5 text-[10px] text-cult-danger font-medium ml-auto">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            exceeds net available ({netAvailable})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Batch selection — structured cards */}
                    {expandedBatchStage === batchDetailKey && relevantBatches.length > 0 && (
                      <div className="mt-2 mb-2 space-y-1.5">
                        <div className="flex items-center gap-2 px-1">
                          <div className="h-px flex-1 bg-cult-border" />
                          <span className="text-[10px] font-semibold text-cult-text-muted uppercase tracking-wider whitespace-nowrap">
                            {relevantBatches.length} batch{relevantBatches.length !== 1 ? 'es' : ''} available
                          </span>
                          <div className="h-px flex-1 bg-cult-border" />
                        </div>
                        {relevantBatches.map(batch => {
                          const isReady = batch.stage === 'packaged';
                          const harvestStr = batch.harvest_date
                            ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;
                          const daysSinceHarvest = batch.harvest_date
                            ? Math.floor((Date.now() - new Date(batch.harvest_date).getTime()) / 86400000)
                            : null;

                          return (
                            <button
                              key={`${batch.batch_id}-${batch.stage}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = parseInt(pendingQty[qtyKey]) || 1;
                                onAddToCart(product, {
                                  batch_id: batch.batch_id,
                                  batch_number: batch.batch_number,
                                  strain: batch.strain,
                                  grade_code: batch.grade_code,
                                  grade_label: batch.grade_label,
                                }, qty);
                                setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                              }}
                              className={`w-full text-left rounded-cult border transition-all group overflow-hidden ${
                                isReady
                                  ? 'bg-cult-success/[0.03] border-cult-success/20 hover:border-cult-success/40 hover:bg-cult-success/[0.06]'
                                  : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong hover:bg-cult-surface-overlay'
                              }`}
                            >
                              {/* Primary row — batch ID, stage, grade, weight */}
                              <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1">
                                <span className="font-mono text-[12px] font-semibold text-cult-text-primary tracking-tight">
                                  {batch.batch_number}
                                </span>
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-cult ${
                                  isReady
                                    ? 'bg-cult-success/15 text-cult-success'
                                    : 'bg-cult-surface-overlay text-cult-text-muted border border-cult-border'
                                }`}>
                                  {STAGE_LABELS[batch.stage] || batch.stage}
                                </span>
                                {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                                  <GradeBadge code={batch.grade_code} color={batch.grade_color} />
                                )}
                                <span className="ml-auto text-[13px] font-semibold text-cult-text-primary tabular-nums">
                                  {formatWeight(batch.available_weight_grams)}
                                </span>
                                <Plus className="w-3.5 h-3.5 text-cult-text-faint group-hover:text-cult-accent transition-colors flex-shrink-0" />
                              </div>

                              {/* Metadata row — THC, harvest, COA */}
                              <div className="flex items-center gap-3 px-3 pb-2.5 pt-0.5">
                                {batch.thc_percentage != null && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <span className="text-cult-text-faint">THC</span>
                                    <span className="font-semibold tabular-nums">{batch.thc_percentage}%</span>
                                  </span>
                                )}
                                {batch.thca_percentage != null && batch.thc_percentage == null && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <span className="text-cult-text-faint">THCa</span>
                                    <span className="font-semibold tabular-nums">{batch.thca_percentage}%</span>
                                  </span>
                                )}
                                {batch.total_cannabinoids != null && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <span className="text-cult-text-faint">Total</span>
                                    <span className="font-semibold tabular-nums">{batch.total_cannabinoids}%</span>
                                  </span>
                                )}
                                {harvestStr && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <Leaf className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
                                    <span className="text-cult-text-faint">Harvested</span>
                                    <span className="tabular-nums">{harvestStr}</span>
                                    {daysSinceHarvest != null && (
                                      <span className="text-cult-text-faint">({daysSinceHarvest}d ago)</span>
                                    )}
                                  </span>
                                )}
                                {batch.has_coa && (
                                  <span className="flex items-center gap-1 ml-auto">
                                    <FileCheck className="w-3 h-3 text-cult-success flex-shrink-0" />
                                    <span className="text-[10px] font-medium text-cult-success">
                                      COA {batch.coa_pass_fail === 'pass' ? 'Pass' : batch.coa_pass_fail === 'fail' ? 'Fail' : ''}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
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
                const prodHist = getProductHistoryData(product.id);
                const price = customerPrices?.get(product.id) ?? product.price_per_unit ?? 0;
                const format = product.name.replace(/^(Packaged|Prerolls)\s*-\s*[^-]+\s*-\s*/, '');
                const prerollMaterialStage = getMaterialBatchStage(product);
                const prerollBatches = [
                  ...(batchesByStage['packaged'] || []),
                  ...(batchesByStage[prerollMaterialStage] || []),
                ].filter((b, i, arr) => arr.findIndex(x => x.batch_id === b.batch_id && x.stage === b.stage) === i);
                const batchDetailKey = `preroll-${product.id}`;
                const qtyKey = `preroll-${product.id}`;
                const qtyVal = pendingQty[qtyKey] ?? '';
                const parsedQty = parseInt(qtyVal) || 1;
                const pipelineGrams = getPipelineGrams(product);
                const prerollReservation = productReservations?.get(product.id);
                const prerollReservedQty = prerollReservation?.reserved_qty ?? 0;
                const prerollStaticAvailable = prerollReservation?.net_available ?? (product.available_quantity ?? 0);
                const prerollUpstreamGrams = getUpstreamGrams();
                const prerollPipelineUnits = getPipelineAvailableUnits(0, pipelineGrams, product.name, prerollUpstreamGrams);
                const prerollNetAvailable = prerollPipelineUnits != null ? Math.max(prerollPipelineUnits - prerollReservedQty, 0) : prerollStaticAvailable;
                const prerollIsOverReserved = parsedQty > prerollNetAvailable && prerollNetAvailable >= 0;
                const prerollFullyReserved = prerollNetAvailable === 0 && prerollReservedQty > 0;

                return (
                  <div key={product.id}>
                    <div
                      className={`px-3 py-2.5 rounded-cult border transition-all ${
                        inCart
                          ? 'bg-cult-accent/5 border-cult-accent/20'
                          : prerollFullyReserved
                          ? 'bg-cult-danger/[0.03] border-cult-danger/20'
                          : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
                          {prodHist && (
                            <div className="flex items-center gap-1.5 text-[11px] text-cult-text-muted mt-0.5">
                              <Clock className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
                              <span className="font-medium tabular-nums">{Math.round(prodHist.total_quantity)} units</span>
                              <span className="text-cult-text-faint">·</span>
                              <span>{formatDaysAgo(prodHist.last_order_date)}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-caption text-cult-text-muted whitespace-nowrap">
                          {price > 0 ? `$${price.toFixed(2)}/g` : '—'}
                        </div>
                        <div className="text-right text-[10px] text-cult-text-faint whitespace-nowrap">
                          {pipelineGrams > 0 ? `${formatWeight(pipelineGrams)} in pipeline` : '0g'}
                        </div>
                      </div>

                      {/* Reservation availability row */}
                      {(prerollReservedQty > 0 || prerollReservation) && (
                        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                          <span className="text-cult-text-faint">
                            reserved: <span className="text-cult-warning font-semibold tabular-nums">{prerollReservedQty}</span>
                          </span>
                          <span className="text-cult-text-faint">·</span>
                          <span className={`font-semibold tabular-nums ${prerollNetAvailable > 0 ? 'text-cult-success' : 'text-cult-danger'}`}>
                            {prerollNetAvailable} net available
                          </span>
                          {prerollPipelineUnits != null && prerollPipelineUnits > 0 && prerollStaticAvailable === 0 && (
                            <span className="text-cult-text-muted">(from pipeline)</span>
                          )}
                          {prerollFullyReserved && (
                            <span className="flex items-center gap-0.5 text-cult-danger font-semibold ml-auto">
                              <AlertCircle className="w-3 h-3" />
                              fully reserved
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          min="1"
                          placeholder={prodHist ? String(Math.round(prodHist.total_quantity / prodHist.order_count)) : '1'}
                          value={qtyVal}
                          onChange={(e) => setPendingQty(prev => ({ ...prev, [qtyKey]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              onAddToCart(product, undefined, parsedQty);
                              setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                            }
                          }}
                          className="w-16 px-2 py-1.5 bg-cult-surface border border-cult-border rounded-cult text-body text-cult-text-primary text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {prodHist ? (
                          <span className="text-[10px] text-cult-text-muted tabular-nums" title="Average qty per order">
                            prev {Math.round(prodHist.total_quantity / prodHist.order_count)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-cult-text-faint">unit</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(product, undefined, parsedQty);
                            setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-cult-text-primary text-cult-surface rounded-cult hover:bg-cult-accent-hover active:scale-95 transition-all"
                        >
                          Add
                        </button>
                        {prerollIsOverReserved && (
                          <span className="flex items-center gap-0.5 text-[10px] text-cult-danger font-medium ml-auto">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            exceeds net available ({prerollNetAvailable})
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Batch selection — structured cards */}
                    {expandedBatchStage === batchDetailKey && prerollBatches.length > 0 && (
                      <div className="mt-2 mb-2 space-y-1.5">
                        <div className="flex items-center gap-2 px-1">
                          <div className="h-px flex-1 bg-cult-border" />
                          <span className="text-[10px] font-semibold text-cult-text-muted uppercase tracking-wider whitespace-nowrap">
                            {prerollBatches.length} batch{prerollBatches.length !== 1 ? 'es' : ''} available
                          </span>
                          <div className="h-px flex-1 bg-cult-border" />
                        </div>
                        {prerollBatches.map(batch => {
                          const isReady = batch.stage === 'packaged';
                          const harvestStr = batch.harvest_date
                            ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;
                          const daysSinceHarvest = batch.harvest_date
                            ? Math.floor((Date.now() - new Date(batch.harvest_date).getTime()) / 86400000)
                            : null;

                          return (
                            <button
                              key={`${batch.batch_id}-${batch.stage}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = parseInt(pendingQty[qtyKey]) || 1;
                                onAddToCart(product, {
                                  batch_id: batch.batch_id,
                                  batch_number: batch.batch_number,
                                  strain: batch.strain,
                                  grade_code: batch.grade_code,
                                  grade_label: batch.grade_label,
                                }, qty);
                                setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                              }}
                              className={`w-full text-left rounded-cult border transition-all group overflow-hidden ${
                                isReady
                                  ? 'bg-cult-success/[0.03] border-cult-success/20 hover:border-cult-success/40 hover:bg-cult-success/[0.06]'
                                  : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong hover:bg-cult-surface-overlay'
                              }`}
                            >
                              {/* Primary row — batch ID, stage, grade, weight */}
                              <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1">
                                <span className="font-mono text-[12px] font-semibold text-cult-text-primary tracking-tight">
                                  {batch.batch_number}
                                </span>
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-cult ${
                                  isReady
                                    ? 'bg-cult-success/15 text-cult-success'
                                    : 'bg-cult-surface-overlay text-cult-text-muted border border-cult-border'
                                }`}>
                                  {STAGE_LABELS[batch.stage] || batch.stage}
                                </span>
                                {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                                  <GradeBadge code={batch.grade_code} color={batch.grade_color} />
                                )}
                                <span className="ml-auto text-[13px] font-semibold text-cult-text-primary tabular-nums">
                                  {formatWeight(batch.available_weight_grams)}
                                </span>
                                <Plus className="w-3.5 h-3.5 text-cult-text-faint group-hover:text-cult-accent transition-colors flex-shrink-0" />
                              </div>

                              {/* Metadata row — THC, harvest, COA */}
                              <div className="flex items-center gap-3 px-3 pb-2.5 pt-0.5">
                                {batch.thc_percentage != null && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <span className="text-cult-text-faint">THC</span>
                                    <span className="font-semibold tabular-nums">{batch.thc_percentage}%</span>
                                  </span>
                                )}
                                {batch.thca_percentage != null && batch.thc_percentage == null && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <span className="text-cult-text-faint">THCa</span>
                                    <span className="font-semibold tabular-nums">{batch.thca_percentage}%</span>
                                  </span>
                                )}
                                {batch.total_cannabinoids != null && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <span className="text-cult-text-faint">Total</span>
                                    <span className="font-semibold tabular-nums">{batch.total_cannabinoids}%</span>
                                  </span>
                                )}
                                {harvestStr && (
                                  <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                    <Leaf className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
                                    <span className="text-cult-text-faint">Harvested</span>
                                    <span className="tabular-nums">{harvestStr}</span>
                                    {daysSinceHarvest != null && (
                                      <span className="text-cult-text-faint">({daysSinceHarvest}d ago)</span>
                                    )}
                                  </span>
                                )}
                                {batch.has_coa && (
                                  <span className="flex items-center gap-1 ml-auto">
                                    <FileCheck className="w-3 h-3 text-cult-success flex-shrink-0" />
                                    <span className="text-[10px] font-medium text-cult-success">
                                      COA {batch.coa_pass_fail === 'pass' ? 'Pass' : batch.coa_pass_fail === 'fail' ? 'Fail' : ''}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
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
            : `Bulk — ${stageKey}`;
          const totalAvail = getStageAvailableGrams(stageKey);

          return (
            <div key={stageKey}>
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-3.5 h-3.5 text-cult-text-muted" />
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
                  const prodHist = getProductHistoryData(product.id);
                  const price = customerPrices?.get(product.id) ?? product.price_per_unit ?? 0;

                  const nameParts = product.name.split(' - ');
                  const materialType = nameParts[nameParts.length - 1] || product.name;

                  const materialStage = getMaterialBatchStage(product);
                  const stageBatches = batchesByStage[materialStage] || [];
                  const materialAvail = stageBatches.reduce((s, b) => s + b.available_weight_grams, 0);
                  const batchDetailKey = `${stageKey}-${materialType}`;
                  const qtyKey = `bulk-${product.id}`;
                  const qtyVal = pendingQty[qtyKey] ?? '';
                  const parsedQty = parseFloat(qtyVal) || 1;

                  return (
                    <div key={product.id}>
                      <div
                        className={`px-3 py-2.5 rounded-cult border transition-all ${
                          inCart
                            ? 'bg-cult-accent/5 border-cult-accent/20'
                            : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-3">
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
                            {prodHist && (
                              <div className="flex items-center gap-1.5 text-[11px] text-cult-text-muted mt-0.5">
                                <Clock className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
                                <span className="font-medium tabular-nums">{Math.round(prodHist.total_quantity)} units</span>
                                <span className="text-cult-text-faint">·</span>
                                <span>{formatDaysAgo(prodHist.last_order_date)}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-caption text-cult-text-muted whitespace-nowrap">
                            {price > 0 ? `$${price.toFixed(2)}/lb` : '—'}
                          </div>
                          <div className="text-right text-[10px] text-cult-text-faint whitespace-nowrap">
                            {formatWeight(materialAvail)} available
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="number"
                            min="0.25"
                            step="0.25"
                            placeholder={prodHist ? String(parseFloat((prodHist.total_quantity / prodHist.order_count).toFixed(2))) : '1'}
                            value={qtyVal}
                            onChange={(e) => setPendingQty(prev => ({ ...prev, [qtyKey]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                onAddToCart(product, undefined, parsedQty);
                                setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                              }
                            }}
                            className="w-16 px-2 py-1.5 bg-cult-surface border border-cult-border rounded-cult text-body text-cult-text-primary text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {prodHist ? (
                            <span className="text-[10px] text-cult-text-muted tabular-nums" title="Average qty per order">
                              prev {parseFloat((prodHist.total_quantity / prodHist.order_count).toFixed(2))}
                            </span>
                          ) : (
                            <span className="text-[10px] text-cult-text-faint">lb</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onAddToCart(product, undefined, parsedQty);
                              setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                            }}
                            className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-cult-text-primary text-cult-surface rounded-cult hover:bg-cult-accent-hover active:scale-95 transition-all"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Batch selection — card-style rows */}
                      {/* Batch selection — structured cards */}
                      {expandedBatchStage === batchDetailKey && stageBatches.length > 0 && (
                        <div className="mt-2 mb-2 space-y-1.5">
                          <div className="flex items-center gap-2 px-1">
                            <div className="h-px flex-1 bg-cult-border" />
                            <span className="text-[10px] font-semibold text-cult-text-muted uppercase tracking-wider whitespace-nowrap">
                              {stageBatches.length} batch{stageBatches.length !== 1 ? 'es' : ''} available
                            </span>
                            <div className="h-px flex-1 bg-cult-border" />
                          </div>
                          {stageBatches.map(batch => {
                            const harvestStr = batch.harvest_date
                              ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : null;
                            const daysSinceHarvest = batch.harvest_date
                              ? Math.floor((Date.now() - new Date(batch.harvest_date).getTime()) / 86400000)
                              : null;

                            return (
                              <button
                                key={`${batch.batch_id}-${batch.stage}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const qty = parseFloat(pendingQty[qtyKey]) || 1;
                                  onAddToCart(product, {
                                    batch_id: batch.batch_id,
                                    batch_number: batch.batch_number,
                                    strain: batch.strain,
                                    grade_code: batch.grade_code,
                                    grade_label: batch.grade_label,
                                  }, qty);
                                  setPendingQty(prev => { const n = { ...prev }; delete n[qtyKey]; return n; });
                                }}
                                className="w-full text-left rounded-cult border bg-cult-surface-raised border-cult-border hover:border-cult-border-strong hover:bg-cult-surface-overlay transition-all group overflow-hidden"
                              >
                                {/* Primary row — batch ID, grade, weight */}
                                <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1">
                                  <span className="font-mono text-[12px] font-semibold text-cult-text-primary tracking-tight">
                                    {batch.batch_number}
                                  </span>
                                  {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                                    <GradeBadge code={batch.grade_code} color={batch.grade_color} />
                                  )}
                                  <span className="ml-auto text-[13px] font-semibold text-cult-text-primary tabular-nums">
                                    {formatWeight(batch.available_weight_grams)}
                                  </span>
                                  <Plus className="w-3.5 h-3.5 text-cult-text-faint group-hover:text-cult-accent transition-colors flex-shrink-0" />
                                </div>

                                {/* Metadata row — THC, harvest, COA */}
                                <div className="flex items-center gap-3 px-3 pb-2.5 pt-0.5">
                                  {batch.thc_percentage != null && (
                                    <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                      <span className="text-cult-text-faint">THC</span>
                                      <span className="font-semibold tabular-nums">{batch.thc_percentage}%</span>
                                    </span>
                                  )}
                                  {batch.thca_percentage != null && batch.thc_percentage == null && (
                                    <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                      <span className="text-cult-text-faint">THCa</span>
                                      <span className="font-semibold tabular-nums">{batch.thca_percentage}%</span>
                                    </span>
                                  )}
                                  {batch.total_cannabinoids != null && (
                                    <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                      <span className="text-cult-text-faint">Total</span>
                                      <span className="font-semibold tabular-nums">{batch.total_cannabinoids}%</span>
                                    </span>
                                  )}
                                  {harvestStr && (
                                    <span className="flex items-center gap-1 text-[10px] text-cult-text-secondary">
                                      <Leaf className="w-3 h-3 text-cult-text-faint flex-shrink-0" />
                                      <span className="text-cult-text-faint">Harvested</span>
                                      <span className="tabular-nums">{harvestStr}</span>
                                      {daysSinceHarvest != null && (
                                        <span className="text-cult-text-faint">({daysSinceHarvest}d ago)</span>
                                      )}
                                    </span>
                                  )}
                                  {batch.has_coa && (
                                    <span className="flex items-center gap-1 ml-auto">
                                      <FileCheck className="w-3 h-3 text-cult-success flex-shrink-0" />
                                      <span className="text-[10px] font-medium text-cult-success">
                                        COA {batch.coa_pass_fail === 'pass' ? 'Pass' : batch.coa_pass_fail === 'fail' ? 'Fail' : ''}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
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
  productReservations,
  onAddToCart,
}: StrainCatalogProps) {
  const { strains, loading: strainsLoading, error: strainsError } = useStrainInventorySummary();
  const { strainHistory, productHistory } = useCustomerOrderHistory(customerId);
  const { demandMap } = useStrainDemandPressure();
  const { byStrain: skuByStrain } = useSkuYield();

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
        productReservations={productReservations}
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
                skuAllocation={skuByStrain.get(summary.strain)}
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
