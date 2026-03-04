import { useState, useCallback } from 'react';
import type { InternalInventoryLabel, InventoryItem } from '../types';
import { saveInternalLabel } from '../services/inventory.service';
import { logoService } from '@/features/settings/services';

function buildLabelData(item: InventoryItem): InternalInventoryLabel {
  return {
    package_id: item.package_id || item.id,
    strain: item.strain || 'Unknown',
    batch_id: item.batch || item.batch_number || 'N/A',
    product_type: item.category ? item.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown',
    harvest_date: item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : new Date().toLocaleDateString(),
    weight_grams: parseFloat(item.on_hand_qty?.toString() || '0'),
  };
}

async function loadLogoDataUrl(): Promise<string> {
  try {
    const logoUrl = await logoService.getLogoUrl('label');
    if (!logoUrl) return '';

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const cropTop = sourceHeight * 0.25;
        const cropBottom = sourceHeight * 0.25;
        const croppedHeight = sourceHeight - cropTop - cropBottom;

        canvas.width = sourceWidth;
        canvas.height = croppedHeight;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, cropTop, sourceWidth, croppedHeight, 0, 0, sourceWidth, croppedHeight);

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => resolve('');
      img.src = logoUrl;
    });
  } catch {
    return '';
  }
}

export function useMultiLabelPrint() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [labels, setLabels] = useState<InternalInventoryLabel[]>([]);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openMultiLabel = useCallback(async (items: InventoryItem[]) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsOpen(true);

      setLabels(items.map(buildLabelData));

      const logo = await loadLogoDataUrl();
      setLogoDataUrl(logo);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate labels');
      setIsLoading(false);
    }
  }, []);

  const printLabels = useCallback(async (printRef: HTMLDivElement | null): Promise<boolean> => {
    if (labels.length === 0 || !printRef) return false;

    try {
      setIsPrinting(true);

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
          <title>Print Internal Inventory Labels</title>
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
            }
            body {
              font-family: Arial, sans-serif;
            }
            .label-page {
              width: 1.5in;
              height: 2in;
              page-break-after: always;
            }
            .label-page:last-child {
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          ${printRef.innerHTML}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(labelHTML);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 500));

      const images = iframeDoc.getElementsByTagName('img');
      const imageLoadPromises = Array.from(images).map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 3000);
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      });

      await Promise.all(imageLoadPromises);
      await new Promise(resolve => setTimeout(resolve, 500));

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);

      for (const label of labels) {
        try {
          await saveInternalLabel({
            package_id: label.package_id,
            label_data: label,
            printed_at: new Date().toISOString(),
          });
        } catch (dbError) {
          console.error('Error saving label print record:', dbError);
        }
      }

      setIsPrinting(false);
      return true;
    } catch (err) {
      console.error('Error printing labels:', err);
      setIsPrinting(false);
      setError(err instanceof Error ? err.message : 'Failed to print labels');
      return false;
    }
  }, [labels]);

  const closeMultiLabel = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setIsPrinting(false);
    setLabels([]);
    setLogoDataUrl('');
    setError(null);
  }, []);

  return {
    isOpen,
    isLoading,
    isPrinting,
    labels,
    logoDataUrl,
    error,
    openMultiLabel,
    printLabels,
    closeMultiLabel,
  };
}
