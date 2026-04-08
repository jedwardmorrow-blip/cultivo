/**
 * QueuedCard — Dispatch queue item card for the ticket rail
 *
 * Shows strain, batch, weight, processing stage, priority.
 * "Start" button opens DispatchSessionModal.
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
      className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.03] backdrop-blur-xl p-3 pl-4 flex items-center gap-3 transition-all hover:bg-white/[0.05] hover:border-white/[0.15]"
    >
      {/* Type indicator dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: `${color.rgba}0.5)` }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white/70 truncate">{item.strain}</span>
          {isHighPriority && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
              <AlertTriangle className="w-2.5 h-2.5" />
              High
            </span>
          )}
        </div>
        <div className="text-xs text-white/35 truncate">
          {item.batch_number}
          {item.quantity_g ? ` · ${formatWeight(item.quantity_g)}` : ''}
          {' · '}
          {PROCESSING_STAGE_LABELS[item.processing_stage]}
          {item.treatment_type ? ` → ${TREATMENT_TYPE_LABELS[item.treatment_type]}` : ''}
        </div>
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={() => onStart(item)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
        style={{
          backgroundColor: `${color.rgba}0.12)`,
          color: `${color.rgba}0.9)`,
          border: `1px solid ${color.rgba}0.2)`,
        }}
      >
        <Play className="w-3 h-3" />
        Start
      </button>
    </motion.div>
  );
}
