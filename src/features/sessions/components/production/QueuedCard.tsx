/**
 * QueuedCard — Dispatch queue item card for the ticket rail
 *
 * Dimmer than active cards — these are waiting, not cooking.
 * Type-colored glowing dot with subtle ambient glow.
 */

import { motion } from 'framer-motion';
import { Play, AlertTriangle } from 'lucide-react';
import type { DispatchItem } from '@/features/delivery/hooks/useProductionDispatch';
import { PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS } from '@/features/delivery/hooks/useProductionDispatch';
import { SESSION_TYPE_COLORS, formatWeight, staggerItem } from './constants';
import type { SessionType } from '../../types';

interface QueuedCardProps {
  item: DispatchItem;
  onStart: (item: DispatchItem) => void;
}

function stageToSessionType(stage: string): SessionType {
  if (stage === 'buck') return 'bucking';
  if (stage === 'package_to_order') return 'packaging';
  return 'trim';
}

export function QueuedCard({ item, onStart }: QueuedCardProps) {
  const sessionType = stageToSessionType(item.processing_stage);
  const color = SESSION_TYPE_COLORS[sessionType];
  const isHighPriority = item.priority <= 2;

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] backdrop-blur-xl relative overflow-hidden transition-all hover:bg-white/[0.04] hover:border-white/[0.12] group"
      style={{ minHeight: '72px' }}
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute -top-6 left-8 rounded-full pointer-events-none"
        style={{
          width: '80px',
          height: '80px',
          background: `radial-gradient(circle, ${color.rgba}0.06) 0%, transparent 70%)`,
          filter: 'blur(10px)',
        }}
      />

      <div className="relative p-3.5 pl-4 flex items-center gap-3.5">
        {/* Glowing type dot */}
        <div className="relative flex-shrink-0">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: `${color.rgba}0.6)`,
              boxShadow: `0 0 8px ${color.rgba}0.3), 0 0 16px ${color.rgba}0.1)`,
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white/60 truncate">{item.strain}</span>
            {isHighPriority && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                High
              </span>
            )}
            {item.quantity_g && (
              <span className="text-xs font-mono text-white/30">{formatWeight(item.quantity_g)}</span>
            )}
          </div>
          <div className="text-[11px] text-white/25 truncate">
            {item.batch_number}
            {' · '}
            {PROCESSING_STAGE_LABELS[item.processing_stage]}
            {item.treatment_type ? ` → ${TREATMENT_TYPE_LABELS[item.treatment_type]}` : ''}
          </div>
        </div>

        {/* Start button */}
        <button
          type="button"
          onClick={() => onStart(item)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 opacity-70 group-hover:opacity-100"
          style={{
            backgroundColor: `${color.rgba}0.10)`,
            color: `${color.rgba}0.85)`,
            border: `1px solid ${color.rgba}0.18)`,
            boxShadow: `0 0 12px ${color.rgba}0.06)`,
          }}
        >
          <Play className="w-3 h-3" />
          Start
        </button>
      </div>
    </motion.div>
  );
}
