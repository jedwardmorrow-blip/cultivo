import type { PipelineSummary } from '../../hooks/useSalesPipeline';
import { formatGrams, STAGE_COLORS, HEALTH_HEX } from './pipelineConstants';
import type { HealthStatus } from '../../hooks/useSalesPipeline';

interface PipelineChartsProps {
  summary: PipelineSummary;
}

function DonutChart({ segments, size = 100, strokeWidth = 12, centerValue, centerLabel }: {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let currentAngle = 0;
  const paths = segments.filter(s => s.value > 0).map((seg, i) => {
    const angle = (seg.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle - 0.5;
    currentAngle += angle;

    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const sx = cx + r * Math.cos(rad(startAngle));
    const sy = cy + r * Math.sin(rad(startAngle));
    const ex = cx + r * Math.cos(rad(endAngle));
    const ey = cy + r * Math.sin(rad(endAngle));
    const large = angle > 180 ? 1 : 0;
    const d = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;

    return <path key={i} d={d} fill="none" stroke={seg.color} strokeWidth={strokeWidth} strokeLinecap="round" />;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e1e" strokeWidth={strokeWidth} />
      {paths}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white text-[15px] font-extrabold">{centerValue}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-neutral-500 text-xs font-bold tracking-wider">{centerLabel}</text>
    </svg>
  );
}

export function PipelineCharts({ summary }: PipelineChartsProps) {
  const t = summary.totals;
  const st = summary.stageTotals;
  const hd = summary.healthDistribution;
  const healthTotal = Object.values(hd).reduce((a, b) => a + b, 0);

  const donutSegments = [
    { label: 'Flower', value: t.sellableFlowerGrams, color: '#22c55e' },
    { label: 'Smalls', value: t.sellableSmallsGrams, color: '#4ade80' },
    { label: 'Packaged', value: t.packagedUnits * 3.5, color: '#065f46' },
  ];

  const pipelineStages = [
    { label: 'Binned', value: st.binned, color: STAGE_COLORS.binned },
    { label: 'Bucked', value: st.bucked, color: STAGE_COLORS.bucked },
    { label: 'Trimmed', value: st.trimmed, color: STAGE_COLORS.trimmed },
    { label: 'Byproduct', value: st.byproduct, color: STAGE_COLORS.byproduct },
  ];
  const pipelineTotal = pipelineStages.reduce((s, p) => s + p.value, 0);

  const healthKeys: HealthStatus[] = ['critical', 'low', 'warning', 'healthy'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="rounded-xl p-4 border border-cult-medium-gray/40 bg-cult-black">
        <div className="text-xs font-bold text-neutral-500 tracking-[0.1em] mb-3">INVENTORY BREAKDOWN</div>
        <div className="flex items-center gap-4">
          <DonutChart
            segments={donutSegments}
            centerValue={formatGrams(t.totalSellableGrams)}
            centerLabel="GRAMS"
          />
          <div className="flex flex-col gap-2">
            {donutSegments.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-neutral-400">{s.label}</span>
                <span className="text-xs font-bold text-neutral-300">{formatGrams(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 border border-cult-medium-gray/40 bg-cult-black">
        <div className="text-xs font-bold text-neutral-500 tracking-[0.1em] mb-3">PIPELINE BY STAGE</div>
        <div className="flex flex-col gap-[10px]">
          {pipelineStages.map((s, i) => {
            const pct = pipelineTotal > 0 ? (s.value / pipelineTotal) * 100 : 0;
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-neutral-400">{s.label}</span>
                  <span className="text-xs font-bold text-neutral-300 tabular-nums">{formatGrams(s.value)}g</span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden bg-neutral-800/50">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl p-4 border border-cult-medium-gray/40 bg-cult-black">
        <div className="text-xs font-bold text-neutral-500 tracking-[0.1em] mb-3">SUPPLY HEALTH</div>
        {healthTotal > 0 && (
          <div className="flex gap-[2px] h-5 rounded-lg overflow-hidden mb-3">
            {healthKeys.map(k => {
              const pct = (hd[k] / healthTotal) * 100;
              return (
                <div
                  key={k}
                  className="flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{ width: `${pct}%`, background: HEALTH_HEX[k] + '22', color: HEALTH_HEX[k] }}
                >
                  {hd[k] > 0 ? hd[k] : ''}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-col gap-[6px]">
          {healthKeys.map(k => (
            <div key={k} className="flex justify-between items-center">
              <div className="flex items-center gap-[6px]">
                <span className="w-[6px] h-[6px] rounded-full" style={{ background: HEALTH_HEX[k] }} />
                <span className="text-xs text-neutral-400 capitalize">{k}</span>
              </div>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: HEALTH_HEX[k] }}>{hd[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
