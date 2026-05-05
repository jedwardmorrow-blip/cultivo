/**
 * FloorView — The Ticket Rail + Bento Card Swap
 *
 * Active sessions in a responsive grid (like CommandCenter room tiles).
 * Bento card swap: tapping a secondary card expands it into the main panel.
 * A "Back to Floor" button in the expanded panel returns to the rail.
 * Active bento cards show a clear "tap to return" visual cue.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronLeft, Scissors } from 'lucide-react';
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
  activeSessions: NormalizedSession[];
  queuedItems: DispatchItem[];
  pendingSessions: PendingConversionSession[];
  onConversionsRefresh: () => void;
  staff: ActiveStaffMember[];
  getDisplayName: (m: ActiveStaffMember) => string;
  trimCompleted: TrimSession[];
  buckingCompleted: BuckingSession[];
  packagingCompleted: PackagingSession[];
  trimStats: TrimSessionStats;
  buckingStats: BuckingSessionStats;
  packagingStats: PackagingSessionStats;
  onComplete: (session: NormalizedSession) => void;
  onCancel: (session: NormalizedSession) => void;
  onStartFromDispatch: (item: DispatchItem) => void;
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
  onRefreshSessions,
}: FloorViewProps) {
  const [focusedCard, setFocusedCard] = useState<FocusedCard>(null);

  const toggleCard = useCallback((card: FocusedCard) => {
    setFocusedCard(prev => prev === card ? null : card);
  }, []);

  const backToFloor = useCallback(() => setFocusedCard(null), []);

  const isEmpty = activeSessions.length === 0 && queuedItems.length === 0;

  return (
    <LayoutGroup>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ─── Main Panel (3/5) ─── */}
        <div className="lg:col-span-3" style={{ minHeight: '500px' }}>
          <AnimatePresence mode="wait">
            {focusedCard ? (
              /* Expanded bento card gets the glass wrapper + back button */
              <motion.div
                key={`focused-${focusedCard}`}
                layout
                transition={springTransition}
                className={`${GLASS} p-5 h-full flex flex-col`}
              >
                {/* Back to floor button */}
                <button
                  type="button"
                  onClick={backToFloor}
                  className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-4 self-start active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back to Floor
                </button>

                {focusedCard === 'conversions' && (
                  <ConversionsPanelExpanded
                    pendingSessions={pendingSessions}
                    onRefresh={onConversionsRefresh}
                  />
                )}
                {focusedCard === 'crew' && (
                  <CrewPanelExpanded
                    staff={staff}
                    sessions={activeSessions}
                    getDisplayName={getDisplayName}
                  />
                )}
                {focusedCard === 'daily-summary' && (
                  <DailySummaryExpanded
                    trimCompleted={trimCompleted}
                    buckingCompleted={buckingCompleted}
                    packagingCompleted={packagingCompleted}
                  />
                )}
              </motion.div>
            ) : (
              /* Default: Ticket Rail — cards ARE the grid */
              <motion.div
                key="panel-rail"
                initial={fadeInVariants.initial}
                animate={fadeInVariants.animate}
                exit={fadeInVariants.exit}
                transition={fadeInVariants.transition}
                className="flex flex-col h-full"
              >
                {/* Active Sessions — bento grid layout */}
                {activeSessions.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-[11px] text-white/25 uppercase tracking-[0.15em] font-medium mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active ({activeSessions.length})
                    </h3>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
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
                  <div className="mb-5">
                    <h3 className="text-[11px] text-white/25 uppercase tracking-[0.15em] font-medium mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full border border-white/20" />
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
                  <div className="flex-1 flex items-center justify-center" style={{ minHeight: '400px' }}>
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-cult bg-cult-surface-inset border border-cult-border-subtle flex items-center justify-center mx-auto mb-5">
                        <Scissors className="w-8 h-8 text-white/10" />
                      </div>
                      <p className="text-base font-semibold text-white/25 mb-1">All caught up</p>
                      <p className="text-sm text-white/15">No active sessions or queued items</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
