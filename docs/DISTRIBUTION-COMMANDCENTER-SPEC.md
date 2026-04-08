# Distribution CommandCenter — Specification (Step 2)

**Status:** PENDING APPROVAL
**Created:** 2026-04-07
**Primary User:** Laura (Distribution lead)
**Secondary User:** Leo (order entry — unchanged, uses existing UnifiedOrders)
**North Star:** Cultivation CommandCenter (src/features/cultivation/components/CommandCenter.tsx)

---

## 1. Overview

The Distribution CommandCenter replaces the fragmented Distribution section (6 nav items, 3 tabs, multiple disconnected screens) with a single unified screen centered on two always-visible elements: a **Calendar** and an interactive **Map** of Arizona.

Laura opens one screen and sees her whole world: what's going out, when, where, whether it's ready, and who's driving. No tabs, no mode switches, no hunting through sub-pages.

### What It Replaces

| Old Screen | Disposition |
|-----------|------------|
| SalesHub (`/sales-hub`) | **Removed** — no value for Distribution user |
| DistributionCalendar (`/delivery`) | **Rebuilt** — calendar logic reused, visual upgrade + map integration |
| DocumentDispatchQueue (tab inside calendar) | **Absorbed** — doc status pills live on order cards, filter via KPI tap |
| OrderFulfillmentView (`/production-dispatch`) | **Removed from Distribution nav** — stays in Production |
| DispatchExecutionQueue (`/dispatch-queue`) | **Removed from Distribution nav** — stays in Production |
| TripPlan screens (generator, list, signoff, print) | **Preserved** — accessible from Day Detail Strip |

### What Stays Untouched

- **UnifiedOrders** (`/orders`) — Leo's order entry screen. Unchanged.
- **EODSummary** (`/eod-summary`) — End-of-day summary. Unchanged.
- **routing.service.ts** — Route calculation, caching, multi-stop optimization.
- **tripPlan.service.ts / tripPlanPDF.service.ts** — Manifest generation.
- **All trip plan UI components** — TripPlanListView, TripPlanGeneratorModal, TripPlanCompleteForm, TripPlanSignoffModal, TripPlanPrintView.
- **LeafletRouteMap.tsx** — Stays for existing trip plan detail views.
- **QuickDispatchModal** — Reused as-is, triggered from CommandCenter.
- **delivery.service.ts, dispatch.service.ts** — Data services unchanged.

---

## 2. Navigation Changes

### sectionNavigation.ts

```
Before (6 items):
  HUB | Orders | Delivery Calendar | EOD Summary | Dispatch | Execution Queue

After (3 items):
  Command Center | Orders | EOD Summary
```

```typescript
{
  id: 'sales',
  label: 'Distribution',
  icon: Truck,
  defaultView: 'distribution-command-center',
  items: [
    { id: 'distribution-command-center', label: 'Command Center', icon: LayoutDashboard, group: 'primary' },
    { id: 'orders', label: 'Orders', icon: Package, group: 'primary' },
    { id: 'eod-summary', label: 'EOD Summary', icon: FileText, group: 'primary' },
  ],
}
```

### App.tsx Routes

```typescript
// New
<Route path="/distribution-command-center" element={<DistributionCommandCenter />} />

// Keep
<Route path="/orders" element={<OrdersContainer ... />} />
<Route path="/eod-summary" element={<EODSummary />} />

// Keep (accessed from within CommandCenter, not from nav)
<Route path="/delivery" element={<DistributionCalendar ... />} />  // legacy fallback

// Remove from Distribution context (stay under Production)
// /production-dispatch → already in Production CommandCenter
// /dispatch-queue → already in Production CommandCenter
```

---

