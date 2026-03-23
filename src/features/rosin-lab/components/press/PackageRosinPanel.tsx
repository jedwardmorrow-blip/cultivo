import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Thermometer } from 'lucide-react';
import {
  getPressRunsForPackaging,
  recordPressOutput,
  createRosinPackages,
  createCureSession,
} from '../../services/rosinLabService';
import type { PressRun, RosinDestination } from '../../types/rosin-lab.types';

const inputClass =
  'w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-md px-3 py-2 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 placeholder-[#666666]';
const labelClass = 'block text-xs text-[#A6A6A6] mb-1';

const DESTINATION_COLORS: Record<RosinDestination, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
  fresh_press: '#6366F1',
};

const DESTINATION_LABELS: Record<RosinDestination, string> = {
  badder: 'Badder',
  jam: 'Jam',
  sauce: 'Sauce',
  fresh_press: 'Fresh Press',
};

const DESTINATIONS: RosinDestination[] = ['badder', 'jam', 'sauce', 'fresh_press'];

interface PackageRow {
  id: string;
  destination: RosinDestination;
  weightGrams: string;
}

function generatePackageId(strainAbbr: string, seq: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `R-${yy}${mm}${dd}-${strainAbbr.toUpperCase()}-${String(seq).padStart(2, '0')}`;
}

interface RunCardProps {
  run: PressRun;
  onPackaged: () => void;
}

