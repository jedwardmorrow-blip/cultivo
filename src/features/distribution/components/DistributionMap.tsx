import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import {
  GLASS,
  GLASS_ELEVATED,
  GLASS_HOVER,
  DARK_MAP_STYLE,
  FACILITY_CENTER,
  AZ_BOUNDS,
  ZONE_HEX,
  ZONE_LABELS,
} from '../constants';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DistributionMapProps {
  expanded: boolean;
  orders: CalendarOrder[];
  selectedDayOrders: CalendarOrder[];
  onPinClick?: (orderId: string) => void;
  onClick?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildCustomerFeatures(
  orders: CalendarOrder[],
  highlightedOrderIds: Set<string>,
): GeoJSON.FeatureCollection {
  // Dedupe by customer_id to avoid overlapping pins
  const customerMap = new Map<
    string,
    { lat: number; lon: number; name: string; zoneId: string; orderIds: string[]; highlighted: boolean }
  >();

  for (const o of orders) {
    if (!o.customer_lat || !o.customer_lon) continue;
    const key = o.customer_id;
    const existing = customerMap.get(key);
    if (existing) {
      existing.orderIds.push(o.id);
      if (highlightedOrderIds.has(o.id)) existing.highlighted = true;
    } else {
      customerMap.set(key, {
        lat: o.customer_lat,
        lon: o.customer_lon,
        name: o.customer_name,
        zoneId: getRouteZoneId(o.customer_lat, o.customer_lon),
        orderIds: [o.id],
        highlighted: highlightedOrderIds.has(o.id),
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: Array.from(customerMap.values()).map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
      properties: {
        name: c.name,
        zoneId: c.zoneId,
        zoneLabel: ZONE_LABELS[c.zoneId] || c.zoneId,
        color: ZONE_HEX[c.zoneId] || '#A6A6A6',
        orderIds: c.orderIds.join(','),
        highlighted: c.highlighted,
        orderCount: c.orderIds.length,
      },
    })),
  };
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

  const hasSelectedDay = selectedDayOrders.length > 0;
  const highlightedIds = new Set(selectedDayOrders.map((o) => o.id));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_MAP_STYLE,
      center: FACILITY_CENTER,
      zoom: 7,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Facility marker
    const facilityEl = document.createElement('div');
    facilityEl.style.cssText = `
      width: 20px; height: 20px; border-radius: 4px; transform: rotate(45deg);
      background: #E8E0D4; border: 2px solid white;
      box-shadow: 0 0 12px rgba(232,224,212,0.4), 0 2px 8px rgba(0,0,0,0.5);
    `;
    new maplibregl.Marker({ element: facilityEl })
      .setLngLat(FACILITY_CENTER)
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when orders or selection changes
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const features = buildCustomerFeatures(orders, highlightedIds);

    for (const feature of features.features) {
      const props = feature.properties;
      if (!props) continue;
      const coords = feature.geometry.coordinates as [number, number];

      const isHighlighted = hasSelectedDay ? props.highlighted : true;
      const size = isHighlighted && hasSelectedDay ? 14 : 10;

      const el = document.createElement('div');
      el.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${props.color}; border: 2px solid white;
        opacity: ${isHighlighted ? '1' : '0.2'};
        box-shadow: ${isHighlighted ? `0 0 8px ${props.color}66, 0 2px 6px rgba(0,0,0,0.4)` : 'none'};
        cursor: pointer; transition: all 0.3s ease;
      `;

      el.addEventListener('mouseenter', () => {
        const popup = new maplibregl.Popup({ offset: 12, closeButton: false, closeOnClick: false })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:Montserrat,sans-serif;font-size:12px;color:#fff;background:rgba(26,26,46,0.9);padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);">
              <strong>${props.name}</strong><br/>
              <span style="color:${props.color};font-size:11px;">${props.zoneLabel}</span>
              ${props.orderCount > 1 ? `<span style="color:#A6A6A6;font-size:11px;"> · ${props.orderCount} orders</span>` : ''}
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
        if (onPinClick && props.orderIds) {
          const firstOrderId = props.orderIds.split(',')[0];
          onPinClick(firstOrderId);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [orders, highlightedIds, hasSelectedDay, onPinClick]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Fly to selected day's stops
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

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
  }, [selectedDayOrders]);

  // Resize when expanded state changes
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setTimeout(() => map.resize(), 100);
    }
  }, [expanded]);

  const height = expanded ? '100%' : '280px';

  return (
    <div
      onClick={!expanded ? onClick : undefined}
      className={`relative overflow-hidden ${expanded ? GLASS_ELEVATED : `${GLASS} ${GLASS_HOVER} cursor-pointer`}`}
      style={{ minHeight: expanded ? '500px' : '280px' }}
    >
      {!expanded && (
        <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Route Map</span>
          <span className="text-[10px] text-white/30">Click to expand</span>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ width: '100%', height }}
        className="rounded-2xl"
      />

      {!expanded && (
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
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
