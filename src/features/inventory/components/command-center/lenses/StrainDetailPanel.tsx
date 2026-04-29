import { motion } from 'framer-motion';
import { Package, Calendar, Layers, ExternalLink, Clock, TrendingUp } from 'lucide-react';
import type { StrainInventoryRow } from '../../../hooks/useStrainInventory';
import type { BatchDetailRow } from '../../../hooks/useBatchDetail';
import { GradeDonut, type DonutSegment } from '../GradeDonut';

const CATEGORY_COLORS: Record<string, string> = {
  sativa: '#10B981',
  indica: '#8B5CF6',
  hybrid: '#F59E0B',
};

const STAGE_COLORS: Record<string, string> = {
  flower: '#F43F5E',
  smalls: '#F59E0B',
  trim: '#10B981',
  bucked: '#0EA5E9',
  packaged: '#8B5CF6',
  shipped: '#6366F1',
};

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

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function formatUsd(v: number): string {
  if (v === 0) return '$0';
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function harvestAge(dateStr: string | null): string {
  if (!dateStr) return '—';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  return `${days}d ago`;
}

function ageColor(days: number): string {
  if (days < 30) return 'text-emerald-400';
  if (days < 60) return 'text-amber-400';
  return 'text-rose-400';
}

function confidenceBadge(confidence: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', label: 'High' },
    medium: { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'Med' },
    low: { bg: 'bg-rose-500/15', text: 'text-rose-300', label: 'Low' },
  };
  const c = map[confidence] ?? map.low;
  return (
    <span className={`inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-medium border ${c.bg} ${c.text} border-current/20`}>
      {c.label}
    </span>
  );
}

interface StrainDetailPanelProps {
  strain: StrainInventoryRow;
  batches: BatchDetailRow[];
  batchLoading: boolean;
  onBatchClick?: (batchId: string) => void;
}

