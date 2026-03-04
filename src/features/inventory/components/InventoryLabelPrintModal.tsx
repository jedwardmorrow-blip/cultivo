import { useRef, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { InternalInventoryLabel } from '../types';
import { LabelContent } from './LabelContent';

interface InventoryLabelPrintModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isPrinting: boolean;
  labelData: InternalInventoryLabel | null;
  logoDataUrl: string;
  error: string | null;
  onClose: () => void;
  onPrint: (printRef: HTMLDivElement | null) => Promise<boolean>;
}

export function InventoryLabelPrintModal({
  isOpen,
  isLoading,
  isPrinting,
  labelData,
  logoDataUrl,
  error,
  onClose,
  onPrint,
}: InventoryLabelPrintModalProps) {
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
        <div className="bg-cult-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-cult-border flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Internal Inventory Label (1.5" x 2")</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                disabled={isLoading || isPrinting || !labelData || !!error}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'Printing...' : isLoading ? 'Loading...' : 'Print Label'}
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

          <div className="p-8 bg-cult-surface flex items-center justify-center" style={{ minHeight: '500px' }}>
            {isLoading && (
              <div className="text-cult-text-faint text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cult-border-strong mx-auto mb-4"></div>
                <p>Loading label data...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            {!isLoading && !error && labelData && (
              <div style={{
                transform: 'scale(2.5)',
                transformOrigin: 'center',
              }}>
                <LabelContent
                  labelData={labelData}
                  logoDataUrl={logoDataUrl}
                  forPrint={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {labelData && (
        <div ref={printRef} style={{ display: 'none' }}>
          <LabelContent
            labelData={labelData}
            logoDataUrl={logoDataUrl}
            forPrint={true}
          />
        </div>
      )}
    </>
  );
}
