import { useState, useEffect } from 'react';
import { testModeService } from '@/services/testMode.service';
import type { TestModeAuditEntry } from '@/contexts/TestModeContext';
import { Download, RefreshCw, Search, Trash2 } from 'lucide-react';

/**
 * Test Mode Audit Log Viewer
 *
 * Displays audit trail of all test mode bypassed validations.
 * Provides filtering, export, and cleanup capabilities.
 *
 * Features:
 * - Paginated log display
 * - Filter by validation type
 * - Export to CSV
 * - Cleanup old entries
 * - Statistics view
 *
 * @see docs/TEST-MODE.md
 */
export function TestModeAuditLog() {
  const [entries, setEntries] = useState<TestModeAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationFilter, setValidationFilter] = useState<string>('');
  const [limit, setLimit] = useState(50);

  const fetchAuditLog = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: any = { limit };

      if (validationFilter) {
        filters.validation_type = validationFilter;
      }

      const data = await testModeService.getAuditLog(filters);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, [validationFilter, limit]);

  const handleExport = async () => {
    try {
      const csv = await testModeService.exportAuditLog({
        validation_type: validationFilter || undefined,
        limit: 10000
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-mode-audit-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit log:', err);
      alert('Failed to export audit log');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Delete all audit entries older than the retention period?')) {
      return;
    }

    try {
      const deletedCount = await testModeService.cleanupOldLogs();
      alert(`Deleted ${deletedCount} old audit entries`);
      await fetchAuditLog();
    } catch (err) {
      console.error('Failed to cleanup logs:', err);
      alert('Failed to cleanup old logs');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL audit entries? This cannot be undone!')) {
      return;
    }

    try {
      const deletedCount = await testModeService.deleteAllLogs();
      alert(`Deleted ${deletedCount} audit entries`);
      await fetchAuditLog();
    } catch (err) {
      console.error('Failed to delete all logs:', err);
      alert('Failed to delete audit entries');
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.action.toLowerCase().includes(searchLower) ||
      entry.validation_bypassed.toLowerCase().includes(searchLower) ||
      JSON.stringify(entry.context).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Test Mode Audit Log
        </h3>

        <div className="flex gap-2">
          <button
            onClick={fetchAuditLog}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Export to CSV"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={handleCleanup}
            className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
            title="Cleanup old entries"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actions or validations..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validation Type
          </label>
          <select
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="on_hand_quantity_check">Inventory Check</option>
            <option value="batch_allocation_required">Batch Allocation</option>
            <option value="inventory_movement_logging">Movement Logging</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limit
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value={25}>25 entries</option>
            <option value={50}>50 entries</option>
            <option value={100}>100 entries</option>
            <option value={500}>500 entries</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Timestamp</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Validation Bypassed</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Context</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  Loading audit log...
                </td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  No audit entries found
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{entry.action}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                      {entry.validation_bypassed}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <details className="text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-900">
                        View context
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(entry.context, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      {filteredEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600">
          <div>
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
          <button
            onClick={handleDeleteAll}
            className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium"
          >
            Delete All Entries
          </button>
        </div>
      )}
    </div>
  );
}
