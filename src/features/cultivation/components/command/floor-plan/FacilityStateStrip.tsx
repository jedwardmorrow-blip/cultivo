import { useMemo } from 'react';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import type { FacilityRoom } from './data';
import { Sparkline } from './Sparkline';

interface Props {
  /** Live-merged rooms from useFloorPlanData (already includes urgency_score). */
  rooms?: FacilityRoom[];
}

const fmtUSD = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
    : `$${Math.round(n)}`;

const fmtLbs = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(2)}k` : Math.round(n).toLocaleString();

function useElapsedString(since: Date | null): string {
  if (!since) return '';
  const diffSec = Math.floor((Date.now() - since.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

const STALE_AFTER_MS = 5 * 60 * 1000;

export function FacilityStateStrip({ rooms = [] }: Props) {
  const { data, loading, lastUpdated, refresh } = useDashboardData();
  const elapsed = useElapsedString(lastUpdated);
  const isStale = !!lastUpdated && (Date.now() - lastUpdated.getTime() > STALE_AFTER_MS);
  const now = new Date();
  const stamp = now.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Factual counts. No urgency_score-driven editorialization here either —
  // every bucket is grounded in a hard time-domain fact.
  const counts = useMemo(() => {
    const inCycle = rooms.filter(
      (r) => r.inCycle && (r.total_plants ?? 0) > 0
    );
    const overdue = inCycle
      .filter((r) => {
        const d = (r as FacilityRoom & { section_days_to_harvest?: number | null })
          .section_days_to_harvest;
        return typeof d === 'number' && d < 0;
      })
      .map((r) => r.code);
    const imminent = inCycle
      .filter((r) => {
        const d = (r as FacilityRoom & { section_days_to_harvest?: number | null })
          .section_days_to_harvest;
        return typeof d === 'number' && d >= 0 && d <= 7;
      })
      .map((r) => r.code);
    return { overdue, imminent, inCycleCount: inCycle.length };
  }, [rooms]);

  const kpi = data?.kpi;

  return (
    <div className="fpl-state">
      {/* TIME · LIVE indicator (smaller — confirms freshness, not primary glance) */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">
          <span className="fpl-state-pulse" />LIVE
        </div>
        <div className="fpl-state-val sm">{stamp}</div>
        <div className="fpl-state-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {loading ? 'syncing…' : elapsed ? `synced ${elapsed}` : 'synced'}
          <button
            type="button"
            className={`fpl-state-refresh${isStale ? ' is-stale' : ''}`}
            onClick={() => refresh()}
            title={isStale ? 'Data is stale — refresh now' : 'Refresh dashboard data'}
          >
            ↻ refresh
          </button>
        </div>
      </div>

      {/* REVENUE MTD (lg — primary KPI glance) with sparkline + prior-MTD delta */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">REVENUE MTD</div>
        <div className="fpl-state-val lg">
          {kpi ? fmtUSD(kpi.revenueMTD) : '—'}
        </div>
        <div className="fpl-state-sub" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {kpi ? (
            <>
              <span>{kpi.mtdOrders} orders · {kpi.mtdCustomers} customers</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkline
                  values={(data?.weeklyRevenue ?? []).map((w) => w.revenue)}
                  width={84}
                  height={14}
                />
                {kpi.revenueMTDPrior > 0 && (() => {
                  const delta = ((kpi.revenueMTD - kpi.revenueMTDPrior) / kpi.revenueMTDPrior) * 100;
                  const sign = delta >= 0 ? '+' : '';
                  const color =
                    delta >= 5 ? 'var(--status-ok)'
                    : delta <= -5 ? 'var(--status-bad)'
                    : 'var(--op-ink-3)';
                  return (
                    <span style={{ color, fontWeight: 500 }}>
                      {sign}{delta.toFixed(0)}% vs prior MTD
                    </span>
                  );
                })()}
              </span>
            </>
          ) : '—'}
        </div>
      </div>

      {/* OPEN PIPELINE (lg — primary KPI glance) */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">OPEN PIPELINE</div>
        <div className="fpl-state-val lg">
          {kpi ? fmtUSD(kpi.openPipeline) : '—'}
        </div>
        <div className="fpl-state-sub">
          {kpi ? `${kpi.openOrderCount} active orders` : '—'}
        </div>
      </div>

      {/* INVENTORY IN PROCESS */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">INVENTORY IN PROCESS</div>
        <div className="fpl-state-val">
          {kpi ? fmtLbs(kpi.inventoryInProcessLbs) : '—'}<span className="unit">lbs</span>
        </div>
        <div className="fpl-state-sub">
          {kpi ? `→ ${fmtLbs(kpi.finishedEquivLbs)} lbs finished est` : '—'}
        </div>
      </div>

      {/* PACKAGED & READY */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">PACKAGED · READY</div>
        <div className="fpl-state-val">
          {kpi ? fmtLbs(kpi.packagedLbs) : '—'}<span className="unit">lbs</span>
        </div>
        <div className="fpl-state-sub">ready to ship</div>
      </div>

      {/* HARVEST INCOMING */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">HARVEST INCOMING · 60D</div>
        <div className="fpl-state-val">
          {kpi ? fmtLbs(kpi.harvestIncomingLbs) : '—'}<span className="unit">lbs</span>
        </div>
        <div className="fpl-state-sub">
          {kpi ? `${kpi.harvestWindows} window${kpi.harvestWindows === 1 ? '' : 's'}` : '—'}
        </div>
      </div>

      {/* HARVEST STATUS · purely factual time-domain counts (no urgency_score) */}
      <div className="fpl-state-cell">
        <div className="fpl-state-eyebrow">HARVEST STATUS</div>
        <div className="fpl-alerts-stack">
          <div className={`fpl-alerts-line${counts.overdue.length > 0 ? ' urgent' : ''}`}>
            <span className="dot" style={{ background: 'var(--status-bad)' }} />
            <strong>{counts.overdue.length}</strong>
            {counts.overdue.length > 0
              ? ' overdue · ' + counts.overdue.slice(0, 3).join(', ') + (counts.overdue.length > 3 ? '…' : '')
              : ' overdue'}
          </div>
          <div className="fpl-alerts-line">
            <span className="dot" style={{ background: 'var(--status-warn)' }} />
            <strong>{counts.imminent.length}</strong>
            {counts.imminent.length > 0
              ? ' this week · ' + counts.imminent.slice(0, 3).join(', ') + (counts.imminent.length > 3 ? '…' : '')
              : ' this week'}
          </div>
          <div className="fpl-alerts-line">
            <span className="dot" style={{ background: 'var(--accent)' }} />
            <strong>{counts.inCycleCount}</strong> rooms in cycle
          </div>
        </div>
      </div>
    </div>
  );
}
