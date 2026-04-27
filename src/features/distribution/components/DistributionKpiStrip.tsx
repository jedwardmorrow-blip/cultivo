/**
 * DistributionKpiStrip — A Hairline grid (5 KPI tiles divided by 1px
 * --op-line hairlines, single rounded outer container).
 *
 * Per the working-instrument doctrine, KPIs lean toward absence: no fills,
 * no shadows, no glow. Active state is a 2px-left --accent rule (not a
 * background fill). Bad-status values switch to --status-bad ink only.
 */

import { formatCurrencyShort } from '@/shared/utils/format';

interface DistributionKpiStripProps {
  shippingToday: number;
  docsPending: number;
  docsOverdue: number;
  unscheduledCount: number;
  monthRevenue: number;
  todayZones: Set<string>;
  docFilterActive: boolean;
  shippingTodayActive?: boolean;
  onShippingTodayClick: () => void;
  onDocsPendingClick: () => void;
  onUnscheduledClick: () => void;
}

interface KpiTileProps {
  label: string;
  value: string;
  meta: string;
  active?: boolean;
  badValue?: boolean;
  badMeta?: boolean;
  onClick?: () => void;
}

function KpiTile({ label, value, meta, active, badValue, badMeta, onClick }: KpiTileProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      style={{
        background: 'var(--op-canvas)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        textAlign: 'left',
        boxShadow: active ? 'inset 2px 0 0 var(--accent)' : undefined,
        cursor: onClick ? 'pointer' : 'default',
        border: 'none',
        width: '100%',
        font: 'inherit',
      }}
    >
      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--op-ink-3)' }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular-nums"
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: badValue ? 'var(--status-bad)' : 'var(--op-ink)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span
        className="font-sans"
        style={{ fontSize: 11, color: badMeta ? 'var(--status-bad)' : 'var(--op-ink-3)' }}
      >
        {meta}
      </span>
    </Wrapper>
  );
}

export function DistributionKpiStrip({
  shippingToday,
  docsPending,
  docsOverdue,
  unscheduledCount,
  monthRevenue,
  todayZones,
  docFilterActive,
  shippingTodayActive,
  onShippingTodayClick,
  onDocsPendingClick,
  onUnscheduledClick,
}: DistributionKpiStripProps) {
  const docsBad = docsOverdue > 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 1,
        background: 'var(--op-line)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <KpiTile
        label="Shipping today"
        value={String(shippingToday)}
        meta={
          shippingToday === 0
            ? 'none scheduled'
            : `${todayZones.size} zone${todayZones.size !== 1 ? 's' : ''}`
        }
        active={shippingTodayActive}
        onClick={onShippingTodayClick}
      />
      <KpiTile
        label="Docs pending"
        value={String(docsPending)}
        meta={docsOverdue > 0 ? `${docsOverdue} overdue` : 'none overdue'}
        active={docFilterActive}
        badValue={docsBad}
        badMeta={docsBad}
        onClick={onDocsPendingClick}
      />
      <KpiTile
        label="Unscheduled"
        value={String(unscheduledCount)}
        meta={unscheduledCount === 0 ? 'all scheduled' : 'unrouted'}
        onClick={onUnscheduledClick}
      />
      <KpiTile
        label="Month revenue"
        value={formatCurrencyShort(monthRevenue)}
        meta="month-to-date"
      />
      <KpiTile
        label="Routes today"
        value={String(todayZones.size)}
        meta={
          todayZones.size === 0
            ? 'none active'
            : Array.from(todayZones).slice(0, 2).join(' · ').replace(/_/g, '-')
        }
        onClick={onShippingTodayClick}
      />
    </div>
  );
}
