# Phase 1 — Surface Treatment Guide

**Which surfaces get hairline grids vs. gapped cards, and why.**

The rule: **density follows the persona's task, not a global toggle.** A worker on a tablet needs distinct tap targets. A COO at a desk needs scan speed. Both get the Cultivo palette (Phase 0), but the card treatment diverges by surface.

---

## Treatment definitions

### A. Hairline grid (instrument mode)
- Cells share an outer container with `1px` `--op-line` dividers between them
- No per-cell border-radius (outer container gets `--r-md` / 8px)
- No per-cell background difference — all cells are `--op-canvas`
- No gap between cells — `gap: 1px; background: var(--op-line)`
- No hover background shift (hover shows a subtle left-accent or row highlight)
- Maximum data per pixel. Eye scans without jumping gaps.
- **Use when:** operator reads 5+ data groups at once, comparison across cells matters, surface is non-interactive or click-to-drill

### B. Gapped cards (app mode)
- Each card is a self-contained object with its own border, radius (`--r-md`), background (`--op-surface`)
- `gap-3` or `gap-4` (12–16px) between cards
- Cards have hover states (`--op-surface-2` + `--op-line-strong` border)
- Cards are individually expandable, draggable, swappable
- Clear affordances for touch/tap interaction
- **Use when:** cards are individually actionable (tap to expand, drag to rearrange, swap into main panel), touch device, fewer than 5 items visible

### C. Hybrid (gapped container, hairline interior)
- Outer card is a gapped card (own border, radius, background)
- Interior content uses hairline rows — no nested cards
- **Use when:** a card contains tabular data (e.g., a "Room Conditions" panel with 6 env rows inside it)

---

## Surface-by-surface treatment map

### Cultivation module (`src/features/cultivation/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **CommandCenter — KPI strip** | A · Hairline | 4–6 KPI cells in a single row. Comparison across cells is the job. |
| **CommandCenter — Rooms board** | B · Gapped | Room tiles are individually tappable → drill into room detail. Card swap pattern needs card identity. |
| **CommandCenter — Alerts panel** | C · Hybrid | Panel is a gapped card. Alert rows inside use hairline dividers. |
| **CommandCenter — Env rail** | A · Hairline | 6 sensor readings side by side. Scan speed matters. |
| **Room detail / Expanded room** | C · Hybrid | Outer card (gapped, swappable). Interior: hairline rows for batches, env, tasks. |
| **Batch Detail — lifecycle ribbon** | A · Hairline | 9 stage cells in a single row. Time reads left-to-right. |
| **Batch Detail — KPI strip** | A · Hairline | Same as CommandCenter KPIs. |
| **Batch Detail — body panels** | C · Hybrid | Two gapped panels (history + env). Interior rows are hairline. |
| **Batch Detail — activity log** | A · Hairline | Dense log. Each row is a hairline-divided entry. |

### Dashboard (`src/features/dashboard/`, `src/pages/DashboardPage.tsx`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Dashboard bento grid** | B · Gapped | Tiles are individually expandable (first click expand, second click focus). Drag-to-rearrange in Phase 3 needs card identity. This is the one surface where gapped cards earn their keep even on desktop. |
| **Inside each dashboard tile** | C · Hybrid | The tile is the card. Its interior uses hairline rows/mini-grids. No nested cards. |

### Production / Sessions (`src/features/sessions/`, `src/features/production-queue/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Production CommandCenter — rail** | B · Gapped | Kitchen-ticket metaphor. Each ticket is a distinct card that moves through stages. |
| **Session detail modal** | C · Hybrid | Modal is opaque card. Interior: hairline rows for weights, workers, timing. |
| **Production Planner** | A · Hairline | Calendar/timeline grid. Dense scheduling data. |

### Orders / Sales (`src/features/orders/`, `src/features/order-form/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Orders list** | A · Hairline | Table of orders. Scan speed. Click row to drill. |
| **Order detail** | C · Hybrid | Header card (gapped). Line items inside: hairline rows. |
| **Order form** | B · Gapped | Form sections are cards. User fills them sequentially. Touch-friendly. |

