import { useState, useMemo } from 'react';
import { AlertCircle, Beaker, ChevronDown, ChevronUp, Droplets, Info } from 'lucide-react';
import { useFeedProgramRecipe } from '../../hooks/useFeedProgramRecipe';
import type { RecipeEntry } from '../../hooks/useFeedProgramRecipe';
import { useRoomOperationalState } from '../../hooks/useRoomOperationalState';

// ═══════════════════════════════════════════════════════════════
// BatchTankMixFields — Intelligent batch tank mixing form
//
// Shows the auto-resolved feed recipe for the room's current
// stage/week, accepts gallons input, auto-calculates total mL
// per product, and collects EC/PPM + pH readings on completion.
// ═══════════════════════════════════════════════════════════════

export interface RecipeSnapshotEntry {
  product_id: string;
  product_name: string;
  ml_per_gal: number;
  ml_per_gal_max?: number | null;
  mixing_order: number;
}

export interface BatchTankMixFormData {
  gallons: string;
  ppm_scale: '500' | '700';
  ec_value: string;
  ppm_value: string;
  ph_value: string;
  reading_mode: 'ec' | 'ppm';
  recipe_overrides: Record<string, number>; // product_id → adjusted mL/gal
  // Populated automatically from the resolved recipe
  _program_id: string | null;
  _program_week_id: string | null;
  _phase: string | null;
  _week_number: number | null;
  _recipe_snapshot: RecipeSnapshotEntry[];
  _target_ec: number | null;
  _target_ppm_500: number | null;
  _target_ppm_700: number | null;
  _target_ph_min: number | null;
  _target_ph_max: number | null;
}

export const INITIAL_BATCH_TANK_MIX_DATA: BatchTankMixFormData = {
  gallons: '',
  ppm_scale: '500',
  ec_value: '',
  ppm_value: '',
  ph_value: '',
  reading_mode: 'ec',
  recipe_overrides: {},
  _program_id: null,
  _program_week_id: null,
  _phase: null,
  _week_number: null,
  _recipe_snapshot: [],
  _target_ec: null,
  _target_ppm_500: null,
  _target_ppm_700: null,
  _target_ph_min: null,
  _target_ph_max: null,
};

interface Props {
  data: BatchTankMixFormData;
  onChange: (data: BatchTankMixFormData) => void;
  roomId: string;
}

const inputClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent tabular-nums';
const labelClass = 'block text-[10px] text-cult-medium-gray uppercase tracking-wider font-semibold mb-1';

