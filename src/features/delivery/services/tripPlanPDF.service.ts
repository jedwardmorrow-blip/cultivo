import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { TripPlanWithDetails } from '@/types';
import { TripPlanPrintView } from '../components/TripPlanPrintView';

const STORAGE_BUCKET = 'company-assets';
const STORAGE_PREFIX = 'trip-plans';

function buildFilename(plan: TripPlanWithDetails): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const driverLast = plan.driver.last_name.replace(/\W+/g, '-').toLowerCase();
  return `trip-plan-${dateStr}-${driverLast}-${plan.id.slice(0, 8)}.pdf`;
}

/**
 * Renders TripPlanPrintView to a PDF Blob.
 *
 * Uses html2canvas to capture the rendered component and jsPDF to produce the
 * binary. Handles multi-page output if the rendered content exceeds one A4 page.
 */
export async function generateTripPlanPDF(
  plan: TripPlanWithDetails
): Promise<{ pdf: Blob; filename: string }> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:850px;background:#fff;';
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    flushSync(() => {
      root.render(createElement(TripPlanPrintView, { plan }));
    });

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;

    // Tile across pages if needed
    let remaining = imgH;
    let srcY = 0;
    while (remaining > 0) {
      if (srcY > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -(srcY), pageW, imgH);
      srcY += pageH;
      remaining -= pageH;
    }

    const blob = pdf.output('blob');
    return { pdf: blob, filename: buildFilename(plan) };
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

/**
 * Generates a PDF for the given trip plan, uploads it to storage, and stores
 * the path in trip_plans.pdf_path.
 *
 * @returns The storage path on success, null on failure.
 */
export async function saveTripPlanPDF(
  planId: string,
  plan: TripPlanWithDetails
): Promise<{ path: string | null; error: any }> {
  try {
    const { pdf, filename } = await generateTripPlanPDF(plan);
    const storagePath = `${STORAGE_PREFIX}/${filename}`;

    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdf, {
        contentType: 'application/pdf',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('trip_plans')
      .update({ pdf_path: data.path })
      .eq('id', planId);

    if (updateError) throw updateError;

    return { path: data.path, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to save trip plan PDF');
    return { path: null, error };
  }
}
