import { motion } from 'framer-motion';
import { FlaskConical, Clock, FileText } from 'lucide-react';
import { useCoaBatches, COA_COLUMNS, type CoaBatchRow, type CoaStatus } from '../../../hooks/useCoaBatches';

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysColor(days: number | null): string {
  if (days == null) return 'text-white/30';
  if (days < 7) return 'text-emerald-400';
  if (days < 14) return 'text-amber-400';
  return 'text-rose-400';
}

// ─── Main Component ──────────────────────────────────────────────────────

interface CoaDeskLensProps {
  onBatchClick?: (batchId: string) => void;
  onCoaClick?: (batchId: string) => void;
}

export function CoaDeskLens({ onBatchClick, onCoaClick }: CoaDeskLensProps) {
  const { columns, loading } = useCoaBatches();

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4 min-w-[220px] w-[220px] h-[300px] animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────
  const totalBatches = Array.from(columns.values()).reduce((s, arr) => s + arr.length, 0);
  if (totalBatches === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <FlaskConical className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/50 font-medium">No batches awaiting COA action</p>
        <p className="text-white/30 text-sm mt-1">All caught up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-4 flex-wrap">
        {COA_COLUMNS.map((col) => {
          const count = columns.get(col.status)?.length ?? 0;
          return (
            <span key={col.status} className="flex items-center gap-1.5 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color, opacity: 0.75 }} />
              {col.label}: <span className="text-white font-medium">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {COA_COLUMNS.map((col) => {
          const items = columns.get(col.status) ?? [];
          return (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              items={items}
              onCardClick={onCoaClick ?? onBatchClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Kanban Column ───────────────────────────────────────────────────────

function KanbanColumn({
  status,
  label,
  color,
  items,
  onCardClick,
}: {
  status: CoaStatus;
  label: string;
  color: string;
  items: CoaBatchRow[];
  onCardClick?: (batchId: string) => void;
}) {
  return (
    <div
      className="min-w-[220px] w-[220px] shrink-0 flex flex-col"
      role="region"
      aria-label={`${label} column`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color, opacity: 0.75 }}
        />
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-white/30 ml-auto bg-cult-surface-raised px-1.5 py-px rounded-full">
          {items.length}
        </span>
      </div>

      {/* Cards container */}
      <div
        className="flex-1 space-y-2 p-2 rounded-cult bg-cult-surface-inset border border-cult-border-faint min-h-[200px] max-h-[500px] overflow-y-auto scrollbar-thin"
        role="list"
      >
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <p className="text-[10px] text-white/20">No batches</p>
          </div>
        ) : (
          items.map((batch, i) => (
            <CoaCard
              key={batch.batch_id}
              batch={batch}
              color={color}
              index={i}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── COA Card ────────────────────────────────────────────────────────────

function CoaCard({
  batch,
  color,
  index,
  onClick,
}: {
  batch: CoaBatchRow;
  color: string;
  index: number;
  onClick?: (batchId: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick?.(batch.batch_id)}
      className="w-full text-left bg-cult-surface rounded-cult p-3 border border-cult-border-subtle hover:bg-cult-surface-overlay hover:border-cult-border transition-all active:scale-[0.98]"
      role="listitem"
    >
      {/* Batch code + strain */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-medium text-white font-mono truncate block">
            {batch.batch_number}
          </span>
          <span className="text-[10px] text-white/30 truncate block">{batch.strain}</span>
        </div>
        {/* Color accent dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: color, opacity: 0.6 }}
        />
      </div>

      {/* Days in state */}
      {batch.days_in_current_state != null && (
        <div className="flex items-center gap-1 mt-2">
          <Clock className="w-2.5 h-2.5 text-white/20" />
          <span className={`text-[10px] tabular-nums ${daysColor(batch.days_in_current_state)}`}>
            {batch.days_in_current_state}d in state
          </span>
        </div>
      )}

      {/* Cannabinoid data (for results-in and available) */}
      {batch.thc_percentage != null && (
        <div className="flex items-center gap-2 mt-1.5">
          <FileText className="w-2.5 h-2.5 text-white/20" />
          <span className="text-[10px] text-white/40 tabular-nums">
            THC {batch.thc_percentage.toFixed(1)}%
            {batch.cbd_percentage != null && ` · CBD ${batch.cbd_percentage.toFixed(1)}%`}
          </span>
        </div>
      )}
    </motion.button>
  );
}
