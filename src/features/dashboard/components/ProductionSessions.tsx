import {
  Chart as ChartJS,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ProductionStats } from '../hooks/useDashboardData';

ChartJS.register(DoughnutController, ArcElement, Tooltip, Legend);

interface Props {
  data: ProductionStats;
}

export function ProductionSessions({ data }: Props) {
  const chartData = {
    labels: ['Output (lbs)', 'Waste/Variance (lbs)'],
    datasets: [
      {
        data: [data.buckingOutput, data.buckingInput - data.buckingOutput],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(184, 29, 36, 0.35)'],
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
          color: '#A6A6A6',
          font: { size: 11, weight: '400' as const },
        },
      },
      tooltip: {
        backgroundColor: '#1C1C1C',
        titleColor: '#FFFFFF',
        bodyColor: '#A6A6A6',
        borderColor: '#2E2E2E',
        borderWidth: 1,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => ctx.label + ': ' + (ctx.parsed as number).toFixed(1) + ' lbs',
        },
      },
    },
  };

  const stats = [
    {
      label: 'Bucking Sessions',
      value: (
        <>
          <strong>{data.buckingSessions}</strong> ·{' '}
          <span className="text-cult-success-bright">{data.buckingInput.toFixed(1)} lbs</span> in → {data.buckingOutput.toFixed(1)} lbs out
        </>
      ),
    },
    {
      label: 'Trim Sessions',
      value: (
        <>
          <strong>{data.trimSessions}</strong> ·{' '}
          <span className="text-cult-success-bright">{data.trimInput.toFixed(1)} lbs</span> in → {data.trimOutput.toFixed(1)} lbs out
        </>
      ),
    },
    {
      label: 'Bucking Yield',
      value: <span className="text-cult-success-bright">{data.buckingYield.toFixed(1)}%</span>,
    },
    {
      label: 'Trim Yield',
      value: <span className="text-cult-success-bright">{data.trimYield.toFixed(1)}%</span>,
    },
  ];

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary mb-5">
        Production Sessions
      </h3>
      <div className="relative h-[200px]">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="mt-3.5 flex flex-col gap-1.5">
        {stats.map(s => (
          <div key={s.label} className="flex justify-between text-xs px-3 py-2 bg-cult-surface-overlay rounded-cult">
            <span className="text-cult-text-muted font-normal">{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
