import { useState, useEffect } from 'react';
import { CheckSquare, Square, Snowflake, Loader2 } from 'lucide-react';
import {
  getBatchesWithFreshFrozen,
  getFreshFrozenForBatch,
  getWashingMachines,
  createWashRun,
} from '../../services/rosinLabService';
import type { BatchWithFF, FreshFrozenPackage, RosinLabEquipment } from '../../types/rosin-lab.types';

interface NewWashFormProps {
  onSuccess: () => void;
}

const SECTION_CLASS = 'bg-cult-surface-raised border border-cult-border rounded-[6px] p-5 mb-4';
const SECTION_LABEL = 'text-xs font-semibold text-cult-text-secondary uppercase tracking-widest mb-3';
const INPUT_CLASS =
  'w-full bg-cult-surface border border-cult-border rounded-[6px] px-3 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors';
const LABEL_CLASS = 'block text-sm text-cult-text-secondary mb-1';

function getPackageAge(pkg: FreshFrozenPackage): string {
  const dateStr = pkg.frozen_at ?? pkg.vacuum_sealed_at;
  if (!dateStr) return '—';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function getPackageFrozenLabel(pkg: FreshFrozenPackage): string {
  if (pkg.frozen_at) {
    return new Date(pkg.frozen_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (pkg.vacuum_sealed_at) {
    return `Sealed ${new Date(pkg.vacuum_sealed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return '—';
}

export function NewWashForm({ onSuccess }: NewWashFormProps) {
  const [batches, setBatches] = useState<BatchWithFF[]>([]);
  const [equipment, setEquipment] = useState<RosinLabEquipment[]>([]);
  const [packages, setPackages] = useState<FreshFrozenPackage[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set());
  const [waterTemp, setWaterTemp] = useState('');
  const [numWashes, setNumWashes] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingBatches(true);
    Promise.all([getBatchesWithFreshFrozen(), getWashingMachines()]).then(([b, e]) => {
      setBatches(b);
      setEquipment(e);
      setLoadingBatches(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setPackages([]);
      setSelectedPackageIds(new Set());
      return;
    }
    setLoadingPackages(true);
    getFreshFrozenForBatch(selectedBatchId).then((pkgs) => {
      setPackages(pkgs);
      setSelectedPackageIds(new Set());
      setLoadingPackages(false);
    });
  }, [selectedBatchId]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const selectedPackages = packages.filter((p) => selectedPackageIds.has(p.id));
  const totalInputWeight = selectedPackages.reduce((sum, p) => sum + p.weight_grams, 0);

  function togglePackage(id: string) {
    setSelectedPackageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedPackageIds.size === packages.length) {
      setSelectedPackageIds(new Set());
    } else {
      setSelectedPackageIds(new Set(packages.map((p) => p.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatchId || selectedPackages.length === 0) return;
    setSubmitting(true);
    setError(null);

    const washRun = {
      batch_id: selectedBatchId,
      strain_id: selectedBatch?.strain_id ?? null,
      wash_date: new Date().toISOString().split('T')[0],
      total_input_weight_grams: totalInputWeight,
      equipment_id: equipmentId || null,
      water_temp_f: waterTemp ? parseFloat(waterTemp) : null,
      num_washes: numWashes ? parseInt(numWashes, 10) : null,
      notes: notes.trim() || null,
      status: 'in_progress' as const,
    };

    const inputs = selectedPackages.map((p) => ({
      fresh_frozen_package_id: p.id,
      weight_grams: p.weight_grams,
    }));

    const { error: err } = await createWashRun(washRun, inputs);
    setSubmitting(false);

    if (err) {
      setError('Failed to start wash run. Please try again.');
      return;
    }

    onSuccess();
  }

  if (loadingBatches) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-cult-text-muted animate-spin" />
        <span className="text-sm text-cult-text-muted">Loading batches…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {/* Step 1: Batch selection */}
      <div className={SECTION_CLASS}>
        <p className={SECTION_LABEL}>Step 1 — Select Batch</p>
        {batches.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <Snowflake className="w-5 h-5 text-cult-text-muted flex-shrink-0" />
            <p className="text-sm text-cult-text-muted">
              No batches with stored fresh frozen packages available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select a batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} — {b.strain}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Strain</label>
              <input
                type="text"
                value={selectedBatch?.strain ?? ''}
                readOnly
                placeholder="Auto-filled"
                className={`${INPUT_CLASS} opacity-60 cursor-default`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Package selection */}
      {selectedBatchId && (
        <div className={SECTION_CLASS}>
          <div className="flex items-center justify-between mb-3">
            <p className={`${SECTION_LABEL} mb-0`}>Step 2 — Select Packages</p>
            {packages.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {selectedPackageIds.size === packages.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {loadingPackages ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-cult-text-muted" />
              <span className="text-sm text-cult-text-muted">Loading packages…</span>
            </div>
          ) : packages.length === 0 ? (
            <p className="text-sm text-cult-text-muted py-3">
              No stored packages available for this batch.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageIds.has(pkg.id);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => togglePackage(pkg.id)}
                      className={`
                        flex items-start gap-3 p-3 rounded-[6px] border text-left transition-all
                        ${isSelected
                          ? 'border-blue-500/60 bg-blue-500/5'
                          : 'border-cult-border bg-cult-surface hover:border-cult-border-strong'
                        }
                      `}
                    >
                      <div className="mt-0.5 flex-shrink-0 text-blue-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-cult-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cult-text-primary">
                          Pkg #{pkg.package_number} · {pkg.weight_grams.toLocaleString()}g
                        </p>
                        {pkg.freezer_location && (
                          <p className="text-xs text-cult-text-muted mt-0.5">{pkg.freezer_location}</p>
                        )}
                        <p className="text-xs text-cult-text-muted mt-0.5">
                          {getPackageFrozenLabel(pkg)} · {getPackageAge(pkg)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-cult-border">
                <span className="text-sm text-cult-text-secondary">Total selected:</span>
                <span className="text-sm font-semibold text-cult-text-primary">
                  {selectedPackages.length} package{selectedPackages.length !== 1 ? 's' : ''} · {totalInputWeight.toLocaleString()}g
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Parameters */}
      {selectedBatchId && selectedPackages.length > 0 && (
        <div className={SECTION_CLASS}>
          <p className={SECTION_LABEL}>Step 3 — Wash Parameters</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={LABEL_CLASS}>Water Temp (°F)</label>
              <input
                type="number"
                value={waterTemp}
                onChange={(e) => setWaterTemp(e.target.value)}
                placeholder="34"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}># of Washes</label>
              <input
                type="number"
                value={numWashes}
                onChange={(e) => setNumWashes(e.target.value)}
                placeholder="4"
                min="1"
                max="10"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className={LABEL_CLASS}>Equipment</label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">No equipment selected</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      <button
        type="submit"
        disabled={!selectedBatchId || selectedPackages.length === 0 || submitting}
        className="w-full py-3 rounded-[6px] text-sm font-semibold text-white transition-all
          bg-cult-accent hover:bg-cult-accent-hover
          disabled:opacity-40 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Start Wash Run
      </button>
    </form>
  );
}
