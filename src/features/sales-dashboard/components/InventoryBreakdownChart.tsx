import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardTotals } from '../types';
import { DISPLAY_GROUP_COLORS } from '../types';
import { formatNumber } from '@/shared/utils/format';

interface InventoryBreakdownChartProps {
  totals: DashboardTotals;
}

interface ChartSegment {
  name: string;
  value: number;
  unit: string;
  color: string;
  group: string;
}

export function InventoryBreakdownChart({ totals }: InventoryBreakdownChartProps) {
  const segments: ChartSegment[] = [
    { name: 'Trimmed Flower', value: totals.sellable_flower_grams, unit: 'g', color: DISPLAY_GROUP_COLORS.sellable.flower, group: 'Sellable' },
    { name: 'Trimmed Smalls', value: totals.sellable_smalls_grams, unit: 'g', color: DISPLAY_GROUP_COLORS.sellable.smalls, group: 'Sellable' },
    { name: 'Packaged Flower', value: totals.packaged_units, unit: 'units', color: DISPLAY_GROUP_COLORS.sellable.packaged, group: 'Sellable' },
    { name: 'Pipeline (Binned+Bucked)', value: totals.pipeline_grams, unit: 'g', color: DISPLAY_GROUP_COLORS.pipeline, group: 'Pipeline' },
    { name: 'Trim (Byproduct)', value: totals.byproduct_grams, unit: 'g', color: DISPLAY_GROUP_COLORS.byproduct, group: 'Byproduct' },
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartSegment }> }) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-3 py-2 shadow-xl">
        <div className="text-xs font-medium text-cult-text-primary">{data.name}</div>
        <div className="text-sm font-bold text-cult-text-primary mt-0.5">
          {formatNumber(Math.round(data.value))} {data.unit}
        </div>
        <div className="text-[10px] text-cult-text-muted uppercase tracking-wider mt-0.5">{data.group}</div>
      </div>
    );
  };

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6">
      <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider mb-4">
        Inventory Breakdown by Category
      </h3>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="w-64 h-64 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {segments.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 w-full">
          <div className="space-y-3">
            <LegendGroup label="Sellable" items={segments.filter((s) => s.group === 'Sellable')} />
            <div className="border-t border-cult-border-subtle" />
            <LegendGroup label="Pipeline" items={segments.filter((s) => s.group === 'Pipeline')} />
            <div className="border-t border-cult-border-subtle" />
            <LegendGroup label="Byproduct" items={segments.filter((s) => s.group === 'Byproduct')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendGroup({ label, items }: { label: string; items: ChartSegment[] }) {
  return (
    <div>
      <div className="text-[10px] text-cult-text-muted uppercase tracking-wider font-medium mb-1.5">{label}</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-cult-text-secondary">{item.name}</span>
            </div>
            <span className="text-sm font-medium text-cult-text-primary tabular-nums">
              {formatNumber(Math.round(item.value))} <span className="text-cult-text-muted">{item.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
