import { useState } from 'react';
import { X, Printer, CheckCircle, Clock, Ban } from 'lucide-react';
import { useOrderItemLabels } from '../hooks/useOrderItemLabels';
import { useMarkLabelPrinted } from '../hooks/useOrderLabels';
import { LabelPrintPreview } from './LabelPrintPreview';
import { notificationService } from '@/services/notification.service';

interface OrderItemLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItemId: string;
  productName: string;
}

type FilterTab = 'all' | 'pending' | 'printed';

export function OrderItemLabelPrintModal({
  isOpen,
  onClose,
  orderItemId,
  productName,
}: OrderItemLabelPrintModalProps) {
  const { labels, stats, loading, refetch } = useOrderItemLabels(orderItemId);
  const { markAsPrinted } = useMarkLabelPrinted();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [printingAll, setPrintingAll] = useState(false);

  if (!isOpen) return null;

  const filteredLabels = labels.filter(label => {
    if (label.voided_at) return false;
    if (activeFilter === 'pending') return !label.printed_at;
    if (activeFilter === 'printed') return label.printed_at;
    return true;
  });

  const handlePrintAll = async () => {
    const unprintedLabels = labels.filter(l => !l.printed_at && !l.voided_at);

    if (unprintedLabels.length === 0) {
      notificationService.info('No unprinted labels to print');
      return;
    }

    setPrintingAll(true);

    for (const label of unprintedLabels) {
      setSelectedLabelId(label.id);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setPrintingAll(false);
    notificationService.success(`Printed ${unprintedLabels.length} labels`);
  };

  const handlePrintLabel = (labelId: string) => {
    setSelectedLabelId(labelId);
  };

  const handlePrintComplete = async () => {
    if (selectedLabelId) {
      try {
        await markAsPrinted(selectedLabelId);
        await refetch();
      } catch (error) {
        console.error('Error marking label as printed:', error);
      }
    }
    setSelectedLabelId(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (label: typeof labels[0]) => {
    if (label.voided_at) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-medium">
          <Ban className="w-3 h-3" />
          Voided
        </span>
      );
    }
    if (label.printed_at) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Printed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs font-medium">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-cult-dark-gray rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border-2 border-cult-medium-gray">
          <div className="p-4 border-b border-cult-medium-gray flex items-center justify-between bg-cult-near-black">
            <div>
              <h3 className="text-xl font-bold text-cult-white">Print Labels</h3>
              <p className="text-sm text-cult-lighter-gray mt-1">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-cult-lighter-gray hover:text-cult-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-cult-lighter-gray">Loading labels...</div>
            </div>
          ) : labels.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="text-cult-lighter-gray text-center">
                <p className="text-lg mb-2">No labels generated yet</p>
                <p className="text-sm">Labels are automatically generated when packages are assigned to this order item.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-cult-medium-gray bg-cult-near-black">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          activeFilter === 'all'
                            ? 'bg-cult-white text-cult-near-black'
                            : 'bg-cult-medium-gray text-cult-lighter-gray hover:bg-cult-lighter-gray'
                        }`}
                      >
                        All ({stats.total - stats.voided})
                      </button>
                      <button
                        onClick={() => setActiveFilter('pending')}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          activeFilter === 'pending'
                            ? 'bg-cult-white text-cult-near-black'
                            : 'bg-cult-medium-gray text-cult-lighter-gray hover:bg-cult-lighter-gray'
                        }`}
                      >
                        Pending ({stats.pending})
                      </button>
                      <button
                        onClick={() => setActiveFilter('printed')}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          activeFilter === 'printed'
                            ? 'bg-cult-white text-cult-near-black'
                            : 'bg-cult-medium-gray text-cult-lighter-gray hover:bg-cult-lighter-gray'
                        }`}
                      >
                        Printed ({stats.printed})
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handlePrintAll}
                    disabled={stats.pending === 0 || printingAll}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    Print All Unprinted ({stats.pending})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-3">
                  {filteredLabels.map(label => (
                    <div
                      key={label.id}
                      className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4 hover:border-cult-lighter-gray transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-cult-white">
                              {label.label_number}
                            </span>
                            {getStatusBadge(label)}
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="text-cult-lighter-gray">Package ID:</span>
                              <span className="ml-2 text-cult-white font-medium">{label.package_id}</span>
                            </div>
                            <div>
                              <span className="text-cult-lighter-gray">Weight:</span>
                              <span className="ml-2 text-cult-white font-medium">{label.net_weight_grams}g</span>
                            </div>
                            {label.strain && (
                              <div>
                                <span className="text-cult-lighter-gray">Strain:</span>
                                <span className="ml-2 text-cult-white font-medium">{label.strain}</span>
                              </div>
                            )}
                            {label.batch_number && (
                              <div>
                                <span className="text-cult-lighter-gray">Batch:</span>
                                <span className="ml-2 text-cult-white font-medium">{label.batch_number}</span>
                              </div>
                            )}
                            {label.thc_percentage !== null && (
                              <div>
                                <span className="text-cult-lighter-gray">THC:</span>
                                <span className="ml-2 text-cult-white font-medium">{label.thc_percentage}%</span>
                              </div>
                            )}
                            {label.cbd_percentage !== null && label.cbd_percentage > 0 && (
                              <div>
                                <span className="text-cult-lighter-gray">CBD:</span>
                                <span className="ml-2 text-cult-white font-medium">{label.cbd_percentage}%</span>
                              </div>
                            )}
                          </div>

                          {label.printed_at && (
                            <div className="mt-2 text-xs text-cult-lighter-gray">
                              Last printed: {formatDate(label.last_printed_at || label.printed_at)}
                              {label.print_count && label.print_count > 1 && (
                                <span className="ml-2">({label.print_count} times)</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {!label.voided_at && (
                            <button
                              onClick={() => handlePrintLabel(label.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors whitespace-nowrap"
                            >
                              <Printer className="w-4 h-4" />
                              Print
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredLabels.length === 0 && (
                  <div className="text-center text-cult-lighter-gray py-8">
                    {activeFilter === 'pending' && 'No pending labels'}
                    {activeFilter === 'printed' && 'No printed labels'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedLabelId && (
        <LabelPrintPreview
          labelId={selectedLabelId}
          onClose={() => setSelectedLabelId(null)}
          onPrintComplete={handlePrintComplete}
        />
      )}
    </>
  );
}
