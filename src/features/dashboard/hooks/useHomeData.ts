import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const G_PER_LB = 453.592;
const gToLbs = (g: number) => g / G_PER_LB;

export interface HomeData {
  loading: boolean;
  error: string | null;
  loadedAt: number; // epoch ms of last successful load, 0 if never
  header: {
    tasksDoneToday: number;
    tasksTotalToday: number;
  };
  revenue: {
    bookedMTD: number;
    deliveredMTD: number;
    forecastEOM: number;
    scheduledRemaining: number; // forecastEOM - deliveredMTD, the still-to-land piece
  };
  cash: {
    arOutstanding: number;
    arAtRisk: number;
    cashForecast14d: number;
  };
  coverage: {
    soldNotDeliveredUSD: number;
    soldNotDeliveredCount: number;
    soldNotDeliveredLbs: number;
    readyLbs: number;
    inProcessLbs: number;
    incoming14dLbs: number;
    incoming14dEvents: number;
    incoming14dEstimated: boolean; // true when fallback projection used
    netCoverPct: number;
  };
  pipeline: {
    nextHarvestRoom: string | null;
    nextHarvestDate: string | null;
    nextHarvestLbs: number;
    thisWeekHarvestLbs: number;
    next7dDeliveriesUSD: number;
    next7dDeliveriesCount: number;
    forward8to14dUSD: number;
    forward8to14dCount: number;
    overdueCount: number;
    overdueUSD: number;
  };
  conversion: {
    binnedLbs: number;
    buckedLbs: number;
    trimmedLbs: number;
    packagedLbs: number;
    binToBuckPct: number;
    buckToTrimPct: number;
    trimToPkgPct: number;
  };
  fulfillment: {
    openUSD: number;
    openCount: number;
    new24hCount: number;
    new24hUSD: number;
    lateCount: number;
    lateUSD: number;
    top3Pct: number;
    medianDtfDays: number;
    dtfSampleSize: number;
  };
  exceptions: {
    roomsAttention: number;
    roomsTotal: number;
    stuckSessions: number;
    auditFindings: number;
    negativeBalances: number;
  };
  /**
   * 30-day spark arrays keyed by home_cell_manifest_v1 cell_id. Mixed source:
   * three cells (revenue.booked_mtd, revenue.delivered_mtd, fulfillment.new_24h_count)
   * derive directly from orders + v_order_revenue_base for accuracy. Everything
   * else reads from home_metric_snapshot via cell_spark_batch (populated daily
   * by fn_capture_home_metric_snapshot at 06:00 AZ via pg_cron). Cells with
   * fewer than the requested days will return shorter arrays; Sparkline handles
   * 1..30 lengths gracefully.
   */
  sparks: Record<string, number[]>;
}

const EMPTY: HomeData = {
  loading: true,
  error: null,
  loadedAt: 0,
  header: { tasksDoneToday: 0, tasksTotalToday: 0 },
  revenue: { bookedMTD: 0, deliveredMTD: 0, forecastEOM: 0, scheduledRemaining: 0 },
  cash: { arOutstanding: 0, arAtRisk: 0, cashForecast14d: 0 },
  coverage: {
    soldNotDeliveredUSD: 0,
    soldNotDeliveredCount: 0,
    soldNotDeliveredLbs: 0,
    readyLbs: 0,
    inProcessLbs: 0,
    incoming14dLbs: 0,
    incoming14dEvents: 0,
    incoming14dEstimated: false,
    netCoverPct: 0,
  },
  pipeline: {
    nextHarvestRoom: null,
    nextHarvestDate: null,
    nextHarvestLbs: 0,
    thisWeekHarvestLbs: 0,
    next7dDeliveriesUSD: 0,
    next7dDeliveriesCount: 0,
    forward8to14dUSD: 0,
    forward8to14dCount: 0,
    overdueCount: 0,
    overdueUSD: 0,
  },
  conversion: {
    binnedLbs: 0,
    buckedLbs: 0,
    trimmedLbs: 0,
    packagedLbs: 0,
    binToBuckPct: 0,
    buckToTrimPct: 0,
    trimToPkgPct: 0,
  },
  fulfillment: {
    openUSD: 0,
    openCount: 0,
    new24hCount: 0,
    new24hUSD: 0,
    lateCount: 0,
    lateUSD: 0,
    top3Pct: 0,
    medianDtfDays: 0,
    dtfSampleSize: 0,
  },
  exceptions: {
    roomsAttention: 0,
    roomsTotal: 0,
    stuckSessions: 0,
    auditFindings: 0,
    negativeBalances: 0,
  },
  sparks: {},
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}
function endOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + 6;
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

