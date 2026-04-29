/**
 * SessionCard — Unified active session card for the ticket rail
 *
 * Design: Matches Cultivation CommandCenter room tile quality.
 * - Ambient glow (type-colored radial gradient behind card)
 * - Status ring with animated pulse
 * - Hero elapsed time as the visual anchor
 * - Variable sizing: paused/stale cards grow larger
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, X, CheckCircle2 } from 'lucide-react';
import { formatElapsedTime } from '../../utils';
import { pauseSession, resumeSession } from '../../services/sessions.service';
import {
  SESSION_TYPE_COLORS,
  STALE_SESSION_HOURS,
  formatWeight,
  staggerItem,
  type NormalizedSession,
} from './constants';

const GLASS_TILE = 'rounded-cult border border-cult-border-subtle bg-cult-surface';

interface SessionCardProps {
  session: NormalizedSession;
  onComplete: (session: NormalizedSession) => void;
  onCancel: (session: NormalizedSession) => void;
  onRefresh: () => void;
}

export function SessionCard({ session, onComplete, onCancel, onRefresh }: SessionCardProps) {
  const [pausingId, setPausingId] = useState<string | null>(null);

  const color = SESSION_TYPE_COLORS[session.type];
  const elapsed = formatElapsedTime(session.startedAt, session.totalPauseMinutes);

  // Stale detection
  const ageHours = (Date.now() - new Date(session.startedAt).getTime()) / (1000 * 60 * 60);
  const isStale = ageHours > STALE_SESSION_HOURS;
  const needsAttention = session.isPaused || isStale;

  // Colors driven by state
  const ringColor = session.isPaused
    ? '#F59E0B'
    : isStale
      ? '#EF4444'
      : color.hex;

  const glowRgba = session.isPaused
    ? 'rgba(245,158,11,'
    : isStale
      ? 'rgba(239,68,68,'
      : color.rgba;

  const tileBg = session.isPaused
    ? 'rgba(245,158,11,0.04)'
    : isStale
      ? 'rgba(239,68,68,0.05)'
      : `${color.rgba}0.03)`;

  const tileBorder = session.isPaused
    ? 'rgba(245,158,11,0.2)'
    : isStale
      ? 'rgba(239,68,68,0.2)'
      : `${color.rgba}0.12)`;

  const handleTogglePause = async () => {
    setPausingId(session.id);
    try {
      if (session.isPaused) {
        await resumeSession(session.id, session.type);
      } else {
        await pauseSession(session.id, session.type);
      }
      onRefresh();
    } finally {
      setPausingId(null);
    }
  };

  return (
    <motion.div
      variants={staggerItem}
      className={`${GLASS_TILE} relative overflow-hidden transition-colors hover:bg-cult-surface-raised hover:border-cult-border group`}
      style={{
        minHeight: needsAttention ? '140px' : '120px',
        backgroundColor: tileBg,
        borderColor: tileBorder,
        boxShadow: `0 0 ${needsAttention ? '14px' : '8px'} ${glowRgba}${needsAttention ? '0.15' : '0.08'}), 0 0 ${needsAttention ? '40px' : '24px'} ${glowRgba}${needsAttention ? '0.06' : '0.03'}), 0 4px 24px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Ambient glow — type-colored light bleeding through glass */}
      <div
        className="absolute -top-10 left-1/3 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          width: needsAttention ? '180px' : '120px',
          height: needsAttention ? '180px' : '120px',
          background: `radial-gradient(circle, ${glowRgba}${needsAttention ? '0.20' : '0.12'}) 0%, ${glowRgba}0.04) 45%, transparent 70%)`,
          filter: 'blur(14px)',
        }}
      />

      <div className="relative p-4 flex flex-col h-full">
        {/* Top row: Status ring + info + actions */}
        <div className="flex items-start gap-3">
          {/* Status ring — matches CommandCenter room tile pattern */}
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500"
            style={{
              borderColor: ringColor,
              boxShadow: needsAttention
                ? `0 0 12px ${glowRgba}0.4), 0 0 30px ${glowRgba}0.15)`
                : `0 0 8px ${glowRgba}0.25), 0 0 20px ${glowRgba}0.08)`,
            }}
          >
            {session.isPaused ? (
              <motion.div
                className="w-3 h-3 rounded-full bg-amber-400"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : isStale ? (
              <motion.div
                className="w-3 h-3 rounded-full bg-red-400"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.hex, opacity: 0.7 }} />
            )}
          </div>

          {/* Name + type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-white tracking-wide truncate">
                {session.worker || 'Unassigned'}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest font-medium"
                style={{ color: `${color.rgba}0.6)` }}
              >
                {color.label}
              </span>
            </div>
            <div className="text-[11px] text-white/35 mt-0.5 truncate">
              {session.strain}
              {session.batchNumber ? ` · ${session.batchNumber}` : ''}
              {session.inputWeight > 0 ? ` · ${formatWeight(session.inputWeight)}` : ''}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleTogglePause}
              disabled={pausingId === session.id}
              className={`p-2 rounded-cult transition-colors disabled:opacity-50 ${
                session.isPaused
                  ? 'hover:bg-emerald-500/15 text-emerald-400'
                  : 'hover:bg-amber-500/15 text-amber-400'
              }`}
              title={session.isPaused ? 'Resume' : 'Pause'}
            >
              {session.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onCancel(session)}
              className="p-2 rounded-cult hover:bg-red-500/15 text-red-400/50 hover:text-red-400 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onComplete(session)}
              className="p-2 rounded-cult hover:bg-emerald-500/15 text-emerald-400/50 hover:text-emerald-400 transition-colors"
              title="Complete"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero: Elapsed time — the thing you glance at on the kitchen rail */}
        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            {session.isPaused ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-amber-400">PAUSED</span>
                <span className="text-xs text-white/25">({elapsed})</span>
              </div>
            ) : (
              <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: isStale ? '#EF4444' : 'rgba(232,224,212,0.85)' }}>
                {elapsed}
              </div>
            )}
            {isStale && !session.isPaused && (
              <span className="text-[10px] text-red-400/60 uppercase tracking-wider">stale — needs attention</span>
            )}
          </div>

          {/* Package ID chip */}
          {session.packageId && (
            <span className="text-[10px] text-cult-text-muted font-mono px-2 py-0.5 rounded bg-cult-surface-inset border border-cult-border-faint">
              {session.packageId}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
