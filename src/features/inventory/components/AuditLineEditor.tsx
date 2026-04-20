/**
 * Audit Line Editor
 *
 * Table component for editing audit lines during an inventory audit.
 * Allows updating actual quantities, variance reasons, and confirmation status.
 */

import { useState, useMemo } from 'react';
import { Check, X, Search, AlertTriangle } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import type { InventoryAuditLine, AuditLineUpdateRequest, VarianceReason } from '../types';

interface AuditLineEditorProps {
  lines: InventoryAuditLine[];
  onUpdateLine: (request: AuditLineUpdateRequest) => Promise<boolean>;
  isReadOnly?: boolean;
}

export function AuditLineEditor({ lines, onUpdateLine, isReadOnly = false }: AuditLineEditorProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    actual_qty: string;
    variance_reason: VarianceReason | '';
    variance_notes: string;
  }>({
    actual_qty: '',
    variance_reason: '',
    variance_notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'variance'>('all');

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

  const filteredLines = useMemo(() => {
    let filtered = lines;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(line =>
        line.package_id.toLowerCase().includes(search) ||
        line.product_name?.toLowerCase().includes(search) ||
        line.strain?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (filterStatus === 'pending') {
      filtered = filtered.filter(line => !line.confirmed);
    } else if (filterStatus === 'confirmed') {
      filtered = filtered.filter(line => line.confirmed);
    } else if (filterStatus === 'variance') {
      filtered = filtered.filter(line => line.variance_qty !== null && Math.abs(line.variance_qty) > 0.01);
    }

    return filtered.sort((a, b) => a.line_order - b.line_order);
  }, [lines, searchTerm, filterStatus]);

  const handleStartEdit = (line: InventoryAuditLine) => {
    if (isReadOnly) return;
    setEditingLineId(line.id);
    setEditValues({
      actual_qty: line.actual_qty?.toString() || line.expected_qty.toString(),
      variance_reason: line.variance_reason || '',
      variance_notes: line.variance_notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditValues({ actual_qty: '', variance_reason: '', variance_notes: '' });
  };

  const handleSaveEdit = async (line: InventoryAuditLine) => {
    const actualQty = parseFloat(editValues.actual_qty);

    if (isNaN(actualQty) || actualQty < 0) {
      notificationService.warning('Please enter a valid quantity');
      return;
    }

    const hasVariance = Math.abs(actualQty - line.expected_qty) > 0.01;

    if (hasVariance && !editValues.variance_reason) {
      notificationService.warning('Please select a variance reason');
      return;
    }

    const request: AuditLineUpdateRequest = {
      audit_line_id: line.id,
      actual_qty: actualQty,
      variance_reason: editValues.variance_reason || undefined,
      variance_notes: editValues.variance_notes || undefined,
      confirmed: true
    };

    const success = await onUpdateLine(request);
    if (success) {
      handleCancelEdit();
    }
  };

  const getVarianceClass = (percentage: number | null) => {
    if (percentage === null) return '';
    const abs = Math.abs(percentage);
    if (abs >= 5) return 'text-red-600 font-bold';
    if (abs >= 3) return 'text-orange-600 font-semibold';
    if (abs >= 1) return 'text-yellow-600';
    return 'text-cult-text-faint';
  };

  const formatQty = (qty: number, unit: string) => {
    return `${qty.toFixed(2)} ${unit}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cult-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by package ID, product, or strain..."
            className="w-full pl-10 pr-4 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'confirmed' | 'variance')}
          className="px-4 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Lines</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="variance">With Variance</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-cult-surface-sunken rounded-lg">
          <div className="text-sm text-cult-text-faint">Total Lines</div>
          <div className="text-2xl font-bold text-cult-text-primary">{lines.length}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600">Confirmed</div>
          <div className="text-2xl font-bold text-green-900">
            {lines.filter(l => l.confirmed).length}
          </div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <div className="text-sm text-yellow-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">
            {lines.filter(l => !l.confirmed).length}
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="text-sm text-red-600">Variances</div>
          <div className="text-2xl font-bold text-red-900">
            {lines.filter(l => l.variance_qty !== null && Math.abs(l.variance_qty) > 0.01).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-cult-border-subtle rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cult-border-subtle">
            <thead className="bg-cult-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Package ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Stage</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Variance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-cult-text-primary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-cult-border-subtle">
              {filteredLines.map(line => {
                const isEditing = editingLineId === line.id;
                const hasVariance = line.variance_qty !== null && Math.abs(line.variance_qty) > 0.01;

                return (
                  <tr key={line.id} className={line.confirmed ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3 text-sm text-cult-text-primary">{line.line_order}</td>
                    <td className="px-4 py-3 text-sm font-mono text-cult-text-primary">{line.package_id}</td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary">
                      <div>{line.product_name}</div>
                      {line.strain && <div className="text-xs text-cult-text-muted">{line.strain}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary">{line.stage}</td>
                    <td className="px-4 py-3 text-sm text-right text-cult-text-primary">
                      {formatQty(line.expected_qty, line.unit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.actual_qty}
                          onChange={(e) => setEditValues(prev => ({ ...prev, actual_qty: e.target.value }))}
                          className="w-24 px-2 py-1 border border-cult-border rounded text-right focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : line.actual_qty !== null ? (
                        <span className="text-cult-text-primary">{formatQty(line.actual_qty, line.unit)}</span>
                      ) : (
                        <span className="text-cult-text-muted">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${getVarianceClass(line.variance_percentage)}`}>
                      {line.variance_qty !== null && line.variance_percentage !== null ? (
                        <div>
                          <div>{line.variance_qty > 0 ? '+' : ''}{line.variance_qty.toFixed(2)} {line.unit}</div>
                          <div className="text-xs">({line.variance_percentage.toFixed(1)}%)</div>
                        </div>
                      ) : (
                        <span className="text-cult-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {line.confirmed ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                          <Check className="h-3 w-3 mr-1" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-2">
                          {hasVariance && (
                            <div className="mr-2">
                              <select
                                value={editValues.variance_reason}
                                onChange={(e) => setEditValues(prev => ({ ...prev, variance_reason: e.target.value as VarianceReason }))}
                                className="px-2 py-1 text-xs border border-cult-border rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select reason...</option>
                                {varianceReasons.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            onClick={() => handleSaveEdit(line)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : !isReadOnly && (
                        <button
                          onClick={() => handleStartEdit(line)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLines.length === 0 && (
          <div className="text-center py-12 text-cult-text-muted">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-cult-text-muted" />
            <p>No audit lines found</p>
          </div>
        )}
      </div>
    </div>
  );
}
