import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Receipt, BarChart3, Scale } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FinancialPulse {
  revenue_mtd: number;
  orders_mtd: number;
  revenue_last_30d: number;
  open_pipeline_value: number;
  burn_rate_monthly: number;
  monthly_deficit: number;
}

interface ARRecord {
  id: string;
  invoice_number: string;
  customer_name: string;
  amount_due: number;
  days_outstanding: number;
  age_bucket: string;
}

interface APRecord {
  id: string;
  vendor_name: string;
  vendor_category: string;
  total_amount: number;
  amount_outstanding: number;
  is_cogs: boolean;
  days_overdue: number;
  age_bucket: string;
  due_date: string;
}

interface StrainCost {
  strain: string;
  labor_cost_per_gram: number;
  avg_revenue_per_gram: number;
  labor_margin_per_gram: number;
}

interface Summary280E {
  period: string;
  total_revenue: number;
  total_cogs: number;
  total_operating_expense: number;
  cogs_pct: number;
  taxable_income_estimate: number;
  vs_standard_accounting: number;
  penalty_280e: number;
}

function fmt(val: number | null | undefined) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

function fmtDec(val: number | null | undefined) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function pct(val: number | null | undefined) {
  if (val == null) return '—';
  return `${Number(val).toFixed(1)}%`;
}

const BUCKET_COLORS: Record<string, string> = {
  'current': 'text-green-400',
  '1-30': 'text-amber-400',
  '31-60': 'text-orange-400',
  '61-90': 'text-red-400',
  '90+': 'text-red-500',
};

