/**
 * PackagesSummary Component
 *
 * Displays a summary of created conversion packages before finalization.
 * Shows package details and totals.
 *
 * @module PackagesSummary
 */

import { Package, CheckCircle } from 'lucide-react';
import { ConversionPackage, isBulkProduct, ConversionLotSummary } from '@/types';

interface PackagesSummaryProps {
  packages: ConversionPackage[];
  lot: ConversionLotSummary;
}

export function PackagesSummary({ packages, lot }: PackagesSummaryProps) {
  const isBulk = isBulkProduct(lot);

  // Calculate totals
  const totalWeight = packages.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
  const totalUnits = packages.reduce((sum, pkg) => sum + (pkg.units || 0), 0);

  if (packages.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No packages created yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Packages Created
        </h3>
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span>{packages.length} package{packages.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Packages table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Package ID
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isBulk ? 'Weight (g)' : 'Units'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.map((pkg, index) => (
              <tr key={pkg.id || index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {pkg.package_id}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {isBulk
                      ? `${(pkg.weight || 0).toFixed(1)}g`
                      : `${pkg.units || 0} units`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">
                    {pkg.source_session_ids?.length || 0} session
                    {pkg.source_session_ids?.length !== 1 ? 's' : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                Total
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                {isBulk ? `${totalWeight.toFixed(1)}g` : `${totalUnits} units`}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {lot.contributing_session_count} session
                {lot.contributing_session_count !== 1 ? 's' : ''} consolidated
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Ready to Finalize
            </h4>
            <p className="text-sm text-blue-700">
              These packages will be moved to live inventory when you click "Finalize & Move to Inventory".
            </p>
          </div>
        </div>
      </div>

      {/* Batch and product info */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Batch</div>
          <div className="font-medium text-gray-900">{lot.batch_name}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Strain</div>
          <div className="font-medium text-gray-900">{lot.strain_name}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Product</div>
          <div className="font-medium text-gray-900">{lot.product_name}</div>
        </div>
      </div>
    </div>
  );
}
