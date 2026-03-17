import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { MonthlyRevenue } from '../hooks/useDashboardData';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

interface Props {
  data: MonthlyRevenue[];
  goal?: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1C1C1C',
  titleColor: '#FFFFFF',
  bodyColor: '#A6A6A6',
  borderColor: '#2E2E2E',
  borderWidth: 1,
  cornerRadius: 6,
};

export function RevenueChart({ data, goal = 158000 }: Props) {
  const best = Math.max(...data.map(d => d.revenue));
  const pastMonths = data.slice(0, -1).filter(d => d.revenue > 0);
  const avg = pastMonths.length > 0
    ? pastMonths.reduce((s, d) => s + d.revenue, 0) / pastMonths.length
    : 0;

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(d => d.revenue),
        backgroundColor: data.map((d, i) => {
          if (d.revenue === best) return 'rgba(52, 211, 153, 0.75)';
          if (i === data.length - 1) return 'rgba(184, 29, 36, 0.6)';
          return 'rgba(166, 166, 166, 0.4)';
        }),
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: 'Monthly Goal',
        data: data.map(() => goal),
        type: 'line' as const,
        borderColor: 'rgba(245, 158, 11, 0.6)',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: any) => '$' + ctx.parsed.y.toLocaleString(),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v: any) => '$' + (v / 1000) + 'K',
          font: { size: 11, weight: '300' as const },
        },
        grid: { color: 'rgba(46, 46, 46, 0.5)' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: '500' as const } },
      },
    },
  };

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Revenue Trend
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-success/10 text-cult-success-bright">
          6-month view
        </span>
      </div>
      <div className="relative h-[260px]">
        <Chart type="bar" data={chartData} options={options as any} />
      </div>
      <div className="mt-3 flex gap-5 text-[0.6875rem] text-cult-text-muted font-light">
        <div>
          Avg: <strong className="text-cult-text-primary font-semibold">${(avg / 1000).toFixed(1)}K</strong>
        </div>
        <div>
          Best: <strong className="text-cult-success-bright font-semibold">${(best / 1000).toFixed(1)}K</strong>
        </div>
        <div>
          Goal: <strong className="text-cult-stage-harvest font-semibold">${(goal / 1000).toFixed(0)}K</strong>
        </div>
      </div>
    </div>
  );
}