/** Format a large mL number with comma separation */
function fmtMl(ml: number): string {
  return ml.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function PhaseLabel({ phase, week }: { phase: string; week: number }) {
  const colors: Record<string, string> = {
    clone: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    veg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    flower: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  const labels: Record<string, string> = { clone: 'Clone', veg: 'Veg', flower: 'Flower' };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm border ${colors[phase] ?? 'bg-cult-charcoal/40 text-cult-silver border-cult-dark-gray/50'}`}>
      {labels[phase] ?? phase} W{week}
    </span>
  );
}

function ProductRow({ entry, gallons, override, onOverride }: {
  entry: RecipeEntry;
  gallons: number;
  override?: number;
  onOverride: (productId: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const effectiveRate = override ?? entry.ml_per_gal;
  const totalMl = gallons > 0 ? effectiveRate * gallons : 0;
  const isVariable = entry.product.product_type === 'ph_adjuster';
  const hasRange = entry.ml_per_gal_max != null && entry.ml_per_gal_max !== entry.ml_per_gal;
  const isOverridden = override != null && override !== entry.ml_per_gal;

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-sm border transition-colors ${
      isOverridden ? 'bg-cult-warning-muted border-cult-warning/30' : 'bg-cult-charcoal/30 border-cult-dark-gray/40'
    }`}>
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-cult-white">{entry.product.name}</span>
          {isVariable && (
            <span className="text-[9px] uppercase tracking-wider text-cult-warning bg-cult-warning-muted px-1.5 py-0.5 rounded-sm">pH Up</span>
          )}
          {entry.notes && (
            <span className="text-[9px] text-cult-medium-gray italic truncate">{entry.notes}</span>
          )}
        </div>
      </div>

      {/* Rate (editable) */}
      <div className="w-24 text-right">
        {isVariable ? (
          <span className="text-xs text-cult-warning/80 italic">as needed</span>
        ) : editing ? (
          <input
            type="number"
            step="1"
            min="0"
            value={effectiveRate}
            onChange={(e) => onOverride(entry.product.id, Number(e.target.value))}
            onBlur={() => setEditing(false)}
            autoFocus
            className="w-full bg-cult-near-black border border-cult-accent text-cult-white text-xs text-right py-1 px-2 rounded-sm focus:outline-none tabular-nums"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-cult-light-gray hover:text-cult-white transition-colors tabular-nums"
            title="Click to adjust rate"
          >
            {effectiveRate} {hasRange && <span className="text-cult-medium-gray">({entry.ml_per_gal}-{entry.ml_per_gal_max})</span>}
            <span className="text-cult-medium-gray ml-1">mL/gal</span>
          </button>
        )}
      </div>

      {/* Total mL */}
      <div className="w-24 text-right">
        {!isVariable && gallons > 0 ? (
          <span className="text-sm font-mono font-bold text-cult-white">{fmtMl(totalMl)} <span className="text-[10px] text-cult-medium-gray font-normal">mL</span></span>
        ) : (
          <span className="text-xs text-cult-dark-gray">—</span>
        )}
      </div>
    </div>
  );
}

