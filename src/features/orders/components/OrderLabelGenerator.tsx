import { useState } from 'react';
import { RefreshCw, Tag, Printer, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useOrderLabels, useGenerateLabels, useMarkLabelPrinted, useVoidLabel } from '../hooks/useOrderLabels';
import { usePackageAssignments } from '../hooks/usePackageAssignments';

interface OrderLabelGeneratorProps {
  orderId: string;
}

export function OrderLabelGenerator({ orderId }: OrderLabelGeneratorProps) {
  const { labels, loading: loadingLabels, refetch: refetchLabels } = useOrderLabels(orderId);
  const { assignments, loading: loadingAssignments } = usePackageAssignments(orderId);
  const { generateLabel, generateAllLabels, regenerateLabel, generating } = useGenerateLabels();
  const { markAsPrinted, marking } = useMarkLabelPrinted();
  const { voidLabel, voiding } = useVoidLabel();
  const [expandedView, setExpandedView] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const loading = loadingLabels || loadingAssignments || generating || marking || voiding;

  // Calculate statistics
  const stats = {
    total: labels.length,
    printed: labels.filter(l => l.printed_at && !l.voided_at).length,
    voided: labels.filter(l => l.voided_at).length,
    pending: labels.filter(l => !l.printed_at && !l.voided_at).length,
  };

  const unlabeledAssignments = assignments.filter(
    a => !labels.some(l => l.package_id === a.package_id)
  );

  const handleGenerateAll = async () => {
    const result = await generateAllLabels(orderId);
    if (result) {
      refetchLabels();
    }
  };

  const handleGenerateSingle = async (assignmentId: string) => {
    const success = await generateLabel(assignmentId);
    if (success) {
      refetchLabels();
    }
  };

  const handleMarkPrinted = async (labelId: string) => {
    await markAsPrinted(labelId);
    refetchLabels();
  };

  const handleVoid = async (labelId: string) => {
    if (confirm('Are you sure you want to void this label?')) {
      await voidLabel(labelId);
      refetchLabels();
    }
  };

  const handleRegenerate = async (assignmentId: string) => {
    if (confirm('This will void the existing label and generate a new one. Continue?')) {
      const success = await regenerateLabel(assignmentId, 'User-initiated regeneration');
      if (success) {
        refetchLabels();
      }
    }
  };

  if (!expandedView) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpandedView(true)}
          disabled={loading}
          className="px-4 py-2 bg-cult-medium-gray text-cult-white hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Tag className="w-4 h-4" />
          Manage Labels
          {stats.total > 0 && (
            <span className="bg-cult-black px-2 py-0.5 rounded text-xs">
              {stats.total}
            </span>
          )}
        </button>

        {unlabeledAssignments.length > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            Generate All Labels ({unlabeledAssignments.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-cult-black text-cult-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-wider">Label Management</h2>
            <p className="text-cult-light-gray text-sm mt-1">
              Generate and manage product labels for this order
            </p>
          </div>
          <button
            onClick={() => setExpandedView(false)}
            className="p-2 hover:bg-cult-medium-gray rounded transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
          <div className="text-center">
            <div className="text-3xl font-bold text-cult-black">{stats.total}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Total</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.printed}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Printed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.voided}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Voided</div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-b flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {unlabeledAssignments.length > 0 && (
              <button
                onClick={handleGenerateAll}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Tag className="w-4 h-4" />
                Generate All ({unlabeledAssignments.length})
              </button>
            )}
            <button
              onClick={refetchLabels}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Unlabeled Assignments */}
          {unlabeledAssignments.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-cult-black mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Packages Without Labels ({unlabeledAssignments.length})
              </h3>
              <div className="space-y-2">
                {unlabeledAssignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="bg-yellow-50 border border-yellow-200 rounded p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-cult-black">{assignment.package_id}</div>
                      <div className="text-sm text-gray-600">
                        {assignment.product_name} • {assignment.strain || 'Unknown strain'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateSingle(assignment.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Generate Label
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Labels */}
          {labels.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-cult-black mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Generated Labels ({labels.length})
              </h3>
              <div className="space-y-2">
                {labels.map(label => {
                  const assignment = assignments.find(a => a.package_id === label.package_id);
                  const isVoided = !!label.voided_at;
                  const isPrinted = !!label.printed_at && !isVoided;
                  const isPending = !label.printed_at && !isVoided;

                  return (
                    <div
                      key={label.id}
                      className={`border rounded p-4 flex items-center justify-between ${
                        isVoided
                          ? 'bg-red-50 border-red-200 opacity-60'
                          : isPrinted
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-bold text-cult-black">
                            {label.label_number}
                          </span>
                          {isVoided && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs uppercase tracking-wide rounded">
                              Voided
                            </span>
                          )}
                          {isPrinted && (
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs uppercase tracking-wide rounded">
                              Printed
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs uppercase tracking-wide rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Package: {label.package_id} • {label.product_name}
                        </div>
                        {label.strain && (
                          <div className="text-sm text-gray-600">
                            Strain: {label.strain} • Batch: {label.batch_number || 'N/A'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isVoided && !isPrinted && (
                          <button
                            onClick={() => handleMarkPrinted(label.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-green-600 text-white hover:bg-green-700 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            Mark Printed
                          </button>
                        )}
                        {!isVoided && assignment && (
                          <button
                            onClick={() => handleRegenerate(assignment.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </button>
                        )}
                        {!isVoided && (
                          <button
                            onClick={() => handleVoid(label.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Void
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {labels.length === 0 && unlabeledAssignments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No package assignments found for this order.</p>
              <p className="text-sm mt-2">Assign packages to order items to generate labels.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
