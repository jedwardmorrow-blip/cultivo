import type { DistributedToInfo } from '@/types';

interface DistributedToEntry {
  location?: string;
  entity_name?: string;
  license_number?: string;
}

interface DistributedToSectionProps {
  customerName?: string;
  licenseNumber?: string;
  locationName?: string;
  data?: DistributedToInfo | DistributedToEntry[];
}

export function DistributedToSection({
  customerName,
  licenseNumber,
  locationName,
  data
}: DistributedToSectionProps) {
  // Handle array format (multi-location customers like Sol Flower)
  if (Array.isArray(data)) {
    return (
      <div className="border-2 border-black bg-white p-6 compliance-section">
        <h3 className="text-lg font-bold uppercase mb-4">
          Chain of Distribution
        </h3>
        <div className="space-y-1">
          <p className="text-base leading-relaxed mb-2">
            <span className="font-semibold">To: </span>
            <span className="font-medium">{customerName || 'Sol Flower'}</span>
          </p>
          {data.map((entry, index) => (
            <p key={index} className="text-sm leading-relaxed pl-4">
              <span className="font-medium">{entry.entity_name}</span>
              {entry.location && (
                <span className="text-gray-600"> ({entry.location})</span>
              )}
              {' — '}
              <span className="font-mono text-xs">{entry.license_number}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }

  // Handle legacy single-object format
  const singleData = data as DistributedToInfo | undefined;
  const displayName = singleData?.customer_name || customerName || 'Unknown Customer';
  const displayLicense = singleData?.license_number || licenseNumber || 'License Not Available';
  const displayLocation = singleData?.location_name || locationName;
  const originatorName = singleData?.originator_name;
  const originatorLicense = singleData?.originator_license;

  return (
    <div className="border-2 border-black bg-white p-6 compliance-section">
      <h3 className="text-lg font-bold uppercase mb-4">
        Chain of Distribution
      </h3>

      <div className="space-y-2">
        {originatorName && (
          <p className="text-base leading-relaxed">
            <span className="font-semibold">From: </span>
            <span className="font-medium">{originatorName}</span>
            {originatorLicense && (
              <>
                {' - '}
                <span className="font-mono">{originatorLicense}</span>
              </>
            )}
          </p>
        )}
        <p className="text-base leading-relaxed">
          <span className="font-semibold">To: </span>
          {displayLocation && <span>({displayLocation}) </span>}
          <span className="font-medium">{displayName}</span>
          {' - '}
          <span className="font-mono">{displayLicense}</span>
        </p>
      </div>
    </div>
  );
}
