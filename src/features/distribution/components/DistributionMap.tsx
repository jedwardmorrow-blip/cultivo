/**
 * DistributionMap — B Gapped media container with hairline interior
 * overlays. CartoDB dark raster tiles. Active route polyline in --accent
 * solid; inactive routes in --op-line dashed. Customer pins use the
 * --zone-* palette and are sized by total order amount. Facility marker
 * is a rotated diamond in --accent. No fills, no glass, no glow shadows.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getRouteZoneId } from '@/features/delivery/utils';
import { getOrCalculateRoute, type Coordinate } from '@/features/delivery/services/routing.service';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import {
  FACILITY_CENTER,
  AZ_BOUNDS,
  ZONE_HEX,
  ZONE_LABELS,
} from '../constants';

const ACCENT_HEX = '#E8E0D4';
const OP_LINE_RGBA = 'rgba(255,255,255,0.16)';

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
        'raster-brightness-min': 0.06,
        'raster-brightness-max': 0.7,
        'raster-contrast': 0.1,
        'raster-saturation': -0.5,
      },
    },
  ],
};

interface DistributionMapProps {
  expanded: boolean;
  orders: CalendarOrder[];
  selectedDayOrders: CalendarOrder[];
  onPinClick?: (orderId: string) => void;
  onClick?: () => void;
}

// ─── Polyline decoder ──────────────────────────────────────────────────────

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
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates;
}

// ─── Route chains ──────────────────────────────────────────────────────────

const FACILITY_ID = 'facility';
const FACILITY_COORDS: Coordinate = { latitude: FACILITY_CENTER[1], longitude: FACILITY_CENTER[0] };

interface RouteStop {
  customerId: string;
  lat: number;
  lon: number;
}
interface RouteChain {
  zoneId: string;
  straightLineCoords: [number, number][];
  stops: RouteStop[];
}

function buildRouteChains(dayOrders: CalendarOrder[]): RouteChain[] {
  const zoneGroups = new Map<string, RouteStop[]>();
  const seen = new Set<string>();
  for (const o of dayOrders) {
    if (!o.customer_lat || !o.customer_lon) continue;
    if (seen.has(o.customer_id)) continue;
    seen.add(o.customer_id);
    const zoneId = getRouteZoneId(o.customer_lat, o.customer_lon);
    if (!zoneGroups.has(zoneId)) zoneGroups.set(zoneId, []);
    zoneGroups.get(zoneId)!.push({ customerId: o.customer_id, lat: o.customer_lat, lon: o.customer_lon });
  }
  const chains: RouteChain[] = [];
  for (const [zoneId, stops] of zoneGroups) {
    const sorted = [...stops].sort((a, b) => {
      const distA = Math.hypot(a.lat - FACILITY_CENTER[1], a.lon - FACILITY_CENTER[0]);
      const distB = Math.hypot(b.lat - FACILITY_CENTER[1], b.lon - FACILITY_CENTER[0]);
      return distA - distB;
    });
    const straightLineCoords: [number, number][] = [FACILITY_CENTER];
    for (const stop of sorted) straightLineCoords.push([stop.lon, stop.lat]);
    chains.push({ zoneId, straightLineCoords, stops: sorted });
  }
  return chains;
}

async function fetchChainGeometry(stops: RouteStop[]): Promise<[number, number][] | null> {
  try {
    const allCoords: [number, number][] = [];
    const fullStops: { id: string; coords: Coordinate }[] = [
      { id: FACILITY_ID, coords: FACILITY_COORDS },
      ...stops.map((s) => ({ id: s.customerId, coords: { latitude: s.lat, longitude: s.lon } })),
    ];
    for (let i = 0; i < fullStops.length - 1; i++) {
      const origin = fullStops[i];
      const dest = fullStops[i + 1];
      const result = await getOrCalculateRoute(origin.id, dest.id, origin.coords, dest.coords);
      if (result.geometry) {
        const geomStr = typeof result.geometry === 'string' ? result.geometry : String(result.geometry);
        const decoded = decodePolyline(geomStr);
        for (const [lat, lng] of decoded) allCoords.push([lng, lat]);
      }
    }
    return allCoords.length > 2 ? allCoords : null;
  } catch (err) {
    console.warn('Failed to fetch chain geometry:', err);
    return null;
  }
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

  // ─── Pin sizing helper: customer's total amount across all orders → radius
  const customerAmounts = useRef<Map<string, number>>(new Map());
  customerAmounts.current = (() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      m.set(o.customer_id, (m.get(o.customer_id) || 0) + o.total_amount);
    }
    return m;
  })();

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

    // Facility marker — rotated diamond, --accent
    const facilityEl = document.createElement('div');
    facilityEl.style.cssText =
      'width:18px;height:18px;transform:rotate(45deg);' +
      `background:${ACCENT_HEX};` +
      'box-shadow: inset 0 0 0 4px #0A0A0A;';
    new maplibregl.Marker({ element: facilityEl }).setLngLat(FACILITY_CENTER).addTo(map);

    map.on('load', () => {
      setMapReady(true);
      map.resize();
    });
    map.on('error', (e) => console.error('MapLibre error:', e.error));

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

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const CLOSED = new Set(['delivered', 'completed', 'cancelled']);
    interface CustomerPin {
      lat: number; lon: number; name: string; zoneId: string;
      orderIds: string[]; highlighted: boolean;
      activeOrders: { orderNumber: string; deliveryDate: string | null; status: string }[];
      totalAmount: number;
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
        existing.totalAmount += o.total_amount;
        if (highlightedIds.has(o.id)) existing.highlighted = true;
        if (isActive) {
          existing.activeOrders.push({ orderNumber: o.order_number, deliveryDate: o.requested_delivery_date, status: o.status });
        }
      } else {
        customerMap.set(key, {
          lat: o.customer_lat, lon: o.customer_lon, name: o.customer_name,
          zoneId: getRouteZoneId(o.customer_lat, o.customer_lon),
          orderIds: [o.id], highlighted: highlightedIds.has(o.id),
          activeOrders: isActive ? [{ orderNumber: o.order_number, deliveryDate: o.requested_delivery_date, status: o.status }] : [],
          totalAmount: o.total_amount,
        });
      }
    }

    // Compute amount range for sizing
    const amounts = Array.from(customerMap.values()).map((c) => c.totalAmount);
    const maxAmount = Math.max(1, ...amounts);

    for (const [, c] of customerMap) {
      const isHighlighted = hasSelectedDay ? c.highlighted : true;
      const color = ZONE_HEX[c.zoneId] || ZONE_HEX.other;

      // Size proportional to amount, 5–14px
      const baseSize = Math.max(5, Math.min(14, 5 + Math.round((c.totalAmount / maxAmount) * 9)));
      const size = hasSelectedDay
        ? (isHighlighted ? Math.max(10, baseSize) : Math.max(4, Math.round(baseSize * 0.6)))
        : baseSize;
      const opacity = hasSelectedDay ? (isHighlighted ? 1 : 0.4) : 0.85;

      const el = document.createElement('div');
      el.style.cssText =
        `width:${size}px;height:${size}px;border-radius:50%;` +
        `background:${color};` +
        `opacity:${opacity};` +
        (isHighlighted && hasSelectedDay
          ? `box-shadow: 0 0 0 1.5px ${ACCENT_HEX};`
          : '') +
        'cursor:pointer;';

      el.addEventListener('mouseenter', () => {
        if (popupRef.current) popupRef.current.remove();
        const orderRows = c.activeOrders.length > 0
          ? c.activeOrders.slice(0, 5).map((ao) => {
              const dateStr = ao.deliveryDate
                ? new Date(ao.deliveryDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'No date';
              return `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-top:1px solid rgba(255,255,255,0.06);">
                <span style="font-family:'IBM Plex Mono',monospace;color:${ACCENT_HEX};font-size:11px;">${ao.orderNumber}</span>
                <span style="color:rgba(245,244,241,0.40);font-size:11px;font-family:'IBM Plex Mono',monospace;">${dateStr}</span>
              </div>`;
            }).join('')
          : '<div style="color:rgba(245,244,241,0.40);font-size:11px;padding-top:3px;font-family:\'IBM Plex Mono\',monospace;">No active orders</div>';

        const moreText = c.activeOrders.length > 5
          ? `<div style="color:rgba(245,244,241,0.40);font-size:10px;padding-top:2px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.04em;">and ${c.activeOrders.length - 5} more</div>`
          : '';

        const popup = new maplibregl.Popup({ offset: 14, closeButton: false, closeOnClick: false, maxWidth: '240px' })
          .setLngLat([c.lon, c.lat])
          .setHTML(
            `<div style="font-family:'IBM Plex Sans',sans-serif;color:#F5F4F1;background:#0A0A0A;padding:10px 12px;border:1px solid rgba(255,255,255,0.12);border-radius:5px;min-width:180px;box-shadow:inset 2px 0 0 ${ACCENT_HEX};">
              <div style="font-size:12px;font-weight:500;margin-bottom:4px;">${c.name}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(245,244,241,0.40);text-transform:uppercase;letter-spacing:0.04em;">
                ${ZONE_LABELS[c.zoneId] || c.zoneId} · ${c.activeOrders.length} active
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
        if (onPinClick && c.orderIds.length > 0) onPinClick(c.orderIds[0]);
      });

      const marker = new maplibregl.Marker({ element: el }).setLngLat([c.lon, c.lat]).addTo(map);
      markersRef.current.push(marker);
    }
  }, [orders, selectedDayOrders, hasSelectedDay, onPinClick, mapReady]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // ─── Route lines ────────────────────────────────────────────────────────
  const routeAbortRef = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const generation = ++routeAbortRef.current;

    function clearRoutes() {
      const layers = map.getStyle()?.layers || [];
      for (const layer of layers) {
        if (layer.id.startsWith('route-')) map.removeLayer(layer.id);
      }
      const style = map.getStyle();
      if (style?.sources) {
        for (const id of Object.keys(style.sources)) {
          if (id.startsWith('route-')) map.removeSource(id);
        }
      }
    }

    function drawChain(sourceId: string, coords: [number, number][], color: string, dashed: boolean) {
      const lineId = `${sourceId}-line`;
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }],
        },
      });

      const linePaint: maplibregl.LinePaint = {
        'line-color': color,
        'line-width': dashed ? 1 : 2,
        'line-opacity': dashed ? 0.6 : 0.9,
      };
      if (dashed) linePaint['line-dasharray'] = [3, 4];

      map.addLayer({ id: lineId, type: 'line', source: sourceId, paint: linePaint });
    }

    clearRoutes();
    if (selectedDayOrders.length === 0) return;

    const chains = buildRouteChains(selectedDayOrders);
    // Step 1: dashed straight-line --op-line preview
    for (const chain of chains) {
      drawChain(`route-${chain.zoneId}`, chain.straightLineCoords, OP_LINE_RGBA, true);
    }
    // Step 2: real road geometry → upgrade selected chain to --accent solid
    (async () => {
      for (const chain of chains) {
        if (routeAbortRef.current !== generation) return;
        const realCoords = await fetchChainGeometry(chain.stops);
        if (routeAbortRef.current !== generation) return;
        if (!mapRef.current) return;
        if (realCoords) {
          drawChain(`route-${chain.zoneId}`, realCoords, ACCENT_HEX, false);
        }
      }
    })();
  }, [selectedDayOrders, mapReady]);

  // ─── Fly to selected day ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (selectedDayOrders.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(FACILITY_CENTER);
      selectedDayOrders.forEach((o) => {
        if (o.customer_lat && o.customer_lon) bounds.extend([o.customer_lon, o.customer_lat]);
      });
      map.fitBounds(bounds, { padding: 60, duration: 1200 });
    } else {
      map.fitBounds(AZ_BOUNDS, { padding: 40, duration: 800 });
    }
  }, [selectedDayOrders, mapReady]);

  // ─── Resize on expand toggle ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 150);
      setTimeout(() => map.resize(), 400);
    }
  }, [expanded]);

  // ─── Render — B Gapped media container ───────────────────────────────────
  return (
    <div
      onClick={!expanded ? onClick : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
        cursor: !expanded ? 'pointer' : 'default',
        height: expanded ? 'calc(100vh - 240px)' : 280,
        minHeight: expanded ? 460 : 280,
      }}
    >
      {/* Map head overlay (top) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 14px',
          zIndex: 2,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink)' }}
        >
          Routes · {hasSelectedDay ? `${selectedDayOrders.length} stops` : 'all locations'}
        </span>
        {!expanded && (
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--op-ink-3)' }}
          >
            click to expand
          </span>
        )}
      </div>

      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Map legend overlay (bottom-left) */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            padding: '10px 12px',
            background: 'var(--op-surface)',
            border: '1px solid var(--op-line)',
            borderRadius: 'var(--r-sm)',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {Object.entries(ZONE_HEX).slice(0, 5).map(([id, color]) => (
            <div
              key={id}
              className="flex items-center font-sans"
              style={{ gap: 8, fontSize: 11, color: 'var(--op-ink-2)' }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                }}
              />
              <span>{ZONE_LABELS[id]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map status (bottom-right) */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            padding: '8px 10px',
            background: 'var(--op-surface)',
            border: '1px solid var(--op-line)',
            borderRadius: 'var(--r-sm)',
            zIndex: 3,
            fontSize: 10,
            color: 'var(--op-ink-3)',
            letterSpacing: '0.06em',
          }}
          className="font-mono"
        >
          CartoDB dark · {orders.filter((o) => o.customer_lat).length} locations
        </div>
      )}
    </div>
  );
}
