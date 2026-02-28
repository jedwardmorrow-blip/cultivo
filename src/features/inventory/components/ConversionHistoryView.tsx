/**
 * ConversionHistoryView Component
 *
 * Displays historical conversion activity with filtering, search, and analytics.
 * Uses the conversion_history_view and related database views for comprehensive audit trail.
 */

import { useState, useEffect } from 'react';
import { History, Search, Filter, TrendingUp, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services';
import { LoadingSpinner } from '@/shared/components';

interface ConversionHistory {
  conversion_lot_id: string;
  batch_number: string;
  strain_name: string;
  strain_code: string;
  product_name: string;
  product_category: string;
  stage_name: string;
  package_count: number;
  total_weight: number;
  total_units: number;
  first_package_id: string;
  last_package_id: string;
  conversion_started_at: string;
  conversion_completed_at: string;
  duration_minutes: number;
  converted_by_name: string;
  converted_by_email: string;
  packages_in_inventory: number;
  packages_with_stock: number;
  current_total_qty: number;
  variance_reason: string | null;
  weight_variance_pct: number | null;
  conversion_date: string;
}

interface PerformanceMetrics {
  conversion_date: string;
  user_name: string;
  lots_completed: number;
  packages_created: number;
  total_weight_converted: number;
  avg_conversion_time_minutes: number;
  conversions_with_variance: number;
  avg_variance_pct: number;
}

export function ConversionHistoryView() {
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7'); // Last 7 days default
  const [strainFilter, setStrainFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);
  const [activeView, setActiveView] = useState<'history' | 'metrics'>('history');

  useEffect(() => {
    loadData();
  }, [dateFilter, strainFilter, userFilter, showVarianceOnly]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateFilter));

      // Build history query
      let historyQuery = supabase
        .from('conversion_history_view')
        .select('*')
        .gte('conversion_date', startDate.toISOString().split('T')[0])
        .order('conversion_started_at', { ascending: false });

      if (strainFilter) {
        historyQuery = historyQuery.eq('strain_name', strainFilter);
      }

      if (userFilter) {
        historyQuery = historyQuery.eq('converted_by_name', userFilter);
      }

      if (showVarianceOnly) {
        historyQuery = historyQuery.not('variance_reason', 'is', null);
      }

      const { data: historyData, error: historyError } = await historyQuery;

      if (historyError) throw historyError;

      // Load metrics
      let metricsQuery = supabase
        .from('conversion_performance_metrics')
        .select('*')
        .gte('conversion_date', startDate.toISOString().split('T')[0])
        .order('conversion_date', { ascending: false });

      if (userFilter) {
        metricsQuery = metricsQuery.eq('user_name', userFilter);
      }

      const { data: metricsData, error: metricsError } = await metricsQuery;

      if (metricsError) throw metricsError;

      setHistory(historyData || []);
      setMetrics(metricsData || []);
    } catch (err) {
      console.error('Error loading conversion history:', err);
      notificationService.error('Failed to load conversion history');
    } finally {
      setLoading(false);
    }
  };

  // Filter history by search term
  const filteredHistory = history.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.batch_number.toLowerCase().includes(search) ||
      item.strain_name.toLowerCase().includes(search) ||
      item.product_name.toLowerCase().includes(search) ||
      item.first_package_id.toLowerCase().includes(search) ||
      item.converted_by_name.toLowerCase().includes(search)
    );
  });

  // Get unique strains and users for filters
  const uniqueStrains = [...new Set(history.map((h) => h.strain_name))].sort();
  const uniqueUsers = [...new Set(history.map((h) => h.converted_by_name))].sort();

  // Calculate totals
  const totalPackages = filteredHistory.reduce((sum, h) => sum + h.package_count, 0);
  const totalWeight = filteredHistory.reduce((sum, h) => sum + (h.total_weight || 0), 0);
  const conversionsWithVariance = filteredHistory.filter((h) => h.variance_reason).length;

  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Conversion History</h2>
          </div>
          <p className="text-cult-text-muted text-sm">
            View past conversions, track performance, and analyze variance trends
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-green-600 text-white'
                : 'bg-cult-medium-gray text-cult-text-secondary hover:bg-cult-light-gray'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            History
          </button>
          <button
            onClick={() => setActiveView('metrics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'metrics'
                ? 'bg-green-600 text-white'
                : 'bg-cult-medium-gray text-cult-text-secondary hover:bg-cult-light-gray'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Metrics
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-cult-dark-gray rounded-lg p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-cult-text-secondary mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Batch, strain, package ID..."
              className="w-full bg-cult-near-black border border-cult-medium-gray rounded-md px-3 py-2 text-white placeholder-cult-text-muted focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-cult-text-secondary mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-cult-near-black border border-cult-medium-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          {/* Strain Filter */}
          <div>
            <label className="block text-sm font-medium text-cult-text-secondary mb-2">Strain</label>
            <select
              value={strainFilter}
              onChange={(e) => setStrainFilter(e.target.value)}
              className="w-full bg-cult-near-black border border-cult-medium-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Strains</option>
              {uniqueStrains.map((strain) => (
                <option key={strain} value={strain}>
                  {strain}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-cult-text-secondary mb-2">User</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-cult-near-black border border-cult-medium-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Users</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Variance Filter Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="variance-filter"
            checked={showVarianceOnly}
            onChange={(e) => setShowVarianceOnly(e.target.checked)}
            className="w-4 h-4 rounded border-cult-medium-gray bg-cult-near-black text-green-600 focus:ring-2 focus:ring-green-500"
          />
          <label htmlFor="variance-filter" className="text-sm text-cult-text-secondary">
            Show only conversions with variance
          </label>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-cult-dark-gray rounded-lg p-4">
          <div className="text-sm text-cult-text-muted mb-1">Total Conversions</div>
          <div className="text-2xl font-bold text-white">{filteredHistory.length}</div>
        </div>
        <div className="bg-cult-dark-gray rounded-lg p-4">
          <div className="text-sm text-cult-text-muted mb-1">Total Packages</div>
          <div className="text-2xl font-bold text-white">{totalPackages}</div>
        </div>
        <div className="bg-cult-dark-gray rounded-lg p-4">
          <div className="text-sm text-cult-text-muted mb-1">Total Weight</div>
          <div className="text-2xl font-bold text-white">{totalWeight.toFixed(1)}g</div>
        </div>
        <div className="bg-cult-dark-gray rounded-lg p-4">
          <div className="text-sm text-cult-text-muted mb-1">With Variance</div>
          <div className="text-2xl font-bold text-white">
            {conversionsWithVariance}
            <span className="text-sm text-cult-text-muted ml-2">
              ({filteredHistory.length > 0 ? ((conversionsWithVariance / filteredHistory.length) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : activeView === 'history' ? (
        <HistoryTable history={filteredHistory} />
      ) : (
        <MetricsTable metrics={metrics} />
      )}
    </div>
  );
}

function HistoryTable({ history }: { history: ConversionHistory[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-cult-text-faint mx-auto mb-4" />
        <p className="text-cult-text-muted">No conversion history found for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-cult-medium-gray">
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Batch
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Strain
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Product
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Packages
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Weight
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Variance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cult-medium-gray">
          {history.map((item) => (
            <tr key={item.conversion_lot_id} className="hover:bg-cult-dark-gray transition-colors">
              <td className="px-4 py-3 text-sm text-white">
                {new Date(item.conversion_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-white font-mono">{item.batch_number}</td>
              <td className="px-4 py-3 text-sm text-white">{item.strain_name}</td>
              <td className="px-4 py-3 text-sm text-cult-text-secondary">{item.product_name}</td>
              <td className="px-4 py-3 text-sm text-white text-center">
                {item.package_count}
                <div className="text-xs text-cult-text-muted">
                  {item.packages_with_stock}/{item.packages_in_inventory} in stock
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-white text-right">
                {item.total_weight ? `${item.total_weight.toFixed(1)}g` : `${item.total_units} units`}
              </td>
              <td className="px-4 py-3 text-sm text-cult-text-secondary text-center">
                {item.duration_minutes ? `${item.duration_minutes.toFixed(0)}m` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-cult-text-secondary">{item.converted_by_name}</td>
              <td className="px-4 py-3 text-sm text-center">
                {item.variance_reason ? (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      Math.abs(item.weight_variance_pct || 0) > 5
                        ? 'bg-red-900 bg-opacity-30 text-red-300'
                        : 'bg-amber-900 bg-opacity-30 text-amber-300'
                    }`}
                  >
                    {item.weight_variance_pct?.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-cult-text-faint">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricsTable({ metrics }: { metrics: PerformanceMetrics[] }) {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-cult-text-faint mx-auto mb-4" />
        <p className="text-cult-text-muted">No performance metrics found for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-cult-medium-gray">
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Lots
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Packages
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Weight
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Avg Time
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Variance Rate
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase tracking-wider">
              Avg Variance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cult-medium-gray">
          {metrics.map((item, idx) => (
            <tr key={idx} className="hover:bg-cult-dark-gray transition-colors">
              <td className="px-4 py-3 text-sm text-white">
                {new Date(item.conversion_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-white">{item.user_name}</td>
              <td className="px-4 py-3 text-sm text-white text-center">{item.lots_completed}</td>
              <td className="px-4 py-3 text-sm text-white text-center">{item.packages_created}</td>
              <td className="px-4 py-3 text-sm text-white text-right">
                {item.total_weight_converted ? `${item.total_weight_converted.toFixed(1)}g` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-cult-text-secondary text-center">
                {item.avg_conversion_time_minutes ? `${item.avg_conversion_time_minutes.toFixed(0)}m` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-cult-text-secondary text-center">
                {item.conversions_with_variance}/{item.lots_completed}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                {item.avg_variance_pct ? (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      Math.abs(item.avg_variance_pct) > 5
                        ? 'bg-red-900 bg-opacity-30 text-red-300'
                        : 'bg-amber-900 bg-opacity-30 text-amber-300'
                    }`}
                  >
                    {item.avg_variance_pct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-cult-text-faint">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
