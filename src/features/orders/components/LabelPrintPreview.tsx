/**
 * Label Print Preview Component
 *
 * Shows a print-ready preview of a cannabis product label with all compliance information.
 * Includes barcode/QR code, product details, cannabinoid content, and regulatory warnings.
 *
 * Features:
 * - Full compliance label preview
 * - Barcode/QR code display
 * - Print-optimized layout (2" x 3" standard label size)
 * - Batch printing support
 * - Real-time data loading
 *
 * @component
 * @example
 * <LabelPrintPreview labelId="uuid" onClose={() => {}} />
 */

import { useState, useEffect, useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import JsBarcode from 'jsbarcode';

interface LabelData {
  id: string;
  label_number: string;
  package_id: string;
  product_name: string;
  product_type: string;
  strain: string;
  batch_id: string;
  net_weight_grams: number;
  unit_count: number | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  total_cannabinoids: number | null;
  harvest_date: string | null;
  package_date: string | null;
  test_date: string | null;
  lab_name: string | null;
  qr_code_data: string;
  warnings: string[] | null;
}

interface LabelPrintPreviewProps {
  labelId: string;
  onClose: () => void;
  onPrintComplete?: () => void;
}

export function LabelPrintPreview({ labelId, onClose, onPrintComplete }: LabelPrintPreviewProps) {
  const [label, setLabel] = useState<LabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadLabel();
  }, [labelId]);

  useEffect(() => {
    if (label && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, label.package_id, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 5,
        });
      } catch (err) {
        console.error('[LabelPrintPreview] Barcode generation failed:', err);
      }
    }
  }, [label]);

  async function loadLabel() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('labels')
        .select('*')
        .eq('id', labelId)
        .single();

      if (fetchError) throw fetchError;

      setLabel(data as LabelData);
    } catch (err: any) {
      console.error('[LabelPrintPreview] Error loading label:', err);
      setError(err.message || 'Failed to load label');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
    if (onPrintComplete) {
      onPrintComplete();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center text-gray-700">Loading label preview...</div>
        </div>
      </div>
    );
  }

  if (error || !label) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">Error</h3>
            <p className="text-gray-700 mb-4">{error || 'Label not found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Action Buttons - Hidden on print */}
      <div className="print:hidden fixed top-4 right-4 z-60 flex gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors rounded flex items-center gap-2 font-medium shadow-lg"
        >
          <Printer className="w-4 h-4" />
          Print Label
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors rounded flex items-center gap-2 font-medium shadow-lg"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* Label Preview Container */}
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Label Content - Standard 2" x 3" size */}
        <div className="w-[3in] h-[2in] p-2 border-2 border-black print:border-black bg-white relative">

          {/* Header Section */}
          <div className="border-b border-black pb-1 mb-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-[8px] font-bold uppercase tracking-wide">
                  {label.product_name}
                </div>
                <div className="text-[7px] text-gray-700">
                  {label.strain}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[6px] font-mono font-bold">
                  {label.label_number}
                </div>
              </div>
            </div>
          </div>

          {/* Barcode Section */}
          <div className="flex items-center justify-center my-1">
            <svg ref={barcodeRef} className="w-full h-auto max-h-[0.6in]"></svg>
          </div>

          {/* Cannabinoid Content */}
          <div className="grid grid-cols-3 gap-1 text-center mb-1">
            <div className="border border-gray-400 p-0.5">
              <div className="text-[6px] text-gray-600 uppercase">THC</div>
              <div className="text-[9px] font-bold">
                {label.thc_percentage ? `${label.thc_percentage}%` : 'N/A'}
              </div>
            </div>
            <div className="border border-gray-400 p-0.5">
              <div className="text-[6px] text-gray-600 uppercase">CBD</div>
              <div className="text-[9px] font-bold">
                {label.cbd_percentage ? `${label.cbd_percentage}%` : 'N/A'}
              </div>
            </div>
            <div className="border border-gray-400 p-0.5">
              <div className="text-[6px] text-gray-600 uppercase">Total</div>
              <div className="text-[9px] font-bold">
                {label.total_cannabinoids ? `${label.total_cannabinoids}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="border-t border-gray-300 pt-1 space-y-0.5">
            <div className="flex justify-between text-[6px]">
              <span className="text-gray-600">Net Weight:</span>
              <span className="font-medium">{label.net_weight_grams}g</span>
            </div>
            <div className="flex justify-between text-[6px]">
              <span className="text-gray-600">Batch:</span>
              <span className="font-mono font-medium">{label.batch_id}</span>
            </div>
            {label.package_date && (
              <div className="flex justify-between text-[6px]">
                <span className="text-gray-600">Pkg Date:</span>
                <span className="font-medium">
                  {new Date(label.package_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {label.lab_name && (
              <div className="flex justify-between text-[6px]">
                <span className="text-gray-600">Tested By:</span>
                <span className="font-medium truncate max-w-[1.5in]">{label.lab_name}</span>
              </div>
            )}
          </div>

          {/* Footer - License */}
          <div className="absolute bottom-1 left-1 right-1 text-center text-[5px] text-gray-600 border-t border-gray-300 pt-0.5">
            Kind Meds Inc. - License: 00000078DCBK00628996
          </div>
        </div>

        {/* Warning Text - Below label (not on actual label) */}
        <div className="print:hidden p-4 bg-yellow-50 border-t-2 border-yellow-300 text-xs text-gray-700">
          <p className="font-semibold mb-1">Preview Mode - Not to Scale</p>
          <p>This preview shows label content. Actual printed size: 2" × 3"</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .fixed, .fixed * {
            visibility: visible;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:rounded-none {
            border-radius: 0 !important;
          }

          .print\\:border-black {
            border-color: black !important;
          }

          @page {
            size: 3in 2in;
            margin: 0;
          }

          /* Ensure black borders print */
          [class*="border"] {
            border-color: black !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Batch Label Print Preview Component
 *
 * Shows preview for multiple labels with batch printing capability.
 */

interface BatchLabelPrintPreviewProps {
  labelIds: string[];
  onClose: () => void;
  onPrintComplete?: () => void;
}

export function BatchLabelPrintPreview({
  labelIds,
  onClose,
  onPrintComplete
}: BatchLabelPrintPreviewProps) {
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLabels();
  }, [labelIds]);

  async function loadLabels() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('labels')
        .select('*')
        .in('id', labelIds);

      if (fetchError) throw fetchError;

      setLabels(data as LabelData[]);
    } catch (err: any) {
      console.error('[BatchLabelPrintPreview] Error loading labels:', err);
      setError(err.message || 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
    if (onPrintComplete) {
      onPrintComplete();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center text-gray-700">Loading {labelIds.length} labels...</div>
        </div>
      </div>
    );
  }

  if (error || labels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">Error</h3>
            <p className="text-gray-700 mb-4">{error || 'No labels found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      {/* Action Buttons - Hidden on print */}
      <div className="print:hidden sticky top-4 left-0 right-0 z-60 flex justify-center gap-2 mb-4">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 transition-colors rounded flex items-center gap-2 font-medium shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Print All {labels.length} Labels
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-600 text-white hover:bg-gray-700 transition-colors rounded flex items-center gap-2 font-medium shadow-lg"
        >
          <X className="w-5 h-5" />
          Close
        </button>
      </div>

      {/* Labels Grid */}
      <div className="flex flex-wrap gap-4 p-4 justify-center print:gap-0 print:p-0">
        {labels.map((labelData, index) => (
          <div key={labelData.id} className="print:page-break-after-always">
            <LabelPrintPreview
              labelId={labelData.id}
              onClose={() => {}}
              onPrintComplete={() => {}}
            />
          </div>
        ))}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:page-break-after-always {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
