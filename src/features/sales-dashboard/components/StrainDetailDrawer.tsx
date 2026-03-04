import { useEffect, useRef } from 'react';
import { X, Package, Wheat, TrendingUp, Leaf } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StrainSupplyDemand, SupplyHealthStatus } from '../types';
import { SUPPLY_HEALTH_COLORS } from '../types';
import { dashboardData } from '../data';
import { HealthBadge } from './HealthBadge';
import { formatNumber, formatCurrency } from '@/shared/utils/format';

interface StrainDetailDrawerProps {
  strain: StrainSupplyDemand;
  onClose: () => void;
}

const HEALTH_DESCRIPTIONS: Record<SupplyHealthStatus, string> = {
  critical: 'Demand exists but there is zero sellable supply. This strain needs immediate production attention or order renegotiation.',
  low: 'Packaged units cover less than 50% of current demand. Production should prioritize this strain.',
  warning: 'Packaged units are below demand but above 50%. Monitor closely and consider ramping production.',
  healthy: 'Supply meets or exceeds current demand. No immediate action needed.',
};

export function StrainDetailDrawer({ strain, onClose }: StrainDetailDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const totalSellable = strain.sellable_flower_grams + strain.sellable_smalls_grams;

  const chartData = [
    { name: 'Flower', supply: strain.sellable_flower_grams, demand: strain.demand_bulk_flower_qty },
    { name: 'Smalls', supply: strain.sellable_smalls_grams, demand: strain.demand_bulk_smalls_qty },
    { name: 'Packaged', supply: strain.packaged_units, demand: strain.demand_packaged_units },
  ];

  const healthColor = SUPPLY_HEALTH_COLORS[strain.supply_health];
  const gradeInfo = dashboardData.grade_system.grades.find((g) => g.code === 'UNDEFINED')!;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-3 py-2 shadow-xl">
        <div className="text-xs font-medium text-cult-text-primary mb-1">{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-cult-text-muted capitalize">{entry.dataKey}:</span>
            <span className="font-medium text-cult-text-primary">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-cult-surface border-l border-cult-border shadow-2xl animate-slide-in overflow-y-auto">
        <div className="sticky top-0 z-10 bg-cult-surface border-b border-cult-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-cult-text-primary">{strain.strain}</h2>
            <div className="flex items-center gap-2 mt-1">
              <HealthBadge status={strain.supply_health} size="md" />
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${gradeInfo.tailwind_bg} ${gradeInfo.tailwind_text} ${gradeInfo.tailwind_border}`}
              >
                {gradeInfo.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-overlay transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div
            className="p-3 rounded-cult text-sm leading-relaxed"
            style={{ backgroundColor: `${healthColor}10`, color: healthColor, borderLeft: `3px solid ${healthColor}` }}
          >
            {HEALTH_DESCRIPTIONS[strain.supply_health]}
          </div>

          <Section title="Supply Breakdown" icon={<Package className="w-4 h-4" />}>
            <MetricRow label="Trimmed Flower" value={`${formatNumber(strain.sellable_flower_grams)} g`} />
            <MetricRow label="Trimmed Smalls" value={`${formatNumber(strain.sellable_smalls_grams)} g`} />
            <MetricRow label="Total Sellable" value={`${formatNumber(Math.round(totalSellable))} g`} highlight />
            <MetricRow label="Packaged Units" value={formatNumber(strain.packaged_units)} />
            <div className="border-t border-cult-border-subtle my-1" />
            <MetricRow label="Pipeline" value={`${formatNumber(strain.pipeline_grams)} g`} muted />
            <MetricRow label="Byproduct (Trim)" value={`${formatNumber(strain.byproduct_grams)} g`} muted />
          </Section>

          <Section title="Demand Detail" icon={<TrendingUp className="w-4 h-4" />}>
            <MetricRow label="Packaged Demand" value={`${formatNumber(strain.demand_packaged_units)} units`} />
            <MetricRow label="Bulk Flower Demand" value={String(strain.demand_bulk_flower_qty)} />
            <MetricRow label="Bulk Smalls Demand" value={String(strain.demand_bulk_smalls_qty)} />
            <div className="border-t border-cult-border-subtle my-1" />
            <MetricRow label="Total Revenue" value={formatCurrency(strain.total_demand_revenue)} highlight />
            <MetricRow label="Active Orders" value={String(strain.total_orders)} />
          </Section>

          <Section title="Supply vs Demand" icon={<Leaf className="w-4 h-4" />}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    axisLine={{ stroke: '#262626' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    axisLine={{ stroke: '#262626' }}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="square"
                    iconSize={8}
                    formatter={(value: string) => <span className="text-cult-text-muted capitalize">{value}</span>}
                  />
                  <Bar dataKey="supply" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="demand" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Pipeline Detail" icon={<Wheat className="w-4 h-4" />}>
            {strain.pipeline_grams > 0 ? (
              <div className="text-xs text-cult-text-secondary">
                <span className="font-medium text-blue-400">{formatNumber(strain.pipeline_grams)} g</span>{' '}
                of material in processing pipeline (binned + bucked). This material is not yet available for sale
                but represents future sellable inventory once processing completes.
              </div>
            ) : (
              <div className="text-xs text-cult-text-muted italic">
                No material currently in the processing pipeline for this strain.
              </div>
            )}
            {strain.byproduct_grams > 0 && (
              <div className="text-xs text-cult-text-secondary mt-2">
                <span className="font-medium text-amber-400">{formatNumber(strain.byproduct_grams)} g</span>{' '}
                of trim byproduct. This is not sellable as flower and is tracked separately.
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-cult-text-muted">{icon}</span>
        <h3 className="text-xs font-semibold text-cult-text-primary uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function MetricRow({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-xs ${muted ? 'text-cult-text-faint' : 'text-cult-text-muted'}`}>{label}</span>
      <span className={`text-xs tabular-nums ${highlight ? 'font-semibold text-cult-text-primary' : muted ? 'text-cult-text-faint' : 'font-medium text-cult-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}
