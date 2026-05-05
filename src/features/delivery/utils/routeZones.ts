export interface RouteZone {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

const ZONES: RouteZone[] = [
  { id: 'local', label: 'Local', color: 'text-cult-text-secondary', bgColor: 'bg-cult-surface-raised', borderColor: 'border-cult-border', dotColor: 'bg-cult-text-secondary' },
  { id: 'east_valley', label: 'East Valley', color: 'text-teal-400', bgColor: 'bg-teal-900/30', borderColor: 'border-teal-600', dotColor: 'bg-teal-400' },
  { id: 'west_valley', label: 'West Valley', color: 'text-amber-400', bgColor: 'bg-amber-900/30', borderColor: 'border-amber-600', dotColor: 'bg-amber-400' },
  { id: 'tucson', label: 'Tucson', color: 'text-sky-400', bgColor: 'bg-sky-900/30', borderColor: 'border-sky-600', dotColor: 'bg-sky-400' },
  { id: 'northern_az', label: 'Northern AZ', color: 'text-rose-400', bgColor: 'bg-rose-900/30', borderColor: 'border-rose-600', dotColor: 'bg-rose-400' },
];

const ZONE_MAP = new Map(ZONES.map(z => [z.id, z]));

const DEFAULT_FACILITY = { latitude: 33.417454, longitude: -111.994514 };

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function bearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x =
    Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

export function getRouteZoneId(
  customerLat: number | null,
  customerLon: number | null,
  facilityLat?: number,
  facilityLon?: number
): string {
  if (!customerLat || !customerLon) return 'local';

  const fLat = facilityLat ?? DEFAULT_FACILITY.latitude;
  const fLon = facilityLon ?? DEFAULT_FACILITY.longitude;

  const dist = haversineDistance(fLat, fLon, customerLat, customerLon);
  const brng = bearing(fLat, fLon, customerLat, customerLon);

  if (dist > 80) {
    if (brng >= 100 && brng <= 200) return 'tucson';
    return 'northern_az';
  }

  if (dist <= 10) return 'local';

  if (brng >= 30 && brng < 180) return 'east_valley';
  if (brng >= 180 && brng < 360) return 'west_valley';
  if (brng >= 0 && brng < 30) return 'local';

  return 'local';
}

export function getRouteZone(
  customerLat: number | null,
  customerLon: number | null,
  facilityLat?: number,
  facilityLon?: number
): RouteZone {
  const id = getRouteZoneId(customerLat, customerLon, facilityLat, facilityLon);
  return ZONE_MAP.get(id) || ZONES[0];
}

export function getAllZones(): RouteZone[] {
  return ZONES;
}

export function getZoneById(id: string): RouteZone | undefined {
  return ZONE_MAP.get(id);
}

export function getApproxMiles(
  customerLat: number | null,
  customerLon: number | null,
  facilityLat?: number,
  facilityLon?: number
): number | null {
  if (!customerLat || !customerLon) return null;
  const fLat = facilityLat ?? DEFAULT_FACILITY.latitude;
  const fLon = facilityLon ?? DEFAULT_FACILITY.longitude;
  return Math.round(haversineDistance(fLat, fLon, customerLat, customerLon) * 10) / 10;
}
