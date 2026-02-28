/**
 * Package Manifest Section Component
 *
 * Displays complete package manifest for the order including label information.
 * Shows every package assigned to the order with product details, strain, batch,
 * and associated label number for full traceability.
 *
 * Required for:
 * - Complete package inventory verification
 * - Label traceability and compliance
 * - Receiving confirmation at destination
 * - Audit trail documentation
 *
 * @component
 * @example
 * <PackageManifestSection orderId="uuid" />
 */

import { useState, useEffect } from 'react';
import { Package, Tag, AlertCircle } from 'lucide-react';
import { getCoversheetPackageAssignments } from '../../services/coversheet.service';

interface PackageAssignmentDetail {
  id: string;
  package_id: string;
  product_name: string;
  strain: string | null;
  batch: string | null;
  batch_number: string | null;
  quantity_assigned: number;
  unit: string | null;
  label_number: string | null;
  barcode_data: string | null;
  printed_at: string | null;
  voided_at: string | null;
}

interface PackageManifestSectionProps {
  orderId: string;
  packages?: PackageAssignmentDetail[];
  showLabelStatus?: boolean;
}

/**
 * PackageManifestSection Component
 *
 * Renders a complete manifest of all packages assigned to an order with
 * associated label information for full traceability.
 *
 * Features:
 * - Package-level detail listing
 * - Label number display for traceability
 * - Batch and strain information
 * - Label status indicators (generated/printed/voided)
 * - Print-friendly table layout
 * - Compliance-ready formatting
 *
 * Table Columns:
 * 1. Package ID - Unique package identifier
 * 2. Product - Product name and type
 * 3. Strain - Cannabis strain name
 * 4. Batch - Batch number for traceability
 * 5. Label # - Generated label number
 * 6. Status - Label status (optional)
 */
export function PackageManifestSection({
  orderId,
  packages: preloadedPackages,
  showLabelStatus = true
}: PackageManifestSectionProps) {
  const [fetchedPackages, setFetchedPackages] = useState<PackageAssignmentDetail[]>([]);
  const [loading, setLoading] = useState(!preloadedPackages);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preloadedPackages) return;

    async function loadPackages() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCoversheetPackageAssignments(orderId);
        setFetchedPackages(data as PackageAssignmentDetail[]);
      } catch (err) {
        console.error('[PackageManifestSection] Error loading packages:', err);
        setError('Failed to load package manifest');
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadPackages();
    }
  }, [orderId, preloadedPackages]);

  const packages = (preloadedPackages || fetchedPackages) as PackageAssignmentDetail[];

  if (loading) {
    return (
      <div className="border-2 border-black bg-white p-8 text-center compliance-section">
        <div className="flex items-center justify-center gap-3 text-gray-600">
          <Package className="w-6 h-6 animate-pulse" />
          <p className="text-lg">Loading package manifest...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-red-500 bg-red-50 p-8 text-center compliance-section">
        <div className="flex items-center justify-center gap-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <p className="text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="border-2 border-gray-300 bg-white p-8 text-center compliance-section">
        <div className="flex items-center justify-center gap-3 text-gray-600">
          <Package className="w-6 h-6" />
          <p className="text-lg">
            No packages assigned to this order. Complete package assignments to generate manifest.
          </p>
        </div>
      </div>
    );
  }

  // Group packages by product for cleaner display
  const packagesByProduct = packages.reduce((acc, pkg) => {
    const key = pkg.product_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(pkg);
    return acc;
  }, {} as Record<string, PackageAssignmentDetail[]>);

  return (
    <div className="border-2 border-black bg-white compliance-section">
      {/* Section Header */}
      <div className="border-b-2 border-black bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <h3 className="text-xl font-bold uppercase tracking-wide">Package Manifest</h3>
          </div>
          <div className="text-sm">
            <span className="font-semibold">Total Packages:</span>{' '}
            <span className="text-lg font-bold">{packages.length}</span>
          </div>
        </div>
      </div>

      {/* Package Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-100">
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Package ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Product
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Strain
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                Batch
              </th>
              <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Label #
                </div>
              </th>
              {showLabelStatus && (
                <th className="text-left py-3 px-4 text-sm font-bold uppercase tracking-wide">
                  Status
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {Object.entries(packagesByProduct).map(([productName, productPackages], groupIndex) => (
              <>
                {/* Product Group Header (Optional - for visual organization) */}
                {Object.keys(packagesByProduct).length > 1 && (
                  <tr key={`header-${groupIndex}`} className="bg-gray-50 border-t border-gray-300">
                    <td colSpan={showLabelStatus ? 6 : 5} className="py-2 px-4">
                      <span className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                        {productName} ({productPackages.length} {productPackages.length === 1 ? 'package' : 'packages'})
                      </span>
                    </td>
                  </tr>
                )}

                {/* Package Rows */}
                {productPackages.map((pkg, _index) => {
                  const isVoided = !!pkg.voided_at;
                  const isPrinted = !!pkg.printed_at && !isVoided;
                  const hasLabel = !!pkg.label_number;

                  return (
                    <tr
                      key={pkg.id}
                      className="border-b border-gray-200 last:border-b-0"
                    >
                      {/* Package ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium">
                          {pkg.package_id}
                        </span>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4 text-sm">
                        {pkg.product_name}
                      </td>

                      {/* Strain */}
                      <td className="py-3 px-4 text-sm">
                        {pkg.strain || 'N/A'}
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">
                          {pkg.batch_number || pkg.batch || 'N/A'}
                        </span>
                      </td>

                      {/* Label Number */}
                      <td className="py-3 px-4">
                        {hasLabel ? (
                          <span className={`font-mono text-sm font-medium ${isVoided ? 'line-through text-red-600' : ''}`}>
                            {pkg.label_number}
                          </span>
                        ) : (
                          <span className="text-cult-text-muted text-sm italic">No label</span>
                        )}
                      </td>

                      {/* Status */}
                      {showLabelStatus && (
                        <td className="py-3 px-4">
                          {isVoided ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-red-100 text-red-800 rounded print:bg-transparent print:border print:border-red-800">
                              Voided
                            </span>
                          ) : isPrinted ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-green-100 text-green-800 rounded print:bg-transparent print:border print:border-green-800">
                              Printed
                            </span>
                          ) : hasLabel ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-yellow-100 text-yellow-800 rounded print:bg-transparent print:border print:border-yellow-800">
                              Generated
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 rounded print:bg-transparent print:border print:border-cult-border-strong">
                              Pending
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="border-t-2 border-black p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-gray-600 uppercase tracking-wide">Total Packages</div>
            <div className="text-2xl font-bold">{packages.length}</div>
          </div>
          <div>
            <div className="text-gray-600 uppercase tracking-wide">Labels Generated</div>
            <div className="text-2xl font-bold text-green-600">
              {packages.filter(p => p.label_number && !p.voided_at).length}
            </div>
          </div>
          <div>
            <div className="text-gray-600 uppercase tracking-wide">Unique Strains</div>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(packages.map(p => p.strain).filter(Boolean)).size}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
