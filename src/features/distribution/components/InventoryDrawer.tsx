import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Send, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, FlaskConical, Award } from 'lucide-react';
import { BaseModal } from '@/shared/components/BaseModal';
import { PackageAssignmentModal } from '@/features/orders/components/PackageAssignmentModal';
import { supabase } from '@/lib/supabase';
import {
  fetchStrainInventory,
  getNextAction,
  getProcessingStageForCategory,
  COA_STATUS_CONFIG,
  GRADE_COLOR_MAP,
  type InventoryPackage,
  type OrderLineItem,
} from '@/features/delivery/hooks/useOrderFulfillment';
import { STAGE_TREATMENTS, type ProcessingStage } from '@/features/delivery/hooks/useProductionDispatch';

// ─── Stage colors ──────────────────────────────────────────────────────────

const STAGE_THEME: Record<string, { dot: string; text: string; gradient: string; border: string }> = {
  'Raw (binned)':           { dot: 'bg-indigo-400', text: 'text-indigo-300', gradient: 'from-indigo-500/10 to-transparent', border: 'border-indigo-500/15' },
  'Bucked':                 { dot: 'bg-blue-400',   text: 'text-blue-300',   gradient: 'from-blue-500/10 to-transparent',   border: 'border-blue-500/15' },
  'Flower — Ready to Pack': { dot: 'bg-cyan-400',   text: 'text-cyan-300',   gradient: 'from-cyan-500/10 to-transparent',   border: 'border-cyan-500/15' },
  'Smalls — Ready to Pack': { dot: 'bg-sky-400',    text: 'text-sky-300',    gradient: 'from-sky-500/10 to-transparent',    border: 'border-sky-500/15' },
  'Trim / Shake':           { dot: 'bg-teal-400',   text: 'text-teal-300',   gradient: 'from-teal-500/10 to-transparent',   border: 'border-teal-500/15' },
  'Packaged':               { dot: 'bg-emerald-400', text: 'text-emerald-300', gradient: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/15' },
};

function getTheme(stage: string) {
  return STAGE_THEME[stage] || { dot: 'bg-gray-400', text: 'text-gray-300', gradient: 'from-gray-500/10 to-transparent', border: 'border-gray-500/15' };
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface InventoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lineItem: OrderLineItem | null;
  onReload: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function InventoryDrawer({ isOpen, onClose, lineItem, onReload }: InventoryDrawerProps) {
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    if (!lineItem) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStrainInventory(lineItem.strain_name, lineItem.batch_id);
      setPackages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [lineItem]);

  useEffect(() => {
    if (isOpen && lineItem) loadPackages();
  }, [isOpen, lineItem, loadPackages]);

  async function handleSendToProcessing(pkg: InventoryPackage) {
    if (!lineItem) return;

    // Packaged → assign modal
    if (pkg.category.includes('packaged')) {
      setAssignBatchId(pkg.batch_id);
      setShowAssignModal(true);
      return;
    }

    const processingStage = getProcessingStageForCategory(pkg.category);
    if (!processingStage) return;

    const treatments = STAGE_TREATMENTS[processingStage as ProcessingStage];
    if (!treatments || treatments.length === 0) return;

    setSendingId(pkg.id);
    try {
      const { error: insertErr } = await supabase.from('production_dispatch_items').insert({
        batch_registry_id: pkg.batch_id,
        inventory_item_id: pkg.id,
        order_item_id: processingStage === 'package_to_order' ? lineItem.order_item_id : null,
        processing_stage: processingStage,
        treatment_type: treatments[0],
        quantity_g: pkg.on_hand_qty,
        priority: 50,
        status: 'pending',
      });
      if (insertErr) throw insertErr;

      setSendSuccess(pkg.id);
      setTimeout(() => setSendSuccess(null), 2000);
      await loadPackages();
      onReload();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch');
    } finally {
      setSendingId(null);
    }
  }

  // Group by batch, then by stage
  const batchGroups = useMemo(() => {
    const groups = new Map<string, {
      batch_number: string;
      coa_status: string | null;
      thc: number | null;
      grade_code: string | null;
      grade_label: string | null;
      stages: Map<string, InventoryPackage[]>;
    }>();

    for (const pkg of packages) {
      if (!groups.has(pkg.batch_id)) {
        groups.set(pkg.batch_id, {
          batch_number: pkg.batch_number,
          coa_status: pkg.coa_status,
          thc: pkg.thc_percentage,
          grade_code: pkg.grade_code,
          grade_label: pkg.grade_label,
          stages: new Map(),
        });
      }
      const group = groups.get(pkg.batch_id)!;
      const existing = group.stages.get(pkg.stage_label) || [];
      existing.push(pkg);
      group.stages.set(pkg.stage_label, existing);
    }
    return groups;
  }, [packages]);

  if (!lineItem) return null;

  const weightNeeded =
    lineItem.weight_per_unit_g && lineItem.units_remaining > 0
      ? formatG(lineItem.weight_per_unit_g * lineItem.units_remaining)
      : null;

  return (
    <>
      <BaseModal
        isOpen={isOpen && !showAssignModal}
        onClose={onClose}
        title={`${lineItem.strain_name} — ${lineItem.format_label}`}
        icon={<Package className="w-5 h-5 text-[#E8E0D4]" />}
        maxWidth="3xl"
      >
        {/* Context bar */}
        <div className="mb-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50">
              <span className="font-semibold text-white/70">{lineItem.customer_name}</span>
              <span className="mx-1.5 text-white/20">·</span>
              <span className="font-mono text-white/30">{lineItem.order_number}</span>
            </div>
            <div className="text-xs text-white/50">
              Need <span className="font-bold text-white/80">{lineItem.units_remaining}</span> units
              {weightNeeded && <span className="text-white/30"> · {weightNeeded}</span>}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-white/30 mr-2" />
            <span className="text-xs text-white/30">Loading inventory...</span>
          </div>
        ) : batchGroups.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/25">
            <Package className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No inventory available for {lineItem.strain_name}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(batchGroups.entries()).map(([batchId, batch]) => (
              <div key={batchId}>
                {/* Batch header */}
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/[0.06]">
                  <span className="text-xs font-bold font-mono text-white/70">{batch.batch_number}</span>
                  {batch.coa_status && COA_STATUS_CONFIG[batch.coa_status] && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${COA_STATUS_CONFIG[batch.coa_status].color}`}>
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {COA_STATUS_CONFIG[batch.coa_status].label}
                    </span>
                  )}
                  {batch.thc != null && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border text-violet-400 bg-violet-500/10 border-violet-500/20">
                      <FlaskConical className="w-2.5 h-2.5" />
                      {batch.thc.toFixed(1)}%
                    </span>
                  )}
                  {batch.grade_code && batch.grade_code !== 'UNDEFINED' && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${GRADE_COLOR_MAP[batch.grade_code] || GRADE_COLOR_MAP.UNDEFINED}`}>
                      <Award className="w-2.5 h-2.5" />
                      {batch.grade_label || batch.grade_code}
                    </span>
                  )}
                </div>

                {/* Stages within batch */}
                <div className="space-y-1.5">
                  {Array.from(batch.stages.entries()).map(([stageLabel, pkgs]) => {
                    const theme = getTheme(stageLabel);
                    return pkgs.map((pkg) => {
                      const action = getNextAction(pkg.category);
                      const isSending = sendingId === pkg.id;
                      const justSent = sendSuccess === pkg.id;

                      return (
                        <div
                          key={pkg.id}
                          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${theme.border} bg-gradient-to-r ${theme.gradient}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.dot}`} />
                            <span className={`text-[11px] font-semibold ${theme.text}`}>{stageLabel}</span>
                            <span className="text-xs font-bold text-white/70 tabular-nums">{formatG(pkg.on_hand_qty)}</span>
                            {pkg.reserved_qty > 0 && (
                              <span className="text-[10px] text-amber-400/60">({formatG(pkg.reserved_qty)} held)</span>
                            )}
                            <span className="text-[9px] font-mono text-white/20">{pkg.package_id}</span>
                          </div>

                          {action && (
                            <button
                              type="button"
                              onClick={() => handleSendToProcessing(pkg)}
                              disabled={isSending || pkg.available_qty <= 0}
                              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all
                                ${justSent
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                  : isSending
                                  ? 'bg-white/[0.04] text-white/30 cursor-wait'
                                  : pkg.available_qty <= 0
                                  ? 'bg-white/[0.02] text-white/15 cursor-not-allowed'
                                  : 'bg-[#E8E0D4]/8 text-[#E8E0D4] border border-[#E8E0D4]/20 hover:bg-[#E8E0D4]/15 hover:border-[#E8E0D4]/30'
                                }`}
                            >
                              {justSent ? (
                                <><CheckCircle2 className="w-3 h-3" /> Sent</>
                              ) : isSending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><Send className="w-3 h-3" /> {action}</>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseModal>

      {/* Package Assignment Modal (for packaged inventory) */}
      {showAssignModal && lineItem && assignBatchId && (
        <PackageAssignmentModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setAssignBatchId(null);
            loadPackages();
            onReload();
          }}
          onAssignmentComplete={async () => {
            setShowAssignModal(false);
            setAssignBatchId(null);
            await loadPackages();
            onReload();
          }}
          orderId={lineItem.order_id}
          orderItemId={lineItem.order_item_id}
          productName={`${lineItem.strain_name} ${lineItem.format_label}`}
          orderItemQuantity={lineItem.quantity}
          unit={lineItem.format_label.includes('Bulk') ? 'g' : 'units'}
          batchId={assignBatchId}
          strain={lineItem.strain_name}
        />
      )}
    </>
  );
}
