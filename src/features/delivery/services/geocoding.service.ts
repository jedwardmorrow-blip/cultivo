import { supabase } from '@/lib/supabase';

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

async function getRoutingSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .eq('category', 'routing');

  if (error) throw error;

  const settings: Record<string, string> = {};
  data?.forEach(item => {
    settings[item.setting_key] = item.setting_value || '';
  });

  return settings;
}

async function invokeGeocode(text: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ors-proxy', {
    body: { operation: 'geocode', text },
  });
  if (error) throw new Error(`Geocoding proxy error: ${error.message}`);
  return data;
}

/**
 * Geocodes a physical address to latitude/longitude coordinates
 *
 * @param address - Address object with street, city, state, postalCode
 * @returns Promise<GeocodingResult> - Coordinates and formatted address
 * @throws {Error} If API key not configured or address invalid
 * @description Uses OpenRouteService API, validates AZ coordinates
 */
export async function geocodeAddress(address: Address): Promise<GeocodingResult> {
  if (!address.street || address.street.trim() === '') {
    throw new Error('Street address is required for accurate geocoding. Cannot geocode with only city/state.');
  }

  const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;

  const data = await invokeGeocode(fullAddress);

  if (!data.features || data.features.length === 0) {
    throw new Error('Address could not be geocoded. Please verify the address is correct.');
  }

  const feature = data.features[0];
  const [longitude, latitude] = feature.geometry.coordinates;

  if (address.state === 'AZ') {
    if (latitude < 31 || latitude > 37 || longitude < -115 || longitude > -109) {
      throw new Error('Geocoding returned coordinates outside Arizona. Please verify the address is correct.');
    }
  }

  return {
    latitude,
    longitude,
    formatted_address: feature.properties.label || fullAddress
  };
}

/**
 * Updates a customer's geocoded coordinates in the database
 *
 * @param customerId - Customer UUID
 * @param address - Address to geocode
 * @returns Promise<void>
 * @description Geocodes address and saves coordinates to customers table
 */
export async function updateCustomerGeocode(
  customerId: string,
  address: Address
): Promise<void> {
  try {
    const geocoded = await geocodeAddress(address);

    const { error } = await supabase
      .from('customers')
      .update({
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        formatted_address: geocoded.formatted_address,
        geocoded_at: new Date().toISOString(),
        geocoding_error: null
      })
      .eq('id', customerId);

    if (error) throw error;
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown geocoding error';

    await supabase
      .from('customers')
      .update({
        geocoding_error: errorMessage
      })
      .eq('id', customerId);

    console.error('Failed to geocode customer address:', err);
    throw err;
  }
}

export async function geocodeAllCustomers(): Promise<{
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ customerId: string; customerName: string; error: string }>;
}> {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, delivery_address, delivery_city, delivery_state, delivery_postal_code, address, city, state, postal_code, latitude')
    .or('latitude.is.null,geocoding_error.not.is.null');

  if (error) throw error;

  const results = {
    total: customers?.length || 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ customerId: string; customerName: string; error: string }>
  };

  for (const customer of customers || []) {
    const addressToGeocode = {
      street: customer.delivery_address || customer.address || '',
      city: customer.delivery_city || customer.city || '',
      state: customer.delivery_state || customer.state || '',
      postalCode: customer.delivery_postal_code || customer.postal_code || ''
    };

    if (!addressToGeocode.street || !addressToGeocode.city) {
      results.failed++;
      results.errors.push({
        customerId: customer.id,
        customerName: customer.name,
        error: 'Incomplete address information'
      });
      continue;
    }

    try {
      await updateCustomerGeocode(customer.id, addressToGeocode);
      results.successful++;

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err: any) {
      results.failed++;
      results.errors.push({
        customerId: customer.id,
        customerName: customer.name,
        error: err.message || 'Unknown error'
      });
    }
  }

  return results;
}

export async function getFacilityCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['facility_latitude', 'facility_longitude']);

  if (error) {
    console.error('Failed to load facility coordinates from settings:', error);
    return null;
  }

  const settingsMap: Record<string, string> = {};
  data?.forEach(item => {
    settingsMap[item.setting_key] = item.setting_value || '';
  });

  const latitude = settingsMap.facility_latitude;
  const longitude = settingsMap.facility_longitude;

  if (latitude && longitude) {
    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
  }

  const settings = await getRoutingSettings();

  const facilityAddress = {
    street: settings.facility_address || '3303 South 40th Street',
    city: settings.facility_city || 'Phoenix',
    state: settings.facility_state || 'AZ',
    postalCode: settings.facility_postal_code || '85040'
  };

  const defaultCoords = {
    latitude: 33.417454,
    longitude: -111.994514
  };

  if (facilityAddress.street === '3303 South 40th Street' &&
      facilityAddress.city === 'Phoenix' &&
      facilityAddress.state === 'AZ') {
    return defaultCoords;
  }

  try {
    const geocoded = await geocodeAddress(facilityAddress);
    return {
      latitude: geocoded.latitude,
      longitude: geocoded.longitude
    };
  } catch (err) {
    console.error('Failed to geocode facility address:', err);
    return defaultCoords;
  }
}

export async function validateAddress(address: Address): Promise<boolean> {
  try {
    await geocodeAddress(address);
    return true;
  } catch {
    return false;
  }
}

export function formatAddressForGeocoding(
  deliveryAddress: string | null,
  deliveryCity: string | null,
  deliveryState: string | null,
  deliveryPostalCode: string | null,
  fallbackAddress: string | null,
  fallbackCity: string | null,
  fallbackState: string | null,
  fallbackPostalCode: string | null
): Address {
  return {
    street: deliveryAddress || fallbackAddress || '',
    city: deliveryCity || fallbackCity || '',
    state: deliveryState || fallbackState || '',
    postalCode: deliveryPostalCode || fallbackPostalCode || ''
  };
}

/**
 * Geocodes a customer by address string and updates their coordinates
 * Used by RouteTestingTool for simple geocoding
 */
export async function geocodeCustomerByAddress(customerId: string, addressString: string): Promise<{ latitude: number; longitude: number }> {
  const data = await invokeGeocode(addressString);

  if (!data.features || data.features.length === 0) {
    throw new Error('Address not found');
  }

  const [longitude, latitude] = data.features[0].geometry.coordinates;

  const { error: updateError } = await supabase
    .from('customers')
    .update({
      latitude,
      longitude,
      geocoded_at: new Date().toISOString(),
      geocoding_error: null
    })
    .eq('id', customerId);

  if (updateError) throw updateError;

  return { latitude, longitude };
}
