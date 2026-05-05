import { ClipboardList, Plus, Clock, Check, XCircle } from 'lucide-react';
import type { PlantAuditSession } from '../../types';

interface PlantAuditHubProps {
  sessions: PlantAuditSession[];
  loading: boolean;
  error: string | null;
  onStartNew: () => void;
  onResume: (sessionId: string) => void;
}

const STATUS_TONE: Record<
  PlantAuditSession['status'],
  { label: string; className: string; Icon: typeof Clock }
> = {
  in_progress: {
    label: 'In progress',
    className: 'bg-cult-info/10 border-cult-info/30 text-cult-info',
    Icon: Clock,
  },
  review: {
    label: 'Review',
    className: 'bg-cult-warning/10 border-cult-warning/30 text-cult-warning',
    Icon: ClipboardList,
  },
  applied: {
    label: 'Applied',
    className: 'bg-cult-success/10 border-cult-success/30 text-cult-success',
    Icon: Check,
  },
  abandoned: {
    label: 'Abandoned',
    className: 'bg-cult-surface-inset border-cult-border-subtle text-cult-text-muted',
    Icon: XCircle,
  },
};

export function PlantAuditHub({
  sessions,
  loading,
  error,
  onStartNew,
  onResume,
}: PlantAuditHubProps) {
  const active = sessions.filter(
    (s) => s.status === 'in_progress' || s.status === 'review',
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">
            Plant Audit
          </h1>
          <p className="text-sm text-cult-text-secondary mt-1.5">
            Walk the rooms, confirm counts, fix the baseline
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="px-5 py-2 rounded border border-cult-accent text-cult-accent hover:bg-cult-accent hover:text-cult-opaque-black transition-colors flex items-center gap-2 font-mono uppercase tracking-[0.16em] text-[11px]"
        >
          <Plus className="w-3.5 h-3.5" />
          Start New Audit
        </button>
      </div>

      {error && (
        <div className="glass-card rounded-cult p-3 border border-cult-danger/30 bg-cult-danger/10 text-sm text-cult-danger">
          {error}
        </div>
      )}

      <div className="bg-cult-surface rounded-cult border border-cult-border overflow-hidden">
        <div className="px-4 py-3 border-b border-cult-border-subtle bg-cult-surface-inset">
          <div className="font-mono uppercase tracking-[0.14em] text-[11px] text-cult-text-muted">
            Active Audits
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-cult-text-secondary text-sm">Loading…</div>
        ) : active.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="w-8 h-8 text-cult-text-muted mx-auto mb-2" />
            <p className="text-cult-text-secondary text-sm">
              No active audits. Start one to begin a walk.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cult-border-subtle">
            {active.map((s) => {
              const tone = STATUS_TONE[s.status];
              const Icon = tone.Icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onResume(s.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-cult-surface-subtle transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-cult-text-primary truncate">
                      {s.audit_number}
                    </div>
                    <div className="text-xs text-cult-text-secondary mt-0.5">
                      Started {new Date(s.started_at).toLocaleString()}
                      {s.room_scope && s.room_scope.length > 0
                        ? ` · ${s.room_scope.length} rooms`
                        : ' · full facility'}
                    </div>
                    {s.notes && (
                      <div className="text-xs text-cult-text-muted mt-1 truncate">{s.notes}</div>
                    )}
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded border font-mono uppercase tracking-[0.14em] text-[10px] flex items-center gap-1.5 ${tone.className}`}
                  >
                    <Icon className="w-3 h-3" />
                    {tone.label}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {sessions.filter((s) => s.status === 'applied' || s.status === 'abandoned').length > 0 && (
        <div className="bg-cult-surface rounded-cult border border-cult-border overflow-hidden">
          <div className="px-4 py-3 border-b border-cult-border-subtle bg-cult-surface-inset">
            <div className="font-mono uppercase tracking-[0.14em] text-[11px] text-cult-text-muted">
              Recent
            </div>
          </div>
          <div className="divide-y divide-cult-border-subtle">
            {sessions
              .filter((s) => s.status === 'applied' || s.status === 'abandoned')
              .slice(0, 10)
              .map((s) => {
                const tone = STATUS_TONE[s.status];
                const Icon = tone.Icon;
                return (
                  <div
                    key={s.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-cult-text-primary truncate">
                        {s.audit_number}
                      </div>
                      <div className="text-xs text-cult-text-secondary mt-0.5">
                        {new Date(s.started_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded border font-mono uppercase tracking-[0.14em] text-[10px] flex items-center gap-1.5 ${tone.className}`}
                    >
                      <Icon className="w-3 h-3" />
                      {tone.label}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
