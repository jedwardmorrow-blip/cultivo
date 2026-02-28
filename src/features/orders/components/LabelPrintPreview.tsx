import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logoService } from '@/features/settings/services';
import { DEFAULT_LICENSE_NUMBER, DEFAULT_LICENSE_NAME } from '@/lib/constants';
import QRCode from 'qrcode';
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
  lineage: string | null;
  dominance_type: string | null;
  compliance_uid: string | null;
}

const ADDITIVES_TEXT = 'Nitrogen, Phosphorus, Boron, Potassium, Calcium, Magnesium, Zinc, Vitamin B';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function formatCbd(val: number | null): string {
  if (val === null || val === undefined) return 'ND%';
  if (val === 0) return 'ND%';
  return `${val}%`;
}

function formatThc(val: number | null): string {
  if (val === null || val === undefined) return 'N/A';
  return `${val}%`;
}

function formatDominance(val: string | null): string {
  if (!val) return '';
  return val.replace(/-/g, ' ');
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
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [barcodeUrl, setBarcodeUrl] = useState('');
  const [imagesReady, setImagesReady] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLabel();
  }, [labelId]);

  useEffect(() => {
    if (!label) return;
    setImagesReady(false);

    Promise.all([
      loadLogo(),
      generateQrCode(label.qr_code_data),
      generateBarcode(label.package_id),
    ]).then(() => {
      setTimeout(() => setImagesReady(true), 600);
    }).catch(() => {
      setImagesReady(true);
    });
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
      setError(err.message || 'Failed to load label');
    } finally {
      setLoading(false);
    }
  }

  async function loadLogo() {
    try {
      const url = await logoService.getLogoUrl('label');
      if (!url) { setLogoDataUrl(''); return; }

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(); return; }
          const cropTop = img.height * 0.25;
          const cropBottom = img.height * 0.25;
          const croppedH = img.height - cropTop - cropBottom;
          canvas.width = img.width;
          canvas.height = croppedH;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, cropTop, img.width, croppedH, 0, 0, img.width, croppedH);
          setLogoDataUrl(canvas.toDataURL('image/png'));
          resolve();
        };
        img.onerror = () => { setLogoDataUrl(''); resolve(); };
        img.src = url;
      });
    } catch {
      setLogoDataUrl('');
    }
  }

  async function generateQrCode(data: string) {
    try {
      const url = await QRCode.toDataURL(data, { width: 200, margin: 0, color: { dark: '#000000', light: '#FFFFFF' } });
      setQrCodeUrl(url);
    } catch {
      setQrCodeUrl('');
    }
  }

  function generateBarcode(data: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, data, {
          format: 'CODE128',
          width: 3,
          height: 90,
          displayValue: true,
          fontSize: 14,
          margin: 0,
          font: 'Arial',
        });
        setBarcodeUrl(canvas.toDataURL());
        resolve();
      } catch {
        setBarcodeUrl('');
        resolve();
      }
    });
  }

  function handlePrint() {
    if (!printRef.current || !imagesReady) return;
    setIsPrinting(true);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { setIsPrinting(false); return; }

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Label</title>
      <style>
        @page { size: 1.5in 2in; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; margin: 0; padding: 0; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 1.5in; height: 2in; }
        body { font-family: Arial, Helvetica, sans-serif; }
      </style>
    </head><body>${printRef.current.innerHTML}</body></html>`);
    doc.close();

    const imgs = doc.getElementsByTagName('img');
    const waits = Array.from(imgs).map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((res) => {
        const t = setTimeout(() => res(), 3000);
        img.onload = () => { clearTimeout(t); res(); };
        img.onerror = () => { clearTimeout(t); res(); };
      });
    });

    Promise.all(waits).then(() => new Promise(r => setTimeout(r, 500))).then(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsPrinting(false);
        onPrintComplete?.();
      }, 1000);
    });
  }

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center text-cult-text-muted">Loading label preview...</div>
        </div>
      </div>,
      document.body
    );
  }

  if (error || !label) {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">Error</h3>
            <p className="text-cult-text-muted mb-4">{error || 'Label not found'}</p>
            <button onClick={onClose} className="px-4 py-2 bg-cult-surface-overlay text-white hover:bg-cult-surface-overlay transition-colors rounded">Close</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const license = label.compliance_uid || DEFAULT_LICENSE_NUMBER;
  const dominance = formatDominance(label.dominance_type);

  const labelContent = (
    <div style={{
      width: '1.5in',
      height: '2in',
      backgroundColor: 'white',
      color: 'black',
      padding: '0.06in',
      boxSizing: 'border-box',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '6pt',
      lineHeight: '1.15',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.01in' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {logoDataUrl && (
            <img src={logoDataUrl} alt="Logo" style={{ width: '0.75in', height: 'auto', display: 'block', marginBottom: '0.01in' }} />
          )}
          <div style={{ fontSize: '6.5pt', fontWeight: 'bold', lineHeight: '1.15', marginBottom: '0.005in' }}>
            {label.product_name}
          </div>
          {label.lineage && (
            <div style={{ fontSize: '4.5pt', lineHeight: '1.2', marginBottom: '0.005in' }}>
              <span style={{ fontWeight: 'bold' }}>Lineage - </span>{label.lineage}
            </div>
          )}
        </div>
        <div style={{ marginLeft: '0.04in', flexShrink: 0 }}>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR" style={{ width: '0.5in', height: '0.5in', display: 'block' }} />
          )}
        </div>
      </div>

      <div style={{ marginBottom: '0.01in' }}>
        {dominance && (
          <div style={{ fontSize: '5.5pt', fontWeight: 'bold', marginBottom: '0.005in' }}>{dominance}</div>
        )}
        <div style={{ fontSize: '5pt' }}>
          <span style={{ fontWeight: 'bold' }}>Package Date: </span>{formatDate(label.package_date)}
        </div>
        {label.harvest_date && (
          <div style={{ fontSize: '5pt' }}>
            <span style={{ fontWeight: 'bold' }}>Harvest Date: </span>{formatDate(label.harvest_date)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.06in', marginBottom: '0.008in' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '5pt', fontWeight: 'bold' }}>MMJ Net Weight: {label.net_weight_grams} Grams</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.06in', marginBottom: '0.008in' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '5pt', fontWeight: 'bold' }}>Batch:</div>
          <div style={{ fontSize: '6pt', fontWeight: 'bold' }}>{label.batch_id}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '5pt', fontWeight: 'bold' }}>THC:</div>
          <div style={{ fontSize: '6pt', fontWeight: 'bold' }}>{formatThc(label.thc_percentage)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '5pt', fontWeight: 'bold' }}>CBD:</div>
          <div style={{ fontSize: '6pt', fontWeight: 'bold' }}>{formatCbd(label.cbd_percentage)}</div>
        </div>
      </div>

      <div style={{ fontSize: '4pt', lineHeight: '1.25', marginBottom: '0.005in' }}>
        <div><span style={{ fontWeight: 'bold' }}>Additives: </span>{ADDITIVES_TEXT}</div>
      </div>

      <div style={{ fontSize: '4pt', lineHeight: '1.25', marginBottom: '0.005in' }}>
        <span style={{ fontWeight: 'bold' }}>License: </span>{DEFAULT_LICENSE_NAME} - {license}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {barcodeUrl && (
          <img src={barcodeUrl} alt="Barcode" style={{ width: '100%', maxWidth: '1.35in', height: 'auto', display: 'block' }} />
        )}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
      <div className="bg-cult-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-4 border-b border-cult-border flex items-center justify-between bg-cult-surface z-10">
          <h3 className="text-xl font-bold text-white">Label Preview (1.5" x 2")</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!imagesReady || isPrinting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Printing...' : imagesReady ? 'Print Label' : 'Loading...'}
            </button>
            <button onClick={onClose} className="text-cult-text-muted hover:text-white px-3">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-12 bg-cult-surface flex items-center justify-center overflow-hidden" style={{ minHeight: '600px' }}>
          <div style={{ transform: 'scale(2.8)', transformOrigin: 'center', margin: '80px' }}>
            {labelContent}
          </div>
        </div>
        <div className="p-4 bg-yellow-50 border-t-2 border-yellow-300 text-xs text-cult-text-muted">
          <p className="font-semibold mb-1">Preview Mode - Not to Scale</p>
          <p>This preview shows label content. Actual printed size: 1.5" x 2"</p>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {labelContent}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface BatchLabelPrintPreviewProps {
  labelIds: string[];
  onClose: () => void;
  onPrintComplete?: () => void;
}

export function BatchLabelPrintPreview({ labelIds, onClose, onPrintComplete }: BatchLabelPrintPreviewProps) {
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
      setError(err.message || 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center text-cult-text-muted">Loading {labelIds.length} labels...</div>
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
            <p className="text-cult-text-muted mb-4">{error || 'No labels found'}</p>
            <button onClick={onClose} className="px-4 py-2 bg-cult-surface-overlay text-white hover:bg-cult-surface-overlay transition-colors rounded">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="print:hidden sticky top-4 left-0 right-0 z-60 flex justify-center gap-2 mb-4">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-cult-surface-overlay text-white hover:bg-cult-surface-overlay transition-colors rounded flex items-center gap-2 font-medium shadow-lg"
        >
          <X className="w-5 h-5" />
          Close
        </button>
      </div>
      <div className="flex flex-wrap gap-4 p-4 justify-center">
        {labels.map((labelData) => (
          <div key={labelData.id}>
            <LabelPrintPreview
              labelId={labelData.id}
              onClose={() => {}}
              onPrintComplete={onPrintComplete}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
