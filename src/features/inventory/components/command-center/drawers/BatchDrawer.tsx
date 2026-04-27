import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Calendar, Package, TrendingUp, Layers,
  Printer, CheckSquare, Square, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useBatchDrawerData, type PackageRow } from '../../../hooks/useBatchDrawerData';
import { useInventoryLabel } from '../../../hooks';
import { InventoryLabelPrintModal } from '../../InventoryLabelPrintModal';
import { PIPELINE_STAGES, type PipelineStage } from '../../../hooks/usePipelineBatches';
import type { BatchDetailRow } from '../../../hooks/useBatchDetail';

// ─── Helpers ──────────────────────────────────────────────────────────────

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function formatUsd(v: number): string {
  if (v === 0) return '$0';
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function ageColor(days: number): string {
  if (days < 30) return 'text-emerald-400';
  if (days < 60) return 'text-amber-400';
  return 'text-rose-400';
}

function getStageWeight(batch: BatchDetailRow, stage: PipelineStage): number {
  const map: Record<PipelineStage, number> = {
    binned: batch.binned_g,
    bucked: batch.bucked_g,
    bulk_flower: batch.bulk_flower_g,
    bulk_smalls: batch.bulk_smalls_g,
    trim: batch.trim_g,
    packaged: batch.packaged_g,
    shipped: batch.shipped_g,
  };
  return map[stage];
}

const LIFECYCLE_LABELS: Record<string, string> = {
  growing: 'Growing',
  drying: 'Drying',
  binned: 'Binned',
  curing: 'Curing',
  bucked: 'Bucked',
  trimming: 'Trimming',
  trimmed: 'Trimmed',
  bulk_available: 'Bulk Available',
  packaging: 'Packaging',
  packaged: 'Packaged',
  completed: 'Completed',
  depleted: 'Depleted',
  archived: 'Archived',
};

// ─── Main Drawer ─────────────────────────────────────────────────────────

interface BatchDrawerProps {
  batchId: string | null;
  onClose: () => void;
}

export function BatchDrawer({ batchId, onClose }: BatchDrawerProps) {
  const { batch, packages, allocations, loading, refetch } = useBatchDrawerData(batchId);
  const isOpen = batchId !== null;

  // Keyboard dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl glass-modal border-l border-cult-border z-50 flex flex-col shadow-glass-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-drawer-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border-subtle">
              <div className="min-w-0">
                {loading ? (
                  <div className="h-6 w-40 rounded bg-cult-surface-raised animate-pulse" />
                ) : batch ? (
                  <>
                    <h2 id="batch-drawer-title" className="text-lg font-bold text-white font-mono truncate">
                      {batch.batch_code}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-white/50">{batch.strain_name}</span>
                      <span className="text-[10px] text-white/30 bg-cult-surface-raised px-2 py-0.5 rounded-full">
                        {LIFECYCLE_LABELS[batch.lifecycle_state] ?? batch.lifecycle_state}
                      </span>
                      {batch.quality_grade && (
                        <span className="inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                          {batch.quality_grade}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-white/30">Batch not found</span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close drawer"
                className="p-2 rounded-xl hover:bg-cult-surface-overlay transition-colors text-white/40 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {loading ? (
                <DrawerSkeleton />
              ) : batch ? (
                <>
                  <StageProgressionBar batch={batch} />
                  <WeightKpis batch={batch} />
                  <WeightLedger batch={batch} />
                  <PackagesSection packages={packages} batchCode={batch.batch_code} strainName={batch.strain_name} />
                  <AllocationsSection allocations={allocations} />
                  <MetadataSection batch={batch} />
                </>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">Could not load batch data</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Stage Progression Bar ───────────────────────────────────────────────

function StageProgressionBar({ batch }: { batch: BatchDetailRow }) {
  const stages = PIPELINE_STAGES.map((s) => ({
    ...s,
    weight: getStageWeight(batch, s.key),
  }));
  const total = batch.total_potential_g || 1;

  return (
    <div>
      <span className="text-xs text-white/40 uppercase tracking-wider">Stage Distribution</span>
      <div className="flex h-4 rounded-xl overflow-hidden bg-cult-near-black mt-2">
        {stages
          .filter((s) => s.weight > 0)
          .map((s) => (
            <div
              key={s.key}
              className="h-full first:rounded-l-xl last:rounded-r-xl relative group"
              style={{
                width: `${Math.max((s.weight / total) * 100, 2)}%`,
                backgroundColor: s.color,
                opacity: 0.6,
              }}
              title={`${s.label}: ${gramsToLbs(s.weight)} lbs`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {stages
          .filter((s) => s.weight > 0)
          .map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[10px] text-white/50">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, opacity: 0.75 }} />
              {s.label} — {gramsToLbs(s.weight)} lbs
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── Weight KPIs ─────────────────────────────────────────────────────────

function WeightKpis({ batch }: { batch: BatchDetailRow }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Sellable</span>
        <p className="text-lg font-bold text-emerald-400 tabular-nums mt-0.5">
          {gramsToLbs(batch.sellable_now_g)} lbs
        </p>
      </div>
      <div className="bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Pipeline</span>
        <p className="text-lg font-bold text-amber-400 tabular-nums mt-0.5">
          {gramsToLbs(batch.pipeline_raw_g)} lbs
        </p>
      </div>
      <div className="bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Sold</span>
        <p className="text-lg font-bold text-white tabular-nums mt-0.5">
          {formatUsd(batch.sold_value)}
        </p>
      </div>
    </div>
  );
}

// ─── Weight Ledger ───────────────────────────────────────────────────────

function WeightLedger({ batch }: { batch: BatchDetailRow }) {
  const rows = [
    { label: 'Binned', value: batch.binned_g },
    { label: 'Bucked', value: batch.bucked_g },
    { label: 'Flower', value: batch.bulk_flower_g },
    { label: 'Smalls', value: batch.bulk_smalls_g },
    { label: 'Trim', value: batch.trim_g },
    { label: 'Packaged', value: batch.packaged_g },
    { label: 'Shipped', value: batch.shipped_g },
    { label: 'Waste', value: batch.waste_grams },
  ].filter((r) => r.value > 0);

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Weight Ledger</span>
      </div>
      <div className="bg-cult-surface-subtle rounded-xl border border-cult-border-subtle divide-y divide-cult-border-faint">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-white/50">{r.label}</span>
            <span className="text-xs text-white font-medium tabular-nums">{gramsToLbs(r.value)} lbs</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2 bg-cult-surface-inset">
          <span className="text-xs text-white/70 font-medium">Total Potential</span>
          <span className="text-sm text-white font-bold tabular-nums">{gramsToLbs(batch.total_potential_g)} lbs</span>
        </div>
      </div>
    </div>
  );
}

// ─── Packages Section (Decision #22) ─────────────────────────────────────

function PackagesSection({
  packages,
  batchCode,
  strainName,
}: {
  packages: PackageRow[];
  batchCode: string;
  strainName: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const labelHook = useInventoryLabel();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === packages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(packages.map((p) => p.id)));
    }
  };

  const handlePrintLabel = (pkg: PackageRow) => {
    labelHook.openLabel({
      id: pkg.id,
      package_id: pkg.id,
      product_id: '',
      product_name: `${pkg.product_type} ${pkg.unit_size}`,
      strain: strainName,
      batch: batchCode,
      batch_id: '',
      batch_number: batchCode,
      on_hand_qty: pkg.units_available,
      category: 'packaged',
      room: null,
    } as any);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={`Packages (${packages.length})`}
          className="flex items-center gap-2 group"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
          )}
          <Package className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
            Packages ({packages.length})
          </span>
        </button>
        {selectedIds.size > 0 && expanded && (
          <button
            onClick={() => {
              console.log('Bulk print', Array.from(selectedIds));
            }}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
          >
            <Printer className="w-3 h-3" />
            Print {selectedIds.size} label{selectedIds.size > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {expanded && (
        <AnimatePresence>
          {packages.length === 0 ? (
            <div className="rounded-xl bg-cult-surface-inset border border-cult-border-faint p-6 text-center">
              <p className="text-white/30 text-sm">No packages created from this batch yet.</p>
            </div>
          ) : (
            <div className="bg-cult-surface-subtle rounded-xl border border-cult-border-subtle divide-y divide-cult-border-faint">
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-2">
                <button
                  onClick={toggleAll}
                  aria-label={selectedIds.size === packages.length ? 'Deselect all packages' : 'Select all packages'}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  {selectedIds.size === packages.length ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="text-[10px] text-white/30 uppercase tracking-wider flex-1">Product</span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider w-20 text-right">Count</span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider w-20 text-right">Avail</span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider w-20 text-right">Date</span>
                <span className="w-8" />
              </div>

              {/* Package rows */}
              {packages.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-cult-surface-subtle transition-colors"
                >
                  <button
                    onClick={() => toggleSelect(pkg.id)}
                    aria-label={`${selectedIds.has(pkg.id) ? 'Deselect' : 'Select'} package`}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    {selectedIds.has(pkg.id) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-white capitalize">
                      {pkg.product_type}
                    </span>
                    <span className="text-[10px] text-white/30 ml-1.5">{pkg.unit_size}</span>
                  </div>
                  <span className="text-xs text-white tabular-nums w-20 text-right">
                    {pkg.units_count}
                  </span>
                  <span className="text-xs tabular-nums w-20 text-right">
                    <span className={pkg.units_available > 0 ? 'text-emerald-400' : 'text-white/30'}>
                      {pkg.units_available}
                    </span>
                    {pkg.units_allocated > 0 && (
                      <span className="text-amber-400/70 text-[10px] ml-1">({pkg.units_allocated} rsv)</span>
                    )}
                  </span>
                  <span className="text-[10px] text-white/30 tabular-nums w-20 text-right">
                    {pkg.package_date
                      ? new Date(pkg.package_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : new Date(pkg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handlePrintLabel(pkg)}
                    aria-label="Print label"
                    className="p-1.5 rounded-lg hover:bg-cult-surface-overlay transition-colors text-white/30 hover:text-white/60"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Label print modal (reuses existing component) */}
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
    </div>
  );
}

// ─── Allocations Section ─────────────────────────────────────────────────

function AllocationsSection({ allocations }: { allocations: BatchAllocation[] }) {
  if (allocations.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
          Allocations ({allocations.length})
        </span>
      </div>
      <div className="bg-cult-surface-subtle rounded-xl border border-cult-border-subtle divide-y divide-cult-border-faint">
        {allocations.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white font-mono">{a.order_number}</span>
              <span className="text-[9px] text-white/30 capitalize">{a.allocation_stage}</span>
              {a.fulfilled_at ? (
                <span className="text-[9px] px-1.5 py-px rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  Fulfilled
                </span>
              ) : a.status === 'active' ? (
                <span className="text-[9px] px-1.5 py-px rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  Active
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-px rounded-full bg-white/10 text-white/40 border border-white/10">
                  {a.status}
                </span>
              )}
            </div>
            <span className="text-xs text-white/50 tabular-nums">
              {gramsToLbs(a.allocated_weight_grams)} lbs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metadata Section ────────────────────────────────────────────────────

function MetadataSection({ batch }: { batch: BatchDetailRow }) {
  return (
    <div className="space-y-2 pt-2 border-t border-cult-border-faint">
      {batch.harvest_date && (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40">
            Harvested {new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
          </span>
        </div>
      )}
      {batch.age_days > 0 && (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-white/30" />
          <span className={`text-xs ${ageColor(batch.age_days)}`}>
            {batch.age_days} days old
          </span>
          {batch.days_in_stage > 0 && (
            <span className="text-xs text-white/20">· {batch.days_in_stage}d in current stage</span>
          )}
        </div>
      )}
      {batch.packaging_started_at && (
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40">
            Packaging started {new Date(batch.packaging_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
      {batch.completed_at && (
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-emerald-400/50" />
          <span className="text-xs text-emerald-400/60">
            Completed {new Date(batch.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 rounded bg-cult-near-black animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-cult-near-black animate-pulse" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-cult-near-black animate-pulse" />
      <div className="h-24 rounded-xl bg-cult-near-black animate-pulse" />
    </div>
  );
}
