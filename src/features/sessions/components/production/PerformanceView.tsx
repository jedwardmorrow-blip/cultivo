/**
 * PerformanceView — Analytics bento grid for the Production CommandCenter
 *
 * Tiles: Throughput Trend, Operator Leaderboard, Session Type Breakdown,
 * Variance Report, Completed History
 */

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { TrendingUp, Trophy, PieChart, AlertTriangle, List, ChevronDown } from 'lucide-react';
import {
  GLASS,
  SESSION_TYPE_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_GRID_COLOR,
  formatWeight,
  staggerContainer,
  staggerItem,
} from './constants';
import type { TrimSession, BuckingSession, PackagingSession } from '../../types';

ChartJS.register(
  CategoryScale, LinearScale,
  LineController, BarController, DoughnutController,
  LineElement, BarElement, ArcElement, PointElement,
  Tooltip, Legend,
);

interface PerformanceViewProps {
  trimCompleted: TrimSession[];
  buckingCompleted: BuckingSession[];
  packagingCompleted: PackagingSession[];
  // All completed (not just today) for history — currently hooks give us recent 50
  allTrimCompleted: TrimSession[];
  allBuckingCompleted: BuckingSession[];
  allPackagingCompleted: PackagingSession[];
}

// ═══════════════════════════════════════════════════════════════
// Throughput Trend — 7-day line chart
// ═══════════════════════════════════════════════════════════════