export function StrainDetailPanel({ strain, batches, batchLoading, onBatchClick }: StrainDetailPanelProps) {
  const catColor = CATEGORY_COLORS[strain.strain_category ?? ''] ?? '#666';

  const donutSegments: DonutSegment[] = [
    { code: 'flower', label: 'Flower', colorClass: 'rose', grams: strain.bulk_flower_grams },
    { code: 'smalls', label: 'Smalls', colorClass: 'amber', grams: strain.bulk_smalls_grams },
    { code: 'trim', label: 'Trim', colorClass: 'emerald', grams: strain.bulk_trim_grams },
    { code: 'bucked', label: 'Bucked', colorClass: 'sky', grams: strain.bucked_grams },
  ].filter((s) => s.grams > 0);

  // Aggregate batch-level stats
  const totalSellable = batches.reduce((s, b) => s + b.sellable_now_g, 0);
  const totalPipeline = batches.reduce((s, b) => s + b.pipeline_raw_g, 0);
  const totalSoldValue = batches.reduce((s, b) => s + b.sold_value, 0);
  const totalAllocatedOrders = batches.reduce((s, b) => s + b.allocated_orders, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{strain.strain}</h2>
          <div className="flex items-center gap-3 mt-1">
            {strain.abbreviation && (
              <span className="text-white/30 text-xs font-mono">{strain.abbreviation}</span>
            )}
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: catColor, backgroundColor: `${catColor}20` }}
            >
              {strain.strain_category ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Sellable</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {gramsToLbs(totalSellable)} lbs
          </p>
          <p className="text-[10px] text-white/30 tabular-nums">
            {totalSellable.toLocaleString('en-US', { maximumFractionDigits: 0 })}g
          </p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Pipeline</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {gramsToLbs(totalPipeline)} lbs
          </p>
          <p className="text-[10px] text-white/30 tabular-nums">raw / in-process</p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Sold</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {formatUsd(totalSoldValue)}
          </p>
          <p className="text-[10px] text-white/30 tabular-nums">
            {totalAllocatedOrders > 0 ? `${totalAllocatedOrders} orders` : 'no orders'}
          </p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Batches</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {batches.length}
          </p>
          <p className="text-[10px] text-white/30">
            {strain.packaged_units_available > 0
              ? `${strain.packaged_units_available} pkg ready`
              : 'no packaged units'}
          </p>
        </div>
      </div>

      {/* Grade donut + stage breakdown */}
      <div className="flex items-start gap-5">
        <GradeDonut segments={donutSegments} size="md" />
        <div className="flex-1 space-y-2">
          <span className="text-xs text-white/40 uppercase tracking-wider">Stage Breakdown</span>
          {donutSegments.map((seg) => {
            const pct = strain.total_available_grams > 0
              ? (seg.grams / strain.total_available_grams) * 100
              : 0;
            return (
              <div key={seg.code} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STAGE_COLORS[seg.code] ?? '#666', opacity: 0.85 }}
                />
                <span className="text-xs text-white/60 w-14">{seg.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-cult-near-black overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: STAGE_COLORS[seg.code] ?? '#666',
                      opacity: 0.75,
                    }}
                  />
                </div>
                <span className="text-xs text-white/40 tabular-nums w-16 text-right">
                  {gramsToLbs(seg.grams)} lbs
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch detail list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Batch Detail</span>
        </div>

        {batchLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-cult-near-black animate-pulse" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-xl bg-cult-surface-inset border border-cult-border-faint p-6 text-center">
            <p className="text-white/30 text-sm">No active batches</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((b, i) => (
              <motion.button
                key={b.batch_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onBatchClick?.(b.batch_id)}
                className="w-full text-left bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle hover:bg-cult-surface-overlay hover:border-cult-border transition-all active:scale-[0.99] group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white font-mono">{b.batch_code}</span>
                      <ExternalLink className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30">
                        {LIFECYCLE_LABELS[b.lifecycle_state] ?? b.lifecycle_state}
                      </span>
                      {b.quality_grade && (
                        <span className="inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                          {b.quality_grade}
                        </span>
                      )}
                      {confidenceBadge(b.confidence)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-white tabular-nums">
                      {gramsToLbs(b.total_potential_g)} lbs
                    </span>
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      <Calendar className="w-2.5 h-2.5 text-white/20" />
                      <span className="text-[10px] text-white/30">
                        {b.harvest_date ? harvestAge(b.harvest_date) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stage mini-bars */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'flower', label: 'FL', g: b.bulk_flower_g, color: STAGE_COLORS.flower },
                    { key: 'smalls', label: 'SM', g: b.bulk_smalls_g, color: STAGE_COLORS.smalls },
                    { key: 'trim', label: 'TR', g: b.trim_g, color: STAGE_COLORS.trim },
                    { key: 'bucked', label: 'BK', g: b.bucked_g, color: STAGE_COLORS.bucked },
                    { key: 'pkg', label: 'PK', g: b.packaged_g, color: STAGE_COLORS.packaged },
                    { key: 'ship', label: 'SH', g: b.shipped_g, color: STAGE_COLORS.shipped },
                  ]
                    .filter((s) => s.g > 0)
                    .map((s) => (
                      <span
                        key={s.key}
                        className="flex items-center gap-1 text-[10px] text-white/40"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: s.color, opacity: 0.75 }}
                        />
                        {s.label} {gramsToLbs(s.g)}
                      </span>
                    ))}
                </div>

                {/* Age + allocation info */}
                <div className="flex items-center gap-3 mt-2">
                  {b.age_days > 0 && (
                    <span className={`flex items-center gap-1 text-[10px] ${ageColor(b.age_days)}`}>
                      <Clock className="w-2.5 h-2.5" />
                      {b.age_days}d old
                      {b.days_in_stage > 0 && (
                        <span className="text-white/20 ml-1">({b.days_in_stage}d in stage)</span>
                      )}
                    </span>
                  )}
                  {b.allocated_orders > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {b.allocated_orders} orders · {formatUsd(b.allocated_revenue)}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Harvest timeline */}
      <div className="flex items-center gap-2">
        <Package className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs text-white/40">
          Oldest active: {harvestAge(strain.oldest_active_harvest ?? strain.most_recent_harvest)}
        </span>
        {strain.most_recent_harvest && (
          <span className="text-xs text-white/30 ml-auto">
            Latest: {new Date(strain.most_recent_harvest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
