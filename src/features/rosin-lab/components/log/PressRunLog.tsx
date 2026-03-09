import { useState, useEffect, useMemo, Fragment } from 'react';
import { Scale, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getCompletedPressRuns,
  getPressRunStats,
} from '../../services/rosinLabService';
import { StatusBadge } from '../StatusBadge';
import {
  formatPressTime,
  formatLogDate,
  getYieldColorClass,
} from '../../utils/formatters';
import type { PressRun } from '../../types/rosin-lab.types';

const PAGE_SIZE = 20;

const DESTINATION_COLORS: Record<string, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
  fresh_press: '#6366F1',
};

interface PressRunInputDetail {
  id: string;
  weight_grams: number;
  hash_package: {
    package_id: string;
    strain: { name: string; abbreviation: string } | null;
  } | null;
}

type PressRunLogEntry = PressRun & {
  inputs?: PressRunInputDetail[];
};

type StatusFilter = 'all' | 'completed' | 'failed';

interface PressRunLogProps {
  searchTerm: string;
}

function getPressRunStrainName(run: PressRunLogEntry): string {
  if (run.wash_run?.strain?.name) return run.wash_run.strain.name;
  const firstInput = run.inputs?.[0];
  if (firstInput?.hash_package?.strain?.name) return firstInput.hash_package.strain.name;
  return '—';
}

function getPressRunBatchNumber(run: PressRunLogEntry): string {
  return run.wash_run?.batch?.batch_number ?? '—';
}

const thBase =
  'px-3 py-2.5 text-left text-[11px] font-semibold text-cult-text-muted uppercase tracking-wide whitespace-nowrap';

const STATUS_BUTTONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

