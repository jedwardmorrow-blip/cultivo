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

// ─── Dark style (inline to avoid external URL failures) ────────────────────

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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
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

    // Create map
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

    // Facility marker
    const facilityEl = document.createElement('div');
    facilityEl.style.cssText =
      'width:18px;height:18px;border-radius:3px;transform:rotate(45deg);' +
      'background:#E8E0D4;border:2px solid white;' +
      'box-shadow:0 0 12px rgba(232,224,212,0.4),0 2px 8px rgba(0,0,0,0.5);';
    new maplibregl.Marker({ element: facilityEl })
      .setLngLat(FACILITY_CENTER)
      .addTo(map);

    map.on('load', () => {
      setMapReady(true);
      // Ensure map fills its container after style loads
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

    // Dedupe customers
    const customerMap = new Map<
      string,
      { lat: number; lon: number; name: string; zoneId: string; orderIds: string[]; highlighted: boolean }
    >();
    const highlightedIds = new Set(selectedDayOrders.map((o) => o.id));

    for (const o of orders) {
      if (!o.customer_lat || !o.customer_lon) continue;
      const key = o.customer_id;
      const existing = customerMap.get(key);
      if (existing) {
        existing.orderIds.push(o.id);
        if (highlightedIds.has(o.id)) existing.highlighted = true;
      } else {
        customerMap.set(key, {
          lat: o.customer_lat,
          lon: o.customer_lon,
          name: o.customer_name,
          zoneId: getRouteZoneId(o.customer_lat, o.customer_lon),
          orderIds: [o.id],
          highlighted: highlightedIds.has(o.id),
        });
      }
    }

    for (const [, c] of customerMap) {
      const isHighlighted = hasSelectedDay ? c.highlighted : true;
      const size = isHighlighted && hasSelectedDay ? 16 : 12;
      const color = ZONE_HEX[c.zoneId] || '#A6A6A6';

      const el = document.createElement('div');
      el.style.cssText =
        `width:${size}px;height:${size}px;border-radius:50%;` +
        `background:${color};border:2px solid white;` +
        `opacity:${isHighlighted ? '1' : '0.15'};` +
        `box-shadow:${isHighlighted ? `0 0 8px ${color}66,0 2px 6px rgba(0,0,0,0.4)` : 'none'};` +
        'cursor:pointer;';

      el.addEventListener('mouseenter', () => {
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({ offset: 14, closeButton: false, closeOnClick: false })
          .setLngLat([c.lon, c.lat])
          .setHTML(
            `<div style="font-family:Montserrat,sans-serif;font-size:12px;color:#fff;background:rgba(26,26,46,0.95);padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);">
              <strong>${c.name}</strong><br/>
              <span style="color:${color};font-size:11px;">${ZONE_LABELS[c.zoneId] || c.zoneId}</span>
              ${c.orderIds.length > 1 ? `<span style="color:#A6A6A6;font-size:11px;"> · ${c.orderIds.length} orders</span>` : ''}
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
