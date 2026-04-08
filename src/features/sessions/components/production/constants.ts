/**
 * Production CommandCenter — Shared constants and types
 *
 * Design tokens follow the Cultivation CommandCenter pattern.
 * Session type colors approved in spec: Bucking amber, Trim emerald, Packaging indigo.
 */

import type { BuckingSession, TrimSession, PackagingSession, SessionType } from '../../types';

// ═══════════════════════════════════════════════════════════════
// Glass tokens — matches CommandCenter pattern
// ═══════════════════════════════════════════════════════════════

export const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
export const GLASS_ELEVATED = 'rounded-2xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)]';
export const GLASS_HOVER = 'hover:bg-white/[0.10] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';

// ═══════════════════════════════════════════════════════════════
// Session type colors
// ═══════════════════════════════════════════════════════════════

export const SESSION_TYPE_COLORS: Record<SessionType, { hex: string; rgba: string; label: string }> = {
  bucking:   { hex: '#F59E0B', rgba: 'rgba(245,158,11,',   label: 'Bucking' },
  trim:      { hex: '#10B981', rgba: 'rgba(16,185,129,',    label: 'Trim' },
  packaging: { hex: '#6366F1', rgba: 'rgba(99,102,241,',    label: 'Packaging' },
};

// ═══════════════════════════════════════════════════════════════
// Stale session threshold (hours)
// ═══════════════════════════════════════════════════════════════

export const STALE_SESSION_HOURS = 4;

// ═══════════════════════════════════════════════════════════════
// Normalized session — unified type for all 3 session types
// ═══════════════════════════════════════════════════════════════

export interface NormalizedSession {
  id: string;
  type: SessionType;
  worker: string;
  strain: string;
  packageId: string;
  batchNumber: string;
  inputWeight: number;
  startedAt: string;
  isPaused: boolean;
  totalPauseMinutes: number;
  dispatchItemId: string | null;
  // Raw session references for modals
  rawBucking?: BuckingSession;
  rawTrim?: TrimSession;
  rawPackaging?: PackagingSession;
}

/**
 * Normalize sessions from all three hooks into a unified format.
 * Pattern established in ProductionHub lines 252-298.
 */
export function normalizeSessions(
  buckingActive: BuckingSession[],
  trimActive: TrimSession[],
  packagingActive: PackagingSession[],
): NormalizedSession[] {
  const sessions: NormalizedSession[] = [];

  for (const s of buckingActive) {
    sessions.push({
      id: s.id,
      type: 'bucking',
      worker: (s as any).bucker_name || '',
      strain: (s as any).strain || '',
      packageId: (s as any).binned_package_id || '',
      batchNumber: (s as any).batch_id || '',
      inputWeight: (s as any).binned_weight_grams || 0,
      startedAt: (s as any).started_at || '',
      isPaused: !!(s as any).is_paused,
      totalPauseMinutes: (s as any).total_pause_minutes || 0,
      dispatchItemId: (s as any).dispatch_item_id || null,
      rawBucking: s,
    });
  }

  for (const s of trimActive) {
    sessions.push({
      id: s.id,
      type: 'trim',
      worker: (s as any).trimmer_name || '',
      strain: (s as any).strain || '',
      packageId: (s as any).package_id || '',
      batchNumber: (s as any).batch_id || '',
      inputWeight: (s as any).pull_weight || (s as any).pulled_weight || 0,
      startedAt: (s as any).started_at || '',
      isPaused: !!(s as any).is_paused,
      totalPauseMinutes: (s as any).total_pause_minutes || 0,
      dispatchItemId: (s as any).dispatch_item_id || null,
      rawTrim: s,
    });
  }

  for (const s of packagingActive) {
    sessions.push({
      id: s.id,
      type: 'packaging',
      worker: (s as any).packager_name || '',
      strain: (s as any).strain || '',
      packageId: (s as any).package_id || '',
      batchNumber: (s as any).batch_id || '',
      inputWeight: (s as any).pull_weight || (s as any).source_weight_grams || 0,
      startedAt: (s as any).started_at || '',
      isPaused: !!(s as any).is_paused,
      totalPauseMinutes: (s as any).total_pause_minutes || 0,
      dispatchItemId: (s as any).dispatch_item_id || null,
      rawPackaging: s,
    });
  }

  // Sort by elapsed time descending — longest-running first (makes stale sessions visible)
  sessions.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  return sessions;
}

// ═══════════════════════════════════════════════════════════════
// Animation variants — matches CommandCenter pattern
// ═══════════════════════════════════════════════════════════════

export const springTransition = { type: 'spring' as const, stiffness: 300, damping: 28 };

export const fadeInVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

// ═══════════════════════════════════════════════════════════════
// Chart.js dark theme — matches existing dashboard charts
// ═══════════════════════════════════════════════════════════════

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1C1C1C',
  titleColor: '#FFFFFF',
  bodyColor: '#A6A6A6',
  borderColor: '#2E2E2E',
  borderWidth: 1,
  cornerRadius: 6,
};

export const CHART_GRID_COLOR = 'rgba(46, 46, 46, 0.5)';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

export function formatWeight(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}
