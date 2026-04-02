import { supabase } from '@/lib/supabase';
import { getLocationById } from './locations.service';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteInstruction {
  step_number: number;
  instruction_text: string;
  distance_meters: number;
  duration_seconds: number;
  street_name?: string;
  direction?: string;
}

export interface RouteResult {
  distance_meters: number;
  duration_seconds: number;
  instructions: RouteInstruction[];
  geometry?: any;
  summary?: any;
}

export interface CachedRoute extends RouteResult {
  id: string;
  last_calculated_at: string;
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

/**
 * Calculates a route using OpenRouteService API
 *
 * @param origin - Origin coordinates
 * @param destination - Destination coordinates
 * @returns Promise<RouteResult> - Route with distance, duration, and turn-by-turn instructions
 * @throws {Error} If API key not configured or API request fails
 * @description Calls OpenRouteService driving-car directions API
 */
export async function calculateRouteFromAPI(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult> {
  const { data, error } = await supabase.functions.invoke('ors-proxy', {
    body: {
      operation: 'route',
      coordinates: [
        [origin.longitude, origin.latitude],
        [destination.longitude, destination.latitude]
      ],
      instructions: true,
      instructions_format: 'text',
      language: 'en',
      geometry: true,
      elevation: false,
      preference: 'recommended',
      attributes: ['avgspeed', 'detourfactor'],
    },
  });

  if (error) {
    throw new Error(`Routing proxy error: ${error.message}`);
  }

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found between these locations');
  }

  const route = data.routes[0];

  const instructions: RouteInstruction[] = [];

  if (route.segments && route.segments.length > 0) {
    for (const segment of route.segments) {
      if (segment.steps && segment.steps.length > 0) {
        for (let i = 0; i < segment.steps.length; i++) {
          const step = segment.steps[i];

          let instructionText = step.instruction || 'Continue';

          if (step.name && !instructionText.includes(step.name)) {
            if (instructionText.toLowerCase().includes('turn') ||
                instructionText.toLowerCase().includes('onto') ||
                instructionText.toLowerCase().includes('merge')) {
              instructionText = `${instructionText}`;
            }
          }

          instructions.push({
            step_number: instructions.length + 1,
            instruction_text: instructionText,
            distance_meters: step.distance || 0,
            duration_seconds: step.duration || 0,
            street_name: step.name || '',
            direction: step.type || ''
          });
        }
      }
    }
  }

  return {
    distance_meters: route.summary?.distance || 0,
    duration_seconds: route.summary?.duration || 0,
    instructions,
    geometry: route.geometry,
    summary: route.summary
  };
}

/**
 * Retrieves a cached route from the database
 *
 * @param originId - Origin location ID or customer UUID
 * @param destinationCustomerId - Destination customer UUID
 * @returns Promise<CachedRoute | null> - Cached route or null if not found/expired
 * @description Checks cache validity based on route_cache_days setting
 */
export async function getCachedRoute(
  originId: string,
  destinationCustomerId: string
): Promise<CachedRoute | null> {
  const settings = await getRoutingSettings();
  const cacheDays = parseInt(settings.route_cache_days || '30');

  const isLocationOrigin = !originId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  let query = supabase
    .from('delivery_routes')
    .select(`
      id,
      distance_meters,
      duration_seconds,
      route_geometry,
      summary,
      last_calculated_at,
      route_waypoints (
        step_number,
        instruction_text,
        distance_meters,
        duration_seconds,
        street_name,
        direction
      )
    `)
    .eq('destination_customer_id', destinationCustomerId);

  if (isLocationOrigin) {
    query = query.eq('origin_location_id', originId);
  } else {
    query = query.eq('origin_customer_id', originId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[Routing Service] Error fetching cached route:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const cacheDate = new Date(data.last_calculated_at);
  const now = new Date();
  const daysSinceCalculated = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCalculated > cacheDays) {
    return null;
  }

  const waypoints = data.route_waypoints || [];
  const instructions: RouteInstruction[] = waypoints
    .sort((a: any, b: any) => a.step_number - b.step_number)
    .map((wp: any) => ({
      step_number: wp.step_number,
      instruction_text: wp.instruction_text,
      distance_meters: wp.distance_meters,
      duration_seconds: wp.duration_seconds,
      street_name: wp.street_name,
      direction: wp.direction
    }));

  return {
    id: data.id,
    distance_meters: data.distance_meters,
    duration_seconds: data.duration_seconds,
    instructions,
    geometry: data.route_geometry,
    summary: data.summary,
    last_calculated_at: data.last_calculated_at
  };
}

export async function saveRouteToCache(
  originId: string,
  destinationCustomerId: string,
  route: RouteResult
): Promise<string> {
  const isLocationOrigin = !originId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  const routeData: any = {
    destination_customer_id: destinationCustomerId,
    distance_meters: route.distance_meters,
    duration_seconds: route.duration_seconds,
    route_geometry: route.geometry,
    summary: route.summary,
    last_calculated_at: new Date().toISOString()
  };

  if (isLocationOrigin) {
    routeData.origin_location_id = originId;
    routeData.origin_customer_id = null;
  } else {
    routeData.origin_customer_id = originId;
    routeData.origin_location_id = null;
  }

  let query = supabase
    .from('delivery_routes')
    .select('id')
    .eq('destination_customer_id', destinationCustomerId);

  if (isLocationOrigin) {
    query = query.eq('origin_location_id', originId).is('origin_customer_id', null);
  } else {
    query = query.eq('origin_customer_id', originId).is('origin_location_id', null);
  }

  const { data: existingRoute } = await query.maybeSingle();

  let routeRecord;

  if (existingRoute) {
    const { data, error: updateError } = await supabase
      .from('delivery_routes')
      .update(routeData)
      .eq('id', existingRoute.id)
      .select('id')
      .single();

    if (updateError) throw updateError;
    routeRecord = data;

  } else {
    const { data, error: insertError } = await supabase
      .from('delivery_routes')
      .insert(routeData)
      .select('id')
      .single();

    if (insertError) throw insertError;
    routeRecord = data;

  }

  await supabase
    .from('route_waypoints')
    .delete()
    .eq('route_id', routeRecord.id);

  const waypoints = route.instructions.map(instruction => ({
    route_id: routeRecord.id,
    step_number: instruction.step_number,
    instruction_text: instruction.instruction_text,
    distance_meters: instruction.distance_meters,
    duration_seconds: instruction.duration_seconds,
    street_name: instruction.street_name || '',
    direction: instruction.direction || ''
  }));

  if (waypoints.length > 0) {
    const { error: waypointsError } = await supabase
      .from('route_waypoints')
      .insert(waypoints);

    if (waypointsError) throw waypointsError;
  }

  return routeRecord.id;
}

export async function getOrCalculateRoute(
  originId: string,
  destinationCustomerId: string,
  originCoords: Coordinate,
  destinationCoords: Coordinate
): Promise<RouteResult> {
  if (!originCoords.latitude || !originCoords.longitude) {
    throw new Error(`Invalid origin coordinates: lat=${originCoords.latitude}, lon=${originCoords.longitude}`);
  }
  if (!destinationCoords.latitude || !destinationCoords.longitude) {
    throw new Error(`Invalid destination coordinates: lat=${destinationCoords.latitude}, lon=${destinationCoords.longitude}`);
  }

  const cached = await getCachedRoute(originId, destinationCustomerId);

  if (cached) {
    return {
      distance_meters: cached.distance_meters,
      duration_seconds: cached.duration_seconds,
      instructions: cached.instructions,
      geometry: cached.geometry,
      summary: cached.summary
    };
  }

  const route = await calculateRouteFromAPI(originCoords, destinationCoords);

  try {
    await saveRouteToCache(originId, destinationCustomerId, route);
  } catch (cacheError) {
  }

  return route;
}

export async function calculateMultiStopRoute(
  stops: Array<{ customerId: string; coords: Coordinate }>
): Promise<{ totalRoute: RouteResult; segments: RouteResult[] }> {
  if (stops.length < 2) {
    throw new Error('At least 2 stops are required for a route');
  }

  const segments: RouteResult[] = [];
  let totalDistance = 0;
  let totalDuration = 0;
  let allInstructions: RouteInstruction[] = [];
  let stepCounter = 1;

  for (let i = 0; i < stops.length - 1; i++) {
    const origin = stops[i];
    const destination = stops[i + 1];

    const segment = await getOrCalculateRoute(
      origin.customerId,
      destination.customerId,
      origin.coords,
      destination.coords
    );

    const adjustedInstructions = segment.instructions.map(instruction => ({
      ...instruction,
      step_number: stepCounter++
    }));

    segments.push(segment);
    totalDistance += segment.distance_meters;
    totalDuration += segment.duration_seconds;
    allInstructions = [...allInstructions, ...adjustedInstructions];
  }

  return {
    totalRoute: {
      distance_meters: totalDistance,
      duration_seconds: totalDuration,
      instructions: allInstructions
    },
    segments
  };
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export async function refreshStaleRoutes(): Promise<number> {
  const settings = await getRoutingSettings();
  const cacheDays = parseInt(settings.route_cache_days || '30');

  const { data: staleRoutes, error } = await supabase
    .from('delivery_routes')
    .select('id, origin_customer_id, origin_location_id, destination_customer_id')
    .lt('last_calculated_at', new Date(Date.now() - cacheDays * 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  let refreshed = 0;

  for (const route of staleRoutes || []) {
    try {
      let originCoords: Coordinate | null = null;
      let originId: string;

      if (route.origin_location_id) {
        const location = await getLocationById(route.origin_location_id);
        if (location) {
          originCoords = { latitude: location.latitude, longitude: location.longitude };
          originId = route.origin_location_id;
        }
      }
      else if (route.origin_customer_id) {
        const { data: originCustomer } = await supabase
          .from('customers')
          .select('latitude, longitude')
          .eq('id', route.origin_customer_id)
          .single();

        if (originCustomer?.latitude && originCustomer?.longitude) {
          originCoords = { latitude: originCustomer.latitude, longitude: originCustomer.longitude };
          originId = route.origin_customer_id;
        }
      }

      const { data: destCustomer } = await supabase
        .from('customers')
        .select('latitude, longitude')
        .eq('id', route.destination_customer_id)
        .single();

      if (originCoords && destCustomer?.latitude && destCustomer?.longitude) {
        const newRoute = await calculateRouteFromAPI(
          originCoords,
          { latitude: destCustomer.latitude, longitude: destCustomer.longitude }
        );

        try {
          await saveRouteToCache(
            originId!,
            route.destination_customer_id,
            newRoute
          );
          refreshed++;
        } catch (cacheError) {
        }
      }
    } catch (err) {
      console.error(`Failed to refresh route ${route.id}:`, err);
    }
  }

  return refreshed;
}
