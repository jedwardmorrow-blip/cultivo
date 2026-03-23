import { useState, useEffect, useMemo, Fragment } from 'react';
import { FlaskConical, Loader2, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  getCompletedCureSessions,
  getCureSessionStats,
} from '../../services/rosinLabService';
import { StatusBadge } from '../StatusBadge';
import {
  formatCureDuration,
  formatLogDate,
  getCureLossColorClass,
} from '../../utils/formatters';
import type { CureSession } from '../../types/rosin-lab.types';

const PAGE_SIZE = 20;

const CONSISTENCY_COLORS: Record<string, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
};

const DESTINATION_COLORS: Record<string, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
  fresh_press: '#6366F1',
};

interface CureSessionPressRunDetail {
  id: string;
  press_date: string;
  wash_run: {
    batch: { batch_number: string } | null;
    strain: { name: string; abbreviation: string } | null;
  } | null;
}

interface CureSessionRosinPackage {
  id: string;
  package_id: string;
  weight_grams: number;
  destination: string;
  status: string;
  strain: { name: string } | null;
}

type CureSessionLogEntry = Omit<CureSession, 'press_run' | 'rosin_packages'> & {
  press_run: CureSessionPressRunDetail | null;
  rosin_packages: CureSessionRosinPackage[];
};

type StatusFilter = 'all' | 'completed' | 'failed';
type ConsistencyFilter = 'all' | 'badder' | 'jam' | 'sauce';

interface CureSessionLogProps {
  searchTerm: string;
}

function getCureSessionStrainName(session: CureSessionLogEntry): string {
  if (session.press_run?.wash_run?.strain?.name) return session.press_run.wash_run.strain.name;
  const firstPkg = session.rosin_packages?.[0];
  if (firstPkg?.strain?.name) return firstPkg.strain.name;
  return '—';
}

function getCureSessionBatchNumber(session: CureSessionLogEntry): string {
  return session.press_run?.wash_run?.batch?.batch_number ?? '—';
}

const thBase =
  'px-3 py-2.5 text-left text-xs font-semibold text-cult-text-muted uppercase tracking-wide whitespace-nowrap';

const STATUS_BUTTONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const CONSISTENCY_BUTTONS: { label: string; value: ConsistencyFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Badder', value: 'badder' },
  { label: 'Jam', value: 'jam' },
  { label: 'Sauce', value: 'sauce' },
];

function ConsistencyLabel({ value }: { value: string | null }) {
  if (!value) return <span className="text-cult-text-muted">—</span>;
  const color = CONSISTENCY_COLORS[value];
  return (
    <span className="flex items-center gap-1.5">
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="capitalize">{value}</span>
    </span>
  );
}

