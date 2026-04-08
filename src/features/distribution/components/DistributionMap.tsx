import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import {
  GLASS,
  GLASS_ELEVATED,
  GLASS_HOVER,
  FACILITY_CENTER,
  AZ_BOUNDS,
  ZONE_HEX,
  ZONE_LABELS,
} from '../constants';

// ─── Dark style with brighter streets ──────────────────────────────────────

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OSM &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
      paint: {
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.85,
        'raster-contrast': 0.15,
        'raster-saturation': -0.3,
      },
    },
  ],
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface DistributionMapProps {
  expanded: boolean;
  orders: CalendarOrder[];
  selectedDayOrders: CalendarOrder[];
  onPinClick?: (orderId: string) => void;
  onClick?: () => void;
}

// ─── Route line helpers ────────────────────────────────────────────────────

interface RouteChain {
  zoneId: string;
  color: string;
  coords: [number, number][]; // [lng, lat]
}

function buildRouteChains(dayOrders: CalendarOrder[]): RouteChain[] {
  // Group orders by zone
  const zoneGroups = new Map<string, { lat: number; lon: number }[]>();
  for (const o of dayOrders) {
    if (!o.customer_lat || !o.customer_lon) continue;
    const zoneId = getRouteZoneId(o.customer_lat, o.customer_lon);
    if (!zoneGroups.has(zoneId)) zoneGroups.set(zoneId, []);
    zoneGroups.get(zoneId)!.push({ lat: o.customer_lat, lon: o.customer_lon });
  }

  const chains: RouteChain[] = [];
  for (const [zoneId, stops] of zoneGroups) {
    // Build chain: facility → stop1 → stop2 → ...
    // Sort stops by distance from facility (nearest first) for a reasonable route
    const sorted = [...stops].sort((a, b) => {
      const distA = Math.hypot(a.lat - FACILITY_CENTER[1], a.lon - FACILITY_CENTER[0]);
      const distB = Math.hypot(b.lat - FACILITY_CENTER[1], b.lon - FACILITY_CENTER[0]);
      return distA - distB;
    });

    const coords: [number, number][] = [FACILITY_CENTER];
    for (const stop of sorted) {
      coords.push([stop.lon, stop.lat]);
    }

    chains.push({
      zoneId,
      color: ZONE_HEX[zoneId] || '#A6A6A6',
      coords,
    });
  }

  return chains;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DistributionMap({
  expanded,
  orders,
  selectedDayOrders,
  onPinClick,
  onClick,
}: DistributionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const hasSelectedDay = selectedDayOrders.length > 0;

  // ─── Initialize map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: FACILITY_CENTER,
      zoom: 7,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Facility marker — diamond shape
    const facilityEl = document.createElement('div');
    facilityEl.style.cssText =
      'width:18px;height:18px;border-radius:3px;transform:rotate(45deg);' +
      'background:#E8E0D4;border:2px solid white;' +
      'box-shadow:0 0 16px rgba(232,224,212,0.5),0 2px 8px rgba(0,0,0,0.5);';
    new maplibregl.Marker({ element: facilityEl })
      .setLngLat(FACILITY_CENTER)
      .addTo(map);

    map.on('load', () => {
      setMapReady(true);
      map.resize();
    });

    map.on('error', (e) => {
      console.error('MapLibre error:', e.error);
    });

    mapRef.current = map;

    return () => {
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Update markers ────────────────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // Dedupe customers, keeping full order details for tooltips
    const CLOSED = new Set(['delivered', 'completed', 'cancelled']);
    interface CustomerPin {
      lat: number; lon: number; name: string; zoneId: string;
      orderIds: string[]; highlighted: boolean;
      activeOrders: { orderNumber: string; deliveryDate: string | null; status: string }[];
    }
    const customerMap = new Map<string, CustomerPin>();
    const highlightedIds = new Set(selectedDayOrders.map((o) => o.id));

    for (const o of orders) {
      if (!o.customer_lat || !o.customer_lon) continue;
      const key = o.customer_id;
      const existing = customerMap.get(key);
      const isActive = !CLOSED.has(o.status);
      if (existing) {
        existing.orderIds.push(o.id);
        if (highlightedIds.has(o.id)) existing.highlighted = true;
        if (isActive) {
          existing.activeOrders.push({
            orderNumber: o.order_number,
            deliveryDate: o.requested_delivery_date,
            status: o.status,
          });
        }
      } else {
        customerMap.set(key, {
          lat: o.customer_lat,
          lon: o.customer_lon,
          name: o.customer_name,
          zoneId: getRouteZoneId(o.customer_lat, o.customer_lon),
          orderIds: [o.id],
          highlighted: highlightedIds.has(o.id),
          activeOrders: isActive ? [{
            orderNumber: o.order_number,
            deliveryDate: o.requested_delivery_date,
            status: o.status,
          }] : [],
        });
      }
    }

    for (const [, c] of customerMap) {
      const isHighlighted = hasSelectedDay ? c.highlighted : true;
      const color = ZONE_HEX[c.zoneId] || '#A6A6A6';

      // Selected day pins: large, bright, glowing ring
      // Unselected pins (no day selected): medium, visible
      // Dimmed pins (day selected but not this pin): small, very faint
      const size = hasSelectedDay
        ? (isHighlighted ? 18 : 8)
        : 14;
      const opacity = hasSelectedDay
        ? (isHighlighted ? 1 : 0.12)
        : 0.85;
      const borderWidth = isHighlighted && hasSelectedDay ? 3 : 2;
      const glowSize = isHighlighted && hasSelectedDay ? 12 : 0;

      const el = document.createElement('div');
      el.style.cssText =
        `width:${size}px;height:${size}px;border-radius:50%;` +
        `background:${color};border:${borderWidth}px solid rgba(255,255,255,0.9);` +
        `opacity:${opacity};` +
        `box-shadow:0 0 ${glowSize}px ${color},0 0 ${glowSize * 2}px ${color}44,0 2px 6px rgba(0,0,0,0.5);` +
        'cursor:pointer;';

      el.addEventListener('mouseenter', () => {
        if (popupRef.current) popupRef.current.remove();

        // Build order rows for tooltip
        const orderRows = c.activeOrders.length > 0
          ? c.activeOrders.slice(0, 5).map((ao) => {
              const dateStr = ao.deliveryDate
                ? new Date(ao.deliveryDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'No date';
              return `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-top:1px solid rgba(255,255,255,0.06);">
                <span style="font-family:monospace;color:#E8E0D4;font-size:11px;">${ao.orderNumber}</span>
                <span style="color:#A6A6A6;font-size:11px;">${dateStr}</span>
              </div>`;
            }).join('')
          : '<div style="color:#666;font-size:11px;padding-top:3px;">No active orders</div>';

        const moreText = c.activeOrders.length > 5
          ? `<div style="color:#666;font-size:10px;padding-top:2px;">+${c.activeOrders.length - 5} more</div>`
          : '';

        const popup = new maplibregl.Popup({ offset: 14, closeButton: false, closeOnClick: false, maxWidth: '240px' })
          .setLngLat([c.lon, c.lat])
          .setHTML(
            `<div style="font-family:Montserrat,sans-serif;color:#fff;background:rgba(26,26,46,0.95);padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);min-width:160px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <strong style="font-size:13px;">${c.name}</strong>
              </div>
              <div style="margin-bottom:4px;">
                <span style="color:${color};font-size:11px;font-weight:600;">${ZONE_LABELS[c.zoneId] || c.zoneId}</span>
                ${c.activeOrders.length > 0 ? `<span style="color:#666;font-size:11px;"> · ${c.activeOrders.length} active</span>` : ''}
              </div>
              ${orderRows}${moreText}
            </div>`,
          )
          .addTo(map);
        popupRef.current = popup;
      });

      el.addEventListener('mouseleave', () => {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onPinClick && c.orderIds.length > 0) {
          onPinClick(c.orderIds[0]);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.lon, c.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [orders, selectedDayOrders, hasSelectedDay, onPinClick, mapReady]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // ─── Route lines ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clean up previous route layers/sources
    const existingLayers = map.getStyle()?.layers || [];
    for (const layer of existingLayers) {
      if (layer.id.startsWith('route-')) {
        map.removeLayer(layer.id);
      }
    }
    // Remove sources after layers
    const style = map.getStyle();
    if (style?.sources) {
      for (const sourceId of Object.keys(style.sources)) {
        if (sourceId.startsWith('route-')) {
          map.removeSource(sourceId);
        }
      }
    }

    // Only draw routes when a day is selected
    if (selectedDayOrders.length === 0) return;

    const chains = buildRouteChains(selectedDayOrders);

    for (const chain of chains) {
      const sourceId = `route-${chain.zoneId}`;
      const glowLayerId = `route-glow-${chain.zoneId}`;
      const lineLayerId = `route-line-${chain.zoneId}`;

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: chain.coords,
          },
          properties: {},
        }],
      };

      map.addSource(sourceId, { type: 'geojson', data: geojson });

      // Glow layer (wide, blurred)
      map.addLayer({
        id: glowLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': chain.color,
          'line-width': 8,
          'line-opacity': 0.15,
          'line-blur': 6,
        },
      });

      // Main line
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': chain.color,
          'line-width': 2.5,
          'line-opacity': 0.7,
          'line-dasharray': [4, 3],
        },
      });
    }
  }, [selectedDayOrders, mapReady]);

  // ─── Fly to selected day ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (selectedDayOrders.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(FACILITY_CENTER);
      selectedDayOrders.forEach((o) => {
        if (o.customer_lat && o.customer_lon) {
          bounds.extend([o.customer_lon, o.customer_lat]);
        }
      });
      map.fitBounds(bounds, { padding: 60, duration: 1200 });
    } else {
      map.fitBounds(AZ_BOUNDS, { padding: 40, duration: 800 });
    }
  }, [selectedDayOrders, mapReady]);

  // ─── Resize on expand toggle ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 150);
      setTimeout(() => map.resize(), 400);
    }
  }, [expanded]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div
      onClick={!expanded ? onClick : undefined}
      className={`relative overflow-hidden ${expanded ? GLASS_ELEVATED : `${GLASS} ${GLASS_HOVER} cursor-pointer`}`}
      style={{ height: expanded ? 'calc(100vh - 220px)' : '280px', minHeight: expanded ? '500px' : '280px' }}
    >
      {!expanded && (
        <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Route Map</span>
          <span className="text-[10px] text-white/30">Click to expand</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0 rounded-2xl"
      />

      {!expanded && (
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            {Object.entries(ZONE_HEX).slice(0, 4).map(([id, color]) => (
              <div key={id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[9px] text-white/40">{ZONE_LABELS[id]}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-white/30">
            {orders.filter((o) => o.customer_lat).length} locations
          </span>
        </div>
      )}
    </div>
  );
}