function TargetBadge({ label, value, unit, inRange }: { label: string; value: string; unit?: string; inRange?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-xs ${
      inRange === true ? 'border-cult-success/40 bg-cult-success-muted text-cult-success'
        : inRange === false ? 'border-cult-danger/40 bg-cult-danger-muted text-cult-danger'
          : 'border-cult-dark-gray/50 bg-cult-charcoal/20 text-cult-medium-gray'
    }`}>
      <span className="uppercase tracking-wider text-[10px] font-semibold opacity-70">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
      {unit && <span className="text-[10px] opacity-60">{unit}</span>}
    </div>
  );
}

export function BatchTankMixFields({ data, onChange, roomId }: Props) {
  const { rooms } = useRoomOperationalState();
  const room = rooms.find((r) => r.room_id === roomId);
  const stage = room?.dominant_stage ?? null;
  const daysInStage = room?.days_in_stage ?? null;

  const { recipe, loading, error, resolvedPhase, resolvedWeek } = useFeedProgramRecipe(stage, daysInStage);

  const [showTargets, setShowTargets] = useState(true);

  const gallons = parseFloat(data.gallons) || 0;

  function set<K extends keyof BatchTankMixFormData>(key: K, value: BatchTankMixFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  function handleOverride(productId: string, value: number) {
    onChange({ ...data, recipe_overrides: { ...data.recipe_overrides, [productId]: value } });
  }

  // Sync recipe metadata into form data whenever recipe resolves/changes
  if (recipe && (data._program_id !== recipe.program_id || data._week_number !== recipe.week_number)) {
    const snapshot: RecipeSnapshotEntry[] = recipe.entries
      .filter((e) => e.product.product_type !== 'ph_adjuster')
      .map((e) => ({
        product_id: e.product.id,
        product_name: e.product.name,
        ml_per_gal: data.recipe_overrides[e.product.id] ?? e.ml_per_gal,
        ml_per_gal_max: e.ml_per_gal_max,
        mixing_order: e.mixing_order,
      }));
    onChange({
      ...data,
      _program_id: recipe.program_id,
      _program_week_id: recipe.program_week_id,
      _phase: recipe.phase,
      _week_number: recipe.week_number,
      _recipe_snapshot: snapshot,
      _target_ec: recipe.targets.target_ec,
      _target_ppm_500: recipe.targets.target_ppm_500,
      _target_ppm_700: recipe.targets.target_ppm_700,
      _target_ph_min: recipe.targets.target_ph_min,
      _target_ph_max: recipe.targets.target_ph_max,
    });
  }

  // Determine if readings are in range
  const ecInRange = useMemo(() => {
    if (!recipe?.targets.target_ec || !data.ec_value) return undefined;
    const val = parseFloat(data.ec_value);
    if (isNaN(val)) return undefined;
    const target = recipe.targets.target_ec;
    return val >= target - 0.5 && val <= target + 0.5;
  }, [recipe, data.ec_value]);

  const ppmInRange = useMemo(() => {
    if (!data.ppm_value) return undefined;
    const val = parseFloat(data.ppm_value);
    if (isNaN(val)) return undefined;
    const target = data.ppm_scale === '700' ? recipe?.targets.target_ppm_700 : recipe?.targets.target_ppm_500;
    if (!target) return undefined;
    return val >= target - 200 && val <= target + 200;
  }, [recipe, data.ppm_value, data.ppm_scale]);

  const phInRange = useMemo(() => {
    if (!recipe?.targets.target_ph_min || !recipe?.targets.target_ph_max || !data.ph_value) return undefined;
    const val = parseFloat(data.ph_value);
    if (isNaN(val)) return undefined;
    return val >= recipe.targets.target_ph_min && val <= recipe.targets.target_ph_max;
  }, [recipe, data.ph_value]);

  // ── Loading / Error states ────────────────────────
  if (loading) {
    return (
      <div className="py-6 text-center">
        <div className="animate-pulse text-sm text-cult-medium-gray">Loading feed recipe...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-cult-danger-muted border border-cult-danger/40 rounded-sm">
        <AlertCircle className="w-4 h-4 text-cult-danger flex-shrink-0" />
        <span className="text-xs text-cult-danger">{error}</span>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="space-y-4">
        {/* Warning banner */}
        <div className="flex items-center gap-2 p-3 bg-cult-warning-muted border border-cult-warning/40 rounded-sm">
          <Info className="w-4 h-4 text-cult-warning flex-shrink-0" />
          <div className="text-xs text-cult-warning">
            <p className="font-semibold">No feed recipe found — manual entry</p>
            <p className="text-cult-warning/70 mt-0.5">
              {!stage ? 'This room has no active plant groups with a stage set.'
                : !resolvedPhase ? `Stage "${stage}" does not map to a feed program phase.`
                  : `No feed program week found for ${resolvedPhase} W${resolvedWeek}.`}
            </p>
          </div>
        </div>

        {/* Manual gallons input */}
        <div>
          <label className={labelClass}>
            <Droplets className="w-3 h-3 inline mr-1" />
            Water in Tank (gallons)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={data.gallons}
            onChange={(e) => set('gallons', e.target.value)}
            placeholder="Enter gallons..."
            className={`${inputClass} text-lg font-mono font-bold`}
            inputMode="numeric"
          />
        </div>

        {/* Manual readings */}
        <div className="border-t border-cult-dark-gray/40 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={labelClass}>Post-Mix Readings</span>
            <span className="text-[9px] text-cult-danger uppercase tracking-wider font-semibold">Required</span>
          </div>

          {/* EC or PPM toggle */}
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-2">
              <button
                type="button"
                onClick={() => set('reading_mode', 'ec')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm border transition-colors ${
                  data.reading_mode === 'ec'
                    ? 'bg-cult-info/20 text-cult-info border-cult-info/40'
                    : 'text-cult-medium-gray border-cult-dark-gray/50 hover:text-cult-light-gray'
                }`}
              >
                EC
              </button>
              <button
                type="button"
                onClick={() => set('reading_mode', 'ppm')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm border transition-colors ${
                  data.reading_mode === 'ppm'
                    ? 'bg-cult-info/20 text-cult-info border-cult-info/40'
                    : 'text-cult-medium-gray border-cult-dark-gray/50 hover:text-cult-light-gray'
                }`}
              >
                PPM
              </button>
            </div>

            {data.reading_mode === 'ec' ? (
              <div>
                <label className={labelClass}>EC Reading</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={data.ec_value}
                  onChange={(e) => set('ec_value', e.target.value)}
                  placeholder="e.g. 2.4"
                  className={inputClass}
                  inputMode="decimal"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className={labelClass}>PPM Reading</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => set('ppm_scale', '500')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm border transition-colors ${
                        data.ppm_scale === '500' ? 'bg-cult-accent/20 text-cult-accent border-cult-accent/40' : 'text-cult-dark-gray border-cult-dark-gray/40'
                      }`}
                    >
                      500
                    </button>
                    <button
                      type="button"
                      onClick={() => set('ppm_scale', '700')}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm border transition-colors ${
                        data.ppm_scale === '700' ? 'bg-cult-accent/20 text-cult-accent border-cult-accent/40' : 'text-cult-dark-gray border-cult-dark-gray/40'
                      }`}
                    >
                      700
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={data.ppm_value}
                  onChange={(e) => set('ppm_value', e.target.value)}
                  placeholder="e.g. 1200"
                  className={inputClass}
                  inputMode="numeric"
                />
              </div>
            )}
          </div>

          {/* pH */}
          <div>
            <label className={labelClass}>pH Reading</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="14"
              value={data.ph_value}
              onChange={(e) => set('ph_value', e.target.value)}
              placeholder="e.g. 6.2"
              className={inputClass}
              inputMode="decimal"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header: Phase / Week / Program ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-cult-info" />
          <PhaseLabel phase={recipe.phase} week={recipe.week_number} />
          <span className="text-[10px] text-cult-medium-gray">Day {daysInStage ?? '?'}</span>
        </div>
        <span className="text-[10px] text-cult-dark-gray uppercase tracking-wider">{recipe.program_name}</span>
      </div>

      {/* ── Target ranges (collapsible) ── */}
      <button
        type="button"
        onClick={() => setShowTargets((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] text-cult-medium-gray hover:text-cult-light-gray uppercase tracking-wider font-semibold transition-colors"
      >
        {showTargets ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Target Ranges
      </button>
      {showTargets && (
        <div className="flex flex-wrap gap-2">
          <TargetBadge label="EC" value={recipe.targets.target_ec?.toFixed(1) ?? '—'} inRange={ecInRange} />
          <TargetBadge label="PPM 500" value={recipe.targets.target_ppm_500?.toString() ?? '—'} inRange={data.ppm_scale === '500' ? ppmInRange : undefined} />
          <TargetBadge label="PPM 700" value={recipe.targets.target_ppm_700?.toString() ?? '—'} inRange={data.ppm_scale === '700' ? ppmInRange : undefined} />
          <TargetBadge label="pH" value={`${recipe.targets.target_ph_min?.toFixed(1) ?? '?'} – ${recipe.targets.target_ph_max?.toFixed(1) ?? '?'}`} inRange={phInRange} />
          {recipe.targets.notes && (
            <div className="w-full flex items-center gap-1.5 text-[10px] text-cult-warning/80 italic">
              <Info className="w-3 h-3 flex-shrink-0" />
              {recipe.targets.notes}
            </div>
          )}
        </div>
      )}

      {/* ── Gallons input ── */}
      <div>
        <label className={labelClass}>
          <Droplets className="w-3 h-3 inline mr-1" />
          Water in Tank (gallons)
        </label>
        <input
          type="number"
          step="1"
          min="0"
          value={data.gallons}
          onChange={(e) => set('gallons', e.target.value)}
          placeholder="Enter gallons..."
          className={`${inputClass} text-lg font-mono font-bold`}
          inputMode="numeric"
        />
      </div>

      {/* ── Recipe product list ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={labelClass}>Mixing Order</span>
          {gallons > 0 && (
            <span className="text-[10px] text-cult-medium-gray">
              Total for <span className="font-mono font-bold text-cult-white">{gallons}</span> gal
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {recipe.entries.map((entry) => (
            <ProductRow
              key={entry.product.id}
              entry={entry}
              gallons={gallons}
              override={data.recipe_overrides[entry.product.id]}
              onOverride={handleOverride}
            />
          ))}
        </div>
      </div>

      {/* ── Completion readings ── */}
      <div className="border-t border-cult-dark-gray/40 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={labelClass}>Post-Mix Readings</span>
          <span className="text-[9px] text-cult-danger uppercase tracking-wider font-semibold">Required</span>
        </div>

        {/* EC or PPM toggle */}
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <button
              type="button"
              onClick={() => set('reading_mode', 'ec')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm border transition-colors ${
                data.reading_mode === 'ec'
                  ? 'bg-cult-info/20 text-cult-info border-cult-info/40'
                  : 'text-cult-medium-gray border-cult-dark-gray/50 hover:text-cult-light-gray'
              }`}
            >
              EC
            </button>
            <button
              type="button"
              onClick={() => set('reading_mode', 'ppm')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm border transition-colors ${
                data.reading_mode === 'ppm'
                  ? 'bg-cult-info/20 text-cult-info border-cult-info/40'
                  : 'text-cult-medium-gray border-cult-dark-gray/50 hover:text-cult-light-gray'
              }`}
            >
              PPM
            </button>
          </div>

          {data.reading_mode === 'ec' ? (
            <div>
              <label className={labelClass}>EC Reading</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={data.ec_value}
                onChange={(e) => set('ec_value', e.target.value)}
                placeholder={`Target: ${recipe.targets.target_ec?.toFixed(1) ?? '—'}`}
                className={`${inputClass} ${ecInRange === false ? 'border-cult-danger/60' : ecInRange === true ? 'border-cult-success/60' : ''}`}
                inputMode="decimal"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className={labelClass}>PPM Reading</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => set('ppm_scale', '500')}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm border transition-colors ${
                      data.ppm_scale === '500' ? 'bg-cult-accent/20 text-cult-accent border-cult-accent/40' : 'text-cult-dark-gray border-cult-dark-gray/40'
                    }`}
                  >
                    500
                  </button>
                  <button
                    type="button"
                    onClick={() => set('ppm_scale', '700')}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm border transition-colors ${
                      data.ppm_scale === '700' ? 'bg-cult-accent/20 text-cult-accent border-cult-accent/40' : 'text-cult-dark-gray border-cult-dark-gray/40'
                    }`}
                  >
                    700
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="10"
                min="0"
                value={data.ppm_value}
                onChange={(e) => set('ppm_value', e.target.value)}
                placeholder={`Target: ${data.ppm_scale === '700' ? (recipe.targets.target_ppm_700 ?? '—') : (recipe.targets.target_ppm_500 ?? '—')}`}
                className={`${inputClass} ${ppmInRange === false ? 'border-cult-danger/60' : ppmInRange === true ? 'border-cult-success/60' : ''}`}
                inputMode="numeric"
              />
            </div>
          )}
        </div>

        {/* pH (always required) */}
        <div>
          <label className={labelClass}>pH Reading</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            value={data.ph_value}
            onChange={(e) => set('ph_value', e.target.value)}
            placeholder={`Target: ${recipe.targets.target_ph_min?.toFixed(1) ?? '?'} – ${recipe.targets.target_ph_max?.toFixed(1) ?? '?'}`}
            className={`${inputClass} ${phInRange === false ? 'border-cult-danger/60' : phInRange === true ? 'border-cult-success/60' : ''}`}
            inputMode="decimal"
          />
        </div>
      </div>
    </div>
  );
}
