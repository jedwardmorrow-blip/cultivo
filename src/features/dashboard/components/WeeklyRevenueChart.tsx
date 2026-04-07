import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { WeeklyRevenue } from '../hooks/useDashboardData';

ChartJS.register(CategoryScale, LinearScale, BarController, LineController, BarElement, LineElement, PointElement, Tooltip, Legend);

interface Props {
  data: WeeklyRevenue[];
  weeklyGoal?: number;
}

export function WeeklyRevenueChart({ data, weeklyGoal = 39500 }: Props) {
  const chartData = {
    labels: data.map(d => d.week),
    datasets: [
      {
        label: 'Weekly Revenue',
        data: data.map(d => d.revenue),
        backgroundColor: data.map(d => {
          if (d.revenue >= 40000) return 'rgba(16, 185, 129, 0.7)';
          if (d.revenue >= 15000) return 'rgba(166, 166, 166, 0.35)';
          return 'rgba(220, 69, 69, 0.45)';
        }),
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: `Weekly Goal ($${(weeklyGoal / 1000).toFixed(1)}K)`,
        data: data.map(() => weeklyGoal),
        type: 'line' as const,
        borderColor: 'rgba(245, 158, 11, 0.5)',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1C1C1C',
        titleColor: '#FFFFFF',
        bodyColor: '#A6A6A6',
        borderColor: '#2E2E2E',
        borderWidth: 1,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => '$' + ctx.parsed.y.toLocaleString(),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => '$' + (v as number / 1000) + 'K',
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
    <div className="glass-card p-6 h-full">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Weekly Revenue — Last {data.length} Weeks
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-surface-overlay text-cult-text-secondary">
          Trend
        </span>
      </div>
      <div className="relative h-[220px]">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}