export function FinancialDashboard() {
  const [pulse, setPulse] = useState<FinancialPulse | null>(null);
  const [ar, setAR] = useState<ARRecord[]>([]);
  const [ap, setAP] = useState<APRecord[]>([]);
  const [strains, setStrains] = useState<StrainCost[]>([]);
  const [summary280e, setSummary280e] = useState<Summary280E[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [pulseRes, arRes, apRes, strainsRes, s280eRes] = await Promise.all([
        supabase.from('v_ci_financial_pulse').select('*').single(),
        supabase.from('v_ar_aging').select('*').order('days_outstanding', { ascending: false }),
        supabase.from('v_ap_aging').select('*').order('days_overdue', { ascending: false }),
        supabase.from('v_strain_cost_of_production').select('*').order('labor_margin_per_gram', { ascending: false }),
        supabase.from('v_280e_summary').select('*').order('period', { ascending: false }).limit(6),
      ]);

      if (pulseRes.data) setPulse(pulseRes.data as any);
      if (arRes.data) setAR(arRes.data as any);
      if (apRes.data) setAP(apRes.data as any);
      if (strainsRes.data) setStrains(strainsRes.data as any);
      if (s280eRes.data) setSummary280e(s280eRes.data as any);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-text-muted">Loading financial intelligence...</div>
      </div>
    );
  }

  const arTotal = ar.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const arBuckets = ar.reduce((acc, r) => {
    acc[r.age_bucket] = (acc[r.age_bucket] || 0) + Number(r.amount_due || 0);
    return acc;
  }, {} as Record<string, number>);

  const apTotal = ap.reduce((s, r) => s + Number(r.amount_outstanding || 0), 0);
  const apCogs = ap.filter(r => r.is_cogs).reduce((s, r) => s + Number(r.amount_outstanding || 0), 0);
  const apOpex = apTotal - apCogs;
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 86400000);
  const apDueSoon = ap.filter(r => r.due_date && new Date(r.due_date) <= in7days && new Date(r.due_date) >= now);

  const topStrains = strains.filter(s => s.labor_margin_per_gram != null).slice(0, 5);
  const bottomStrains = strains.filter(s => s.labor_margin_per_gram != null).slice(-5).reverse();
  const bestStrain = topStrains[0];

  const latest280e = summary280e[0];

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Financial Intelligence</h1>
        <p className="text-cult-light-gray mt-2">Revenue pulse, receivables, payables, cost intelligence, and 280E</p>
      </div>

      {/* Section 1: Revenue Pulse */}
      <div className="bg-cult-surface border border-cult-border rounded-cult p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-cult-white" />
          <h2 className="text-lg font-semibold text-cult-white">Revenue Pulse</h2>
        </div>
        {pulse ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="MTD Revenue" value={fmt(pulse.revenue_mtd)} />
            <StatCard label="Burn Rate Target" value={fmt(pulse.burn_rate_monthly)} subtitle="/month" />
            <StatCard
              label="Monthly Deficit"
              value={fmt(Math.abs(pulse.monthly_deficit))}
              color={pulse.monthly_deficit < -40000 ? 'red' : pulse.monthly_deficit < 0 ? 'amber' : 'green'}
              subtitle={pulse.monthly_deficit < 0 ? 'shortfall' : 'surplus'}
            />
            <StatCard label="Open Pipeline" value={fmt(pulse.open_pipeline_value)} />
          </div>
        ) : (
          <p className="text-cult-text-muted text-sm">No financial pulse data available</p>
        )}
      </div>

      {/* Section 2: AR Aging */}
      <div className="bg-cult-surface border border-cult-border rounded-cult p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cult-white" />
            <h2 className="text-lg font-semibold text-cult-white">Accounts Receivable</h2>
          </div>
          <span className="text-xl font-bold text-cult-white font-mono">{fmt(arTotal)}</span>
        </div>

        {/* Aging Buckets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {['current', '1-30', '31-60', '61-90', '90+'].map(bucket => (
            <div key={bucket} className="bg-cult-black/50 rounded-cult p-3 border border-cult-border/50">
              <div className={`text-xs font-medium uppercase ${BUCKET_COLORS[bucket] || 'text-cult-text-muted'}`}>{bucket} days</div>
              <div className="text-cult-white font-mono text-sm mt-1">{fmt(arBuckets[bucket] || 0)}</div>
            </div>
          ))}
        </div>

        {/* Top Overdue */}
        {ar.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm text-cult-text-muted mb-2">Top Overdue</h3>
            <div className="space-y-1">
              {ar.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-cult-black/30">
                  <div>
                    <span className="text-cult-white">{r.customer_name}</span>
                    <span className="text-cult-text-muted ml-2">{r.invoice_number}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${BUCKET_COLORS[r.age_bucket] || 'text-cult-text-muted'}`}>
                      {r.days_outstanding}d
                    </span>
                    <span className="text-cult-white font-mono">{fmt(r.amount_due)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: AP Outstanding */}
      <div className="bg-cult-surface border border-cult-border rounded-cult p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cult-white" />
            <h2 className="text-lg font-semibold text-cult-white">Accounts Payable</h2>
          </div>
          <span className="text-xl font-bold text-cult-white font-mono">{fmt(apTotal)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-cult-black/50 rounded-cult p-3 border border-cult-border/50">
            <div className="text-xs text-cult-text-muted uppercase">COGS Bills</div>
            <div className="text-cult-white font-mono text-sm mt-1">{fmt(apCogs)}</div>
          </div>
          <div className="bg-cult-black/50 rounded-cult p-3 border border-cult-border/50">
            <div className="text-xs text-cult-text-muted uppercase">OpEx Bills</div>
            <div className="text-cult-white font-mono text-sm mt-1">{fmt(apOpex)}</div>
          </div>
          <div className="bg-cult-black/50 rounded-cult p-3 border border-cult-border/50">
            <div className="text-xs text-amber-400 uppercase">Due This Week</div>
            <div className="text-cult-white font-mono text-sm mt-1">
              {apDueSoon.length} bill{apDueSoon.length !== 1 ? 's' : ''}
              {apDueSoon.length > 0 && (
                <span className="text-amber-400 ml-1">
                  ({fmt(apDueSoon.reduce((s, r) => s + Number(r.amount_outstanding), 0))})
                </span>
              )}
            </div>
          </div>
        </div>

        {ap.filter(r => r.days_overdue > 0).length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm text-cult-text-muted mb-2">Overdue</h3>
            <div className="space-y-1">
              {ap.filter(r => r.days_overdue > 0).slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-cult-black/30">
                  <div>
                    <span className="text-cult-white">{r.vendor_name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${r.is_cogs ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>
                      {r.is_cogs ? 'COGS' : 'OpEx'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 text-xs">{r.days_overdue}d overdue</span>
                    <span className="text-cult-white font-mono">{fmt(r.amount_outstanding)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Cost Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Margin */}
        <div className="bg-cult-surface border border-cult-border rounded-cult p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-cult-white">Top 5 — Highest Margin</h2>
          </div>
          {bestStrain && (
            <div className="bg-green-900/20 border border-green-800/40 rounded-cult p-3 mb-3">
              <div className="text-xs text-green-400 uppercase">Most Profitable to Process</div>
              <div className="text-cult-white font-bold mt-1">{bestStrain.strain}</div>
              <div className="text-green-400 text-sm font-mono">{fmtDec(bestStrain.labor_margin_per_gram)}/g margin</div>
            </div>
          )}
          <div className="space-y-1">
            {topStrains.map((s, i) => (
              <div key={s.strain} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-cult-black/30">
                <div className="flex items-center gap-2">
                  <span className="text-cult-text-muted w-4">{i + 1}.</span>
                  <span className="text-cult-white">{s.strain}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-cult-text-muted">cost {fmtDec(s.labor_cost_per_gram)}/g</span>
                  <span className="text-cult-text-muted">rev {fmtDec(s.avg_revenue_per_gram)}/g</span>
                  <span className="text-green-400 font-medium">{fmtDec(s.labor_margin_per_gram)}/g</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Margin */}
        <div className="bg-cult-surface border border-cult-border rounded-cult p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-cult-white">Bottom 5 — Highest Cost</h2>
          </div>
          <div className="space-y-1 mt-10">
            {bottomStrains.map((s, i) => (
              <div key={s.strain} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-cult-black/30">
                <div className="flex items-center gap-2">
                  <span className="text-cult-text-muted w-4">{i + 1}.</span>
                  <span className="text-cult-white">{s.strain}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-cult-text-muted">cost {fmtDec(s.labor_cost_per_gram)}/g</span>
                  <span className="text-cult-text-muted">rev {fmtDec(s.avg_revenue_per_gram)}/g</span>
                  <span className={`font-medium ${s.labor_margin_per_gram != null && s.labor_margin_per_gram < 2 ? 'text-red-400' : 'text-amber-400'}`}>
                    {fmtDec(s.labor_margin_per_gram)}/g
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 5: 280E Snapshot */}
      <div className="bg-cult-surface border border-cult-border rounded-cult p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-cult-white" />
          <h2 className="text-lg font-semibold text-cult-white">280E Tax Snapshot</h2>
        </div>

        {latest280e ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <StatCard label="Revenue" value={fmt(latest280e.total_revenue)} />
              <StatCard label="COGS" value={fmt(latest280e.total_cogs)} />
              <StatCard label="COGS %" value={pct(latest280e.cogs_pct)} />
              <StatCard
                label="280E Penalty"
                value={fmt(latest280e.penalty_280e)}
                color="red"
                subtitle="non-deductible"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-cult-black/50 rounded-cult p-4 border border-cult-border/50">
                <div className="text-xs text-cult-text-muted uppercase">280E Taxable Income</div>
                <div className="text-cult-white font-mono text-lg mt-1">{fmt(latest280e.taxable_income_estimate)}</div>
                <div className="text-xs text-cult-text-muted mt-1">Revenue - COGS only (280E rule)</div>
              </div>
              <div className="bg-cult-black/50 rounded-cult p-4 border border-cult-border/50">
                <div className="text-xs text-cult-text-muted uppercase">Standard Accounting Income</div>
                <div className="text-cult-white font-mono text-lg mt-1">{fmt(latest280e.vs_standard_accounting)}</div>
                <div className="text-xs text-cult-text-muted mt-1">Revenue - all expenses (what it would be)</div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-800/40 rounded-cult">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-200">
                These figures are for operational visibility only. Consult your cannabis CPA for final 280E tax calculations.
                Classification is operator-entered and should be reviewed by your accountant.
              </p>
            </div>
          </>
        ) : (
          <p className="text-cult-text-muted text-sm">No 280E data available. Enter vendor bills to populate.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color?: 'red' | 'amber' | 'green' }) {
  const colorClass = color === 'red' ? 'text-red-400' : color === 'amber' ? 'text-amber-400' : color === 'green' ? 'text-green-400' : 'text-cult-white';
  return (
    <div className="bg-cult-black/50 rounded-cult p-3 border border-cult-border/50">
      <div className="text-xs text-cult-text-muted uppercase">{label}</div>
      <div className={`font-mono text-lg mt-1 ${colorClass}`}>{value}</div>
      {subtitle && <div className="text-xs text-cult-text-muted mt-0.5">{subtitle}</div>}
    </div>
  );
}
