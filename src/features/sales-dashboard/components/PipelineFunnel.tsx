import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { DashboardTotals } from '../types';
import { formatNumber } from '@/shared/utils/format';

interface PipelineFunnelProps {
  totals: DashboardTotals;
}

interface FunnelStage {
  name: string;
  value: number;
  unit: string;
  color: string;
  pctOfPrevious: string | null;
}

export function PipelineFunnel({ totals }: PipelineFunnelProps) {
  const stages: FunnelStage[] = [
    {
      name: 'Pipeline',
      value: totals.pipeline_grams,
      unit: 'g',
      color: '#3b82f6',
      pctOfPrevious: null,
    },
    {
      name: 'Sellable',
      value: totals.total_sellable_grams,
      unit: 'g',
      color: '#22c55e',
      pctOfPrevious: `${((totals.total_sellable_grams / totals.pipeline_grams) * 100).toFixed(1)}%`,
    },
    {
      name: 'Packaged',
      value: totals.packaged_units,
      unit: 'units',
      color: '#86efac',
      pctOfPrevious: null,
    },
    {
      name: 'Demanded',
      value: totals.active_orders,
      unit: 'orders',
      color: '#f97316',
      pctOfPrevious: null,
    },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: FunnelStage }> }) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg px-3 py-2 shadow-xl">
        <div className="text-xs font-medium text-cult-text-primary">{data.name}</div>
        <div className="text-sm font-bold text-cult-text-primary mt-0.5">
          {formatNumber(Math.round(data.value))} {data.unit}
        </div>
        {data.pctOfPrevious && (
          <div className="text-[10px] text-cult-text-muted mt-0.5">
            {data.pctOfPrevious} of pipeline
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6">
      <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider mb-2">
        Pipeline Funnel
      </h3>
      <p className="text-xs text-cult-text-muted mb-5">
        From raw material in processing through to packaged product and active demand
      </p>

      <div className="hidden sm:block">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} layout="vertical" barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, maxValue * 1.15]}
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                axisLine={{ stroke: '#262626' }}
                tickLine={false}
                tickFormatter={(v: number) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                  return String(v);
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#fafafa', fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {stages.map((stage) => (
                  <Cell key={stage.name} fill={stage.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => formatNumber(Math.round(v))}
                  style={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sm:hidden space-y-3">
        {stages.map((stage) => {
          const widthPct = Math.max((stage.value / maxValue) * 100, 8);
          return (
            <div key={stage.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-cult-text-primary">{stage.name}</span>
                <span className="text-xs text-cult-text-muted tabular-nums">
                  {formatNumber(Math.round(stage.value))} {stage.unit}
                </span>
              </div>
              <div className="h-6 bg-cult-surface-sunken rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
                />
              </div>
              {stage.pctOfPrevious && (
                <div className="text-[10px] text-cult-text-faint mt-0.5">{stage.pctOfPrevious} of pipeline</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
