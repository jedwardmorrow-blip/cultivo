import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Package, ArrowUpDown, Search } from 'lucide-react';
import type { StrainInventoryRow } from '../../../hooks/useStrainInventory';
import { GradeDonut, type DonutSegment } from '../GradeDonut';

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_HOVER = 'hover:bg-white/[0.10] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';
const GLASS_EMPTY = 'rounded-2xl border border-white/[0.04] bg-white/[0.02]';

const CATEGORY_COLORS: Record<string, string> = {
  sativa: '#10B981',
  indica: '#8B5CF6',
  hybrid: '#F59E0B',
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

interface StrainsLensProps {
  data: StrainInventoryRow[];
  loading: boolean;
}

export function StrainsLens({ data, loading }: StrainsLensProps) {
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [search, setSearch] = useState('');

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`${GLASS} p-5 h-[200px] animate-pulse`} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${GLASS_EMPTY} p-12 text-center`}>
        <Leaf className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/50 font-medium">No active inventory</p>
        <p className="text-white/30 text-sm mt-1">Waiting on first harvest.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar: search + sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strains…"
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.20]"
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
                  ? 'bg-white/[0.10] text-white border border-white/[0.12]'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              }`}
            >
              {key === 'weight' ? 'Weight' : key === 'value' ? 'Value' : key === 'name' ? 'Name' : 'Harvest'}
            </button>
          ))}
        </div>
      </div>

      {/* Strain cards — responsive bento grid per spec §5.2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((row, i) => (
          <StrainCard key={row.strain_id ?? row.strain} row={row} index={i} />
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center py-8 text-white/30 text-sm">
          No strains match "{search}"
        </div>
      )}
    </div>
  );
}

function StrainCard({ row, index }: { row: StrainInventoryRow; index: number }) {
  const catColor = CATEGORY_COLORS[row.strain_category ?? ''] ?? '#666';
  const age = harvestAge(row.oldest_active_harvest ?? row.most_recent_harvest);

  // Build grade donut segments from weight breakdown
  const donutSegments: DonutSegment[] = [
    { code: 'flower', label: 'Flower', colorClass: 'rose', grams: row.bulk_flower_grams },
    { code: 'smalls', label: 'Smalls', colorClass: 'amber', grams: row.bulk_smalls_grams },
    { code: 'trim', label: 'Trim', colorClass: 'emerald', grams: row.bulk_trim_grams },
    { code: 'bucked', label: 'Bucked', colorClass: 'sky', grams: row.bucked_grams },
  ].filter((s) => s.grams > 0);

  return (
    <motion.div
      layoutId={row.strain_id ? `strain-card-${row.strain_id}` : undefined}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        delay: index * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className={`${GLASS} ${GLASS_HOVER} p-5 cursor-pointer transition-all relative overflow-hidden`}
    >
      {/* Subtle accent glow based on category */}
      <div
        className="absolute -top-8 -right-4 rounded-full pointer-events-none"
        style={{
          width: '100px',
          height: '100px',
          background: `radial-gradient(circle, ${catColor}12 0%, transparent 70%)`,
          filter: 'blur(16px)',
        }}
      />

      {/* Header: name + category chip */}
      <div className="flex items-start justify-between gap-2 mb-3 relative">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{row.strain}</h3>
          {row.abbreviation && (
            <span className="text-white/30 text-xs font-mono">{row.abbreviation}</span>
          )}
        </div>
        <span
          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: catColor,
            backgroundColor: `${catColor}20`,
          }}
        >
          {row.strain_category ?? '—'}
        </span>
      </div>

      {/* Weight + donut + value row */}
      <div className="flex items-center gap-3 mb-3 relative">
        <GradeDonut segments={donutSegments} size="sm" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tabular-nums">
              {gramsToLbs(row.total_available_grams)} lbs
            </span>
            <span className="text-white/25 text-xs tabular-nums">
              {row.total_available_grams.toLocaleString('en-US', { maximumFractionDigits: 0 })}g
            </span>
          </div>
          {row.estimated_value_usd > 0 && (
            <span className="text-xs text-white/40 tabular-nums">{formatUsd(row.estimated_value_usd)}</span>
          )}
        </div>
      </div>

      {/* Breakdown bar */}
      <WeightBreakdown row={row} />

      {/* Footer chips */}
      <div className="flex items-center gap-2 mt-3 relative">
        <span className="flex items-center gap-1 text-xs text-white/40">
          <Package className="w-3 h-3" />
          {row.active_batch_count} batch{row.active_batch_count !== 1 ? 'es' : ''}
        </span>
        {row.packaged_units_available > 0 && (
          <span className="text-xs text-white/40 tabular-nums">
            {row.packaged_units_available} pkg
          </span>
        )}
        <span className={`text-xs ml-auto tabular-nums ${age.color}`}>{age.label}</span>
      </div>
    </motion.div>
  );
}

function WeightBreakdown({ row }: { row: StrainInventoryRow }) {
  const total = row.total_available_grams;
  if (total === 0) return null;

  const segments = [
    { label: 'Flower', grams: row.bulk_flower_grams, color: '#F43F5E' },
    { label: 'Smalls', grams: row.bulk_smalls_grams, color: '#F59E0B' },
    { label: 'Trim', grams: row.bulk_trim_grams, color: '#10B981' },
    { label: 'Bucked', grams: row.bucked_grams, color: '#0EA5E9' },
  ].filter((s) => s.grams > 0);

  return (
    <div className="space-y-1.5 relative">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(seg.grams / total) * 100}%`,
              backgroundColor: seg.color,
              opacity: 0.75,
            }}
          />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-[10px] text-white/40">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color, opacity: 0.75 }} />
            {seg.label} {gramsToLbs(seg.grams)}
          </span>
        ))}
      </div>
    </div>
  );
}
