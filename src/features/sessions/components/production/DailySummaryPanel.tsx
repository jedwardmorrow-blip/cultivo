/**
 * DailySummaryPanel — Bento card showing today's completed sessions
 *
 * Compact: type breakdown bars + total output
 * Expanded: strain-grouped completed session list (design principle #12)
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { GLASS, GLASS_ELEVATED, GLASS_HOVER, SESSION_TYPE_COLORS, formatWeight, fadeInVariants } from './constants';
import type { TrimSessionStats, BuckingSessionStats, PackagingSessionStats, TrimSession, BuckingSession, PackagingSession } from '../../types';

// ─── Compact view ─────────────────────────────────────────────────────────

interface DailySummaryCompactProps {
  trimStats: TrimSessionStats;
  buckingStats: BuckingSessionStats;
  packagingStats: PackagingSessionStats;
  isActive: boolean;
  onClick: () => void;
}

export function DailySummaryCompact({ trimStats, buckingStats, packagingStats, isActive, onClick }: DailySummaryCompactProps) {
  const totalCompleted = trimStats.completedToday + buckingStats.completedToday + packagingStats.completedToday;
  const maxCount = Math.max(trimStats.completedToday, buckingStats.completedToday, packagingStats.completedToday, 1);

  const dailyOutputG = (trimStats.totalFlowerToday || 0) + (buckingStats.totalFlowerToday || 0);

  const bars = [
    { type: 'trim' as const, count: trimStats.completedToday },
    { type: 'bucking' as const, count: buckingStats.completedToday },
    { type: 'packaging' as const, count: packagingStats.completedToday },
  ];

  return (
    <motion.button
      layoutId="card-daily-summary"
      layout="position"
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      type="button"
      onClick={onClick}
      className={`${isActive ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
        isActive ? 'py-2.5 px-4' : 'p-4'
      }`}
    >
      {isActive ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-white/40" />
            <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Today</h3>
          </div>
          <span className="text-[9px] text-white/20">● active</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-white/40" />
              <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Today</h3>
            </div>
            <span className="text-xs text-white/30">{totalCompleted}</span>
          </div>

          {totalCompleted === 0 ? (
            <div className="text-xs text-white/20">No sessions completed yet</div>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                {bars.map(({ type, count }) => {
                  const color = SESSION_TYPE_COLORS[type];
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 w-8">{color.label.slice(0, 4)}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: `${color.rgba}0.5)` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 w-4 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-white/25">
                {formatWeight(dailyOutputG)} flower output
              </div>
            </>
          )}
        </>
      )}
    </motion.button>
  );
}

// ─── Expanded view ────────────────────────────────────────────────────────

interface CompletedSessionRow {
  id: string;
  type: 'trim' | 'bucking' | 'packaging';
  worker: string;
  strain: string;
  outputWeight: number;
  throughput: number;
}

interface DailySummaryExpandedProps {
  trimCompleted: TrimSession[];
  buckingCompleted: BuckingSession[];
  packagingCompleted: PackagingSession[];
}

export function DailySummaryExpanded({ trimCompleted, buckingCompleted, packagingCompleted }: DailySummaryExpandedProps) {
  // Build unified rows
  const rows = useMemo<CompletedSessionRow[]>(() => {
    const result: CompletedSessionRow[] = [];

    for (const s of trimCompleted) {
      result.push({
        id: s.id,
        type: 'trim',
        worker: (s as any).trimmer_name || '',
        strain: (s as any).strain || '',
        outputWeight: ((s as any).big_buds_grams || 0) + ((s as any).small_buds_grams || 0),
        throughput: (s as any).grams_per_hour || 0,
      });
    }

    for (const s of buckingCompleted) {
      result.push({
        id: s.id,
        type: 'bucking',
        worker: (s as any).bucker_name || '',
        strain: (s as any).strain || '',
        outputWeight: ((s as any).bucked_flower_grams || 0) + ((s as any).bucked_smalls_grams || 0),
        throughput: (s as any).kg_per_hour ? (s as any).kg_per_hour * 1000 : 0, // normalize to g/hr
      });
    }

    for (const s of packagingCompleted) {
      result.push({
        id: s.id,
        type: 'packaging',
        worker: (s as any).packager_name || '',
        strain: (s as any).strain || '',
        outputWeight: (s as any).ending_weight || 0,
        throughput: (s as any).units_per_hour || 0,
      });
    }

    return result;
  }, [trimCompleted, buckingCompleted, packagingCompleted]);

  // Group by strain (design principle #12)
  const strainGroups = useMemo(() => {
    const groups = new Map<string, CompletedSessionRow[]>();
    for (const row of rows) {
      const key = row.strain || 'Unknown';
      const existing = groups.get(key) || [];
      existing.push(row);
      groups.set(key, existing);
    }
    return [...groups.entries()].sort(([, a], [, b]) => b.length - a.length);
  }, [rows]);

  return (
    <motion.div
      key="panel-daily-summary"
      initial={fadeInVariants.initial}
      animate={fadeInVariants.animate}
      exit={fadeInVariants.exit}
      transition={fadeInVariants.transition}
      className="flex flex-col flex-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-white/50" />
          <h3 className="text-sm font-semibold text-white/80">Today's Output</h3>
          <span className="text-xs text-white/30">({rows.length} sessions)</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-white/25">No sessions completed yet today</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1">
          {strainGroups.map(([strain, sessions]) => (
            <div key={strain}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-white/50">{strain}</span>
                <span className="text-[10px] text-white/20">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1">
                {sessions.map(row => {
                  const color = SESSION_TYPE_COLORS[row.type];
                  return (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 text-xs"
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.hex }} />
                      <span className="text-white/50 w-20 truncate">{row.worker}</span>
                      <span className="text-white/30 w-12">{color.label}</span>
                      <span className="text-white/60 font-medium ml-auto tabular-nums">
                        {row.type === 'packaging'
                          ? `${row.throughput.toFixed(0)} u/hr`
                          : `${row.throughput.toFixed(0)} g/hr`
                        }
                      </span>
                      <span className="text-white/40 tabular-nums w-16 text-right">
                        {formatWeight(row.outputWeight)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
