import { useEffect, useState, useMemo } from 'react';
import { Scissors, AlertTriangle, Package } from 'lucide-react';
import { HubShell } from './HubShell';
import { BatchKanbanCard } from './BatchKanbanCard';
import { useBatchPipeline, getDaysInStage } from '../hooks/useBatchPipeline';
import { useRevenuePipeline } from '@/features/production-queue/hooks/useRevenuePipeline';
import { RevenuePipeline } from '@/features/production-queue/components/RevenuePipeline';
import { formatCurrencyShort } from '@/shared/utils/format';
import { getActiveBuckingSessions, getActiveTrimSessions, getActivePackagingSessions } from '@/features/sessions/services/sessions.service';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: string;
  batch_number?: string | null;
  type: 'bucking' | 'trim' | 'packaging';
  started_at: string | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function OpenSessionList({ sessions, loading }: { sessions: ActiveSession[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2].map(i => <div key={i} className="h-8 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }

  if (!sessions.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No active sessions.</p>;
  }

  const TYPE_COLORS: Record<string, string> = {
    bucking: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    trim: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    packaging: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };

  return (
    <div>
      {sessions.map(s => {
        const elapsed = s.started_at
          ? Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000)
          : null;
        const chipClass = TYPE_COLORS[s.type] ?? 'bg-cult-charcoal text-cult-text-muted border-cult-border';

        return (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-cult-charcoal/50 last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${chipClass}`}>
                {s.type}
              </span>
              <span className="text-[12px] text-cult-off-white truncate">
                {s.batch_number ?? 'No batch'}
              </span>
            </div>
            {elapsed != null && (
              <span className="text-[11px] text-cult-text-faint flex-shrink-0">
                {elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgingAlertBanner({ batches }: { batches: ReturnType<typeof useBatchPipeline>['batches'] }) {
  const oldest = useMemo(() => {
    if (!batches.length) return null;
    const staged = batches
      .map(b => ({ batch: b, days: getDaysInStage(b) }))
      .filter(b => b.days > 30)
      .sort((a, b) => b.days - a.days);
    return staged[0] ?? null;
  }, [batches]);

  if (!oldest) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-cult bg-amber-500/10 border border-amber-500/30 text-amber-300">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-[12px]">
        <span className="font-semibold">{oldest.batch.batch_number}</span>
        {' '}has been in <span className="font-semibold">{oldest.batch.lifecycle_state}</span> for{' '}
        <span className="font-semibold">{oldest.days}d</span> — review recommended.
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PostProductionHub() {
  const { batches, loading: batchesLoading } = useBatchPipeline();
  const {
    pipeline,
    weekOutlook,
    weekOffset,
    setWeekOffset,
    selectedWeekLabel,
    selectedWeekRange,
    loading: revenueLoading,
  } = useRevenuePipeline();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSessions() {
      setSessionsLoading(true);
      const [bucking, trim, packaging] = await Promise.all([
        getActiveBuckingSessions(),
        getActiveTrimSessions(),
        getActivePackagingSessions(),
      ]);

      if (!mounted) return;

      const all: ActiveSession[] = [
        ...(bucking.data ?? []).map((s: any) => ({
          id: s.id,
          batch_number: s.batch_number ?? null,
          type: 'bucking' as const,
          started_at: s.started_at ?? null,
        })),
        ...(trim.data ?? []).map((s: any) => ({
          id: s.id,
          batch_number: s.batch_number ?? null,
          type: 'trim' as const,
          started_at: s.started_at ?? null,
        })),
        ...(packaging.data ?? []).map((s: any) => ({
          id: s.id,
          batch_number: s.batch_number ?? null,
          type: 'packaging' as const,
          started_at: s.started_at ?? null,
        })),
      ];

      setSessions(all);
      setSessionsLoading(false);
    }

    loadSessions();
    return () => { mounted = false; };
  }, []);

  const openOrderValue = revenueLoading ? '—' : formatCurrencyShort(pipeline.total);

  const kpis = [
    { label: 'Batches in Pipeline', value: batchesLoading ? '—' : String(batches.length) },
    {
      label: 'Active Sessions',
      value: sessionsLoading ? '—' : String(sessions.length),
    },
    { label: 'Open Order Value', value: openOrderValue },
  ];

  // Show top 10 batches for the pipeline preview
  const previewBatches = batches.slice(0, 10);

  return (
    <HubShell section="Post Production" icon={Scissors} kpis={kpis}>
      <div className="space-y-6">
        <AgingAlertBanner batches={batches} />

        {/* Batch Pipeline Preview */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4" />
            Batch Pipeline
          </h2>
          {batchesLoading ? (
            <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-cult-graphite rounded-cult" />)}
            </div>
          ) : previewBatches.length === 0 ? (
            <p className="text-[12px] text-cult-text-faint py-2">No active batches.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {previewBatches.map(b => (
                <BatchKanbanCard key={b.id} batch={b} />
              ))}
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Active Sessions
          </h2>
          <OpenSessionList sessions={sessions} loading={sessionsLoading} />
        </div>

        {/* Revenue Pipeline */}
        {!revenueLoading && (
          <RevenuePipeline
            data={pipeline}
            weekOutlook={weekOutlook}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            weekLabel={selectedWeekLabel}
            weekRange={selectedWeekRange}
          />
        )}
      </div>
    </HubShell>
  );
}
