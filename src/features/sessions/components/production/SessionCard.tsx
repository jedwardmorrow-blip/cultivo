/**
 * SessionCard — Unified active session card for the ticket rail
 *
 * Shows operator, strain, input weight, elapsed time, type color.
 * Actions: Pause/Resume, Cancel, Complete — all inline.
 * Stale sessions (>4hr) get red urgency ring. Paused sessions get amber pulse.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, X, CheckCircle2, Timer } from 'lucide-react';
import { formatElapsedTime } from '../../utils';
import { pauseSession, resumeSession } from '../../services/sessions.service';
import {
  GLASS,
  SESSION_TYPE_COLORS,
  STALE_SESSION_HOURS,
  formatWeight,
  staggerItem,
  type NormalizedSession,
} from './constants';

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

  // Border and glow
  const borderColor = session.isPaused
    ? 'rgba(245,158,11,0.3)'
    : isStale
      ? 'rgba(239,68,68,0.3)'
      : `${color.rgba}0.15)`;

  const glowShadow = session.isPaused
    ? '0 0 12px rgba(245,158,11,0.15), 0 0 30px rgba(245,158,11,0.06)'
    : isStale
      ? '0 0 14px rgba(239,68,68,0.2), 0 0 40px rgba(239,68,68,0.08)'
      : `0 0 8px ${color.rgba}0.1)`;

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
      className={`${GLASS} relative overflow-hidden transition-all`}
      style={{
        borderColor,
        boxShadow: `${glowShadow}, 0 8px 32px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Type color bar — left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: color.hex }}
      />

      <div className="pl-4 pr-3 py-3 flex items-center gap-3">
        {/* Main info */}
        <div className="flex-1 min-w-0 pl-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white truncate">{session.worker || 'Unassigned'}</span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{
                backgroundColor: `${color.rgba}0.12)`,
                color: `${color.rgba}0.8)`,
                border: `1px solid ${color.rgba}0.2)`,
              }}
            >
              {color.label}
            </span>
          </div>
          <div className="text-xs text-white/50 truncate">
            {session.strain}{session.batchNumber ? ` · ${session.batchNumber}` : ''}{session.inputWeight > 0 ? ` · ${formatWeight(session.inputWeight)}` : ''}
          </div>
        </div>

        {/* Elapsed time */}
        <div className="text-right flex-shrink-0 mr-1">
          {session.isPaused ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
              <span className="text-sm font-semibold text-amber-400">PAUSED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-white/30" />
              <span className={`text-sm font-semibold tabular-nums ${isStale ? 'text-red-400' : 'text-white/70'}`}>
                {elapsed}
              </span>
            </div>
          )}
          {isStale && !session.isPaused && (
            <span className="text-[9px] text-red-400/70 mt-0.5 block">stale</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={pausingId === session.id}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              session.isPaused
                ? 'hover:bg-emerald-500/15 text-emerald-400'
                : 'hover:bg-amber-500/15 text-amber-400'
            }`}
            title={session.isPaused ? 'Resume' : 'Pause'}
          >
            {session.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onCancel(session)}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400/60 hover:text-red-400 transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onComplete(session)}
            className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-emerald-400/60 hover:text-emerald-400 transition-colors"
            title="Complete"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
