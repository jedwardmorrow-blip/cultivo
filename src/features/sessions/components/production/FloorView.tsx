/**
 * FloorView — The Ticket Rail + Bento Card Swap
 *
 * Main panel (3/5): Active session cards + queued dispatch items
 * Secondary panel (2/5): Conversions, Crew, Today's Output — swappable bento cards
 *
 * Bento card swap: tapping a secondary card swaps its content into the main panel.
 * Pattern from Cultivation CommandCenter (layoutId + spring transition).
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Plus, Scissors, Leaf, Box } from 'lucide-react';
import { GLASS, GLASS_ELEVATED, springTransition, staggerContainer, fadeInVariants, type NormalizedSession } from './constants';
import { SessionCard } from './SessionCard';
import { QueuedCard } from './QueuedCard';
import { ConversionsPanelCompact, ConversionsPanelExpanded } from './ConversionsPanel';
import { CrewPanelCompact, CrewPanelExpanded } from './CrewPanel';
import { DailySummaryCompact, DailySummaryExpanded } from './DailySummaryPanel';

import type { DispatchItem } from '@/features/delivery/hooks/useProductionDispatch';
import type { PendingConversionSession } from '@/types';
import type { ActiveStaffMember } from '../../hooks/useActiveStaff';
import type { TrimSession, BuckingSession, PackagingSession, TrimSessionStats, BuckingSessionStats, PackagingSessionStats } from '../../types';

type FocusedCard = 'conversions' | 'crew' | 'daily-summary' | null;

interface FloorViewProps {
  // Active sessions (normalized)
  activeSessions: NormalizedSession[];
  // Queued dispatch items
  queuedItems: DispatchItem[];
  // Conversions
  pendingSessions: PendingConversionSession[];
  onConversionsRefresh: () => void;
  // Crew
  staff: ActiveStaffMember[];
  getDisplayName: (m: ActiveStaffMember) => string;
  // Today's completed
  trimCompleted: TrimSession[];
  buckingCompleted: BuckingSession[];
  packagingCompleted: PackagingSession[];
  trimStats: TrimSessionStats;
  buckingStats: BuckingSessionStats;
  packagingStats: PackagingSessionStats;
  // Actions
  onComplete: (session: NormalizedSession) => void;
  onCancel: (session: NormalizedSession) => void;
  onStartFromDispatch: (item: DispatchItem) => void;
  onStartManual: (type: 'bucking' | 'trim' | 'packaging') => void;
  onRefreshSessions: () => void;
}

export function FloorView({
  activeSessions,
  queuedItems,
  pendingSessions,
  onConversionsRefresh,
  staff,
  getDisplayName,
  trimCompleted,
  buckingCompleted,
  packagingCompleted,
  trimStats,
  buckingStats,
  packagingStats,
  onComplete,
  onCancel,
  onStartFromDispatch,
  onStartManual,
  onRefreshSessions,
}: FloorViewProps) {
  const [focusedCard, setFocusedCard] = useState<FocusedCard>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const toggleCard = useCallback((card: FocusedCard) => {
    setFocusedCard(prev => prev === card ? null : card);
  }, []);

  const isEmpty = activeSessions.length === 0 && queuedItems.length === 0;

  return (
    <LayoutGroup>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ─── Main Panel (3/5) ─── */}
        <div className="lg:col-span-3" style={{ minHeight: '500px' }}>
          <motion.div
            layout
            transition={springTransition}
            className={`${GLASS} p-5 h-full ${focusedCard ? 'flex flex-col' : ''}`}
          >
            <AnimatePresence mode="wait">
              {focusedCard === 'conversions' ? (
                <ConversionsPanelExpanded
                  pendingSessions={pendingSessions}
                  onRefresh={onConversionsRefresh}
                />
              ) : focusedCard === 'crew' ? (
                <CrewPanelExpanded
                  staff={staff}
                  sessions={activeSessions}
                  getDisplayName={getDisplayName}
                />
              ) : focusedCard === 'daily-summary' ? (
                <DailySummaryExpanded
                  trimCompleted={trimCompleted}
                  buckingCompleted={buckingCompleted}
                  packagingCompleted={packagingCompleted}
                />
              ) : (
                /* Default: Ticket Rail */
                <motion.div
                  key="panel-rail"
                  initial={fadeInVariants.initial}
                  animate={fadeInVariants.animate}
                  exit={fadeInVariants.exit}
                  transition={fadeInVariants.transition}
                  className="flex flex-col flex-1"
                >
                  {/* Active Sessions */}
                  {activeSessions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-3">
                        Active ({activeSessions.length})
                      </h3>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-2"
                      >
                        {activeSessions.map(session => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            onComplete={onComplete}
                            onCancel={onCancel}
                            onRefresh={onRefreshSessions}
                          />
                        ))}
                      </motion.div>
                    </div>
                  )}

                  {/* Queued Items */}
                  {queuedItems.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-3">
                        Queued ({queuedItems.length})
                      </h3>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-2"
                      >
                        {queuedItems.map(item => (
                          <QueuedCard
                            key={item.id}
                            item={item}
                            onStart={onStartFromDispatch}
                          />
                        ))}
                      </motion.div>
                    </div>
                  )}

                  {/* Empty state */}
                  {isEmpty && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-white/25 mb-4">All caught up — no active sessions or queued items</p>
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => setShowTypeMenu(v => !v)}
                            className={`${GLASS_ELEVATED} flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white/90 transition-all active:scale-95`}
                          >
                            <Plus className="w-4 h-4" />
                            Start Session
                          </button>
                          <AnimatePresence>
                            {showTypeMenu && (
                              <TypeMenu onSelect={(type) => { setShowTypeMenu(false); onStartManual(type); }} />
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floating start button (when not empty) */}
                  {!isEmpty && (
                    <div className="mt-auto pt-4 flex justify-end relative">
                      <button
                        type="button"
                        onClick={() => setShowTypeMenu(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Start Session
                      </button>
                      <AnimatePresence>
                        {showTypeMenu && (
                          <TypeMenu onSelect={(type) => { setShowTypeMenu(false); onStartManual(type); }} />
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ─── Secondary Panel (2/5) ─── */}
        <div className="lg:col-span-2 space-y-3">
          <ConversionsPanelCompact
            pendingSessions={pendingSessions}
            isActive={focusedCard === 'conversions'}
            onClick={() => toggleCard('conversions')}
          />
          <CrewPanelCompact
            staff={staff}
            sessions={activeSessions}
            getDisplayName={getDisplayName}
            isActive={focusedCard === 'crew'}
            onClick={() => toggleCard('crew')}
          />
          <DailySummaryCompact
            trimStats={trimStats}
            buckingStats={buckingStats}
            packagingStats={packagingStats}
            isActive={focusedCard === 'daily-summary'}
            onClick={() => toggleCard('daily-summary')}
          />
        </div>
      </div>
    </LayoutGroup>
  );
}

// ─── Type picker menu ─────────────────────────────────────────────────────

function TypeMenu({ onSelect }: { onSelect: (type: 'bucking' | 'trim' | 'packaging') => void }) {
  const types = [
    { key: 'bucking' as const, label: 'Bucking', icon: Scissors, color: '#F59E0B' },
    { key: 'trim' as const, label: 'Trim', icon: Leaf, color: '#10B981' },
    { key: 'packaging' as const, label: 'Packaging', icon: Box, color: '#6366F1' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={`${GLASS_ELEVATED} absolute bottom-full right-0 mb-2 p-1.5 min-w-[160px] z-10`}
    >
      {types.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          {label}
        </button>
      ))}
    </motion.div>
  );
}
