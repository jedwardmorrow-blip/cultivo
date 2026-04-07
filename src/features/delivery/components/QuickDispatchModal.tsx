/**
 * QuickDispatchModal — Dispatch inventory to production without an order.
 *
 * Flow: Select strain → Select batch → See packages → Send to processing.
 * Creates production_dispatch_items with order_item_id = null (stock build).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Package, Send, Loader2, CheckCircle2, AlertTriangle,
  ChevronRight, Boxes, ShieldCheck, FlaskConical, Award,
} from 'lucide-react';
import { BaseModal } from '@/shared/components/BaseModal';
import { supabase } from '@/lib/supabase';
import {
  fetchStrainInventory,
  getNextAction,
  getProcessingStageForCategory,
  COA_STATUS_CONFIG,
  GRADE_COLOR_MAP,
} from '../hooks/useOrderFulfillment';
import type { InventoryPackage } from '../hooks/useOrderFulfillment';
import { STAGE_TREATMENTS } from '../hooks/useProductionDispatch';
import type { ProcessingStage } from '../hooks/useProductionDispatch';

// ─── Stage visuals ──────────────────────────────────────────────────────────

const STAGE_THEME: Record<string, { dot: string; border: string; text: string; gradient: string }> = {
  'Raw (binned)':            { dot: 'bg-indigo-400', border: 'border-indigo-500/20', text: 'text-indigo-300', gradient: 'from-indigo-500/10 to-transparent' },
  'Bucked':                  { dot: 'bg-blue-400',   border: 'border-blue-500/20',   text: 'text-blue-300',   gradient: 'from-blue-500/10 to-transparent' },
  'Flower — Ready to Pack':  { dot: 'bg-cyan-400',   border: 'border-cyan-500/20',   text: 'text-cyan-300',   gradient: 'from-cyan-500/10 to-transparent' },
  'Smalls — Ready to Pack':  { dot: 'bg-sky-400',    border: 'border-sky-500/20',    text: 'text-sky-300',    gradient: 'from-sky-500/10 to-transparent' },
  'Trim / Shake':            { dot: 'bg-teal-400',   border: 'border-teal-500/20',   text: 'text-teal-300',   gradient: 'from-teal-500/10 to-transparent' },
  'Packaged':                { dot: 'bg-emerald-400', border: 'border-emerald-500/20', text: 'text-emerald-300', gradient: 'from-emerald-500/10 to-transparent' },
};

function getTheme(stage: string) {
  return STAGE_THEME[stage] || { dot: 'bg-gray-400', border: 'border-gray-500/20', text: 'text-gray-300', gradient: 'from-gray-500/10 to-transparent' };
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

// ─── Badge components ───────────────────────────────────────────────────────

function COABadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = COA_STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.color}`}>
      <ShieldCheck className="w-3 h-3" />{config.label}
    </span>
  );
}

function THCBadge({ thc }: { thc: number | null }) {
  if (thc == null) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border text-violet-400 bg-violet-500/15 border-violet-500/30">
      <FlaskConical className="w-3 h-3" />{thc.toFixed(1)}% THC
    </span>
  );
}

function GradeBadge({ code, label }: { code: string | null; label: string | null }) {
  if (!code || code === 'UNDEFINED') return null;
  const color = GRADE_COLOR_MAP[code] || GRADE_COLOR_MAP.UNDEFINED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${color}`}>
      <Award className="w-3 h-3" />{label || code}
    </span>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface StrainOption {
  strain: string;
  batch_count: number;
}

interface BatchOption {
  id: string;
  batch_number: string;
  coa_status: string | null;
  thc_percentage: number | null;
  grade_code: string | null;
  grade_label: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface QuickDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatched: () => void;
}

export function QuickDispatchModal({ isOpen, onClose, onDispatched }: QuickDispatchModalProps) {
  // Step state
  const [strains, setStrains] = useState<StrainOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [packages, setPackages] = useState<InventoryPackage[]>([]);

  const [selectedStrain, setSelectedStrain] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [loadingStrains, setLoadingStrains] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedStrain('');
      setSelectedBatchId('');
      setBatches([]);
      setPackages([]);
      setError(null);
      loadStrains();
    }
  }, [isOpen]);

  // Load strains with active inventory
  async function loadStrains() {
    setLoadingStrains(true);
    try {
      const { data, error: err } = await supabase
        .from('batch_registry')
        .select('strain')
        .eq('status', 'active');

      if (err) throw err;

      // Dedupe and count batches per strain
      const strainMap = new Map<string, number>();
      for (const row of (data || [])) {
        strainMap.set(row.strain, (strainMap.get(row.strain) || 0) + 1);
      }

      const options: StrainOption[] = Array.from(strainMap.entries())
        .map(([strain, batch_count]) => ({ strain, batch_count }))
        .sort((a, b) => a.strain.localeCompare(b.strain));

      setStrains(options);
    } catch (err: any) {
      setError(err.message || 'Failed to load strains');
    } finally {
      setLoadingStrains(false);
    }
  }

  // Load batches when strain selected
  useEffect(() => {
    if (!selectedStrain) { setBatches([]); setSelectedBatchId(''); setPackages([]); return; }

    setLoadingBatches(true);
    setSelectedBatchId('');
    setPackages([]);

    (async () => {
      try {
        const { data: batchData, error: bErr } = await supabase
          .from('batch_registry')
          .select('id, batch_number, coa_status, quality_grade_id')
          .eq('strain', selectedStrain)
          .eq('status', 'active')
          .order('batch_number');

        if (bErr) throw bErr;

        // Get THC data
        const batchIds = (batchData || []).map((b: any) => b.id);
        const { data: coaData } = await supabase
          .from('certificates_of_analysis')
          .select('batch_id, thc_percentage')
          .in('batch_id', batchIds);

        // Get grade labels
        const gradeIds = (batchData || []).map((b: any) => b.quality_grade_id).filter(Boolean);
        const { data: gradeData } = gradeIds.length > 0
          ? await supabase.from('quality_grades').select('id, code, label').in('id', gradeIds)
          : { data: [] };

        const thcMap = new Map((coaData || []).map((c: any) => [c.batch_id, Number(c.thc_percentage)]));
        const gradeMap = new Map((gradeData || []).map((g: any) => [g.id, { code: g.code, label: g.label }]));

        const options: BatchOption[] = (batchData || []).map((b: any) => {
          const grade = b.quality_grade_id ? gradeMap.get(b.quality_grade_id) : null;
          return {
            id: b.id,
            batch_number: b.batch_number,
            coa_status: b.coa_status,
            thc_percentage: thcMap.get(b.id) ?? null,
            grade_code: grade?.code ?? null,
            grade_label: grade?.label ?? null,
          };
        });

        setBatches(options);
      } catch (err: any) {
        setError(err.message || 'Failed to load batches');
      } finally {
        setLoadingBatches(false);
      }
    })();
  }, [selectedStrain]);

  // Load packages when batch selected
  useEffect(() => {
    if (!selectedBatchId || !selectedStrain) { setPackages([]); return; }

    setLoadingPackages(true);
    (async () => {
      try {
        const data = await fetchStrainInventory(selectedStrain, selectedBatchId);
        setPackages(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load packages');
      } finally {
        setLoadingPackages(false);
      }
    })();
  }, [selectedBatchId, selectedStrain]);

  async function handleSend(pkg: InventoryPackage) {
    // Packaged items don't make sense for stock build dispatch
    if (pkg.category.includes('packaged')) return;

    const processingStage = getProcessingStageForCategory(pkg.category);
    if (!processingStage) return;

    const treatments = STAGE_TREATMENTS[processingStage as ProcessingStage];
    if (!treatments || treatments.length === 0) return;

    setSendingId(pkg.id);
    try {
      const { error: insertErr } = await supabase.from('production_dispatch_items').insert({
        batch_registry_id: pkg.batch_id,
        order_item_id: null, // No order — stock build
        processing_stage: processingStage,
        treatment_type: treatments[0],
        quantity_g: pkg.on_hand_qty,
        priority: 50,
        status: 'pending',
      });
      if (insertErr) throw insertErr;

      setSendSuccess(pkg.id);
      setTimeout(() => setSendSuccess(null), 2000);

      // Refresh packages
      const data = await fetchStrainInventory(selectedStrain, selectedBatchId);
      setPackages(data);
      onDispatched();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch');
    } finally {
      setSendingId(null);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  // Group packages by stage
  const grouped = new Map<string, InventoryPackage[]>();
  for (const pkg of packages) {
    if (pkg.category.includes('packaged')) continue; // Skip packaged — not relevant for stock build
    const existing = grouped.get(pkg.stage_label) || [];
    existing.push(pkg);
    grouped.set(pkg.stage_label, existing);
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Dispatch — Stock Build"
      icon={<Zap className="w-5 h-5 text-cult-accent" />}
      maxWidth="3xl"
    >
      {/* Strain + Batch selectors */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-[11px] font-bold text-cult-text-muted uppercase tracking-widest mb-1.5">Strain</label>
          <select
            value={selectedStrain}
            onChange={(e) => setSelectedStrain(e.target.value)}
            disabled={loadingStrains}
            className="w-full px-3 py-2.5 rounded-xl border border-cult-dark-gray/60 bg-cult-mid-gray/10 text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent/50 disabled:opacity-50 transition-colors"
          >
            <option value="">{loadingStrains ? 'Loading...' : 'Select strain'}</option>
            {strains.map(s => (
              <option key={s.strain} value={s.strain}>
                {s.strain} ({s.batch_count} batch{s.batch_count !== 1 ? 'es' : ''})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-cult-text-muted uppercase tracking-widest mb-1.5">Batch</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            disabled={!selectedStrain || loadingBatches}
            className="w-full px-3 py-2.5 rounded-xl border border-cult-dark-gray/60 bg-cult-mid-gray/10 text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent/50 disabled:opacity-50 transition-colors"
          >
            <option value="">{loadingBatches ? 'Loading...' : 'Select batch'}</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_number}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Batch metadata badges */}
      {selectedBatch && (
        <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-cult-dark-gray/25">
          <span className="text-sm font-bold font-mono text-cult-text-primary">{selectedBatch.batch_number}</span>
          <div className="flex items-center gap-1.5 ml-2">
            <COABadge status={selectedBatch.coa_status} />
            <THCBadge thc={selectedBatch.thc_percentage} />
            <GradeBadge code={selectedBatch.grade_code} label={selectedBatch.grade_label} />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl border border-cult-danger/30 bg-cult-danger/[0.06] text-sm text-cult-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Package list */}
      {!selectedBatchId ? (
        <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
          <Boxes className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">Select a strain and batch to see packages</p>
        </div>
      ) : loadingPackages ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cult-accent mb-2" />
          <p className="text-sm text-cult-text-muted">Loading packages...</p>
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
          <Package className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No processable inventory in this batch</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([stageLabel, pkgs]) => {
            const theme = getTheme(stageLabel);
            return (
              <div key={stageLabel}>
                <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2 ${theme.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                  {stageLabel}
                  <span className="text-cult-text-faint font-normal tracking-normal">({pkgs.length})</span>
                </h4>
                <div className="space-y-1">
                  {pkgs.map(pkg => {
                    const action = getNextAction(pkg.category);
                    const isSending = sendingId === pkg.id;
                    const justSent = sendSuccess === pkg.id;

                    return (
                      <div
                        key={pkg.id}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border ${theme.border} bg-gradient-to-r ${theme.gradient} transition-all duration-150 hover:brightness-125`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-3">
                          <span className="text-sm font-semibold text-cult-text-primary font-mono tracking-tight">
                            {pkg.package_id}
                          </span>
                          <span className={`text-sm font-bold tabular-nums ${theme.text}`}>
                            {formatG(pkg.on_hand_qty)}
                          </span>
                          {pkg.reserved_qty > 0 && (
                            <span className="text-[11px] text-cult-warning/70 font-medium">
                              ({formatG(pkg.reserved_qty)} held)
                            </span>
                          )}
                        </div>

                        {action && (
                          <button
                            type="button"
                            onClick={() => handleSend(pkg)}
                            disabled={isSending || pkg.available_qty <= 0}
                            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
                              justSent
                                ? 'bg-cult-success/20 text-cult-success border border-cult-success/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                : isSending
                                ? 'bg-cult-mid-gray/30 text-cult-text-muted cursor-wait'
                                : pkg.available_qty <= 0
                                ? 'bg-cult-mid-gray/10 text-cult-text-muted cursor-not-allowed opacity-30'
                                : 'bg-cult-accent/10 text-cult-accent border border-cult-accent/25 hover:bg-cult-accent/20 hover:border-cult-accent/40'
                            }`}
                          >
                            {justSent ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Sent</>
                            ) : isSending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <><Send className="w-3.5 h-3.5" /> {action}</>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BaseModal>
  );
}
