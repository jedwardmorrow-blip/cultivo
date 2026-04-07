import React from 'react';
import { FlaskConical, CheckCircle2, Clock, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { HubShell } from './HubShell';
import { useCOATimeline } from '../hooks/useCOATimeline';
import type { COATimelineBatch } from '../hooks/useCOATimeline';

// ─── Batch Card ────────────────────────────────────────────────────────────────

interface BatchCardProps {
  batch: COATimelineBatch;
}

function BatchCard({ batch }: BatchCardProps) {
  const harvestStr = batch.harvest_date
    ? new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const cureCompleteStr = batch.cure_expected_complete_date
    ? new Date(batch.cure_expected_complete_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-cult-dark-gray rounded-lg p-3 border border-cult-mid-gray hover:border-cult-accent transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="text-sm font-semibold text-cult-text-primary leading-tight">{batch.strain}</p>
          <p className="text-xs text-cult-text-muted">{batch.batch_number}</p>
        </div>
        {batch.thc_percentage != null && (
          <span className="text-xs font-mono text-cult-accent shrink-0">
            {batch.thc_percentage.toFixed(1)}% THC
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-cult-text-muted">
        {harvestStr && <span>Harvested {harvestStr}</span>}
        {cureCompleteStr && batch.coa_status === 'curing' && (
          <span className="text-cult-warning">Cure done {cureCompleteStr}</span>
        )}
        {batch.days_until_available != null && batch.days_until_available > 0 && (
          <span className="ml-auto text-cult-text-muted">~{batch.days_until_available}d</span>
        )}
      </div>
    </div>
  );
}

// ─── Bucket Lane ───────────────────────────────────────────────────────────────

interface LaneProps {
  title: string;
  subtitle: string;
  batches: COATimelineBatch[];
  accentClass: string;
  icon: React.ElementType;
  emptyText?: string;
}

function Lane({ title, subtitle, batches, accentClass, icon: Icon, emptyText }: LaneProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${accentClass}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cult-text-primary">{title}</p>
          <p className="text-xs text-cult-text-muted">{subtitle}</p>
        </div>
        <span className="ml-auto text-sm font-mono text-cult-text-muted">{batches.length}</span>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {batches.length === 0 ? (
          <p className="text-xs text-cult-text-muted italic py-4 text-center">
            {emptyText ?? 'None'}
          </p>
        ) : (
          batches.map(b => <BatchCard key={b.batch_id} batch={b} />)
        )}
      </div>
    </div>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────────

export function COATimelineView() {
  const { buckets, stats, loading, error, reload } = useCOATimeline();

  const kpis = [
    { label: 'Available Now', value: String(stats.available), sub: 'Ready to sell' },
    { label: 'Coming Soon', value: String(stats.readySoon), sub: 'In testing or curing' },
    { label: 'Curing', value: String(stats.curing), sub: 'Pending cure completion' },
  ];

  if (loading) {
    return (
      <HubShell section="COA Timeline" icon={FlaskConical} kpis={[]}>
        <div className="flex items-center justify-center py-20 gap-3 text-cult-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading batch availability...</span>
        </div>
      </HubShell>
    );
  }

  if (error) {
    return (
      <HubShell section="COA Timeline" icon={FlaskConical} kpis={[]}>
        <div className="flex items-center gap-3 p-4 bg-cult-danger-muted rounded-lg text-cult-danger text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={reload} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      </HubShell>
    );
  }

  return (
    <HubShell section="COA Timeline" icon={FlaskConical} kpis={kpis}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-cult-text-muted">
          Batch availability pipeline — {stats.total} active batches tracked
        </p>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <Lane
          title="Available Now"
          subtitle="COA passed · ready to sell"
          batches={[...buckets.available, ...buckets.coa_received]}
          accentClass="border-cult-success text-cult-success"
          icon={CheckCircle2}
          emptyText="No batches available yet"
        />
        <Lane
          title="In Testing"
          subtitle="Sample submitted · results pending"
          batches={buckets.testing}
          accentClass="border-cult-info text-cult-info"
          icon={FlaskConical}
          emptyText="No batches in testing"
        />
        <Lane
          title="Curing — Ready Soon"
          subtitle="Cure complete within 7 days"
          batches={buckets.curing_soon}
          accentClass="border-cult-warning text-cult-warning"
          icon={Clock}
          emptyText="None finishing soon"
        />
        <Lane
          title="Curing"
          subtitle="Cure in progress"
          batches={buckets.curing}
          accentClass="border-cult-mid-gray text-cult-text-muted"
          icon={Clock}
        />
        {buckets.failed.length > 0 && (
          <Lane
            title="Failed"
            subtitle="COA did not pass"
            batches={buckets.failed}
            accentClass="border-cult-danger text-cult-danger"
            icon={AlertTriangle}
          />
        )}
      </div>
    </HubShell>
  );
}
