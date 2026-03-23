import { useState, useEffect } from 'react';
import { Loader2, ListX } from 'lucide-react';
import { getCompletedWashRuns } from '../../services/rosinLabService';
import type { WashRun } from '../../types/rosin-lab.types';

const PAGE_SIZE = 20;

function getFDStatus(run: WashRun): { label: string; className: string } {
  const fds = run.freeze_dry ?? [];
  if (fds.length === 0) return { label: 'Pending', className: 'text-cult-text-muted' };
  const anyCompleted = fds.some((fd) => fd.status === 'completed');
  if (anyCompleted) return { label: 'Dried', className: 'text-emerald-400 font-medium' };
  const anyInProgress = fds.some((fd) => fd.status === 'in_progress');
  if (anyInProgress) return { label: 'Drying', className: 'text-slate-300 font-medium' };
  return { label: 'Pending', className: 'text-cult-text-muted' };
}

function getStrainName(run: WashRun): string {
  return run.strain?.name ?? run.batch?.strain ?? '—';
}

function getBatchNumber(run: WashRun): string {
  return run.batch?.batch_number ?? '—';
}

export function CompletedWashRuns() {
  const [runs, setRuns] = useState<WashRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setLoading(true);
    getCompletedWashRuns(PAGE_SIZE, 0).then(({ data, count }) => {
      setRuns(data);
      setTotal(count);
      setOffset(data.length);
      setLoading(false);
    });
  }, []);

  async function handleLoadMore() {
    setLoadingMore(true);
    const { data } = await getCompletedWashRuns(PAGE_SIZE, offset);
    setRuns((prev) => [...prev, ...data]);
    setOffset((prev) => prev + data.length);
    setLoadingMore(false);
  }

  const hasMore = offset < total;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-cult-text-muted animate-spin" />
        <span className="text-sm text-cult-text-muted">Loading completed runs…</span>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <ListX className="w-12 h-12 text-cult-text-muted" />
        <p className="text-base text-cult-text-secondary">No completed wash runs yet</p>
        <p className="text-sm text-cult-text-muted">Completed runs will appear here</p>
      </div>
    );
  }

  const thBase =
    'px-4 py-2.5 text-left text-xs font-semibold text-cult-text-muted uppercase tracking-wide whitespace-nowrap';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cult-text-secondary">
          <span className="font-semibold text-cult-text-primary">{total.toLocaleString()}</span> completed run{total !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-cult-surface-raised border border-cult-border rounded-[6px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cult-surface-overlay">
              <th className={thBase} style={{ width: 120 }}>Batch</th>
              <th className={thBase} style={{ width: 140 }}>Strain</th>
              <th className={thBase} style={{ width: 100 }}>Date</th>
              <th className={`${thBase} text-right`} style={{ width: 90 }}>Input</th>
              <th className={`${thBase} text-right`} style={{ width: 90 }}>Output</th>
              <th className={`${thBase} text-right`} style={{ width: 80 }}>Yield</th>
              <th className={`${thBase} text-center`} style={{ width: 60 }}>Washes</th>
              <th className={thBase} style={{ width: 100 }}>FD Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const fdStatus = getFDStatus(run);
              return (
                <tr
                  key={run.id}
                  className="border-b border-cult-border last:border-b-0 hover:bg-cult-surface-overlay/50 transition-colors"
                >
                  <td
                    className="px-4 py-3 font-mono text-sm text-cult-text-primary"
                    style={{ boxShadow: 'inset 3px 0 0 #3B82F6' }}
                  >
                    {getBatchNumber(run)}
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-text-primary">{getStrainName(run)}</td>
                  <td className="px-4 py-3 text-sm text-cult-text-secondary">
                    {new Date(run.wash_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-text-secondary text-right">
                    {run.total_input_weight_grams != null
                      ? `${run.total_input_weight_grams.toLocaleString()}g`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-text-secondary text-right">
                    {run.total_output_weight_grams != null
                      ? `${run.total_output_weight_grams.toLocaleString()}g`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {run.yield_percentage != null ? (
                      <span className="font-medium text-blue-400">
                        {run.yield_percentage.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-cult-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-text-secondary text-center">
                    {run.num_washes ?? '—'}
                  </td>
                  <td className={`px-4 py-3 text-sm ${fdStatus.className}`}>
                    {fdStatus.label}
                  </td>
                </tr>
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
    </div>
  );
}
