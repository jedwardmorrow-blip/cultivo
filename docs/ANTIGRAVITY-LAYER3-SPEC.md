# Layer 3: Unified Command Center Frontend — AntiGravity Build Spec

## Context
We've built the backend "brain" for cultivation operations:
- **v_room_operational_state** — a Postgres view (live in production) that aggregates every room's plants, strains, tasks, harvest intel, and urgency score into a single query
- **room_task_schedules** — 34 recurring schedules seeded (feeding/scouting/IPM/defoliation/cleaning)
- **AddTaskModal** — now writes to `daily_task_instances` (was broken, fixed today)

The frontend needs to consume this view and replace the current room card layout with an operations-first command center.

## Database: v_room_operational_state

Query: `supabase.from('v_room_operational_state').select('*')`

### Columns (all returned per room)

| Column | Type | Description |
|--------|------|-------------|
| room_id | uuid | grow_rooms.id |
| room_code | text | e.g. "FLW-03", "VEG-01" |
| room_type | text | clone, veg, flower, mother, mixed |
| capacity_plants | int | null if not set |
| is_active | boolean | always true (view filters) |
| plant_group_count | bigint | # active plant groups |
| total_plants | bigint | sum of plant_count across groups |
| strain_count | bigint | # distinct strains |
| strain_names | text[] | array of strain names, sorted |
| dominant_stage | text | most common growth_stage in room |
| days_in_stage | int | days since oldest group entered current stage |
| oldest_stage_entry | timestamptz | |
| newest_stage_entry | timestamptz | |
| occupancy_pct | numeric | null if no capacity set |
| occupancy_status | text | 'empty', 'occupied', 'full' |
| earliest_harvest_date | date | |
| latest_harvest_date | date | |
| groups_near_harvest | bigint | groups with harvest date within 14 days |
| next_harvest_date | date | nearest upcoming harvest |
| last_harvest_date | date | most recent completed harvest |
| last_harvest_wet_grams | numeric | |
| days_to_harvest | int | can be negative (overdue) |
| tasks_today | bigint | total tasks for this room today |
| tasks_completed_today | bigint | |
| tasks_pending_today | bigint | |
| tasks_in_progress_today | bigint | |
| urgency_score | int | 0-3 (0=calm, 1=watch, 2=attention, 3=urgent) |

### Current Production Data (2026-03-20)

```
FLW-03  urgency:3  145 plants   7 strains   harvest in 6 days    21 groups near harvest
FLW-08  urgency:3  332 plants   6 strains   harvest in 6 days   113 groups near harvest
FLW-07  urgency:2  313 plants  10 strains   8 DAYS OVERDUE       71 days in flower
VEG-01  urgency:1  347 plants  16 strains   no harvest date       66 days in veg
FLW-06  urgency:0  314 plants  26 strains   harvest in 32 days
FLW-09  urgency:0  268 plants   7 strains   harvest in 48 days
FLW-10  urgency:0  298 plants   9 strains   harvest in 55 days
FLW-11  empty
MOM-01  empty
VEG-02  empty
VEG-03  empty
```

## What to Build

### 1. New Hook: `useRoomOperationalState`

Location: `src/features/cultivation/hooks/useRoomOperationalState.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RoomOperationalState {
  room_id: string;
  room_code: string;
  room_type: string;
  capacity_plants: number | null;
  is_active: boolean;
  plant_group_count: number;
  total_plants: number;
  strain_count: number;
  strain_names: string[] | null;
  dominant_stage: string | null;
  days_in_stage: number | null;
  oldest_stage_entry: string | null;
  newest_stage_entry: string | null;
  occupancy_pct: number | null;
  occupancy_status: 'empty' | 'occupied' | 'full';
  earliest_harvest_date: string | null;
  latest_harvest_date: string | null;
  groups_near_harvest: number | null;
  next_harvest_date: string | null;
  last_harvest_date: string | null;
  last_harvest_wet_grams: number | null;
  days_to_harvest: number | null;
  tasks_today: number;
  tasks_completed_today: number;
  tasks_pending_today: number;
  tasks_in_progress_today: number;
  urgency_score: number;
}

export function useRoomOperationalState() {
  // select * from v_room_operational_state, order by urgency_score desc, room_code
  // return { rooms, loading, error, refetch }
}
```

