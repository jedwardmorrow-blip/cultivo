import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Package, Scissors, RefreshCw } from 'lucide-react';
import { ProductionSummary } from './ProductionSummary';
import { getThroughputSummary, getConversionAnalysis, type ThroughputData, type ConversionData } from '../services';

export function AnalyticsDashboard() {
  const [throughputData, setThroughputData] = useState<ThroughputData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadAnalytics();
    }
  }, [dateRange]);

  async function loadAnalytics() {
    try {
      setLoading(true);

      const [throughputResult, conversionResult] = await Promise.all([
        getThroughputSummary(dateRange.start, dateRange.end),
        getConversionAnalysis(dateRange.start, dateRange.end)
      ]);

      if (throughputResult.data) setThroughputData(throughputResult.data);
      if (conversionResult.data) setConversionData(conversionResult.data);
    } finally {
      setLoading(false);
    }
  }

  const trimmerStats = throughputData.filter(d => d.worker_type === 'trimmer');
  const packagerStats = throughputData.filter(d => d.worker_type === 'packager');

  const avgTrimmerProductivity = trimmerStats.length > 0
    ? trimmerStats.reduce((sum, d) => sum + d.avg_grams_per_hour, 0) / trimmerStats.length
    : 0;

  const avgPackagerProductivity = packagerStats.length > 0
    ? packagerStats.reduce((sum, d) => sum + d.avg_units_per_hour, 0) / packagerStats.length
    : 0;

  const totalWeightProcessed = throughputData.reduce((sum, d) => sum + d.total_weight_grams, 0);
  const totalUnitsProduced = throughputData.reduce((sum, d) => sum + d.total_units, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-text-muted">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Analytics</h1>
          <p className="text-cult-light-gray mt-2">Production throughput and conversion metrics</p>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-cult-surface-raised border border-cult-border rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-cult-surface-raised border border-cult-border rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6 transition-colors duration-200 hover:border-cult-border-strong">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-cult-text-muted text-sm">Avg Trimmer Speed</span>
          </div>
          <div className="text-3xl font-bold text-white">{avgTrimmerProductivity.toFixed(0)}</div>
          <div className="text-sm text-cult-text-muted">grams/hour</div>
        </div>

        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6 transition-colors duration-200 hover:border-cult-border-strong">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-green-400" />
            <span className="text-cult-text-muted text-sm">Avg Packager Speed</span>
          </div>
          <div className="text-3xl font-bold text-white">{avgPackagerProductivity.toFixed(0)}</div>
          <div className="text-sm text-cult-text-muted">units/hour</div>
        </div>

        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6 transition-colors duration-200 hover:border-cult-border-strong">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <span className="text-cult-text-muted text-sm">Total Processed</span>
          </div>
          <div className="text-3xl font-bold text-white">{(totalWeightProcessed / 1000).toFixed(1)}</div>
          <div className="text-sm text-cult-text-muted">kg</div>
        </div>

        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6 transition-colors duration-200 hover:border-cult-border-strong">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span className="text-cult-text-muted text-sm">Units Produced</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalUnitsProduced.toLocaleString()}</div>
          <div className="text-sm text-cult-text-muted">total units</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6 transition-colors duration-200 hover:border-cult-border-strong">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Trimmer Productivity</h3>
          {trimmerStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Scissors className="w-10 h-10 text-cult-text-muted/40 mb-3" />
              <p className="text-cult-text-muted text-sm">No trimmer data for this period</p>
              <p className="text-cult-text-muted/60 text-xs mt-1">Complete trim sessions to see productivity metrics</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {trimmerStats.slice(0, 10).map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-cult-surface/50 rounded">
                  <div>
                    <div className="text-white font-medium">{stat.metric_date}</div>
                    <div className="text-sm text-cult-text-muted">{stat.total_workers} workers, {stat.total_sessions} sessions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{stat.avg_grams_per_hour.toFixed(0)} g/hr</div>
                    <div className="text-sm text-cult-text-muted">{(stat.total_weight_grams / 1000).toFixed(1)} kg total</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6 transition-colors duration-200 hover:border-cult-border-strong">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Conversion Analysis</h3>
          {conversionData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-10 h-10 text-cult-text-muted/40 mb-3" />
              <p className="text-cult-text-muted text-sm">No conversion data for this period</p>
              <p className="text-cult-text-muted/60 text-xs mt-1">Finalize sessions to generate conversion metrics</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {conversionData.slice(0, 10).map((conv, idx) => (
                <div key={idx} className="p-3 bg-cult-surface/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{conv.strain}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      conv.performance_status === 'over_performing' ? 'bg-green-900/30 text-green-400' :
                      conv.performance_status === 'under_performing' ? 'bg-red-900/30 text-red-400' :
                      'bg-cult-surface-overlay text-cult-text-secondary'
                    }`}>
                      {conv.variance_percentage > 0 ? '+' : ''}{conv.variance_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-cult-text-muted">
                    {conv.from_stage} → {conv.to_stage}: {conv.actual_percentage.toFixed(1)}%
                    {conv.expected_percentage && ` (expected ${conv.expected_percentage.toFixed(1)}%)`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <ProductionSummary />
      </div>
    </div>
  );
}
