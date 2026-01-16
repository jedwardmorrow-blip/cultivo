/**
 * Compliance Header Component
 *
 * Displays Arizona cannabis compliance information required on all coversheets:
 * - Company logo and name
 * - State license number
 * - Mandatory health warning
 *
 * This component matches the format shown in Arizona DHS compliance documents
 * and ensures all required regulatory information is prominently displayed.
 *
 * @component
 * @example
 * <ComplianceHeader
 *   companyName="Kind Meds Inc."
 *   licenseNumber="00000078DCBK00628996"
 *   pregnancyWarning="Using marijuana during pregnancy..."
 * />
 */

import type { ComplianceHeader as ComplianceHeaderData } from '@/types';

interface ComplianceHeaderProps {
  companyName?: string;
  licenseNumber?: string;
  pregnancyWarning?: string;
  /**
   * Optional compliance header object (alternative to individual props)
   */
  data?: ComplianceHeaderData;
}

/**
 * ComplianceHeader Component
 *
 * Renders the compliance header section with company info and regulatory warnings.
 * Can accept either individual props or a ComplianceHeader data object.
 *
 * Design notes:
 * - Clean white background with simple borders
 * - Logo positioned prominently at top center
 * - License and warning text clearly legible
 * - Responsive design for print and screen
 * - Matches compliance document format exactly
 */
export function ComplianceHeader({
  companyName,
  licenseNumber,
  pregnancyWarning,
  data
}: ComplianceHeaderProps) {
  // Use data object if provided, otherwise use individual props
  const displayName = data?.company_name || companyName || 'Kind Meds Inc.';
  const displayLicense = data?.license_number || licenseNumber || '00000078DCBK00628996';
  const displayWarning = data?.pregnancy_warning || pregnancyWarning ||
    '"Using marijuana during pregnancy could cause birth defects or other health issues to your unborn child."';

  return (
    <div className="border-2 border-black bg-white p-8 text-center compliance-section">
      {/* Company Logo */}
      <div className="flex justify-center mb-6">
        <img
          src="/Cult Cannabis Co Final White 320x320@3x.png"
          alt="CULT Cannabis Co"
          className="h-32 w-auto"
        />
      </div>

      {/* Company Information */}
      <div className="mb-6">
        <p className="text-lg font-semibold uppercase mb-2">
          Cultivated and Distributed By:
        </p>
        <p className="text-2xl font-bold mb-4">
          {displayName}
        </p>

        <div className="text-base">
          <p className="font-semibold mb-1">License Number:</p>
          <p className="font-mono text-lg tracking-wide">
            {displayLicense}
          </p>
        </div>
      </div>

      {/* Pregnancy Warning - Required by Arizona Law */}
      <div className="border-2 border-gray-400 bg-gray-50 p-4 max-w-2xl mx-auto">
        <p className="text-sm leading-relaxed italic">
          {displayWarning}
        </p>
      </div>
    </div>
  );
}
