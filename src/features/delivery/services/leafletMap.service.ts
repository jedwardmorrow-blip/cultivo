import L from 'leaflet';
import { Coordinate } from './routing.service';

export interface LeafletMapOptions {
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

export async function generateLeafletMapDataUrl(options: LeafletMapOptions): Promise<string> {
  let mapContainer: HTMLDivElement | null = null;
  let map: L.Map | null = null;

  try {
    if (typeof document === 'undefined') {
      throw new Error('Document not available - cannot generate map in server environment');
    }

    console.log('[Leaflet Map Service] Starting map generation...', {
      origin: options.origin,
      destination: options.destination,
      hasGeometry: !!options.routeGeometry,
      geometryType: typeof options.routeGeometry,
      geometryLength: options.routeGeometry?.length || 0
    });

    mapContainer = document.createElement('div');
    mapContainer.style.width = `${options.width}px`;
    mapContainer.style.height = `${options.height}px`;
    mapContainer.style.position = 'fixed';
    mapContainer.style.top = '-10000px';
    mapContainer.style.left = '-10000px';
    mapContainer.style.zIndex = '-9999';
    mapContainer.style.visibility = 'hidden';
    mapContainer.style.opacity = '0';
    mapContainer.style.pointerEvents = 'none';
    document.body.appendChild(mapContainer);

    let routeCoordinates: [number, number][] = [];

    if (options.routeGeometry && typeof options.routeGeometry === 'string') {
      try {
        routeCoordinates = decodePolyline(options.routeGeometry);
        console.log(`[Leaflet Map Service] Decoded ${routeCoordinates.length} route points from polyline geometry`);
      } catch (err) {
        console.error('[Leaflet Map Service] Failed to decode route geometry, falling back to straight line:', err);
        routeCoordinates = [
          [options.origin.latitude, options.origin.longitude],
          [options.destination.latitude, options.destination.longitude]
        ];
      }
    } else {
      console.log('[Leaflet Map Service] No valid route geometry provided, using straight line between origin and destination');
      routeCoordinates = [
        [options.origin.latitude, options.origin.longitude],
        [options.destination.latitude, options.destination.longitude]
      ];
    }

    map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 3,
      crossOrigin: 'anonymous'
    });

    tileLayer.addTo(map);

    const routeLatLngs = routeCoordinates.map(coord => L.latLng(coord[0], coord[1]));
    const polyline = L.polyline(routeLatLngs, {
      color: '#2563EB',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1
    });

    polyline.addTo(map);

    const originIcon = L.divIcon({
      html: '<div style="background-color: #10B981; width: 36px; height: 36px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 18px; box-shadow: 0 4px 8px rgba(0,0,0,0.5);">A</div>',
      className: 'map-marker-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const destIcon = L.divIcon({
      html: '<div style="background-color: #EF4444; width: 36px; height: 36px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 18px; box-shadow: 0 4px 8px rgba(0,0,0,0.5);">B</div>',
      className: 'map-marker-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const originMarker = L.marker([options.origin.latitude, options.origin.longitude], { icon: originIcon, zIndexOffset: 1000 });
    originMarker.addTo(map);

    const destMarker = L.marker([options.destination.latitude, options.destination.longitude], { icon: destIcon, zIndexOffset: 1000 });
    destMarker.addTo(map);

    const bounds = L.latLngBounds(routeLatLngs);
    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 15
    });

    console.log('[Leaflet Map Service] Map configured, waiting for tiles to load...');
    await new Promise<void>((resolve, reject) => {
      let tilesLoaded = 0;
      let tilesLoading = 0;
      let timeoutId: NodeJS.Timeout;

      const checkComplete = () => {
        if (tilesLoading === 0 && tilesLoaded > 0) {
          clearTimeout(timeoutId);
          console.log(`[Leaflet Map Service] All ${tilesLoaded} tiles loaded successfully`);
          setTimeout(() => resolve(), 1500);
        }
      };

      tileLayer.on('tileloadstart', () => {
        tilesLoading++;
      });

      tileLayer.on('tileload', () => {
        tilesLoading--;
        tilesLoaded++;
        checkComplete();
      });

      tileLayer.on('tileerror', (error) => {
        console.error('Tile load error:', error);
        tilesLoading--;
        checkComplete();
      });

      timeoutId = setTimeout(() => {
        if (tilesLoaded === 0) {
          reject(new Error('Timeout waiting for map tiles to load'));
        } else {
          console.log(`[Leaflet Map Service] Timeout reached but ${tilesLoaded} tiles loaded - proceeding with export`);
          resolve();
        }
      }, 10000);

      setTimeout(() => {
        checkComplete();
      }, 500);
    });

    console.log('[Leaflet Map Service] Capturing map as image using canvas export...');

    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    const tilePane = mapContainer.querySelector('.leaflet-tile-pane') as HTMLElement;
    const overlayPane = mapContainer.querySelector('.leaflet-overlay-pane') as HTMLElement;

