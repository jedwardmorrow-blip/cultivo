import { ExternalLink, FileText } from 'lucide-react';
import type { BatchComplianceInfo, ComplianceHeader } from '@/types';
import { DEFAULT_LICENSE_NUMBER, DEFAULT_LICENSE_NAME } from '@/lib/constants';

interface BatchComplianceTableProps {
  batches: BatchComplianceInfo[];
  complianceHeader?: ComplianceHeader | null;
  showCoaLinks?: boolean;
}

export function BatchComplianceTable({
  batches,
  complianceHeader,
  showCoaLinks = true
}: BatchComplianceTableProps) {
  if (!batches || batches.length === 0) {
    return (
      <div className="border-2 border-gray-300 bg-white p-8 text-center compliance-section">
        <p className="text-gray-600 text-lg">
          No batch information available. Packages have not been assigned to this order.
        </p>
      </div>
    );
  }

  const companyName = complianceHeader?.company_name || DEFAULT_LICENSE_NAME;
  const companyLicense = complianceHeader?.license_number || DEFAULT_LICENSE_NUMBER;

  return (
    <div className="border-2 border-black bg-white compliance-section">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Strain & Batch ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Date of Harvest
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Manufacture Date
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Package Date
              </th>
              {showCoaLinks && (
                <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                  COA
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {batches.map((batch, index) => (
              <tr
                key={`${batch.batch_id}-${index}`}
                className="border-b border-gray-300 last:border-b-0"
              >
                <td className="py-3 px-4">
                  <div className="font-medium">
                    {batch.strain} - <span className="font-mono">{batch.batch_id}</span>
                  </div>
                </td>

                <td className="py-3 px-4">
                  {batch.harvest_date}
                </td>

                <td className="py-3 px-4">
                  {batch.manufacture_date}
                </td>

                <td className="py-3 px-4">
                  {batch.package_date}
                </td>

                {showCoaLinks && (
                  <td className="py-3 px-4">
                    {batch.coa_pdf_url ? (
                      <a
                        href={batch.coa_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium print:text-black print:no-underline"
                      >
                        <FileText className="w-4 h-4 print:hidden" />
                        View PDF
                      </a>
                    ) : batch.coa_url ? (
                      <a
                        href={batch.coa_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline print:text-black print:no-underline"
                      >
                        <ExternalLink className="w-3 h-3 print:hidden" />
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black p-4 text-center">
        <p className="text-sm">
          Manufactured by{' '}
          <span className="font-semibold">
            {companyName} - {companyLicense}
          </span>
        </p>
      </div>
    </div>
  );
}
