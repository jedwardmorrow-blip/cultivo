import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import type { GradeBucket } from '../../hooks/useInventoryKpis';

const GLASS = 'rounded-2xl border border-cult-border bg-cult-surface-raised backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

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
  const accent = '#8B5CF6';

  return (
    <motion.div layoutId="kpi-tile-grading" variants={staggerItem}>
      <div className={`${GLASS} p-4 relative overflow-hidden min-h-[90px] flex flex-col gap-2`}>
        {/* Accent glow */}
        <div
          className="absolute -top-6 left-4 rounded-full pointer-events-none"
          style={{
            width: '80px',
            height: '80px',
            background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
            filter: 'blur(10px)',
          }}
        />

        <div className="flex items-center gap-2 relative">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accent}15` }}
          >
            <Award className="w-4 h-4" style={{ color: accent }} />
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Grade Mix</span>
        </div>

        {loading ? (
          <div className="h-5 w-full rounded-lg bg-cult-surface-raised animate-pulse" />
        ) : !hasData ? (
          <span className="text-2xl font-bold text-white/20">—</span>
        ) : (
          <div className="flex flex-col gap-2 relative">
            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden bg-cult-near-black">
              {gradeBuckets.map((g) => (
                <div
                  key={g.code}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(g.totalGrams / totalAll) * 100}%`,
                    backgroundColor: COLOR_MAP[g.colorClass] ?? '#666',
                    opacity: 0.85,
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
                    style={{ backgroundColor: COLOR_MAP[g.colorClass] ?? '#666', opacity: 0.85 }}
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
      </div>
    </motion.div>
  );
}
