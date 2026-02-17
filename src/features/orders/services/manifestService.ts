import { supabase } from '@/lib/supabase';
import {
  getCompanySettings,
  DEFAULT_COMPANY_NAME, DEFAULT_LICENSE_NUMBER, DEFAULT_COMPANY_ADDRESS,
  DEFAULT_COMPANY_CITY, DEFAULT_COMPANY_STATE, DEFAULT_COMPANY_POSTAL_CODE,
} from '@/lib/constants';
import {
  getOrCalculateRoute,
  formatDistance,
  formatDuration,
  type RouteInstruction,
  type Coordinate
} from '../../delivery/services/routing.service';
import { getLocationById } from '../../delivery/services/locations.service';
import { generateStaticMapDataUrl } from '../../delivery/services/staticMap.service';
import { updateCustomerGeocode, formatAddressForGeocoding } from '../../delivery/services/geocoding.service';

export interface ManifestLineItem {
  item_number: number;
  product_name: string;
  package_id: string | null;
  batch_number: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  net_weight: number;
  gross_weight: number;
  total: number;
  strain: string | null;
}

export interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  fa_number: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
}

export interface ManifestData {
  manifest_number: string;
  order_number: string;
  invoice_number: string;
  date_completed: string;

  origin_location_id: string | null;
  origin_location_name: string;
  origin_location_address: string;

  originating_entity_name: string;
  originating_entity_license: string;
  originating_entity_address: string;
  originating_entity_city: string;
  originating_entity_state: string;
  originating_entity_postal_code: string;
  originating_entity_phone: string;

  destination_entity_name: string;
  destination_entity_license: string;
  destination_entity_address: string;
  destination_entity_city: string;
  destination_entity_state: string;
  destination_entity_postal_code: string;

  driver: Driver;
  vehicle: Vehicle;

  route_description: string;
  route_instructions?: RouteInstruction[];
  route_distance?: string;
  route_duration?: string;
  route_map_url?: string;
  departure_time: string;
  arrival_time: string;
  stop_number: string;

  line_items: ManifestLineItem[];

  total_amount: number;
  notes: string | null;
}

