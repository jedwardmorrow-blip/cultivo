import { CheckCircle, AlertCircle, FileText, Edit2 } from 'lucide-react';
import type { COAUploadQueueItem } from '../services/coa.service';

interface COAConfirmationScreenProps {
  queue: COAUploadQueueItem[];
  onEdit: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isUploading: boolean;
}

export function COAConfirmationScreen({
  queue,
  onEdit,
  onConfirm,
  onCancel,
  isUploading
}: COAConfirmationScreenProps) {
  const reviewedCount = queue.filter(q => q.status === 'reviewed').length;
  const allReviewed = reviewedCount === queue.length;
  const hasErrors = queue.some(q => q.status === 'error');

  return (
    <div className="space-y-6">
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
              Confirm COA Uploads
            </h3>
            <p className="text-sm text-cult-light-gray mt-2">
              Review all COAs before saving to the database
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 border ${
            allReviewed
              ? 'border-green-700 bg-green-900/20 text-green-400'
              : 'border-amber-700 bg-amber-900/20 text-amber-400'
          }`}>
            {allReviewed ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">
              {reviewedCount} of {queue.length} Reviewed
            </span>
          </div>
        </div>

        {!allReviewed && (
          <div className="mb-6 flex items-start gap-2 p-4 bg-amber-900/20 border border-amber-700 text-amber-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Not all COAs have been reviewed</p>
              <p className="text-sm mt-1">
                Please review all COAs or remove unreviewed items from the queue before confirming.
              </p>
            </div>
          </div>
        )}

        {hasErrors && (
          <div className="mb-6 flex items-start gap-2 p-4 bg-red-900/20 border border-red-700 text-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Some COAs have errors</p>
              <p className="text-sm mt-1">
                Please fix or remove COAs with errors before confirming.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 border transition-all ${
                item.status === 'reviewed'
                  ? 'border-green-700/50 bg-green-900/10'
                  : item.status === 'error'
                  ? 'border-red-700/50 bg-red-900/10'
                  : 'border-amber-700/50 bg-amber-900/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {item.status === 'reviewed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                  ) : (
                    <FileText className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-cult-white font-medium">
                        {item.fileName}
                      </h4>
                      {item.status === 'reviewed' && (
                        <span className="text-xs px-2 py-0.5 bg-green-700 text-green-100 uppercase tracking-wider">
                          Ready
                        </span>
                      )}
                    </div>

                    {item.parsedData && (
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-cult-light-gray">
                          <span className="font-medium">Strain:</span>
                          <span>{item.parsedData.strain_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-cult-light-gray">
                          <span className="font-medium">Batch Number:</span>
                          <span>{item.parsedData.batch_number}</span>
                        </div>
                        {item.selectedBatchId && (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>Batch assigned</span>
                          </div>
                        )}
                        {item.parsedData.thc_percentage !== null && (
                          <div className="flex items-center gap-2 text-cult-lighter-gray">
                            <span>THC: {item.parsedData.thc_percentage.toFixed(2)}%</span>
                            {item.parsedData.cbd_percentage !== null && item.parsedData.cbd_percentage > 0 && (
                              <span>• CBD: {item.parsedData.cbd_percentage.toFixed(2)}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {item.error && (
                      <p className="text-sm text-red-400 mt-2">{item.error}</p>
                    )}

                    {item.status !== 'reviewed' && !item.error && (
                      <p className="text-sm text-amber-400 mt-2">
                        Not yet reviewed
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onEdit(index)}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-3 py-2 border border-cult-medium-gray text-cult-white text-sm font-medium uppercase tracking-wider hover:border-cult-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 pt-6 border-t border-cult-medium-gray">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="px-6 py-3 border border-cult-medium-gray text-cult-white font-medium uppercase tracking-wider hover:border-cult-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={!allReviewed || hasErrors || isUploading}
            className="px-8 py-3 bg-green-600 text-white font-medium uppercase tracking-wider hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Confirm & Save ${queue.length} COA${queue.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {(!allReviewed || hasErrors) && (
          <div className="mt-4 text-center">
            <p className="text-sm text-cult-light-gray">
              Click "Edit" on any COA to make changes or complete missing reviews
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
