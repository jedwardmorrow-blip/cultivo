/**
 * Audit Sheet Template
 *
 * PDF-ready template for printing inventory audit sheets.
 * Displays audit header, line items, and signature areas.
 *
 * @module AuditSheetTemplate
 */

import { forwardRef, useState, useEffect } from 'react';
import type { AuditWithStats, InventoryAuditLine } from '../types';

interface AuditSheetData {
  audit: AuditWithStats;
  lines: InventoryAuditLine[];
  company_logo_path: string | null;
  company_brand_name: string;
  company_entity_name: string;
  company_license_name: string;
  company_license_number: string;
  prepared_by_name: string;
}

interface AuditSheetTemplateProps {
  auditData: AuditSheetData;
  forPrint?: boolean;
  onImagesLoaded?: () => void;
}

export const AuditSheetTemplate = forwardRef<HTMLDivElement, AuditSheetTemplateProps>(
  ({ auditData, forPrint = false, onImagesLoaded }, ref) => {
    const [logoDataUrl, setLogoDataUrl] = useState<string>('');
    const [logoLoaded, setLogoLoaded] = useState(false);

    useEffect(() => {
      const loadLogo = async () => {
        if (!auditData.company_logo_path) {
          setLogoLoaded(true);
          if (onImagesLoaded) onImagesLoaded();
          return;
        }

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              console.error('Could not get canvas context');
              setLogoLoaded(true);
              if (onImagesLoaded) onImagesLoaded();
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const dataUrl = canvas.toDataURL('image/png');
            setLogoDataUrl(dataUrl);
            setLogoLoaded(true);
            if (onImagesLoaded) onImagesLoaded();
          };

          img.onerror = () => {
            console.error('Failed to load logo');
            setLogoDataUrl('');
            setLogoLoaded(true);
            if (onImagesLoaded) onImagesLoaded();
          };

          img.src = auditData.company_logo_path;
        } catch (error) {
          console.error('Error loading logo:', error);
          setLogoDataUrl('');
          setLogoLoaded(true);
          if (onImagesLoaded) onImagesLoaded();
        }
      };

      loadLogo();
    }, [auditData.company_logo_path, onImagesLoaded]);

    const formatDate = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatQty = (qty: number | null, unit: string) => {
      if (qty === null) return '';
      return `${qty.toFixed(2)} ${unit}`;
    };

    const getVarianceClass = (percentage: number | null) => {
      if (!percentage) return '';
      const abs = Math.abs(percentage);
      if (abs >= 5) return 'text-red-600 font-bold';
      if (abs >= 3) return 'text-orange-600 font-semibold';
      if (abs >= 1) return 'text-yellow-600';
      return 'text-gray-600';
    };

    const { audit, lines } = auditData;

    return (
      <div
        ref={ref}
        className="audit-sheet-container bg-white text-black p-6 min-h-[11in]"
        style={{ width: '8.5in', fontSize: '10pt' }}
      >
        {/* Header */}
        <div className="audit-header flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
          <div className="audit-logo flex-shrink-0">
            {(logoDataUrl || auditData.company_logo_path) && (
              <img
                src={forPrint && logoDataUrl ? logoDataUrl : auditData.company_logo_path}
                alt={auditData.company_brand_name}
                className="h-24 w-auto"
                style={{ maxHeight: '96px' }}
              />
            )}
          </div>

          <div className="audit-company-info text-right">
            <div className="text-xl font-bold">{auditData.company_brand_name}</div>
            <div className="text-sm font-semibold">{auditData.company_entity_name}</div>
            <div className="text-xs">{auditData.company_license_name}</div>
            <div className="text-xs">Lic #: {auditData.company_license_number}</div>
          </div>
        </div>

        {/* Audit Info */}
        <div className="audit-info mb-6">
          <h1 className="text-2xl font-bold mb-4 text-center">INVENTORY AUDIT SHEET</h1>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="font-semibold">Audit Number:</div>
              <div className="text-lg">{audit.audit_number}</div>
            </div>
            <div>
              <div className="font-semibold">Date Initiated:</div>
              <div>{formatDate(audit.created_at)}</div>
            </div>
            <div>
              <div className="font-semibold">Status:</div>
              <div className="uppercase">{audit.status}</div>
            </div>
            <div>
              <div className="font-semibold">Prepared By:</div>
              <div>{auditData.prepared_by_name}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="font-semibold">Stages Audited:</div>
            <div>{audit.selected_stages.join(', ')}</div>
          </div>

          {audit.notes && (
            <div className="mb-4">
              <div className="font-semibold">Notes:</div>
              <div className="text-sm">{audit.notes}</div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2 bg-gray-100 p-3 rounded">
            <div className="text-center">
              <div className="text-xs font-semibold">Total Lines</div>
              <div className="text-lg">{audit.total_lines}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold">Confirmed</div>
              <div className="text-lg">{audit.confirmed_lines}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold">Variances</div>
              <div className="text-lg">{audit.variance_count}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold">Avg Variance</div>
              <div className="text-lg">{audit.average_variance_percentage?.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* Audit Lines Table */}
        <div className="audit-lines mb-6">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-1 text-left">#</th>
                <th className="border border-gray-600 px-2 py-1 text-left">Package ID</th>
                <th className="border border-gray-600 px-2 py-1 text-left">Product</th>
                <th className="border border-gray-600 px-2 py-1 text-left">Strain</th>
                <th className="border border-gray-600 px-2 py-1 text-left">Stage</th>
                <th className="border border-gray-600 px-2 py-1 text-right">Expected</th>
                <th className="border border-gray-600 px-2 py-1 text-right">Actual</th>
                <th className="border border-gray-600 px-2 py-1 text-right">Variance</th>
                <th className="border border-gray-600 px-2 py-1 text-center">✓</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-2 py-1">{line.line_order}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-xs">{line.package_id}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.product_name}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.strain || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.stage}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {formatQty(line.expected_qty, line.unit)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {line.actual_qty !== null ? formatQty(line.actual_qty, line.unit) : '___.___ ' + line.unit}
                  </td>
                  <td className={`border border-gray-300 px-2 py-1 text-right ${getVarianceClass(line.variance_percentage)}`}>
                    {line.variance_qty !== null && line.variance_percentage !== null
                      ? `${line.variance_qty > 0 ? '+' : ''}${line.variance_qty.toFixed(2)} (${line.variance_percentage.toFixed(1)}%)`
                      : '-'
                    }
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {line.confirmed ? '✓' : '☐'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {lines.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No audit lines to display
            </div>
          )}
        </div>

        {/* Variance Summary */}
        {audit.variance_count > 0 && (
          <div className="variance-summary mb-6 p-3 bg-gray-100 rounded">
            <div className="font-semibold mb-2">Variance Summary:</div>
            <div className="text-sm">
              <div>Lines with Variance: {audit.variance_count} of {audit.total_lines}</div>
              <div>Average Variance: {audit.average_variance_percentage?.toFixed(2)}%</div>
              <div>Total Variance Amount: {audit.total_variance_amount?.toFixed(2)} g</div>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="signatures mt-8 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mb-8">
                <div className="font-semibold mb-2">Prepared By:</div>
                <div className="border-b-2 border-gray-800 pb-1 mb-1">{auditData.prepared_by_name}</div>
                <div className="text-xs text-gray-600">Signature</div>
              </div>
              <div>
                <div className="border-b-2 border-gray-800 pb-1 mb-1 w-32"></div>
                <div className="text-xs text-gray-600">Date</div>
              </div>
            </div>
            <div>
              <div className="mb-8">
                <div className="font-semibold mb-2">Reviewed By:</div>
                <div className="border-b-2 border-gray-800 pb-1 mb-1">_______________________</div>
                <div className="text-xs text-gray-600">Signature</div>
              </div>
              <div>
                <div className="border-b-2 border-gray-800 pb-1 mb-1 w-32"></div>
                <div className="text-xs text-gray-600">Date</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="audit-footer text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-300">
          <div>Generated: {formatDate(new Date().toISOString())}</div>
          <div>This is an official inventory audit document. Retain for compliance records.</div>
        </div>
      </div>
    );
  }
);

AuditSheetTemplate.displayName = 'AuditSheetTemplate';
