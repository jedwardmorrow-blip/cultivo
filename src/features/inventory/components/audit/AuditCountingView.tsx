import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, RotateCcw, EyeOff, ChevronRight, Check, AlertCircle, Plus, X, PackagePlus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import type { AuditSessionWithLines, AuditLine, VarianceReason, LineStatus } from '../../services/audit.service';
import { fetchActiveBatches } from '@/features/batches/services/batch.service';
import { productsService } from '@/features/products/services/products.service';
import { supabase } from '@/lib/supabase';
import type { BatchRegistry } from '@/types/batch.types';
import type { Product } from '@/types';

const VARIANCE_REASONS: { value: VarianceReason; label: string }[] = [
  { value: 'moisture_loss', label: 'Moisture loss' },
  { value: 'spillage', label: 'Spillage' },
  { value: 'measurement_error', label: 'Measurement error' },
  { value: 'waste', label: 'Waste' },
  { value: 'qc_sampling', label: 'QC sampling' },
  { value: 'coa_sampling', label: 'COA sampling' },
  { value: 'processing_loss', label: 'Processing loss' },
  { value: 'count_error', label: 'Count error' },
  { value: 'data_entry_error', label: 'Data entry error' },
  { value: 'moved_not_tracked', label: 'Moved (not tracked)' },
  { value: 'damage_disposal', label: 'Damage / disposal' },
  { value: 'theft_loss', label: 'Theft / loss' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-cult-surface-raised text-cult-text-muted' },
  match: { label: 'Match', className: 'bg-cult-success/10 text-cult-success' },
  variance: { label: 'Variance', className: 'bg-cult-warning/10 text-cult-warning' },
  not_found: { label: 'Not Found', className: 'bg-cult-danger/10 text-cult-danger' },
  orphan: { label: 'Orphan', className: 'bg-purple-500/10 text-purple-400' },
};

type FilterKey = 'all' | LineStatus;

interface OrphanInput {
  package_id: string;
  product_name: string;
  strain?: string;
  batch?: string;
  stage: string;
  actual_qty: number;
  unit: string;
  notes?: string;
}

interface AuditCountingViewProps {
  session: AuditSessionWithLines;
  actionLoading: boolean;
  error: string | null;
  onBack: () => void;
  onRecordCount: (lineId: string, actualQty: number, opts?: { variance_reason?: VarianceReason; variance_notes?: string }) => Promise<void>;
  onMarkNotFound: (lineId: string) => Promise<void>;
  onResetLine: (lineId: string) => Promise<void>;
  onCreateOrphan: (item: OrphanInput) => Promise<void>;
  onDeleteOrphan: (lineId: string) => Promise<void>;
  onMoveToReview: () => void;
}

export function AuditCountingView({
  session,
  actionLoading,
  error,
  onBack,
  onRecordCount,
  onMarkNotFound,
  onResetLine,
  onCreateOrphan,
  onDeleteOrphan,
  onMoveToReview,
}: AuditCountingViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [showOrphanForm, setShowOrphanForm] = useState(false);

  const lines = session.lines;

  const filtered = useMemo(() => {
    let result = lines;
    if (filter !== 'all') {
      result = result.filter((l) => l.line_status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.package_id.toLowerCase().includes(q) ||
          l.product_name.toLowerCase().includes(q) ||
          (l.strain?.toLowerCase().includes(q) ?? false) ||
          (l.batch?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [lines, filter, search]);

  const counts = useMemo(() => {
    const c = { pending: 0, match: 0, variance: 0, not_found: 0, orphan: 0, total: lines.length };
    for (const l of lines) {
      if (l.line_status in c) (c as any)[l.line_status]++;
    }
    return c;
  }, [lines]);

  const pendingCount = counts.pending;
  const missingReasonCount = useMemo(
    () => lines.filter((l) => (l.line_status === 'variance' || l.line_status === 'not_found') && !l.variance_reason).length,
    [lines],
  );
  const canReview = pendingCount === 0 && lines.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-cult-surface-raised transition text-cult-text-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-cult-text-primary">
              {session.audit_number}
            </h2>
            <p className="text-xs text-cult-text-secondary">
              {session.selected_stages.join(', ')} · {lines.length} packages
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onMoveToReview}
          disabled={!canReview}
          className="px-5 py-2.5 rounded-xl bg-cult-accent text-cult-opaque-black font-bold text-sm hover:bg-cult-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Move to Review
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-cult-border bg-cult-surface-raised p-3">
        <div className="flex items-center justify-between text-xs text-cult-text-secondary mb-2">
          <span>{counts.total - pendingCount} of {counts.total} counted</span>
          <span>
            {counts.match} match · {counts.variance} variance · {counts.not_found} not found
          </span>
        </div>
        <div className="h-2 rounded-full bg-cult-surface-raised overflow-hidden flex">
          {counts.match > 0 && (
            <div
              className="h-full bg-cult-success"
              style={{ width: `${(counts.match / counts.total) * 100}%` }}
            />
          )}
          {counts.variance > 0 && (
            <div
              className="h-full bg-cult-warning"
              style={{ width: `${(counts.variance / counts.total) * 100}%` }}
            />
          )}
          {counts.not_found > 0 && (
            <div
              className="h-full bg-cult-danger"
              style={{ width: `${(counts.not_found / counts.total) * 100}%` }}
            />
          )}
          {counts.orphan > 0 && (
            <div
              className="h-full bg-purple-500"
              style={{ width: `${(counts.orphan / counts.total) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl p-3 border border-cult-danger/30 bg-cult-danger/10 text-sm text-cult-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Missing reason warning */}
      {missingReasonCount > 0 && pendingCount === 0 && (
        <div className="rounded-xl p-3 border border-cult-warning/30 bg-cult-warning/10 text-sm text-cult-warning flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {missingReasonCount} variance line{missingReasonCount > 1 ? 's' : ''} missing a reason — expand to assign before moving to review.
        </div>
      )}

      {/* Search + filter + add found */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-cult-border bg-cult-surface-subtle text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowOrphanForm(!showOrphanForm)}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
            showOrphanForm
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
              : 'bg-cult-surface-raised text-cult-text-secondary border border-cult-border hover:bg-cult-surface-subtle hover:text-cult-text-primary'
          }`}
        >
          {showOrphanForm ? <X className="w-3.5 h-3.5" /> : <PackagePlus className="w-3.5 h-3.5" />}
          {showOrphanForm ? 'Cancel' : 'Add Found Package'}
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {(['all', 'pending', 'match', 'variance', 'not_found', 'orphan'] as FilterKey[]).map((f) => {
          const count = f === 'all' ? counts.total : (counts as any)[f] ?? 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f
                  ? 'bg-cult-accent/15 text-cult-accent border border-cult-accent/30'
                  : 'bg-cult-surface-subtle text-cult-text-muted border border-transparent hover:bg-cult-surface-raised'
              }`}
            >
              {f === 'all' ? 'All' : f === 'not_found' ? 'Not Found' : f.charAt(0).toUpperCase() + f.slice(1)}{' '}
              <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Orphan form */}
      {showOrphanForm && (
        <OrphanForm
          defaultStage={session.selected_stages[0] ?? 'Packaged'}
          actionLoading={actionLoading}
          onSubmit={async (item) => {
            await onCreateOrphan(item);
            setShowOrphanForm(false);
          }}
          onCancel={() => setShowOrphanForm(false)}
        />
      )}

      {/* Lines */}
      <div className="rounded-2xl border border-cult-border bg-cult-surface-raised overflow-hidden divide-y divide-cult-border-subtle">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-cult-text-muted text-sm">
            {search ? 'No matches for search' : 'No lines in this filter'}
          </div>
        ) : (
          filtered.map((line) => (
            <AuditLineRow
              key={line.id}
              line={line}
              expanded={expandedLine === line.id}
              actionLoading={actionLoading}
              onToggle={() => setExpandedLine(expandedLine === line.id ? null : line.id)}
              onRecordCount={onRecordCount}
              onMarkNotFound={onMarkNotFound}
              onResetLine={onResetLine}
              onDeleteOrphan={onDeleteOrphan}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Line Row ────────────────────────────────────────────────────────

interface AuditLineRowProps {
  line: AuditLine;
  expanded: boolean;
  actionLoading: boolean;
  onToggle: () => void;
  onRecordCount: (lineId: string, actualQty: number, opts?: { variance_reason?: VarianceReason; variance_notes?: string }) => Promise<void>;
  onMarkNotFound: (lineId: string) => Promise<void>;
  onResetLine: (lineId: string) => Promise<void>;
  onDeleteOrphan: (lineId: string) => Promise<void>;
}

function AuditLineRow({ line, expanded, actionLoading, onToggle, onRecordCount, onMarkNotFound, onResetLine, onDeleteOrphan }: AuditLineRowProps) {
  const [actualInput, setActualInput] = useState(
    line.actual_qty?.toString() ?? line.expected_qty.toString(),
  );
  const [reason, setReason] = useState<VarianceReason | ''>(line.variance_reason ?? '');
  const [notes, setNotes] = useState(line.variance_notes ?? '');
  const [justConfirmed, setJustConfirmed] = useState(false);
  const prevStatusRef = useRef(line.line_status);

  // Flash success when line transitions from pending to match/variance
  useEffect(() => {
    if (
      prevStatusRef.current === 'pending' &&
      (line.line_status === 'match' || line.line_status === 'variance' || line.line_status === 'not_found')
    ) {
      setJustConfirmed(true);
      const timer = setTimeout(() => setJustConfirmed(false), 2000);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = line.line_status;
  }, [line.line_status]);

  const badge = STATUS_BADGE[line.line_status] ?? STATUS_BADGE.pending;

  function handleConfirmCount() {
    const qty = parseFloat(actualInput);
    if (isNaN(qty) || qty < 0) return;
    onRecordCount(line.id, qty, {
      variance_reason: reason || undefined,
      variance_notes: notes.trim() || undefined,
    });
  }

  return (
    <div className={justConfirmed ? 'animate-pulse-once' : ''}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full p-3 flex items-center gap-3 hover:bg-cult-surface-subtle transition text-left ${
          justConfirmed ? 'bg-cult-success/5' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cult-text-primary truncate">
              {line.package_id}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${badge.className}`}>
              {justConfirmed && <Check className="w-3 h-3" />}
              {badge.label}
            </span>
          </div>
          <div className="text-xs text-cult-text-secondary mt-0.5 truncate">
            {line.product_name}
            {line.strain && ` · ${line.strain}`}
            {line.batch && (
              <span className="font-mono text-cult-text-muted"> · {line.batch}</span>
            )}
            {line.stage && ` · ${line.stage}`}
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          {/* Missing reason indicator */}
          {(line.line_status === 'variance' || line.line_status === 'not_found') && !line.variance_reason && (
            <AlertTriangle className="w-3.5 h-3.5 text-cult-warning shrink-0" title="Missing variance reason" />
          )}
          <div>
            <div className="text-sm font-mono text-cult-text-primary">
              {line.expected_qty} {line.unit}
            </div>
            {line.actual_qty != null && (
              <div className={`text-xs font-mono ${line.variance_qty === 0 ? 'text-cult-success' : 'text-cult-warning'}`}>
                → {line.actual_qty} {line.unit}
                {line.variance_qty != null && line.variance_qty !== 0 && (
                  <span className="ml-1">
                    ({line.variance_qty > 0 ? '+' : ''}{line.variance_qty})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && line.line_status === 'pending' && (
        <div className="px-3 pb-3 space-y-2 border-t border-cult-border-faint pt-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-cult-text-muted uppercase tracking-wider block mb-1">
                Actual Qty ({line.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-cult-border-active bg-cult-surface-inset text-sm text-cult-text-primary font-mono focus:outline-none focus:border-cult-accent/50"
                placeholder={line.expected_qty.toString()}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-cult-text-muted uppercase tracking-wider block mb-1">
                Reason (if variance)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as VarianceReason | '')}
                className="w-full px-3 py-2 rounded-lg border border-cult-border-active bg-cult-surface-inset text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent/50"
              >
                <option value="">—</option>
                {VARIANCE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2 rounded-lg border border-cult-border-active bg-cult-surface-inset text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmCount}
              disabled={!actualInput || actionLoading}
              className="px-4 py-2 rounded-lg bg-cult-accent text-cult-opaque-black font-bold text-xs hover:bg-cult-accent-hover transition disabled:opacity-40"
            >
              Confirm Count
            </button>
            <button
              type="button"
              onClick={() => onMarkNotFound(line.id)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg border border-cult-danger/30 text-cult-danger text-xs font-bold hover:bg-cult-danger/10 transition disabled:opacity-40"
            >
              <EyeOff className="w-3 h-3 inline mr-1" />
              Not Found
            </button>
          </div>
        </div>
      )}

      {expanded && line.line_status !== 'pending' && (
        <div className="px-3 pb-3 border-t border-cult-border-faint pt-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-cult-text-secondary">
              {line.variance_reason && <span className="capitalize">{line.variance_reason.replace(/_/g, ' ')}</span>}
              {line.variance_notes && <span className="ml-2 text-cult-text-muted">— {line.variance_notes}</span>}
              {line.counted_at && (
                <span className="ml-2 text-cult-text-muted">
                  counted {new Date(line.counted_at).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {line.is_orphan && (
                <button
                  type="button"
                  onClick={() => onDeleteOrphan(line.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-cult-danger hover:bg-cult-danger/10 transition disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
              {(line.line_status === 'match' || line.line_status === 'variance' || line.line_status === 'not_found') && (
                <button
                  type="button"
                  onClick={() => onResetLine(line.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-raised transition disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Orphan Form (Constrained) ──────────────────────────────────────

interface OrphanFormProps {
  defaultStage: string;
  actionLoading: boolean;
  onSubmit: (item: OrphanInput) => Promise<void>;
  onCancel: () => void;
}

function OrphanForm({ defaultStage, actionLoading, onSubmit, onCancel }: OrphanFormProps) {
  // Reference data
  const [batches, setBatches] = useState<BatchRegistry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Constrained mode selections
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [generatedPackageId, setGeneratedPackageId] = useState('');
  const [generatingPkgId, setGeneratingPkgId] = useState(false);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('unit');
  const [notes, setNotes] = useState('');

  // Manual fallback mode
  const [manualMode, setManualMode] = useState(false);
  const [manualPackageId, setManualPackageId] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualStrain, setManualStrain] = useState('');
  const [manualBatch, setManualBatch] = useState('');

  // Batch filter for search
  const [batchSearch, setBatchSearch] = useState('');

  // Load reference data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [batchData, productData] = await Promise.all([
          fetchActiveBatches(),
          productsService.fetchProducts(),
        ]);
        if (!cancelled) {
          setBatches(batchData);
          setProducts(productData);
        }
      } catch {
        // Non-critical — form still usable in manual mode
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derived: selected batch object
  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  // Derived: strain from selected batch
  const strainFromBatch = selectedBatch?.strain ?? '';

  // Derived: products filtered to match the batch's strain + audit stage
  const filteredProducts = useMemo(() => {
    if (!selectedBatch) return [];
    const strainLower = (selectedBatch.strain ?? '').toLowerCase();
    const stageLower = defaultStage.toLowerCase();
    return products.filter((p) => {
      const nameL = p.name.toLowerCase();
      const matchesStrain = strainLower && nameL.includes(strainLower);
      const matchesStage = nameL.includes(stageLower);
      return matchesStrain && matchesStage;
    });
  }, [products, selectedBatch, defaultStage]);

  // Derived: selected product object
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  // Filtered batches for search
  const filteredBatches = useMemo(() => {
    if (!batchSearch.trim()) return batches.slice(0, 30);
    const q = batchSearch.toLowerCase();
    return batches.filter(
      (b) => b.batch_number.toLowerCase().includes(q) || (b.strain ?? '').toLowerCase().includes(q),
    ).slice(0, 30);
  }, [batches, batchSearch]);

  // Generate package ID when batch is selected
  const generatePackageId = useCallback(async (batchId: string) => {
    setGeneratingPkgId(true);
    setGeneratedPackageId('');
    try {
      const { data, error } = await supabase.rpc('generate_next_package_id', { p_batch_id: batchId });
      if (!error && data) setGeneratedPackageId(data as string);
    } catch {
      // Will fall back — user can see the generated ID or use manual
    } finally {
      setGeneratingPkgId(false);
    }
  }, []);

  // When batch changes, reset downstream and generate package ID
  function handleBatchChange(batchId: string) {
    setSelectedBatchId(batchId);
    setSelectedProductId('');
    setGeneratedPackageId('');
    if (batchId) generatePackageId(batchId);
  }

  // When product changes, set unit from product
  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod?.unit) setUnit(prod.unit);
  }

  // Constrained mode validation
  const canSubmitConstrained =
    selectedBatchId && selectedProductId && generatedPackageId && qty && !isNaN(parseFloat(qty)) && parseFloat(qty) > 0;

  // Manual mode validation
  const canSubmitManual =
    manualPackageId.trim() && manualProductName.trim() && qty && !isNaN(parseFloat(qty)) && parseFloat(qty) > 0;

  const canSubmit = manualMode ? canSubmitManual : canSubmitConstrained;

  async function handleSubmit() {
    if (!canSubmit) return;

    if (manualMode) {
      await onSubmit({
        package_id: manualPackageId.trim(),
        product_name: manualProductName.trim(),
        strain: manualStrain.trim() || undefined,
        batch: manualBatch.trim() || undefined,
        stage: defaultStage,
        actual_qty: parseFloat(qty),
        unit,
        notes: notes.trim() ? `[MANUAL ENTRY] ${notes.trim()}` : '[MANUAL ENTRY] Requires reconciliation',
      });
    } else {
      await onSubmit({
        package_id: generatedPackageId,
        product_name: selectedProduct!.name,
        strain: strainFromBatch || undefined,
        batch: selectedBatch!.batch_number,
        stage: defaultStage,
        actual_qty: parseFloat(qty),
        unit,
        notes: notes.trim() || undefined,
      });
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-cult-border-active bg-cult-surface-inset text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent/50';
  const labelClass = 'text-[10px] font-bold text-cult-text-muted uppercase tracking-wider block mb-1';

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackagePlus className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-purple-400">Add Found Package</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-raised transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-cult-text-secondary">
        Select the batch and product to ensure data integrity. Package ID is auto-generated.
      </p>

      {dataLoading ? (
        <div className="flex items-center gap-2 text-sm text-cult-text-muted py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading batches & products…
        </div>
      ) : manualMode ? (
        /* ── Manual Fallback ──────────────────────────────── */
        <>
          <div className="rounded-xl border border-cult-warning/30 bg-cult-warning/5 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-cult-warning shrink-0 mt-0.5" />
            <div className="text-xs text-cult-warning">
              <span className="font-bold">Manual entry mode.</span> This package will be flagged for reconciliation
              before the audit can be applied. Data won't link to existing batches or products.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Package ID *</label>
              <input
                type="text"
                value={manualPackageId}
                onChange={(e) => setManualPackageId(e.target.value)}
                placeholder="e.g. 260410-SWF-004"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Product Name *</label>
              <input
                type="text"
                value={manualProductName}
                onChange={(e) => setManualProductName(e.target.value)}
                placeholder="e.g. Packaged - Swamp Water Fumez - 3.5g"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Strain</label>
              <input
                type="text"
                value={manualStrain}
                onChange={(e) => setManualStrain(e.target.value)}
                placeholder="e.g. Swamp Water Fumez"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Batch</label>
              <input
                type="text"
                value={manualBatch}
                onChange={(e) => setManualBatch(e.target.value)}
                placeholder="e.g. 260218-SWF"
                className={inputClass}
              />
            </div>
          </div>
        </>
      ) : (
        /* ── Constrained Mode ─────────────────────────────── */
        <>
          {/* Step 1: Batch select */}
          <div>
            <label className={labelClass}>1. Batch *</label>
            <input
              type="text"
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              placeholder="Search batches by number or strain…"
              className={`${inputClass} mb-1.5`}
            />
            {!selectedBatchId ? (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-cult-border bg-cult-surface-inset divide-y divide-cult-border-faint">
                {filteredBatches.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-cult-text-muted">No batches found</div>
                ) : (
                  filteredBatches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBatchChange(b.id)}
                      className="w-full px-3 py-2 text-left hover:bg-cult-surface-raised transition"
                    >
                      <span className="text-sm font-mono font-semibold text-cult-text-primary">{b.batch_number}</span>
                      <span className="text-xs text-cult-text-secondary ml-2">{b.strain}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10">
                <span className="text-sm font-mono font-semibold text-cult-text-primary">{selectedBatch?.batch_number}</span>
                <span className="text-xs text-cult-text-secondary">{strainFromBatch}</span>
                <button
                  type="button"
                  onClick={() => { handleBatchChange(''); setBatchSearch(''); }}
                  className="ml-auto p-1 rounded text-cult-text-muted hover:text-cult-text-primary transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Product select (filtered by batch strain + stage) */}
          {selectedBatchId && (
            <div>
              <label className={labelClass}>2. Product *</label>
              {filteredProducts.length === 0 ? (
                <div className="px-3 py-2 rounded-lg border border-cult-border bg-cult-surface-inset text-xs text-cult-text-muted">
                  No {defaultStage.toLowerCase()} products found for {strainFromBatch}.
                </div>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a product…</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Step 3: Auto-generated Package ID (read-only) */}
          {selectedProductId && (
            <div>
              <label className={labelClass}>3. Package ID (auto-generated)</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cult-border bg-cult-surface-inset">
                {generatingPkgId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cult-text-muted" />
                ) : generatedPackageId ? (
                  <span className="text-sm font-mono font-semibold text-cult-accent">{generatedPackageId}</span>
                ) : (
                  <span className="text-xs text-cult-danger">Failed to generate — try manual mode</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Shared fields: qty, unit, notes */}
      {(!dataLoading) && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Qty Found *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
              >
                <option value="unit">unit</option>
                <option value="g">g</option>
              </select>
            </div>
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — where was it found?"
            className={inputClass}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || actionLoading}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 transition disabled:opacity-40"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                Add to Audit
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-cult-border text-cult-text-muted text-xs font-bold hover:bg-cult-surface-raised transition"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={() => setManualMode(!manualMode)}
              className="text-[10px] text-cult-text-muted hover:text-cult-text-secondary transition underline"
            >
              {manualMode ? 'Use catalog lookup' : "Can't find it?"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