export function PressRunLog({ searchTerm }: PressRunLogProps) {
  const [runs, setRuns] = useState<PressRunLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [stats, setStats] = useState({ count: 0, avgYield: 0 });

  useEffect(() => {
    getPressRunStats().then(setStats);
  }, []);

  useEffect(() => {
    setLoading(true);
    setRuns([]);
    setExpandedRowId(null);
    getCompletedPressRuns(
      PAGE_SIZE,
      0,
      statusFilter,
      dateFrom || undefined,
      dateTo || undefined
    ).then(({ data, count }) => {
      setRuns(data as PressRunLogEntry[]);
      setTotal(count);
      setOffset(data.length);
      setLoading(false);
    });
  }, [statusFilter, dateFrom, dateTo]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const { data } = await getCompletedPressRuns(
      PAGE_SIZE,
      offset,
      statusFilter,
      dateFrom || undefined,
      dateTo || undefined
    );
    setRuns((prev) => [...prev, ...(data as PressRunLogEntry[])]);
    setOffset((prev) => prev + data.length);
    setLoadingMore(false);
  }

  function toggleRow(id: string) {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }

  const visibleRuns = useMemo(() => {
    if (!searchTerm.trim()) return runs;
    const lower = searchTerm.toLowerCase();
    return runs.filter((r) => {
      const strain = getPressRunStrainName(r).toLowerCase();
      const batch = getPressRunBatchNumber(r).toLowerCase();
      return strain.includes(lower) || batch.includes(lower);
    });
  }, [runs, searchTerm]);

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

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-[30px] px-2 text-xs bg-cult-surface-overlay border border-cult-border rounded-[6px] text-cult-text-primary focus:outline-none focus:border-cult-border-strong"
            placeholder="From"
          />
          <span className="text-xs text-cult-text-muted">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-[30px] px-2 text-xs bg-cult-surface-overlay border border-cult-border rounded-[6px] text-cult-text-primary focus:outline-none focus:border-cult-border-strong"
            placeholder="To"
          />
        </div>

        {/* Summary stats */}
        <div className="ml-auto text-sm text-cult-text-secondary">
          <span className="font-semibold text-cult-text-primary">
            {stats.count.toLocaleString()}
          </span>{' '}
          runs ·{' '}
          <span className="font-semibold text-cult-text-primary">
            {stats.avgYield.toFixed(1)}%
          </span>{' '}
          avg yield
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 text-cult-text-muted animate-spin" />
          <span className="text-sm text-cult-text-muted">Loading press runs…</span>
        </div>
      ) : visibleRuns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Scale className="w-12 h-12 text-cult-text-muted" />
          <p className="text-base text-cult-text-secondary">No press runs recorded</p>
          <p className="text-sm text-cult-text-muted">
            Press runs will appear here after completing runs in the Press hub
          </p>
        </div>
      ) : (
        <>
          <div className="bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cult-surface-overlay">
                  <th className={thBase} style={{ width: 100 }}>Date</th>
                  <th className={thBase} style={{ width: 130 }}>Strain</th>
                  <th className={thBase} style={{ width: 110 }}>Batch</th>
                  <th className={`${thBase} text-right`} style={{ width: 80 }}>Input</th>
                  <th className={`${thBase} text-right`} style={{ width: 80 }}>Output</th>
                  <th className={`${thBase} text-right`} style={{ width: 70 }}>Yield</th>
                  <th className={thBase} style={{ width: 70 }}>Temp</th>
                  <th className={thBase} style={{ width: 70 }}>PSI</th>
                  <th className={thBase} style={{ width: 70 }}>Time</th>
                  <th className={thBase} style={{ width: 60 }}>Micron</th>
                  <th className={`${thBase} text-center`} style={{ width: 70 }}>Packages</th>
                  <th className={thBase} style={{ width: 90 }}>Status</th>
                  <th className={thBase} style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleRuns.map((run) => {
                  const isExpanded = expandedRowId === run.id;
                  const packageCount = run.rosin_packages?.length ?? 0;

                  return (
                    <Fragment key={run.id}>
                      <tr
                        onClick={() => toggleRow(run.id)}
                        className="border-b border-cult-border last:border-b-0 hover:bg-cult-surface-overlay/50 transition-colors cursor-pointer"
                      >
                        <td
                          className="px-3 py-3 text-sm text-cult-text-secondary"
                          style={{ boxShadow: 'inset 3px 0 0 #F97316' }}
                        >
                          {formatLogDate(run.press_date)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-primary truncate max-w-[130px]">
                          {getPressRunStrainName(run)}
                        </td>
                        <td className="px-3 py-3 text-sm font-mono text-cult-text-secondary">
                          {getPressRunBatchNumber(run)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary text-right">
                          {run.input_weight_grams != null
                            ? `${run.input_weight_grams.toLocaleString()}g`
                            : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary text-right">
                          {run.output_weight_grams != null
                            ? `${run.output_weight_grams.toLocaleString()}g`
                            : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-right">
                          {run.yield_percentage != null ? (
                            <span className={`font-medium ${getYieldColorClass(run.yield_percentage)}`}>
                              {run.yield_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-cult-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {run.temperature_f != null ? `${run.temperature_f}°F` : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {run.pressure_psi != null ? run.pressure_psi.toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {formatPressTime(run.press_time_seconds)}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary">
                          {run.bag_micron != null ? `${run.bag_micron}μ` : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-cult-text-secondary text-center">
                          {packageCount}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={run.status} />
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
                          <td colSpan={13} className="p-0">
                            <div className="px-6 py-4 bg-cult-surface-overlay/30 grid grid-cols-2 gap-6">
                              {/* Hash Inputs */}
                              <div>
                                <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-2">
                                  Hash Inputs
                                </p>
                                {run.inputs && run.inputs.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {run.inputs.map((inp) => (
                                      <div key={inp.id} className="flex items-center gap-2 text-sm text-cult-text-secondary">
                                        <span className="font-mono text-cult-text-primary text-xs">
                                          {inp.hash_package?.package_id ?? '—'}
                                        </span>
                                        <span className="text-cult-text-muted">·</span>
                                        <span>{inp.weight_grams.toLocaleString()}g</span>
                                        {inp.hash_package?.strain?.name && (
                                          <>
                                            <span className="text-cult-text-muted">·</span>
                                            <span className="text-cult-text-primary">
                                              {inp.hash_package.strain.name}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-cult-text-muted">No input records</p>
                                )}
                              </div>

                              {/* Rosin Packages */}
                              <div>
                                <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-2">
                                  Rosin Packages Created
                                </p>
                                {run.rosin_packages && run.rosin_packages.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {run.rosin_packages.map((pkg) => (
                                      <div key={pkg.id} className="flex items-center gap-2 text-sm text-cult-text-secondary">
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
                                          <span className="capitalize">{pkg.destination.replace('_', ' ')}</span>
                                        </span>
                                        <span className="text-cult-text-muted">·</span>
                                        <StatusBadge status={pkg.status} />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-cult-text-muted">No packages created</p>
                                )}
                              </div>

                              {/* Equipment */}
                              {run.equipment?.name && (
                                <div>
                                  <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-1">
                                    Equipment
                                  </p>
                                  <p className="text-sm text-cult-text-primary">{run.equipment.name}</p>
                                </div>
                              )}

                              {/* Notes */}
                              {run.notes && (
                                <div>
                                  <p className="text-xs font-semibold text-cult-text-muted uppercase tracking-wide mb-1">
                                    Notes
                                  </p>
                                  <p className="text-sm text-cult-text-secondary italic">{run.notes}</p>
                                </div>
                              )}
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
