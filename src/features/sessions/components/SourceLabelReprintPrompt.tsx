import { useState, useRef, useCallback } from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { saveInternalLabel } from '@/features/inventory/services/inventory.service';
import { logoService } from '@/features/settings/services';
import { LabelContent } from '@/features/inventory/components/LabelContent';
import type { InternalInventoryLabel } from '@/features/inventory/types';

interface SourceLabelReprintPromptProps {
  /** The package_id of the source bag (e.g. "260128-CAP-002") */
  sourcePackageId: string;
  /** The original weight before the pull (grams) */
  originalWeight: number;
  /** The weight pulled for this session (grams) */
  pullWeight: number;
  /** Strain name for the source bag */
  strain: string;
  /** Batch number text (e.g. "260128-CAP") */
  batchNumber: string;
  /** Batch UUID for harvest date lookup */
  batchId: string;
  /** Product category for label (e.g. "flower_bucked", "trim_bulk") */
  category?: string;
  /** Called when user finishes (either printed or skipped) */
  onDone: () => void;
}

/**
 * SourceLabelReprintPrompt
 *
 * Shown after a session is created when the source bag still has remaining weight.
 * Prompts the user to reprint the source bag's label with the updated (reduced) weight.
 *
 * Weight is calculated client-side as (originalWeight - pullWeight) because at session
 * start only a RESERVE has fired — the DB quantity hasn't been decremented yet (that
 * happens at finalization when CONSUME fires). The calculated weight matches the physical
 * reality at the moment the user is holding the bag.
 *
 * Batch metadata (strain, harvest_date, etc.) is fetched fresh from DB to avoid the
 * stale-state bug documented in label_print_stale_state_bug_2026_03_17.
 */
export function SourceLabelReprintPrompt({
  sourcePackageId,
  originalWeight,
  pullWeight,
  strain,
  batchNumber,
  batchId,
  category,
  onDone,
}: SourceLabelReprintPromptProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [labelData, setLabelData] = useState<InternalInventoryLabel | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const remainingWeight = originalWeight - pullWeight;

  // Build label data with fresh DB fetch for metadata
  const prepareLabelData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch fresh harvest date from batch_registry
      let harvestDateStr = 'N/A';
      if (batchId) {
        const { data: batch } = await supabase
          .from('batch_registry')
          .select('harvest_date')
          .eq('id', batchId)
          .maybeSingle();
        if (batch?.harvest_date) {
          const d = new Date(batch.harvest_date + 'T00:00:00');
          harvestDateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
      }

      const productType = category
        ? category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Unknown';

      const data: InternalInventoryLabel = {
        package_id: sourcePackageId,
        strain: strain || 'Unknown',
        batch_id: batchNumber || 'N/A',
        product_type: productType,
        harvest_date: harvestDateStr,
        weight_grams: remainingWeight,
      };

      setLabelData(data);

      // Load logo
      try {
        const logoUrl = await logoService.getLogoUrl('label');
        if (logoUrl) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                setLogoDataUrl('');
                resolve();
                return;
              }

              const sourceWidth = img.width;
              const sourceHeight = img.height;
              const cropTop = sourceHeight * 0.25;
              const cropBottom = sourceHeight * 0.25;
              const croppedHeight = sourceHeight - cropTop - cropBottom;

              canvas.width = sourceWidth;
              canvas.height = croppedHeight;

              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.drawImage(
                img,
                0, cropTop,
                sourceWidth, croppedHeight,
                0, 0,
                sourceWidth, croppedHeight
              );

              setLogoDataUrl(canvas.toDataURL('image/png'));
              resolve();
            };

            img.onerror = () => {
              setLogoDataUrl('');
              resolve();
            };

            img.src = logoUrl;
          });
        }
      } catch {
        setLogoDataUrl('');
      }

      setIsLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare label');
      setIsLoading(false);
      return null;
    }
  }, [batchId, batchNumber, category, remainingWeight, sourcePackageId, strain]);

  const handlePrint = async () => {
    // Prepare label data on first print click
    let data = labelData;
    if (!data) {
      data = await prepareLabelData();
      if (!data) return;
    }

    // Wait a tick for the ref to render with the new labelData
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!printRef.current) {
      setError('Print element not ready. Please try again.');
      return;
    }

    setIsPrinting(true);

    try {
      // Create iframe for printing (same pattern as useInventoryLabel)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      const labelHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reprint Source Label</title>
          <style>
            @page {
              size: 1.5in 2in;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 1.5in;
              height: 2in;
            }
            body {
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(labelHTML);
      iframeDoc.close();

      // Wait for iframe + images
      await new Promise(resolve => setTimeout(resolve, 500));
      const images = iframeDoc.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 3000);
            img.onload = () => { clearTimeout(timeout); resolve(null); };
            img.onerror = () => { clearTimeout(timeout); resolve(null); };
          });
        })
      );
      await new Promise(resolve => setTimeout(resolve, 500));

      // Print
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);

      // Save/update label record
      try {
        await saveInternalLabel({
          package_id: data.package_id,
          label_data: data,
          printed_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('Error saving reprint label record:', dbError);
      }

      setPrinted(true);
      setIsPrinting(false);
    } catch (err) {
      console.error('Error printing label:', err);
      setError(err instanceof Error ? err.message : 'Failed to print label');
      setIsPrinting(false);
    }
  };

  // Don't render if source bag is fully consumed
  if (remainingWeight <= 0) {
    return null;
  }

  return (
    <div className="bg-cult-warning-muted border border-cult-warning/50 rounded-lg p-4 mt-4">
      <div className="flex items-start gap-3">
        <Printer className="w-5 h-5 text-cult-warning mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-cult-warning/80 mb-1">
            Reprint Source Label?
          </h3>
          <p className="text-sm text-cult-text-secondary mb-3">
            <span className="font-mono text-cult-warning">{sourcePackageId}</span> now has{' '}
            <span className="font-bold text-cult-text-primary">{remainingWeight.toFixed(1)}g</span> remaining
            <span className="text-cult-text-muted"> (was {originalWeight.toFixed(1)}g, pulled {pullWeight.toFixed(1)}g)</span>.
            {' '}The physical label still shows the old weight.
          </p>

          {error && (
            <div className="mb-3 text-sm text-cult-danger bg-cult-danger-muted px-3 py-2 rounded">
              {error}
            </div>
          )}

          {printed ? (
            <div className="flex items-center gap-2 text-sm text-cult-green">
              <CheckCircle2 className="w-4 h-4" />
              <span>Label sent to printer</span>
              <button
                onClick={onDone}
                className="ml-auto px-4 py-1.5 bg-cult-green text-cult-black rounded font-bold text-sm hover:bg-cult-green-bright transition"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                disabled={isPrinting || isLoading}
                className="flex items-center gap-2 px-4 py-1.5 bg-cult-warning hover:bg-cult-warning/80 text-black rounded font-bold text-sm transition disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'Printing...' : isLoading ? 'Loading...' : 'Reprint Label'}
              </button>
              <button
                onClick={onDone}
                className="flex items-center gap-1 px-4 py-1.5 bg-cult-surface hover:bg-cult-border text-cult-text-secondary rounded text-sm transition"
              >
                <X className="w-3 h-3" />
                Skip
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden print content — only rendered when label data is ready */}
      {labelData && (
        <div ref={printRef} style={{ display: 'none' }}>
          <LabelContent
            labelData={labelData}
            logoDataUrl={logoDataUrl}
            forPrint={true}
          />
        </div>
      )}
    </div>
  );
}
