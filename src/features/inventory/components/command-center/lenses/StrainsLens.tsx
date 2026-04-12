import { useState, useMemo } from 'react';
import { LayoutGroup, AnimatePresence, motion } from 'framer-motion';
import { Dna, Search, ArrowUpDown } from 'lucide-react';
import type { StrainInventoryRow } from '../../../hooks/useStrainInventory';
import { useBatchDetail } from '../../../hooks/useBatchDetail';
import { GradeDonut, type DonutSegment } from '../GradeDonut';
import { StrainDetailPanel } from './StrainDetailPanel';

// ─── Tokens ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  sativa: '#10B981',
  indica: '#8B5CF6',
  hybrid: '#F59E0B',
};

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

type SortKey = 'weight' | 'value' | 'name' | 'harvest';

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function formatUsd(v: number): string {
  if (v === 0) return '$0';
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function harvestAge(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: '—', color: 'text-white/30' };
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days < 30) return { label: `${days}d`, color: 'text-emerald-400' };
  if (days < 60) return { label: `${days}d`, color: 'text-amber-400' };
  return { label: `${days}d`, color: 'text-rose-400' };
}

// ─── Main Component ───────────────────────────────────────────────────────

interface StrainsLensProps {
  data: StrainInventoryRow[];
  loading: boolean;
  onBatchClick?: (batchId: string) => void;
}

