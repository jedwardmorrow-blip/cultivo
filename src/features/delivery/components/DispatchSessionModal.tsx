/**
 * DispatchSessionModal — Start a production session from a dispatch item.
 *
 * Pre-fills batch, strain, package, and processing context from the dispatch item.
 * Operator only needs to select staff, confirm/adjust pull weight, and add notes.
 * Creates the session with dispatch_item_id linked, and updates dispatch status to in_progress.
 */

import { useState, useEffect } from 'react';
import {
  Play, Loader2, User, Weight, MessageSquare, Package, Scissors,
  Box, AlertTriangle,
} from 'lucide-react';
import { BaseModal } from '@/shared/components/BaseModal';
import { useActiveStaff } from '@/features/sessions/hooks/useActiveStaff';
import { createBuckingSession, createTrimSession, createPackagingSession } from '@/features/sessions/services/sessions.service';
import { notificationService } from '@/services/notification.service';
import { supabase } from '@/lib/supabase';
import type { DispatchItem, ProcessingStage, TreatmentType } from '../hooks/useProductionDispatch';
import { PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS } from '../hooks/useProductionDispatch';

// ─── Stage config ───────────────────────────────────────────────────────────

const STAGE_ICON: Record<string, typeof Scissors> = {
  buck: Scissors,
  trim_to_stock: Box,
  package_to_order: Package,
  pack_to_stock: Package,
};

