import { useRef, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { InternalInventoryLabel } from '../types';

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

          <div className="p-16 bg-cult-surface flex items-center justify-center" style={{ minHeight: '600px' }}>
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
                transform: 'scale(3)',
                transformOrigin: 'center',
                margin: '80px'
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

interface LabelContentProps {
  labelData: InternalInventoryLabel;
  logoDataUrl: string;
  forPrint: boolean;
}

const LabelContent = ({ labelData, logoDataUrl, forPrint }: LabelContentProps) => {
  return (
    <div
      style={{
        width: '1.5in',
        height: '2in',
        backgroundColor: 'white',
        color: 'black',
        padding: '0.1in',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        border: forPrint ? 'none' : '1px solid #ddd',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '0.05in' }}>
        {logoDataUrl && (
          <img
            src={logoDataUrl}
            alt="CULT Logo"
            style={{
              width: '1.1in',
              height: 'auto',
              display: 'block',
              margin: '0 auto 0.05in auto',
            }}
          />
        )}
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.08in',
        fontSize: '9pt',
      }}>
        <div style={{
          borderBottom: '1px solid #333',
          paddingBottom: '0.04in',
        }}>
          <div style={{
            fontSize: '7pt',
            color: '#666',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Strain
          </div>
          <div style={{
            fontSize: '11pt',
            fontWeight: 'bold',
            marginTop: '0.02in',
          }}>
            {labelData.strain}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.05in',
        }}>
          <div>
            <div style={{
              fontSize: '6pt',
              color: '#666',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}>
              Batch ID
            </div>
            <div style={{
              fontSize: '9pt',
              fontWeight: 'bold',
              marginTop: '0.01in',
            }}>
              {labelData.batch_id}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '6pt',
              color: '#666',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}>
              Weight
            </div>
            <div style={{
              fontSize: '9pt',
              fontWeight: 'bold',
              marginTop: '0.01in',
            }}>
              {labelData.weight_grams.toFixed(1)}g
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #ddd',
          paddingTop: '0.04in',
        }}>
          <div style={{
            fontSize: '6pt',
            color: '#666',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>
            Product Type
          </div>
          <div style={{
            fontSize: '8pt',
            fontWeight: '500',
            marginTop: '0.01in',
            lineHeight: '1.2',
          }}>
            {labelData.product_type}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '6pt',
            color: '#666',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>
            Harvest Date
          </div>
          <div style={{
            fontSize: '8pt',
            fontWeight: '500',
            marginTop: '0.01in',
          }}>
            {labelData.harvest_date}
          </div>
        </div>
      </div>

      <div style={{
        fontSize: '5pt',
        color: '#999',
        textAlign: 'center',
        marginTop: '0.05in',
        borderTop: '1px solid #eee',
        paddingTop: '0.02in',
      }}>
        INTERNAL USE ONLY - {labelData.package_id}
      </div>
    </div>
  );
};
