# Sales Dashboard → React/Tailwind Integration

## What This Is

`cult-ops-sales-dashboard.html` is a **standalone prototype** of the Sales Inventory Dashboard. It's a single HTML file using React 18 + Babel + Tailwind CDN with hardcoded mock data.

**Your job:** Extract the UI components and integrate them into the existing cult-ops React/Vite/Tailwind app, replacing mock data with live Supabase queries.

---

## Step 1: Tailwind Config

Add these tokens to the existing `tailwind.config.js` under `theme.extend.colors`:

```js
cult: {
  // merge with existing cult-* tokens — add only what's missing:
  bg: '#0a0a0a',
  card: '#0e0e0e',
  card2: '#111111',
  surface: '#141414',
  border: '#1e1e1e',
  border2: '#1c1c1c',
  border3: '#161616',
  muted: '#2e2e2e',
  subtle: '#1a1a1a',
}
```

Also add these font families if missing:

```js
fontFamily: {
  mont: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
  inter: ['Inter', 'Montserrat', 'system-ui', 'sans-serif'],
}
```

And these animations:

```js
animation: {
  'fade-in': 'fadeIn 0.3s ease forwards',
  'slide-in': 'slideIn 0.3s ease forwards',
  'slide-out': 'slideOut 0.2s ease forwards',
  'expand-in': 'expandIn 0.25s ease forwards',
},
keyframes: {
  fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
  slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
  slideOut: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(100%)' } },
  expandIn: { from: { opacity: '0', maxHeight: '0' }, to: { opacity: '1', maxHeight: '500px' } },
},
```

---

## Step 2: Component Structure

Extract the following components from the HTML into `src/features/sales/components/`:

| Component in HTML | Target File | Description |
|---|---|---|
| `SalesDashboard` | `SalesDashboard.tsx` | Main container — holds all sections, filter state, tab state |
| `HeroCards` | `HeroCards.tsx` | 4 summary stat cards (sellable, pipeline, demand, health) |
| `InventoryBreakdown` | `InventoryBreakdown.tsx` | Stacked bar + donut breakdown of stage totals |
| `PipelineOverview` | `PipelineOverview.tsx` | Horizontal pipeline bars by stage |
| `HealthSummary` | `HealthSummary.tsx` | Supply health distribution (critical/low/warning/healthy) |
| `FilterBar` | `FilterBar.tsx` | Search + grade/health filter dropdowns |
| `StrainTable` | `StrainTable.tsx` | Main data table with expandable rows |
| `ExpandedStrainDetail` | `ExpandedStrainDetail.tsx` | Batch-level detail inside expanded row |
| `MenuBuilder` | `MenuBuilder.tsx` | Slide-out order builder panel |

---

## Step 3: Replace Mock Data with Supabase

The HTML has two hardcoded constants: `DATA` and `BATCH_DATA`. Replace them with live queries.

### Primary query — `v_batch_stage_balances` view:

```ts
const { data: rows } = await supabase
  .from('v_batch_stage_balances')
  .select('batch_id, batch_number, strain, stage, weight_grams, unit_count, available_weight_grams, item_count')
  .not('stage', 'is', null)
  .order('strain').order('batch_number').order('sort_order');
```

### Stage mapping (DB → UI):

| DB stage | UI field | Notes |
|---|---|---|
| `binned` | `stages.binned` | Raw weight |
| `bucked` | `stages.bucked` | Bucked weight |
| `bulk` | `stages.trimmed` | **DB "bulk" = UI "trimmed"** |
| `smalls` | part of trimmed | Sellable smalls |
| `trim` | `stages.byproduct` | Trim/byproduct |
| `packaged` | `stages.packaged` | Use `unit_count` |

### Batch metadata — `batch_registry` table:

```ts
const { data: batches } = await supabase
  .from('batch_registry')
  .select('id, batch_number, strain, harvest_date, lifecycle_state');
```

### Demand data — `order_pipeline` view:

```ts
const { data: orders } = await supabase
  .from('order_pipeline')
  .select('*')
  .eq('archived', false);
```

Aggregate per strain: `demand_packaged_units`, `demand_bulk_flower_qty`, `demand_bulk_smalls_qty`, `total_demand_revenue`, `total_orders`.

---

## Step 4: Constants to Keep As-Is

These JS constants are used throughout for dynamic styling. Copy them directly:

```ts
const TEAL = '#22c55e';
const TEAL_LIGHT = '#4ade80';

const HEALTH_COLORS = {
  critical: { bg: '#ef4444', text: '#fecaca' },
  low: { bg: '#f97316', text: '#fff7ed' },
  warning: { bg: '#eab308', text: '#fefce8' },
  healthy: { bg: '#22c55e', text: '#f0fdf4' },
};

const STAGE_COLORS = {
  binned: '#6366f1', bucked: '#8b5cf6',
  trimmed: '#22c55e', packaged: '#06b6d4', byproduct: '#78716c',
};

const GRADE_COLORS = {
  CULT: { bg: '#065f46', text: '#6ee7b7', label: 'CULT' },
  B: { bg: '#0c4a6e', text: '#7dd3fc', label: 'B Grade' },
  C: { bg: '#78350f', text: '#fcd34d', label: 'C Grade' },
  D: { bg: '#881337', text: '#fda4af', label: 'D Grade' },
  U: { bg: '#374151', text: '#d1d5db', label: 'Undefined' },
};

const PRODUCT_FORMATS = [
  { id: '3.5g', label: '3.5g Flower', weight: 3.5, defaultPrice: 35 },
  { id: '14g', label: '14g Smalls', weight: 14, defaultPrice: 80 },
  { id: '1lb', label: '1lb Flower', weight: 454, defaultPrice: 1800 },
];
```

---

## Step 5: Routing

Add a route for the Sales page in `App.tsx`:

```tsx
const SalesDashboard = lazy(() => import('./features/sales'));
// In routes:
case 'sales': return <SalesDashboard />;
```

---

## Step 6: Realtime (optional)

Subscribe to changes for live updates:

```ts
supabase.channel('sales-dashboard')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_stage_tracking' }, refetch)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refetch)
  .subscribe();
```

---

## Key Notes

- All static backgrounds already use Tailwind classes (`bg-cult-card`, `bg-cult-surface`, etc.)
- Dynamic colors (HEALTH_COLORS, STAGE_COLORS, GRADE_COLORS, ternary expressions) remain as inline `style={{}}` — this is intentional
- The `MenuBuilder` component has print functionality via `@media print` CSS — preserve the print styles from the `<style>` block
- Helper functions `fmtG()` and `fmtN()` format grams and numbers — extract to a shared utils file
