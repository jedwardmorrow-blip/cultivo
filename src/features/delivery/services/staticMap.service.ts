import { Coordinate } from './routing.service';
import { generateLeafletMapDataUrl } from './leafletMap.service';

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface StaticMapOptions {
  width: number;
  height: number;
  origin: Coordinate;
  destination: Coordinate;
  routeGeometry?: string;
}

function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

function calculateBounds(points: [number, number][]): MapBounds {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLon = points[0][1];
  let maxLon = points[0][1];

  for (const [lat, lon] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }

  const latPadding = (maxLat - minLat) * 0.15 || 0.01;
  const lonPadding = (maxLon - minLon) * 0.15 || 0.01;

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding
  };
}

function calculateZoom(bounds: MapBounds): number {
  const latDiff = bounds.maxLat - bounds.minLat;
  const lonDiff = bounds.maxLon - bounds.minLon;

  const maxDiff = Math.max(latDiff, lonDiff);

  if (maxDiff > 10) return 6;
  if (maxDiff > 5) return 8;
  if (maxDiff > 2) return 9;
  if (maxDiff > 1) return 10;
  if (maxDiff > 0.5) return 11;
  if (maxDiff > 0.2) return 12;
  if (maxDiff > 0.1) return 13;
  return 14;
}

export async function generateSimpleMapDataUrl(options: StaticMapOptions): Promise<string> {
  try {
    if (typeof document === 'undefined') {
      console.warn('Document not available, cannot generate map');
      return '';
    }

    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let routeCoordinates: [number, number][] = [];

    if (options.routeGeometry && typeof options.routeGeometry === 'string') {
      try {
        routeCoordinates = decodePolyline(options.routeGeometry);
        console.log(`Decoded ${routeCoordinates.length} route points`);
      } catch (err) {
        console.error('Failed to decode route geometry:', err);
      }
    }

    if (routeCoordinates.length === 0) {
      routeCoordinates = [
        [options.origin.latitude, options.origin.longitude],
        [options.destination.latitude, options.destination.longitude]
      ];
    }

    const bounds = calculateBounds(routeCoordinates);

    const lonToX = (lon: number) => {
      return ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * canvas.width;
    };

    const latToY = (lat: number) => {
      return canvas.height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * canvas.height;
    };

    if (routeCoordinates.length > 1) {
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const firstPoint = routeCoordinates[0];
      ctx.moveTo(lonToX(firstPoint[1]), latToY(firstPoint[0]));

      for (let i = 1; i < routeCoordinates.length; i++) {
        const point = routeCoordinates[i];
        ctx.lineTo(lonToX(point[1]), latToY(point[0]));
      }

      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const originX = lonToX(options.origin.longitude);
    const originY = latToY(options.origin.latitude);
    const destX = lonToX(options.destination.longitude);
    const destY = latToY(options.destination.latitude);

    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(originX, originY, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(destX, destY, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', originX, originY);
    ctx.fillText('B', destX, destY);

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating simple map:', error);
    return '';
  }
}

export async function generateStaticMapDataUrl(options: StaticMapOptions): Promise<string> {
  console.log('[Static Map Service] Generating map with options:', {
    width: options.width,
    height: options.height,
    origin: options.origin,
    destination: options.destination,
    hasGeometry: !!options.routeGeometry,
    geometryType: typeof options.routeGeometry,
    geometryLength: options.routeGeometry ? (typeof options.routeGeometry === 'string' ? options.routeGeometry.length : 'not a string') : 0
  });

  try {
    console.log('[Static Map Service] Attempting to generate map with Leaflet...');
    const leafletMap = await generateLeafletMapDataUrl(options);

    if (leafletMap && leafletMap.startsWith('data:image')) {
      console.log('[Static Map Service] Successfully generated Leaflet map, length:', leafletMap.length);
      return leafletMap;
    }

    console.warn('[Static Map Service] Leaflet map generation returned invalid result, falling back to simple map');
    return await generateSimpleMapDataUrl(options);

  } catch (error) {
    console.error('[Static Map Service] Leaflet map generation failed:', error);
    console.log('[Static Map Service] Falling back to simple canvas map');

    try {
      const simpleMap = await generateSimpleMapDataUrl(options);
      if (simpleMap && simpleMap.startsWith('data:image')) {
        console.log('[Static Map Service] Successfully generated simple map, length:', simpleMap.length);
        return simpleMap;
      }
      console.error('[Static Map Service] Simple map generation returned invalid result');
      return '';
    } catch (fallbackError) {
      console.error('[Static Map Service] Fallback map generation also failed:', fallbackError);
      return '';
    }
  }
}
