import { useState, useMemo } from 'react';
import {
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
  Dna, Target, TrendingUp, TrendingDown, BarChart3
} from 'lucide-react';
import { useStrainMetrics, type StrainYieldMetrics } from '../hooks/useStrainMetrics';
import { useBatchPredictions, type BatchPrediction } from '../hooks/useBatchPredictions';

function formatGrams(g: number | null): string {
  if (g == null) return '—';
  if (g >= 1000) return `${(g / 1000).toFixed(1)} kg`;
  return `${Math.round(g)} g`;
}

function formatPct(v: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function VariancePill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-cult-charcoal text-[10px]">—</span>;
  const pct = (value * 100).toFixed(1);
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${
      isPositive ? 'text-cult-success bg-cult-success-muted' : 'text-cult-warning bg-cult-warning-muted'
    }`}>
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isPositive ? '+' : ''}{pct}%
    </span>
  );
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-cult-success-muted text-cult-success border-cult-success/30',
  medium: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30',
  low: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30',
  fallback: 'bg-cult-charcoal/30 text-cult-lighter-gray border-cult-charcoal/50',
};

type SortField = 'strain' | 'harvests' | 'wet_per_plant' | 'dry_ratio' | 'buck_yield' | 'trim_yield' | 'overall';

function StrainMetricsTable({ metrics }: { metrics: StrainYieldMetrics[] }) {
  const [sortField, setSortField] = useState<SortField>('harvests');
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...metrics].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'strain': cmp = a.strain.localeCompare(b.strain); break;
        case 'harvests': cmp = a.harvest_batch_count - b.harvest_batch_count; break;
        case 'wet_per_plant': cmp = (a.avg_wet_per_plant || 0) - (b.avg_wet_per_plant || 0); break;
        case 'dry_ratio': cmp = (a.avg_dry_wet_ratio || 0) - (b.avg_dry_wet_ratio || 0); break;
        case 'buck_yield': cmp = (a.avg_buck_yield_ratio || 0) - (b.avg_buck_yield_ratio || 0); break;
        case 'trim_yield': cmp = (a.avg_trim_yield_ratio || 0) - (b.avg_trim_yield_ratio || 0); break;
        case 'overall': cmp = (a.avg_overall_conversion_ratio || 0) - (b.avg_overall_conversion_ratio || 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [metrics, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-[9px] uppercase tracking-wider font-montserrat font-bold hover:text-cult-silver transition-colors ${
        sortField === field ? 'text-cult-off-white' : 'text-cult-charcoal'
      } ${className}`}
    >
      {label}
      {sortField === field && (sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
    </button>
  );

  return (
    <div className="bg-cult-near-black/50 rounded-cult border border-cult-charcoal/30 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-7 gap-2 px-4 py-3 border-b border-cult-charcoal/40 bg-cult-black/30">
        <SortHeader field="strain" label="Strain" />
        <SortHeader field="harvests" label="Harvests" className="text-right justify-end" />
        <SortHeader field="wet_per_plant" label="Wet/Plant" className="text-right justify-end" />
        <SortHeader field="dry_ratio" label="Dry Ratio" className="text-right justify-end" />
        <SortHeader field="buck_yield" label="Buck Yield" className="text-right justify-end" />
        <SortHeader field="trim_yield" label="Trim Yield" className="text-right justify-end" />
        <SortHeader field="overall" label="Overall" className="text-right justify-end" />
      </div>

      {/* Table rows */}
      {sorted.length === 0 ? (
        <div className="px-4 py-8 text-center text-cult-charcoal text-[11px] uppercase tracking-widest font-montserrat">
          No strain yield data yet
        </div>
      ) : (
        sorted.map(m => (
          <div key={m.strain}>
            <button
              onClick={() => setExpanded(expanded === m.strain ? null : m.strain)}
              className="w-full grid grid-cols-7 gap-2 px-4 py-2.5 text-[11px] hover:bg-cult-charcoal/20 transition-colors border-b border-cult-charcoal/10"
            >
              <span className="text-cult-off-white font-medium text-left truncate">{m.strain}</span>
              <span className="text-cult-silver text-right">{m.harvest_batch_count}</span>
              <span className="text-cult-silver text-right">{m.avg_wet_per_plant ? `${Number(m.avg_wet_per_plant).toFixed(0)}g` : '—'}</span>
              <span className="text-cult-silver text-right">{formatPct(m.avg_dry_wet_ratio)}</span>
              <span className="text-cult-silver text-right">{formatPct(m.avg_buck_yield_ratio)}</span>
              <span className="text-cult-silver text-right">{formatPct(m.avg_trim_yield_ratio)}</span>
              <span className={`text-right font-medium ${m.avg_overall_conversion_ratio ? 'text-cult-off-white' : 'text-cult-charcoal'}`}>
                {formatPct(m.avg_overall_conversion_ratio)}
              </span>
            </button>

            {expanded === m.strain && (
              <div className="px-4 py-3 bg-cult-black/40 border-b border-cult-charcoal/20">
                <div className="grid grid-cols-3 gap-4 text-[10px]">
                  <div className="space-y-1.5">
                    <p className="text-cult-charcoal uppercase tracking-wider font-montserrat font-bold text-[9px]">Harvest</p>
                    <p className="text-cult-lighter-gray">Batches: <span className="text-cult-silver">{m.harvest_batch_count}</span></p>
                    <p className="text-cult-lighter-gray">Avg Wet/Plant: <span className="text-cult-silver">{m.avg_wet_per_plant ? `${Number(m.avg_wet_per_plant).toFixed(0)}g` : '—'}</span></p>
                    {m.stddev_wet_per_plant && (
                      <p className="text-cult-lighter-gray">Std Dev: <span className="text-cult-silver">±{Number(m.stddev_wet_per_plant).toFixed(0)}g</span></p>
                    )}
                    <p className="text-cult-lighter-gray">Wet/SqFt: <span className="text-cult-silver">{m.avg_wet_per_sqft_room ? `${Number(m.avg_wet_per_sqft_room).toFixed(1)}g` : '—'}</span></p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-cult-charcoal uppercase tracking-wider font-montserrat font-bold text-[9px]">Drying → Bucking</p>
                    <p className="text-cult-lighter-gray">Dry:Wet: <span className="text-cult-silver">{formatPct(m.avg_dry_wet_ratio)}</span></p>
                    {m.stddev_dry_wet_ratio && (
                      <p className="text-cult-lighter-gray">Std Dev: <span className="text-cult-silver">±{(Number(m.stddev_dry_wet_ratio) * 100).toFixed(1)}%</span></p>
                    )}
                    <p className="text-cult-lighter-gray">Buck Batches: <span className="text-cult-silver">{m.bucking_batch_count}</span></p>
                    <p className="text-cult-lighter-gray">Flower Ratio: <span className="text-cult-silver">{formatPct(m.avg_buck_flower_ratio)}</span></p>
                    <p className="text-cult-lighter-gray">Smalls Ratio: <span className="text-cult-silver">{formatPct(m.avg_buck_smalls_ratio)}</span></p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-cult-charcoal uppercase tracking-wider font-montserrat font-bold text-[9px]">Trimming</p>
                    <p className="text-cult-lighter-gray">Trim Batches: <span className="text-cult-silver">{m.trim_batch_count}</span></p>
                    <p className="text-cult-lighter-gray">Bigs Ratio: <span className="text-cult-silver">{formatPct(m.avg_trim_bigs_ratio)}</span></p>
                    <p className="text-cult-lighter-gray">Smalls Ratio: <span className="text-cult-silver">{formatPct(m.avg_trim_smalls_ratio)}</span></p>
                    <p className="text-cult-lighter-gray">Overall Conv: <span className="text-cult-off-white font-medium">{formatPct(m.avg_overall_conversion_ratio)}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ActivePredictionsGrid({ predictions }: { predictions: Map<string, BatchPrediction> }) {
  const preds = useMemo(() => {
    return [...predictions.values()]
      .filter(p => p.plant_count > 0)
      .sort((a, b) => a.batch_number.localeCompare(b.batch_number));
  }, [predictions]);

  if (preds.length === 0) {
    return (
      <div className="p-6 text-center text-cult-charcoal text-[11px] uppercase tracking-widest font-montserrat">
        No active batch predictions
      </div>
    );
  }

  // Summary stats
  const totalPredWet = preds.reduce((sum, p) => sum + (p.predicted_wet || 0), 0);
  const totalActualWet = preds.reduce((sum, p) => sum + (p.actual_wet || 0), 0);
  const totalPredDry = preds.reduce((sum, p) => sum + (p.predicted_dry || 0), 0);
  const totalActualDry = preds.reduce((sum, p) => sum + (p.actual_dry || 0), 0);
  const batchesWithVariance = preds.filter(p => p.variance_wet != null);
  const avgVariance = batchesWithVariance.length > 0
    ? batchesWithVariance.reduce((s, p) => s + (p.variance_wet || 0), 0) / batchesWithVariance.length
    : null;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard
          label="Predicted Wet"
          value={formatGrams(totalPredWet)}
          sub={`${preds.length} batches`}
        />
        <SummaryCard
          label="Actual Wet"
          value={formatGrams(totalActualWet || null)}
          sub={totalActualWet > 0 ? `${preds.filter(p => p.actual_wet).length} harvested` : 'pending'}
        />
        <SummaryCard
          label="Predicted Dry"
          value={formatGrams(totalPredDry)}
          sub="from pipeline"
        />
        <SummaryCard
          label="Avg Variance"
          value={avgVariance != null ? `${avgVariance >= 0 ? '+' : ''}${(avgVariance * 100).toFixed(1)}%` : '—'}
          sub={batchesWithVariance.length > 0 ? `${batchesWithVariance.length} measured` : 'no data yet'}
          highlight={avgVariance != null && avgVariance >= 0}
        />
      </div>

      {/* Batch prediction list */}
      <div className="bg-cult-near-black/50 rounded-cult border border-cult-charcoal/30 overflow-hidden">
        <div className="grid grid-cols-8 gap-2 px-4 py-2.5 border-b border-cult-charcoal/40 bg-cult-black/30 text-[9px] uppercase tracking-wider font-montserrat font-bold text-cult-charcoal">
          <span>Batch</span>
          <span>Strain</span>
          <span className="text-right">Plants</span>
          <span className="text-right">Room</span>
          <span className="text-right">Pred Wet</span>
          <span className="text-right">Act Wet</span>
          <span className="text-right">Pred Dry</span>
          <span className="text-right">Confidence</span>
        </div>
        {preds.map(p => (
          <div key={p.batch_id} className="grid grid-cols-8 gap-2 px-4 py-2 text-[11px] border-b border-cult-charcoal/10 hover:bg-cult-charcoal/10 transition-colors">
            <span className="text-cult-off-white font-medium truncate">{p.batch_number}</span>
            <span className="text-cult-silver truncate">{p.strain}</span>
            <span className="text-cult-silver text-right">{p.plant_count}</span>
            <span className="text-cult-lighter-gray text-right">{p.room_code || '—'}</span>
            <span className="text-cult-silver text-right">{formatGrams(p.predicted_wet)}</span>
            <span className={`text-right font-medium ${p.actual_wet ? 'text-cult-off-white' : 'text-cult-charcoal'}`}>
              {formatGrams(p.actual_wet)}
            </span>
            <span className="text-cult-silver text-right">{formatGrams(p.predicted_dry)}</span>
            <span className="text-right">
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${CONFIDENCE_STYLES[p.confidence]}`}>
                {p.confidence}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className="bg-cult-near-black/50 border border-cult-charcoal/30 rounded-cult p-3">
      <p className="text-[9px] text-cult-charcoal uppercase tracking-wider font-montserrat font-bold mb-1">{label}</p>
      <p className={`text-lg font-bold font-montserrat ${highlight ? 'text-cult-success' : 'text-cult-off-white'}`}>{value}</p>
      <p className="text-[10px] text-cult-lighter-gray mt-0.5">{sub}</p>
    </div>
  );
}

export function StrainYieldAnalytics() {
  const strainMetrics = useStrainMetrics();
  const { predictions, loading: predLoading } = useBatchPredictions(
    strainMetrics.metricsMap,
    strainMetrics.getMetricsForStrain,
    strainMetrics.loading
  );
  const [activeTab, setActiveTab] = useState<'metrics' | 'predictions'>('predictions');

  const loading = strainMetrics.loading || predLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-cult-silver">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm uppercase tracking-widest font-montserrat">Loading yield analytics...</span>
        </div>
      </div>
    );
  }

  if (strainMetrics.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-8 h-8 text-cult-warning" />
        <p className="text-cult-silver text-sm">{strainMetrics.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cult-off-white uppercase tracking-wider font-montserrat">
            Strain Yield Analytics
          </h1>
          <p className="text-[11px] text-cult-lighter-gray uppercase tracking-widest mt-1 font-montserrat">
            Predictive modeling · Strain performance · Yield tracking
          </p>
        </div>
        <button
          onClick={() => { strainMetrics.reload(); }}
          className="p-2 text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50 rounded-cult transition-all"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-cult-near-black/50 rounded-cult p-1 border border-cult-charcoal/30 w-fit">
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-4 py-2 text-[11px] uppercase tracking-widest font-montserrat font-bold rounded transition-all flex items-center gap-2 ${
            activeTab === 'predictions'
              ? 'bg-cult-charcoal text-cult-off-white'
              : 'text-cult-lighter-gray hover:text-cult-silver'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          Active Predictions
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 text-[11px] uppercase tracking-widest font-montserrat font-bold rounded transition-all flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'bg-cult-charcoal text-cult-off-white'
              : 'text-cult-lighter-gray hover:text-cult-silver'
          }`}
        >
          <Dna className="w-3.5 h-3.5" />
          Strain Benchmarks
        </button>
      </div>

      {/* Content */}
      {activeTab === 'predictions' ? (
        <ActivePredictionsGrid predictions={predictions} />
      ) : (
        <StrainMetricsTable metrics={strainMetrics.metrics} />
      )}
    </div>
  );
}