/**
 * Bucket rows into N daily totals, oldest-first. Used to feed the home's
 * 30d sparklines. Only call with date strings or Date-parseable values; null
 * dates contribute nothing.
 */
function bucketByDay<T>(
  rows: T[],
  getDate: (r: T) => string | null | undefined,
  getValue: (r: T) => number,
  days: number
): number[] {
  const buckets = new Array(days).fill(0) as number[];
  const startMs = Date.now() - (days - 1) * 86_400_000;
  const startDay = Math.floor(startMs / 86_400_000);
  for (const r of rows) {
    const ds = getDate(r);
    if (!ds) continue;
    const t = new Date(ds).getTime();
    if (Number.isNaN(t)) continue;
    const day = Math.floor(t / 86_400_000);
    const idx = day - startDay;
    if (idx < 0 || idx >= days) continue;
    buckets[idx] += getValue(r);
  }
  return buckets;
}

export function useHomeData(): HomeData {
  const [data, setData] = useState<HomeData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const today = todayISO();
        const in7 = plusDaysISO(7);
        const in14 = plusDaysISO(14);
        const weekStart = startOfWeekISO();
        const weekEnd = endOfWeekISO();
        const yesterday = yesterdayISO();

        const [
          revenueRes,
          arOverviewRes,
          arAgingForecastRes,
          openPipelineRes,
          salesDashboardRes,
          commitmentLbsRes,
          inventoryPipelineRes,
          roomStateRes,
          deliveryNext7Res,
          deliveryNext14Res,
          overdueRes,
          conversionRes,
          new24hRes,
          allOpenForConcentrationRes,
          stuckSessionsRes,
          auditFindingsRes,
          negativeBalancesRes,
          deliveredCycleRes,
          orders30dRes,
          delivered30dRes,
          sparkBatchRes,
        ] = await Promise.all([
          supabase
            .from('v_order_revenue_base')
            .select('total_amount, is_realized, is_current_month, is_projected_current_month, is_open_pipeline')
            .or('is_current_month.eq.true,is_projected_current_month.eq.true'),
          supabase.from('v_ar_overview').select('total_outstanding, bucket_31_60, bucket_61_90, bucket_90_plus').single(),
          supabase
            .from('v_ar_aging')
            .select('amount_due, due_date')
            .gte('due_date', today)
            .lte('due_date', in14),
          supabase
            .from('v_order_revenue_base')
            .select('total_amount')
            .eq('is_open_pipeline', true),
          // v_sales_dashboard.total_sellable is the canonical deliverable-today
          // signal at Cult Cannabis (covers bulk-to-bulk and packaged-to-retail).
          // v_inventory_atp's narrower "Packaged - *" regex match returns ~0.3 lbs,
          // which is real but misleading because bulk sales dominate the order book.
          supabase.from('v_sales_dashboard').select('total_sellable'),
          // commitment in grams from open-pipeline order_items
          // (separate from openPipelineRes which gives USD totals only)
          supabase
            .from('orders')
            .select('id, status, order_items(quantity, demand_unit)')
            .not('status', 'in', '(delivered,cancelled)'),
          supabase
            .from('v_inventory_pipeline_by_strain')
            .select('binned_g, bucked_g, trim_g, bulk_flower_g, bulk_smalls_g, packaged_g'),
          supabase
            .from('v_room_operational_state')
            .select(
              'room_code, urgency_score, earliest_harvest_date, section_projected_harvest, last_harvest_wet_grams, total_plants, dominant_stage, tasks_today, tasks_completed_today'
            ),
          // Today through +7 (current-week delivery focus)
          supabase
            .from('v_order_revenue_base')
            .select('total_amount, canonical_delivery_date')
            .gte('canonical_delivery_date', today)
            .lte('canonical_delivery_date', in7),
          // +8 through +14 (forward book past current week — empty
          // here surfaces sprint sev-4 "sales→fulfillment has no lead time")
          supabase
            .from('v_order_revenue_base')
            .select('total_amount, canonical_delivery_date')
            .gt('canonical_delivery_date', in7)
            .lte('canonical_delivery_date', in14),
          supabase
            .from('v_order_revenue_base')
            .select('total_amount, canonical_delivery_date')
            .lt('canonical_delivery_date', today)
            .eq('is_realized', false),
          supabase
            .from('v_eye_yield_pipeline_by_room')
            .select('binned_g_total, bucked_g_total, bulk_g_total, bin_to_buck_retention_pct, buck_to_bulk_retention_pct'),
          supabase.from('orders').select('total_amount, created_at').gte('created_at', yesterday),
          supabase
            .from('v_order_revenue_base')
            .select('customer_id, customer_name, total_amount')
            .eq('is_current_month', true),
          supabase.from('harvest_sessions').select('id').eq('session_status', 'active').eq('wet_weight_grams', 0),
          supabase.from('inventory_audits').select('id, status').neq('status', 'closed'),
          supabase.from('inventory_items').select('id').lt('on_hand_qty', 0),
          // Lead-time DTF (booking to scheduled delivery) on realized orders.
          // orders.status='delivered' returns 0 rows; the canonical "delivered"
          // flag is v_order_revenue_base.is_realized (orders.status='completed').
          // Median chosen over mean: cash COD same-day vs net-7/14 makes the
          // distribution bimodal and the mean misleading.
          supabase
            .from('v_order_revenue_base')
            .select('order_date, scheduled_delivery_date')
            .eq('is_realized', true)
            .gte('order_date', plusDaysISO(-30)),
          // Sparkline source: every order created in the last 30 days, used
          // for revenue.bookedSpark and fulfillment.new24hSpark. Honest data,
          // bucketed client-side. Bigger sparkline coverage (cash, coverage,
          // exceptions, conversion) needs a home_metric_snapshot table; that
          // is the data-plumbing follow-up.
          supabase
            .from('orders')
            .select('total_amount, created_at')
            .gte('created_at', plusDaysISO(-30)),
          // Sparkline source: realized orders by canonical_delivery_date in
          // the last 30 days, for revenue.deliveredSpark.
          supabase
            .from('v_order_revenue_base')
            .select('total_amount, canonical_delivery_date')
            .eq('is_realized', true)
            .gte('canonical_delivery_date', plusDaysISO(-30))
            .lte('canonical_delivery_date', today),
          // Sparkline source for everything else: daily snapshots from
          // home_metric_snapshot, captured by pg_cron at 06:00 AZ.
          supabase.rpc('cell_spark_batch', { p_days: 30 }),
        ]);

        if (cancelled) return;

        // Revenue
        const revenueRows = (revenueRes.data ?? []) as Array<{
          total_amount: number;
          is_realized: boolean | null;
          is_current_month: boolean | null;
          is_projected_current_month: boolean | null;
          is_open_pipeline: boolean | null;
        }>;
        const bookedMTD = revenueRows
          .filter((r) => r.is_current_month)
          .reduce((s, r) => s + Number(r.total_amount || 0), 0);
        const deliveredMTD = revenueRows
          .filter((r) => r.is_projected_current_month && r.is_realized)
          .reduce((s, r) => s + Number(r.total_amount || 0), 0);
        // Forecast EOM = realized this month + open pipeline scheduled this month.
        // Uses is_projected_current_month (delivery date in current AZ month)
        // rather than is_current_month (booking date in current month) so
        // booked-next-month-but-delivering-this-month orders are included
        // and last-month-bookings-delivering-this-month don't double count.
        const forecastEOM = revenueRows
          .filter((r) => r.is_projected_current_month)
          .reduce((s, r) => s + Number(r.total_amount || 0), 0);
        const scheduledRemaining = Math.max(0, forecastEOM - deliveredMTD);

        // Cash
        const ar = arOverviewRes.data as
          | { total_outstanding: number; bucket_31_60: number; bucket_61_90: number; bucket_90_plus: number }
          | null;
        const arOutstanding = Number(ar?.total_outstanding ?? 0);
        const arAtRisk =
          Number(ar?.bucket_31_60 ?? 0) + Number(ar?.bucket_61_90 ?? 0) + Number(ar?.bucket_90_plus ?? 0);
        const cashForecast14d = (arAgingForecastRes.data ?? []).reduce(
          (s: number, r: { amount_due: number }) => s + Number(r.amount_due || 0),
          0
        );

        // Coverage
        const soldNotDelivered = (openPipelineRes.data ?? []) as Array<{ total_amount: number }>;
        const soldNotDeliveredUSD = soldNotDelivered.reduce((s, r) => s + Number(r.total_amount || 0), 0);
        const soldNotDeliveredCount = soldNotDelivered.length;
        // Commitment in lbs: sum order_items.quantity (demand_unit='g') across non-delivered orders
        const commitmentRows = (commitmentLbsRes.data ?? []) as Array<{
          order_items: Array<{ quantity: number; demand_unit: string | null }> | null;
        }>;
        let commitmentG = 0;
        for (const o of commitmentRows) {
          for (const it of o.order_items ?? []) {
            if ((it.demand_unit ?? '').toLowerCase() === 'g') {
              commitmentG += Number(it.quantity || 0);
            }
          }
        }
        const soldNotDeliveredLbs = gToLbs(commitmentG);
        // Ready = total sellable across strains (canonical Cult Cannabis definition,
        // covers bulk-to-bulk wholesale plus packaged-to-retail jars).
        const salesRows = (salesDashboardRes.data ?? []) as Array<{ total_sellable: number | null }>;
        const readyLbs = salesRows.reduce((s, r) => s + gToLbs(Number(r.total_sellable || 0)), 0);
        const pipelineRows = (inventoryPipelineRes.data ?? []) as Array<{
          binned_g: number;
          bucked_g: number;
          trim_g: number;
          bulk_flower_g: number;
          bulk_smalls_g: number;
          packaged_g: number;
        }>;
        const inProcessG = pipelineRows.reduce(
          (s, r) =>
            s +
            Number(r.binned_g || 0) +
            Number(r.bucked_g || 0) +
            Number(r.trim_g || 0) +
            Number(r.bulk_flower_g || 0) +
            Number(r.bulk_smalls_g || 0),
          0
        );
        const inProcessLbs = gToLbs(inProcessG);

        // Pipeline + Header (room state)
        // next_harvest_date is currently NULL across the board (verified 2026-04-28);
        // earliest_harvest_date and section_projected_harvest are populated and reliable.
        // Falls back to per-plant projection (PLANT_YIELD_G_FALLBACK) when
        // last_harvest_wet_grams is null on a room (e.g. FLW-06, FLW-09).
        const PLANT_YIELD_G_FALLBACK = 80; // rough wet-yield-per-plant constant for flower
        const rooms = (roomStateRes.data ?? []) as Array<{
          room_code: string;
          urgency_score: number;
          earliest_harvest_date: string | null;
          section_projected_harvest: string | null;
          last_harvest_wet_grams: number | null;
          total_plants: number | null;
          dominant_stage: string | null;
          tasks_today: number | null;
          tasks_completed_today: number | null;
        }>;
        const harvestDate = (r: (typeof rooms)[number]) =>
          r.earliest_harvest_date ?? r.section_projected_harvest;
        const projectedG = (r: (typeof rooms)[number]) =>
          Number(r.last_harvest_wet_grams ?? 0) ||
          (r.dominant_stage === 'flower' ? Number(r.total_plants ?? 0) * PLANT_YIELD_G_FALLBACK : 0);
        const harvestRooms = rooms
          .filter((r) => harvestDate(r))
          .sort((a, b) => (harvestDate(a)! < harvestDate(b)! ? -1 : 1));
        const next = harvestRooms[0] ?? null;
        const thisWeekRooms = harvestRooms.filter(
          (r) => harvestDate(r)! >= weekStart && harvestDate(r)! <= weekEnd
        );
        const thisWeek = thisWeekRooms.reduce((s, r) => s + projectedG(r), 0);
        const incoming14dRooms = harvestRooms.filter(
          (r) => harvestDate(r)! >= today && harvestDate(r)! <= in14
        );
        const incoming14d = incoming14dRooms.reduce((s, r) => s + projectedG(r), 0);
        const incoming14dLbs = gToLbs(incoming14d);
        const incoming14dEvents = incoming14dRooms.length;
        // Estimated flag: any room in window had to fall back to per-plant projection
        const incoming14dEstimated = incoming14dRooms.some(
          (r) => !Number(r.last_harvest_wet_grams ?? 0) && projectedG(r) > 0
        );

        const tasksTotalToday = rooms.reduce((s, r) => s + Number(r.tasks_today || 0), 0);
        const tasksDoneToday = rooms.reduce((s, r) => s + Number(r.tasks_completed_today || 0), 0);
        const roomsAttention = rooms.filter((r) => Number(r.urgency_score || 0) >= 2).length;
        const roomsTotal = rooms.length;

        const next7 = (deliveryNext7Res.data ?? []) as Array<{ total_amount: number }>;
        const forward8to14 = (deliveryNext14Res.data ?? []) as Array<{ total_amount: number }>;
        const overdue = (overdueRes.data ?? []) as Array<{ total_amount: number }>;

        // Conversion (from v_eye view, room-grain → sum)
        const convRows = (conversionRes.data ?? []) as Array<{
          binned_g_total: number;
          bucked_g_total: number;
          bulk_g_total: number;
          bin_to_buck_retention_pct: number;
          buck_to_bulk_retention_pct: number;
        }>;
        const binnedG = convRows.reduce((s, r) => s + Number(r.binned_g_total || 0), 0);
        const buckedG = convRows.reduce((s, r) => s + Number(r.bucked_g_total || 0), 0);
        const bulkG = convRows.reduce((s, r) => s + Number(r.bulk_g_total || 0), 0);
        // Trimmed and packaged from v_inventory_pipeline_by_strain (already fetched)
        const trimmedG = pipelineRows.reduce((s, r) => s + Number(r.trim_g || 0), 0);
        const packagedG = pipelineRows.reduce((s, r) => s + Number(r.packaged_g || 0), 0);
        const binToBuckPct = binnedG > 0 ? (buckedG / binnedG) * 100 : 0;
        const buckToTrimPct = buckedG > 0 ? (bulkG / buckedG) * 100 : 0;
        const trimToPkgPct = bulkG > 0 ? (packagedG / bulkG) * 100 : 0;

        // Fulfillment
        const new24h = (new24hRes.data ?? []) as Array<{ total_amount: number }>;
        const concentrationRows = (allOpenForConcentrationRes.data ?? []) as Array<{
          customer_id: string | null;
          customer_name: string | null;
          total_amount: number;
        }>;
        // Chain-key heuristic: split customer_name on " - " and use the leading
        // segment as the concentration grouping key. Catches the Story chain
        // (9 location rows) and similar dispensary chains in production.
        // Misses "Story Litchfield - Joint Junkies..." (different format,
        // ~$6.5K leak vs ~$89K Story chain total).
        // Brain note documents the structural fix path: populate
        // customers.parent_customer_id (currently null on every row in prod).
        // See business_context row "parent_customer_id_null_in_production".
        const chainKey = (name: string | null): string => {
          if (!name) return 'unknown';
          const trimmed = name.trim();
          const dashIdx = trimmed.indexOf(' - ');
          return dashIdx > 0 ? trimmed.slice(0, dashIdx).trim() : trimmed;
        };
        const byChain = new Map<string, number>();
        let concTotal = 0;
        for (const r of concentrationRows) {
          const key = chainKey(r.customer_name);
          byChain.set(key, (byChain.get(key) ?? 0) + Number(r.total_amount || 0));
          concTotal += Number(r.total_amount || 0);
        }
        const top3 = Array.from(byChain.values())
          .sort((a, b) => b - a)
          .slice(0, 3)
          .reduce((s, v) => s + v, 0);
        const top3Pct = concTotal > 0 ? (top3 / concTotal) * 100 : 0;

        const deliveredCycle = (deliveredCycleRes.data ?? []) as Array<{
          order_date: string | null;
          scheduled_delivery_date: string | null;
        }>;
        const cycleDays = deliveredCycle
          .map((r) => {
            if (!r.order_date || !r.scheduled_delivery_date) return null;
            const a = new Date(r.order_date).getTime();
            const b = new Date(r.scheduled_delivery_date).getTime();
            return (b - a) / (1000 * 60 * 60 * 24);
          })
          .filter((n): n is number => n !== null && n >= 0)
          .sort((a, b) => a - b);
        // Median across realized orders. Returns 0 (renders as "0.0 d · no data")
        // only when zero realized orders exist in the trailing 30 days.
        const medianDtfDays = (() => {
          const n = cycleDays.length;
          if (n === 0) return 0;
          if (n % 2 === 1) return cycleDays[(n - 1) / 2];
          return (cycleDays[n / 2 - 1] + cycleDays[n / 2]) / 2;
        })();
        const dtfSampleSize = cycleDays.length;

        const stuckSessions = (stuckSessionsRes.data ?? []).length;
        const auditFindings = (auditFindingsRes.data ?? []).length;
        const negativeBalances = (negativeBalancesRes.data ?? []).length;

        // 30d sparklines (honest sources only — see Promise.all comment for
        // the data-plumbing follow-up that lights up the rest).
        const orders30d = (orders30dRes.data ?? []) as Array<{
          total_amount: number;
          created_at: string | null;
        }>;
        const delivered30d = (delivered30dRes.data ?? []) as Array<{
          total_amount: number;
          canonical_delivery_date: string | null;
        }>;
        const bookedSpark = bucketByDay(
          orders30d,
          (r) => r.created_at,
          (r) => Number(r.total_amount || 0),
          30
        );
        const new24hSpark = bucketByDay(
          orders30d,
          (r) => r.created_at,
          () => 1,
          30
        );
        const deliveredSpark = bucketByDay(
          delivered30d,
          (r) => r.canonical_delivery_date,
          (r) => Number(r.total_amount || 0),
          30
        );

        // Snapshot-driven sparks: bucket cell_spark_batch rows by cell_id and
        // pad to 30 entries oldest-first. Cells with fewer captured days
        // produce shorter arrays; Sparkline.tsx handles 1..30 lengths.
        const sparkRows = (sparkBatchRes.data ?? []) as Array<{
          cell_id: string;
          captured_for_date: string;
          value_numeric: number | null;
        }>;
        const sparkByCell: Record<string, Array<{ d: string; v: number }>> = {};
        for (const r of sparkRows) {
          if (!sparkByCell[r.cell_id]) sparkByCell[r.cell_id] = [];
          sparkByCell[r.cell_id].push({
            d: r.captured_for_date,
            v: Number(r.value_numeric ?? 0),
          });
        }
        const sparks: Record<string, number[]> = {
          'revenue.booked_mtd': bookedSpark,
          'revenue.delivered_mtd': deliveredSpark,
          'fulfillment.new_24h_count': new24hSpark,
        };
        for (const [cellId, points] of Object.entries(sparkByCell)) {
          if (cellId in sparks) continue; // direct-derived already populated
          sparks[cellId] = points
            .sort((a, b) => (a.d < b.d ? -1 : 1))
            .map((p) => p.v);
        }

        // Net cover: lbs-vs-lbs.
        // Supply lbs = ready + in-process projected to clear + incoming from harvest.
        // Commitment lbs from order_items.quantity where demand_unit='g'.
        // Honest ratio, no $/lb proxy.
        const supplyLbs = readyLbs + inProcessLbs + incoming14dLbs;
        const netCoverPct =
          soldNotDeliveredLbs > 0 ? Math.min(999, (supplyLbs / soldNotDeliveredLbs) * 100) : 0;

        setData({
          loading: false,
          error: null,
          loadedAt: Date.now(),
          header: { tasksDoneToday, tasksTotalToday },
          revenue: { bookedMTD, deliveredMTD, forecastEOM, scheduledRemaining },
          cash: { arOutstanding, arAtRisk, cashForecast14d },
          coverage: {
            soldNotDeliveredUSD,
            soldNotDeliveredCount,
            soldNotDeliveredLbs,
            readyLbs,
            inProcessLbs,
            incoming14dLbs,
            incoming14dEvents,
            incoming14dEstimated,
            netCoverPct,
          },
          pipeline: {
            nextHarvestRoom: next?.room_code ?? null,
            nextHarvestDate: next ? harvestDate(next) : null,
            nextHarvestLbs: next ? gToLbs(projectedG(next)) : 0,
            thisWeekHarvestLbs: gToLbs(thisWeek),
            next7dDeliveriesUSD: next7.reduce((s, r) => s + Number(r.total_amount || 0), 0),
            next7dDeliveriesCount: next7.length,
            forward8to14dUSD: forward8to14.reduce((s, r) => s + Number(r.total_amount || 0), 0),
            forward8to14dCount: forward8to14.length,
            overdueCount: overdue.length,
            overdueUSD: overdue.reduce((s, r) => s + Number(r.total_amount || 0), 0),
          },
          conversion: {
            binnedLbs: gToLbs(binnedG),
            buckedLbs: gToLbs(buckedG),
            trimmedLbs: gToLbs(trimmedG),
            packagedLbs: gToLbs(packagedG),
            binToBuckPct,
            buckToTrimPct,
            trimToPkgPct,
          },
          fulfillment: {
            openUSD: soldNotDeliveredUSD,
            openCount: soldNotDeliveredCount,
            new24hCount: new24h.length,
            new24hUSD: new24h.reduce((s, r) => s + Number(r.total_amount || 0), 0),
            lateCount: overdue.length,
            lateUSD: overdue.reduce((s, r) => s + Number(r.total_amount || 0), 0),
            top3Pct,
            medianDtfDays,
            dtfSampleSize,
          },
          exceptions: {
            roomsAttention,
            roomsTotal,
            stuckSessions,
            auditFindings,
            negativeBalances,
          },
          sparks,
        });
      } catch (e) {
        if (cancelled) return;
        setData((d) => ({ ...d, loading: false, error: (e as Error).message }));
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return data;
}
