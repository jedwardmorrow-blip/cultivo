/**
 * Batch Compliance Table Component
 *
 * Displays batch traceability information in Arizona DHS compliance format.
 * Shows strain name, batch ID, harvest date, and manufacture date for all
 * batches included in the order.
 *
 * Format matches Arizona compliance documents exactly:
 * - Simple 3-column table
 * - Strain & Batch ID (combined, clickable)
 * - Date of Harvest
 * - Manufacture Date
 *
 * Required for:
 * - Seed-to-sale tracking
 * - Compliance audits
 * - Customer transparency
 * - Lab testing verification
 *
 * @component
 * @example
 * <BatchComplianceTable
 *   batches={[
 *     {
 *       strain: "Animal Tsunami",
 *       batch_id: "250916-ASU",
 *       harvest_date: "09/16/2025",
 *       manufacture_date: "09/25/2025"
 *     }
 *   ]}
 * />
 */

import { ExternalLink } from 'lucide-react';
import type { BatchComplianceInfo } from '@/types';

interface BatchComplianceTableProps {
  /**
   * Array of batch information for all packages in the order
   * Sorted alphabetically by strain name
   */
  batches: BatchComplianceInfo[];

  /**
   * Optional: Show link to COA library for each batch
   * Default: true
   */
  showCoaLinks?: boolean;
}

/**
 * BatchComplianceTable Component
 *
 * Renders batch data in a compliance-formatted table matching Arizona DHS requirements.
 *
 * Features:
 * - Clean table layout matching compliance documents
 * - Clickable batch IDs that link to COA details
 * - Date formatting as MM/DD/YYYY per compliance standards
 * - Print-friendly styling
 * - Simple black borders
 *
 * Table Columns:
 * 1. Strain & Batch ID - Combined on one line with hyphen separator (clickable)
 * 2. Date of Harvest - Harvest date from batch records
 * 3. Manufacture Date - Package date from inventory
 */
export function BatchComplianceTable({
  batches,
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
            </tr>
          </thead>

          <tbody>
            {batches.map((batch, index) => (
              <tr
                key={`${batch.batch_id}-${index}`}
                className="border-b border-gray-300 last:border-b-0"
              >
                {/* Strain & Batch ID Column */}
                <td className="py-3 px-4">
                  <div className="font-medium">
                    {batch.strain} -{' '}
                    {showCoaLinks && batch.coa_url ? (
                      <a
                        href={batch.coa_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 print:text-black print:no-underline"
                      >
                        {batch.batch_id}
                        <ExternalLink className="w-3 h-3 print:hidden" />
                      </a>
                    ) : (
                      <span>{batch.batch_id}</span>
                    )}
                  </div>
                </td>

                {/* Harvest Date Column */}
                <td className="py-3 px-4">
                  {batch.harvest_date}
                </td>

                {/* Manufacture Date Column */}
                <td className="py-3 px-4">
                  {batch.manufacture_date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manufacturing Footer - Required by Compliance */}
      <div className="border-t-2 border-black p-4 text-center">
        <p className="text-sm">
          Manufactured by{' '}
          <span className="font-semibold">
            Kind Meds Inc. - 00000078DCBK00628996
          </span>
        </p>
      </div>
    </div>
  );
}