## 3. Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                      KPI STRIP (5 tiles)                        │
│  Shipping Today · Docs Pending · Unscheduled · Revenue · Routes │
├─────────────────────────────────┬───────────────────────────────┤
│                                 │                               │
│   PRIMARY PANEL (3/5)           │   SECONDARY PANEL (2/5)       │
│                                 │                               │
│   Default: Calendar             │   Default: Stacked cards      │
│   — OR —                        │     • Map (mini)              │
│   Expanded: Map                 │     • Unscheduled Orders      │
│   — OR —                        │     • Route Summary           │
│   Expanded: Bento card          │   — OR —                      │
│                                 │   Compressed versions when    │
│                                 │   a card is expanded to main  │
│                                 │                               │
├─────────────────────────────────┴───────────────────────────────┤
│                    DAY DETAIL STRIP                              │
│   (appears when a day is selected on the calendar)              │
│   Order readiness cards · Doc status · Driver · Route actions   │
└─────────────────────────────────────────────────────────────────┘
```

### Grid Implementation

```typescript
// Matches Cultivation/Production CommandCenter pattern
<LayoutGroup>
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
    {/* Primary Panel */}
    <div className="lg:col-span-3" style={{ minHeight: '500px' }}>
      <AnimatePresence mode="wait" initial={false}>
        {/* Calendar (default) | Map (expanded) | Bento card (expanded) */}
      </AnimatePresence>
    </div>

    {/* Secondary Panel */}
    <div className="lg:col-span-2 space-y-3">
      {/* Stacked compact cards */}
    </div>
  </div>
</LayoutGroup>
```

---

## 4. KPI Strip

Five tiles following the ProductionKpiStrip pattern. Glass cards, icon with accent glow, stagger-in animation.

| Tile | Value | Icon | Accent | Behavior |
|------|-------|------|--------|----------|
| Shipping Today | Count of orders with delivery date = today | `Truck` | `#10B981` (emerald) | Pulse dot if > 0. Click → selects today on calendar. |
| Docs Pending | Count of orders with any unsent doc | `FileText` | `#F59E0B` (amber) when > 0, default when 0 | **Click → toggles doc filter mode.** Shows ALL orders with unsent/overdue docs in the Day Detail Strip, regardless of date. Click again to clear filter. Red accent `#EF4444` if any overdue. |
| Unscheduled | Count of orders with no delivery date | `CalendarOff` | `#F59E0B` (amber) when > 0 | Click → expands Unscheduled Orders card to main panel. |
| Revenue (Month) | Total revenue of scheduled orders this month | `DollarSign` | `#E8E0D4` (brand accent) | Display only. |
| Routes Today | Distinct route zones for today's deliveries | `MapPin` | Zone-colored dots | Click → selects today on calendar + expands map. |

### Doc Filter Mode (KPI Tap Interaction)

When "Docs Pending" is tapped:
1. KPI tile gets active state (stronger border, glow)
2. Day Detail Strip changes header to "Documents Needing Attention"
3. Shows ALL orders with unsent/overdue docs, sorted by urgency (overdue first)
4. Each card shows full doc pills + send actions (reuse DocPill + SendButton from DocumentDispatchQueue)
5. Calendar dims slightly to indicate filter is active
6. Tap the KPI tile again OR click any day on calendar to clear filter and return to normal

---

## 5. Calendar Panel (Default Primary)

The month calendar is the default primary panel (3/5). Carries over existing DistributionCalendar logic with glass visual upgrade.

### Day Cell Design

```
┌─────────────────┐
│ 14      ▲       │  ← date + readiness indicator
│                 │
│ ● ● ●  3 routes │  ← zone dots + route count
│ $4,200          │  ← revenue (most decision-relevant number)
│ 3 orders        │  ← order count
│                 │
│ ● ~1h 30m       │  ← load dot + drive time
└─────────────────┘
```

**Glass styling:**
- Default: `${GLASS} ${GLASS_HOVER}` with zone-tinted left border
- Today: Amber border glow `border-[#F59E0B]/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]`
- Selected: Elevated glass `${GLASS_ELEVATED}` with accent border
- Drag over: Green glow `border-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.2)]`
- Suggested (during drag): Subtle green pulse `border-emerald-400/30 animate-pulse`

**Zone-tinted day cells:** When a day has orders from a single zone, the day cell gets a subtle left border in that zone's color. Mixed zones get white/neutral border.

### Drag-to-Schedule

Preserved from existing calendar. Unscheduled orders draggable from the Unscheduled Orders card onto calendar days. Smart suggestions highlight best dates (same zone clustering, preferred delivery day, capacity scoring).

### Month Navigation

Glass-styled header with chevron navigation. Month/year label centered. "Quick Dispatch" action button in header area (see Section 10).

---

## 6. Map Panel

### Technology: MapLibre GL JS

**Package:** `maplibre-gl` (npm)
**Tile source:** MapTiler Dark Matter style (free tier — 100K tiles/month, sufficient for internal tool)
**Alternative fallback:** CartoDB Dark Matter vector tiles (fully free, no key required)

### Map Component: `DistributionMap.tsx`

