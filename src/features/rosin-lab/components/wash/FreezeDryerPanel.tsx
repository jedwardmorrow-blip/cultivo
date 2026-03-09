import { useState, useEffect, useCallback } from 'react';
import { Wind, Loader2 } from 'lucide-react';
import {
  getActiveFreezeDryRuns,
  getRecentCompletedFreezeDryRuns,
  completeFreezeDryRun,
} from '../../services/rosinLabService';
import type { FreezeDryRun } from '../../types/rosin-lab.types';

interface CompletionForm {
  outputWeight: string;
  wasteWeight: string;
}

const DEFAULT_FORM: CompletionForm = { outputWeight: '', wasteWeight: '' };

function formatElapsed(startTime: string | null): string {
  if (!startTime) return '—';
  const elapsed = Date.now() - new Date(startTime).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStrainName(run: FreezeDryRun): string {
  return run.wash_run?.strain?.name ?? run.wash_run?.batch?.strain ?? '—';
}

function getBatchNumber(run: FreezeDryRun): string {
  return run.wash_run?.batch?.batch_number ?? '—';
}

export function FreezeDryerPanel() {
  const [activeRuns, setActiveRuns] = useState<FreezeDryRun[]>([]);
  const [recentRuns, setRecentRuns] = useState<FreezeDryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, CompletionForm>>({});
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    const [active, recent] = await Promise.all([
      getActiveFreezeDryRuns(),
      getRecentCompletedFreezeDryRuns(),
    ]);
    setActiveRuns(active);
    setRecentRuns(recent);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  void tick;

  function updateForm(runId: string, field: keyof CompletionForm, value: string) {
    setForms((prev) => ({
      ...prev,
      [runId]: { ...(prev[runId] ?? DEFAULT_FORM), [field]: value },
    }));
  }

  async function handleComplete(run: FreezeDryRun) {
    const form = forms[run.id] ?? DEFAULT_FORM;
    if (!form.outputWeight) return;

    const outputWeight = parseFloat(form.outputWeight);
    const wasteWeight = form.wasteWeight ? parseFloat(form.wasteWeight) : 0;
    const moistureLoss =
      run.input_weight_grams > 0
        ? ((run.input_weight_grams - outputWeight) / run.input_weight_grams) * 100
        : 0;

    setSubmitting((prev) => new Set(prev).add(run.id));
    const { error } = await completeFreezeDryRun(run.id, {
      output_weight_grams: outputWeight,
      waste_weight_grams: wasteWeight,
      moisture_loss_percentage: parseFloat(moistureLoss.toFixed(2)),
    });
    setSubmitting((prev) => {
      const next = new Set(prev);
      next.delete(run.id);
      return next;
    });

    if (!error) {
      await fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-cult-text-muted animate-spin" />
        <span className="text-sm text-cult-text-muted">Loading freeze dry runs…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Active runs */}
      {activeRuns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <Wind className="w-12 h-12 text-cult-text-muted" />
          <p className="text-base text-cult-text-secondary">No active freeze dry runs</p>
          <p className="text-sm text-cult-text-muted">
            Complete a wash run and send it to the freeze dryer
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeRuns.map((run) => {
            const form = forms[run.id] ?? DEFAULT_FORM;
            const outputWeight = form.outputWeight ? parseFloat(form.outputWeight) : null;
            const moistureLoss =
              outputWeight !== null && run.input_weight_grams > 0
                ? ((run.input_weight_grams - outputWeight) / run.input_weight_grams) * 100
                : null;

            return (
              <div
                key={run.id}
                className="bg-cult-surface-raised border border-cult-border rounded-[6px] p-5"
                style={{ boxShadow: 'inset 3px 0 0 #94A3B8' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-cult-text-primary">
                      {getStrainName(run)}
                    </h3>
                    <p className="text-sm text-cult-text-muted mt-0.5">Batch {getBatchNumber(run)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: '#94A3B8' }}
                    >
                      {formatElapsed(run.start_time)}
                    </p>
                    <p className="text-xs text-cult-text-muted mt-0.5">elapsed</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <p className="text-[11px] text-cult-text-muted uppercase tracking-wide mb-1">Input</p>
                    <p className="text-sm font-medium text-cult-text-primary">
                      {run.input_weight_grams.toLocaleString()}g
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-cult-text-muted uppercase tracking-wide mb-1">Equipment</p>
                    <p className="text-sm font-medium text-cult-text-primary">
                      {run.equipment?.name ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-cult-text-muted uppercase tracking-wide mb-1">Started</p>
                    <p className="text-sm font-medium text-cult-text-primary">
                      {run.start_time
                        ? new Date(run.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Complete form */}
                <div className="border-t border-cult-border pt-4">
                  <p className="text-[11px] font-semibold text-cult-text-secondary uppercase tracking-widest mb-3">
                    Complete Freeze Dry
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm text-cult-text-secondary mb-1">
                        Output Weight (g) <span className="text-cult-accent">*</span>
                      </label>
                      <input
                        type="number"
                        value={form.outputWeight}
                        onChange={(e) => updateForm(run.id, 'outputWeight', e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full bg-cult-surface border border-cult-border rounded-[6px] px-3 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-cult-text-secondary mb-1">Waste Weight (g)</label>
                      <input
                        type="number"
                        value={form.wasteWeight}
                        onChange={(e) => updateForm(run.id, 'wasteWeight', e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full bg-cult-surface border border-cult-border rounded-[6px] px-3 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors"
                      />
                    </div>
                  </div>

                  {moistureLoss !== null && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[6px] bg-slate-500/10 border border-slate-500/20">
                      <span className="text-xs text-cult-text-secondary">Moisture Loss:</span>
                      <span className="text-sm font-semibold text-slate-300">
                        {moistureLoss.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleComplete(run)}
                    disabled={!form.outputWeight || submitting.has(run.id)}
                    className="w-full py-2.5 rounded-[6px] text-sm font-semibold text-white bg-slate-600 hover:bg-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting.has(run.id) && <Loader2 className="w-4 h-4 animate-spin" />}
                    Complete Freeze Dry
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent completed */}
      {recentRuns.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-cult-text-muted uppercase tracking-widest mb-3">
            Recently Completed
          </p>
          <div className="bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cult-surface-overlay">
                  {['Strain', 'Input → Output', 'Moisture Loss', 'Completed'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold text-cult-text-muted uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-cult-border last:border-b-0 hover:bg-cult-surface-overlay/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-cult-text-primary">{getStrainName(run)}</td>
                    <td className="px-4 py-3 text-sm text-cult-text-secondary">
                      {run.input_weight_grams.toLocaleString()}g{' → '}
                      {run.output_weight_grams != null ? `${run.output_weight_grams.toLocaleString()}g` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {run.moisture_loss_percentage != null ? (
                        <span className="text-slate-300 font-medium">
                          {run.moisture_loss_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-cult-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-secondary">
                      {formatDate(run.end_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