function RunCard({ run, onPackaged }: RunCardProps) {
  const [outputGrams, setOutputGrams] = useState('');
  const [wasteGrams, setWasteGrams] = useState('');
  const [recordingOutput, setRecordingOutput] = useState(false);
  const [outputRecorded, setOutputRecorded] = useState(run.output_weight_grams != null);
  const [localOutput, setLocalOutput] = useState(run.output_weight_grams);

  const [pkgRows, setPkgRows] = useState<PackageRow[]>([
    { id: crypto.randomUUID(), destination: 'badder', weightGrams: '' },
  ]);
  const [creating, setCreating] = useState(false);
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [packaged, setPackaged] = useState(false);
  const [curePromptIds, setCurePromptIds] = useState<string[] | null>(null);
  const [cureTempF, setCureTempF] = useState('');
  const [startingCure, setStartingCure] = useState(false);
  const [cureStarted, setCureStarted] = useState(false);

  const strainAbbr = run.wash_run?.strain?.abbreviation ?? 'UNK';
  const strainName = run.wash_run?.strain?.name ?? '—';
  const batchNum = run.wash_run?.batch?.batch_number ?? '—';
  const strainId = (run.wash_run as Record<string, unknown>)?.strain_id as string | undefined;

  const yieldPct =
    outputGrams && run.input_weight_grams
      ? ((parseFloat(outputGrams) / run.input_weight_grams) * 100).toFixed(1)
      : null;

  const yieldDisplay =
    localOutput != null && run.input_weight_grams
      ? ((localOutput / run.input_weight_grams) * 100).toFixed(1)
      : null;

  const totalPackaged = pkgRows.reduce(
    (sum, r) => sum + (parseFloat(r.weightGrams) || 0),
    0
  );
  const outputForComparison = localOutput ?? 0;
  const packageMismatch =
    outputForComparison > 0 && Math.abs(totalPackaged - outputForComparison) > 0.1;

  async function handleRecordOutput() {
    if (!outputGrams) return;
    setRecordingOutput(true);
    const output = parseFloat(outputGrams);
    const waste = parseFloat(wasteGrams) || 0;
    const yld = run.input_weight_grams
      ? parseFloat(((output / run.input_weight_grams) * 100).toFixed(2))
      : 0;

    const { error } = await recordPressOutput(run.id, {
      output_weight_grams: output,
      waste_weight_grams: waste,
      yield_percentage: yld,
    });

    if (!error) {
      setLocalOutput(output);
      setOutputRecorded(true);
    }
    setRecordingOutput(false);
  }

  function addRow() {
    setPkgRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), destination: 'fresh_press', weightGrams: '' },
    ]);
  }

  function removeRow(id: string) {
    setPkgRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, field: keyof PackageRow, value: string) {
    setPkgRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  async function handleCreatePackages() {
    setPkgError(null);
    const rows = pkgRows.filter((r) => parseFloat(r.weightGrams) > 0);
    if (rows.length === 0) {
      setPkgError('Add at least one package with a weight.');
      return;
    }
    if (!strainId) {
      setPkgError('Strain ID not found. Cannot create packages.');
      return;
    }
    setCreating(true);

    const packagesToInsert = rows.map((r, idx) => ({
      press_run_id: run.id,
      strain_id: strainId,
      package_id: generatePackageId(strainAbbr, idx + 1),
      weight_grams: parseFloat(r.weightGrams),
      destination: r.destination,
      status: 'fresh' as const,
    }));

    const { data: created, error } = await createRosinPackages(packagesToInsert);

    if (error || !created) {
      setPkgError('Failed to create packages. Please try again.');
      setCreating(false);
      return;
    }

    const needsCuring = created.filter((p) => p.destination !== 'fresh_press');
    if (needsCuring.length > 0) {
      setCurePromptIds(needsCuring.map((p) => p.id));
    } else {
      setPackaged(true);
      onPackaged();
    }
    setCreating(false);
  }

  async function handleStartCure() {
    if (!curePromptIds || curePromptIds.length === 0) return;
    setStartingCure(true);

    const firstDestination = pkgRows.find(
      (r) => r.destination !== 'fresh_press'
    )?.destination as 'badder' | 'jam' | 'sauce' | undefined;

    const { error } = await createCureSession(
      {
        press_run_id: run.id,
        target_consistency: firstDestination ?? 'badder',
        input_weight_grams: totalPackaged,
        cure_temp_f: cureTempF ? parseFloat(cureTempF) : undefined,
      },
      curePromptIds
    );

    if (!error) {
      setCureStarted(true);
      onPackaged();
    }
    setStartingCure(false);
  }

  if (packaged || cureStarted) {
    return (
      <div className="bg-[#111111] border border-[#2E2E2E] rounded-md p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#FFFFFF]">{strainName} · {batchNum}</p>
          <p className="text-xs text-[#A6A6A6]">
            {cureStarted ? 'Packages created and cure session started.' : 'Packages created.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#2E2E2E] rounded-md overflow-hidden">
      <div className="p-4 border-b border-[#2E2E2E]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#FFFFFF]">
              {strainName}
              <span className="ml-2 text-xs font-normal text-[#A6A6A6]">{batchNum}</span>
            </p>
            <p className="text-xs text-[#666666] mt-0.5">
              Pressed {new Date(run.press_date).toLocaleDateString()}
            </p>
          </div>
          {run.input_weight_grams != null && (
            <span className="text-xs text-[#A6A6A6] tabular-nums">
              {run.input_weight_grams.toFixed(1)}g in
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-2">
          {run.temperature_f != null && (
            <span className="text-xs text-[#666666]">
              <Thermometer className="inline w-3 h-3 mr-0.5" />
              {run.temperature_f}°F
            </span>
          )}
          {run.pressure_psi != null && (
            <span className="text-xs text-[#666666]">{run.pressure_psi} PSI</span>
          )}
          {run.press_time_seconds != null && (
            <span className="text-xs text-[#666666]">{run.press_time_seconds}s</span>
          )}
          {run.bag_micron != null && (
            <span className="text-xs text-[#666666]">{run.bag_micron}µ</span>
          )}
        </div>
      </div>

      <div className="p-4">
        {!outputRecorded ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#A6A6A6] uppercase tracking-wider">
              Record Output
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Output Weight (g)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={outputGrams}
                  onChange={(e) => setOutputGrams(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Waste Weight (g)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={wasteGrams}
                  onChange={(e) => setWasteGrams(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            {outputGrams && yieldPct && (
              <p className="text-xs text-[#A6A6A6]">
                Yield: <span className="text-[#F97316] font-semibold">{yieldPct}%</span>
              </p>
            )}
            <button
              onClick={handleRecordOutput}
              disabled={!outputGrams || recordingOutput}
              className="px-4 py-2 rounded-md text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#F97316' }}
            >
              {recordingOutput ? 'Saving…' : 'Record Output'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-[#A6A6A6]">
              <span>
                Output:{' '}
                <span className="text-[#FFFFFF] font-semibold">
                  {localOutput?.toFixed(1)}g
                </span>
              </span>
              {yieldDisplay && (
                <span>
                  Yield:{' '}
                  <span className="text-[#F97316] font-semibold">{yieldDisplay}%</span>
                </span>
              )}
            </div>

            {curePromptIds ? (
              <div className="bg-[#0A0A0A] border border-[#2E2E2E] rounded-md p-4 space-y-3">
                <p className="text-sm font-semibold text-[#FFFFFF]">
                  Start cure session?
                </p>
                <p className="text-xs text-[#A6A6A6]">
                  {curePromptIds.length} package{curePromptIds.length > 1 ? 's' : ''} need
                  curing. Start a cure session now?
                </p>
                <div>
                  <label className={labelClass}>Cure Temperature (°F) — optional</label>
                  <input
                    type="number"
                    placeholder="60"
                    value={cureTempF}
                    onChange={(e) => setCureTempF(e.target.value)}
                    className={inputClass}
                    style={{ maxWidth: 140 }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartCure}
                    disabled={startingCure}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-white disabled:opacity-40"
                    style={{ backgroundColor: '#8B5CF6' }}
                  >
                    {startingCure ? 'Starting…' : 'Yes, Start Cure'}
                  </button>
                  <button
                    onClick={() => { setCurePromptIds(null); setPackaged(true); onPackaged(); }}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-[#A6A6A6] border border-[#2E2E2E] hover:border-[#404040]"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {pkgRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <div className="relative flex-shrink-0" style={{ width: 140 }}>
                        <select
                          value={row.destination}
                          onChange={(e) =>
                            updateRow(row.id, 'destination', e.target.value)
                          }
                          className={`${inputClass} pl-6`}
                        >
                          {DESTINATIONS.map((d) => (
                            <option key={d} value={d}>
                              {DESTINATION_LABELS[d]}
                            </option>
                          ))}
                        </select>
                        <span
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full flex-shrink-0 pointer-events-none"
                          style={{ backgroundColor: DESTINATION_COLORS[row.destination] }}
                        />
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        placeholder="0g"
                        value={row.weightGrams}
                        onChange={(e) => updateRow(row.id, 'weightGrams', e.target.value)}
                        className={inputClass}
                        style={{ maxWidth: 100 }}
                      />
                      {pkgRows.length > 1 && (
                        <button
                          onClick={() => removeRow(row.id)}
                          className="text-[#666666] hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-[#A6A6A6] hover:text-[#FFFFFF] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Package
                </button>

                <div
                  className={`text-xs ${packageMismatch ? 'text-amber-400' : 'text-[#A6A6A6]'} flex items-center gap-1`}
                >
                  {packageMismatch && <AlertTriangle className="w-3 h-3" />}
                  Packaged: {totalPackaged.toFixed(1)}g of {outputForComparison.toFixed(1)}g output
                </div>

                {pkgError && (
                  <p className="text-xs text-red-400">{pkgError}</p>
                )}

                <button
                  onClick={handleCreatePackages}
                  disabled={creating || pkgRows.length === 0}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: '#B81D24' }}
                >
                  {creating ? 'Creating…' : 'Create Packages'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PackageRosinPanel() {
  const [runs, setRuns] = useState<PressRun[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRuns() {
    setLoading(true);
    const data = await getPressRunsForPackaging();
    setRuns(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1C1C1C] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[#666666]" />
        </div>
        <p className="text-sm font-semibold text-[#A6A6A6]">No press runs ready to package</p>
        <p className="text-xs text-[#666666]">Complete a press run first to package its output.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} onPackaged={loadRuns} />
      ))}
    </div>
  );
}
