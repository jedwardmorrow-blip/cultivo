/**
 * InventoryDrawer — C Hybrid (gapped modal outer; hairline interior rows).
 * No gradient fills. No stage colors as backgrounds. No raised stage chips.
 *
 * Functional behavior preserved: load packages for the line item's strain,
 * group by batch + stage, click "Send" to create a production_dispatch_items
 * row, refresh on success.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BaseModal } from '@/shared/components/BaseModal';
import { PackageAssignmentModal } from '@/features/orders/components/PackageAssignmentModal';
import { supabase } from '@/lib/supabase';
import { useDispatchStatus } from '@/shared/hooks';
import {
  fetchStrainInventory,
  getNextAction,
  getProcessingStageForCategory,
  type InventoryPackage,
  type OrderLineItem,
} from '@/features/delivery/hooks/useOrderFulfillment';
import { STAGE_TREATMENTS, type ProcessingStage } from '@/features/delivery/hooks/useProductionDispatch';

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

interface InventoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lineItem: OrderLineItem | null;
  onReload: () => void;
}

export function InventoryDrawer({ isOpen, onClose, lineItem, onReload }: InventoryDrawerProps) {
  const [packages, setPackages] = useState<InventoryPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState<string | null>(null);

  const packageIds = useMemo(() => packages.map((p) => p.id), [packages]);
  const { dispatchedIds: dispatchedItemIds, refetch: refetchDispatchStatus, markDispatched } =
    useDispatchStatus(packageIds);

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
      if (insertErr) {
        if (insertErr.code === '23505') throw new Error('This package is already in the production queue');
        throw insertErr;
      }
      markDispatched(pkg.id);
      setSendSuccess(pkg.id);
      setTimeout(() => setSendSuccess(null), 2000);
      await loadPackages();
      await refetchDispatchStatus();
      onReload();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch');
    } finally {
      setSendingId(null);
    }
  }

  // Group by batch
  const batchGroups = useMemo(() => {
    const groups = new Map<string, {
      batch_number: string;
      coa_status: string | null;
      thc: number | null;
      grade_label: string | null;
      stages: Map<string, InventoryPackage[]>;
    }>();
    for (const pkg of packages) {
      if (!groups.has(pkg.batch_id)) {
        groups.set(pkg.batch_id, {
          batch_number: pkg.batch_number,
          coa_status: pkg.coa_status,
          thc: pkg.thc_percentage,
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
        icon={<Package className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
        maxWidth="3xl"
      >
        {/* Context bar (C Hybrid head) */}
        <div
          style={{
            background: 'var(--op-surface)',
            border: '1px solid var(--op-line)',
            borderRadius: 'var(--r-md)',
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div className="font-sans" style={{ fontSize: 12, color: 'var(--op-ink-2)' }}>
            <span style={{ color: 'var(--op-ink)', fontWeight: 500 }}>{lineItem.customer_name}</span>
            <span style={{ margin: '0 6px', color: 'var(--op-ink-4)' }}>·</span>
            <span className="font-mono tabular-nums" style={{ color: 'var(--op-ink-3)' }}>
              {lineItem.order_number}
            </span>
          </div>
          <div className="font-mono tabular-nums" style={{ fontSize: 12, color: 'var(--op-ink-2)' }}>
            Need <span style={{ color: 'var(--op-ink)', fontWeight: 500 }}>{lineItem.units_remaining}</span> units
            {weightNeeded ? <span style={{ color: 'var(--op-ink-3)' }}> · {weightNeeded}</span> : null}
          </div>
        </div>

        {error && (
          <div
            style={{
              border: '1px solid var(--status-bad)',
              background: 'var(--op-surface)',
              borderRadius: 'var(--r-md)',
              padding: 10,
              marginBottom: 16,
              fontSize: 11,
              color: 'var(--status-bad)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 32, color: 'var(--op-ink-3)' }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: 6 }} />
            <span style={{ fontSize: 11 }}>Loading inventory…</span>
          </div>
        ) : batchGroups.size === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: 40, color: 'var(--op-ink-3)' }}
          >
            <Package className="w-8 h-8 mb-3" style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 12 }}>No inventory available for {lineItem.strain_name}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from(batchGroups.entries()).map(([batchId, batch]) => (
              <div
                key={batchId}
                style={{
                  background: 'var(--op-surface)',
                  border: '1px solid var(--op-line)',
                  borderRadius: 'var(--r-md)',
                }}
              >
                {/* Batch head */}
                <div
                  className="flex items-center"
                  style={{
                    padding: '10px 14px',
                    gap: 10,
                  }}
                >
                  <span
                    className="font-mono tabular-nums"
                    style={{ fontSize: 12, color: 'var(--op-ink)', fontWeight: 500 }}
                  >
                    {batch.batch_number}
                  </span>
                  {batch.coa_status && (
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        padding: '2px 6px',
                        border: '1px solid var(--op-line)',
                        borderRadius: 'var(--r-xs)',
                        color: 'var(--op-ink-2)',
                        background: 'var(--op-canvas)',
                      }}
                    >
                      {batch.coa_status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {batch.thc != null && (
                    <span
                      className="font-mono tabular-nums"
                      style={{ fontSize: 11, color: 'var(--op-ink-2)' }}
                    >
                      {batch.thc.toFixed(1)}% THC
                    </span>
                  )}
                  {batch.grade_label && batch.grade_label !== 'UNDEFINED' && (
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        color: 'var(--op-ink-2)',
                      }}
                    >
                      {batch.grade_label}
                    </span>
                  )}
                </div>

                {/* Stage rows (hairline interior) */}
                {Array.from(batch.stages.entries()).map(([stageLabel, pkgs]) =>
                  pkgs.map((pkg, i, arr) => {
                    const action = getNextAction(pkg.category);
                    const isSending = sendingId === pkg.id;
                    const justSent = sendSuccess === pkg.id;
                    const alreadyDispatched = dispatchedItemIds.has(pkg.id);
                    const isLast = i === arr.length - 1;
                    return (
                      <div
                        key={pkg.id}
                        style={{
                          padding: '10px 14px',
                          borderTop: '1px solid var(--op-line)',
                          borderBottom: isLast ? 'none' : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div className="flex items-center min-w-0" style={{ gap: 10 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: 'var(--op-ink-3)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            className="font-sans"
                            style={{ fontSize: 11, color: 'var(--op-ink-2)' }}
                          >
                            {stageLabel}
                          </span>
                          <span
                            className="font-mono tabular-nums"
                            style={{ fontSize: 12, color: 'var(--op-ink)', fontWeight: 500 }}
                          >
                            {formatG(pkg.on_hand_qty)}
                          </span>
                          {pkg.reserved_qty > 0 && (
                            <span
                              className="font-mono tabular-nums"
                              style={{ fontSize: 10, color: 'var(--status-warn)' }}
                            >
                              ({formatG(pkg.reserved_qty)} held)
                            </span>
                          )}
                          <span
                            className="font-mono tabular-nums truncate"
                            style={{ fontSize: 11, color: 'var(--op-ink-3)' }}
                          >
                            {pkg.package_id}
                          </span>
                        </div>

                        {action && (
                          <button
                            type="button"
                            onClick={() => handleSendToProcessing(pkg)}
                            disabled={isSending || pkg.available_qty <= 0 || alreadyDispatched}
                            className="font-mono uppercase flex items-center"
                            style={{
                              gap: 4,
                              padding: '4px 10px',
                              fontSize: 9,
                              letterSpacing: '0.1em',
                              border: `1px solid ${
                                justSent
                                  ? 'rgba(110,170,141,0.5)'
                                  : alreadyDispatched
                                  ? 'var(--op-line)'
                                  : 'var(--accent)'
                              }`,
                              color: justSent
                                ? 'var(--status-ok)'
                                : alreadyDispatched
                                ? 'var(--op-ink-3)'
                                : pkg.available_qty <= 0
                                ? 'var(--op-ink-4)'
                                : 'var(--accent)',
                              background: 'var(--op-canvas)',
                              borderRadius: 'var(--r-xs)',
                              cursor:
                                isSending || pkg.available_qty <= 0 || alreadyDispatched
                                  ? 'not-allowed'
                                  : 'pointer',
                              opacity: isSending ? 0.5 : 1,
                            }}
                          >
                            {justSent ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5" /> Sent
                              </>
                            ) : alreadyDispatched ? (
                              <>In queue</>
                            ) : isSending ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-2.5 h-2.5" /> {action}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
            ))}
          </div>
        )}
      </BaseModal>

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
