/**
 * Distributed To Section Component
 *
 * Displays customer information for Arizona compliance reporting.
 * Shows the receiving dispensary's name and license number in compliance format.
 *
 * Format matches Arizona compliance documents exactly:
 * - Simple bordered section
 * - Format: (Location) Customer Name - License Number
 * - Link to COA library
 *
 * Required for:
 * - Distribution tracking
 * - License verification
 * - Compliance audits
 * - Chain of custody documentation
 *
 * @component
 * @example
 * <DistributedToSection
 *   customerName="Cannabis Research Group, Inc"
 *   licenseNumber="00000104ESDH57805022"
 *   locationName="Tolleson"
 * />
 */

import type { DistributedToInfo } from '@/types';

interface DistributedToSectionProps {
  customerName?: string;
  licenseNumber?: string;
  locationName?: string;
  /**
   * Optional: DistributedToInfo object (alternative to individual props)
   */
  data?: DistributedToInfo;
}

/**
 * DistributedToSection Component
 *
 * Renders the "Distributed To" compliance section showing customer details.
 *
 * Features:
 * - Customer name and license displayed in compliance format
 * - Optional location identifier
 * - Simple bordered layout matching compliance documents
 * - Print-friendly styling
 * - Link to COA library
 *
 * Format:
 * - (Location) Customer Name - License Number
 * - Example: (Tolleson) Cannabis Research Group, Inc - 00000104ESDH57805022
 *
 * @future Multi-Location Distribution
 * Currently supports single customer per order. When implementing multi-location:
 * - Accept DistributedToInfo[] array instead of single object
 * - Render each location as a separate line in the list
 * - Format each as: (Location) Company Name - License Number
 * - Update parent components to pass array
 *
 * See coversheet.service.ts getDistributedToInfo() for backend changes needed.
 */
export function DistributedToSection({
  customerName,
  licenseNumber,
  locationName,
  data
}: DistributedToSectionProps) {
  // Use data object if provided, otherwise use individual props
  const displayName = data?.customer_name || customerName || 'Unknown Customer';
  const displayLicense = data?.license_number || licenseNumber || 'License Not Available';
  const displayLocation = data?.location_name || locationName;

  return (
    <div className="border-2 border-black bg-white p-6 compliance-section">
      <h3 className="text-lg font-bold uppercase mb-4">
        Distributed to
      </h3>

      <div className="mb-6">
        <p className="text-base leading-relaxed">
          {displayLocation && <span>({displayLocation}) </span>}
          <span className="font-medium">{displayName}</span>
          {' - '}
          <span className="font-mono">{displayLicense}</span>
        </p>
      </div>

      {/* COA Library Link */}
      <div className="pt-4 border-t border-gray-300">
        <p className="text-sm text-center">
          Click{' '}
          <a
            href="/coa-library"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-semibold print:text-black"
          >
            HERE
          </a>
          {' '}for Product Testing!
        </p>
      </div>

      {/*
        TODO: Multi-Location Distribution Support

        When implementing multi-location distribution:

        1. Update this component to accept DistributedToInfo[] array
        2. Render each location in a list format:
           <div className="space-y-2">
             {locations.map((location, idx) => (
               <p key={idx}>
                 ({location.location_name}) {location.customer_name} - {location.license_number}
               </p>
             ))}
           </div>

        3. Update parent components to pass array instead of single object
        4. Consider adding customer_locations table to database
        5. Update getDistributedToInfo() service to query and return multiple locations

        Example format from compliance document:
        - (Tolleson) Cannabis Research Group, Inc - 00000104ESDH57805022
        - (McDowell) Sixth Street Enterprise, Inc - 00000092ESKW00353670
        - (Grand) Sixth Enterprise, Inc - 00000090ESFB63971979
      */}
    </div>
  );
}
