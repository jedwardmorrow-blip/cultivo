import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, BarChart2, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HubShell } from '@/features/hub/components/HubShell';
import { StatCard } from '@/shared/components/StatCard';
import { formatCurrencyShort } from '@/shared/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CostRow {
  batch_id: string;
  strain_name: string;
  total_wet_weight_g: number;
  total_dry_weight_g: number;
  estimated_cost_usd: number;
  cost_per_gram_usd: number | null;
  harvest_date: string | null;
}

interface MarginRow {
  batch_id: string;
  strain_name: string;
  harvest_month: string | null;
  revenue_estimate: number | null;
  cost_estimate: number | null;
  margin_pct: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function weekLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CostBreakdownGrid({ costRows, loading }: { costRows: CostRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }

  if (!costRows.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No cost data — apply CUL-156 migration to enable.</p>;
  }

  const byStrain = new Map<string, { totalCost: number; count: number }>();
  for (const r of costRows) {
    if (r.cost_per_gram_usd == null) continue;
    const e = byStrain.get(r.strain_name) ?? { totalCost: 0, count: 0 };
    e.totalCost += r.cost_per_gram_usd;
    e.count++;
    byStrain.set(r.strain_name, e);
  }

  const strains = Array.from(byStrain.entries())
    .map(([strain, { totalCost, count }]) => ({ strain, avg: totalCost / count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  if (!strains.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No cost-per-gram data available yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {strains.map(({ strain, avg }) => (
        <StatCard
          key={strain}
          label={strain}
          value={`$${avg.toFixed(3)}/g`}
          subtitle="avg cost/g"
          variant={avg < 0.5 ? 'success' : avg < 1.5 ? 'default' : 'danger'}
        />
      ))}
    </div>
  );
}

function WeeklyRevenueChart({ buckets, loading }: { buckets: { label: string; revenue: number }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse flex items-end gap-2" style={{ height: '96px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="flex-1 bg-cult-graphite rounded-t-sm" style={{ height: `${20 + i * 8}px` }} />
        ))}
      </div>
    );
  }

  const maxRev = Math.max(...buckets.map(b => b.revenue), 1);
  const hasData = buckets.some(b => b.revenue > 0);

  if (!hasData) {
    return <p className="text-[12px] text-cult-text-faint py-2">No completed orders in the last 8 weeks.</p>;
  }