**Container:** Renders in a div, glass-styled border. Minimum height 300px (compact), 500px (expanded).

**Dark theme matching glass aesthetic:**
- Basemap: Dark with muted roads, subtle water features
- Background tone should complement `#1A1A2E` body color
- Labels in white/gray at low opacity

### Markers

**Facility marker (always visible):**
- Branded pin at 33.417, -111.994 (Cult Cannabis Co., Tempe)
- Distinct from customer markers — larger, different shape (hexagon or custom icon)
- Subtle glow effect

**Customer markers (zone-colored):**
- Circle markers, colored by route zone:
  - Local: `#A6A6A6` (silver)
  - East Valley: `#2DD4BF` (teal-400)
  - West Valley: `#FBBF24` (amber-400)
  - Tucson: `#38BDF8` (sky-400)
  - Northern AZ: `#FB7185` (rose-400)
- Size: 12px diameter default, 16px on hover
- Border: 2px white
- Shadow: `0 2px 8px rgba(0,0,0,0.4)`

**States:**
- **No day selected:** All 39 customer pins visible at default opacity
- **Day selected:** That day's customer pins at full opacity + enlarged (16px). All other pins dim to 20% opacity. Route polyline connects the day's stops.
- **Pin hover:** Tooltip with customer name, zone label, order count for selected day
- **Pin click:** Highlights corresponding order card in Day Detail Strip (scroll-to + pulse animation)

### Route Lines

- Color: White with 60% opacity, 3px weight
- When day selected: Route polyline drawn through that day's stops in optimized order
- Glow effect: `line-blur: 4` in MapLibre paint property for soft glow
- Animated dash pattern on active routes (optional enhancement)

### Zone Overlays (Subtle)

Semi-transparent polygon fills showing approximate zone boundaries. Very low opacity (5-8%) — just enough to see zone grouping without obscuring the map. Only visible at zoom levels where zones are distinguishable (zoom < 10).

### Map Interactions

- **Zoom:** Scroll wheel, pinch, +/- buttons
- **Pan:** Click-drag
- **Fly-to animation:** When a day is selected, map smoothly flies to fit that day's delivery pins with padding. Uses MapLibre `fitBounds()` with `{ padding: 60, duration: 1200, essential: true }`.
- **No day selected → overview:** Map fits all customer pins with generous padding.

### Compact vs Expanded

**Compact (in secondary panel, 2/5):**
- Height: 280px
- Zoom controls hidden (just visual overview)
- Click anywhere on the map card → triggers bento swap to expand

**Expanded (in primary panel, 3/5):**
- Height: fills available space (min 500px)
- Full zoom/pan controls
- Pin click interactions active
- Route detail visible

---

## 7. Bento Swap Mechanics

Three cards compete for the primary panel. Only one can be expanded at a time. Default is Calendar.

### Cards

| Card | Compact Location | Expanded Replaces |
|------|-----------------|-------------------|
| Calendar | Primary panel (3/5) — default | N/A (it IS the default) |
| Map | Secondary panel, top | Calendar in primary panel |
| Unscheduled Orders | Secondary panel, middle | Calendar in primary panel |
| Route Summary | Secondary panel, bottom | Calendar in primary panel |

### State Management

```typescript
type FocusedCard = 'map' | 'unscheduled' | 'route-summary' | null;

const [focusedCard, setFocusedCard] = useState<FocusedCard>(null);
const [selectedDate, setSelectedDate] = useState<string | null>(null);

// null = Calendar is primary (default)
// 'map' = Map is primary, Calendar compresses to mini-month in sidebar
// 'unscheduled' = Unscheduled panel is primary
// 'route-summary' = Route detail is primary
```

### Animation

Follows proven pattern from Cultivation/Production CommandCenters:

```typescript
// Spring config (matches existing)
const springTransition = { type: 'spring' as const, stiffness: 300, damping: 28 };

// Content swap
<AnimatePresence mode="wait" initial={false}>
  {focusedCard === 'map' ? (
    <motion.div
      key="panel-map"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <DistributionMap expanded />
    </motion.div>
  ) : focusedCard === 'unscheduled' ? (
    <motion.div key="panel-unscheduled" ...>
      <UnscheduledOrdersExpanded />
    </motion.div>
  ) : (
    <motion.div key="panel-calendar" ...>
      <DeliveryCalendarGrid />
    </motion.div>
  )}
</AnimatePresence>
```

