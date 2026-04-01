import { ArrowLeft, AlertTriangle, Beaker, Droplets, Flower2, Clock, Gauge, Scale, Leaf, TrendingUp, Package } from 'lucide-react';
import type { StrainCultivationStats } from '../types';
import { STAGE_HEX } from '../types';
import { CHIP_STAGE_COLORS } from '@/features/cultivation/constants/stageColors';

interface StrainStatsPanelProps {
  strain: StrainCultivationStats;
  onBack: () => void;
}

function MetricCard({ label, value, unit, source, icon: Icon }: {
  label: string;
  value: string | number | null;
  unit?: string;
  source?: string;
  icon?: any;
}) {
  const hasValue = value !== null && value !== undefined;
  return (
    <div className="bg-cult-surface rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-cult-text-muted" />}
        <span className="text-xs text-cult-silver uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-bold ${hasValue ? 'text-cult-white' : 'text-cult-text-muted'}`}>
        {hasValue ? `${value}${unit ?? ''}` : '—'}
      </div>
      {source && <div className="text-[9px] text-cult-text-muted mt-0.5">{source}</div>}
      {!hasValue && <div className="text-[9px] text-cult-text-muted mt-0.5">needs data</div>}
    </div>
  );
}

export function StrainStatsPanel({ strain, onBack }: StrainStatsPanelProps) {
  const lowConfidence = (strain.harvest_count ?? 0) < 3;

  // Feed group / flowering class badge colors
  const feedBadge = strain.feed_group
    ? CHIP_STAGE_COLORS[strain.feed_group === 'heavy' ? 'flower' : strain.feed_group === 'light' ? 'clone' : 'veg'] ?? CHIP_STAGE_COLORS.mixed
    : null;

  const flowerClassBadge = strain.flowering_time_class
    ? CHIP_STAGE_COLORS[strain.flowering_time_class === 'long' ? 'flower' : strain.flowering_time_class === 'fast' ? 'clone' : 'veg'] ?? CHIP_STAGE_COLORS.mixed
    : null;

  // Product allocation bar
  const hasTrimData = strain.avg_big_bud_pct !== null;
  const allocations = hasTrimData
    ? [
        { label: 'Flower', pct: strain.avg_big_bud_pct ?? 0, color: STAGE_HEX.flower },
        { label: 'Smalls', pct: strain.avg_small_bud_pct ?? 0, color: STAGE_HEX.veg },
        { label: 'Trim', pct: strain.avg_trim_pct ?? 0, color: STAGE_HEX.clone },
        { label: 'Waste', pct: strain.avg_waste_pct ?? 0, color: '#6B7280' },
      ]
    : [];

  // Cycle timeline data
  const vegDays = strain.veg_days_avg ?? 28;
  const flowerDays = strain.flowering_time_days ?? 60;
  const dryDays = 12;
  const totalCycle = vegDays + flowerDays + dryDays;
  const cycleSegments = [
    { label: 'Veg', days: vegDays, color: STAGE_HEX.veg },
    { label: 'Flower', days: flowerDays, color: STAGE_HEX.flower },
    { label: 'Dry', days: dryDays, color: '#D97706' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-cult-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-cult-surface text-cult-text-muted hover:text-cult-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-cult-white font-montserrat truncate">{strain.strain_name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {strain.dominance_type && (
              <span className="text-xs text-cult-silver">{strain.dominance_type}</span>
            )}
            {strain.feed_group && feedBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${feedBadge}`}>
                {strain.feed_group}
              </span>
            )}
            {strain.flowering_time_class && flowerClassBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${flowerClassBadge}`}>
                {strain.flowering_time_class}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Confidence warning */}
      {lowConfidence && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-cult-stage-harvest/10 border border-cult-stage-harvest/30">
          <div className="flex items-center gap-2 text-xs text-cult-stage-harvest">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              <span className="font-semibold">Low confidence</span> — only {strain.harvest_count ?? 0} harvest{(strain.harvest_count ?? 0) !== 1 ? 's' : ''} recorded. Metrics are directional.
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* 1. Metrics grid (2x4) */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Flower Time" value={strain.flowering_time_days} unit="d" source="via strain config" icon={Flower2} />
          <MetricCard label="Veg Time" value={strain.veg_days_avg} unit="d" source="via strain config" icon={Leaf} />
          <MetricCard label="Trim Speed" value={strain.avg_trim_grams_per_hour} unit=" g/hr" source="via trim sessions" icon={Gauge} />
          <MetricCard label="Big Bud %" value={strain.avg_big_bud_pct} unit="%" source={strain.trim_session_count ? `via ${strain.trim_session_count} sessions` : undefined} icon={Scale} />
          <MetricCard label="Waste %" value={strain.avg_waste_pct} unit="%" source="via trim sessions" icon={Package} />
          <MetricCard
            label="THC"
            value={strain.avg_thc_pct}
            unit="%"
            source={strain.coa_count ? `via ${strain.coa_count} COA avg` : undefined}
            icon={Beaker}
          />
          <MetricCard label="Yield/sqft" value={strain.avg_wet_g_per_sqft} unit=" g" source="via harvest + room data" icon={TrendingUp} />
          <MetricCard label="Rosin Yield" value={strain.avg_rosin_yield_pct} unit="%" source={strain.press_run_count ? `via ${strain.press_run_count} press runs` : undefined} icon={Droplets} />
        </div>

        {/* THC placeholder */}
        {strain.avg_thc_pct === null && (
          <div className="px-3 py-2 rounded-lg bg-cult-surface text-xs text-cult-text-muted">
            No COA data — upload workflow coming soon
          </div>
        )}

        {/* Rosin placeholder */}
        {strain.avg_rosin_yield_pct === null && (
          <div className="px-3 py-2 rounded-lg bg-cult-surface text-xs text-cult-text-muted">
            Rosin yield — pending data pipeline
          </div>
        )}

        {/* 2. Demand signal */}
        {(strain.demand_unassigned_units !== null || strain.order_count !== null) && (
          <div>
            <h3 className="text-xs font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">Demand Signal</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-cult-surface rounded-lg p-3">
                <div className="text-lg font-bold text-cult-white">{strain.demand_unassigned_units ?? 0}</div>
                <div className="text-xs text-cult-silver">Unassigned units</div>
              </div>
              <div className="bg-cult-surface rounded-lg p-3">
                <div className="text-lg font-bold text-cult-white">{strain.order_count ?? 0}</div>
                <div className="text-xs text-cult-silver">Open orders</div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Product allocation bar */}
        {hasTrimData && (
          <div>
            <h3 className="text-xs font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">Product Allocation</h3>
            <div className="flex h-4 rounded-full overflow-hidden gap-px mb-2">
              {allocations.map((a, i) => (
                <div
                  key={i}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${Math.max(a.pct, 2)}%`, backgroundColor: a.color }}
                  title={`${a.label}: ${a.pct.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-cult-text-muted">
              {allocations.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <span>{a.label} {a.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Cycle timeline mini */}
        <div>
          <h3 className="text-xs font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">Cycle Timeline</h3>
          <div className="flex h-6 rounded-full overflow-hidden gap-px">
            {cycleSegments.map((seg, i) => (
              <div
                key={i}
                className="h-full flex items-center justify-center text-[9px] font-semibold text-white first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(seg.days / totalCycle) * 100}%`, backgroundColor: seg.color }}
              >
                {seg.days}d
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-cult-silver">
            <span>Veg</span>
            <span>Flower</span>
            <span>Dry</span>
          </div>
          <div className="text-center text-xs text-cult-silver mt-1">
            Total cycle: {totalCycle} days
          </div>
        </div>

        {/* 5. Clone supply planning (reference data) */}
        <div>
          <h3 className="text-xs font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">Clone Supply Planning</h3>
          <div className="bg-cult-surface rounded-lg p-3 space-y-1.5 text-xs text-cult-text-secondary">
            <div className="flex justify-between">
              <span>Mother prep time</span>
              <span className="text-cult-white font-medium">4–8 weeks</span>
            </div>
            <div className="flex justify-between">
              <span>Clones per session</span>
              <span className="text-cult-white font-medium">10–30</span>
            </div>
            <div className="flex justify-between">
              <span>Recovery between cuts</span>
              <span className="text-cult-white font-medium">2–3 weeks</span>
            </div>
            <div className="flex justify-between">
              <span>Clone rooting</span>
              <span className="text-cult-white font-medium">10–21 days</span>
            </div>
          </div>
        </div>

        {/* 7. Compatibility notes */}
        <div>
          <h3 className="text-xs font-semibold text-cult-text-secondary uppercase tracking-wide mb-2">Data Coverage</h3>
          <div className="space-y-1 text-xs text-cult-text-muted">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${strain.harvest_count ? 'bg-cult-stage-veg' : 'bg-cult-border'}`} />
              <span>Harvests: {strain.harvest_count ?? 0} recorded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${strain.trim_session_count ? 'bg-cult-stage-veg' : 'bg-cult-border'}`} />
              <span>Trim sessions: {strain.trim_session_count ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${strain.coa_count ? 'bg-cult-stage-veg' : 'bg-cult-border'}`} />
              <span>COA results: {strain.coa_count ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${strain.press_run_count ? 'bg-cult-stage-veg' : 'bg-cult-border'}`} />
              <span>Press runs: {strain.press_run_count ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${strain.conversion_confidence === 'high' ? 'bg-cult-stage-veg' : strain.conversion_confidence === 'medium' ? 'bg-cult-stage-harvest' : 'bg-cult-border'}`} />
              <span>Conversion confidence: {strain.conversion_confidence ?? 'none'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
