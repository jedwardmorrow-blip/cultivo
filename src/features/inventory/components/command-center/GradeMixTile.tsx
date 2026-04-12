import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import type { GradeBucket } from '../../hooks/useInventoryKpis';

const GLASS_TILE = 'rounded-2xl border border-white/[0.07] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]';

// Maps quality_grades.color_class (TW color name) to hex
const COLOR_MAP: Record<string, string> = {
  emerald: '#10B981',
  sky: '#0EA5E9',
  amber: '#F59E0B',
  rose: '#F43F5E',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  slate: '#94A3B8',
};

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

interface GradeMixTileProps {
  gradeBuckets: GradeBucket[];
  ungradedGrams: number;
  totalGradedGrams: number;
  loading: boolean;
}

export function GradeMixTile({ gradeBuckets, ungradedGrams, totalGradedGrams, loading }: GradeMixTileProps) {
  const totalAll = totalGradedGrams + ungradedGrams;
  const hasData = totalAll > 0;

  return (
    <motion.div
      layoutId="kpi-tile-grading"
      className={`${GLASS_TILE} bg-white/[0.04] p-5 flex flex-col gap-2 min-h-[110px]`}
    >
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 shrink-0" style={{ color: '#8B5CF6' }} />
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Grade Mix</span>
      </div>

      {loading ? (
        <div className="h-8 w-full rounded-lg bg-white/[0.06] animate-pulse" />
      ) : !hasData ? (
        <span className="text-2xl font-bold text-white/20">—</span>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
            {gradeBuckets.map((g) => (
              <div
                key={g.code}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(g.totalGrams / totalAll) * 100}%`,
                  backgroundColor: COLOR_MAP[g.colorClass] ?? '#666',
                  opacity: 0.8,
                }}
              />
            ))}
            {ungradedGrams > 0 && (
              <div
                className="h-full last:rounded-r-full"
                style={{
                  width: `${(ungradedGrams / totalAll) * 100}%`,
                  backgroundColor: '#404040',
                }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {gradeBuckets.map((g) => (
              <span key={g.code} className="flex items-center gap-1 text-[10px] text-white/50">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: COLOR_MAP[g.colorClass] ?? '#666', opacity: 0.8 }}
                />
                {g.label} {gramsToLbs(g.totalGrams)}
              </span>
            ))}
            {ungradedGrams > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Ungraded {gramsToLbs(ungradedGrams)}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
