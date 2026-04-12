import { motion } from 'framer-motion';
import { Package, Calendar, FlaskConical, Layers } from 'lucide-react';
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
};

const LIFECYCLE_LABELS: Record<string, string> = {
  bucked: 'Bucked',
  trimmed: 'Trimmed',
  packaged: 'Packaged',
  completed: 'Completed',
  depleted: 'Depleted',
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

interface StrainDetailPanelProps {
  strain: StrainInventoryRow;
  batches: BatchDetailRow[];
  batchLoading: boolean;
}

export function StrainDetailPanel({ strain, batches, batchLoading }: StrainDetailPanelProps) {
  const catColor = CATEGORY_COLORS[strain.strain_category ?? ''] ?? '#666';

  const donutSegments: DonutSegment[] = [
    { code: 'flower', label: 'Flower', colorClass: 'rose', grams: strain.bulk_flower_grams },
    { code: 'smalls', label: 'Smalls', colorClass: 'amber', grams: strain.bulk_smalls_grams },
    { code: 'trim', label: 'Trim', colorClass: 'emerald', grams: strain.bulk_trim_grams },
    { code: 'bucked', label: 'Bucked', colorClass: 'sky', grams: strain.bucked_grams },
  ].filter((s) => s.grams > 0);

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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
          <span className="text-xs text-white/40 uppercase tracking-wider">Weight</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {gramsToLbs(strain.total_available_grams)} lbs
          </p>
          <p className="text-[10px] text-white/30 tabular-nums">
            {strain.total_available_grams.toLocaleString('en-US', { maximumFractionDigits: 0 })}g
          </p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
          <span className="text-xs text-white/40 uppercase tracking-wider">Value</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {formatUsd(strain.estimated_value_usd)}
          </p>
          {strain.forecast_price_per_gram != null && (
            <p className="text-[10px] text-white/30 tabular-nums">
              ${strain.forecast_price_per_gram.toFixed(2)}/g
            </p>
          )}
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
          <span className="text-xs text-white/40 uppercase tracking-wider">Batches</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {strain.active_batch_count}
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
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
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

      {/* Batch detail table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Batch Detail</span>
        </div>

        {batchLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-6 text-center">
            <p className="text-white/30 text-sm">No active batches</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((b, i) => (
              <motion.div
                key={b.batch_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-white font-mono">{b.batch_number}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.lifecycle_state && (
                        <span className="text-[10px] text-white/30">
                          {LIFECYCLE_LABELS[b.lifecycle_state] ?? b.lifecycle_state}
                        </span>
                      )}
                      {b.coa_status && (
                        <span className="flex items-center gap-0.5 text-[10px]">
                          <FlaskConical className="w-2.5 h-2.5" />
                          <span className={b.coa_status === 'passed' ? 'text-emerald-400' : 'text-white/30'}>
                            {b.coa_status}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-white tabular-nums">
                      {gramsToLbs(b.total_weight)} lbs
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
                <div className="flex gap-2">
                  {[
                    { key: 'flower', label: 'FL', g: b.flower_available, color: STAGE_COLORS.flower },
                    { key: 'smalls', label: 'SM', g: b.smalls_available, color: STAGE_COLORS.smalls },
                    { key: 'bucked', label: 'BK', g: b.bucked_available, color: STAGE_COLORS.bucked },
                    { key: 'pkg', label: 'PK', g: b.packaged_available, color: STAGE_COLORS.packaged },
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

                {/* Grade badge if present */}
                {b.grade_label && (
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{
                        color: b.grade_color ? `var(--tw-color-${b.grade_color}-400, #8B5CF6)` : '#8B5CF6',
                        backgroundColor: 'rgba(139,92,246,0.15)',
                        borderColor: 'rgba(139,92,246,0.2)',
                      }}
                    >
                      {b.grade_label}
                    </span>
                  </div>
                )}
              </motion.div>
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
