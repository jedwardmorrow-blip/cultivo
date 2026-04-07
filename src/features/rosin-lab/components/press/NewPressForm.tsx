import { useState, useEffect } from 'react';
import { CheckSquare, Square, AlertCircle } from 'lucide-react';
import { WeightBar } from '../WeightBar';
import {
  getHashPackagesForPressing,
  createPressRun,
  getRosinPresses,
} from '../../services/rosinLabService';
import type { HashPackage, RosinLabEquipment } from '../../types/rosin-lab.types';

const inputClass =
  'w-full bg-cult-surface border border-cult-border rounded-md px-3 py-2 text-cult-text-primary text-sm focus:outline-none focus:border-cult-stage-press focus:ring-1 focus:ring-cult-stage-press/20 placeholder-cult-text-muted';
const labelClass = 'block text-sm text-cult-text-secondary mb-1';
const sectionClass = 'bg-cult-surface-raised border border-cult-border rounded-md p-5 mb-4';
const sectionHeaderClass = 'text-xs font-semibold text-cult-text-secondary uppercase tracking-wider mb-3';

const BAG_MICRONS = [25, 37, 73, 90, 120, 160, 190];

interface SelectedPackage {
  pkg: HashPackage;
  weightGrams: number;
}

interface NewPressFormProps {
  onSuccess?: () => void;
}

export function NewPressForm({ onSuccess }: NewPressFormProps) {
  const [packages, setPackages] = useState<HashPackage[]>([]);
  const [equipment, setEquipment] = useState<RosinLabEquipment[]>([]);
  const [selected, setSelected] = useState<Record<string, SelectedPackage>>({});
  const [tempF, setTempF] = useState('');
  const [psi, setPsi] = useState('');
  const [pressSecs, setPressSecs] = useState('');
  const [bagMicron, setBagMicron] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pkgs, equip] = await Promise.all([
        getHashPackagesForPressing(),
        getRosinPresses(),
      ]);
      setPackages(pkgs);
      setEquipment(equip);
      setLoading(false);
    }
    load();
  }, []);

  function togglePackage(pkg: HashPackage) {
    setSelected((prev) => {
      if (prev[pkg.id]) {
        const next = { ...prev };
        delete next[pkg.id];
        return next;
      }
      return {
        ...prev,
        [pkg.id]: { pkg, weightGrams: pkg.remaining_weight_grams },
      };
    });
  }

  function setPartialWeight(pkgId: string, val: string) {
    setSelected((prev) => {
      if (!prev[pkgId]) return prev;
      const num = parseFloat(val);
      return {
        ...prev,
        [pkgId]: {
          ...prev[pkgId],
          weightGrams: isNaN(num) ? 0 : num,
        },
      };
    });
  }

  const selectedList = Object.values(selected);
  const totalGrams = selectedList.reduce((sum, s) => sum + s.weightGrams, 0);

  async function handleSubmit() {
    setError(null);
    if (selectedList.length === 0) {
      setError('Select at least one hash package.');
      return;
    }
    if (totalGrams <= 0) {
      setError('Total input weight must be greater than 0g.');
      return;
    }
    setSubmitting(true);

    const pressRun = {
      equipment_id: equipmentId || null,
      press_date: new Date().toISOString().slice(0, 10),
      temperature_f: tempF ? parseFloat(tempF) : null,
      pressure_psi: psi ? parseFloat(psi) : null,
      press_time_seconds: pressSecs ? parseInt(pressSecs, 10) : null,
      bag_micron: bagMicron ? parseInt(bagMicron, 10) : null,
      input_weight_grams: totalGrams,
      notes: notes || null,
      status: 'in_progress' as const,
    };

    const inputs = selectedList.map((s) => ({
      hash_package_id: s.pkg.id,
      weight_grams: s.weightGrams,
    }));

    const { error: err } = await createPressRun(pressRun, inputs);

    if (err) {
      setError('Failed to start press run. Please try again.');
    } else {
      setSuccessMessage(
        `Press run started with ${selectedList.length} package${selectedList.length > 1 ? 's' : ''} · ${totalGrams.toFixed(1)}g input`
      );
      setSelected({});
      setTempF('');
      setPsi('');
      setPressSecs('');
      setBagMicron('');
      setEquipmentId('');
      setNotes('');
      onSuccess?.();
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-cult-stage-press border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {successMessage && (
        <div className="mb-4 p-3 rounded-md bg-cult-stage-press/10 border border-cult-stage-press/30 text-sm text-cult-stage-press">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className={sectionClass}>
        <p className={sectionHeaderClass}>Select Hash Packages</p>
        {packages.length === 0 ? (
          <p className="text-sm text-cult-text-muted py-4 text-center">No hash packages available for pressing.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.map((pkg) => {
              const isChecked = !!selected[pkg.id];
              const isPartial = pkg.status === 'partial';
              return (
                <div
                  key={pkg.id}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-cult-stage-press/60 bg-cult-stage-press/5'
                      : 'border-cult-border bg-cult-surface hover:border-cult-border-strong'
                  }`}
                  onClick={() => togglePackage(pkg)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 text-cult-stage-press">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-cult-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-cult-text-primary truncate">{pkg.package_id}</p>
                      <p className="text-xs text-cult-text-secondary mt-0.5">
                        {pkg.strain?.name ?? 'Unknown strain'}
                      </p>
                      <p className="text-xs text-cult-text-muted mt-0.5">
                        {pkg.remaining_weight_grams.toFixed(1)}g remaining
                      </p>
                      <div className="mt-2">
                        <WeightBar
                          remaining={pkg.remaining_weight_grams}
                          total={pkg.weight_grams}
                          color="#F97316"
                        />
                      </div>
                    </div>
                  </div>

                  {isChecked && isPartial && (
                    <div
                      className="mt-3 pt-3 border-t border-cult-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className={labelClass}>
                        Use how many grams? (max {pkg.remaining_weight_grams.toFixed(1)}g)
                      </label>
                      <input
                        type="number"
                        min={0.1}
                        max={pkg.remaining_weight_grams}
                        step={0.1}
                        value={selected[pkg.id]?.weightGrams ?? ''}
                        onChange={(e) => setPartialWeight(pkg.id, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-cult-border">
            <span className="text-sm font-semibold text-cult-text-primary">
              {selectedList.length} package{selectedList.length > 1 ? 's' : ''} · {totalGrams.toFixed(1)}g input
            </span>
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <p className={sectionHeaderClass}>Press Parameters</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Temperature (°F)</label>
            <input
              type="number"
              placeholder="190"
              value={tempF}
              onChange={(e) => setTempF(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Pressure (PSI)</label>
            <input
              type="number"
              placeholder="1200"
              value={psi}
              onChange={(e) => setPsi(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Press Time (sec)</label>
            <input
              type="number"
              placeholder="120"
              value={pressSecs}
              onChange={(e) => setPressSecs(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Bag Micron</label>
            <select
              value={bagMicron}
              onChange={(e) => setBagMicron(e.target.value)}
              className={inputClass}
            >
              <option value="">— Select micron —</option>
              {BAG_MICRONS.map((m) => (
                <option key={m} value={m}>
                  {m}µ
                </option>
              ))}
            </select>
          </div>
          {equipment.length > 0 && (
            <div className="col-span-2">
              <label className={labelClass}>Equipment</label>
              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Select press —</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || selectedList.length === 0}
        className="w-full py-3 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ backgroundColor: '#B81D24' }}
      >
        {submitting ? 'Starting Press Run…' : 'Start Press Run'}
      </button>
    </div>
  );
}