export async function generateManifestData(
  orderId: string,
  driverId: string,
  vehicleId: string,
  originLocationId: string = 'facility',
  stopNumber: string = '1',
  routeDescription: string = '',
  notes: string = ''
): Promise<ManifestData> {
  const [orderResult, itemsResult, driverResult, vehicleResult, companySettings] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_date,
        scheduled_delivery_date,
        total_amount,
        delivery_notes,
        customers:customer_id (
          id,
          name,
          license_name,
          license_number,
          ato_number,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          address,
          city,
          state,
          postal_code,
          latitude,
          longitude
        )
      `)
      .eq('id', orderId)
      .single(),

    supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        subtotal,
        products:product_id (
          name,
          strain,
          pricing_unit,
          product_category,
          gross_weight
        )
      `)
      .eq('order_id', orderId),

    supabase
      .from('delivery_drivers')
      .select('*')
      .eq('id', driverId)
      .single(),

    supabase
      .from('delivery_vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single(),

    getCompanySettings()
  ]);

  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (driverResult.error) throw driverResult.error;
  if (vehicleResult.error) throw vehicleResult.error;

  const order = orderResult.data;
  const items = itemsResult.data || [];
  const driver = driverResult.data;
  const vehicle = vehicleResult.data;
  const customer = order.customers;

  if (!customer) {
    throw new Error('Customer not found for this order');
  }

  const allocationsResult = await supabase
    .from('order_item_allocations')
    .select(`
      order_item_id,
      inventory_type,
      inventory_id,
      allocated_quantity
    `)
    .eq('order_id', orderId)
    .in('allocation_status', ['reserved', 'confirmed', 'consumed']);

  const allocationsMap = new Map<string, any[]>();
  allocationsResult.data?.forEach(alloc => {
    const existing = allocationsMap.get(alloc.order_item_id) || [];
    allocationsMap.set(alloc.order_item_id, [...existing, alloc]);
  });

  const inventoryIds = Array.from(new Set(
    allocationsResult.data?.map(a => a.inventory_id) || []
  ));

  let inventoryMap = new Map<string, any>();
  if (inventoryIds.length > 0) {
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('id, package_id, batch, net_weight')
      .in('id', inventoryIds);

    inventoryData?.forEach(inv => {
      inventoryMap.set(inv.id, inv);
    });
  }

  const lineItems: ManifestLineItem[] = items.map((item, index) => {
    const product = item.products;
    const allocations = allocationsMap.get(item.id) || [];

    let packageId = null;
    let batchNumber = null;
    let netWeight = 0;

    if (allocations.length > 0) {
      const firstAllocation = allocations[0];
      const inventory = inventoryMap.get(firstAllocation.inventory_id);
      if (inventory) {
        packageId = inventory.package_id;
        batchNumber = inventory.batch;
        netWeight = inventory.net_weight || 0;
      }
    }

    const grossWeight = product?.gross_weight || 0;

    return {
      item_number: index + 1,
      product_name: product?.name || 'Unknown Product',
      package_id: packageId,
      batch_number: batchNumber,
      quantity: item.quantity,
      unit: product?.pricing_unit || 'unit',
      unit_price: item.unit_price,
      net_weight: netWeight * item.quantity,
      gross_weight: grossWeight * item.quantity,
      total: item.subtotal,
      strain: product?.strain || null
    };
  });

  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

  const manifestNumber = order.order_number;
  const invoiceNumber = order.order_number.replace('ORD-', 'INV-');
  const dateCompleted = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

  const customerLicense = customer?.license_number || customer?.ato_number || '';

  const deliveryAddress = customer?.delivery_address || customer?.address || '';
  const deliveryCity = customer?.delivery_city || customer?.city || '';
  const deliveryState = customer?.delivery_state || customer?.state || '';
  const deliveryPostalCode = customer?.delivery_postal_code || customer?.postal_code || '';

  const originLocation = await getLocationById(originLocationId);
  if (!originLocation) {
    console.error(`[Manifest Service] Origin location not found: ${originLocationId}`);
    throw new Error(`Origin location not found: ${originLocationId}`);
  }

  const originCoords: Coordinate = {
    latitude: originLocation.latitude,
    longitude: originLocation.longitude
  };

  let routeInstructions: RouteInstruction[] | undefined;
  let routeDistance: string | undefined;
  let routeDuration: string | undefined;
  let routeMapUrl: string | undefined;
  let finalRouteDescription = routeDescription;

  // Try to geocode customer if they don't have coordinates
  let customerLat = customer?.latitude;
  let customerLon = customer?.longitude;

  if (customer && (!customerLat || !customerLon)) {
    try {
      const address = formatAddressForGeocoding(
        customer.delivery_address,
        customer.delivery_city,
        customer.delivery_state,
        customer.delivery_postal_code,
        customer.address,
        customer.city,
        customer.state,
        customer.postal_code
      );

      if (address.street && address.city) {
        await updateCustomerGeocode(customer.id, address);

        // Fetch the updated customer record with new coordinates
        const { data: updatedCustomer } = await supabase
          .from('customers')
          .select('latitude, longitude')
          .eq('id', customer.id)
          .single();

        if (updatedCustomer) {
          customerLat = updatedCustomer.latitude;
          customerLon = updatedCustomer.longitude;
        }
      } else {
      }
    } catch (geocodeError) {
      console.error(`[Manifest Service] Failed to geocode customer ${customer.name}:`, geocodeError);
    }
  }

  if (customerLat && customerLon) {
    try {
      const destCoords: Coordinate = {
        latitude: customerLat,
        longitude: customerLon
      };

      const route = await getOrCalculateRoute(
        originLocationId,
        customer.id,
        originCoords,
        destCoords
      );

      routeInstructions = route.instructions;
      routeDistance = formatDistance(route.distance_meters);
      routeDuration = formatDuration(route.duration_seconds);

      if (!routeDescription && route.instructions && route.instructions.length > 0) {
        finalRouteDescription = route.instructions
          .slice(0, 3)
          .map((inst, idx) => `${idx + 1}. ${inst.instruction_text}`)
          .join('\n');
      } else if (!routeDescription) {
      }

      try {
        routeMapUrl = await generateStaticMapDataUrl({
          width: 600,
          height: 400,
          origin: originCoords,
          destination: destCoords,
          routeGeometry: route.geometry
        });

        if (routeMapUrl && routeMapUrl.startsWith('data:image')) {
        } else if (routeMapUrl) {
        } else {
        }
      } catch (mapError) {
        console.error('[Manifest Service] Failed to generate map:', mapError);
      }
    } catch (error) {
      console.error('[Manifest Service] Failed to calculate route:', error);
      console.error('[Manifest Service] Error details:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        customerName: customer?.name,
        customerId: customer?.id,
        originLocationId,
        customerCoordinates: { lat: customerLat, lon: customerLon },
        originCoordinates: originCoords
      });
    }
  } else {
  }

  return {
    manifest_number: manifestNumber,
    order_number: order.order_number,
    invoice_number: invoiceNumber,
    date_completed: dateCompleted,

    origin_location_id: originLocationId === 'facility' ? null : originLocationId,
    origin_location_name: originLocation.name,
    origin_location_address: originLocation.address,

    originating_entity_name: companySettings.company_name || DEFAULT_COMPANY_NAME,
    originating_entity_license: companySettings.company_license_number || DEFAULT_LICENSE_NUMBER,
    originating_entity_address: companySettings.company_address || DEFAULT_COMPANY_ADDRESS,
    originating_entity_city: companySettings.company_city || DEFAULT_COMPANY_CITY,
    originating_entity_state: companySettings.company_state || DEFAULT_COMPANY_STATE,
    originating_entity_postal_code: companySettings.company_postal_code || DEFAULT_COMPANY_POSTAL_CODE,
    originating_entity_phone: companySettings.company_phone || '',

    destination_entity_name: customer?.name || 'Unknown Customer',
    destination_entity_license: customerLicense,
    destination_entity_address: deliveryAddress,
    destination_entity_city: deliveryCity,
    destination_entity_state: deliveryState,
    destination_entity_postal_code: deliveryPostalCode,

    driver: {
      id: driver.id,
      first_name: driver.first_name,
      last_name: driver.last_name,
      fa_number: driver.fa_number
    },

    vehicle: {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.license_plate,
      vin: vehicle.vin
    },

    route_description: finalRouteDescription,
    route_instructions: routeInstructions,
    route_distance: routeDistance,
    route_duration: routeDuration,
    route_map_url: routeMapUrl,
    departure_time: '',
    arrival_time: '',
    stop_number: stopNumber,

    line_items: lineItems,

    total_amount: totalAmount,
    notes: notes || order.delivery_notes
  };
}

export async function saveManifest(manifestData: ManifestData): Promise<string> {
  const { data, error } = await supabase
    .from('manifests')
    .insert({
      manifest_number: manifestData.manifest_number,
      order_id: manifestData.order_number,
      driver_id: manifestData.driver.id,
      vehicle_id: manifestData.vehicle.id,
      origin_customer_id: manifestData.origin_location_id,
      route_description: manifestData.route_description,
      route_map_url: manifestData.route_map_url,
      departure_time: manifestData.departure_time,
      arrival_time: manifestData.arrival_time,
      stop_number: manifestData.stop_number,
      notes: manifestData.notes,
      status: 'generated'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