    let tilePaneOffsetX = 0;
    let tilePaneOffsetY = 0;

    if (tilePane) {
      const tiles = tilePane.querySelectorAll('img.leaflet-tile');
      console.log(`[Leaflet Map Service] Found ${tiles.length} map tiles to render on canvas`);

      const transform = tilePane.style.transform;
      const match = transform.match(/translate3d\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px/);
      tilePaneOffsetX = match ? parseFloat(match[1]) : 0;
      tilePaneOffsetY = match ? parseFloat(match[2]) : 0;

      console.log(`Tile pane offset: (${tilePaneOffsetX}, ${tilePaneOffsetY})`);

      for (const tile of Array.from(tiles)) {
        const img = tile as HTMLImageElement;
        if (img.complete && img.naturalWidth > 0) {
          const tileTransform = img.style.transform;
          const tileMatch = tileTransform.match(/translate3d\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px/);

          if (tileMatch) {
            const x = parseFloat(tileMatch[1]) + tilePaneOffsetX;
            const y = parseFloat(tileMatch[2]) + tilePaneOffsetY;

            try {
              ctx.drawImage(img, x, y);
            } catch (e) {
              console.warn('Failed to draw tile:', e);
            }
          }
        }
      }
    }

    const svgElements = overlayPane ? overlayPane.querySelectorAll('svg') : mapContainer.querySelectorAll('svg');
    console.log(`[Leaflet Map Service] Found ${svgElements.length} SVG elements (route lines) to render`);

    for (const svg of Array.from(svgElements)) {
      const parent = svg.parentElement;
      let svgOffsetX = tilePaneOffsetX;
      let svgOffsetY = tilePaneOffsetY;

      if (parent && parent.style.transform) {
        const parentTransform = parent.style.transform;
        const parentMatch = parentTransform.match(/translate3d\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px/);
        if (parentMatch) {
          svgOffsetX = parseFloat(parentMatch[1]);
          svgOffsetY = parseFloat(parentMatch[2]);
          console.log(`SVG parent offset: (${svgOffsetX}, ${svgOffsetY})`);
        }
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, svgOffsetX, svgOffsetY);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          console.warn('Failed to load SVG');
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    }

    const markers = mapContainer.querySelectorAll('.leaflet-marker-icon');
    console.log(`[Leaflet Map Service] Found ${markers.length} markers to render`);

    for (const marker of Array.from(markers)) {
      const markerEl = marker as HTMLElement;
      const markerRect = markerEl.getBoundingClientRect();
      const containerRect = mapContainer.getBoundingClientRect();
      const x = markerRect.left - containerRect.left;
      const y = markerRect.top - containerRect.top;
      const width = markerRect.width;
      const height = markerRect.height;

      console.log(`Rendering marker at position (${x.toFixed(1)}, ${y.toFixed(1)}) with size ${width}x${height}`);

      const markerCanvas = await htmlToCanvas(markerEl);
      if (markerCanvas.width > 0 && markerCanvas.height > 0) {
        ctx.drawImage(markerCanvas, x, y, width, height);
        console.log('Marker rendered successfully');
      } else {
        console.warn('Marker canvas has zero dimensions');
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    console.log('[Leaflet Map Service] ✓ Map image generated successfully, data URL length:', dataUrl.length);

    return dataUrl;

  } catch (error) {
    console.error('[Leaflet Map Service] ✗ Error generating Leaflet map:', error);
    if (error instanceof Error) {
      console.error('[Leaflet Map Service] Error stack:', error.stack);
    }
    throw new Error(`Failed to generate map: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    try {
      if (map) {
        map.remove();
        console.log('[Leaflet Map Service] Leaflet map instance destroyed');
      }
      if (mapContainer && mapContainer.parentNode) {
        mapContainer.parentNode.removeChild(mapContainer);
        console.log('[Leaflet Map Service] Map container removed from DOM');
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
  }
}

async function htmlToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const rect = element.getBoundingClientRect();
  canvas.width = Math.max(rect.width, 36);
  canvas.height = Math.max(rect.height, 36);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return canvas;
  }

  const innerDiv = element.querySelector('div') as HTMLElement;
  if (!innerDiv) {
    return canvas;
  }

  const computedStyle = window.getComputedStyle(innerDiv);
  const bgColor = computedStyle.backgroundColor;
  const textColor = computedStyle.color;
  const borderWidth = parseFloat(computedStyle.borderWidth) || 4;
  const fontSize = parseFloat(computedStyle.fontSize) || 18;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = (canvas.width / 2) - borderWidth;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + borderWidth, 0, 2 * Math.PI);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = bgColor || '#10B981';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = textColor || '#ffffff';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(innerDiv.textContent || '', centerX, centerY);

  return canvas;
}