const STAGE_COLOR: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  buck:             { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', text: 'text-amber-400', accent: 'bg-amber-500' },
  trim_to_stock:    { bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', text: 'text-emerald-400', accent: 'bg-emerald-500' },
  package_to_order: { bg: 'bg-sky-500/[0.06]', border: 'border-sky-500/20', text: 'text-sky-400', accent: 'bg-sky-500' },
  pack_to_stock:    { bg: 'bg-violet-500/[0.06]', border: 'border-violet-500/20', text: 'text-violet-400', accent: 'bg-violet-500' },
};

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface DispatchSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatchItem: DispatchItem | null;
  onSessionCreated: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DispatchSessionModal({
  isOpen,
  onClose,
  dispatchItem,
  onSessionCreated,
}: DispatchSessionModalProps) {
  const { staff, loading: staffLoading, getDisplayName } = useActiveStaff();
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [pullWeight, setPullWeight] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dispatch item changes
  useEffect(() => {
    if (dispatchItem) {
      setPullWeight(dispatchItem.quantity_g ?? 0);
      setStaffId('');
      setStaffName('');
      setNotes('');
      setError(null);
    }
  }, [dispatchItem]);

  if (!dispatchItem) return null;

  const stage = dispatchItem.processing_stage as ProcessingStage;
  const colors = STAGE_COLOR[stage] || STAGE_COLOR.buck;
  const StageIcon = STAGE_ICON[stage] || Package;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dispatchItem || !staffId) return;

    setSubmitting(true);
    setError(null);

    try {
      let sessionError: any = null;

      if (!dispatchItem.package_id) {
        setError('No package linked to this dispatch item. Re-dispatch from Order Fulfillment.');
        return;
      }

      if (stage === 'buck') {
        const { error: err } = await createBuckingSession({
          bucker_name: staffName,
          bucker_staff_id: staffId,
          binned_package_id: dispatchItem.package_id,
          binned_weight_grams: pullWeight,
          strain: dispatchItem.strain,
          batch_id: dispatchItem.batch_number,
          notes: notes || null,
          session_status: 'active',
          dispatch_item_id: dispatchItem.id,
        });
        sessionError = err;
      } else if (stage === 'trim_to_stock') {
        const { error: err } = await createTrimSession({
          trimmer_name: staffName,
          trimmer_staff_id: staffId,
          pulled_weight: pullWeight,
          package_id: dispatchItem.package_id,
          strain: dispatchItem.strain,
          batch_id: dispatchItem.batch_number,
          notes: notes || null,
          session_status: 'active',
          dispatch_item_id: dispatchItem.id,
        });
        sessionError = err;
      } else if (stage === 'package_to_order' || stage === 'pack_to_stock') {
        const { error: err } = await createPackagingSession({
          packager_name: staffName,
          packager_staff_id: staffId,
          pull_weight: pullWeight,
          package_id: dispatchItem.package_id,
          strain: dispatchItem.strain,
          batch_id: dispatchItem.batch_number,
          notes: notes || null,
          session_status: 'active',
          dispatch_item_id: dispatchItem.id,
        });
        sessionError = err;
      }

      if (sessionError) {
        setError(sessionError.message || 'Failed to create session');
        return;
      }

      // Check if the tote still has remaining available qty after this pull
      // If yes, keep dispatch as 'pending' so more sessions can be started
      // If no (tote fully consumed), move to 'in_progress'
      const { data: updatedItem } = await supabase
        .from('inventory_items')
        .select('available_qty')
        .eq('id', dispatchItem.inventory_item_id)
        .single();

      const remainingQty = (updatedItem?.available_qty ?? 0) as number;

      if (remainingQty <= 0) {
        await supabase
          .from('production_dispatch_items')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', dispatchItem.id);
      } else {
        // Update the dispatch item's quantity_g to reflect remaining weight
        await supabase
          .from('production_dispatch_items')
          .update({ quantity_g: remainingQty, updated_at: new Date().toISOString() })
          .eq('id', dispatchItem.id);
      }

      notificationService.success(`${PROCESSING_STAGE_LABELS[stage]} session started for ${dispatchItem.strain}`);
      onSessionCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  const staffLabel = stage === 'buck' ? 'Bucker' : stage === 'trim_to_stock' ? 'Trimmer' : 'Packager';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start ${PROCESSING_STAGE_LABELS[stage]} Session`}
      icon={<StageIcon className={`w-5 h-5 ${colors.text}`} />}
      maxWidth="lg"
    >
      {/* Dispatch context — read-only */}
      <div className={`mb-5 p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors.accent}`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${colors.text}`}>
              {PROCESSING_STAGE_LABELS[stage]}
            </span>
          </div>
          <span className="text-xs text-cult-text-muted">
            {TREATMENT_TYPE_LABELS[dispatchItem.treatment_type as TreatmentType]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] text-cult-text-faint uppercase tracking-wider mb-0.5">Strain</div>
            <div className="text-sm font-bold text-cult-text-primary">{dispatchItem.strain}</div>
          </div>
          <div>
            <div className="text-[11px] text-cult-text-faint uppercase tracking-wider mb-0.5">Batch</div>
            <div className="text-sm font-bold text-cult-text-primary font-mono">{dispatchItem.batch_number}</div>
          </div>
          <div>
            <div className="text-[11px] text-cult-text-faint uppercase tracking-wider mb-0.5">Dispatched</div>
            <div className="text-sm font-bold text-cult-text-primary">
              {dispatchItem.quantity_g != null ? formatG(dispatchItem.quantity_g) : '—'}
            </div>
          </div>
        </div>

        {dispatchItem.customer_name && (
          <div className="mt-3 pt-3 border-t border-cult-border-subtle text-xs text-cult-text-muted">
            For: <span className="text-cult-text-secondary font-medium">{dispatchItem.customer_name}</span>
            {dispatchItem.order_number && <span className="ml-1 font-mono">({dispatchItem.order_number})</span>}
          </div>
        )}
      </div>

      {/* Session form — operator inputs only */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Staff selection */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">
            <User className="w-3.5 h-3.5" />
            {staffLabel}
          </label>
          <select
            value={staffId}
            onChange={(e) => {
              const selected = staff.find(s => s.id === e.target.value);
              setStaffId(e.target.value);
              setStaffName(selected ? selected.first_name : '');
            }}
            required
            disabled={staffLoading}
            className="w-full px-3 py-2.5 rounded-xl border border-cult-border bg-cult-surface-raised text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent/50 disabled:opacity-50 transition-colors"
          >
            <option value="">{staffLoading ? 'Loading staff...' : `Select ${staffLabel.toLowerCase()}`}</option>
            {staff.map(member => (
              <option key={member.id} value={member.id}>{getDisplayName(member)}</option>
            ))}
          </select>
        </div>

        {/* Pull weight */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">
            <Weight className="w-3.5 h-3.5" />
            Pull Weight (g)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={pullWeight || ''}
            onChange={(e) => setPullWeight(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-cult-border bg-cult-surface-raised text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent/50 transition-colors"
          />
          <p className="text-[11px] text-cult-text-faint mt-1 tabular-nums">
            {(pullWeight / 1000).toFixed(2)} kg · {(pullWeight / 453.592).toFixed(2)} lbs
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Notes <span className="text-cult-text-faint font-normal normal-case">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any observations or special instructions..."
            className="w-full px-3 py-2.5 rounded-xl border border-cult-border bg-cult-surface-raised text-sm text-cult-text-primary placeholder-cult-text-faint focus:outline-none focus:border-cult-accent/50 transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-cult-danger/30 bg-cult-danger/[0.06] text-sm text-cult-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-cult-border text-sm font-medium text-cult-text-muted hover:text-cult-text-primary hover:border-cult-border-strong transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !staffId || pullWeight <= 0}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 ${
              submitting
                ? 'bg-cult-surface-overlay text-cult-text-muted'
                : 'bg-cult-accent text-cult-black hover:bg-cult-accent/90'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {submitting ? 'Starting...' : `Start ${PROCESSING_STAGE_LABELS[stage]} Session`}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
