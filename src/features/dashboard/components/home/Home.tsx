import { useHomeData } from '../../hooks/useHomeData';
import { HomeHeader } from './Header';
import { Section } from './Section';
import { Cell, type CellMarker } from './Cell';
import { PendingCell } from './PendingCell';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { fmtUSD, fmtLbs, fmtPct, fmtCount, fmtDate, daysFromToday } from './format';
import './home.css';

const SEV_RANK: Record<NonNullable<CellMarker>, number> = { ok: 1, warn: 2, bad: 3 };
function rollupSeverity(...markers: (CellMarker | undefined)[]): CellMarker {
  // Section header surfaces only warn/bad — silence is good news at section level.
  let worst: CellMarker = null;
  for (const m of markers) {
    if (m !== 'warn' && m !== 'bad') continue;
    if (!worst || SEV_RANK[m] > SEV_RANK[worst]) worst = m;
  }
  return worst;
}

export function Home() {
  const d = useHomeData();

  if (d.loading) {
    return (
      <div className="home-root">
        <HomeHeader tasksDoneToday={0} tasksTotalToday={0} loadedAt={0} />
        <div className="home-loading">loading instrument · reading from supabase</div>
        <FloorPlanCanvas />
      </div>
    );
  }

  const netCoverMarker =
    d.coverage.netCoverPct >= 100 ? 'ok' : d.coverage.netCoverPct >= 80 ? 'warn' : 'bad';
  const arRiskMarker =
    d.cash.arAtRisk > 200_000 ? 'bad' : d.cash.arAtRisk > 50_000 ? 'warn' : 'ok';
  const top3Marker =
    d.fulfillment.top3Pct > 80 ? 'bad' : d.fulfillment.top3Pct > 60 ? 'warn' : null;
  const overdueMarker =
    d.pipeline.overdueCount > 5 ? 'bad' : d.pipeline.overdueCount > 0 ? 'warn' : null;
  // Snapshot ratios across stages do not give cohort retention; markers and
  // percentages are intentionally omitted here. Real retention is a drill-down
  // on /cultivation-performance backed by batch_lifecycle.
  // Median chosen over mean for the bimodal cash-COD vs net-7/14 distribution.
  // Threshold rationale: cannabis ops above 14d median lead time signals a
  // bottleneck in distribution, not a customer mix.
  const dtfMarker =
    d.fulfillment.medianDtfDays > 14 ? 'bad' : d.fulfillment.medianDtfDays > 7 ? 'warn' : null;

  const nextHarvestMarker: CellMarker = (() => {
    if (!d.pipeline.nextHarvestRoom) return null;
    const days = daysFromToday(d.pipeline.nextHarvestDate) ?? 0;
    return days < 0 ? 'bad' : days <= 3 ? 'warn' : null;
  })();
  const forwardBookMarker: CellMarker = d.pipeline.forward8to14dCount === 0 ? 'warn' : null;

  const cashSev = rollupSeverity(arRiskMarker);
  const coverageSev = rollupSeverity(netCoverMarker);
  const pipelineSev = rollupSeverity(nextHarvestMarker, forwardBookMarker, overdueMarker);
  const fulfillmentSev = rollupSeverity(overdueMarker, top3Marker, dtfMarker);
  const exceptionsSev = rollupSeverity(
    d.exceptions.roomsAttention > 0 ? 'warn' : null,
    d.exceptions.stuckSessions > 0 ? 'warn' : null,
    d.exceptions.auditFindings > 0 ? 'warn' : null,
    d.exceptions.negativeBalances > 0 ? 'bad' : null,
  );

  return (
    <div className="home-root">
      <HomeHeader
        tasksDoneToday={d.header.tasksDoneToday}
        tasksTotalToday={d.header.tasksTotalToday}
        loadedAt={d.loadedAt}
      />

      <div className="home-grid-top">
      <Section label="Revenue" cellCount={5}>
        <Cell
          label="BOOKED MTD"
          primary={fmtUSD(d.revenue.bookedMTD)}
          secondary="month-to-date"
          drillRoute="/sales-hub?focus=booked"
        />
        <Cell
          label="DELIVERED MTD"
          primary={fmtUSD(d.revenue.deliveredMTD)}
          secondary={`${fmtPct((d.revenue.deliveredMTD / Math.max(d.revenue.bookedMTD, 1)) * 100)} of booked`}
          drillRoute="/sales-hub?focus=delivered"
        />
        <PendingCell
          label="PACE"
          meta={{
            cellId: 'revenue.pace',
            cellLabel: 'Pace vs target',
            shortReason: 'no plan_targets source',
            whatItShows:
              'Percent of monthly target booked vs percent of month elapsed. Tells you if you are pacing ahead or behind plan.',
            whatsMissing:
              'A plan_targets table or business_context row holding the monthly revenue target.',
            buildPath:
              'Add a plan_targets table (month, target_revenue, target_lbs) or a business_context row that the home reads. 30-min ticket.',
            sprintRef: 'sev-5 material-to-revenue (case study 2389dfbc)',
          }}
        />
        <Cell
          label="FORECAST EOM"
          primary={fmtUSD(d.revenue.forecastEOM)}
          secondary={`${fmtUSD(d.revenue.deliveredMTD)} delivered · ${fmtUSD(d.revenue.scheduledRemaining)} scheduled`}
          projected
          drillRoute="/sales-hub?focus=forecast"
        />
        <PendingCell
          label="VARIANCE"
          meta={{
            cellId: 'revenue.variance',
            cellLabel: 'Variance to plan',
            shortReason: 'no plan_targets source',
            whatItShows: 'Dollars and percent ahead or behind monthly revenue plan.',
            whatsMissing: 'Same plan_targets source as Pace.',
            buildPath: 'Lights up automatically when Pace lights up.',
            sprintRef: 'sev-5 material-to-revenue',
          }}
        />
      </Section>

      <Section label="Cash" cellCount={5} severity={cashSev}>
        <PendingCell
          label="CASH MTD"
          meta={{
            cellId: 'cash.cash_mtd',
            cellLabel: 'Cash received MTD',
            shortReason: 'payments table empty',
            whatItShows:
              'Dollars actually received in the bank this month. The cash side of the booked-vs-delivered-vs-paid trio.',
            whatsMissing:
              'Operator entry into the payments table. Schema and v_ar_payment_history view exist; zero rows recorded yet.',
            buildPath:
              'Phase 1: small payments-entry UI in the orders module so the bookkeeper records receipts as they hit. Phase 2: bank feed.',
            sprintRef:
              'CultOps calibration blind spot 2 (financial layer); systemic pattern 4 (cash stress invisible to workers)',
          }}
        />
        <Cell
          label="AR OUTSTANDING"
          primary={fmtUSD(d.cash.arOutstanding)}
          secondary="open invoices"
          drillRoute="/sales-hub?focus=ar"
        />
        <Cell
          label="AR AT RISK"
          primary={fmtUSD(d.cash.arAtRisk)}
          secondary="outstanding > 30d"
          marker={arRiskMarker}
          drillRoute="/sales-hub?focus=ar-aging"
        />
        <Cell
          label="CASH FORECAST 14D"
          primary={fmtUSD(d.cash.cashForecast14d)}
          secondary="due in next 14 days"
          drillRoute="/sales-hub?focus=ar-aging"
        />
        <PendingCell
          label="DAYS-TO-PAY"
          meta={{
            cellId: 'cash.dso_90d',
            cellLabel: 'Days-to-pay (rolling 90d)',
            shortReason: 'needs payment data',
            whatItShows:
              'Average days from invoice issue to payment receipt over the trailing 90 days, with last-month delta.',
            whatsMissing: 'Populated payments table. Schema exists, no rows yet.',
            buildPath: 'Lights up automatically when payments entry begins.',
            sprintRef: 'systemic pattern 4 (cash stress invisible)',
          }}
        />
      </Section>

      </div>

      <Section label="Coverage" cellCount={5} severity={coverageSev}>
        <Cell
          label="SOLD NOT DELIVERED"
          primary={fmtUSD(d.coverage.soldNotDeliveredUSD)}
          secondary={`${fmtLbs(d.coverage.soldNotDeliveredLbs)} · ${fmtCount(d.coverage.soldNotDeliveredCount)} orders`}
          drillRoute="/distribution-command-center?focus=open-commitments"
        />
        <Cell
          label="READY"
          primary={fmtLbs(d.coverage.readyLbs)}
          secondary="sellable today"
          drillRoute="/inventory-all?focus=ready"
        />
        <Cell
          label="IN PROCESS 14D"
          primary={fmtLbs(d.coverage.inProcessLbs)}
          secondary="drying + bucked + trim + bulk"
          drillRoute="/inventory-all?focus=in-process"
        />
        <Cell
          label="INCOMING 14D"
          primary={fmtLbs(d.coverage.incoming14dLbs)}
          secondary={
            d.coverage.incoming14dEvents > 0
              ? `${d.coverage.incoming14dEvents} harvest${d.coverage.incoming14dEvents > 1 ? 's' : ''}${
                  d.coverage.incoming14dEstimated ? ' · est' : ''
                }`
              : 'no harvests in window'
          }
          projected={d.coverage.incoming14dEstimated}
          drillRoute="/cultivation-dashboard?focus=incoming"
        />
        <Cell
          label="NET COVER"
          primary={fmtPct(d.coverage.netCoverPct)}
          secondary={`${fmtLbs(d.coverage.readyLbs + d.coverage.inProcessLbs + d.coverage.incoming14dLbs)} supply / ${fmtLbs(d.coverage.soldNotDeliveredLbs)} need`}
          marker={netCoverMarker}
          drillRoute="/distribution-command-center?focus=cover"
        />
      </Section>

      <Section label="Facility">
        <FloorPlanCanvas />
      </Section>

      <Section label="Pipeline" cellCount={5} severity={pipelineSev}>
        <Cell
          label="NEXT HARVEST"
          primary={
            d.pipeline.nextHarvestRoom
              ? `${d.pipeline.nextHarvestRoom} · ${fmtDate(d.pipeline.nextHarvestDate)}`
              : '—'
          }
          secondary={
            d.pipeline.nextHarvestRoom
              ? (() => {
                  const days = daysFromToday(d.pipeline.nextHarvestDate) ?? 0;
                  const when =
                    days < 0
                      ? `${Math.abs(days)}d overdue`
                      : days === 0
                      ? 'today'
                      : `in ${days}d`;
                  return `${fmtLbs(d.pipeline.nextHarvestLbs)} projected · ${when}`;
                })()
              : 'no harvest scheduled'
          }
          marker={nextHarvestMarker}
          drillRoute="/cultivation-dashboard?focus=next"
        />
        <Cell
          label="THIS WEEK HARVEST"
          primary={fmtLbs(d.pipeline.thisWeekHarvestLbs)}
          secondary="projected wet"
          projected
          drillRoute="/cultivation-dashboard?focus=week"
        />
        <Cell
          label="DELIVERIES THIS WEEK"
          primary={fmtUSD(d.pipeline.next7dDeliveriesUSD)}
          secondary={`${fmtCount(d.pipeline.next7dDeliveriesCount)} orders · today through +7d`}
          drillRoute="/distribution-command-center?focus=7d"
        />
        <Cell
          label="FORWARD BOOK"
          primary={
            d.pipeline.forward8to14dCount > 0
              ? fmtUSD(d.pipeline.forward8to14dUSD)
              : '0'
          }
          secondary={
            d.pipeline.forward8to14dCount > 0
              ? `${fmtCount(d.pipeline.forward8to14dCount)} orders · 8-14d out`
              : 'no orders 8-14d out'
          }
          marker={forwardBookMarker}
          drillRoute="/distribution-command-center?focus=14d"
        />
        <Cell
          label="OVERDUE"
          primary={fmtCount(d.pipeline.overdueCount)}
          secondary={fmtUSD(d.pipeline.overdueUSD) + ' at risk'}
          marker={overdueMarker}
          drillRoute="/distribution-command-center?focus=overdue"
        />
      </Section>

      <Section label="Conversion" cellCount={4}>
        <Cell
          label="BINNED"
          primary={fmtLbs(d.conversion.binnedLbs)}
          secondary="wet-trimmed, in bins"
          drillRoute="/cultivation-performance?focus=binned"
        />
        <Cell
          label="BUCKED"
          primary={fmtLbs(d.conversion.buckedLbs)}
          secondary="ready for trim"
          drillRoute="/cultivation-performance?focus=bucked"
        />
        <Cell
          label="TRIMMED"
          primary={fmtLbs(d.conversion.trimmedLbs)}
          secondary="bulk + smalls"
          drillRoute="/cultivation-performance?focus=trimmed"
        />
        <Cell
          label="PACKAGED"
          primary={fmtLbs(d.conversion.packagedLbs)}
          secondary="jarred for retail"
          drillRoute="/cultivation-performance?focus=packaged"
        />
      </Section>

      <Section label="Fulfillment" cellCount={5} severity={fulfillmentSev}>
        <Cell
          label="OPEN ORDERS"
          primary={fmtUSD(d.fulfillment.openUSD)}
          secondary={`${fmtCount(d.fulfillment.openCount)} orders`}
          drillRoute="/orders?focus=open"
        />
        <Cell
          label="NEW 24H"
          primary={fmtCount(d.fulfillment.new24hCount)}
          secondary={fmtUSD(d.fulfillment.new24hUSD)}
          drillRoute="/orders?focus=new"
        />
        <Cell
          label="LATE / AT-RISK"
          primary={fmtCount(d.fulfillment.lateCount)}
          secondary={fmtUSD(d.fulfillment.lateUSD)}
          marker={overdueMarker}
          drillRoute="/orders?focus=late"
        />
        <Cell
          label="TOP-3 CONCENTRATION"
          primary={fmtPct(d.fulfillment.top3Pct)}
          secondary="of MTD revenue · by chain"
          marker={top3Marker}
          drillRoute="/crm-accounts-hub?focus=concentration"
        />
        <Cell
          label="DAYS-TO-FULFILL"
          primary={
            d.fulfillment.dtfSampleSize > 0
              ? d.fulfillment.medianDtfDays.toFixed(1) + ' d'
              : '—'
          }
          secondary={
            d.fulfillment.dtfSampleSize > 0
              ? `median · ${d.fulfillment.dtfSampleSize} orders, last 30d`
              : 'no realized orders in window'
          }
          marker={dtfMarker}
          drillRoute="/orders?focus=cycle-time"
        />
      </Section>

      <Section label="Exceptions" cellCount={5} severity={exceptionsSev}>
        <Cell
          label="ROOMS ATTENTION"
          primary={fmtCount(d.exceptions.roomsAttention)}
          secondary={`of ${d.exceptions.roomsTotal}`}
          marker={d.exceptions.roomsAttention > 0 ? 'warn' : null}
          drillRoute="/executive-hub?filter=attention"
        />
        <Cell
          label="STUCK SESSIONS"
          primary={fmtCount(d.exceptions.stuckSessions)}
          secondary="active, zero weight"
          marker={d.exceptions.stuckSessions > 0 ? 'warn' : null}
          drillRoute="/production-queue?filter=stuck"
        />
        <PendingCell
          label="COMPLIANCE FLAGS"
          meta={{
            cellId: 'exceptions.compliance_flags',
            cellLabel: 'Compliance flags open',
            shortReason: 'no compliance views',
            whatItShows: 'Open Metrc, COA, or audit flags requiring attention.',
            whatsMissing: 'Compliance dashboard build. No v_compliance_* views in production yet.',
            buildPath: 'Build compliance views as part of the Compliance / QA persona surface.',
            sprintRef: 'sev-4 Laura testing/compliance silo',
          }}
        />
        <Cell
          label="AUDIT FINDINGS"
          primary={fmtCount(d.exceptions.auditFindings)}
          secondary="open"
          marker={d.exceptions.auditFindings > 0 ? 'warn' : null}
          drillRoute="/inventory-audits?filter=open"
        />
        <Cell
          label="NEGATIVE BALANCES"
          primary={fmtCount(d.exceptions.negativeBalances)}
          secondary="data integrity"
          marker={d.exceptions.negativeBalances > 0 ? 'bad' : null}
          drillRoute="/inventory-all?filter=negative"
        />
      </Section>
    </div>
  );
}