  return (
    <div className="flex items-end gap-2">
      {buckets.map(b => (
        <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-cult-text-faint text-center leading-none min-h-[14px]">
            {b.revenue > 0 ? formatCurrencyShort(b.revenue) : ''}
          </span>
          <div
            className="w-full rounded-t-sm bg-cult-accent/60 transition-all duration-300"
            style={{
              height: `${Math.max(3, Math.round((b.revenue / maxRev) * 60))}px`,
              opacity: b.revenue > 0 ? 1 : 0.2,
            }}
          />
          <span className="text-[10px] text-cult-text-muted text-center leading-none">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function BatchMarginTable({ rows, loading }: { rows: MarginRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }
  if (!rows.length) {
    return <p className="text-[12px] text-cult-text-faint py-2">No margin data — apply CUL-156 migration to enable.</p>;
  }

  function marginColor(pct: number | null): string {
    if (pct == null) return 'text-cult-text-faint';
    if (pct >= 60) return 'text-cult-success';
    if (pct >= 40) return 'text-cult-warning';
    return 'text-cult-danger';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-cult-charcoal/60">
            <th className="text-left text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Batch</th>
            <th className="text-left text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Strain</th>
            <th className="text-left text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Month</th>
            <th className="text-right text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Revenue Est</th>
            <th className="text-right text-cult-text-muted pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Cost Est</th>
            <th className="text-right text-cult-text-muted pb-2 font-medium uppercase tracking-wider text-[10px]">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map(row => (
            <tr key={row.batch_id} className="border-b border-cult-charcoal/30 last:border-b-0">
              <td className="py-2 pr-3 text-cult-off-white font-mono text-[11px]">{row.batch_id}</td>
              <td className="py-2 pr-3 text-cult-text-muted truncate max-w-[120px]">{row.strain_name}</td>
              <td className="py-2 pr-3 text-cult-text-faint">
                {row.harvest_month
                  ? new Date(row.harvest_month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                  : '—'}
              </td>
              <td className="py-2 pr-3 text-right text-cult-text-muted tabular-nums">
                {row.revenue_estimate != null ? formatCurrencyShort(row.revenue_estimate) : '—'}
              </td>
              <td className="py-2 pr-3 text-right text-cult-text-muted tabular-nums">
                {row.cost_estimate != null ? formatCurrencyShort(row.cost_estimate) : '—'}
              </td>
              <td className={`py-2 text-right tabular-nums font-semibold ${marginColor(row.margin_pct)}`}>
                {row.margin_pct != null ? `${row.margin_pct.toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationalKPIChips({
  fillRate,
  avgDaysToShip,
  harvestYield,
  trimWaste,
  loading,
}: {
  fillRate: number | null;
  avgDaysToShip: number | null;
  harvestYield: number | null;
  trimWaste: number | null;
  loading: boolean;
}) {
  const chips = [
    {
      label: 'Fill Rate',
      value: fillRate != null ? `${fillRate.toFixed(1)}%` : '—',
      good: fillRate != null && fillRate >= 90,
    },
    {
      label: 'Avg Days to Ship',
      value: avgDaysToShip != null ? `${avgDaysToShip.toFixed(1)}d` : '—',
      good: avgDaysToShip != null && avgDaysToShip <= 3,
    },
    {
      label: 'Harvest Yield',
      value: harvestYield != null ? `${harvestYield.toFixed(1)}%` : '—',
      good: harvestYield != null && harvestYield >= 20,
    },
    {
      label: 'Trim Waste',
      value: trimWaste != null ? `${trimWaste.toFixed(1)}%` : '—',
      good: trimWaste != null && trimWaste <= 80,
    },
  ];

  if (loading) {
    return (
      <div className="flex gap-3 flex-wrap animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-32 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap">
      {chips.map(chip => (
        <div
          key={chip.label}
          className="flex flex-col items-start px-3 py-2 rounded-cult bg-cult-charcoal/40 border border-cult-charcoal/60 min-w-[120px]"
        >
          <span className="text-[10px] text-cult-text-muted uppercase tracking-wider">{chip.label}</span>
          <span
            className={`text-[20px] font-semibold tabular-nums ${
              chip.value === '—'
                ? 'text-cult-text-faint'
                : chip.good
                ? 'text-cult-success'
                : 'text-cult-warning'
            }`}
          >
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OperationsHub() {
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [marginRows, setMarginRows] = useState<MarginRow[]>([]);
  const [cpgLoading, setCpgLoading] = useState(true);
  const [marginLoading, setMarginLoading] = useState(true);

  const [revMTD, setRevMTD] = useState(0);
  const [revLoading, setRevLoading] = useState(true);
  const [weeklyBuckets, setWeeklyBuckets] = useState<{ label: string; revenue: number }[]>([]);
  const [fillRate, setFillRate] = useState<number | null>(null);
  const [avgDaysToShip, setAvgDaysToShip] = useState<number | null>(null);

  // Load cost-per-gram data (graceful degrade if RPC not yet applied)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setCpgLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_cost_per_gram_summary');
        if (!mounted) return;
        if (!error && data) setCostRows(data as CostRow[]);
      } catch {
        // RPC not available yet — show empty state
      }
      if (mounted) setCpgLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Load batch margin data (graceful degrade if view not yet applied)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setMarginLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_batch_margins')
          .select('*')
          .order('harvest_month', { ascending: false });
        if (!mounted) return;
        if (!error && data) setMarginRows(data as MarginRow[]);
      } catch {
        // View not available yet — show empty state
      }
      if (mounted) setMarginLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Load order revenue + operational metrics
  useEffect(() => {
    let mounted = true;
    async function load() {
      setRevLoading(true);
      const now = new Date();
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const weeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const { data } = await supabase
        .from('orders')
        .select('status, total_amount, created_at, order_date, scheduled_delivery_date')
        .eq('archived', false)
        .eq('test_mode', false)
        .neq('status', 'cancelled')
        .gte('created_at', weeksAgo + 'T00:00:00');

      if (!mounted) return;

      if (data) {
        const completedStatuses = new Set(['delivered', 'completed']);

        let mtdRev = 0;
        let totalOrders = 0;
        let completedOrders = 0;
        let totalDaysToShip = 0;
        let shippedCount = 0;

        // Seed week buckets (last 8 Mondays)
        const bucketMap = new Map<string, number>();
        for (let i = 7; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i * 7);
          bucketMap.set(getMondayKey(d), 0);
        }

        for (const o of data as any[]) {
          totalOrders++;
          if (completedStatuses.has(o.status)) {
            completedOrders++;
            const amt = o.total_amount ?? 0;

            const createdDate = (o.order_date ?? o.created_at ?? '').slice(0, 10);
            if (createdDate >= mtdStart) mtdRev += amt;

            const weekKey = getMondayKey(new Date(o.created_at ?? Date.now()));
            if (bucketMap.has(weekKey)) {
              bucketMap.set(weekKey, (bucketMap.get(weekKey) ?? 0) + amt);
            }

            const orderDate = new Date(o.order_date ?? o.created_at ?? Date.now());
            const deliveryDate = o.scheduled_delivery_date ? new Date(o.scheduled_delivery_date) : null;
            if (deliveryDate) {
              const days = (deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
              if (days >= 0 && days < 365) {
                totalDaysToShip += days;
                shippedCount++;
              }
            }
          }
        }

        setRevMTD(mtdRev);
        setFillRate(totalOrders > 0 ? (completedOrders / totalOrders) * 100 : null);
        setAvgDaysToShip(shippedCount > 0 ? totalDaysToShip / shippedCount : null);

        const sortedBuckets = Array.from(bucketMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, rev]) => ({ label: weekLabel(key), revenue: rev }));
        setWeeklyBuckets(sortedBuckets);
      }

      if (mounted) setRevLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Derived values from cost data
  const avgCostPerGram =
    costRows.find(r => r.cost_per_gram_usd != null)?.cost_per_gram_usd ?? null;

  const avgMarginMTD =
    marginRows.length > 0
      ? (() => {
          const valid = marginRows.filter(r => r.margin_pct != null).slice(0, 5);
          if (!valid.length) return null;
          return valid.reduce((sum, r) => sum + r.margin_pct!, 0) / valid.length;
        })()
      : null;

  const harvestYield =
    costRows.length > 0
      ? (() => {
          const valid = costRows.filter(r => r.total_wet_weight_g > 0 && r.total_dry_weight_g > 0);
          if (!valid.length) return null;
          return (valid.reduce((sum, r) => sum + r.total_dry_weight_g / r.total_wet_weight_g, 0) / valid.length) * 100;
        })()
      : null;

  const trimWaste = harvestYield != null ? 100 - harvestYield : null;

  const kpis = [
    {
      label: 'Avg Cost/g (last harvest)',
      value: cpgLoading ? '—' : avgCostPerGram != null ? `$${avgCostPerGram.toFixed(3)}` : 'No data',
    },
    {
      label: 'Revenue Recognized MTD',
      value: revLoading ? '—' : formatCurrencyShort(revMTD),
    },
    {
      label: 'Est Margin % MTD',
      value: marginLoading ? '—' : avgMarginMTD != null ? `${avgMarginMTD.toFixed(1)}%` : 'No data',
    },
  ];

  return (
    <HubShell section="Operations" icon={Wallet} kpis={kpis}>
      <div className="space-y-6">

        {/* Cost / Gram by Strain */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Cost / Gram by Strain (Top 5)
          </h2>
          <p className="text-[11px] text-cult-text-faint mb-3">Avg cost/g across all batches. Green &lt;$0.50 · Neutral &lt;$1.50 · Red ≥$1.50</p>
          <CostBreakdownGrid costRows={costRows} loading={cpgLoading} />
        </div>

        {/* Weekly Revenue Bar Chart */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Revenue Recognized — Last 8 Weeks
          </h2>
          <WeeklyRevenueChart buckets={weeklyBuckets} loading={revLoading} />
        </div>

        {/* Batch Margin Table */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider">
            Batch Margin Table
          </h2>
          <BatchMarginTable rows={marginRows} loading={marginLoading} />
        </div>

        {/* Operational KPI Chips */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Operational KPIs
          </h2>
          <OperationalKPIChips
            fillRate={fillRate}
            avgDaysToShip={avgDaysToShip}
            harvestYield={harvestYield}
            trimWaste={trimWaste}
            loading={revLoading || cpgLoading}
          />
        </div>

      </div>
    </HubShell>
  );
}