function ThroughputTrend({ trimCompleted, buckingCompleted }: { trimCompleted: TrimSession[]; buckingCompleted: BuckingSession[] }) {
  const { labels, trimData, buckingData } = useMemo(() => {
    const days: string[] = [];
    const trimByDay = new Map<string, number[]>();
    const buckingByDay = new Map<string, number[]>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push(key);
      trimByDay.set(key, []);
      buckingByDay.set(key, []);
    }

    for (const s of trimCompleted) {
      const date = (s as any).session_date;
      if (date && trimByDay.has(date)) {
        const gph = (s as any).grams_per_hour;
        if (gph) trimByDay.get(date)!.push(gph);
      }
    }

    for (const s of buckingCompleted) {
      const date = (s as any).session_date;
      if (date && buckingByDay.has(date)) {
        const kph = (s as any).kg_per_hour;
        if (kph) buckingByDay.get(date)!.push(kph * 1000);
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      labels: days.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })),
      trimData: days.map(d => avg(trimByDay.get(d)!) || null),
      buckingData: days.map(d => avg(buckingByDay.get(d)!) || null),
    };
  }, [trimCompleted, buckingCompleted]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Trim (g/hr)',
        data: trimData,
        borderColor: SESSION_TYPE_COLORS.trim.hex,
        backgroundColor: `${SESSION_TYPE_COLORS.trim.rgba}0.1)`,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: SESSION_TYPE_COLORS.trim.hex,
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: 'Bucking (g/hr)',
        data: buckingData,
        borderColor: SESSION_TYPE_COLORS.bucking.hex,
        backgroundColor: `${SESSION_TYPE_COLORS.bucking.rgba}0.1)`,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: SESSION_TYPE_COLORS.bucking.hex,
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { color: '#A6A6A6', font: { size: 10, weight: '400' }, boxWidth: 12, padding: 12, usePointStyle: true },
      },
      tooltip: { ...CHART_TOOLTIP_STYLE },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#666', font: { size: 10 }, callback: (v) => `${v}` },
        grid: { color: CHART_GRID_COLOR },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666', font: { size: 10 } },
      },
    },
  };

  return (
    <motion.div variants={staggerItem} className={`${GLASS} p-5 col-span-2 row-span-2`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald-400/50" />
        <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Throughput Trend — 7 Days</h3>
      </div>
      <div className="h-[240px]">
        <Line data={chartData} options={options} />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Operator Leaderboard
// ═══════════════════════════════════════════════════════════════

interface OperatorRow {
  name: string;
  type: 'trim' | 'bucking' | 'packaging';
  avgThroughput: number;
  sessions: number;
  totalOutput: number;
}

function OperatorLeaderboard({ trimCompleted, buckingCompleted, packagingCompleted }: {
  trimCompleted: TrimSession[]; buckingCompleted: BuckingSession[]; packagingCompleted: PackagingSession[];
}) {
  const [filter, setFilter] = useState<'all' | 'trim' | 'bucking' | 'packaging'>('all');

  const operators = useMemo<OperatorRow[]>(() => {
    const map = new Map<string, { throughputs: number[]; sessions: number; output: number; type: 'trim' | 'bucking' | 'packaging' }>();

    for (const s of trimCompleted) {
      const name = (s as any).trimmer_name || 'Unknown';
      const entry = map.get(`trim-${name}`) || { throughputs: [], sessions: 0, output: 0, type: 'trim' as const };
      entry.sessions++;
      if ((s as any).grams_per_hour) entry.throughputs.push((s as any).grams_per_hour);
      entry.output += ((s as any).big_buds_grams || 0) + ((s as any).small_buds_grams || 0);
      map.set(`trim-${name}`, entry);
    }

    for (const s of buckingCompleted) {
      const name = (s as any).bucker_name || 'Unknown';
      const entry = map.get(`bucking-${name}`) || { throughputs: [], sessions: 0, output: 0, type: 'bucking' as const };
      entry.sessions++;
      if ((s as any).kg_per_hour) entry.throughputs.push((s as any).kg_per_hour * 1000);
      entry.output += ((s as any).bucked_flower_grams || 0) + ((s as any).bucked_smalls_grams || 0);
      map.set(`bucking-${name}`, entry);
    }

    for (const s of packagingCompleted) {
      const name = (s as any).packager_name || 'Unknown';
      const entry = map.get(`packaging-${name}`) || { throughputs: [], sessions: 0, output: 0, type: 'packaging' as const };
      entry.sessions++;
      if ((s as any).units_per_hour) entry.throughputs.push((s as any).units_per_hour);
      entry.output += (s as any).ending_weight || 0;
      map.set(`packaging-${name}`, entry);
    }

    return [...map.entries()]
      .map(([key, val]) => ({
        name: key.replace(/^(trim|bucking|packaging)-/, ''),
        type: val.type,
        avgThroughput: val.throughputs.length > 0 ? val.throughputs.reduce((a, b) => a + b, 0) / val.throughputs.length : 0,
        sessions: val.sessions,
        totalOutput: val.output,
      }))
      .filter(o => filter === 'all' || o.type === filter)
      .sort((a, b) => b.avgThroughput - a.avgThroughput);
  }, [trimCompleted, buckingCompleted, packagingCompleted, filter]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div variants={staggerItem} className={`${GLASS} p-5 col-span-2`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400/50" />
          <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Leaderboard — Today</h3>
        </div>
        <div className="flex gap-1">
          {(['all', 'trim', 'bucking', 'packaging'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                filter === f ? 'bg-cult-surface-overlay text-cult-text-secondary' : 'text-cult-text-faint hover:text-cult-text-muted'
              }`}
            >
              {f === 'all' ? 'All' : SESSION_TYPE_COLORS[f].label}
            </button>
          ))}
        </div>
      </div>

      {operators.length === 0 ? (
        <p className="text-xs text-white/20 text-center py-6">No completed sessions today</p>
      ) : (
        <div className="space-y-1">
          {operators.slice(0, 10).map((op, i) => {
            const color = SESSION_TYPE_COLORS[op.type];
            return (
              <div
                key={`${op.type}-${op.name}`}
                className="flex items-center gap-3 px-3 py-2 rounded bg-cult-surface-inset border border-cult-border-faint"
              >
                <span className="w-5 text-center text-sm">{i < 3 ? medals[i] : <span className="text-[10px] text-white/20">{i + 1}</span>}</span>
                <span className="text-xs text-white/60 flex-1 truncate">{op.name}</span>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.hex }} />
                <span className="text-xs font-semibold text-white/70 tabular-nums w-16 text-right">
                  {op.type === 'packaging' ? `${op.avgThroughput.toFixed(0)} u/hr` : `${op.avgThroughput.toFixed(0)} g/hr`}
                </span>
                <span className="text-[10px] text-white/25 w-6 text-right">{op.sessions}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Session Type Breakdown — donut
// ═══════════════════════════════════════════════════════════════

function TypeBreakdown({ trimCount, buckingCount, packagingCount }: { trimCount: number; buckingCount: number; packagingCount: number }) {
  const total = trimCount + buckingCount + packagingCount;

  const chartData = {
    labels: ['Trim', 'Bucking', 'Packaging'],
    datasets: [{
      data: [trimCount, buckingCount, packagingCount],
      backgroundColor: [
        `${SESSION_TYPE_COLORS.trim.rgba}0.7)`,
        `${SESSION_TYPE_COLORS.bucking.rgba}0.7)`,
        `${SESSION_TYPE_COLORS.packaging.rgba}0.7)`,
      ],
      borderWidth: 0,
    }],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#A6A6A6', font: { size: 10 }, padding: 8, usePointStyle: true, pointStyleWidth: 8 },
      },
      tooltip: { ...CHART_TOOLTIP_STYLE },
    },
  };

  return (
    <motion.div variants={staggerItem} className={`${GLASS} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <PieChart className="w-4 h-4 text-white/30" />
        <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">By Type</h3>
      </div>
      {total === 0 ? (
        <p className="text-xs text-white/20 text-center py-6">No data</p>
      ) : (
        <div className="h-[160px]">
          <Doughnut data={chartData} options={options} />
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Variance Summary
// ═══════════════════════════════════════════════════════════════

function VarianceSummary({ trimCompleted, buckingCompleted }: { trimCompleted: TrimSession[]; buckingCompleted: BuckingSession[] }) {
  const { totalInput, totalOutput, wasteG } = useMemo(() => {
    let input = 0;
    let output = 0;
    let waste = 0;

    for (const s of trimCompleted) {
      input += (s as any).pulled_weight || (s as any).pull_weight || 0;
      output += ((s as any).big_buds_grams || 0) + ((s as any).small_buds_grams || 0) + ((s as any).trim_grams || 0);
      waste += (s as any).waste_grams || 0;
    }

    for (const s of buckingCompleted) {
      input += (s as any).binned_weight_grams || 0;
      output += ((s as any).bucked_flower_grams || 0) + ((s as any).bucked_smalls_grams || 0);
      waste += (s as any).waste_grams || 0;
    }

    return { totalInput: input, totalOutput: output, wasteG: waste };
  }, [trimCompleted, buckingCompleted]);

  const yieldPct = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;
  const wastePct = totalInput > 0 ? (wasteG / totalInput) * 100 : 0;

  return (
    <motion.div variants={staggerItem} className={`${GLASS} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-white/30" />
        <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Variance</h3>
      </div>

      {totalInput === 0 ? (
        <p className="text-xs text-white/20 text-center py-6">No data</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/35">Input</span>
            <span className="text-white/60 font-medium">{formatWeight(totalInput)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/35">Output</span>
            <span className="text-white/60 font-medium">{formatWeight(totalOutput)}</span>
          </div>
          <div className="h-px bg-cult-border-subtle" />
          <div className="flex justify-between text-xs">
            <span className="text-white/35">Yield</span>
            <span className={`font-semibold ${yieldPct >= 80 ? 'text-emerald-400' : yieldPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {yieldPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/35">Waste</span>
            <span className="text-red-400/70">{formatWeight(wasteG)} ({wastePct.toFixed(1)}%)</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Completed History — paginated table
// ═══════════════════════════════════════════════════════════════

interface HistoryRow {
  id: string;
  type: 'trim' | 'bucking' | 'packaging';
  date: string;
  worker: string;
  strain: string;
  inputWeight: number;
  outputWeight: number;
  throughput: number;
}

function CompletedHistory({ allTrim, allBucking, allPackaging }: {
  allTrim: TrimSession[]; allBucking: BuckingSession[]; allPackaging: PackagingSession[];
}) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'trim' | 'bucking' | 'packaging'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const rows = useMemo<HistoryRow[]>(() => {
    const result: HistoryRow[] = [];

    for (const s of allTrim) {
      result.push({
        id: s.id,
        type: 'trim',
        date: (s as any).session_date || '',
        worker: (s as any).trimmer_name || '',
        strain: (s as any).strain || '',
        inputWeight: (s as any).pulled_weight || (s as any).pull_weight || 0,
        outputWeight: ((s as any).big_buds_grams || 0) + ((s as any).small_buds_grams || 0),
        throughput: (s as any).grams_per_hour || 0,
      });
    }

    for (const s of allBucking) {
      result.push({
        id: s.id,
        type: 'bucking',
        date: (s as any).session_date || '',
        worker: (s as any).bucker_name || '',
        strain: (s as any).strain || '',
        inputWeight: (s as any).binned_weight_grams || 0,
        outputWeight: ((s as any).bucked_flower_grams || 0) + ((s as any).bucked_smalls_grams || 0),
        throughput: (s as any).kg_per_hour ? (s as any).kg_per_hour * 1000 : 0,
      });
    }

    for (const s of allPackaging) {
      result.push({
        id: s.id,
        type: 'packaging',
        date: (s as any).session_date || '',
        worker: (s as any).packager_name || '',
        strain: (s as any).strain || '',
        inputWeight: (s as any).pull_weight || 0,
        outputWeight: (s as any).ending_weight || 0,
        throughput: (s as any).units_per_hour || 0,
      });
    }

    return result
      .filter(r => typeFilter === 'all' || r.type === typeFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allTrim, allBucking, allPackaging, typeFilter]);

  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <motion.div variants={staggerItem} className={`${GLASS} p-5 col-span-2 row-span-2`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-white/30" />
          <h3 className="text-[11px] text-white/40 uppercase tracking-widest font-medium">Completed History</h3>
          <span className="text-[10px] text-white/20">{rows.length}</span>
        </div>
        <div className="flex gap-1">
          {(['all', 'trim', 'bucking', 'packaging'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => { setTypeFilter(f); setPage(0); }}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                typeFilter === f ? 'bg-cult-surface-overlay text-cult-text-secondary' : 'text-cult-text-faint hover:text-cult-text-muted'
              }`}
            >
              {f === 'all' ? 'All' : SESSION_TYPE_COLORS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-cult-text-faint border-b border-cult-border-subtle">
              <th className="text-left pb-2 font-medium">Date</th>
              <th className="text-left pb-2 font-medium">Operator</th>
              <th className="text-left pb-2 font-medium">Strain</th>
              <th className="text-left pb-2 font-medium">Type</th>
              <th className="text-right pb-2 font-medium">Input</th>
              <th className="text-right pb-2 font-medium">Output</th>
              <th className="text-right pb-2 font-medium">Speed</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const color = SESSION_TYPE_COLORS[row.type];
              return (
                <tr key={row.id} className="border-b border-cult-border-faint text-cult-text-secondary">
                  <td className="py-1.5 text-white/30">{row.date}</td>
                  <td className="py-1.5">{row.worker}</td>
                  <td className="py-1.5">{row.strain}</td>
                  <td className="py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: color.hex }} />
                    {color.label}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatWeight(row.inputWeight)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatWeight(row.outputWeight)}</td>
                  <td className="py-1.5 text-right tabular-nums font-medium text-white/60">
                    {row.type === 'packaging' ? `${row.throughput.toFixed(0)} u/hr` : `${row.throughput.toFixed(0)} g/hr`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-cult-border-faint">
          <span className="text-[10px] text-white/20">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="text-[10px] px-2 py-1 rounded-lg text-white/30 hover:text-white/50 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="text-[10px] px-2 py-1 rounded-lg text-white/30 hover:text-white/50 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════

export function PerformanceView({
  trimCompleted,
  buckingCompleted,
  packagingCompleted,
  allTrimCompleted,
  allBuckingCompleted,
  allPackagingCompleted,
}: PerformanceViewProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-4 gap-4"
    >
      {/* Large: Throughput Trend */}
      <ThroughputTrend trimCompleted={allTrimCompleted} buckingCompleted={allBuckingCompleted} />

      {/* Medium: Leaderboard */}
      <OperatorLeaderboard
        trimCompleted={trimCompleted}
        buckingCompleted={buckingCompleted}
        packagingCompleted={packagingCompleted}
      />

      {/* Small: Type Breakdown */}
      <TypeBreakdown
        trimCount={trimCompleted.length}
        buckingCount={buckingCompleted.length}
        packagingCount={packagingCompleted.length}
      />

      {/* Small: Variance */}
      <VarianceSummary trimCompleted={trimCompleted} buckingCompleted={buckingCompleted} />

      {/* Large: Completed History */}
      <CompletedHistory
        allTrim={allTrimCompleted}
        allBucking={allBuckingCompleted}
        allPackaging={allPackagingCompleted}
      />
    </motion.div>
  );
}
