import { useMemo, useState } from 'react';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { PlantAuditApplyDialog } from './PlantAuditApplyDialog';
import type {
  PlantAuditSessionWithCounts,
  PlantAuditCount,
  PlantAuditSummary,
} from '../../types';

interface PlantAuditReviewScreenProps {
  session: PlantAuditSessionWithCounts;
  onBack: () => void;
  onApply: () => Promise<PlantAuditSummary>;
  onAbandon: () => Promise<void>;
}

interface RoomBreakdown {
  roomId: string;
  roomLabel: string;
  total: number;
  clean: number;
  negVariance: number;
  posVariance: number;
  notFound: number;
  orphan: number;
  skipped: number;
  totalDeaths: number;
  totalAdded: number;
}

function computeBreakdown(counts: PlantAuditCount[]): RoomBreakdown[] {
  const map = new Map<string, RoomBreakdown>();
  for (const c of counts) {
    const roomId = c.grow_room_id;
    const label = c.grow_rooms
      ? `${c.grow_rooms.room_code} — ${c.grow_rooms.name}`
      : 'Unknown';
    let row = map.get(roomId);
    if (!row) {
      row = {
        roomId,
        roomLabel: label,
        total: 0,
        clean: 0,
        negVariance: 0,
        posVariance: 0,
        notFound: 0,
        orphan: 0,
        skipped: 0,
        totalDeaths: 0,
        totalAdded: 0,
      };
      map.set(roomId, row);
    }
    row.total += 1;
    if (c.status === 'counted') row.clean += 1;
    else if (c.status === 'variance_noted') {
      if ((c.variance ?? 0) < 0) {
        row.negVariance += 1;
        row.totalDeaths += Math.abs(c.variance ?? 0);
      } else if ((c.variance ?? 0) > 0) {
        row.posVariance += 1;
        row.totalAdded += c.variance ?? 0;
      }
    } else if (c.status === 'not_found') {
      row.notFound += 1;
      row.totalDeaths += c.db_count_snapshot;
    } else if (c.status === 'orphan_created') {
      row.orphan += 1;
      row.totalAdded += c.physical_count ?? 0;
    } else if (c.status === 'skipped') {
      row.skipped += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.roomLabel.localeCompare(b.roomLabel));
}

export function PlantAuditReviewScreen({
  session,
  onBack,
  onApply,
  onAbandon,
}: PlantAuditReviewScreenProps) {
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const breakdown = useMemo(() => computeBreakdown(session.counts), [session.counts]);

  const totals = useMemo(() => {
    return breakdown.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        clean: acc.clean + r.clean,
        negVariance: acc.negVariance + r.negVariance,
        posVariance: acc.posVariance + r.posVariance,
        notFound: acc.notFound + r.notFound,
        orphan: acc.orphan + r.orphan,
        skipped: acc.skipped + r.skipped,
        totalDeaths: acc.totalDeaths + r.totalDeaths,
        totalAdded: acc.totalAdded + r.totalAdded,
      }),
      {
        total: 0,
        clean: 0,
        negVariance: 0,
        posVariance: 0,
        notFound: 0,
        orphan: 0,
        skipped: 0,
        totalDeaths: 0,
        totalAdded: 0,
      },
    );
  }, [breakdown]);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-cult p-4 border border-white/[0.10] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-cult-text-secondary uppercase tracking-wider">
            Review
          </div>
          <div className="text-lg font-bold text-cult-text-primary">
            {session.audit_number}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-white/[0.15] text-cult-text-primary hover:bg-white/[0.06] transition text-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Count
          </button>
          <button
            type="button"
            onClick={() => setShowApplyDialog(true)}
            className="px-4 py-2 rounded-xl bg-cult-success text-cult-opaque-black font-bold text-sm flex items-center gap-1.5 hover:bg-cult-success-bright transition"
          >
            <Check className="w-4 h-4" />
            Apply Audit
          </button>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatTile label="Total" value={totals.total} tone="neutral" />
        <StatTile label="Clean" value={totals.clean} tone="success" />
        <StatTile label="Negative" value={totals.negVariance} tone="danger" />
        <StatTile label="Positive" value={totals.posVariance} tone="info" />
        <StatTile label="Not Found" value={totals.notFound} tone="danger" />
        <StatTile label="Orphan" value={totals.orphan} tone="pending" />
        <StatTile label="Skipped" value={totals.skipped} tone="warning" />
      </div>

      {/* Plants impact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-cult p-4 border border-cult-danger/30 bg-cult-danger/10">
          <div className="text-xs text-cult-text-secondary uppercase tracking-wider">
            Deaths to Log
          </div>
          <div className="text-3xl font-bold text-cult-danger mt-1">
            {totals.totalDeaths}
          </div>
          <div className="text-xs text-cult-text-secondary mt-1">
            mortality rows will be created
          </div>
        </div>
        <div className="glass-card rounded-cult p-4 border border-cult-info/30 bg-cult-info/10">
          <div className="text-xs text-cult-text-secondary uppercase tracking-wider">
            Plants to Add
          </div>
          <div className="text-3xl font-bold text-cult-info mt-1">
            {totals.totalAdded}
          </div>
          <div className="text-xs text-cult-text-secondary mt-1">
            from positive variance + orphans
          </div>
        </div>
      </div>

      {/* Per-room breakdown */}
      <div className="glass-card rounded-cult border border-white/[0.10] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
            Breakdown by Room
          </div>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {breakdown.map((r) => (
            <div key={r.roomId} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-semibold text-cult-text-primary">
                  {r.roomLabel}
                </div>
                <div className="text-xs text-cult-text-secondary mt-0.5">
                  {r.clean} clean · {r.negVariance + r.notFound} short ·{' '}
                  {r.posVariance + r.orphan} extra · {r.skipped} skipped
                </div>
              </div>
              <div className="flex gap-4 text-right text-xs">
                {r.totalDeaths > 0 && (
                  <div>
                    <div className="text-cult-danger font-bold">-{r.totalDeaths}</div>
                    <div className="text-cult-text-muted">deaths</div>
                  </div>
                )}
                {r.totalAdded > 0 && (
                  <div>
                    <div className="text-cult-info font-bold">+{r.totalAdded}</div>
                    <div className="text-cult-text-muted">added</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {totals.skipped > 0 && (
        <div className="glass-card rounded-cult p-3 border border-cult-warning/30 bg-cult-warning/10 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-cult-warning mt-0.5 flex-shrink-0" />
          <div className="text-xs text-cult-warning">
            {totals.skipped} group{totals.skipped === 1 ? '' : 's'} skipped. Skipped rows have no
            inventory impact on apply and should be re-audited later.
          </div>
        </div>
      )}

      {showApplyDialog && (
        <PlantAuditApplyDialog
          auditNumber={session.audit_number}
          totalDeaths={totals.totalDeaths}
          totalAdded={totals.totalAdded}
          onApply={async () => {
            const summary = await onApply();
            setShowApplyDialog(false);
            return summary;
          }}
          onAbandon={async () => {
            await onAbandon();
            setShowApplyDialog(false);
          }}
          onCancel={() => setShowApplyDialog(false)}
        />
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'danger' | 'info' | 'warning' | 'pending';
}) {
  const toneClass = {
    neutral: 'border-white/[0.10] bg-white/[0.04] text-cult-text-primary',
    success: 'border-cult-success/30 bg-cult-success/10 text-cult-success',
    danger: 'border-cult-danger/30 bg-cult-danger/10 text-cult-danger',
    info: 'border-cult-info/30 bg-cult-info/10 text-cult-info',
    warning: 'border-cult-warning/30 bg-cult-warning/10 text-cult-warning',
    pending: 'border-cult-pending/30 bg-cult-pending/10 text-cult-pending',
  }[tone];
  return (
    <div className={`glass-card rounded-cult border p-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
