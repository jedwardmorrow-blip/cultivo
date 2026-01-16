import { supabase } from '@/lib/supabase';
import { getFacilityCoordinates } from './geocoding.service';

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'facility' | 'customer';
}

export async function getAllLocations(): Promise<Location[]> {
  const locations: Location[] = [];

  try {
    console.log('[Locations Service] Loading all locations...');
    const facilityCoords = await getFacilityCoordinates();
    console.log('[Locations Service] Facility coordinates:', facilityCoords);

    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .eq('category', 'company')
      .in('setting_key', ['company_name', 'company_address', 'company_city', 'company_state', 'company_postal_code']);

    if (settingsError) {
      console.error('[Locations Service] Error loading company settings:', settingsError);
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value || '';
    });

    const facilityName = settingsMap.company_name || 'Cult Cannabis Cultivation';
    const facilityAddress = [
      settingsMap.company_address || '3303 South 40th Street',
      settingsMap.company_city || 'Phoenix',
      settingsMap.company_state || 'AZ',
      settingsMap.company_postal_code || '85040'
    ].filter(Boolean).join(', ');

    if (facilityCoords) {
      const facilityLocation = {
        id: 'facility',
        name: facilityName,
        address: facilityAddress,
        latitude: facilityCoords.latitude,
        longitude: facilityCoords.longitude,
        type: 'facility' as const
      };
      console.log('[Locations Service] Added facility location:', facilityLocation);
      locations.push(facilityLocation);
    } else {
      console.warn('[Locations Service] No facility coordinates available, facility location not added');
    }

    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, address, city, state, postal_code, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('name');

    if (error) throw error;

    customers?.forEach(customer => {
      const fullAddress = [
        customer.address,
        customer.city,
        customer.state,
        customer.postal_code
      ].filter(Boolean).join(', ');

      const isMainFacility = customer.name.toLowerCase() === 'cult cannabis co.';

      if (isMainFacility && facilityCoords) {
        return;
      }

      const isCultivationFacility =
        isMainFacility ||
        customer.name.toLowerCase().includes('cultivation');

      locations.push({
        id: customer.id,
        name: customer.name,
        address: fullAddress,
        latitude: customer.latitude!,
        longitude: customer.longitude!,
        type: isCultivationFacility ? 'facility' : 'customer'
      });
    });

    locations.sort((a, b) => {
      if (a.type === 'facility' && b.type !== 'facility') return -1;
      if (a.type !== 'facility' && b.type === 'facility') return 1;
      return a.name.localeCompare(b.name);
    });

  } catch (error) {
    console.error('Error loading locations:', error);
  }

  return locations;
}

export async function getLocationById(locationId: string): Promise<Location | null> {
  console.log(`[Locations Service] Looking up location by ID: ${locationId}`);
  const locations = await getAllLocations();
  const location = locations.find(loc => loc.id === locationId) || null;

  if (location) {
    console.log(`[Locations Service] Found location:`, {
      id: location.id,
      name: location.name,
      type: location.type,
      hasCoordinates: !!(location.latitude && location.longitude)
    });
  } else {
    console.warn(`[Locations Service] Location not found for ID: ${locationId}`);
  }

  return location;
}
