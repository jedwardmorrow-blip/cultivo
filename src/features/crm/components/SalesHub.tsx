import { useEffect, useState, useMemo } from 'react';
import { DollarSign, ShoppingCart, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HubShell } from '@/features/hub/components/HubShell';
import { RevenuePipeline } from '@/features/production-queue/components/RevenuePipeline';
import { useRevenuePipeline } from '@/features/production-queue/hooks/useRevenuePipeline';
import { formatCurrencyShort, formatWeight, todayIso } from '@/shared/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ATPRow {
  strain: string;
  stage: string;
  onHand: number;
  reserved: number;
  atp: number;
}

interface OrderStatusCount {
  status: string;
  count: number;
  value: number;
}

// ─── Funnel config ───────────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { statuses: ['draft', 'submitted', 'confirmed'], label: 'New', color: 'bg-slate-600', textColor: 'text-slate-300' },
  { statuses: ['allocated'],                       label: 'Allocated', color: 'bg-violet-600', textColor: 'text-violet-300' },
  { statuses: ['processing'],                      label: 'Processing', color: 'bg-sky-600', textColor: 'text-sky-300' },
  { statuses: ['ready_for_delivery'],              label: 'Ready', color: 'bg-cyan-500', textColor: 'text-cyan-300' },
  { statuses: ['delivered', 'completed'],          label: 'Shipped', color: 'bg-cult-success', textColor: 'text-cult-success' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ATPInventoryTable({ rows, loading }: { rows: ATPRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }
  if (!rows.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No available-to-sell inventory.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-cult-charcoal/60">
            <th className="text-left text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Strain</th>
            <th className="text-left text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Format</th>
            <th className="text-right text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">On Hand</th>
            <th className="text-right text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Allocated</th>
            <th className="text-right text-cult-text-muted pb-2 font-medium uppercase tracking-wider text-[10px]">ATP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.strain}-${row.stage}-${i}`} className="border-b border-cult-charcoal/30 last:border-b-0">
              <td className="py-2 pr-3 text-cult-off-white font-medium truncate max-w-[120px]">{row.strain}</td>
              <td className="py-2 pr-3 text-cult-text-muted truncate max-w-[100px]">{row.stage}</td>
              <td className="py-2 pr-3 text-right text-cult-text-muted tabular-nums">{formatWeight(row.onHand)}</td>
              <td className="py-2 pr-3 text-right text-cult-warning/80 tabular-nums">{formatWeight(row.reserved)}</td>
              <td className="py-2 text-right tabular-nums">
                <span className={`font-semibold ${row.atp > 0 ? 'text-cult-success' : 'text-cult-danger'}`}>
                  {formatWeight(Math.max(0, row.atp))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderStatusFunnel({ counts, loading }: { counts: OrderStatusCount[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse flex gap-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 flex-1 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }

  const statusMap = new Map<string, { count: number; value: number }>();
  counts.forEach(c => statusMap.set(c.status, { count: c.count, value: c.value }));

  const funnelData = FUNNEL_STAGES.map(stage => {
    let count = 0, value = 0;
    stage.statuses.forEach(s => {
      const row = statusMap.get(s);
      if (row) { count += row.count; value += row.value; }
    });
    return { ...stage, count, value };
  });

  const maxCount = Math.max(...funnelData.map(f => f.count), 1);

  return (
    <div className="flex items-end gap-2">
      {funnelData.map((stage, i) => (
        <div key={stage.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-center">
            <span className={`text-[11px] font-semibold ${stage.textColor}`}>{stage.count}</span>
            {stage.value > 0 && (
              <div className="text-[10px] text-cult-text-faint">{formatCurrencyShort(stage.value)}</div>
            )}
          </div>
          <div
            className={`w-full rounded-t-sm ${stage.color} transition-all duration-300`}
            style={{ height: `${Math.max(4, Math.round((stage.count / maxCount) * 48))}px`, opacity: stage.count ? 1 : 0.3 }}
          />
          <div className="flex items-center gap-1">
            {i > 0 && <span className="text-cult-text-faint text-[10px]">›</span>}
            <span className="text-[10px] text-cult-text-muted text-center">{stage.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StrainRunwayBars({ atpRows, orders30d, loading }: {
  atpRows: ATPRow[];
  orders30d: { strain: string; qty: number }[];
  loading: boolean;
}) {
  const runwayData = useMemo(() => {
    // Group ATP by strain
    const atpByStrain = new Map<string, number>();
    atpRows.forEach(r => {
      atpByStrain.set(r.strain, (atpByStrain.get(r.strain) ?? 0) + Math.max(0, r.atp));
    });

    // Group 30d order qty by strain → weekly avg = total / 4
    const velocityByStrain = new Map<string, number>();
    orders30d.forEach(o => {
      velocityByStrain.set(o.strain, (velocityByStrain.get(o.strain) ?? 0) + o.qty);
    });

    return Array.from(atpByStrain.entries())
      .map(([strain, atp]) => {
        const total30d = velocityByStrain.get(strain) ?? 0;
        const weeklyVelocity = total30d / 4;
        const runwayDays = weeklyVelocity > 0 ? Math.round((atp / weeklyVelocity) * 7) : null;
        return { strain, atp, weeklyVelocity, runwayDays };
      })
      .filter(d => d.atp > 0)
      .sort((a, b) => b.atp - a.atp)
      .slice(0, 5);
  }, [atpRows, orders30d]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-6 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }
  if (!runwayData.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No ATP data for runway calculation.</p>;
  }

  return (
    <div className="space-y-3">
      {runwayData.map(d => {
        const days = d.runwayDays;
        const chipClass = days == null
          ? 'bg-slate-700/50 text-slate-400'
          : days >= 14 ? 'bg-cult-success-muted text-cult-success border border-cult-success/30'
          : days >= 7  ? 'bg-cult-warning-muted text-cult-warning border border-cult-warning/30'
          :              'bg-cult-danger-muted text-cult-danger border border-cult-danger/30';

        return (
          <div key={d.strain} className="flex items-center gap-3">
            <span className="text-[12px] text-cult-off-white w-28 flex-shrink-0 truncate">{d.strain}</span>
            <div className="flex-1 bg-cult-charcoal/40 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  days == null || days >= 14 ? 'bg-cult-success' : days >= 7 ? 'bg-cult-warning' : 'bg-cult-danger'
                }`}
                style={{ width: `${Math.min(100, ((days ?? 0) / 30) * 100)}%` }}
              />
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${chipClass}`}>
              {days != null ? `${days}d` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SalesHub() {
  const {
    pipeline,
    weekOutlook,
    weekOffset,
    setWeekOffset,
    selectedWeekLabel,
    selectedWeekRange,
    loading: revenueLoading,
  } = useRevenuePipeline();

  const [atpRows, setAtpRows] = useState<ATPRow[]>([]);
  const [atpLoading, setAtpLoading] = useState(true);

  const [orderCounts, setOrderCounts] = useState<OrderStatusCount[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersShippingToday, setOrdersShippingToday] = useState(0);
  const [openOrderCount, setOpenOrderCount] = useState(0);
  const [openOrderValue, setOpenOrderValue] = useState(0);

  const [orders30d, setOrders30d] = useState<{ strain: string; qty: number }[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadATP() {
      setAtpLoading(true);
      const { data } = await supabase
        .from('v_atp')
        .select('strain, stage_name, on_hand_qty, reserved_qty, atp_qty')
        .not('strain', 'is', null)
        .gt('on_hand_qty', 0);

      if (!mounted) return;

      if (data) {
        // Group by strain + stage
        const grouped = new Map<string, ATPRow>();
        for (const row of data) {
          const key = `${row.strain}::${row.stage_name ?? '—'}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.onHand += row.on_hand_qty ?? 0;
            existing.reserved += row.reserved_qty ?? 0;
            existing.atp += row.atp_qty ?? 0;
          } else {
            grouped.set(key, {
              strain: row.strain ?? 'Unknown',
              stage: row.stage_name ?? '—',
              onHand: row.on_hand_qty ?? 0,
              reserved: row.reserved_qty ?? 0,
              atp: row.atp_qty ?? 0,
            });
          }
        }
        setAtpRows(Array.from(grouped.values()).sort((a, b) => b.atp - a.atp));
      }
      setAtpLoading(false);
    }
    loadATP();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const today = todayIso();

    async function loadOrders() {
      setOrdersLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, status, total_amount, scheduled_delivery_date, requested_delivery_date')
        .eq('archived', false)
        .eq('test_mode', false)
        .neq('status', 'cancelled');

      if (!mounted) return;

      if (data) {
        const statusMap = new Map<string, OrderStatusCount>();
        let shippingToday = 0;
        let openCount = 0;
        let openVal = 0;

        const closedStatuses = new Set(['delivered', 'completed']);

        data.forEach((o: any) => {
          const s = o.status as string;
          const val = o.total_amount ?? 0;
          const effectiveDate = o.scheduled_delivery_date ?? o.requested_delivery_date;

          if (!closedStatuses.has(s)) {
            openCount++;
            openVal += val;
          }
          if (effectiveDate === today && !closedStatuses.has(s)) shippingToday++;

          const existing = statusMap.get(s);
          if (existing) {
            existing.count++;
            existing.value += val;
          } else {
            statusMap.set(s, { status: s, count: 1, value: val });
          }
        });

        setOrderCounts(Array.from(statusMap.values()));
        setOrdersShippingToday(shippingToday);
        setOpenOrderCount(openCount);
        setOpenOrderValue(openVal);
      }
      setOrdersLoading(false);
    }

    async function load30dOrders() {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('order_items')
        .select('strain, quantity')
        .gte('created_at', since);

      if (!mounted) return;

      if (data) {
        setOrders30d(
          (data as { strain: string | null; quantity: number | null }[])
            .filter(d => d.strain)
            .map(d => ({ strain: d.strain!, qty: d.quantity ?? 0 }))
        );
      }
    }

    loadOrders();
    load30dOrders();
    return () => { mounted = false; };
  }, []);

  const kpis = [
    { label: 'Open Orders', value: ordersLoading ? '—' : String(openOrderCount) },
    { label: 'Order Value Pipeline', value: ordersLoading ? '—' : formatCurrencyShort(openOrderValue) },
    { label: 'Shipping Today', value: ordersLoading ? '—' : String(ordersShippingToday) },
  ];

  return (
    <HubShell section="Sales" icon={DollarSign} kpis={kpis}>
      <div className="space-y-6">

        {/* ATP Inventory Table */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Available to Sell (ATP)
          </h2>
          <ATPInventoryTable rows={atpRows} loading={atpLoading} />
        </div>

        {/* Order Status Funnel */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Order Status Funnel
          </h2>
          <OrderStatusFunnel counts={orderCounts} loading={ordersLoading} />
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

        {/* Strain Runway Bars */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider">
            Strain Runway (ATP ÷ Avg Weekly Velocity)
          </h2>
          <p className="text-[11px] text-cult-text-faint mb-3">Days of supply based on last 30d order velocity. Green ≥14d · Amber ≥7d · Red &lt;7d</p>
          <StrainRunwayBars atpRows={atpRows} orders30d={orders30d} loading={atpLoading || ordersLoading} />
        </div>

      </div>
    </HubShell>
  );
}
