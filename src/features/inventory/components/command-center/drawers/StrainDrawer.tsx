import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Dna, Calendar, Clock, ExternalLink, TrendingUp,
} from 'lucide-react';
import { useStrainDrawerData } from '../../../hooks/useStrainDrawerData';
import type { BatchDetailRow } from '../../../hooks/useBatchDetail';

// ─── Helpers ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  sativa: '#10B981',
  indica: '#8B5CF6',
  hybrid: '#F59E0B',
};

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

// ─── Main Drawer ─────────────────────────────────────────────────────────

interface StrainDrawerProps {
  strainId: string | null;
  onClose: () => void;
  onBatchClick?: (batchId: string) => void;
}

export function StrainDrawer({ strainId, onClose, onBatchClick }: StrainDrawerProps) {
  const { strain, batches, loading } = useStrainDrawerData(strainId);
  const isOpen = strainId !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Aggregate batch stats
  const totalWeight = batches.reduce((s, b) => s + b.total_potential_g, 0);
  const totalSellable = batches.reduce((s, b) => s + b.sellable_now_g, 0);
  const totalSold = batches.reduce((s, b) => s + b.sold_value, 0);
  const estimatedValue = strain?.forecast_price_per_gram
    ? totalSellable * strain.forecast_price_per_gram
    : 0;

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
            className="fixed top-0 right-0 h-full w-full max-w-2xl glass-modal border-l border-cult-border z-50 flex flex-col shadow-glass-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="strain-drawer-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border-subtle">
              <div className="min-w-0">
                {loading ? (
                  <div className="h-6 w-40 rounded bg-cult-surface-raised animate-pulse" />
                ) : strain ? (
                  <>
                    <h2 id="strain-drawer-title" className="text-lg font-bold text-white truncate">
                      {strain.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {strain.abbreviation && (
                        <span className="text-xs text-white/30 font-mono">{strain.abbreviation}</span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          color: CATEGORY_COLORS[strain.category ?? ''] ?? '#666',
                          backgroundColor: `${CATEGORY_COLORS[strain.category ?? ''] ?? '#666'}20`,
                        }}
                      >
                        {strain.category ?? '—'}
                      </span>
                      {!strain.is_active && (
                        <span className="text-[9px] px-1.5 py-px rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">
                          Inactive
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-white/30">Strain not found</span>
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
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-xl bg-cult-near-black animate-pulse" />
                    ))}
                  </div>
                  <div className="h-32 rounded-xl bg-cult-near-black animate-pulse" />
                </div>
              ) : strain ? (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">Total Weight</span>
                      <p className="text-xl font-bold text-white tabular-nums mt-1">
                        {gramsToLbs(totalWeight)} lbs
                      </p>
                      <p className="text-[10px] text-white/30 tabular-nums">
                        {gramsToLbs(totalSellable)} lbs sellable
                      </p>
                    </div>
                    <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">Est. Value</span>
                      <p className="text-xl font-bold text-emerald-400 tabular-nums mt-1">
                        {formatUsd(estimatedValue)}
                      </p>
                      {strain.forecast_price_per_gram != null && (
                        <p className="text-[10px] text-white/30 tabular-nums">
                          ${strain.forecast_price_per_gram.toFixed(2)}/g
                        </p>
                      )}
                    </div>
                    <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">Sold</span>
                      <p className="text-xl font-bold text-white tabular-nums mt-1">
                        {formatUsd(totalSold)}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {batches.length} active batch{batches.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Weight breakdown */}
                  <WeightBreakdown batches={batches} />

                  {/* Batches list */}
                  <div>
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                      Active Batches
                    </span>
                    {batches.length === 0 ? (
                      <div className="rounded-xl bg-cult-surface-inset border border-cult-border-faint p-6 text-center mt-2">
                        <p className="text-white/30 text-sm">No active batches</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 mt-2">
                        {batches.map((b, i) => (
                          <motion.button
                            key={b.batch_id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.25 }}
                            onClick={() => onBatchClick?.(b.batch_id)}
                            className="w-full flex items-center gap-3 bg-cult-surface-subtle rounded-xl p-3 border border-cult-border-subtle hover:bg-cult-surface-raised hover:border-cult-border transition-all active:scale-[0.995] group"
                          >
                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-white font-mono">{b.batch_code}</span>
                                <ExternalLink className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors" />
                              </div>
                              <span className="text-[10px] text-white/30">{b.lifecycle_state}</span>
                            </div>
                            <span className="text-xs text-white font-medium tabular-nums">
                              {gramsToLbs(b.total_potential_g)} lbs
                            </span>
                            {b.age_days > 0 && (
                              <span className={`text-[10px] tabular-nums ${ageColor(b.age_days)}`}>
                                {b.age_days}d
                              </span>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Strain metadata */}
                  <StrainMetadata strain={strain} />
                </>
              ) : (
                <div className="text-center py-12">
                  <Dna className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">Could not load strain data</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Weight Breakdown ────────────────────────────────────────────────────

function WeightBreakdown({ batches }: { batches: BatchDetailRow[] }) {
  const stages = [
    { label: 'Flower', value: batches.reduce((s, b) => s + b.bulk_flower_g, 0), color: '#F43F5E' },
    { label: 'Smalls', value: batches.reduce((s, b) => s + b.bulk_smalls_g, 0), color: '#F59E0B' },
    { label: 'Trim', value: batches.reduce((s, b) => s + b.trim_g, 0), color: '#10B981' },
    { label: 'Bucked', value: batches.reduce((s, b) => s + b.bucked_g, 0), color: '#0EA5E9' },
    { label: 'Packaged', value: batches.reduce((s, b) => s + b.packaged_g, 0), color: '#8B5CF6' },
    { label: 'Shipped', value: batches.reduce((s, b) => s + b.shipped_g, 0), color: '#6366F1' },
  ].filter((s) => s.value > 0);

  if (stages.length === 0) return null;

  const total = stages.reduce((s, st) => s + st.value, 0);

  return (
    <div>
      <span className="text-xs text-white/40 uppercase tracking-wider">Weight by Stage</span>
      <div className="flex h-3 rounded-full overflow-hidden bg-cult-near-black mt-2">
        {stages.map((s) => (
          <div
            key={s.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, opacity: 0.65 }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {stages.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, opacity: 0.75 }} />
            {s.label} — {gramsToLbs(s.value)} lbs
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Strain Metadata ─────────────────────────────────────────────────────

function StrainMetadata({ strain }: { strain: { thc_range: string | null; cbd_range: string | null; flowering_time_days: number | null; forecast_price_per_gram: number | null } }) {
  const items = [
    strain.thc_range ? { label: 'THC Range', value: strain.thc_range } : null,
    strain.cbd_range ? { label: 'CBD Range', value: strain.cbd_range } : null,
    strain.flowering_time_days ? { label: 'Flowering Time', value: `${strain.flowering_time_days} days` } : null,
    strain.forecast_price_per_gram ? { label: 'Forecast Price', value: `$${strain.forecast_price_per_gram.toFixed(2)}/g` } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className="pt-2 border-t border-cult-border-faint">
      <span className="text-xs text-white/40 uppercase tracking-wider">Strain Details</span>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {items.map((item) => (
          <div key={item.label} className="bg-cult-surface-subtle rounded-lg p-2.5 border border-cult-border-faint">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">{item.label}</span>
            <p className="text-xs text-white/70 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