Export it from `src/features/cultivation/hooks/index.ts`.

### 2. Modify CultivationDashboard

File: `src/features/cultivation/components/CultivationDashboard.tsx`

**Current state:** Uses 4 separate hooks (useGrowRooms, usePlantGroups, useHarvestSessions, useRoomSummaries) and does client-side computation for plant counts, harvest countdowns, etc.

**Target:** Add `useRoomOperationalState` as the primary data source for the room overview section. The existing hooks are still needed for the drawer/detail interactions — don't remove them. But the room card grid should render from the view data.

### 3. Room Card Redesign

Each room card should display:

**Header row:**
- Room code (FLW-03) — bold
- Urgency badge: score 3 = red pulse, 2 = amber, 1 = yellow, 0 = no badge
- Room type pill (uses existing stage colors from tailwind.config.js)

**Body:**
- Plant count + strain count: "145 plants · 7 strains"
- Days in stage: "Day 57 of flower"
- Strain pills (first 3-4 from strain_names array, +N more)

**Harvest section (flower rooms only):**
- If days_to_harvest > 0: "Harvest in X days" with countdown bar
- If days_to_harvest <= 0: "OVERDUE by X days" — red, prominent
- If groups_near_harvest: "21 groups ready" badge

**Task progress bar (bottom of card):**
- Thin bar: completed (green) / in_progress (amber) / pending (gray)
- "3/5 tasks done" text

**Empty rooms:**
- Muted card, "Empty" label, no urgency badge

**Sort order:** urgency_score DESC, then room_code ASC (urgent rooms float to top)

### 4. Design System

Use existing tokens from `tailwind.config.js`:

```
Background: cult-black (#0D0D0D), cult-near-black (#141414)
Text: cult-white (#E6E6E6), cult-light-gray (#999), cult-medium-gray (#555)
Accent: cult-accent (#D4AF37), cult-accent-hover (#E5C44D)
Borders: cult-border (#2A2A2A), cult-medium-gray
Stage colors: cult-stage-clone (#0EA5E9), cult-stage-veg (#10B981), cult-stage-flower (#F43F5E), cult-stage-harvest (#F59E0B)
Shadows: shadow-glow, shadow-inner-glow
Font: Montserrat
```

**DO NOT hardcode colors.** Use tailwind tokens exclusively. The existing codebase has 4-way stage color drift (hardcoded hex/rgba in RoomMapCard, CultivationDashboard, DailyTaskBoard) — don't add a 5th.

### 5. Urgency Pulse Animation

For urgency 3 rooms, add a subtle border pulse. There's already a `pulse-glow` keyframe in tailwind.config.js:

```js
'pulse-glow': { '0%, 100%': { boxShadow: '0 0 5px rgba(212,175,55,0.3)' }, '50%': { boxShadow: '0 0 20px rgba(212,175,55,0.6)' } }
```

Adapt for red (harvest urgent) and amber (attention needed).

### 6. Files to NOT Touch

- `RoomDetailDrawer.tsx` — leave as-is
- `PlantGroupDetailPanel.tsx` — leave as-is
- `DailyTaskBoard.tsx` — just fixed, leave alone
- `useDailyTasks.ts` — just fixed, leave alone
- Any migration files

### 7. Supabase Connection

Production project ID: `fonreynkfeqywshijqpi`
The view is already live — no migration needed from AntiGravity's side.
The existing `supabase` client in `src/lib/supabase.ts` connects to production.

## Build Checklist

- [ ] Create `useRoomOperationalState` hook
- [ ] Export from hooks/index.ts
- [ ] Update CultivationDashboard to use view data for room grid
- [ ] Room cards show: urgency badge, plant/strain count, days in stage, harvest countdown, task progress
- [ ] Sort rooms by urgency_score DESC
- [ ] Empty rooms render as muted cards
- [ ] All colors use tailwind tokens (no hardcoded hex/rgba)
- [ ] Run `npm run build` — must pass
- [ ] Test with real data (view returns 11 rooms, 7 occupied)
