/**
 * StrainDetailPanel
 *
 * Slide-out panel showing the full strain profile. This is the genetics
 * library skeleton — organized into sections that will fill in over time.
 * Empty fields show as "awaiting data" rather than being hidden.
 */

import { X, Dna, Leaf, Scissors, Package, TrendingUp, DollarSign, BarChart3, FlaskConical, ShieldCheck, Scale } from 'lucide-react';
import type { StrainProfile } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ label, value, unit, awaiting }: { label: string; value: string | number | null; unit?: string; awaiting?: boolean }) {
  const isEmpty = value === null || value === undefined || value === '—';
  const showAwaiting = isEmpty && awaiting;

  return (
    <div className="flex flex-col">
      <span className="text-xs text-cult-text-muted uppercase tracking-wider mb-1">{label}</span>
      {showAwaiting ? (
        <span className="text-sm text-cult-charcoal italic">Awaiting data</span>
      ) : isEmpty ? (
        <span className="text-sm text-cult-text-muted">—</span>
      ) : (
        <span className="text-sm text-cult-white font-medium">
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
          {unit && <span className="text-cult-text-muted ml-1">{unit}</span>}
        </span>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: typeof Dna; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pt-4 first:pt-0">
      <Icon className="w-4 h-4 text-cult-silver" />
      <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">{label}</h3>
    </div>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function gradeBadgeLg(grade: string | null, confidence: string | null) {
  if (!grade) return null;
  const map: Record<string, string> = {
    CULT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    B: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    D: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  const classes = map[grade] || 'bg-cult-charcoal text-cult-silver border-cult-charcoal';
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-3 py-1 rounded-cult text-sm font-bold border ${classes}`}>
        {grade}
      </span>
      {confidence && (
        <span className="text-xs text-cult-text-muted">{confidence} confidence</span>
      )}
    </div>
  );
}

function runwayStatusBadge(status: string | null, days: number | null) {
  const map: Record<string, { label: string; classes: string }> = {
    critical: { label: 'Critical', classes: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    tight: { label: 'Tight', classes: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    healthy: { label: 'Healthy', classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    surplus: { label: 'Surplus', classes: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    no_demand: { label: 'No Demand', classes: 'bg-cult-charcoal text-cult-silver border-cult-charcoal' },
    no_stock: { label: 'No Stock', classes: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  };
  if (!status || !map[status]) return <span className="text-cult-text-muted text-sm">—</span>;
  const { label, classes } = map[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
        {label}
      </span>
      {days !== null && (
        <span className="text-sm text-cult-silver">{days} days</span>
      )}
    </div>
  );
}

function completenessBar(pct: number) {
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-cult-charcoal rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-cult-silver font-medium">{pct}%</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-cult-charcoal/50 my-2" />;
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface StrainDetailPanelProps {
  profile: StrainProfile;
  onClose: () => void;
}

export function StrainDetailPanel({ profile, onClose }: StrainDetailPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-cult-graphite border-l border-cult-charcoal z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-cult-graphite border-b border-cult-charcoal px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-cult-white">{profile.display_name}</h2>
              <div className="flex items-center gap-3 mt-1">
                {profile.dominance_type && (
                  <span className="text-sm text-cult-silver">{profile.dominance_type}</span>
                )}
                {gradeBadgeLg(profile.suggested_grade, profile.grade_confidence)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-cult-text-muted hover:text-cult-white transition-colors rounded-cult hover:bg-cult-charcoal/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Data completeness */}
          <div className="mt-3">
            <div className="text-xs text-cult-text-muted mb-1">Data Completeness</div>
            {completenessBar(profile.data_completeness)}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-1">

          {/* ── Genetics / Manual Fields ── */}
          <SectionHeader icon={Dna} label="Genetics Profile" />
          <StatGrid>
            <Stat label="Flowering Time" value={profile.flowering_time_days} unit="days" awaiting />
            <Stat label="Veg Duration" value={profile.veg_days_avg} unit="days" awaiting />
            <Stat label="Feed Group" value={profile.feed_group} awaiting />
            <Stat label="Flower Class" value={profile.flowering_time_class} awaiting />
            <Stat label="Category" value={profile.category} />
            <Stat label="Dominance" value={profile.dominance_type} />
          </StatGrid>

          <Divider />

          {/* ── Cultivation Performance ── */}
          <SectionHeader icon={Leaf} label="Cultivation Performance" />
          <StatGrid>
            <Stat label="Harvest Count" value={profile.harvest_count} />
            <Stat label="Last Harvest" value={profile.last_harvest_date} />
            <Stat label="Wet Weight / Plant" value={profile.avg_wet_weight_per_plant_g} unit="g" />
            <Stat label="Wet Weight / sqft" value={profile.avg_wet_g_per_sqft} unit="g" />
          </StatGrid>

          <Divider />

          {/* ── Quality Profile ── */}
          <SectionHeader icon={BarChart3} label="Quality Profile" />
          <StatGrid>
            <Stat label="Big Bud %" value={profile.avg_big_bud_pct != null ? `${profile.avg_big_bud_pct.toFixed(1)}%` : null} />
            <Stat label="Small Bud %" value={profile.avg_small_bud_pct != null ? `${profile.avg_small_bud_pct.toFixed(1)}%` : null} />
            <Stat label="Trim %" value={profile.avg_trim_pct != null ? `${profile.avg_trim_pct.toFixed(1)}%` : null} />
            <Stat label="Waste %" value={profile.avg_waste_pct != null ? `${profile.avg_waste_pct.toFixed(1)}%` : null} />
            <Stat label="THC %" value={profile.avg_thc_pct != null ? `${profile.avg_thc_pct.toFixed(1)}%` : null} />
            <Stat label="Terpenes" value={profile.avg_total_terpenes_mg_g != null ? `${profile.avg_total_terpenes_mg_g.toFixed(1)}` : null} unit="mg/g" />
            <Stat label="COA Count" value={profile.coa_count} />
          </StatGrid>

          <Divider />

          {/* ── Throughput ── */}
          <SectionHeader icon={Scissors} label="Processing Throughput" />
          <StatGrid>
            <Stat label="Trim Speed" value={profile.avg_trim_g_per_hr != null ? profile.avg_trim_g_per_hr.toFixed(0) : null} unit="g/hr" />
            <Stat label="Trim Sessions" value={profile.trim_session_count} />
            <Stat label="Bucking Speed" value={profile.avg_bucking_kg_per_hr != null ? profile.avg_bucking_kg_per_hr.toFixed(2) : null} unit="kg/hr" />
            <Stat label="Bucking Sessions" value={profile.bucking_session_count} />
            <Stat label="Packaging Sessions" value={profile.packaging_session_count} />
            <Stat label="Total Sessions" value={profile.total_session_count} />
            <Stat label="Conversion Confidence" value={profile.conversion_confidence} />
          </StatGrid>

          <Divider />

          {/* ── Rosin / Hash ── */}
          <SectionHeader icon={FlaskConical} label="Rosin & Hash" />
          <StatGrid>
            <Stat label="Avg Rosin Yield" value={profile.avg_rosin_yield_pct != null ? `${profile.avg_rosin_yield_pct.toFixed(1)}%` : null} awaiting />
            <Stat label="Press Runs" value={profile.press_run_count} awaiting />
          </StatGrid>

          <Divider />

          {/* ── Inventory & Demand ── */}
          <SectionHeader icon={Package} label="Inventory & Demand" />
          <StatGrid>
            <Stat label="Sellable Stock" value={profile.total_sellable_lbs != null ? `${profile.total_sellable_lbs.toFixed(1)}` : null} unit="lbs" />
            <Stat label="Full Pipeline" value={profile.total_pipeline_lbs != null ? `${profile.total_pipeline_lbs.toFixed(1)}` : null} unit="lbs" />
            <Stat label="Demand Units" value={profile.demand_total_units != null ? Math.round(profile.demand_total_units) : null} />
            <Stat label="Open Orders" value={profile.order_count != null ? Math.round(profile.order_count) : null} />
          </StatGrid>
          <div className="mt-2">
            <span className="text-xs text-cult-text-muted uppercase tracking-wider mr-2">Runway</span>
            {runwayStatusBadge(profile.runway_status, profile.runway_days)}
          </div>

          <Divider />

          {/* ── Economics ── */}
          <SectionHeader icon={DollarSign} label="Economics" />
          <StatGrid>
            <Stat label="Cost / gram" value={profile.total_cost_per_gram != null ? `$${profile.total_cost_per_gram.toFixed(2)}` : null} />
            <Stat label="Revenue / gram" value={profile.avg_revenue_per_gram != null ? `$${profile.avg_revenue_per_gram.toFixed(2)}` : null} />
            <Stat label="True Margin / gram" value={profile.true_margin_per_gram != null ? `$${profile.true_margin_per_gram.toFixed(2)}` : null} />
          </StatGrid>

          <Divider />

          {/* ── Grading Inventory ── */}
          <SectionHeader icon={Scale} label="Grading Inventory" />
          <StatGrid>
            <Stat label="Inventory Items" value={profile.inventory_item_count} />
            <Stat label="Graded Items" value={profile.graded_count} />
            <Stat label="% Graded" value={profile.pct_graded != null ? `${profile.pct_graded.toFixed(0)}%` : null} />
            <Stat label="Most Common Grade" value={profile.most_common_grade} />
          </StatGrid>

          <Divider />

          {/* ── Variance & QA ── */}
          <SectionHeader icon={ShieldCheck} label="Variance & QA" />
          <StatGrid>
            <Stat label="Avg Variance" value={profile.avg_variance_pct != null ? `${profile.avg_variance_pct.toFixed(1)}%` : null} awaiting />
            <Stat label="Variance Events" value={profile.variance_event_count} awaiting />
            <Stat label="Top Reason" value={profile.most_common_variance_reason} awaiting />
          </StatGrid>

          <Divider />

          {/* ── Future: Room Suitability ── */}
          <SectionHeader icon={TrendingUp} label="Room Suitability" />
          <div className="text-sm text-cult-charcoal italic py-2">
            Coming soon — strain performance will be mapped to specific grow rooms as batch history accumulates
          </div>
        </div>
      </div>
    </>
  );
}
