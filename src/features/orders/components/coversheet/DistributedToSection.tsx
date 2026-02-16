import type { DistributedToInfo } from '@/types';

interface DistributedToSectionProps {
  customerName?: string;
  licenseNumber?: string;
  locationName?: string;
  data?: DistributedToInfo;
}

export function DistributedToSection({
  customerName,
  licenseNumber,
  locationName,
  data
}: DistributedToSectionProps) {
  const displayName = data?.customer_name || customerName || 'Unknown Customer';
  const displayLicense = data?.license_number || licenseNumber || 'License Not Available';
  const displayLocation = data?.location_name || locationName;

  return (
    <div className="border-2 border-black bg-white p-6 compliance-section">
      <h3 className="text-lg font-bold uppercase mb-4">
        Distributed to
      </h3>

      <div>
        <p className="text-base leading-relaxed">
          {displayLocation && <span>({displayLocation}) </span>}
          <span className="font-medium">{displayName}</span>
          {' - '}
          <span className="font-mono">{displayLicense}</span>
        </p>
      </div>
    </div>
  );
}