export function StrainsLens({ data, loading, onBatchClick }: StrainsLensProps) {
  const [selectedStrainId, setSelectedStrainId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [search, setSearch] = useState('');

  // Batch data for the selected strain (filter by name — PostgREST rejects UUID filters on this view)
  const selectedStrain = useMemo(
    () => data.find((r) => r.strain_id === selectedStrainId) ?? null,
    [data, selectedStrainId],
  );
  const { batches, loading: batchLoading } = useBatchDetail(selectedStrain?.strain ?? null);

  const filtered = useMemo(() => {
    let result = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.strain.toLowerCase().includes(q) ||
          (r.abbreviation?.toLowerCase().includes(q) ?? false) ||
          (r.strain_category?.toLowerCase().includes(q) ?? false),
      );
    }
    return result.sort((a, b) => {
      switch (sortKey) {
        case 'weight':
          return b.total_available_grams - a.total_available_grams;
        case 'value':
          return b.estimated_value_usd - a.estimated_value_usd;
        case 'name':
          return a.strain.localeCompare(b.strain);
        case 'harvest':
          return (a.oldest_active_harvest ?? a.most_recent_harvest ?? '').localeCompare(
            b.oldest_active_harvest ?? b.most_recent_harvest ?? '',
          );
        default:
          return 0;
      }
    });
  }, [data, sortKey, search]);

  function handleStrainClick(strainId: string | null) {
    if (!strainId) return;
    setSelectedStrainId((prev) => (prev === strainId ? null : strainId));
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <div className="glass-card p-6 h-[500px] animate-pulse" />
        </div>
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-[88px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Dna className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/50 font-medium">No active inventory</p>
        <p className="text-white/30 text-sm mt-1">Waiting on first harvest.</p>
      </div>
    );
  }

  // ─── Bento Card Swap Layout ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strains…"
            className="glass-input w-full pl-8 pr-3 py-1.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/30 mr-1" />
          {(['weight', 'value', 'name', 'harvest'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortKey === key
                  ? 'bg-cult-surface-active text-white border border-cult-border-active'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              }`}
            >
              {key === 'weight' ? 'Weight' : key === 'value' ? 'Value' : key === 'name' ? 'Name' : 'Harvest'}
            </button>
          ))}
        </div>
      </div>

      {/* Bento 3/5 + 2/5 grid */}
      <LayoutGroup>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Primary Panel (3/5) — detail or overview */}
          <div className="lg:col-span-3" style={{ minHeight: '480px' }}>
            <AnimatePresence mode="wait" initial={false}>
              {selectedStrain ? (
                <motion.div
                  key={`detail-${selectedStrainId}`}
                  initial={fadeIn.initial}
                  animate={fadeIn.animate}
                  exit={fadeIn.exit}
                  transition={fadeIn.transition}
                  className="glass-card p-6 h-full"
                >
                  <StrainDetailPanel
                    strain={selectedStrain}
                    batches={batches}
                    batchLoading={batchLoading}
                    onBatchClick={onBatchClick}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="overview"
                  initial={fadeIn.initial}
                  animate={fadeIn.animate}
                  exit={fadeIn.exit}
                  transition={fadeIn.transition}
                  className="glass-card p-6 h-full"
                >
                  <OverviewPanel data={filtered} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secondary Panel (2/5) — strain card list */}
          <div className="lg:col-span-2 space-y-2 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin">
            {filtered.map((row, i) => {
              const isActive = row.strain_id === selectedStrainId;
              return (
                <motion.button
                  key={row.strain_id ?? row.strain}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => handleStrainClick(row.strain_id)}
                  className={`w-full text-left transition-all active:scale-[0.98] ${
                    isActive
                      ? 'glass-elevated ring-1 ring-cult-border-strong'
                      : 'glass-card hover:bg-cult-surface-active hover:border-cult-border-strong'
                  } p-4`}
                >
                  {isActive ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{row.strain}</span>
                      <span className="text-[10px] text-white/40">Viewing detail &rarr;</span>
                    </div>
                  ) : (
                    <StrainCardCompact row={row} />
                  )}
                </motion.button>
              );
            })}

            {filtered.length === 0 && search && (
              <div className="text-center py-8 text-white/30 text-sm">
                No strains match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}

// ─── Compact Strain Card (right column) ─────────────────────────────────

function StrainCardCompact({ row }: { row: StrainInventoryRow }) {
  const catColor = CATEGORY_COLORS[row.strain_category ?? ''] ?? '#666';
  const age = harvestAge(row.oldest_active_harvest ?? row.most_recent_harvest);

  const donutSegments: DonutSegment[] = [
    { code: 'flower', label: 'Flower', colorClass: 'rose', grams: row.bulk_flower_grams },
    { code: 'smalls', label: 'Smalls', colorClass: 'amber', grams: row.bulk_smalls_grams },
    { code: 'trim', label: 'Trim', colorClass: 'emerald', grams: row.bulk_trim_grams },
    { code: 'bucked', label: 'Bucked', colorClass: 'sky', grams: row.bucked_grams },
  ].filter((s) => s.grams > 0);

  return (
    <div className="flex items-center gap-3">
      {/* Mini donut */}
      <GradeDonut segments={donutSegments} size="sm" />

      {/* Name + weight */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white truncate">{row.strain}</h3>
          <span
            className="shrink-0 px-1.5 py-px rounded-full text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: catColor, backgroundColor: `${catColor}20` }}
          >
            {row.strain_category?.slice(0, 3) ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/50 tabular-nums">
            {gramsToLbs(row.total_available_grams)} lbs
          </span>
          {row.estimated_value_usd > 0 && (
            <span className="text-xs text-white/30 tabular-nums">{formatUsd(row.estimated_value_usd)}</span>
          )}
          <span className={`text-[10px] ml-auto tabular-nums ${age.color}`}>{age.label}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Panel (left column, no selection) ─────────────────────────

function OverviewPanel({ data }: { data: StrainInventoryRow[] }) {
  const totalWeight = data.reduce((s, r) => s + r.total_available_grams, 0);
  const totalValue = data.reduce((s, r) => s + r.estimated_value_usd, 0);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((r) => {
      const cat = r.strain_category ?? 'unknown';
      map.set(cat, (map.get(cat) ?? 0) + r.total_available_grams);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, grams]) => ({ cat, grams, pct: totalWeight > 0 ? (grams / totalWeight) * 100 : 0 }));
  }, [data, totalWeight]);

  // Top 5 strains by weight
  const top5 = data.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Strain Overview</h2>
        <p className="text-xs text-white/40 mt-1">
          Select a strain to view batch-level detail
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Total Weight</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {gramsToLbs(totalWeight)} lbs
          </p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Est. Value</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {formatUsd(totalValue)}
          </p>
        </div>
        <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Strains</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{data.length}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">By Category</span>
        <div className="flex h-3 rounded-full overflow-hidden bg-cult-near-black mt-2">
          {catBreakdown.map((c) => (
            <div
              key={c.cat}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${c.pct}%`,
                backgroundColor: CATEGORY_COLORS[c.cat] ?? '#666',
                opacity: 0.75,
              }}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-2">
          {catBreakdown.map((c) => (
            <span key={c.cat} className="flex items-center gap-1.5 text-xs text-white/50">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[c.cat] ?? '#666', opacity: 0.75 }}
              />
              {c.cat} — {gramsToLbs(c.grams)} lbs
            </span>
          ))}
        </div>
      </div>

      {/* Top strains */}
      <div>
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Top Strains by Weight</span>
        <div className="space-y-2 mt-2">
          {top5.map((row, i) => (
            <div key={row.strain_id ?? row.strain} className="flex items-center gap-3">
              <span className="text-xs text-white/20 w-4 tabular-nums">{i + 1}</span>
              <span className="text-sm text-white/70 flex-1 truncate">{row.strain}</span>
              <span className="text-sm text-white font-medium tabular-nums">
                {gramsToLbs(row.total_available_grams)} lbs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
