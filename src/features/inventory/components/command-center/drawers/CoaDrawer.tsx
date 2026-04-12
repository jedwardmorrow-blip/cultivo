import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, FileText, Calendar, Download, ChevronRight } from 'lucide-react';
import { useCoaDrawerData, type CoaRecord } from '../../../hooks/useCoaDrawerData';
import { useCoaAdvance, getNextStatuses, getTransitionLabel } from '../../../hooks/useCoaAdvance';
import type { CoaStatus } from '../../../hooks/useCoaBatches';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  curing: { label: 'Curing', color: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/20' },
  pending_sampling: { label: 'Ready to Sample', color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/20' },
  testing_in_progress: { label: 'Testing', color: 'text-blue-300', bg: 'bg-blue-500/15 border-blue-500/20' },
  coa_received: { label: 'Results In', color: 'text-cyan-300', bg: 'bg-cyan-500/15 border-cyan-500/20' },
  available: { label: 'Available', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/20' },
  coa_failed: { label: 'Failed', color: 'text-rose-300', bg: 'bg-rose-500/15 border-rose-500/20' },
};

interface CoaDrawerProps {
  batchId: string | null;
  onClose: () => void;
  onBatchClick?: (batchId: string) => void;
}

export function CoaDrawer({ batchId, onClose, onBatchClick }: CoaDrawerProps) {
  const { coa, loading, refetch } = useCoaDrawerData(batchId);
  const { advance, advancing } = useCoaAdvance();
  const isOpen = batchId !== null;

  const handleAdvance = async (targetStatus: CoaStatus) => {
    if (!batchId) return;
    const ok = await advance(batchId, targetStatus);
    if (ok) refetch();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg glass-modal border-l border-cult-border z-[61] flex flex-col shadow-glass-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coa-drawer-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border-subtle">
              <div className="min-w-0">
                {loading ? (
                  <div className="h-6 w-40 rounded bg-cult-surface-raised animate-pulse" />
                ) : coa ? (
                  <>
                    <h2 id="coa-drawer-title" className="text-lg font-bold text-white font-mono truncate">
                      COA — {coa.batch_number}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-white/50">{coa.strain}</span>
                      {(() => {
                        const cfg = STATUS_CONFIG[coa.coa_status] ?? STATUS_CONFIG.curing;
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <span className="text-white/30">No COA data</span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close drawer"
                className="p-2 rounded-xl hover:bg-cult-surface-overlay transition-colors text-white/40 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-cult-near-black animate-pulse" />
                  ))}
                </div>
              ) : coa ? (
                <>
                  {/* Cannabinoids */}
                  <CannabinoidPanel coa={coa} />

                  {/* Terpenes */}
                  <TerpenePanel coa={coa} />

                  {/* Lab metadata */}
                  <LabMetadata coa={coa} />

                  {/* Advance actions */}
                  <CoaActions
                    currentStatus={coa.coa_status as CoaStatus}
                    advancing={advancing}
                    onAdvance={handleAdvance}
                  />

                  {/* PDF link */}
                  {coa.pdf_file_path && (
                    <div>
                      <span className="text-xs text-white/40 uppercase tracking-wider">Certificate</span>
                      <a
                        href={coa.pdf_file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 mt-2 bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle hover:bg-cult-surface-overlay hover:border-cult-border transition-all"
                      >
                        <FileText className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/60 flex-1">View PDF</span>
                        <Download className="w-3.5 h-3.5 text-white/30" />
                      </a>
                    </div>
                  )}

                  {/* Link to batch */}
                  {onBatchClick && (
                    <button
                      onClick={() => {
                        onClose();
                        onBatchClick(coa.batch_id);
                      }}
                      className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors py-2"
                    >
                      View batch detail →
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FlaskConical className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">No COA data for this batch</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Cannabinoid Panel ───────────────────────────────────────────────────

function CannabinoidPanel({ coa }: { coa: CoaRecord }) {
  if (coa.thc_percentage == null && coa.cbd_percentage == null) {
    return (
      <div>
        <span className="text-xs text-white/40 uppercase tracking-wider">Cannabinoids</span>
        <div className="rounded-xl bg-cult-surface-inset border border-cult-border-faint p-4 mt-2 text-center">
          <p className="text-white/20 text-sm">No lab results yet</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="text-xs text-white/40 uppercase tracking-wider">Cannabinoids</span>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {coa.thc_percentage != null && (
          <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle text-center">
            <span className="text-[10px] text-white/40 uppercase">THC</span>
            <p className="text-2xl font-bold text-white tabular-nums mt-1">
              {coa.thc_percentage.toFixed(1)}%
            </p>
          </div>
        )}
        {coa.cbd_percentage != null && (
          <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle text-center">
            <span className="text-[10px] text-white/40 uppercase">CBD</span>
            <p className="text-2xl font-bold text-white tabular-nums mt-1">
              {coa.cbd_percentage.toFixed(1)}%
            </p>
          </div>
        )}
        {coa.total_cannabinoids_percentage != null && (
          <div className="bg-cult-near-black rounded-xl p-4 border border-cult-border-subtle text-center">
            <span className="text-[10px] text-white/40 uppercase">Total</span>
            <p className="text-2xl font-bold text-white tabular-nums mt-1">
              {coa.total_cannabinoids_percentage.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Terpene Panel ───────────────────────────────────────────────────────

function TerpenePanel({ coa }: { coa: CoaRecord }) {
  const terpenes = [
    coa.terpene_1_name ? { name: coa.terpene_1_name, value: coa.terpene_1_value } : null,
    coa.terpene_2_name ? { name: coa.terpene_2_name, value: coa.terpene_2_value } : null,
    coa.terpene_3_name ? { name: coa.terpene_3_name, value: coa.terpene_3_value } : null,
  ].filter(Boolean) as { name: string; value: number | null }[];
  if (terpenes.length === 0 && coa.total_terpenes_mg_g == null) return null;

  return (
    <div>
      <span className="text-xs text-white/40 uppercase tracking-wider">Terpenes</span>
      <div className="mt-2 space-y-2">
        {coa.total_terpenes_mg_g != null && (
          <div className="bg-cult-near-black rounded-xl p-3 border border-cult-border-subtle">
            <span className="text-[10px] text-white/40">Total Terpenes</span>
            <p className="text-lg font-bold text-white tabular-nums">
              {coa.total_terpenes_mg_g.toFixed(1)} mg/g
            </p>
          </div>
        )}
        {terpenes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {terpenes.map((t, i) => (
              <span
                key={i}
                className="text-xs text-white/50 bg-cult-near-black border border-cult-border-subtle px-3 py-1.5 rounded-lg"
              >
                {t.name}{t.value != null ? ` — ${t.value.toFixed(1)} mg/g` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COA Actions ────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, { bg: string; text: string; hover: string }> = {
  pending_sampling: { bg: 'bg-amber-500/15', text: 'text-amber-300', hover: 'hover:bg-amber-500/25' },
  testing_in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-300', hover: 'hover:bg-blue-500/25' },
  coa_received: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', hover: 'hover:bg-cyan-500/25' },
  coa_failed: { bg: 'bg-rose-500/15', text: 'text-rose-300', hover: 'hover:bg-rose-500/25' },
  available: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', hover: 'hover:bg-emerald-500/25' },
};

function CoaActions({
  currentStatus,
  advancing,
  onAdvance,
}: {
  currentStatus: CoaStatus;
  advancing: boolean;
  onAdvance: (target: CoaStatus) => void;
}) {
  const nextStatuses = getNextStatuses(currentStatus);
  if (nextStatuses.length === 0) return null;

  return (
    <div>
      <span className="text-xs text-white/40 uppercase tracking-wider">Actions</span>
      <div className="space-y-2 mt-2">
        {nextStatuses.map((target) => {
          const colors = ACTION_COLORS[target] ?? ACTION_COLORS.available;
          return (
            <button
              key={target}
              onClick={() => onAdvance(target)}
              disabled={advancing}
              className={`w-full flex items-center justify-between gap-2 ${colors.bg} ${colors.hover} border border-cult-border-subtle rounded-xl p-3 transition-all active:scale-[0.98] disabled:opacity-50`}
            >
              <span className={`text-sm font-medium ${colors.text}`}>
                {getTransitionLabel(target)}
              </span>
              <ChevronRight className={`w-4 h-4 ${colors.text} opacity-60`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lab Metadata ────────────────────────────────────────────────────────

function LabMetadata({ coa }: { coa: CoaRecord }) {
  const items = [
    coa.sample_date ? { label: 'Sample Date', value: new Date(coa.sample_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) } : null,
    coa.manufacture_date ? { label: 'Manufacture Date', value: new Date(coa.manufacture_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) } : null,
    coa.testing_submitted_at ? { label: 'Submitted', value: new Date(coa.testing_submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div>
      <span className="text-xs text-white/40 uppercase tracking-wider">Lab Details</span>
      <div className="space-y-1.5 mt-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-white/20" />
            <span className="text-xs text-white/40">{item.label}:</span>
            <span className="text-xs text-white/60">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
