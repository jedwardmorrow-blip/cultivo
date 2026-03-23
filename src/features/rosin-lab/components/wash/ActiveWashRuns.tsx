import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Droplets, Loader2, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import {
  getActiveWashRuns,
  completeWashRun,
  createFreezeDryRun,
} from '../../services/rosinLabService';
import type { WashRun } from '../../types/rosin-lab.types';

interface ActiveWashRunsProps {
  onNewWash: () => void;
  onFreezeDryer: () => void;
}

interface OutputForm {
  outputWeight: string;
  wasteWeight: string;
  micron73: string;
  micron90: string;
  micron120: string;
  micron160: string;
}

const DEFAULT_OUTPUT_FORM: OutputForm = {
  outputWeight: '',
  wasteWeight: '',
  micron73: '',
  micron90: '',
  micron120: '',
  micron160: '',
};

function formatRelative(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function getStrainName(run: WashRun): string {
  return run.strain?.name ?? run.batch?.strain ?? '—';
}

function getBatchNumber(run: WashRun): string {
  return run.batch?.batch_number ?? '—';
}

export function ActiveWashRuns({ onNewWash, onFreezeDryer }: ActiveWashRunsProps) {
  const [runs, setRuns] = useState<WashRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [outputForms, setOutputForms] = useState<Record<string, OutputForm>>({});
  const [completedLocally, setCompletedLocally] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [fdCreating, setFdCreating] = useState<Set<string>>(new Set());

  const fetchRuns = useCallback(async () => {
    const data = await getActiveWashRuns();
    setRuns(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!outputForms[id]) {
          setOutputForms((f) => ({ ...f, [id]: { ...DEFAULT_OUTPUT_FORM } }));
        }
      }
      return next;
    });
  }

  function updateOutputForm(runId: string, field: keyof OutputForm, value: string) {
    setOutputForms((prev) => ({
      ...prev,
      [runId]: { ...(prev[runId] ?? DEFAULT_OUTPUT_FORM), [field]: value },
    }));
  }

  async function handleComplete(run: WashRun) {
    const form = outputForms[run.id];
    if (!form?.outputWeight) return;

    const inputWeight = run.total_input_weight_grams ?? 1;
    const outputWeight = parseFloat(form.outputWeight);
    const wasteWeight = form.wasteWeight ? parseFloat(form.wasteWeight) : 0;
    const yieldPct = (outputWeight / inputWeight) * 100;

    const micronGrades: Record<string, number> = {};
    if (form.micron73) micronGrades['73'] = parseFloat(form.micron73);
    if (form.micron90) micronGrades['90'] = parseFloat(form.micron90);
    if (form.micron120) micronGrades['120'] = parseFloat(form.micron120);
    if (form.micron160) micronGrades['160'] = parseFloat(form.micron160);

    setSubmitting((prev) => new Set(prev).add(run.id));
    const { error } = await completeWashRun(run.id, {
      total_output_weight_grams: outputWeight,
      waste_weight_grams: wasteWeight,
      yield_percentage: parseFloat(yieldPct.toFixed(2)),
      micron_grades: Object.keys(micronGrades).length > 0 ? micronGrades : undefined,
    });
    setSubmitting((prev) => {
      const next = new Set(prev);
      next.delete(run.id);
      return next;
    });

    if (!error) {
      setCompletedLocally((prev) => new Set(prev).add(run.id));
    }
  }

  async function handleSendToFreezeDryer(run: WashRun) {
    const form = outputForms[run.id];
    const outputWeight = form?.outputWeight ? parseFloat(form.outputWeight) : run.total_output_weight_grams ?? 0;

    setFdCreating((prev) => new Set(prev).add(run.id));
    await createFreezeDryRun(run.id, outputWeight);
    setFdCreating((prev) => {
      const next = new Set(prev);
      next.delete(run.id);
      return next;
    });
    onFreezeDryer();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-cult-text-muted animate-spin" />
        <span className="text-sm text-cult-text-muted">Loading active runs…</span>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Droplets className="w-12 h-12 text-cult-text-muted" />
        <p className="text-base text-cult-text-secondary">No active wash runs</p>
        <p className="text-sm text-cult-text-muted">Start a new wash run to see it here</p>
        <button
          onClick={onNewWash}
          className="mt-1 px-4 py-2 rounded-[6px] text-sm font-medium bg-cult-surface-overlay border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-colors"
        >
          New Wash Run →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => {
        const isExpanded = expandedIds.has(run.id);
        const isCompleted = completedLocally.has(run.id);
        const form = outputForms[run.id] ?? DEFAULT_OUTPUT_FORM;
        const inputWeight = run.total_input_weight_grams ?? 0;
        const outputWeight = form.outputWeight ? parseFloat(form.outputWeight) : null;
        const liveYield =
          outputWeight !== null && inputWeight > 0
            ? ((outputWeight / inputWeight) * 100).toFixed(1)
            : null;

        const hasFD = (run.freeze_dry ?? []).length > 0;
        const strainName = getStrainName(run);
        const batchNumber = getBatchNumber(run);

        return (
          <div
            key={run.id}
            className={`bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden transition-all ${
              isExpanded ? 'border-blue-500/30' : ''
            }`}
            style={isExpanded ? { boxShadow: 'inset 3px 0 0 #3B82F6' } : undefined}
          >
            {/* Collapsed row */}
            <button
              onClick={() => toggleExpand(run.id)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-cult-surface-overlay/50 transition-colors text-left"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-cult-text-primary mr-2">{batchNumber}</span>
                <span className="text-sm text-cult-text-secondary">{strainName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-cult-text-secondary flex-shrink-0">
                <span className="font-medium text-cult-text-primary">
                  {inputWeight > 0 ? `${inputWeight.toLocaleString()}g` : '—'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
                <span className={run.total_output_weight_grams ? 'font-medium text-cult-text-primary' : 'text-cult-text-muted'}>
                  {run.total_output_weight_grams ? `${run.total_output_weight_grams.toLocaleString()}g` : '—'}
                </span>
              </div>
              <span className="text-xs text-cult-text-muted flex-shrink-0">
                {formatRelative(run.created_at)}
              </span>
              <StatusBadge status={isCompleted ? 'completed' : run.status} />
              <div className="ml-1 text-cult-text-muted flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-cult-border px-4 pb-4 pt-4">
                {/* Wash details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <div>
                    <p className="text-xs text-cult-text-muted uppercase tracking-wide mb-1">Water Temp</p>
                    <p className="text-sm text-cult-text-primary">
                      {run.water_temp_f ? `${run.water_temp_f}°F` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cult-text-muted uppercase tracking-wide mb-1"># Washes</p>
                    <p className="text-sm text-cult-text-primary">{run.num_washes ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-cult-text-muted uppercase tracking-wide mb-1">Equipment</p>
                    <p className="text-sm text-cult-text-primary">{run.equipment?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-cult-text-muted uppercase tracking-wide mb-1">Date</p>
                    <p className="text-sm text-cult-text-primary">
                      {new Date(run.wash_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Input packages */}
                {run.inputs && run.inputs.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs text-cult-text-muted uppercase tracking-wide mb-2">Input Packages</p>
                    <div className="flex flex-wrap gap-2">
                      {run.inputs.map((inp) => (
                        <span
                          key={inp.id}
                          className="px-2.5 py-1 rounded bg-cult-surface border border-cult-border text-xs text-cult-text-secondary"
                        >
                          Pkg #{inp.package?.package_number ?? '?'} · {inp.weight_grams.toLocaleString()}g
                          {inp.package?.freezer_location && (
                            <span className="text-cult-text-muted ml-1">({inp.package.freezer_location})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Record output or completed state */}
                {!isCompleted && run.total_output_weight_grams === null && (
                  <div className="bg-cult-surface border border-cult-border rounded-[6px] p-4">
                    <p className="text-xs font-semibold text-cult-text-secondary uppercase tracking-widest mb-3">
                      Record Output
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-cult-text-secondary mb-1">
                          Output Weight (g) <span className="text-cult-accent">*</span>
                        </label>
                        <input
                          type="number"
                          value={form.outputWeight}
                          onChange={(e) => updateOutputForm(run.id, 'outputWeight', e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full bg-cult-surface-overlay border border-cult-border rounded-[6px] px-3 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-cult-text-secondary mb-1">Waste Weight (g)</label>
                        <input
                          type="number"
                          value={form.wasteWeight}
                          onChange={(e) => updateOutputForm(run.id, 'wasteWeight', e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full bg-cult-surface-overlay border border-cult-border rounded-[6px] px-3 py-2 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                        />
                      </div>
                    </div>

                    {liveYield !== null && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[6px] bg-blue-500/10 border border-blue-500/20">
                        <span className="text-xs text-cult-text-secondary">Yield:</span>
                        <span className="text-sm font-semibold text-blue-400">{liveYield}%</span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-cult-text-muted uppercase tracking-wide mb-2">
                        Micron Grades (optional)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['73', '90', '120', '160'] as const).map((micron) => {
                          const fieldKey = `micron${micron}` as keyof OutputForm;
                          return (
                            <div key={micron}>
                              <label className="block text-xs text-cult-text-muted mb-1">{micron}μ (g)</label>
                              <input
                                type="number"
                                value={form[fieldKey]}
                                onChange={(e) => updateOutputForm(run.id, fieldKey, e.target.value)}
                                placeholder="0"
                                min="0"
                                className="w-full bg-cult-surface-overlay border border-cult-border rounded-[6px] px-2 py-1.5 text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleComplete(run)}
                      disabled={!form.outputWeight || submitting.has(run.id)}
                      className="mt-4 w-full py-2.5 rounded-[6px] text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting.has(run.id) && <Loader2 className="w-4 h-4 animate-spin" />}
                      Complete Wash Run
                    </button>
                  </div>
                )}

                {/* Send to Freeze Dryer */}
                {(isCompleted || run.total_output_weight_grams !== null) && !hasFD && (
                  <div className="bg-cult-surface border border-cult-border/50 rounded-[6px] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-cult-text-primary">Ready for freeze drying</p>
                      <p className="text-xs text-cult-text-muted mt-0.5">
                        {run.total_output_weight_grams ?? (form.outputWeight ? parseFloat(form.outputWeight) : 0)}g of wet hash
                      </p>
                    </div>
                    <button
                      onClick={() => handleSendToFreezeDryer(run)}
                      disabled={fdCreating.has(run.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-semibold text-white bg-slate-600 hover:bg-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {fdCreating.has(run.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      Send to Freeze Dryer
                    </button>
                  </div>
                )}

                {hasFD && (
                  <div className="flex items-center gap-2 text-sm text-cult-text-muted">
                    <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                    Freeze dry run in progress
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
