import { useState, useEffect } from 'react';
import { FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getActiveCureSessions,
  completeCureSession,
  getRecentCompletedCures,
} from '../../services/rosinLabService';
import type { CureSession } from '../../types/rosin-lab.types';
import { CURE_TIME_ESTIMATES } from '../../types/rosin-lab.types';

const inputClass =
  'w-full bg-cult-surface border border-cult-border rounded-md px-3 py-2 text-cult-text-primary text-sm focus:outline-none focus:border-cult-stage-cure focus:ring-1 focus:ring-cult-stage-cure/20 placeholder-cult-text-muted';
const labelClass = 'block text-xs text-cult-text-secondary mb-1';

const DEST_COLORS: Record<string, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
  fresh_press: '#6366F1',
};

const CONSISTENCY_LABELS: Record<string, string> = {
  badder: 'Badder',
  jam: 'Jam',
  sauce: 'Sauce',
};

function daysElapsed(startTime: string | null): number {
  if (!startTime) return 0;
  const diff = Date.now() - new Date(startTime).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function durationDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

interface CureCardProps {
  session: CureSession;
  onCompleted: () => void;
}

function CureCard({ session, onCompleted }: CureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [outputG, setOutputG] = useState('');
  const [wasteG, setWasteG] = useState('');
  const [actualConsistency, setActualConsistency] = useState<string>(
    session.target_consistency
  );
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = daysElapsed(session.start_time);
  const estimated = CURE_TIME_ESTIMATES[session.target_consistency] ?? 14;
  const pct = Math.min(100, (days / estimated) * 100);

  const strainName = session.rosin_packages?.[0]?.strain?.name ?? '—';
  const batchNum =
    session.press_run?.wash_run?.batch?.batch_number ?? '—';

  const cureLoss =
    outputG && session.input_weight_grams
      ? (
          ((session.input_weight_grams - parseFloat(outputG)) /
            session.input_weight_grams) *
          100
        ).toFixed(1)
      : null;

  async function handleComplete() {
    if (!outputG) return;
    setError(null);
    setCompleting(true);
    const input = session.input_weight_grams ?? 0;
    const output = parseFloat(outputG);
    const waste = parseFloat(wasteG) || 0;
    const loss = input > 0 ? parseFloat((((input - output) / input) * 100).toFixed(2)) : 0;

    const { error: err } = await completeCureSession(session.id, {
      output_weight_grams: output,
      waste_weight_grams: waste,
      cure_loss_percentage: loss,
      actual_consistency: actualConsistency,
    });

    if (err) {
      setError('Failed to complete cure session. Please try again.');
    } else {
      onCompleted();
    }
    setCompleting(false);
  }

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: DEST_COLORS[session.target_consistency] ?? '#8B5CF6' }}
            />
            <div>
              <p className="text-sm font-semibold text-cult-text-primary">
                {strainName}
                <span className="ml-2 text-xs font-normal text-cult-text-secondary">
                  {CONSISTENCY_LABELS[session.target_consistency] ?? session.target_consistency}
                </span>
              </p>
              <p className="text-xs text-cult-text-muted mt-0.5">{batchNum}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-cult-text-primary leading-none">Day {days}</p>
            <p className="text-xs text-cult-text-muted mt-0.5">of ~{estimated}</p>
          </div>
        </div>

        <div className="mt-4">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, backgroundColor: '#1C1C1C' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: '#8B5CF6' }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-cult-text-secondary">
          {session.cure_temp_f != null && (
            <span>{session.cure_temp_f}°F</span>
          )}
          {session.input_weight_grams != null && (
            <span>{session.input_weight_grams.toFixed(1)}g → ?</span>
          )}
        </div>

        {session.rosin_packages && session.rosin_packages.length > 0 && (
          <div className="mt-3 space-y-1">
            {session.rosin_packages.map((pkg) => (
              <div key={pkg.id} className="flex items-center gap-2 text-xs text-cult-text-secondary">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DEST_COLORS[pkg.destination] ?? '#A6A6A6' }}
                />
                <span className="font-mono text-cult-text-muted">{pkg.package_id}</span>
                <span>{pkg.weight_grams.toFixed(1)}g</span>
                <span className="capitalize">{pkg.destination.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-cult-border">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-cult-text-secondary hover:text-cult-text-primary transition-colors"
        >
          Complete Cure
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-cult-border pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Output Weight (g)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={outputG}
                  onChange={(e) => setOutputG(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Waste Weight (g)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={wasteG}
                  onChange={(e) => setWasteG(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Actual Consistency</label>
              <select
                value={actualConsistency}
                onChange={(e) => setActualConsistency(e.target.value)}
                className={inputClass}
              >
                {Object.entries(CONSISTENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {outputG && cureLoss !== null && (
              <p className="text-xs text-cult-text-secondary">
                Cure Loss:{' '}
                <span className="text-cult-stage-cure font-semibold">{cureLoss}%</span>
              </p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleComplete}
              disabled={!outputG || completing}
              className="px-4 py-2 rounded-md text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              {completing ? 'Completing…' : 'Complete Cure Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ActiveCures() {
  const [sessions, setSessions] = useState<CureSession[]>([]);
  const [recent, setRecent] = useState<CureSession[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [active, done] = await Promise.all([
      getActiveCureSessions(),
      getRecentCompletedCures(5),
    ]);
    setSessions(active);
    setRecent(done);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-cult-stage-cure border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full bg-cult-surface-overlay flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-cult-text-muted" />
          </div>
          <p className="text-sm font-semibold text-cult-text-secondary">No active cure sessions</p>
          <p className="text-xs text-cult-text-muted">Package rosin to start a cure session.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sessions.map((s) => (
            <CureCard key={s.id} session={s} onCompleted={loadData} />
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-cult-text-secondary uppercase tracking-wider mb-3">
            Recently Completed
          </p>
          <div className="bg-cult-surface-raised border border-cult-border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-cult-border">
                  {['Strain', 'Target → Actual', 'Input → Output', 'Loss %', 'Days', 'Completed'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-cult-text-muted whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => {
                  const pressWashRun = s.press_run?.wash_run as
                    | { batch?: { batch_number: string } | null; strain?: { name: string } | null }
                    | undefined;
                  const strainName = pressWashRun?.strain?.name ?? '—';
                  const days = durationDays(s.start_time, s.end_time);
                  const endDate = s.end_time
                    ? new Date(s.end_time).toLocaleDateString()
                    : '—';
                  return (
                    <tr key={s.id} className="border-b border-cult-surface-overlay last:border-0">
                      <td className="px-3 py-2 text-cult-text-primary">{strainName}</td>
                      <td className="px-3 py-2 text-cult-text-secondary">
                        <span style={{ color: DEST_COLORS[s.target_consistency] ?? '#A6A6A6' }}>
                          {CONSISTENCY_LABELS[s.target_consistency] ?? s.target_consistency}
                        </span>
                        {s.actual_consistency && (
                          <>
                            {' → '}
                            <span style={{ color: DEST_COLORS[s.actual_consistency] ?? '#A6A6A6' }}>
                              {CONSISTENCY_LABELS[s.actual_consistency] ?? s.actual_consistency}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-cult-text-secondary tabular-nums">
                        {s.input_weight_grams?.toFixed(1) ?? '—'} →{' '}
                        {s.output_weight_grams?.toFixed(1) ?? '—'}g
                      </td>
                      <td className="px-3 py-2 text-cult-text-secondary tabular-nums">
                        {s.cure_loss_percentage?.toFixed(1) ?? '—'}%
                      </td>
                      <td className="px-3 py-2 text-cult-text-secondary tabular-nums">{days}d</td>
                      <td className="px-3 py-2 text-cult-text-muted">{endDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
