import { useState, useCallback } from 'react';
import type { InternalInventoryLabel, InventoryItem } from '../types';
import { saveInternalLabel } from '../services/inventory.service';
import { supabase } from '@/lib/supabase';
import { logoService } from '@/features/settings/services';

/**
 * useInventoryLabel
 *
 * Generates and manages inventory labels for printing using iframe-based printing.
 * Creates label data for internal warehouse tracking and prints labels with company logo.
 *
 * @returns {Object} Label state and functions (flat structure)
 *
 * @example
 * const { isOpen, labelData, openLabel, printLabel, closeLabel } = useInventoryLabel();
 * openLabel(inventoryItem);
 */

export function useInventoryLabel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [labelData, setLabelData] = useState<InternalInventoryLabel | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openLabel = useCallback(async (item: InventoryItem) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsOpen(true);

      // Create label data from inventory item
      const newLabelData: InternalInventoryLabel = {
        package_id: item.package_id || item.id,
        strain: item.strain || 'Unknown',
        batch_id: item.batch || 'N/A',
        product_type: item.category || 'Unknown',
        harvest_date: item.created_at ? new Date(item.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        weight_grams: parseFloat(item.on_hand_qty?.toString() || '0'),
      };

      setLabelData(newLabelData);

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
                console.warn('Could not get canvas context for logo');
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

              const dataUrl = canvas.toDataURL('image/png');
              setLogoDataUrl(dataUrl);
              resolve();
            };

            img.onerror = () => {
              console.warn('Failed to load logo, continuing without logo');
              setLogoDataUrl('');
              resolve();
            };

            img.src = logoUrl;
          });
        } else {
          console.warn('No label logo configured');
          setLogoDataUrl('');
        }
      } catch (logoError) {
        console.error('Error loading logo:', logoError);
        setLogoDataUrl('');
      }

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate label';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error generating label:', err);
    }
  }, []);

  const printLabel = useCallback(async (printRef: HTMLDivElement | null): Promise<boolean> => {
    if (!labelData || !printRef) {
      console.error('Label data or print ref not available');
      return false;
    }

    try {
      setIsPrinting(true);

      // Create iframe for printing
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

      // Create complete HTML document for printing
      const labelHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Print Internal Inventory Label</title>
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
          ${printRef.innerHTML}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(labelHTML);
      iframeDoc.close();

      // Wait for iframe to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wait for all images to load
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

      // Trigger print dialog
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Clean up iframe
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);

      // Save print record to database
      try {
        await saveInternalLabel({
          package_id: labelData.package_id,
          label_data: labelData,
          printed_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('Error saving label print record:', dbError);
      }

      setIsPrinting(false);
      return true;
    } catch (err) {
      console.error('Error printing label:', err);
      setIsPrinting(false);
      setError(err instanceof Error ? err.message : 'Failed to print label');
      return false;
    }
  }, [labelData]);

  const closeLabel = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setIsPrinting(false);
    setLabelData(null);
    setLogoDataUrl('');
    setError(null);
  }, []);

  return {
    isOpen,
    isLoading,
    isPrinting,
    labelData,
    logoDataUrl,
    error,
    openLabel,
    printLabel,
    closeLabel,
  };
}
