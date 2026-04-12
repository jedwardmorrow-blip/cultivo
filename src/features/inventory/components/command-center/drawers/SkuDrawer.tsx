import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ExternalLink } from 'lucide-react';
import { useSkuDrawerData, type SkuPackage } from '../../../hooks/useSkuDrawerData';

function formatUsd(v: number): string {
  if (v === 0) return '$0';
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

interface SkuDrawerProps {
  productId: string | null;
  onClose: () => void;
  onBatchClick?: (batchId: string) => void;
}

export function SkuDrawer({ productId, onClose, onBatchClick }: SkuDrawerProps) {
  const { sku, packages, loading } = useSkuDrawerData(productId);
  const isOpen = productId !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const totalOnHand = packages.reduce((s, p) => s + p.on_hand_qty, 0);
  const totalReserved = packages.reduce((s, p) => s + p.reserved_qty, 0);
  const totalValue = sku ? totalOnHand * sku.price_per_unit : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg glass-modal border-l border-cult-border z-50 flex flex-col shadow-glass-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sku-drawer-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border-subtle">
              <div className="min-w-0">
                {loading ? (
                  <div className="h-6 w-40 rounded bg-cult-surface-raised animate-pulse" />
                ) : sku ? (
                  <>
                    <h2 id="sku-drawer-title" className="text-lg font-bold text-white truncate">
                      {sku.product_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-white/50">{sku.strain}</span>
                      {sku.sku && (
                        <span className="text-[10px] text-white/30 font-mono bg-cult-surface-raised px-2 py-0.5 rounded-full">
                          {sku.sku}
                        </span>
                      )}
                      <span className="text-[10px] text-white/30 bg-cult-surface-raised px-2 py-0.5 rounded-full">
                        {sku.unit_weight_grams}g
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-white/30">SKU not found</span>
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {loading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-xl bg-cult-near-black animate-pulse" />
                    ))}
                  </div>
                  <div className="h-32 rounded-xl bg-cult-near-black animate-pulse" />
                </div>
              ) : sku ? (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle text-center">
                      <span className="text-[10px] text-white/40 uppercase">On Hand</span>
                      <p className="text-2xl font-bold text-white tabular-nums mt-1">{totalOnHand}</p>
                    </div>
                    <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle text-center">
                      <span className="text-[10px] text-white/40 uppercase">Reserved</span>
                      <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{totalReserved}</p>
                    </div>
                    <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle text-center">
                      <span className="text-[10px] text-white/40 uppercase">Value</span>
                      <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{formatUsd(totalValue)}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle flex items-center justify-between">
                    <span className="text-xs text-white/40">List Price</span>
                    <span className="text-sm font-medium text-white tabular-nums">
                      {formatUsd(sku.price_per_unit)}/unit
                    </span>
                  </div>

                  {/* Packages list */}
                  <div>
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                      Packages ({packages.length})
                    </span>
                    {packages.length === 0 ? (
                      <div className="rounded-xl bg-cult-surface-inset border border-cult-border-faint p-6 text-center mt-2">
                        <p className="text-white/30 text-sm">No packages with on-hand inventory</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 mt-2">
                        {packages.map((pkg, i) => (
                          <PackageRow
                            key={pkg.id}
                            pkg={pkg}
                            index={i}
                            onBatchClick={onBatchClick}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">Could not load SKU data</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PackageRow({
  pkg,
  index,
  onBatchClick,
}: {
  pkg: SkuPackage;
  index: number;
  onBatchClick?: (batchId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="flex items-center gap-3 bg-cult-surface-subtle rounded-xl p-3 border border-cult-border-subtle"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white font-mono truncate">{pkg.package_id}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <button
            onClick={() => onBatchClick?.(pkg.batch_id)}
            className="text-[10px] text-white/30 hover:text-white/50 transition-colors flex items-center gap-1 group"
          >
            {pkg.batch_code}
            <ExternalLink className="w-2.5 h-2.5 text-white/0 group-hover:text-white/30 transition-colors" />
          </button>
          <span className="text-[10px] text-white/20">
            {new Date(pkg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className="text-sm font-medium text-white tabular-nums">{pkg.on_hand_qty}</span>
        <span className="text-[10px] text-white/30 ml-1">on hand</span>
      </div>

      {pkg.reserved_qty > 0 && (
        <span className="text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full tabular-nums shrink-0">
          {pkg.reserved_qty} rsv
        </span>
      )}
    </motion.div>
  );
}
