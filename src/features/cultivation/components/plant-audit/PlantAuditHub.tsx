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
    className: 'bg-white/[0.04] border-white/[0.10] text-cult-text-muted',
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
          <h1 className="text-2xl font-bold text-cult-text-primary uppercase tracking-wide">
            Plant Audit
          </h1>
          <p className="text-sm text-cult-text-secondary mt-1">
            Walk the rooms, confirm counts, fix the baseline.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="px-5 py-2.5 rounded-xl bg-cult-accent text-cult-opaque-black font-bold hover:bg-cult-accent-hover transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Start New Audit
        </button>
      </div>

      {error && (
        <div className="glass-card rounded-cult p-3 border border-cult-danger/30 bg-cult-danger/10 text-sm text-cult-danger">
          {error}
        </div>
      )}

      <div className="glass-card rounded-cult border border-white/[0.10] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
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
          <div className="divide-y divide-white/[0.06]">
            {active.map((s) => {
              const tone = STATUS_TONE[s.status];
              const Icon = tone.Icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onResume(s.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition text-left"
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
                    className={`px-2.5 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${tone.className}`}
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
        <div className="glass-card rounded-cult border border-white/[0.10] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
              Recent
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
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
                      className={`px-2.5 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${tone.className}`}
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
