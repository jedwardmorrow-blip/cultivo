import { supabase } from '@/lib/supabase';

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
  const settings = await getRoutingSettings();
  const apiKey = settings.routing_api_key;

  if (!apiKey) {
    throw new Error('Routing API key not configured. Please add it in Settings.');
  }

  const url = 'https://api.openrouteservice.org/v2/directions/driving-car';

  const requestBody = {
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
    attributes: ['avgspeed', 'detourfactor']
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Routing Service] API request failed:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      requestUrl: url,
      origin,
      destination
    });
    throw new Error(`Routing API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  console.log('OpenRouteService API Response:', {
    routes: data.routes?.length,
    geometry: data.routes?.[0]?.geometry ? 'present' : 'missing',
    geometryType: typeof data.routes?.[0]?.geometry,
    segments: data.routes?.[0]?.segments?.length,
    summary: data.routes?.[0]?.summary
  });

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found between these locations');
  }

  const route = data.routes[0];

  if (route.geometry) {
    const geomStr = typeof route.geometry === 'string' ? route.geometry : JSON.stringify(route.geometry);
    console.log('Geometry sample (first 200 chars):', geomStr.substring(0, 200));
  }

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

  console.log('Route API Response:', {
    totalDistance: route.summary?.distance,
    totalDuration: route.summary?.duration,
    instructionCount: instructions.length,
    sampleInstruction: instructions[0]
  });

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
  console.log(`[Routing Service] Looking for cached route from ${originId} to ${destinationCustomerId}`);

  const settings = await getRoutingSettings();
  const cacheDays = parseInt(settings.route_cache_days || '30');

  const isLocationOrigin = !originId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  console.log(`[Routing Service] Origin is ${isLocationOrigin ? 'location' : 'customer'} (${originId})`);

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
    console.log(`[Routing Service] Querying with origin_location_id = '${originId}'`);
    query = query.eq('origin_location_id', originId);
  } else {
    console.log(`[Routing Service] Querying with origin_customer_id = '${originId}'`);
    query = query.eq('origin_customer_id', originId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[Routing Service] Error fetching cached route:', error);
    return null;
  }

  if (!data) {
    console.log('[Routing Service] No cached route found');
    return null;
  }

  console.log('[Routing Service] Found cached route:', {
    id: data.id,
    distance: data.distance_meters,
    waypoints: data.route_waypoints?.length || 0,
    lastCalculated: data.last_calculated_at
  });

  const cacheDate = new Date(data.last_calculated_at);
  const now = new Date();
  const daysSinceCalculated = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCalculated > cacheDays) {
    console.log(`[Routing Service] Cached route is stale (${daysSinceCalculated.toFixed(1)} days old, max ${cacheDays} days)`);
    return null;
  }

  console.log(`[Routing Service] Using cached route (${daysSinceCalculated.toFixed(1)} days old)`);

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

    console.log(`[Routing Service] Updated existing cached route ${routeRecord.id}`);
  } else {
    const { data, error: insertError } = await supabase
      .from('delivery_routes')
      .insert(routeData)
      .select('id')
      .single();

    if (insertError) throw insertError;
    routeRecord = data;

    console.log(`[Routing Service] Created new cached route ${routeRecord.id}`);
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
  console.log('[Routing Service] Getting or calculating route:', {
    originId,
    destinationCustomerId,
    originCoords,
    destinationCoords
  });

  if (!originCoords.latitude || !originCoords.longitude) {
    throw new Error(`Invalid origin coordinates: lat=${originCoords.latitude}, lon=${originCoords.longitude}`);
  }
  if (!destinationCoords.latitude || !destinationCoords.longitude) {
    throw new Error(`Invalid destination coordinates: lat=${destinationCoords.latitude}, lon=${destinationCoords.longitude}`);
  }

  const cached = await getCachedRoute(originId, destinationCustomerId);

  if (cached) {
    console.log('[Routing Service] Returning cached route');
    return {
      distance_meters: cached.distance_meters,
      duration_seconds: cached.duration_seconds,
      instructions: cached.instructions,
      geometry: cached.geometry,
      summary: cached.summary
    };
  }

  console.log('[Routing Service] No cached route, calculating from API...');
  const route = await calculateRouteFromAPI(originCoords, destinationCoords);
  console.log('[Routing Service] Route calculated successfully:', {
    distance: route.distance_meters,
    duration: route.duration_seconds,
    instructions: route.instructions.length,
    hasGeometry: !!route.geometry
  });

  console.log('[Routing Service] Saving route to cache...');
  try {
    await saveRouteToCache(originId, destinationCustomerId, route);
    console.log('[Routing Service] Route saved to cache successfully');
  } catch (cacheError) {
    console.warn('[Routing Service] Failed to save route to cache, continuing with calculated route:', cacheError);
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
        const { getLocationById } = await import('./locations.service');
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
          console.warn(`Failed to cache refreshed route ${route.id}:`, cacheError);
        }
      }
    } catch (err) {
      console.error(`Failed to refresh route ${route.id}:`, err);
    }
  }

  return refreshed;
}