### Sidebar Behavior When Card Is Expanded

When Map is expanded to primary:
- **Calendar** appears as a compact mini-month in the sidebar (smaller cells, no revenue/route detail — just date numbers + dot indicators for order days)
- **Unscheduled Orders** stays as compact card
- **Route Summary** stays as compact card (or expands to show detail for selected day)

When nothing is expanded (default):
- **Calendar** is primary (3/5)
- **Map** is compact in sidebar (overview, clickable to expand)
- **Unscheduled Orders** is compact in sidebar (count + preview)
- **Route Summary** is compact in sidebar (today's summary)

---

## 8. Secondary Panel Cards (Compact State)

### Map Card (Compact)

```
┌─────────────────────────────┐
│ 🗺  Route Map        [↗]   │  ← title + expand indicator
│                             │
│  [    Mini map render    ]  │  ← 280px height MapLibre
│  [    with all pins      ]  │
│                             │
│  5 zones · 39 customers     │  ← footer summary
└─────────────────────────────┘
```

Glass card. Click anywhere → bento swap to expanded map.

### Unscheduled Orders Card (Compact)

```
┌─────────────────────────────┐
│ 📋 Unscheduled    4 orders  │
│                             │
│  Story - Bell       $2,400  │  ← top 3 preview
│  Kind Meds          $1,200  │
│  Earth's Healing    $3,100  │
│                             │
│  +1 more · Drag to schedule │
└─────────────────────────────┘
```

Glass card. Shows top 3 unscheduled orders by value. Click → expand to full draggable list. Orders are draggable from both compact and expanded states onto calendar days.

### Route Summary Card (Compact)

```
┌─────────────────────────────┐
│ 🚛 Today's Routes          │
│                             │
│  ● East Valley  3 stops     │  ← zone-colored dots
│  ● Tucson       2 stops     │
│  ~3h 15m total · $8,200     │
│                             │
│  Driver: Leo ▾              │  ← driver assignment
└─────────────────────────────┘
```

Glass card. Shows zone breakdown for selected day (or today if no day selected). Driver dropdown at bottom. Click → expand for full route detail with stop ordering and per-leg drive times.

---

## 9. Day Detail Strip

Appears below the Calendar/Map bento when a day is selected (or when Doc Filter is active). Slides in with fade animation.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Tuesday, April 15 · 4 orders · ~2h 10m         [Generate Trip Plan] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ ● Story - Bell    ORD-0341 │ │ ● Kind Meds       ORD-0344 ││
│  │   West Valley · Glendale   │ │   East Valley · Mesa        ││
│  │   ✓ 5/5   ✓ Docs  ✓ Labels│ │   3/5   ⚠ Invoice  ○ Labels ││
│  │   $2,450 · 12 items       │ │   $1,800 · 8 items          ││
│  │              [Ready ✓]     │ │   [Send Invoice] [Expand ▾] ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ ● Earth's Healing ORD-0347 │ │ ● D2 Downtown     ORD-0349 ││
│  │   Tucson                   │ │   Tucson                    ││
│  │   ✓ 4/4   ✓ Docs  ✓ Labels│ │   ✓ 3/3   ○ COA    ✓ Labels ││
│  │   $3,100 · 6 items        │ │   $1,450 · 4 items          ││
│  │              [Ready ✓]     │ │         [Send COA] [Expand ▾]││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                 │
│  Driver: ____________▾  │  4 stops · ~2h 10m  │  $8,800 total  │
│  [Optimize Route]       │  [Generate Trip Plan]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Order Readiness Card

Each order is a glass card with zone-colored left border accent.

**Always visible on card:**
- Customer name + order number
- Zone badge (colored dot + zone label)
- City
- **Readiness indicators** (three slots):
  - **Allocation:** `✓ 5/5 allocated` (green) | `3/5 allocated` (amber) | `0/5 allocated` (red)
  - **Documents:** `✓ Docs sent` (green) | `⚠ Invoice due` (amber with specific doc) | `✗ Docs overdue` (red)
  - **Labels:** `✓ Labels` (green) | `○ Labels` (gray/pending)
- Revenue + item count
- **Primary action button:** Context-dependent — `[Ready ✓]` if all green, `[Send Invoice]` if doc is blocking, `[Assign Packages]` if allocation is blocking

**Tap to expand (progressive disclosure):**
- Per-item breakdown: strain, qty ordered, qty allocated, source batch, status
- Full doc pill row (Invoice | COA | Manifest) with individual send buttons
- Notes field
- Link to full order detail (opens OrderDetailPanel drawer from UnifiedOrders)

### Readiness Indicators — Data Sources

| Indicator | Source | Green | Amber | Red |
|-----------|--------|-------|-------|-----|
| Allocation | `order_items` allocated qty vs ordered qty | All items allocated | Some allocated | None allocated |
| Documents | `dispatch.service.ts` → `computeDocStatus()` | All 3 sent | Some unsent, none overdue | Any overdue |
| Labels | `order_items.label_printed` (or similar flag) | All printed | — | None printed |

### Day Summary Footer

- **Driver dropdown:** Select from staff list (`useActiveStaff()` hook). Persisted to `delivery_driver_assignments` table.
- **Route stats:** Total stops, estimated drive time (from cached routes or calculated via `calculateMultiStopRoute`), total revenue.
- **[Optimize Route]:** Calls `calculateMultiStopRoute` to reorder stops for shortest drive time. Updates stop order visually on map.
- **[Generate Trip Plan]:** Opens existing `TripPlanGeneratorModal` pre-populated with this day's orders + optimized stop order.

---

## 10. Quick Dispatch (Stock Build)

**"Quick Dispatch" button** in the calendar header area (right side, next to month navigation). Glass-styled pill button with `Zap` icon.

```
[⚡ Quick Dispatch]
```

Opens the existing `QuickDispatchModal` from `src/features/delivery/components/QuickDispatchModal.tsx`. No modifications to the modal — it already handles:
- Strain → Batch → Package selection
- One-click "Send to Buck/Trim/Pack" per package
- Creates `production_dispatch_items` with `order_item_id = null` (stock build)
- COA, THC%, Grade badges per batch

Items dispatched appear in the **Production CommandCenter's** ticket rail as queued cards.

---

## 11. Driver Assignment

### Database Schema

New table: `delivery_driver_assignments`

```sql
CREATE TABLE delivery_driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff(id),
  zone_id TEXT,                    -- optional: specific zone assignment
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(delivery_date, staff_id)  -- one assignment per driver per day
);

CREATE INDEX idx_driver_assignments_date ON delivery_driver_assignments(delivery_date);
```

### UI

- **Route Summary card:** Driver dropdown populated from `useActiveStaff()`.
- **Day Detail Strip footer:** Same driver dropdown.
- Selecting a driver saves to `delivery_driver_assignments` immediately (optimistic update).
- Driver name shows on calendar day cells as a subtle label when assigned.

---

## 12. MapLibre Implementation Details

### Installation

```bash
npm install maplibre-gl
```

Add to `index.css`:
```css
@import 'maplibre-gl/dist/maplibre-gl.css';
```

### Component Structure

```
src/features/distribution/components/
├── DistributionCommandCenter.tsx    -- Route-level orchestrator
├── DistributionKpiStrip.tsx         -- 5 KPI tiles
├── DeliveryCalendarGrid.tsx         -- Month calendar (glass upgrade)
├── DeliveryCalendarMini.tsx         -- Compressed mini-month for sidebar
├── DistributionMap.tsx              -- MapLibre map component
├── DayDetailStrip.tsx               -- Order readiness cards for selected day
├── OrderReadinessCard.tsx           -- Individual order card with checklist
├── MapCustomerMarker.tsx            -- Zone-colored marker component
├── RouteOverlay.tsx                 -- Route polyline rendering
├── UnscheduledOrdersPanel.tsx       -- Compact + expanded
├── RouteSummaryPanel.tsx            -- Compact + expanded + driver assignment
├── constants.ts                     -- Glass tokens, zone colors, animation configs
└── index.ts                         -- Export DistributionCommandCenter
```

### Map Initialization

```typescript
import maplibregl from 'maplibre-gl';

// Dark style — CartoDB Dark Matter (no API key required)
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Facility coordinates
const FACILITY_CENTER: [number, number] = [-111.994514, 33.417454];

// Arizona bounds for initial view
const AZ_BOUNDS: [[number, number], [number, number]] = [
  [-114.82, 31.33],  // SW
  [-109.04, 36.00],  // NE
];

function initMap(container: HTMLDivElement): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: DARK_STYLE,
    center: FACILITY_CENTER,
    zoom: 7,
    minZoom: 5,
    maxZoom: 16,
    attributionControl: false,
  });
}
```

### Marker Implementation

Using MapLibre's Marker API with custom HTML elements for zone-colored styling:

```typescript
function createCustomerMarker(
  customer: { lat: number; lon: number; name: string; zone: RouteZone },
  options: { dimmed?: boolean; enlarged?: boolean }
): maplibregl.Marker {
  const el = document.createElement('div');
  el.className = 'distribution-marker';
  el.style.cssText = `
    width: ${options.enlarged ? '16px' : '12px'};
    height: ${options.enlarged ? '16px' : '12px'};
    border-radius: 50%;
    background: ${customer.zone.hex};
    border: 2px solid white;
    opacity: ${options.dimmed ? '0.2' : '1'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    cursor: pointer;
    transition: all 0.3s ease;
  `;

  return new maplibregl.Marker({ element: el })
    .setLngLat([customer.lon, customer.lat])
    .setPopup(new maplibregl.Popup({ offset: 12 }).setText(customer.name));
}
```

### Route Line Rendering

Using MapLibre's GeoJSON source + line layer:

```typescript
// Add route source
map.addSource('day-route', {
  type: 'geojson',
  data: routeGeoJSON,
});

// Route line with glow
map.addLayer({
  id: 'day-route-glow',
  type: 'line',
  source: 'day-route',
  paint: {
    'line-color': '#ffffff',
    'line-width': 6,
    'line-opacity': 0.15,
    'line-blur': 4,
  },
});

map.addLayer({
  id: 'day-route-line',
  type: 'line',
  source: 'day-route',
  paint: {
    'line-color': '#ffffff',
    'line-width': 2.5,
    'line-opacity': 0.6,
  },
});
```

### Fly-To Animation (Day Selection)

```typescript
function flyToDay(map: maplibregl.Map, stops: { lat: number; lon: number }[]) {
  if (stops.length === 0) {
    // No stops → fit all customers
    map.fitBounds(AZ_BOUNDS, { padding: 60, duration: 1000 });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  stops.forEach(s => bounds.extend([s.lon, s.lat]));

  // Always include facility
  bounds.extend(FACILITY_CENTER);

  map.fitBounds(bounds, {
    padding: 60,
    duration: 1200,
    essential: true,
  });
}
```

---

## 13. Data Hooks

### Existing (reuse as-is)

| Hook | Source | Used For |
|------|--------|----------|
| `getEnrichedCalendarOrders()` | delivery.service.ts | Calendar order data |
| `getDispatchQueue()` | dispatch.service.ts | Doc status data |
| `computeDocStatus()` | dispatch.service.ts | Per-doc status pills |
| `useActiveStaff()` | shared hook | Driver assignment dropdown |
| `useProductionDispatch()` | delivery hook | Quick dispatch stats (optional) |
| `getOrCalculateRoute()` | routing.service.ts | Route calculation |
| `calculateMultiStopRoute()` | routing.service.ts | Route optimization |
| `getRouteZone()` / `getRouteZoneId()` | routeZones.ts | Zone classification |

### New

| Hook | Purpose |
|------|---------|
| `useDistributionData()` | Combines calendar orders + doc status + customer geocoding into unified state. Subscribes to real-time updates on `orders` table. |
| `useDriverAssignments()` | CRUD for `delivery_driver_assignments`. Fetch by date range, create/update assignment. |
| `useOrderReadiness()` | Per-order readiness calculation: allocation ratio, doc status, label status. Derived from order items + dispatch queue data. |

---

## 14. Interaction Summary

| User Action | Result |
|-------------|--------|
| **Opens Distribution** | Sees KPI strip + Calendar (3/5) + sidebar cards (Map, Unscheduled, Route Summary) |
| **Clicks a day on calendar** | Day highlights. Map flies to that day's stops with route line. Day Detail Strip slides in below with order readiness cards. |
| **Clicks a different day** | Calendar selection moves. Map animates to new stops. Day Detail Strip updates. |
| **Clicks same day again** | Day deselects. Map returns to overview. Day Detail Strip hides. |
| **Clicks Map card in sidebar** | Bento swap — Map becomes primary (3/5), Calendar compresses to mini-month in sidebar. |
| **Clicks Map card again (or Calendar mini)** | Bento swap back — Calendar returns to primary. |
| **Clicks pin on expanded map** | Corresponding order card in Day Detail Strip highlights + scrolls into view. |
| **Taps "Docs Pending" KPI** | Doc filter activates. Day Detail Strip shows ALL orders with unsent/overdue docs. Calendar dims. |
| **Taps "Docs Pending" KPI again** | Doc filter clears. Returns to day-based view. |
| **Taps "Shipping Today" KPI** | Selects today on calendar (same as clicking today's cell). |
| **Taps "Unscheduled" KPI** | Expands Unscheduled Orders card to primary panel. |
| **Drags unscheduled order to calendar day** | Order gets delivery date set. Calendar updates. Map updates if day was selected. Smart suggestions highlight during drag. |
| **Clicks [Send Invoice] on order card** | Sends doc via existing `sendDocument()`. Card updates pill to "Sent". |
| **Clicks [Optimize Route] in Day Detail footer** | Calls `calculateMultiStopRoute()`. Reorders stops. Map updates route line. |
| **Clicks [Generate Trip Plan]** | Opens TripPlanGeneratorModal with day's orders + optimized stop order. |
| **Selects driver from dropdown** | Saves to `delivery_driver_assignments`. Shows on Route Summary card + calendar day cell. |
| **Clicks [⚡ Quick Dispatch]** | Opens QuickDispatchModal. Stock build items go to Production queue. |
| **Expands an order readiness card** | Shows per-item allocation detail, full doc pills with send buttons, link to full order. |

---

## 15. Visual Design Tokens

Reuse from existing CommandCenter constants:

```typescript
// Glass surfaces
const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_ELEVATED = 'rounded-2xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)]';
const GLASS_HOVER = 'hover:bg-white/[0.10] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';

// Animation
const springTransition = { type: 'spring' as const, stiffness: 300, damping: 28 };
const fadeInVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const staggerItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } };

// Zone colors (from routeZones.ts, mapped to hex for MapLibre)
const ZONE_HEX = {
  local: '#A6A6A6',
  east_valley: '#2DD4BF',
  west_valley: '#FBBF24',
  tucson: '#38BDF8',
  northern_az: '#FB7185',
};
```

---

## 16. File Structure

```
src/features/distribution/
├── components/
│   ├── DistributionCommandCenter.tsx
│   ├── DistributionKpiStrip.tsx
│   ├── DeliveryCalendarGrid.tsx
│   ├── DeliveryCalendarMini.tsx
│   ├── DistributionMap.tsx
│   ├── DayDetailStrip.tsx
│   ├── OrderReadinessCard.tsx
│   ├── UnscheduledPanel.tsx
│   ├── RouteSummaryPanel.tsx
│   └── index.ts
├── hooks/
│   ├── useDistributionData.ts
│   ├── useDriverAssignments.ts
│   └── useOrderReadiness.ts
├── constants.ts
└── index.ts
```

**Note:** New feature directory `src/features/distribution/` — not modifying `src/features/delivery/` which contains the existing services, hooks, and utility code that we reuse.

---

## 17. Build Sequence

1. **Constants + types** — Glass tokens, zone hex map, animation configs, types
2. **DistributionMap** — MapLibre component with markers, route lines, fly-to
3. **DeliveryCalendarGrid** — Glass-upgraded calendar (port logic from DistributionCalendar)
4. **DeliveryCalendarMini** — Compressed mini-month for sidebar
5. **DistributionKpiStrip** — 5 KPI tiles with tap behavior
6. **OrderReadinessCard** — Per-order readiness card with doc pills
7. **DayDetailStrip** — Grid of readiness cards + footer with driver + actions
8. **UnscheduledPanel** — Compact + expanded with drag support
9. **RouteSummaryPanel** — Compact + expanded with driver assignment
10. **useDistributionData / useDriverAssignments / useOrderReadiness** — New hooks
11. **DistributionCommandCenter** — Orchestrator wiring bento swap + all panels
12. **Driver assignment migration** — `delivery_driver_assignments` table
13. **Route + nav updates** — App.tsx route, sectionNavigation.ts cleanup
14. **Integration testing** — Quick Dispatch, Trip Plan generation, drag-to-schedule

---

## 18. What Is NOT In V1

- MapLibre 3D terrain / perspective tilt
- Animated dash pattern on route lines
- Zone polygon overlays (subtle enhancement, not critical)
- Drag-to-reorder stops on map
- Real-time driver GPS tracking
- Label printing from readiness cards (requires label service wiring)
- Multi-driver assignment per day (V1 = one driver per day)
- Calendar week view (month only in V1)
