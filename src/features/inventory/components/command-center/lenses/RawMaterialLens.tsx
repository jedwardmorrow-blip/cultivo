import { motion } from 'framer-motion';
import { Layers, Clock, Package } from 'lucide-react';
import { useRawMaterial } from '../../../hooks/useRawMaterial';
import type { BatchDetailRow } from '../../../hooks/useBatchDetail';

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function ageColor(days: number): string {
  if (days < 30) return 'text-emerald-400';
  if (days < 60) return 'text-amber-400';
  return 'text-rose-400';
}

function ageBg(days: number): string {
  if (days < 30) return 'bg-emerald-500/15 border-emerald-500/20';
  if (days < 60) return 'bg-amber-500/15 border-amber-500/20';
  return 'bg-rose-500/15 border-rose-500/20';
}

const STAGE_CHIPS: { key: keyof BatchDetailRow; label: string; color: string }[] = [
  { key: 'binned_g', label: 'Binned', color: '#6B7280' },
  { key: 'bucked_g', label: 'Bucked', color: '#0EA5E9' },
  { key: 'bulk_flower_g', label: 'Flower', color: '#F43F5E' },
  { key: 'bulk_smalls_g', label: 'Smalls', color: '#F59E0B' },
  { key: 'trim_g', label: 'Trim', color: '#10B981' },
];

interface RawMaterialLensProps {
  onBatchClick?: (batchId: string) => void;
}

export function RawMaterialLens({ onBatchClick }: RawMaterialLensProps) {
  const { batches, loading } = useRawMaterial();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass-card p-4 h-[72px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Layers className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/50 font-medium">All raw material processed</p>
        <p className="text-white/30 text-sm mt-1">Queue clear.</p>
      </div>
    );
  }

  // Aggregate
  const totalRaw = batches.reduce(
    (s, b) => s + b.binned_g + b.bucked_g + b.bulk_flower_g + b.bulk_smalls_g + b.trim_g,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="bg-cult-near-black rounded-xl px-4 py-3 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Queue</span>
          <p className="text-lg font-bold text-white tabular-nums">{batches.length} batches</p>
        </div>
        <div className="bg-cult-near-black rounded-xl px-4 py-3 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Raw Weight</span>
          <p className="text-lg font-bold text-amber-400 tabular-nums">{gramsToLbs(totalRaw)} lbs</p>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-white/20 uppercase tracking-wider">Oldest first (FIFO)</span>
      </div>

      {/* FIFO queue */}
      <div className="space-y-1.5">
        {batches.map((batch, i) => (
          <motion.button
            key={batch.batch_id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onBatchClick?.(batch.batch_id)}
            className="w-full flex items-center gap-3 bg-cult-surface-subtle rounded-xl p-3 border border-cult-border-subtle hover:bg-cult-surface-raised hover:border-cult-border transition-all active:scale-[0.995]"
          >
            {/* Age badge */}
            <span
              className={`shrink-0 w-12 text-center py-1 rounded-lg text-[10px] font-bold tabular-nums border ${ageBg(batch.age_days)} ${ageColor(batch.age_days)}`}
            >
              {batch.age_days}d
            </span>

            {/* Batch + strain */}
            <div className="min-w-0 w-[140px] shrink-0 text-left">
              <span className="text-xs font-medium text-white font-mono truncate block">
                {batch.batch_code}
              </span>
              <span className="text-[10px] text-white/30 truncate block">{batch.strain_name}</span>
            </div>

            {/* Stage chips */}
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              {STAGE_CHIPS.map((chip) => {
                const weight = batch[chip.key] as number;
                if (weight <= 0) return null;
                return (
                  <span
                    key={chip.key}
                    className="flex items-center gap-1 text-[10px] text-white/50"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: chip.color, opacity: 0.75 }}
                    />
                    {chip.label} {gramsToLbs(weight)}
                  </span>
                );
              })}
            </div>

            {/* Lifecycle state */}
            <span className="text-[10px] text-white/20 shrink-0">
              {batch.lifecycle_state}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
