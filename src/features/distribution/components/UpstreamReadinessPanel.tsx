/**
 * UpstreamReadinessPanel — C Hybrid (gapped outer, hairline interior).
 * Shows batches that are upstream of distribution (curing, pending
 * sampling, in testing) and their landing window.
 *
 * Three row states:
 *   landing → 2px-left --accent rule, ready label in --accent
 *   normal  → no rule
 *   stuck   → 2px-left --status-warn rule, ready label in --status-warn
 *
 * Visible at most 5 cohorts; "and N more" link if more exist.
 */

import { useUpstreamReadiness, type UpstreamCohort } from '../hooks/useUpstreamReadiness';

function readyLabel(c: UpstreamCohort): string {
  if (c.daysToReady < 0) return `+${Math.abs(c.daysToReady)} day${Math.abs(c.daysToReady) !== 1 ? 's' : ''}`;
  if (c.daysToReady === 0) return 'today';
  if (c.daysToReady === 1) return 'tomorrow';
  return `${c.daysToReady} days`;
}

function readyMeta(c: UpstreamCohort): string {
  if (c.state === 'stuck') return 'over expected';
  if (c.coaStatus === 'curing') return 'to packaging';
  if (c.coaStatus === 'pending_sampling') return 'to sampling';
  if (c.coaStatus === 'testing_in_progress') return 'in testing';
  return 'to ready';
}

function stageLabel(c: UpstreamCohort): string {
  if (c.coaStatus === 'curing') return 'Cure';
  if (c.coaStatus === 'pending_sampling') return 'Sampling';
  if (c.coaStatus === 'testing_in_progress') return 'Testing';
  return 'Upstream';
}

function stageDotColor(stage: UpstreamCohort['stage']): string {
  if (stage === 'cure') return 'var(--stage-cure)';
  if (stage === 'harvest') return 'var(--stage-harvest)';
  return 'var(--stage-package)';
}

export function UpstreamReadinessPanel() {
  const { cohorts, overflowCount, landingCount, stuckCount, loading } = useUpstreamReadiness();

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--op-surface)',
          border: '1px solid var(--op-line)',
          borderRadius: 'var(--r-md)',
          padding: '12px 14px',
          fontSize: 11,
          color: 'var(--op-ink-3)',
        }}
        className="font-mono uppercase"
      >
        <span style={{ letterSpacing: '0.16em', fontSize: 9 }}>Upstream readiness · 7d</span>
      </div>
    );
  }

  const headMeta = cohorts.length === 0
    ? 'no cohorts'
    : `${landingCount} landing${stuckCount > 0 ? ` · ${stuckCount} stuck` : ''}`;

  return (
    <div
      style={{
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
      }}
    >
      {/* Panel head */}
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '12px 14px 10px' }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink-3)' }}
        >
          Upstream readiness · 7d
        </span>
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 10,
            color: stuckCount > 0 ? 'var(--status-warn)' : 'var(--op-ink-3)',
          }}
        >
          {headMeta}
        </span>
      </div>

      {cohorts.length === 0 ? (
        <div
          className="text-center"
          style={{
            padding: 14,
            fontSize: 11,
            color: 'var(--op-ink-3)',
            borderTop: '1px solid var(--op-line)',
          }}
        >
          No cohorts in window
        </div>
      ) : (
        cohorts.map((c, i) => {
          const isLast = i === cohorts.length - 1 && overflowCount === 0;
          const stateShadow =
            c.state === 'stuck'
              ? 'inset 2px 0 0 var(--status-warn)'
              : c.state === 'landing'
              ? 'inset 2px 0 0 var(--accent)'
              : undefined;
          const readyColor =
            c.state === 'stuck'
              ? 'var(--status-warn)'
              : c.state === 'landing'
              ? 'var(--accent)'
              : 'var(--op-ink)';
          const readyMetaColor =
            c.state === 'stuck' ? 'var(--status-warn)' : 'var(--op-ink-3)';

          return (
            <div
              key={c.batchId}
              style={{
                padding: '10px 14px',
                borderBottom: isLast ? 'none' : '1px solid var(--op-line)',
                borderTop: i === 0 ? '1px solid var(--op-line)' : undefined,
                boxShadow: stateShadow,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: stageDotColor(c.stage),
                  flexShrink: 0,
                }}
              />

              <div className="min-w-0">
                <div
                  className="font-mono tabular-nums truncate"
                  style={{ fontSize: 11, color: 'var(--op-ink)' }}
                >
                  {c.roomCode} · {c.batchNumber}
                </div>
                <div
                  className="font-sans truncate"
                  style={{ fontSize: 11, color: 'var(--op-ink-2)' }}
                >
                  {stageLabel(c)} · {c.strainName}
                  {c.weightLbs ? ` · ${c.weightLbs} lb` : ''}
                </div>
              </div>

              <div
                className="font-mono tabular-nums text-right"
                style={{ fontSize: 11, color: readyColor }}
              >
                {readyLabel(c)}
              </div>
              <div
                className="font-mono uppercase text-right"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: readyMetaColor,
                }}
              >
                {readyMeta(c)}
              </div>
            </div>
          );
        })
      )}

      {overflowCount > 0 && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--op-line)',
            fontSize: 10,
            color: 'var(--op-ink-3)',
            letterSpacing: '0.04em',
          }}
          className="font-mono"
        >
          and {overflowCount} more
        </div>
      )}
    </div>
  );
}
