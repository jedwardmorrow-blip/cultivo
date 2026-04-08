/**
 * ConversionsPanel — Bento card for pending conversions
 *
 * Compact: count + summary list in secondary column
 * Expanded: full pending session cards in main panel, tap to open ConversionModal
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, AlertTriangle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { GLASS, GLASS_ELEVATED, GLASS_HOVER, SESSION_TYPE_COLORS, formatWeight, fadeInVariants } from './constants';
import { ConversionModal } from '@/features/inventory/components/ConversionModal';
import type { PendingConversionSession } from '@/types';

// ─── Compact view (right column) ──────────────────────────────────────────

interface ConversionsPanelCompactProps {
  pendingSessions: PendingConversionSession[];
  isActive: boolean;
  onClick: () => void;
}

export function ConversionsPanelCompact({ pendingSessions, isActive, onClick }: ConversionsPanelCompactProps) {
  const count = pendingSessions.length;
  const hasStalePending = pendingSessions.some(s => {
    const days = Math.floor((Date.now() - new Date(s.last_completed_at).getTime()) / (1000 * 60 * 60 * 24));
    return days > 3;
  });

  const accentColor = hasStalePending ? '#EF4444' : count > 0 ? '#F59E0B' : '#10B981';

  const glowRgba = hasStalePending ? 'rgba(239,68,68,' : count > 0 ? 'rgba(245,158,11,' : 'rgba(16,185,129,';

  return (
    <motion.button
      layoutId="card-conversions"
      layout="position"
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      type="button"
      onClick={onClick}
      className={`${isActive ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] relative overflow-hidden ${
        isActive ? 'py-2.5 px-4' : 'p-4'
      }`}
      style={!isActive ? {
        borderColor: `${glowRgba}0.12)`,
        boxShadow: `0 0 8px ${glowRgba}0.06), 0 4px 24px rgba(0,0,0,0.4)`,
      } : undefined}
    >
      {/* Ambient glow */}
      {!isActive && (
        <div
          className="absolute -top-8 right-8 rounded-full pointer-events-none"
          style={{
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle, ${glowRgba}${count > 0 ? '0.12' : '0.06'}) 0%, transparent 70%)`,
            filter: 'blur(12px)',
          }}
        />
      )}
      {isActive ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <h3 className="text-[11px] uppercase tracking-widest font-medium" style={{ color: `${accentColor}99` }}>
              Conversions
            </h3>
          </div>
          <span className="text-[10px] text-white/30 flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />
              tap to return
            </span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Conversions</h3>
            </div>
            {count > 0 && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                }}
              >
                {count}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div className="flex items-center gap-2 text-xs text-white/25">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50" />
              All finalized
            </div>
          ) : (
            <div className="space-y-1.5">
              {pendingSessions.slice(0, 3).map(s => {
                const typeColor = SESSION_TYPE_COLORS[s.session_type as keyof typeof SESSION_TYPE_COLORS];
                return (
                  <div key={s.aggregation_id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor?.hex || '#666' }} />
                      <span className="text-white/50 truncate">{s.strain_name}</span>
                    </div>
                    <span className="text-white/30 flex-shrink-0 ml-2">
                      {s.output_weight ? formatWeight(s.output_weight) : `${s.output_units || 0}u`}
                    </span>
                  </div>
                );
              })}
              {count > 3 && (
                <span className="text-[10px] text-white/20">+{count - 3} more</span>
              )}
            </div>
          )}
        </>
      )}
    </motion.button>
  );
}

// ─── Expanded view (main panel) ───────────────────────────────────────────

interface ConversionsPanelExpandedProps {
  pendingSessions: PendingConversionSession[];
  onRefresh: () => void;
}

export function ConversionsPanelExpanded({ pendingSessions, onRefresh }: ConversionsPanelExpandedProps) {
  const [selectedSession, setSelectedSession] = useState<PendingConversionSession | null>(null);

  const handleComplete = async () => {
    setSelectedSession(null);
    onRefresh();
  };

  return (
    <motion.div
      key="panel-conversions"
      initial={fadeInVariants.initial}
      animate={fadeInVariants.animate}
      exit={fadeInVariants.exit}
      transition={fadeInVariants.transition}
      className="flex flex-col flex-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white/80">Pending Conversions</h3>
          <span className="text-xs text-white/30">({pendingSessions.length})</span>
        </div>
      </div>

      {pendingSessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mx-auto mb-2" />
            <p className="text-sm text-white/30">All sessions finalized</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {pendingSessions.map(session => {
            const typeColor = SESSION_TYPE_COLORS[session.session_type as keyof typeof SESSION_TYPE_COLORS];
            const daysSince = Math.floor(
              (Date.now() - new Date(session.last_completed_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysSince > 3;

            return (
              <button
                key={session.aggregation_id}
                type="button"
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left rounded-xl border p-3 transition-all hover:bg-white/[0.04] active:scale-[0.99] ${
                  isUrgent
                    ? 'border-amber-500/25 bg-amber-500/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor?.hex || '#666' }} />
                      <span className="text-sm font-medium text-white/80 truncate">{session.strain_name}</span>
                      <span className="text-[10px] text-white/30">{session.batch_name}</span>
                      {session.session_count > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-sky-400/80">
                          {session.session_count} sessions
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/35">
                      <span>{session.product_name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {daysSince}d ago
                      </span>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-amber-400/70">
                          <AlertTriangle className="w-3 h-3" />
                          Needs attention
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold text-white/80">
                      {session.output_weight ? formatWeight(session.output_weight) : `${session.output_units || 0}`}
                    </span>
                    <span className="block text-[10px] text-white/25">
                      {session.output_weight ? '' : 'units'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <ConversionModal
          session={selectedSession}
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          onComplete={handleComplete}
        />
      )}
    </motion.div>
  );
}
