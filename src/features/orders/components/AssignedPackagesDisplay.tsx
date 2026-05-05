import { Package, Tag, Printer, XCircle, Trash2, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  useOrderItemPackageAssignments,
  useRemoveAssignment,
  useMarkLabelPrinted,
  useVoidLabel,
} from '../hooks';

interface AssignedPackagesDisplayProps {
  orderItemId: string;
  unit: string;
}

export function AssignedPackagesDisplay({
  orderItemId,
  unit,
}: AssignedPackagesDisplayProps) {
  const { assignments, loading, error } = useOrderItemPackageAssignments(orderItemId);
  const { removeAssignment, removing } = useRemoveAssignment();
  const { markAsPrinted, marking } = useMarkLabelPrinted();
  const { voidLabel, voiding } = useVoidLabel();

  const handleRemoveAssignment = async (assignmentId: string, hasLabel: boolean) => {
    if (!confirm('Remove this package assignment?')) return;

    try {
      await removeAssignment(assignmentId, hasLabel);
    } catch (error) {
      console.error('[AssignedPackagesDisplay] Remove failed:', error);
    }
  };

  const handleMarkPrinted = async (labelId: string) => {
    try {
      await markAsPrinted(labelId);
    } catch (error) {
      console.error('[AssignedPackagesDisplay] Mark printed failed:', error);
    }
  };

  const handleVoidLabel = async (labelId: string) => {
    if (!confirm('Void this label? This action cannot be undone.')) return;

    try {
      await voidLabel(labelId);
    } catch (error) {
      console.error('[AssignedPackagesDisplay] Void label failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <LoadingSpinner message="Loading assigned packages..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-cult-danger-muted border border-cult-danger text-cult-danger">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load assignments: {error.message}</span>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-4 bg-cult-surface border border-cult-border text-center">
        <Package className="w-8 h-8 text-cult-text-muted mx-auto mb-2" />
        <p className="text-cult-text-muted text-sm">No packages assigned yet</p>
      </div>
    );
  }

  const activeAssignments = assignments.filter(a => a.assignment_status !== 'released');
  const totalAssigned = activeAssignments.reduce((sum, a) => sum + Number(a.quantity_assigned), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
          Assigned Packages ({assignments.length})
        </h4>
        <div className="text-sm">
          <span className="text-cult-text-muted">Total: </span>
          <span className="font-bold text-cult-success">
            {totalAssigned} {unit}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {activeAssignments.map((assignment) => {
          const hasLabel = !!assignment.label_id;
          const labelPrinted = !!assignment.printed_at;
          const labelVoided = !!assignment.voided_at;
          const isFulfilled = assignment.assignment_status === 'fulfilled';

          return (
            <div
              key={assignment.id}
              className={`p-4 bg-cult-surface border transition-colors ${
                isFulfilled
                  ? 'border-cult-success/40'
                  : 'border-cult-border hover:border-cult-text-muted'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className={`w-5 h-5 ${isFulfilled ? 'text-cult-success' : 'text-cult-success'}`} />
                    <span className="font-bold text-cult-text-primary">
                      {assignment.package_id || 'Unknown Package'}
                    </span>
                    {isFulfilled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cult-success-muted border border-cult-success/50 text-cult-success text-xs font-bold uppercase">
                        <ShieldCheck className="w-3 h-3" />
                        Fulfilled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cult-info-muted border border-cult-info/40 text-cult-info text-xs font-bold uppercase">
                        <Lock className="w-3 h-3" />
                        Reserved
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-cult-text-muted">Strain</p>
                      <p className="text-cult-text-primary">{assignment.strain || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-cult-text-muted">Batch</p>
                      <p className="text-cult-text-primary">{assignment.batch || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-cult-text-muted">Quantity Assigned</p>
                      <p className="text-cult-text-primary font-bold">
                        {assignment.quantity_assigned} {unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-cult-text-muted">Package Available</p>
                      <p className="text-cult-text-primary">
                        {assignment.available_qty !== null ? `${assignment.available_qty} ${unit}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {assignment.room && (
                    <div className="mt-2 text-sm">
                      <span className="text-cult-text-muted">Location: </span>
                      <span className="text-cult-text-primary">{assignment.room}</span>
                    </div>
                  )}

                  {hasLabel && (
                    <div className="mt-3 p-3 bg-cult-surface border border-cult-success/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-cult-success" />
                        <span className="text-xs font-bold text-cult-success uppercase tracking-wider">
                          Label Generated
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-cult-text-primary font-medium">
                            {assignment.label_number || 'Unknown Label'}
                          </p>
                          {labelVoided && (
                            <span className="inline-block mt-1 px-2 py-1 bg-cult-danger-muted border border-cult-danger text-cult-danger text-xs font-bold uppercase">
                              VOIDED
                            </span>
                          )}
                          {!labelVoided && labelPrinted && (
                            <span className="inline-block mt-1 px-2 py-1 bg-cult-success-muted border border-cult-success text-cult-success text-xs font-bold uppercase">
                              PRINTED
                            </span>
                          )}
                          {!labelVoided && !labelPrinted && (
                            <span className="inline-block mt-1 px-2 py-1 bg-cult-warning-muted border border-cult-warning text-cult-warning text-xs font-bold uppercase">
                              PENDING PRINT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!labelVoided && !labelPrinted && (
                            <button
                              onClick={() => handleMarkPrinted(assignment.label_id!)}
                              disabled={marking}
                              className="p-2 bg-cult-success hover:bg-cult-success/80 text-white transition-colors disabled:opacity-50"
                              title="Mark as printed"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                          {!labelVoided && (
                            <button
                              onClick={() => handleVoidLabel(assignment.label_id!)}
                              disabled={voiding}
                              className="p-2 bg-cult-danger hover:bg-cult-danger/80 text-white transition-colors disabled:opacity-50"
                              title="Void label"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {assignment.notes && (
                    <div className="mt-2 text-sm">
                      <span className="text-cult-text-muted">Notes: </span>
                      <span className="text-cult-text-primary">{assignment.notes}</span>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-cult-text-muted">
                    Assigned {new Date(assignment.assigned_at).toLocaleString()}
                  </div>
                </div>

                {!isFulfilled && (
                  <button
                    onClick={() => handleRemoveAssignment(assignment.id, hasLabel)}
                    disabled={removing}
                    className="ml-4 p-2 text-cult-danger hover:text-cult-danger/80 hover:bg-cult-danger-muted transition-colors disabled:opacity-50"
                    title="Remove assignment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
