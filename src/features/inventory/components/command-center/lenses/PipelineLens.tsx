import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Search, Eye, EyeOff, Clock, TrendingUp, Package } from 'lucide-react';
import { usePipelineBatches, PIPELINE_STAGES, type PipelineStage } from '../../../hooks/usePipelineBatches';
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

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

// ─── Main Component ──────────────────────────────────────────────────────

interface PipelineLensProps {
  onBatchClick?: (batchId: string) => void;
}

export function PipelineLens({ onBatchClick }: PipelineLensProps) {
  const { batches, loading, filters, setFilters, maxTotalWeight } = usePipelineBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.batch_id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  // Aggregate KPIs
  const kpis = useMemo(() => {
    const totalSellable = batches.reduce((s, b) => s + b.sellable_now_g, 0);
    const totalPipeline = batches.reduce((s, b) => s + b.pipeline_raw_g, 0);
    const totalPotential = batches.reduce((s, b) => s + b.total_potential_g, 0);
    const uniqueStrains = new Set(batches.map((b) => b.strain_name)).size;
    return { totalSellable, totalPipeline, totalPotential, uniqueStrains, batchCount: batches.length };
  }, [batches]);

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-[88px] animate-pulse" />
          ))}
        </div>
        <div className="glass-card p-6 h-[500px] animate-pulse" />
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────
  if (batches.length === 0 && !filters.search && !filters.showDepleted) {
    return (
      <div className="glass-card p-12 text-center">
        <GitBranch className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/50 font-medium">No batches in pipeline</p>
        <p className="text-white/30 text-sm mt-1">Waiting on post-harvest processing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Batches</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{kpis.batchCount}</p>
          <p className="text-[10px] text-white/30">{kpis.uniqueStrains} strains</p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Sellable</span>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-1">{gramsToLbs(kpis.totalSellable)} lbs</p>
          <p className="text-[10px] text-white/30">ready to move</p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Pipeline</span>
          <p className="text-xl font-bold text-amber-400 tabular-nums mt-1">{gramsToLbs(kpis.totalPipeline)} lbs</p>
          <p className="text-[10px] text-white/30">in process</p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Total Potential</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{gramsToLbs(kpis.totalPotential)} lbs</p>
          <p className="text-[10px] text-white/30">all material</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search batch or strain…"
            aria-label="Search batches"
            className="glass-input w-full pl-8 pr-3 py-1.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setFilters((f) => ({ ...f, showDepleted: !f.showDepleted }))}
          aria-pressed={filters.showDepleted}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            filters.showDepleted
              ? 'bg-cult-surface-active text-white border-cult-border-active'
              : 'text-white/40 hover:text-white/60 border-transparent'
          }`}
        >
          {filters.showDepleted ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {filters.showDepleted ? 'Showing all' : 'Hide depleted'}
        </button>
      </div>

      {/* Stage progression matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Matrix (3/5) */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key="matrix"
              {...fadeIn}
              className="glass-card p-5 overflow-x-auto"
              tabIndex={0}
              role="grid"
              aria-label="Batch stage progression matrix"
            >
              {/* Column headers */}
              <div className="flex items-end gap-0 mb-3 pl-[140px]">
                {PIPELINE_STAGES.map((stage) => (
                  <div
                    key={stage.key}
                    className="flex-1 min-w-[60px] text-center"
                  >
                    <span
                      className="text-[10px] uppercase tracking-wider font-medium"
                      style={{ color: stage.color, opacity: 0.7 }}
                    >
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Batch rows */}
              <div className="space-y-1">
                {batches.length === 0 ? (
                  <div className="py-8 text-center text-white/30 text-sm">
                    No batches match your filters
                  </div>
                ) : (
                  batches.map((batch, i) => (
                    <motion.button
                      key={batch.batch_id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setSelectedBatchId((prev) => (prev === batch.batch_id ? null : batch.batch_id))}
                      className={`w-full flex items-center gap-0 rounded-xl transition-all active:scale-[0.995] ${
                        selectedBatchId === batch.batch_id
                          ? 'bg-cult-surface-overlay ring-1 ring-cult-border-active'
                          : 'hover:bg-cult-near-black'
                      } py-2 px-2`}
                    >
                      {/* Batch label */}
                      <div className="w-[132px] shrink-0 text-left pr-2">
                        <span className="text-xs font-medium text-white font-mono truncate block">
                          {batch.batch_code}
                        </span>
                        <span className="text-[10px] text-white/30 truncate block">
                          {batch.strain_name}
                        </span>
                      </div>

                      {/* Stage cells */}
                      {PIPELINE_STAGES.map((stage) => {
                        const weight = getStageWeight(batch, stage.key);
                        const barPct = maxTotalWeight > 0 ? (weight / maxTotalWeight) * 100 : 0;
                        return (
                          <div key={stage.key} className="flex-1 min-w-[60px] px-0.5">
                            {weight > 0 ? (
                              <div className="relative h-5 rounded bg-cult-surface-subtle overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0 rounded"
                                  style={{
                                    width: `${Math.max(barPct, 4)}%`,
                                    backgroundColor: stage.color,
                                    opacity: 0.5,
                                  }}
                                />
                                <span className="relative z-10 text-[9px] font-medium text-white/70 leading-5 pl-1 tabular-nums">
                                  {gramsToLbs(weight)}
                                </span>
                              </div>
                            ) : (
                              <div className="h-5 rounded bg-cult-surface-inset" />
                            )}
                          </div>
                        );
                      })}
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Detail panel (2/5) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait" initial={false}>
            {selectedBatch ? (
              <motion.div
                key={`detail-${selectedBatchId}`}
                {...fadeIn}
                className="glass-card p-5 space-y-5"
              >
                <BatchDetailSidebar batch={selectedBatch} />
              </motion.div>
            ) : (
              <motion.div
                key="overview"
                {...fadeIn}
                className="glass-card p-5 space-y-5"
              >
                <PipelineOverview batches={batches} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Batch Detail Sidebar ────────────────────────────────────────────────

function BatchDetailSidebar({ batch }: { batch: BatchDetailRow }) {
  const stages = PIPELINE_STAGES.filter((s) => getStageWeight(batch, s.key) > 0);

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-white font-mono">{batch.batch_code}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-white/50">{batch.strain_name}</span>
          <span className="text-[10px] text-white/30 bg-cult-surface-raised px-2 py-0.5 rounded-full">
            {batch.lifecycle_state}
          </span>
        </div>
      </div>

      {/* Weight KPIs */}
      <div className="grid grid-cols-2 gap-3">
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
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Total</span>
          <p className="text-lg font-bold text-white tabular-nums mt-0.5">
            {gramsToLbs(batch.total_potential_g)} lbs
          </p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Waste</span>
          <p className="text-lg font-bold text-rose-400/70 tabular-nums mt-0.5">
            {gramsToLbs(batch.waste_grams)} lbs
          </p>
        </div>
      </div>

      {/* Stage breakdown bars */}
      <div>
        <span className="text-xs text-white/40 uppercase tracking-wider">Stage Weights</span>
        <div className="space-y-2 mt-2">
          {stages.map((stage) => {
            const weight = getStageWeight(batch, stage.key);
            const pct = batch.total_potential_g > 0
              ? (weight / batch.total_potential_g) * 100
              : 0;
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color, opacity: 0.85 }}
                />
                <span className="text-xs text-white/60 w-14">{stage.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-cult-near-black overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: stage.color, opacity: 0.75 }}
                  />
                </div>
                <span className="text-xs text-white/40 tabular-nums w-14 text-right">
                  {gramsToLbs(weight)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        {batch.age_days > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-white/30" />
            <span className={`text-xs ${ageColor(batch.age_days)}`}>
              {batch.age_days} days old
            </span>
            {batch.days_in_stage > 0 && (
              <span className="text-xs text-white/20">· {batch.days_in_stage}d in stage</span>
            )}
          </div>
        )}
        {batch.harvest_date && (
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs text-white/40">
              Harvested {new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </span>
          </div>
        )}
        {batch.allocated_orders > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs text-white/40">
              {batch.allocated_orders} orders · {formatUsd(batch.allocated_revenue)} allocated
            </span>
          </div>
        )}
        {batch.sold_value > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400/50" />
            <span className="text-xs text-emerald-400/60">
              {formatUsd(batch.sold_value)} sold
            </span>
          </div>
        )}
        {batch.quality_grade && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
            Grade: {batch.quality_grade}
          </span>
        )}
      </div>
    </>
  );
}

// ─── Pipeline Overview (no selection) ────────────────────────────────────

function PipelineOverview({ batches }: { batches: BatchDetailRow[] }) {
  // Aggregate weight per stage
  const stageAgg = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => {
      const total = batches.reduce((s, b) => s + getStageWeight(b, stage.key), 0);
      return { ...stage, total };
    }).filter((s) => s.total > 0);
  }, [batches]);

  const totalWeight = stageAgg.reduce((s, a) => s + a.total, 0);

  // Top batches by total potential
  const top5 = [...batches].sort((a, b) => b.total_potential_g - a.total_potential_g).slice(0, 5);

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-white/90">Pipeline Overview</h3>
        <p className="text-xs text-white/40 mt-1">Click a batch row to inspect detail</p>
      </div>

      {/* Stage aggregation */}
      <div>
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Weight by Stage</span>
        <div className="flex h-3 rounded-full overflow-hidden bg-cult-near-black mt-2">
          {stageAgg.map((s) => (
            <div
              key={s.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${totalWeight > 0 ? (s.total / totalWeight) * 100 : 0}%`,
                backgroundColor: s.color,
                opacity: 0.65,
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {stageAgg.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-white/50">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color, opacity: 0.75 }}
              />
              {s.label} — {gramsToLbs(s.total)} lbs
            </span>
          ))}
        </div>
      </div>

      {/* Top batches */}
      <div>
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Largest Batches</span>
        <div className="space-y-2 mt-2">
          {top5.map((b, i) => (
            <div key={b.batch_id} className="flex items-center gap-3">
              <span className="text-xs text-white/20 w-4 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white/70 font-mono truncate block">{b.batch_code}</span>
                <span className="text-[10px] text-white/30">{b.strain_name}</span>
              </div>
              <span className="text-sm text-white font-medium tabular-nums">
                {gramsToLbs(b.total_potential_g)} lbs
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
