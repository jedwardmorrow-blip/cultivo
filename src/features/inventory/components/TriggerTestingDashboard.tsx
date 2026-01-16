/**
 * Trigger Testing Dashboard
 *
 * Comprehensive UI for testing and validating database triggers.
 * Provides interactive testing, health monitoring, scenario simulation,
 * and error management.
 */

import { useState, useEffect } from 'react';
import { Play, AlertCircle, CheckCircle, Activity, TrendingUp, Settings, RefreshCw } from 'lucide-react';
import * as triggerTestingService from '../services/triggerTesting.service';
import type {
  TriggerHealthStatus,
  TriggerTestResult,
  PerformanceSummary,
  MovementError,
  MovementStat
} from '../services/triggerTesting.service';

export function TriggerTestingDashboard() {
  const [activeTab, setActiveTab] = useState<'health' | 'tests' | 'errors' | 'stats'>('health');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Health data
  const [health, setHealth] = useState<TriggerHealthStatus | null>(null);
  const [perfSummary, setPerfSummary] = useState<PerformanceSummary[]>([]);

  // Test data
  const [testResults, setTestResults] = useState<TriggerTestResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);

  // Error data
  const [errors, setErrors] = useState<MovementError[]>([]);

  // Stats data
  const [stats, setStats] = useState<MovementStat[]>([]);

  // Load initial health data
  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const [healthData, perfData] = await Promise.all([
        triggerTestingService.checkTriggerHealth(),
        triggerTestingService.getPerformanceSummary()
      ]);
      setHealth(healthData);
      setPerfSummary(perfData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const loadErrors = async () => {
    try {
      setLoading(true);
      const errorData = await triggerTestingService.getRecentErrors(50);
      setErrors(errorData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await triggerTestingService.getMovementStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    try {
      setTestRunning(true);
      setError(null);
      const results = await triggerTestingService.runTriggerTests();
      setTestResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run tests');
    } finally {
      setTestRunning(false);
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      await triggerTestingService.resolveError(errorId);
      await loadErrors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'pass':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
      case 'fail':
      case 'disabled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
      case 'fail':
      case 'disabled':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trigger Testing Dashboard</h2>
            <p className="text-gray-600 mt-1">Test and monitor database trigger system</p>
          </div>
          <button
            onClick={loadHealthData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('health')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'health'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Health
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('tests');
                if (testResults.length === 0) runTests();
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'tests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Tests
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('errors');
                if (errors.length === 0) loadErrors();
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'errors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Errors
                {errors.filter(e => !e.resolved_at).length > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                    {errors.filter(e => !e.resolved_at).length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('stats');
                if (stats.length === 0) loadStats();
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Statistics
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Trigger Status */}
              {health && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Trigger Status</h3>
                    {getStatusIcon(health.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`text-lg font-semibold ${getStatusColor(health.status)}`}>
                        {health.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Enabled</p>
                      <p className="text-lg font-semibold">
                        {health.enabled ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Movements</p>
                      <p className="text-lg font-semibold">{health.total_movements.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last 24h</p>
                      <p className="text-lg font-semibold">{health.movements_last_24h.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Errors (24h)</p>
                      <p className={`text-lg font-semibold ${health.errors_last_24h > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {health.errors_last_24h}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Error Rate</p>
                      <p className={`text-lg font-semibold ${health.error_rate_24h > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {health.error_rate_24h.toFixed(2)}%
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Last Execution</p>
                      <p className="text-lg font-semibold">
                        {health.last_execution ? new Date(health.last_execution).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Summary */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {perfSummary.map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{metric.metric}</p>
                        <p className="text-xs text-gray-600">{metric.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xl font-bold ${getStatusColor(metric.status)}`}>
                          {metric.value.toLocaleString()}
                        </p>
                        {getStatusIcon(metric.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Automated Tests</h3>
                  <p className="text-sm text-gray-600">Test all movement types with sample data</p>
                </div>
                <button
                  onClick={runTests}
                  disabled={testRunning}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 ${testRunning ? 'animate-pulse' : ''}`} />
                  {testRunning ? 'Running...' : 'Run Tests'}
                </button>
              </div>

              {testResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {testResults.map((result, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 text-sm text-gray-900">{result.test_name}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'PASS' ? 'bg-green-100 text-green-800' :
                              result.status === 'FAIL' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{result.expected_qty}g</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{result.actual_qty}g</td>
                          <td className="px-6 py-4">
                            {result.passed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {testResults.length === 0 && !testRunning && (
                <div className="text-center py-12 text-gray-500">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Run Tests" to start automated testing</p>
                </div>
              )}
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Movement Errors</h3>
                  <p className="text-sm text-gray-600">Recent errors from movement processing</p>
                </div>
                <button
                  onClick={loadErrors}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Reload
                </button>
              </div>

              {errors.length > 0 ? (
                <div className="space-y-2">
                  {errors.map((error) => (
                    <div
                      key={error.id}
                      className={`border rounded-lg p-4 ${
                        error.resolved_at ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className={`w-4 h-4 ${error.resolved_at ? 'text-gray-400' : 'text-red-600'}`} />
                            <p className="font-medium text-gray-900">{error.error_message}</p>
                            {error.resolved_at && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                Resolved
                              </span>
                            )}
                          </div>
                          {error.error_code && (
                            <p className="text-sm text-gray-600">Code: {error.error_code}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(error.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!error.resolved_at && (
                          <button
                            onClick={() => resolveError(error.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No errors found</p>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Movement Statistics</h3>
                  <p className="text-sm text-gray-600">Aggregate statistics by movement kind</p>
                </div>
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Reload
                </button>
              </div>

              {stats.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kind</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Movement</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.map((stat, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.movement_kind}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stat.total_count.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stat.total_qty.toFixed(1)}g</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stat.avg_qty.toFixed(1)}g</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{stat.unique_items}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(stat.last_movement).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No statistics available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
