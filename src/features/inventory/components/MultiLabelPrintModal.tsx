import { useRef, useEffect } from 'react';
import { Printer, X, Tag } from 'lucide-react';
import type { InternalInventoryLabel } from '../types';
import { LabelContent } from './LabelContent';

interface MultiLabelPrintModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isPrinting: boolean;
  labels: InternalInventoryLabel[];
  logoDataUrl: string;
  error: string | null;
  onClose: () => void;
  onPrint: (printRef: HTMLDivElement | null) => Promise<boolean>;
}

export function MultiLabelPrintModal({
  isOpen,
  isLoading,
  isPrinting,
  labels,
  logoDataUrl,
  error,
  onClose,
  onPrint,
}: MultiLabelPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    const success = await onPrint(printRef.current);
    if (success) {
      setTimeout(() => onClose(), 500);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-cult-surface rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-cult-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-cult-success" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  Print {labels.length} Label{labels.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-cult-text-muted mt-0.5">
                  Each label prints on a separate 1.5" x 2" page
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                disabled={isLoading || isPrinting || labels.length === 0 || !!error}
                className="flex items-center gap-2 px-4 py-2 bg-cult-success hover:bg-cult-success/80 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'Printing...' : isLoading ? 'Loading...' : `Print ${labels.length} Label${labels.length !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={onClose}
                className="text-cult-text-muted hover:text-white p-2 rounded hover:bg-cult-surface-raised transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && (
              <div className="text-cult-text-faint text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cult-border-strong mx-auto mb-4"></div>
                <p>Loading label data...</p>
              </div>
            )}

            {error && (
              <div className="bg-cult-danger-muted border border-cult-danger text-cult-danger px-4 py-3 rounded max-w-md mx-auto">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            {!isLoading && !error && labels.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
                {labels.map((label, idx) => (
                  <div key={`${label.package_id}-${idx}`} className="flex flex-col items-center gap-2">
                    <div style={{ transform: 'scale(1.4)', transformOrigin: 'top center' }}>
                      <LabelContent
                        labelData={label}
                        logoDataUrl={logoDataUrl}
                        forPrint={false}
                      />
                    </div>
                    <span className="text-xs text-cult-text-muted mt-6 font-mono">
                      {label.package_id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {labels.length > 0 && (
        <div ref={printRef} style={{ display: 'none' }}>
          {labels.map((label, idx) => (
            <div key={`print-${label.package_id}-${idx}`} className="label-page">
              <LabelContent
                labelData={label}
                logoDataUrl={logoDataUrl}
                forPrint={true}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
