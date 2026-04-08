/**
 * FloorView — The Ticket Rail + Bento Card Swap
 *
 * Design upgrade: Active sessions render in a responsive grid (like room tiles
 * in the Cultivation CommandCenter), not a vertical list. The main panel has no
 * outer glass wrapper when showing the rail — cards ARE the tiles. Secondary cards
 * get ambient glows matching their accent color.
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
          <AnimatePresence mode="wait">
            {focusedCard ? (
              /* Expanded bento card gets the glass wrapper */
              <motion.div
                key={`focused-${focusedCard}`}
                layout
                transition={springTransition}
                className={`${GLASS} p-5 h-full flex flex-col`}
              >
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
              /* Default: Ticket Rail — cards ARE the grid, no outer wrapper */
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
                      <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                        <Scissors className="w-8 h-8 text-white/10" />
                      </div>
                      <p className="text-base font-semibold text-white/25 mb-1">All caught up</p>
                      <p className="text-sm text-white/15 mb-6">No active sessions or queued items</p>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setShowTypeMenu(v => !v)}
                          className={`${GLASS_ELEVATED} flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white/60 hover:text-white/80 transition-all active:scale-95`}
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
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white/35 hover:text-white/55 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all active:scale-95"
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
      className={`${GLASS_ELEVATED} absolute bottom-full right-0 mb-2 p-1.5 min-w-[170px] z-10`}
    >
      {types.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
        >
          <Icon className="w-4 h-4" style={{ color }} />
          {label}
        </button>
      ))}
    </motion.div>
  );
}