### Inventory (`src/features/inventory/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Inventory list / table** | A · Hairline | Dense tabular data. Filter + scan. |
| **Batch flow visualization** | B · Gapped | Spatial movement metaphor — cards represent physical containers moving through stages. |
| **Inventory modals** | C · Hybrid | Opaque modal card. Interior: hairline rows for lot details, transfers. |

### CRM / Accounts (`src/features/crm/`, `src/features/customers/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Accounts list** | A · Hairline | Table scan. |
| **Account detail — header** | B · Gapped | Account card with contact info, tags, status. |
| **Account detail — order history** | A · Hairline | Dense transaction log. |

### Worker module (`src/features/worker/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **ALL worker surfaces** | B · Gapped | Workers are on tablets with gloves. Large tap targets, clear card boundaries, no ambiguity about what's tappable. 44px minimum hit targets. This is the one module where hairline grids are **never** appropriate. |

### Auth (`src/features/auth/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Login / PIN** | B · Gapped | Single centered card. No grid. Ceremonial — the wordmark breathes here. |

### Rosin Lab (`src/features/rosin-lab/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Press view** | B · Gapped | Spatial press-centric layout. Each press is a card. |
| **Batch tracking inside press** | C · Hybrid | Press card is gapped. Interior hash/rosin rows are hairline. |

### Analytics / Executive (`src/features/analytics/`, `src/features/executive/`, `src/features/strain-analytics/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **All analytics dashboards** | A · Hairline | Pure data. Maximum density. Charts + KPIs in hairline grid cells. No interactivity beyond filter/drill. |

### Settings / Admin (`src/features/settings/`, `src/features/admin/`)

| Surface | Treatment | Reasoning |
|---|---|---|
| **Settings panels** | B · Gapped | Form-like. Each settings section is a card. |
| **Admin tables** | A · Hairline | User lists, role management — tabular. |

---

## Migration priority

Migrate in the order users see the most:

1. **Cultivation CommandCenter** — KPI strip + env rail to hairline (A). Rooms board stays gapped (B). Alerts to hybrid (C). *This is the gold standard surface.*
2. **Batch Detail** — ribbon + KPI to hairline (A), body to hybrid (C).
3. **Orders list** — to hairline (A). Order detail to hybrid (C).
4. **Dashboard tiles** — interiors to hybrid (C). Outer grid stays gapped (B).
5. **Inventory list** — to hairline (A).
6. **Everything else** — as modules are next touched.

Worker module is **last** (or never) — it's already correct as gapped cards.

---

## CSS implementation notes

### Hairline grid pattern
```css
.hairline-grid {
  display: grid;
  gap: 1px;
  background: var(--op-line);          /* gap color = line color */
  border: 1px solid var(--op-line);
  border-radius: var(--r-md);          /* 8px */
  overflow: hidden;                     /* clips children to radius */
}
.hairline-grid > * {
  background: var(--op-canvas);        /* each cell opaque */
}
```

### Gapped card pattern (Phase 0 `.glass-card` already does this)
```css
.gapped-card {
  background: var(--op-surface);       /* #111111 */
  border: 1px solid var(--op-line);    /* rgba(255,255,255,0.06) */
  border-radius: var(--r-md);          /* 8px */
}
```

### Hybrid: gapped outer, hairline inner
The outer container is a `.gapped-card`. Interior rows use:
```css
.inner-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--op-line);
}
.inner-row:last-child {
  border-bottom: none;
}
```

---

## Stage color migration (also Phase 1)

Across all surfaces:
- **Remove** any `bg-cult-stage-*` or `background: var(--stage-*)` fills on cards, rows, or containers
- **Replace** with a 6px dot: `<span class="w-1.5 h-1.5 rounded-full" style="background: var(--stage-flower)"></span>`
- Stage color fills are permitted ONLY as:
  - 6px dots (status indicators)
  - 2px left borders on active/selected rows (max)
  - Chart data series colors

---

## Typography migration (also Phase 1)

- Batch codes (`B-2046`), room codes (`FLR-02`), timestamps, IDs → `font-mono`
- KPI numbers → `font-mono tnum` (tabular numerals for column alignment)
- Labels, descriptions, navigation → `font-sans` (already default)
- Never mix: a single data element is either mono or sans, never both in the same cell
