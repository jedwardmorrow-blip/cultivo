import { useState, useMemo } from 'react';
import {
  Truck, AlertTriangle, RefreshCw, CheckCircle2, ChevronRight,
  ClipboardList, Layers, Zap, Package, Search, X, PackageCheck,
} from 'lucide-react';
import { HubShell } from '@/features/hub/components/HubShell';
import { useProductionDispatch } from '../hooks/useProductionDispatch';
import type {
  SupplyTote, DemandLine, ProcessingStage, TreatmentType, CreateDispatchPayload,
} from '../hooks/useProductionDispatch';
import {
  PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS, STAGE_TREATMENTS,
} from '../hooks/useProductionDispatch';
import { PackageAssignmentModal } from '@/features/orders/components/PackageAssignmentModal';

// ─── Urgency badge ───────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<string, string> = {
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
  urgent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  normal: 'bg-green-500/20 text-green-400 border-green-500/30',
  no_date: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};
const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue', urgent: 'Urgent', soon: 'Soon', normal: 'On Track', no_date: 'No Date',
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  const style = URGENCY_STYLES[urgency] || URGENCY_STYLES.no_date;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${style}`}>
      {URGENCY_LABELS[urgency] ?? urgency}
    </span>
  );
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Supply Tote Card ────────────────────────────────────────────────────────

function ToteCard({
  tote,
  selected,
  onSelect,
  strainMatch,
}: {
  tote: SupplyTote;
  selected: boolean;
  onSelect: () => void;
  strainMatch?: boolean;
}) {
  const hasStock = tote.total_available_g > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!hasStock || tote.is_quarantined}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-cult-accent bg-cult-accent/10'
          : strainMatch
          ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10 cursor-pointer'
          : tote.is_quarantined
          ? 'border-red-500/30 bg-red-500/5 opacity-60 cursor-not-allowed'
          : !hasStock
          ? 'border-cult-dark-gray bg-cult-dark-gray/20 opacity-50 cursor-not-allowed'
          : 'border-cult-dark-gray bg-cult-mid-gray/20 hover:border-cult-accent/50 hover:bg-cult-accent/5 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-cult-text-primary truncate">{tote.strain}</span>
            {strainMatch && !selected && (
              <span className="shrink-0 px-1 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                Match
              </span>
            )}
            {tote.is_quarantined && (
              <span className="shrink-0 px-1 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                QTN
              </span>
            )}
          </div>
          <div className="text-xs text-cult-text-muted mt-0.5">{tote.batch_number} {tote.room ? `· ${tote.room}` : ''}</div>
        </div>
        {selected && <CheckCircle2 className="w-4 h-4 text-cult-accent shrink-0 mt-0.5" />}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
        {tote.binned_g > 0 && (
          <div className="text-center py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
            <div className="text-indigo-400 font-medium">{formatG(tote.binned_g)}</div>
            <div className="text-cult-text-muted text-[10px]">Binned</div>
          </div>
        )}
        {tote.bucked_g > 0 && (
          <div className="text-center py-1 rounded bg-blue-500/10 border border-blue-500/20">
            <div className="text-blue-400 font-medium">{formatG(tote.bucked_g)}</div>
            <div className="text-cult-text-muted text-[10px]">Bucked</div>
          </div>
        )}
        {tote.bulk_available_g > 0 && (
          <div className="text-center py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
            <div className="text-cyan-400 font-medium">{formatG(tote.bulk_available_g)}</div>
            <div className="text-cult-text-muted text-[10px]">Bulk</div>
          </div>
        )}
        {tote.total_available_g === 0 && (
          <div className="col-span-3 text-center text-cult-text-muted py-1">No stock available</div>
        )}
      </div>
    </button>
  );
}

// ─── Demand Line Row ─────────────────────────────────────────────────────────

function DemandRow({
  line,
  selected,
  onSelect,
}: {
  line: DemandLine;
  selected: boolean;
  onSelect: () => void;
}) {
  const fillPct = line.quantity > 0 ? Math.round((line.units_assigned / line.quantity) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'border-cult-accent bg-cult-accent/10'
          : 'border-cult-dark-gray bg-cult-mid-gray/10 hover:border-cult-accent/40 hover:bg-cult-accent/5 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cult-text-muted">{line.order_number}</span>
            <UrgencyBadge urgency={line.urgency} />
          </div>
          <div className="text-sm font-medium text-cult-text-primary truncate mt-0.5">
            {line.customer_name}
          </div>
          <div className="text-xs text-cult-text-muted">
            {line.strain_name} · {line.format_label}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-cult-text-primary">
            {line.units_remaining} <span className="text-cult-text-muted text-xs">/ {line.quantity}</span>
          </div>
          <div className="text-xs text-cult-text-muted">need</div>
          {line.scheduled_delivery_date && (
            <div className="text-xs text-cult-text-muted mt-0.5">{formatDate(line.scheduled_delivery_date)}</div>
          )}
        </div>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-cult-dark-gray overflow-hidden">
        <div
          className="h-full rounded-full bg-cult-accent transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </button>
  );
}

// ─── Assign Packages Shortcut ────────────────────────────────────────────────
// Surfaces the PackageAssignmentModal directly in the dispatch view so Laura
// can assign packages to orders without leaving the dispatch context.

function AssignPackagesShortcut({
  demandLine,
  batchId,
  onComplete,
}: {
  demandLine: DemandLine;
  batchId: string;
  onComplete: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-1.5">
          <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-emerald-300">Packages ready?</span>
        </div>
        <p className="text-[11px] text-cult-text-muted mb-2">
          If packaged inventory is available, assign it directly to this order.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
        >
          <Package className="w-3.5 h-3.5" />
          Assign Packages to Order
        </button>
      </div>

      <PackageAssignmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAssignmentComplete={async () => {
          setShowModal(false);
          onComplete();
        }}
        orderId={demandLine.order_id}
        orderItemId={demandLine.order_item_id}
        productName={`${demandLine.strain_name} ${demandLine.format_label}`}
        orderItemQuantity={demandLine.quantity}
        unit="units"
        batchId={batchId}
      />
    </>
  );
}

// ─── Action Panel ────────────────────────────────────────────────────────────

// Priority presets — human-readable, not a raw 0-100 input
const PRIORITY_PRESETS = [
  { label: 'Urgent', value: 10, style: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { label: 'High', value: 30, style: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { label: 'Normal', value: 50, style: 'text-green-400 border-green-500/30 bg-green-500/10' },
  { label: 'Low', value: 70, style: 'text-cult-text-muted border-cult-dark-gray bg-cult-mid-gray/10' },
] as const;

// Determine which processing stages are valid for a tote based on its lifecycle_state
function getValidStages(tote: SupplyTote | null): ProcessingStage[] {
  if (!tote) return ['buck', 'trim_to_stock', 'package_to_order'];
  const stages: ProcessingStage[] = [];
  if (tote.binned_g > 0) stages.push('buck');
  if (tote.bucked_g > 0 || tote.binned_g > 0) stages.push('trim_to_stock');
  if (tote.bulk_available_g > 0) stages.push('package_to_order');
  return stages.length > 0 ? stages : ['buck', 'trim_to_stock', 'package_to_order'];
}

// Smart default quantity based on stage + tote + demand
function getDefaultQuantity(
  stage: ProcessingStage | null,
  tote: SupplyTote | null,
  demand: DemandLine | null,
): { grams: string; units: string } {
  if (!stage || !tote) return { grams: '', units: '' };
  if (stage === 'package_to_order' && demand) {
    return { grams: '', units: String(demand.units_remaining) };
  }
  if (stage === 'buck') return { grams: String(Math.round(tote.binned_g)), units: '' };
  if (stage === 'trim_to_stock') return { grams: String(Math.round(tote.bucked_g || tote.binned_g)), units: '' };
  return { grams: '', units: '' };
}

interface ActionPanelState {
  stage: ProcessingStage | null;
  treatment: TreatmentType | null;
  quantity_g: string;
  quantity_units: string;
  priority: number;
  ready_by: string;
}

function ActionPanel({
  selectedTote,
  selectedDemand,
  onDispatch,
  submitting,
  onClear,
  onReload,
}: {
  selectedTote: SupplyTote | null;
  selectedDemand: DemandLine | null;
  onDispatch: (payload: CreateDispatchPayload) => void;
  submitting: boolean;
  onClear: () => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState<ActionPanelState>({
    stage: null,
    treatment: null,
    quantity_g: '',
    quantity_units: '',
    priority: 50,
    ready_by: '',
  });
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const availableTreatments = form.stage ? STAGE_TREATMENTS[form.stage] : [];
  const validStages = getValidStages(selectedTote);

  function handleStageChange(stage: ProcessingStage) {
    const defaults = getDefaultQuantity(stage, selectedTote, selectedDemand);
    setForm((f) => ({ ...f, stage, treatment: null, quantity_g: defaults.grams, quantity_units: defaults.units }));
  }

  async function handleSubmit() {
    if (!selectedTote || !form.stage || !form.treatment) return;

    const payload: CreateDispatchPayload = {
      batch_registry_id: selectedTote.batch_id,
      order_item_id: selectedDemand?.order_item_id,
      processing_stage: form.stage,
      treatment_type: form.treatment,
      quantity_g: form.quantity_g ? parseFloat(form.quantity_g) : undefined,
      quantity_units_target: form.quantity_units ? parseInt(form.quantity_units, 10) : undefined,
      priority: form.priority,
      ready_by: form.ready_by || undefined,
    };

    onDispatch(payload);
    setConfirmSuccess(true);
    setTimeout(() => {
      setConfirmSuccess(false);
      setForm({ stage: null, treatment: null, quantity_g: '', quantity_units: '', priority: 50, ready_by: '' });
      onClear();
    }, 1500);
  }

  const canSubmit = !submitting && selectedTote !== null && form.stage !== null && form.treatment !== null;
  const isPackageToOrder = form.stage === 'package_to_order';

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Selections summary */}
      <div className="space-y-2">
        <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
          selectedTote ? 'border-cult-accent/40 bg-cult-accent/5' : 'border-cult-dark-gray bg-cult-mid-gray/10'
        }`}>
          <Layers className="w-4 h-4 text-cult-accent shrink-0" />
          <div className="min-w-0">
            {selectedTote ? (
              <>
                <div className="text-sm font-medium text-cult-text-primary truncate">{selectedTote.strain}</div>
                <div className="text-xs text-cult-text-muted">{selectedTote.batch_number} · {formatG(selectedTote.total_available_g)} available</div>
              </>
            ) : (
              <span className="text-sm text-cult-text-muted">Select a batch from Supply</span>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
          selectedDemand ? 'border-cult-accent/40 bg-cult-accent/5' : 'border-cult-dark-gray bg-cult-mid-gray/10'
        }`}>
          <ClipboardList className="w-4 h-4 text-cult-accent shrink-0" />
          <div className="min-w-0">
            {selectedDemand ? (
              <>
                <div className="text-sm font-medium text-cult-text-primary truncate">{selectedDemand.customer_name}</div>
                <div className="text-xs text-cult-text-muted">{selectedDemand.order_number} · {selectedDemand.units_remaining} units needed</div>
              </>
            ) : (
              <span className="text-sm text-cult-text-muted">Select an order (optional)</span>
            )}
          </div>
        </div>
      </div>

      {/* Processing Stage — constrained by tote lifecycle_state */}
      <div>
        <label className="block text-xs font-medium text-cult-text-muted mb-1.5">
          Processing Stage
          {selectedTote && <span className="text-cult-text-faint ml-1">(based on inventory)</span>}
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {(['buck', 'trim_to_stock', 'package_to_order'] as ProcessingStage[]).map((stage) => {
            const requiresOrder = stage === 'package_to_order';
            const notValidForTote = selectedTote && !validStages.includes(stage);
            const disabled = (requiresOrder && !selectedDemand) || !!notValidForTote;
            return (
              <button
                key={stage}
                type="button"
                disabled={disabled}
                onClick={() => handleStageChange(stage)}
                className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  form.stage === stage
                    ? 'border-cult-accent bg-cult-accent/10 text-cult-accent'
                    : disabled
                    ? 'border-cult-dark-gray text-cult-text-muted opacity-40 cursor-not-allowed'
                    : 'border-cult-dark-gray text-cult-text-secondary hover:border-cult-accent/40 hover:text-cult-text-primary cursor-pointer'
                }`}
              >
                {PROCESSING_STAGE_LABELS[stage]}
                {requiresOrder && !selectedDemand && (
                  <span className="ml-1 text-xs text-cult-text-muted">(select order first)</span>
                )}
                {notValidForTote && !requiresOrder && (
                  <span className="ml-1 text-xs text-cult-text-muted">(no inventory at this stage)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Treatment Type */}
      {form.stage && (
        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1.5">Treatment Type</label>
          <div className="space-y-1">
            {availableTreatments.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, treatment: t }))}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  form.treatment === t
                    ? 'border-cult-accent bg-cult-accent/10 text-cult-accent'
                    : 'border-cult-dark-gray text-cult-text-secondary hover:border-cult-accent/40 cursor-pointer'
                }`}
              >
                {TREATMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantities */}
      {form.stage && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-cult-text-muted mb-1">
              {isPackageToOrder ? 'Units Target' : 'Grams'}
            </label>
            {isPackageToOrder ? (
              <input
                type="number"
                min="1"
                value={form.quantity_units}
                onChange={(e) => setForm((f) => ({ ...f, quantity_units: e.target.value }))}
                placeholder="e.g. 50"
                className="w-full px-3 py-1.5 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/30 text-sm text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-accent"
              />
            ) : (
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.quantity_g}
                onChange={(e) => setForm((f) => ({ ...f, quantity_g: e.target.value }))}
                placeholder="e.g. 1200"
                className="w-full px-3 py-1.5 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/30 text-sm text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-accent"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-cult-text-muted mb-1">Priority</label>
            <div className="grid grid-cols-2 gap-1">
              {PRIORITY_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    form.priority === p.value
                      ? `${p.style} ring-1 ring-cult-accent`
                      : 'border-cult-dark-gray text-cult-text-muted hover:border-cult-accent/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ready By */}
      {form.stage && (
        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1">Ready By (optional)</label>
          <input
            type="datetime-local"
            value={form.ready_by}
            onChange={(e) => setForm((f) => ({ ...f, ready_by: e.target.value }))}
            className="w-full px-3 py-1.5 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/30 text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent"
          />
        </div>
      )}

      {/* Assign Packages — shortcut when packages are ready for a specific order */}
      {selectedDemand && selectedTote && selectedTote.bulk_available_g > 0 && (
        <AssignPackagesShortcut
          demandLine={selectedDemand}
          batchId={selectedTote.batch_id}
          onComplete={() => { onClear(); onReload(); }}
        />
      )}

      {/* Submit */}
      <div className="mt-auto space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            confirmSuccess
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : canSubmit
              ? 'bg-cult-accent text-cult-black hover:bg-cult-accent/90'
              : 'bg-cult-mid-gray/30 text-cult-text-muted cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : confirmSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Dispatched
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Dispatch
            </>
          )}
        </button>
        {(selectedTote || selectedDemand) && !confirmSuccess && (
          <button
            type="button"
            onClick={onClear}
            className="w-full py-2 rounded-lg border border-cult-dark-gray text-sm text-cult-text-muted hover:text-cult-text-primary transition-colors flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export function ProductionDispatchView() {
  const { dispatched, supply, demand, loading, error, stats, submitting, reload, createDispatchItem } =
    useProductionDispatch();

  const [selectedToteId, setSelectedToteId] = useState<string | null>(null);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  const [supplySearch, setSupplySearch] = useState('');
  const [demandSearch, setDemandSearch] = useState('');

  const selectedTote = supply.find((t) => t.batch_id === selectedToteId) ?? null;
  const selectedDemand = demand.find((d) => d.order_item_id === selectedDemandId) ?? null;

  // Auto-filter supply: when a demand line is selected, prioritize matching strain at top
  const filteredSupply = useMemo(() => {
    let filtered = supply;
    if (supplySearch) {
      const q = supplySearch.toLowerCase();
      filtered = filtered.filter(
        (t) => t.strain.toLowerCase().includes(q) || t.batch_number.toLowerCase().includes(q)
      );
    }
    // When demand is selected, sort matching strains to top
    if (selectedDemand) {
      const demandStrain = selectedDemand.strain_name.toLowerCase();
      filtered = [...filtered].sort((a, b) => {
        const aMatch = a.strain.toLowerCase() === demandStrain ? 0 : 1;
        const bMatch = b.strain.toLowerCase() === demandStrain ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    return filtered;
  }, [supply, supplySearch, selectedDemand]);

  const filteredDemand = useMemo(() => {
    if (!demandSearch) return demand;
    const q = demandSearch.toLowerCase();
    return demand.filter(
      (d) =>
        d.customer_name.toLowerCase().includes(q) ||
        d.order_number.toLowerCase().includes(q) ||
        d.strain_name.toLowerCase().includes(q)
    );
  }, [demand, demandSearch]);

  function handleClear() {
    setSelectedToteId(null);
    setSelectedDemandId(null);
  }

  async function handleDispatch(payload: CreateDispatchPayload) {
    await createDispatchItem(payload);
  }

  const kpis = [
    { label: 'Queued', value: String(stats.queued), sub: 'dispatch items' },
    { label: 'In Progress', value: String(stats.inProgress), sub: 'being processed' },
    { label: 'Open Demand', value: String(stats.totalDemandLines), sub: 'order lines' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
      </div>
    );
  }

  return (
    <HubShell section="Production Dispatch" icon={Truck} kpis={kpis}>
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={reload} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-[1fr_1fr_320px] gap-4 min-h-[calc(100vh-220px)]">

        {/* ── Panel 1: Demand ───────────────────────────────────────────── */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-cult-text-primary flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-cult-accent" />
              Demand
              <span className="px-1.5 py-0.5 rounded text-xs bg-cult-mid-gray/40 text-cult-text-muted">
                {filteredDemand.length}
              </span>
            </h2>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-text-muted" />
            <input
              value={demandSearch}
              onChange={(e) => setDemandSearch(e.target.value)}
              placeholder="Search orders…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/20 text-sm text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredDemand.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
                <Package className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No open demand</p>
              </div>
            ) : (
              filteredDemand.map((line) => (
                <DemandRow
                  key={line.order_item_id}
                  line={line}
                  selected={selectedDemandId === line.order_item_id}
                  onSelect={() =>
                    setSelectedDemandId((prev) =>
                      prev === line.order_item_id ? null : line.order_item_id
                    )
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* ── Panel 2: Supply ───────────────────────────────────────────── */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-cult-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-cult-accent" />
              Supply
              <span className="px-1.5 py-0.5 rounded text-xs bg-cult-mid-gray/40 text-cult-text-muted">
                {filteredSupply.length}
              </span>
            </h2>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-text-muted" />
            <input
              value={supplySearch}
              onChange={(e) => setSupplySearch(e.target.value)}
              placeholder="Search batches…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-cult-dark-gray bg-cult-mid-gray/20 text-sm text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredSupply.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
                <Layers className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No batches ready for dispatch</p>
              </div>
            ) : (
              filteredSupply.map((tote) => (
                <ToteCard
                  key={tote.batch_id}
                  tote={tote}
                  selected={selectedToteId === tote.batch_id}
                  strainMatch={!!selectedDemand && tote.strain.toLowerCase() === selectedDemand.strain_name.toLowerCase()}
                  onSelect={() =>
                    setSelectedToteId((prev) => (prev === tote.batch_id ? null : tote.batch_id))
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* ── Panel 3: Action ───────────────────────────────────────────── */}
        <div className="border-l border-cult-dark-gray pl-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-cult-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-cult-accent" />
              Dispatch
            </h2>
            <button
              onClick={reload}
              className="p-1 rounded hover:bg-cult-mid-gray/30 text-cult-text-muted hover:text-cult-text-primary transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <ActionPanel
            selectedTote={selectedTote}
            selectedDemand={selectedDemand}
            onDispatch={handleDispatch}
            submitting={submitting}
            onClear={handleClear}
            onReload={reload}
          />
        </div>
      </div>

      {/* Active Dispatch Queue — queued + in_progress */}
      {dispatched.length > 0 && (
        <div className="mt-6 border-t border-cult-dark-gray pt-4">
          <h3 className="text-sm font-semibold text-cult-text-primary mb-3 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-cult-accent" />
            Active Queue ({dispatched.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cult-dark-gray text-left">
                  <th className="pb-2 text-xs font-medium text-cult-text-muted pr-4">Batch</th>
                  <th className="pb-2 text-xs font-medium text-cult-text-muted pr-4">Stage</th>
                  <th className="pb-2 text-xs font-medium text-cult-text-muted pr-4">Treatment</th>
                  <th className="pb-2 text-xs font-medium text-cult-text-muted pr-4">Qty</th>
                  <th className="pb-2 text-xs font-medium text-cult-text-muted pr-4">Priority</th>
                  <th className="pb-2 text-xs font-medium text-cult-text-muted pr-4">Ready By</th>
                  <th className="pb-2 text-xs font-medium text-cult-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cult-dark-gray/50">
                {dispatched.map((item) => (
                  <tr key={item.id} className="hover:bg-cult-mid-gray/10">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-cult-text-primary">{item.strain}</div>
                      <div className="text-xs text-cult-text-muted">{item.batch_number}</div>
                    </td>
                    <td className="py-2 pr-4 text-cult-text-secondary text-xs">
                      {PROCESSING_STAGE_LABELS[item.processing_stage]}
                    </td>
                    <td className="py-2 pr-4 text-cult-text-secondary text-xs">
                      {TREATMENT_TYPE_LABELS[item.treatment_type]}
                    </td>
                    <td className="py-2 pr-4 text-cult-text-secondary text-xs">
                      {item.quantity_g != null
                        ? formatG(item.quantity_g)
                        : item.quantity_units_target != null
                        ? `${item.quantity_units_target} units`
                        : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-cult-mid-gray/40 text-cult-text-secondary border border-cult-dark-gray">
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-cult-text-secondary text-xs">
                      {formatDate(item.ready_by)}
                    </td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                        item.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {item.status === 'in_progress' ? 'In Progress' : 'Queued'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </HubShell>
  );
}
