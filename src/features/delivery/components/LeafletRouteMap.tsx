import { useEffect, useRef } from 'react';
import type L from 'leaflet';
import { Coordinate } from '../services/routing.service';

interface LeafletRouteMapProps {
  origin: Coordinate;
  destination: Coordinate;
  routeGeometry?: string;
  className?: string;
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

export function LeafletRouteMap({ origin, destination, routeGeometry, className }: LeafletRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let destroyed = false;

    import('leaflet').then(({ default: L }) => {
      if (destroyed || !mapContainerRef.current) return;

      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    });

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then(({ default: L }) => {
      if (!mapInstanceRef.current) return;

      layersRef.current.forEach(layer => layer.remove());
      layersRef.current = [];

      let routeCoordinates: [number, number][] = [];

      if (routeGeometry && typeof routeGeometry === 'string') {
        try {
          routeCoordinates = decodePolyline(routeGeometry);
        } catch (err) {
          console.error('Failed to decode route geometry:', err);
          routeCoordinates = [
            [origin.latitude, origin.longitude],
            [destination.latitude, destination.longitude]
          ];
        }
      } else {
        routeCoordinates = [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude]
        ];
      }

      const routeLatLngs = routeCoordinates.map(coord => L.latLng(coord[0], coord[1]));

      const polyline = L.polyline(routeLatLngs, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1,
        lineJoin: 'round',
        lineCap: 'round'
      });
      polyline.addTo(mapInstanceRef.current!);
      layersRef.current.push(polyline);

      const originIcon = L.divIcon({
        html: `<div style="background-color: #10B981; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">A</div>`,
        className: 'map-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const destIcon = L.divIcon({
        html: `<div style="background-color: #EF4444; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">B</div>`,
        className: 'map-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const originMarker = L.marker([origin.latitude, origin.longitude], { icon: originIcon, zIndexOffset: 1000 });
      originMarker.addTo(mapInstanceRef.current!);
      layersRef.current.push(originMarker);

      const destMarker = L.marker([destination.latitude, destination.longitude], { icon: destIcon, zIndexOffset: 1000 });
      destMarker.addTo(mapInstanceRef.current!);
      layersRef.current.push(destMarker);

      const bounds = L.latLngBounds(routeLatLngs);
      mapInstanceRef.current!.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15
      });
    });

  }, [origin, destination, routeGeometry]);

  return (
    <div
      ref={mapContainerRef}
      className={className || 'w-full h-96'}
      style={{ minHeight: '400px' }}
    />
  );
}
