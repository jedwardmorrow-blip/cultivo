import { useEffect, useState, useMemo } from 'react';
import { Crown, AlertTriangle, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HubShell } from '@/features/hub/components/HubShell';
import { formatCurrencyShort } from '@/shared/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

type Health = 'green' | 'amber' | 'red';

interface DeptHealth {
  name: string;
  health: Health;
  note: string;
}

interface Alert {
  type: string;
  label: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const healthStyles: Record<Health, { bg: string; text: string; dot: string }> = {
  green: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500/15',   text: 'text-amber-300',   dot: 'bg-amber-500'   },
  red:   { bg: 'bg-red-500/15',     text: 'text-red-300',     dot: 'bg-red-500'     },
};

const alertSeverityStyle: Record<string, string> = {
  high:   'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low:    'bg-slate-700/50 text-slate-300 border-slate-600/50',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function DeptHealthChips({ depts, loading }: { depts: DeptHealth[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-3 flex-wrap animate-pulse">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 w-36 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap">
      {depts.map(d => {
        const s = healthStyles[d.health];
        return (
          <div
            key={d.name}
            className={`flex items-center gap-2 px-3 py-2 rounded-cult border border-cult-charcoal/60 ${s.bg}`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
            <div>
              <div className={`text-[12px] font-semibold ${s.text}`}>{d.name}</div>
              <div className="text-[10px] text-cult-text-faint">{d.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AttentionAlertStrip({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-cult-graphite rounded-cult" />)}
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2 py-3 text-[12px] text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        All clear — no items need immediate attention.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-start gap-3 py-2 border-b border-cult-charcoal/40 last:border-b-0"
        >
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${alertSeverityStyle[alert.severity]}`}
          >
            {alert.type}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-cult-off-white">{alert.label}</div>
            <div className="text-[11px] text-cult-text-faint">{alert.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueSummaryPanel({
  recognized,
  pipeline,
  loading,
}: {
  recognized: number;
  pipeline: number;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-cult-charcoal/30 rounded-cult p-4">
        <div className="text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">Recognized (30d)</div>
        <div className="text-[24px] font-semibold text-emerald-400 tabular-nums">
          {loading ? '—' : formatCurrencyShort(recognized)}
        </div>
        <div className="text-[11px] text-cult-text-faint mt-1">completed orders</div>
      </div>
      <div className="bg-cult-charcoal/30 rounded-cult p-4">
        <div className="text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">Pipeline (open)</div>
        <div className="flex items-center gap-2">
          <div className="text-[24px] font-semibold text-cult-accent tabular-nums">
            {loading ? '—' : formatCurrencyShort(pipeline)}
          </div>
          {!loading && (
            pipeline >= recognized
              ? <TrendingUp className="w-4 h-4 text-emerald-400" />
              : <TrendingDown className="w-4 h-4 text-amber-400" />
          )}
        </div>
        <div className="text-[11px] text-cult-text-faint mt-1">open order value</div>
      </div>
    </div>
  );
}

function HeadcountSummaryPanel({ count, loading }: { count: number; loading: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <Users className="w-8 h-8 text-cult-text-muted flex-shrink-0" />
      <div>
        <div className="text-[10px] text-cult-text-muted uppercase tracking-wider">Active Sessions (7d)</div>
        <div className="text-[28px] font-semibold text-cult-text-primary tabular-nums">
          {loading ? '—' : count}
        </div>
        <div className="text-[11px] text-cult-text-faint">harvest + bucking sessions</div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ExecutiveHub() {
  // Revenue / order state
  const [revRecognized, setRevRecognized] = useState(0);
  const [revPipeline, setRevPipeline] = useState(0);
  const [openOrderCount, setOpenOrderCount] = useState(0);
  const [overdueOrderCount, setOverdueOrderCount] = useState(0);
  const [revLoading, setRevLoading] = useState(true);

  // Health indicator state
  const [activeBatchCount, setActiveBatchCount] = useState(0);
  const [recentSessionCount, setRecentSessionCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [operationsOk, setOperationsOk] = useState<boolean | null>(null);
  const [lowAtpStrains, setLowAtpStrains] = useState<string[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  // Session count (headcount proxy)
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Load order data
  useEffect(() => {
    let mounted = true;
    async function load() {
      setRevLoading(true);
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const { data } = await supabase
        .from('orders')
        .select('status, total_amount, created_at, scheduled_delivery_date')
        .eq('archived', false)
        .eq('test_mode', false)
        .neq('status', 'cancelled');

      if (!mounted) return;

      if (data) {
        const completedStatuses = new Set(['delivered', 'completed']);
        const today = new Date().toISOString().slice(0, 10);
        let recognized = 0;
        let pipeline = 0;
        let openCount = 0;
        let overdueCount = 0;

        for (const o of data as any[]) {
          const amt = o.total_amount ?? 0;
          if (completedStatuses.has(o.status)) {
            const createdDate = (o.created_at ?? '').slice(0, 10);
            if (createdDate >= since30d) recognized += amt;
          } else {
            pipeline += amt;
            openCount++;
            if (o.scheduled_delivery_date && o.scheduled_delivery_date < today) {
              overdueCount++;
            }
          }
        }

        setRevRecognized(recognized);
        setRevPipeline(pipeline);
        setOpenOrderCount(openCount);
        setOverdueOrderCount(overdueCount);
      }

      if (mounted) setRevLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Load health indicators
  useEffect(() => {
    let mounted = true;
    async function load() {
      setHealthLoading(true);

      const [batchRes, flagRes, opsRes, atpRes] = await Promise.all([
        supabase
          .from('batch_registry')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .not('harvest_date', 'is', null),
        supabase
          .from('inventory_items')
          .select('id', { count: 'exact', head: true })
          .gt('on_hand_qty', 0)
          .not('review_status', 'is', null)
          .neq('review_status', 'approved'),
        supabase
          .from('v_batch_margins')
          .select('batch_id', { count: 'exact', head: true })
          .limit(1),
        supabase
          .from('v_atp')
          .select('strain')
          .lt('atp_qty', 200)
          .gt('on_hand_qty', 0),
      ]);

      if (!mounted) return;

      setActiveBatchCount(batchRes.count ?? 0);
      setFlaggedCount(flagRes.count ?? 0);
      setOperationsOk(opsRes.error == null);

      if (!atpRes.error && atpRes.data) {
        const strains = [...new Set((atpRes.data as any[]).map(r => r.strain).filter(Boolean))] as string[];
        setLowAtpStrains(strains);
      }

      if (mounted) setHealthLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Load session counts (headcount proxy)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setSessionLoading(true);
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [harvestRes, buckingRes] = await Promise.all([
        supabase
          .from('harvest_sessions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since7d)
          .neq('session_status', 'cancelled'),
        supabase
          .from('bucking_sessions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since7d)
          .is('cancelled_at', null),
      ]);

      if (!mounted) return;

      const total = (harvestRes.count ?? 0) + (buckingRes.count ?? 0);
      setRecentSessionCount(total);
      setSessionCount(total);
      if (mounted) setSessionLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Derived: dept health chips
  const deptHealth: DeptHealth[] = useMemo(() => [
    {
      name: 'Cultivation',
      health: activeBatchCount >= 3 ? 'green' : activeBatchCount >= 1 ? 'amber' : 'red',
      note: `${activeBatchCount} active batch${activeBatchCount !== 1 ? 'es' : ''}`,
    },
    {
      name: 'Post Production',
      health: recentSessionCount >= 3 ? 'green' : recentSessionCount >= 1 ? 'amber' : 'red',
      note: `${recentSessionCount} session${recentSessionCount !== 1 ? 's' : ''} (7d)`,
    },
    {
      name: 'Inventory',
      health: flaggedCount === 0 ? 'green' : flaggedCount <= 5 ? 'amber' : 'red',
      note: flaggedCount === 0 ? 'All clear' : `${flaggedCount} flagged`,
    },
    {
      name: 'Sales',
      health:
        openOrderCount === 0
          ? 'red'
          : overdueOrderCount > 0
          ? 'amber'
          : 'green',
      note: overdueOrderCount > 0 ? `${overdueOrderCount} overdue` : `${openOrderCount} open orders`,
    },
    {
      name: 'Operations',
      health: operationsOk == null ? 'amber' : operationsOk ? 'green' : 'amber',
      note: operationsOk ? 'Margin data OK' : 'Pending CUL-156',
    },
  ], [activeBatchCount, recentSessionCount, flaggedCount, openOrderCount, overdueOrderCount, operationsOk]);

  // Derived: attention alerts
  const alerts: Alert[] = useMemo(() => {
    const result: Alert[] = [];

    if (overdueOrderCount > 0) {
      result.push({
        type: 'Orders',
        label: `${overdueOrderCount} overdue order${overdueOrderCount > 1 ? 's' : ''}`,
        detail: 'Scheduled delivery date has passed',
        severity: overdueOrderCount >= 5 ? 'high' : 'medium',
      });
    }

    if (flaggedCount > 0) {
      result.push({
        type: 'Inventory',
        label: `${flaggedCount} flagged item${flaggedCount > 1 ? 's' : ''} pending review`,
        detail: 'Review status not approved',
        severity: flaggedCount >= 10 ? 'high' : 'medium',
      });
    }

    if (!healthLoading && activeBatchCount === 0) {
      result.push({
        type: 'Cultivation',
        label: 'No active batches in system',
        detail: 'Register a new batch to begin cultivation cycle',
        severity: 'high',
      });
    }

    if (lowAtpStrains.length > 0) {
      result.push({
        type: 'ATP',
        label: `Low ATP: ${lowAtpStrains.slice(0, 3).join(', ')}${lowAtpStrains.length > 3 ? ` +${lowAtpStrains.length - 3} more` : ''}`,
        detail: 'Available-to-sell < 200g',
        severity: 'medium',
      });
    }

    return result;
  }, [overdueOrderCount, flaggedCount, activeBatchCount, healthLoading, lowAtpStrains]);

  const isAlertsLoading = revLoading || healthLoading;

  const kpis = [
    {
      label: 'Revenue This Cycle',
      value: revLoading ? '—' : formatCurrencyShort(revRecognized),
      sub: 'last 30 days',
    },
    {
      label: 'Open Orders Value',
      value: revLoading ? '—' : formatCurrencyShort(revPipeline),
    },
    {
      label: 'Open Orders',
      value: revLoading ? '—' : String(openOrderCount),
    },
  ];

  return (
    <HubShell section="Executive" icon={Crown} kpis={kpis}>
      <div className="space-y-6">

        {/* Department Health */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider">
            Department Health
          </h2>
          <DeptHealthChips
            depts={deptHealth}
            loading={healthLoading || revLoading || sessionLoading}
          />
        </div>

        {/* Attention Alert Strip */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Attention Required
          </h2>
          <AttentionAlertStrip alerts={alerts} loading={isAlertsLoading} />
        </div>

        {/* Revenue Summary */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Revenue Summary
          </h2>
          <RevenueSummaryPanel
            recognized={revRecognized}
            pipeline={revPipeline}
            loading={revLoading}
          />
        </div>

        {/* Headcount Activity */}
        <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
          <h2 className="text-label font-semibold text-cult-text-primary mb-3 uppercase tracking-wider">
            Headcount Activity
          </h2>
          <HeadcountSummaryPanel count={sessionCount} loading={sessionLoading} />
        </div>

      </div>
    </HubShell>
  );
}
