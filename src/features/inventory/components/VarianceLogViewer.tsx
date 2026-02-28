/**
 * Variance Log Viewer
 *
 * Component for viewing and analyzing variance log entries.
 * Displays filterable table with statistics and export capability.
 */

import { useState } from 'react';
import { Download, Search, Filter, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import type { VarianceLogWithUser, VarianceLogFilters, VarianceSource, VarianceReason } from '../types';

interface VarianceLogViewerProps {
  entries: VarianceLogWithUser[];
  totalCount: number;
  filters: VarianceLogFilters;
  onFiltersChange: (filters: VarianceLogFilters) => void;
  onExport: () => Promise<void>;
  isLoading?: boolean;
}

export function VarianceLogViewer({
  entries,
  totalCount,
  filters,
  onFiltersChange,
  onExport,
  isLoading = false
}: VarianceLogViewerProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sourceTypes: { value: VarianceSource; label: string }[] = [
    { value: 'audit_reconciliation', label: 'Audit' },
    { value: 'session_conversion', label: 'Session' },
    { value: 'manual_adjustment', label: 'Manual' }
  ];

  const varianceReasons: { value: VarianceReason; label: string }[] = [
    { value: 'moisture_loss', label: 'Moisture Loss' },
    { value: 'spillage', label: 'Spillage' },
    { value: 'measurement_error', label: 'Measurement Error' },
    { value: 'waste', label: 'Waste' },
    { value: 'theft_loss', label: 'Theft/Loss' },
    { value: 'package_not_found', label: 'Package Not Found' },
    { value: 'package_consumed', label: 'Package Consumed' },
    { value: 'package_found', label: 'Package Found' },
    { value: 'other', label: 'Other' }
  ];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleDateRangeChange = (field: 'start_date' | 'end_date', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  const handleSourceToggle = (source: VarianceSource) => {
    const current = filters.source_type || [];
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    onFiltersChange({ ...filters, source_type: updated.length > 0 ? updated : undefined });
  };

  const handleReasonToggle = (reason: VarianceReason) => {
    const current = filters.variance_reason || [];
    const updated = current.includes(reason)
      ? current.filter(r => r !== reason)
      : [...current, reason];
    onFiltersChange({ ...filters, variance_reason: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFiltersChange({});
  };

  const getVarianceClass = (percentage: number) => {
    const abs = Math.abs(percentage);
    if (abs >= 5) return 'text-red-600 font-bold';
    if (abs >= 3) return 'text-orange-600 font-semibold';
    if (abs >= 1) return 'text-yellow-600';
    return 'text-cult-text-faint';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeFiltersCount = [
    filters.source_type?.length || 0,
    filters.variance_reason?.length || 0,
    filters.start_date ? 1 : 0,
    filters.end_date ? 1 : 0,
    filters.search ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cult-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by package ID, product..."
              className="w-full pl-10 pr-4 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-cult-border text-gray-700 hover:bg-cult-surface-sunken'
            }`}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={onExport}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-cult-surface-sunken border border-cult-border-subtle rounded-lg space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-cult-text-primary mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-cult-text-faint mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date?.split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-cult-text-faint mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date?.split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-sm font-semibold text-cult-text-primary mb-2">Source Type</label>
            <div className="flex flex-wrap gap-2">
              {sourceTypes.map(source => (
                <button
                  key={source.value}
                  onClick={() => handleSourceToggle(source.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.source_type?.includes(source.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-cult-border text-gray-700 hover:bg-cult-surface-sunken'
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variance Reason */}
          <div>
            <label className="block text-sm font-semibold text-cult-text-primary mb-2">Variance Reason</label>
            <div className="flex flex-wrap gap-2">
              {varianceReasons.map(reason => (
                <button
                  key={reason.value}
                  onClick={() => handleReasonToggle(reason.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.variance_reason?.includes(reason.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-cult-border text-gray-700 hover:bg-cult-surface-sunken'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-700 hover:text-cult-text-primary font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-cult-text-faint">
        <div>
          Showing <span className="font-semibold text-cult-text-primary">{entries.length}</span> of{' '}
          <span className="font-semibold text-cult-text-primary">{totalCount}</span> variance entries
        </div>
      </div>

      {/* Table */}
      <div className="border border-cult-border-subtle rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cult-border-subtle">
            <thead className="bg-cult-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase">Package ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cult-text-primary uppercase">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cult-text-primary uppercase">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cult-text-primary uppercase">Variance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase">User</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-cult-border-subtle">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-cult-surface-sunken">
                  <td className="px-4 py-3 text-sm text-cult-text-primary">
                    {formatDate(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      entry.source_type === 'audit_reconciliation'
                        ? 'bg-blue-100 text-blue-800'
                        : entry.source_type === 'session_conversion'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-cult-surface text-cult-text-primary'
                    }`}>
                      {entry.source_type === 'audit_reconciliation' ? 'Audit' :
                       entry.source_type === 'session_conversion' ? 'Session' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-cult-text-primary">{entry.package_id}</td>
                  <td className="px-4 py-3 text-sm text-cult-text-primary">
                    <div>{entry.product_name}</div>
                    {entry.strain && <div className="text-xs text-cult-text-muted">{entry.strain}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-cult-text-primary">
                    {entry.expected_qty.toFixed(2)} {entry.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-cult-text-primary">
                    {entry.actual_qty.toFixed(2)} {entry.unit}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${getVarianceClass(entry.variance_percentage)}`}>
                    <div className="flex items-center justify-end">
                      {entry.variance_qty > 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      <div>
                        <div>{entry.variance_qty > 0 ? '+' : ''}{entry.variance_qty.toFixed(2)} {entry.unit}</div>
                        <div className="text-xs">({entry.variance_percentage.toFixed(1)}%)</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-text-primary">
                    {entry.variance_reason.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-text-primary">
                    {entry.user_full_name || entry.user_email || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12 text-cult-text-muted">
            <p>No variance entries found</p>
          </div>
        )}
      </div>
    </div>
  );
}