export function CureSessionLog({ searchTerm }: CureSessionLogProps) {
  const [sessions, setSessions] = useState<CureSessionLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [consistencyFilter, setConsistencyFilter] = useState<ConsistencyFilter>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [stats, setStats] = useState({ count: 0, avgCureLoss: 0 });

  useEffect(() => {
    getCureSessionStats().then(setStats);
  }, []);

  useEffect(() => {
    setLoading(true);
    setSessions([]);
    setExpandedRowId(null);
    getCompletedCureSessions(PAGE_SIZE, 0, statusFilter, consistencyFilter).then(
      ({ data, count }) => {
        setSessions(data as unknown as CureSessionLogEntry[]);
        setTotal(count);
        setOffset(data.length);
        setLoading(false);
      }
    );
  }, [statusFilter, consistencyFilter]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const { data } = await getCompletedCureSessions(
      PAGE_SIZE,
      offset,
      statusFilter,
      consistencyFilter
    );
    setSessions((prev) => [...prev, ...(data as unknown as CureSessionLogEntry[])]);
    setOffset((prev) => prev + data.length);
    setLoadingMore(false);
  }

  function toggleRow(id: string) {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }

  const visibleSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const lower = searchTerm.toLowerCase();
    return sessions.filter((s) => {
      const strain = getCureSessionStrainName(s).toLowerCase();
      const batch = getCureSessionBatchNumber(s).toLowerCase();
      return strain.includes(lower) || batch.includes(lower);
    });
  }, [sessions, searchTerm]);

  const hasMore = offset < total;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status segmented buttons */}
        <div className="flex items-center bg-cult-surface-overlay border border-cult-border rounded-[6px] overflow-hidden">
          {STATUS_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-cult-border last:border-r-0 ${
                statusFilter === btn.value
                  ? 'bg-cult-surface text-cult-text-primary'
                  : 'text-cult-text-secondary hover:text-cult-text-primary hover:bg-cult-surface/50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Consistency segmented buttons */}
        <div className="flex items-center bg-cult-surface-overlay border border-cult-border rounded-[6px] overflow-hidden">
          {CONSISTENCY_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setConsistencyFilter(btn.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-r border-cult-border last:border-r-0 ${
                consistencyFilter === btn.value
                  ? 'bg-cult-surface text-cult-text-primary'
                  : 'text-cult-text-secondary hover:text-cult-text-primary hover:bg-cult-surface/50'
              }`}
            >
              {btn.value !== 'all' && CONSISTENCY_COLORS[btn.value] && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CONSISTENCY_COLORS[btn.value] }}
                />
              )}
              {btn.label}
            </button>
          ))}
        </div>

        {/* Summary stats */}
        <div className="ml-auto text-sm text-cult-text-secondary">
          <span className="font-semibold text-cult-text-primary">
            {stats.count.toLocaleString()}
          </span>{' '}
          sessions ·{' '}
          <span className="font-semibold text-cult-text-primary">
            {stats.avgCureLoss.toFixed(1)}%
          </span>{' '}
          avg cure loss
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 text-cult-text-muted animate-spin" />
          <span className="text-sm text-cult-text-muted">Loading cure sessions…</span>
        </div>
      ) : visibleSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FlaskConical className="w-12 h-12 text-cult-text-muted" />
          <p className="text-base text-cult-text-secondary">No cure sessions recorded</p>
          <p className="text-sm text-cult-text-muted">
            Cure sessions will appear here after completing cures in the Press hub
          </p>
        </div>
      ) : (
        <>
          <div className="bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cult-surface-overlay">
                  <th className={thBase} style={{ width: 100 }}>Started</th>
                  <th className={thBase} style={{ width: 100 }}>Completed</th>
                  <th className={thBase} style={{ width: 80 }}>Duration</th>
                  <th className={thBase} style={{ width: 130 }}>Strain</th>
                  <th className={thBase} style={{ width: 110 }}>Batch</th>
                  <th className={thBase} style={{ width: 90 }}>Target</th>
                  <th className={thBase} style={{ width: 90 }}>Actual</th>
                  <th className={`${thBase} text-right`} style={{ width: 80 }}>Input</th>
                  <th className={`${thBase} text-right`} style={{ width: 80 }}>Output</th>
                  <th className={`${thBase} text-right`} style={{ width: 80 }}>Cure Loss</th>
                  <th className={thBase} style={{ width: 70 }}>Temp</th>
                  <th className={`${thBase} text-center`} style={{ width: 70 }}>Packages</th>
                  <th className={thBase} style={{ width: 90 }}>Status</th>
                  <th className={thBase} style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleSessions.map((session) => {
                  const isExpanded = expandedRowId === session.id;
                  const packageCount = session.rosin_packages?.length ?? 0;
                  const consistencyMismatch =
                    session.actual_consistency !== null &&
                    session.actual_consistency !== session.target_consistency;

                  return (
                    <Fragment key={session.id}>
                      <tr
                        onClick={() => toggleRow(session.id)}
                        className="border-b border-cult-border last:border-b-0 hover:bg-cult-surface-overlay/50 transition-colors cursor-pointer"
                      >
                        <td
                          className="px-3 py-3 text-sm text-cult-text-secondary"
                          style={{ boxShadow: 'inset 3px 0 0 #8B5CF6' }}
                        >
                          {formatLogDate(session.start_time)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {formatLogDate(session.end_time)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {formatCureDuration(session.start_time, session.end_time)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-primary truncate max-w-[130px]">
                          {getCureSessionStrainName(session)}
                        </td>
                        <td className="px-3 py-3 text-sm font-mono text-cult-text-secondary">
                          {getCureSessionBatchNumber(session)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          <ConsistencyLabel value={session.target_consistency} />
                        </td>
                        <td className={`px-3 py-3 text-sm ${consistencyMismatch ? 'text-amber-400' : 'text-cult-text-secondary'}`}>
                          <ConsistencyLabel value={session.actual_consistency ?? null} />
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary text-right">
                          {session.input_weight_grams != null
                            ? `${session.input_weight_grams.toLocaleString()}g`
                            : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary text-right">
                          {session.output_weight_grams != null
                            ? `${session.output_weight_grams.toLocaleString()}g`
                            : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-right">
                          {session.cure_loss_percentage != null ? (
                            <span
                              className={`font-medium ${getCureLossColorClass(session.cure_loss_percentage)}`}
                            >
                              {session.cure_loss_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-cult-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {session.cure_temp_f != null ? `${session.cure_temp_f}°F` : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary text-center">
                          {packageCount}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={session.status} />
                        </td>
                        <td className="px-3 py-3 text-cult-text-muted">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-cult-border last:border-b-0">
                          <td colSpan={14} className="p-0">
                            <div className="px-6 py-4 bg-cult-surface-overlay/30 grid grid-cols-2 gap-6">
                              {/* Rosin Packages */}
                              <div>
                                <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-2">
                                  Rosin Packages
                                </p>
                                {session.rosin_packages && session.rosin_packages.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {session.rosin_packages.map((pkg) => (
                                      <div
                                        key={pkg.id}
                                        className="flex items-center gap-2 text-sm text-cult-text-secondary"
                                      >
                                        <span className="font-mono text-cult-text-primary text-xs">
                                          {pkg.package_id}
                                        </span>
                                        <span className="text-cult-text-muted">·</span>
                                        <span>{pkg.weight_grams.toLocaleString()}g</span>
                                        <span className="text-cult-text-muted">·</span>
                                        <span className="flex items-center gap-1">
                                          <span
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{
                                              backgroundColor:
                                                DESTINATION_COLORS[pkg.destination] ?? '#666',
                                            }}
                                          />
                                          <span className="capitalize">
                                            {pkg.destination.replace('_', ' ')}
                                          </span>
                                        </span>
                                        <span className="text-cult-text-muted">·</span>
                                        <StatusBadge status={pkg.status} />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-cult-text-muted">No packages linked</p>
                                )}
                              </div>

                              {/* Consistency match + Notes */}
                              <div className="flex flex-col gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-2">
                                    Consistency Match
                                  </p>
                                  {session.actual_consistency ? (
                                    consistencyMismatch ? (
                                      <div className="flex items-center gap-2 text-sm text-amber-400">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span>
                                          Target{' '}
                                          <span className="font-medium capitalize">
                                            {session.target_consistency}
                                          </span>
                                          {' → '}Actual{' '}
                                          <span className="font-medium capitalize">
                                            {session.actual_consistency}
                                          </span>
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>
                                          Achieved target{' '}
                                          <span className="font-medium capitalize">
                                            {session.target_consistency}
                                          </span>
                                        </span>
                                      </div>
                                    )
                                  ) : (
                                    <p className="text-sm text-cult-text-muted">Not recorded</p>
                                  )}
                                </div>

                                {session.notes && (
                                  <div>
                                    <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-1">
                                      Notes
                                    </p>
                                    <p className="text-sm text-cult-text-secondary italic">
                                      {session.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2 rounded-[6px] text-sm font-medium bg-cult-surface-overlay border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                Load more ({total - offset} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
