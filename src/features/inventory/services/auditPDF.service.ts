/**
 * Audit PDF Generation Service
 *
 * Service for generating PDF audit sheets using iframe-based rendering.
 * Follows the same pattern as invoice and label generation.
 *
 * @module auditPDF.service
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import type { AuditWithStats, InventoryAuditLine } from '../types';

export interface AuditSheetData {
  audit: AuditWithStats;
  lines: InventoryAuditLine[];
  company_logo_path: string | null;
  company_brand_name: string;
  company_entity_name: string;
  company_license_name: string;
  company_license_number: string;
  prepared_by_name: string;
}

interface PDFGenerationOptions {
  filename?: string;
  scale?: number;
  quality?: number;
}

/**
 * Fetch company settings for audit sheet header
 */
async function fetchCompanySettings(): Promise<{
  logo_path: string | null;
  brand_name: string;
  entity_name: string;
  license_name: string;
  license_number: string;
}> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'company_logo_url',
        'company_brand_name',
        'company_entity_name',
        'company_license_name',
        'company_license_number'
      ]);

    if (error) throw error;

    const settings = data?.reduce((acc, { setting_key, setting_value }) => {
      acc[setting_key] = setting_value;
      return acc;
    }, {} as Record<string, string>) || {};

    return {
      logo_path: settings.company_logo_url || null,
      brand_name: settings.company_brand_name || 'Cult Cannabis Co',
      entity_name: settings.company_entity_name || '',
      license_name: settings.company_license_name || '',
      license_number: settings.company_license_number || ''
    };
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return {
      logo_path: null,
      brand_name: 'Cult Cannabis Co',
      entity_name: '',
      license_name: '',
      license_number: ''
    };
  }
}

/**
 * Fetch user name for prepared by field
 */
async function fetchUserName(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return 'Unknown User';
    return data.full_name || 'Unknown User';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'Unknown User';
  }
}

/**
 * Build complete audit sheet data
 */
export async function buildAuditSheetData(
  audit: AuditWithStats,
  lines: InventoryAuditLine[]
): Promise<AuditSheetData> {
  const [companySettings, userName] = await Promise.all([
    fetchCompanySettings(),
    fetchUserName(audit.created_by)
  ]);

  return {
    audit,
    lines: lines.sort((a, b) => a.line_order - b.line_order),
    company_logo_path: companySettings.logo_path,
    company_brand_name: companySettings.brand_name,
    company_entity_name: companySettings.entity_name,
    company_license_name: companySettings.license_name,
    company_license_number: companySettings.license_number,
    prepared_by_name: userName
  };
}

/**
 * Generate PDF from HTML element using html2canvas
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const {
    filename = 'audit-sheet.pdf',
    scale = 2,
    quality = 0.95
  } = options;

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector('.audit-sheet-container');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.transform = 'scale(1)';
        }
      }
    });

    const imgWidth = 8.5;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/jpeg', quality);

    if (imgHeight <= 11) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 11;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Sanitize filename for safe filesystem usage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

/**
 * Generate audit sheet filename
 */
export function generateAuditFilename(auditNumber: string): string {
  const sanitizedAudit = sanitizeFilename(auditNumber);
  const timestamp = new Date().toISOString().split('T')[0];
  return `Audit_${sanitizedAudit}_${timestamp}.pdf`;
}

/**
 * Generate variance report filename
 */
export function generateVarianceReportFilename(
  startDate?: string,
  endDate?: string
): string {
  const start = startDate ? new Date(startDate).toISOString().split('T')[0] : 'all';
  const end = endDate ? new Date(endDate).toISOString().split('T')[0] : 'time';
  return `Variance_Report_${start}_to_${end}.pdf`;
}
