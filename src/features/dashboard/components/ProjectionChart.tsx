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
import type { HarvestWindow } from '../hooks/useDashboardData';

ChartJS.register(CategoryScale, LinearScale, BarController, LineController, BarElement, LineElement, PointElement, Tooltip, Legend);

interface Props {
  windows: HarvestWindow[];
}

const POST_PROD_RATE = 0.65;  // 71% buck × 92% trim
const PRICE_PER_LB = 2000;

export function ProjectionChart({ windows }: Props) {
  const labels = windows.map(w => {
    const d = new Date(w.date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}\n${w.room}`;
  });

  const dryLbs = windows.map(w => Math.round(w.estDryLbs));
  const postProdLbs = windows.map(w => Math.round(w.estDryLbs * POST_PROD_RATE));
  const revK = windows.map(w => Math.round((w.estDryLbs * POST_PROD_RATE * PRICE_PER_LB) / 1000));

  const totalPlants = windows.reduce((s, w) => s + w.plants, 0);
  const totalDry = dryLbs.reduce((s, v) => s + v, 0);
  const totalPost = postProdLbs.reduce((s, v) => s + v, 0);
  const totalRev = totalPost * PRICE_PER_LB;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Est. Dry Weight (lbs)',
        data: dryLbs,
        backgroundColor: windows.map((w, i) => {
          if (w.isOverdue) return 'rgba(184, 29, 36, 0.6)';
          if (i < 2) return 'rgba(245, 158, 11, 0.6)';
          return 'rgba(166, 166, 166, 0.35)';
        }),
        borderRadius: 4,
        borderSkipped: false as const,
        yAxisID: 'y',
      },
      {
        label: 'Post-prod lbs (65% conv.)',
        data: postProdLbs,
        backgroundColor: windows.map((_, i) =>
          i < 3 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(52, 211, 153, 0.5)'
        ),
        borderRadius: 4,
        borderSkipped: false as const,
        yAxisID: 'y',
      },
      {
        label: 'Revenue Potential ($K)',
        data: revK,
        type: 'line' as const,
        borderColor: 'rgba(245, 158, 11, 0.8)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#F59E0B',
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
          color: '#A6A6A6',
          font: { size: 10, weight: '400' as const },
        },
      },
      tooltip: {
        backgroundColor: '#1C1C1C',
        titleColor: '#FFFFFF',
        bodyColor: '#A6A6A6',
        borderColor: '#2E2E2E',
        borderWidth: 1,
        cornerRadius: 6,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        position: 'left' as const,
        title: { display: true, text: 'Pounds', color: '#666666', font: { size: 10, weight: '400' as const } },
        ticks: { font: { size: 10, weight: '300' as const } },
        grid: { color: 'rgba(46, 46, 46, 0.5)' },
      },
      y1: {
        beginAtZero: true,
        position: 'right' as const,
        title: { display: true, text: 'Revenue ($K)', color: '#666666', font: { size: 10, weight: '400' as const } },
        ticks: {
          callback: (v) => '$' + v + 'K',
          font: { size: 10, weight: '300' as const },
        },
        grid: { drawOnChartArea: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '500' as const } },
      },
    },
  };

  return (
    <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-cult-text-primary">
          Revenue Projection — Harvest to Cash
        </h3>
        <span className="text-[0.625rem] px-2.5 py-0.5 rounded-full font-semibold bg-cult-stage-harvest/10 text-cult-stage-harvest">
          Modeled
        </span>
      </div>

      <div className="relative h-[280px]">
        <Chart type="bar" data={chartData} options={options} />
      </div>

      {/* Projection Table */}
      <div className="mt-3.5">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[0.5625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-1.5 border-b border-cult-border">Window</th>
              <th className="text-left text-[0.5625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-1.5 border-b border-cult-border">Plants</th>
              <th className="text-left text-[0.5625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-1.5 border-b border-cult-border">Est. Dry lbs</th>
              <th className="text-left text-[0.5625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-1.5 border-b border-cult-border">Post-prod lbs*</th>
              <th className="text-right text-[0.5625rem] uppercase tracking-[1px] text-cult-text-muted font-semibold px-2.5 py-1.5 border-b border-cult-border">Rev. Potential</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((w, i) => {
              const pp = Math.round(w.estDryLbs * POST_PROD_RATE);
              const rev = pp * PRICE_PER_LB;
              const d = new Date(w.date);
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` (${w.room})`;
              return (
                <tr key={i} className="hover:bg-cult-surface-overlay">
                  <td className="text-xs px-2.5 py-2 border-b border-cult-border-subtle font-medium" style={{ color: w.isOverdue ? '#B81D24' : i < 2 ? '#F59E0B' : undefined }}>
                    {dateStr}{w.isOverdue ? ' ⚠' : ''}
                  </td>
                  <td className="text-xs px-2.5 py-2 border-b border-cult-border-subtle">{w.plants.toLocaleString()}</td>
                  <td className="text-xs px-2.5 py-2 border-b border-cult-border-subtle">{Math.round(w.estDryLbs)}</td>
                  <td className="text-xs px-2.5 py-2 border-b border-cult-border-subtle">{pp}</td>
                  <td className="text-xs px-2.5 py-2 border-b border-cult-border-subtle text-right font-semibold tabular-nums text-cult-success-bright">
                    ${(rev / 1000).toFixed(0)}K
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-cult-border-strong">
              <td className="text-xs px-2.5 pt-2.5 font-bold">Total</td>
              <td className="text-xs px-2.5 pt-2.5 font-bold">{totalPlants.toLocaleString()}</td>
              <td className="text-xs px-2.5 pt-2.5 font-bold">{totalDry}</td>
              <td className="text-xs px-2.5 pt-2.5 font-bold">{totalPost}</td>
              <td className="text-xs px-2.5 pt-2.5 text-right font-bold text-cult-success-bright text-sm">
                ${(totalRev / 1000).toFixed(0)}K
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 px-3.5 py-2.5 bg-cult-surface-overlay rounded-cult text-[0.6875rem] font-light text-cult-text-secondary border-l-2 border-cult-text-muted">
        *Dry yield: 65g/sqft × 672 sqft per room = ~96 lbs/room. Post-prod: 65% conv. (71% buck × 92% trim). Revenue at $2K/lb avg blend.
      </div>
    </div>
  );
}
