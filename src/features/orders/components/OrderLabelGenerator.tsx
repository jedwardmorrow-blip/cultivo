import { useState } from 'react';
import { RefreshCw, Tag, Printer, X, AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { useOrderLabels, useGenerateLabels, useMarkLabelPrinted, useVoidLabel } from '../hooks/useOrderLabels';
import { usePackageAssignments } from '../hooks/usePackageAssignments';
import { LabelPrintPreview, BatchLabelPrintPreview } from './LabelPrintPreview';

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
  const [_selectedLabel, _setSelectedLabel] = useState<string | null>(null);
  const [previewLabelId, setPreviewLabelId] = useState<string | null>(null);
  const [batchPrintLabelIds, setBatchPrintLabelIds] = useState<string[]>([]);

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
          className="px-4 py-2 bg-cult-border text-cult-text-primary hover:bg-cult-text-muted transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            className="px-4 py-2 bg-cult-info text-white hover:bg-cult-info/80 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      <div className="bg-cult-surface-raised rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-cult-black text-cult-text-primary p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-wider">Label Management</h2>
            <p className="text-cult-text-muted text-sm mt-1">
              Generate and manage product labels for this order
            </p>
          </div>
          <button
            onClick={() => setExpandedView(false)}
            className="p-2 hover:bg-cult-border rounded transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-cult-surface-sunken border-b">
          <div className="text-center">
            <div className="text-3xl font-bold text-cult-text-primary">{stats.total}</div>
            <div className="text-sm text-cult-text-faint uppercase tracking-wide">Total</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cult-warning">{stats.pending}</div>
            <div className="text-sm text-cult-text-faint uppercase tracking-wide">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cult-success">{stats.printed}</div>
            <div className="text-sm text-cult-text-faint uppercase tracking-wide">Printed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cult-danger">{stats.voided}</div>
            <div className="text-sm text-cult-text-faint uppercase tracking-wide">Voided</div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-b flex items-center justify-between bg-cult-surface-raised">
          <div className="flex items-center gap-3">
            {unlabeledAssignments.length > 0 && (
              <button
                onClick={handleGenerateAll}
                disabled={loading}
                className="px-4 py-2 bg-cult-info text-white hover:bg-cult-info/80 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Tag className="w-4 h-4" />
                Generate All ({unlabeledAssignments.length})
              </button>
            )}
            {labels.filter(l => !l.voided_at).length > 0 && (
              <button
                onClick={() => {
                  const printableLabels = labels.filter(l => !l.voided_at).map(l => l.id);
                  setBatchPrintLabelIds(printableLabels);
                }}
                disabled={loading}
                className="px-4 py-2 bg-cult-success text-white hover:bg-cult-success/80 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print All Labels ({labels.filter(l => !l.voided_at).length})
              </button>
            )}
            <button
              onClick={refetchLabels}
              disabled={loading}
              className="px-4 py-2 bg-cult-surface-raised text-cult-text-primary hover:bg-cult-surface-overlay transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <h3 className="text-lg font-bold text-cult-text-primary mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-cult-warning" />
                Packages Without Labels ({unlabeledAssignments.length})
              </h3>
              <div className="space-y-2">
                {unlabeledAssignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="bg-cult-warning-muted border border-cult-warning/30 rounded p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-cult-text-primary">{assignment.package_id}</div>
                      <div className="text-sm text-cult-text-faint">
                        {assignment.product_name} • {assignment.strain || 'Unknown strain'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateSingle(assignment.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-cult-info text-white hover:bg-cult-info/80 transition-all font-medium uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <h3 className="text-lg font-bold text-cult-text-primary mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cult-success" />
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
                          ? 'bg-cult-danger-muted border border-cult-danger/30 opacity-60'
                          : isPrinted
                          ? 'bg-cult-success-muted border border-cult-success/30'
                          : 'bg-cult-surface-raised border-cult-border-subtle'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-bold text-cult-text-primary">
                            {label.label_number}
                          </span>
                          {isVoided && (
                            <span className="px-2 py-0.5 bg-cult-danger text-white text-xs uppercase tracking-wide rounded">
                              Voided
                            </span>
                          )}
                          {isPrinted && (
                            <span className="px-2 py-0.5 bg-cult-success text-white text-xs uppercase tracking-wide rounded">
                              Printed
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2 py-0.5 bg-cult-warning text-cult-surface text-xs uppercase tracking-wide rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-cult-text-faint">
                          Package: {label.package_id} • {label.product_name}
                        </div>
                        {label.strain && (
                          <div className="text-sm text-cult-text-faint">
                            Strain: {label.strain} • Batch: {label.batch_number || 'N/A'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isVoided && (
                          <>
                            <button
                              onClick={() => setPreviewLabelId(label.id)}
                              disabled={loading}
                              className="px-3 py-1 bg-cult-info text-white hover:bg-cult-info/80 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Preview
                            </button>
                            {!isPrinted && (
                              <button
                                onClick={() => handleMarkPrinted(label.id)}
                                disabled={loading}
                                className="px-3 py-1 bg-cult-success text-white hover:bg-cult-success/80 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" />
                                Mark Printed
                              </button>
                            )}
                          </>
                        )}
                        {!isVoided && assignment && (
                          <button
                            onClick={() => handleRegenerate(assignment.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-cult-info text-white hover:bg-cult-info/80 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </button>
                        )}
                        {!isVoided && (
                          <button
                            onClick={() => handleVoid(label.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-cult-danger text-white hover:bg-cult-danger/80 transition-all text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
            <div className="text-center py-12 text-cult-text-muted">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No package assignments found for this order.</p>
              <p className="text-sm mt-2">Assign packages to order items to generate labels.</p>
            </div>
          )}
        </div>
      </div>

      {/* Label Print Preview Modal */}
      {previewLabelId && (
        <LabelPrintPreview
          labelId={previewLabelId}
          onClose={() => setPreviewLabelId(null)}
          onPrintComplete={() => {
            handleMarkPrinted(previewLabelId);
            setPreviewLabelId(null);
          }}
        />
      )}

      {/* Batch Print Preview Modal */}
      {batchPrintLabelIds.length > 0 && (
        <BatchLabelPrintPreview
          labelIds={batchPrintLabelIds}
          onClose={() => setBatchPrintLabelIds([])}
          onPrintComplete={async () => {
            // Mark all printed labels
            for (const labelId of batchPrintLabelIds) {
              await handleMarkPrinted(labelId);
            }
            setBatchPrintLabelIds([]);
          }}
        />
      )}
    </div>
  );
}
