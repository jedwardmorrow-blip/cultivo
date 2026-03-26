import { useState, useCallback } from 'react';
import { logoService } from '@/features/settings/services';
import type { InternalInventoryLabel } from '@/features/inventory/types';

export interface BinLabelContext {
  strain: string;
  batchNumber: string;
  harvestDate: string;
}

interface BinLabelEntry {
  weightGrams: number;
  entryOrder: number;
  notes?: string;
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

function buildLabelHTML(label: InternalInventoryLabel, logoDataUrl: string): string {
  const fieldLabelCSS = `font-size:5.5pt;color:#666;font-weight:bold;text-transform:uppercase;letter-spacing:0.3px;line-height:1;`;
  const valueLargeCSS = `font-size:8.5pt;font-weight:bold;margin-top:0.01in;line-height:1.1;`;
  const valueSmallCSS = `font-size:6.5pt;font-weight:bold;margin-top:0.01in;line-height:1.15;`;
  const valueMedCSS = `font-size:7pt;font-weight:600;margin-top:0.01in;line-height:1.15;`;

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="CULT Logo" style="width:0.85in;height:auto;display:block;margin:0 auto;" />`
    : '';

  return `
    <div style="width:1.5in;height:2in;background:white;color:black;padding:0.08in;box-sizing:border-box;font-family:Arial,sans-serif;display:flex;flex-direction:column;overflow:hidden;">
      <div style="text-align:center;margin-bottom:0.02in;">${logoImg}</div>
      <div style="display:flex;flex-direction:column;gap:0.03in;flex:1;">
        <div style="border-bottom:1px solid #333;padding-bottom:0.02in;">
          <div style="${fieldLabelCSS}">Strain</div>
          <div style="${valueLargeCSS}">${label.strain}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.03in;border-bottom:1px solid #ddd;padding-bottom:0.03in;">
          <div>
            <div style="${fieldLabelCSS}">Batch ID</div>
            <div style="${valueSmallCSS}">${label.batch_id}</div>
          </div>
          <div>
            <div style="${fieldLabelCSS}">Weight</div>
            <div style="${valueSmallCSS}">${label.weight_grams.toFixed(1)}g</div>
          </div>
          <div>
            <div style="${fieldLabelCSS}">Bin #</div>
            <div style="${valueSmallCSS};word-break:break-all;">${label.package_id}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.03in;">
          <div>
            <div style="${fieldLabelCSS}">Product Type</div>
            <div style="${valueMedCSS}">${label.product_type}</div>
          </div>
          <div>
            <div style="${fieldLabelCSS}">Harvest Date</div>
            <div style="${valueMedCSS}">${label.harvest_date}</div>
          </div>
        </div>
      </div>
      <div style="font-size:4.5pt;color:#999;text-align:center;margin-top:0.02in;border-top:1px solid #eee;padding-top:0.02in;line-height:1;">
        INTERNAL USE ONLY - ${label.package_id}
      </div>
    </div>
  `;
}

function printViaIframe(labelHTML: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Print Bin Label</title>
      <style>
        @page { size: 1.5in 2in; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        html, body { margin: 0; padding: 0; width: 1.5in; height: 2in; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>${labelHTML}</body>
    </html>
  `;

  iframeDoc.open();
  iframeDoc.write(fullHTML);
  iframeDoc.close();

  const images = iframeDoc.getElementsByTagName('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000);
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = () => { clearTimeout(timeout); resolve(); };
    });
  });

  Promise.all(imagePromises).then(() => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 500);
  });
}

export function useBinEntryLabel(context: BinLabelContext | null) {
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoLoaded, setLogoLoaded] = useState(false);

  const ensureLogo = useCallback(async () => {
    if (logoLoaded) return logoDataUrl;
    const url = await loadLogoDataUrl();
    setLogoDataUrl(url);
    setLogoLoaded(true);
    return url;
  }, [logoLoaded, logoDataUrl]);

  const printBinLabel = useCallback(async (entry: BinLabelEntry) => {
    if (!context) return;

    const logo = await ensureLogo();

    const label: InternalInventoryLabel = {
      package_id: `BIN-${entry.entryOrder}`,
      strain: context.strain,
      batch_id: context.batchNumber,
      product_type: 'Flower Binned',
      harvest_date: context.harvestDate,
      weight_grams: entry.weightGrams,
    };

    const html = buildLabelHTML(label, logo);
    printViaIframe(html);
  }, [context, ensureLogo]);

  return { printBinLabel };
}
