import { PraxisAtom } from '@/features/auth/components/praxis-atom/PraxisAtom';
import type { HomeData } from '../../hooks/useHomeData';
import { fmtUSD, fmtLbs, fmtPct, fmtCount } from './format';

/**
 * V4 Bureau Tier 2 instrument header for the COO dashboard.
 *
 * Replaces the legacy HomeHeader. Renders three Bureau-tier elements:
 *
 *  1. Top serial plate — FIG. 00 · DASHBOARD · COO · CULT CANNABIS left,
 *     PraxisAtom + SYSTEM LIVE · time right.
 *
 *  2. Page header row — meta line (persona · day-of-week, date), Big
 *     Shoulders DASHBOARD title, bv4-tagline KPI strip pulling the most
 *     scan-worthy hero numerics from useHomeData (BOOKED MTD, COVER PCT,
 *     LATE COUNT, AR-AT-RISK).
 *
 *  3. Status pill block on the right — counts of bad / warn rollups
 *     across cashSev / pipelineSev / fulfillmentSev / exceptionsSev,
 *     plus updated timestamp.
 *
 * No new data — everything pulled from HomeData. The point is to put the
 * day's primary fact in the top ~200px so the COO doesn't scroll for it.
 */

type RollupSev = 'ok' | 'warn' | 'bad' | null;

interface Props {
  data: HomeData;
  cashSev: RollupSev;
  pipelineSev: RollupSev;
  fulfillmentSev: RollupSev;
  exceptionsSev: RollupSev;
}

function fmtTime(epoch: number): string {
  if (!epoch) return '—';
  const d = new Date(epoch);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDateMeta(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function fmtRelative(loadedAt: number): string {
  if (!loadedAt) return 'NO DATA';
  const ageMin = Math.max(0, Math.floor((Date.now() - loadedAt) / 60_000));
  if (ageMin < 1) return 'JUST NOW';
  if (ageMin < 60) return `UPDATED ${ageMin} MIN AGO`;
  const ageH = Math.floor(ageMin / 60);
  return `UPDATED ${ageH}H AGO`;
}

export function DashboardBureauHeader({ data, cashSev, pipelineSev, fulfillmentSev, exceptionsSev }: Props) {
  const sevList = [cashSev, pipelineSev, fulfillmentSev, exceptionsSev];
  const badCount = sevList.filter((s) => s === 'bad').length;
  const warnCount = sevList.filter((s) => s === 'warn').length;

  return (
    <>
      <div className="bv4-plate">
        <div className="stamp">
          <span className="serial">FIG. 00</span>
          <span className="sep">·</span>
          <span>DASHBOARD</span>
          <span className="sep">·</span>
          <span>COO</span>
          <span className="sep">·</span>
          <span>CULT CANNABIS</span>
        </div>
        <div className="stamp" style={{ gap: 8 }}>
          <PraxisAtom size={18} ariaLabel="System live" />
          <span>SYSTEM LIVE · {fmtTime(Date.now())}</span>
        </div>
      </div>

      <div className="bv4-page-header">
        <div className="left">
          <div className="meta">
            <span className="lead">COO · COMMAND CENTER</span>
            <span className="sep">·</span>
            <span>{fmtDateMeta()}</span>
            {data.header.tasksTotalToday > 0 && (
              <>
                <span className="sep">·</span>
                <span>
                  TASKS <strong style={{ color: 'var(--pv4-paper)' }}>{data.header.tasksDoneToday}/{data.header.tasksTotalToday}</strong> TODAY
                </span>
              </>
            )}
          </div>

          <div className="bv4-tagline">
            <span className="pair">
              <span className="bv4-num-lead">{fmtUSD(data.revenue.bookedMTD)}</span>
              <span className="bv4-num-unit">BOOKED MTD</span>
            </span>
            <span className="pair">
              <span className="bv4-num-lead">{fmtUSD(data.revenue.deliveredMTD)}</span>
              <span className="bv4-num-unit">DELIVERED</span>
            </span>
            <span className="pair">
              <span className="bv4-num-lead">{fmtPct(data.coverage.netCoverPct)}</span>
              <span className="bv4-num-unit">COVER</span>
            </span>
            <span className="pair">
              <span className="bv4-num-lead">{fmtUSD(data.cash.arAtRisk)}</span>
              <span className="bv4-num-unit">AR AT RISK</span>
            </span>
            <span className="pair">
              <span className="bv4-num-lead">{fmtCount(data.fulfillment.lateCount)}</span>
              <span className="bv4-num-unit">LATE</span>
            </span>
            <span className="pair">
              <span className="bv4-num-lead">{fmtLbs(data.coverage.readyLbs)}</span>
              <span className="bv4-num-unit">READY</span>
            </span>
          </div>
        </div>

        <div className="bv4-status-pills">
          {badCount > 0 && <div><strong className="bad">{badCount}</strong> BAD</div>}
          {warnCount > 0 && <div><strong className="warn">{warnCount}</strong> WARN</div>}
          {badCount === 0 && warnCount === 0 && <div>ALL CLEAR</div>}
          <div>{fmtRelative(data.loadedAt)}</div>
        </div>
      </div>
    </>
  );
}
