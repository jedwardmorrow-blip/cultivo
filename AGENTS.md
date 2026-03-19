# CultOps — Cross-Tool Agent Rules

> This file is read by Antigravity, Cursor, Claude Code, and any AGENTS.md-compatible tool.
> For Antigravity-specific rules, see GEMINI.md.

## Project Overview

CultOps is a cannabis operations platform built for Cult Cannabis. It manages cultivation, post-production, inventory (ATP-enforced), CRM, orders, and an AI chat widget ("The Eye"). The system uses Supabase for backend (Postgres + Edge Functions + Auth + Storage) and is deployed via Vercel.

## Architecture

- **Frontend**: React 18 / TypeScript / Vite / Tailwind CSS
- **Backend**: Supabase (Postgres, Edge Functions in Deno/TypeScript)
- **Deployment**: Vercel (main branch = production)
- **AI Chat**: Edge function `cultops-ai-chat` (currently v36) with Claude API
- **Context System**: Separate Supabase project storing business context, lessons learned, user personas, and cowork task queue

## Key Directories

```
src/
├── features/
│   ├── cultivation/    # Plant groups, rooms, harvest, drying, task board
│   ├── inventory/      # ATP pipeline, audit, combine, adjustments
│   ├── orders/         # Order lifecycle, fulfillment, invoicing, labels
│   ├── crm/            # Accounts, visits, tasks, revenue tracking
│   ├── dashboard/      # Financial + operational overview
│   ├── products/       # Product management
│   ├── sessions/       # Trim, bucking, packaging sessions
│   └── settings/       # System configuration
├── shared/
│   └── components/     # AIChatWidget.tsx, shared UI
├── lib/
│   └── supabase.ts     # Supabase client
└── types/              # Global TypeScript types
```

## Data Model Essentials

- **plant_groups**: Physical grow tables. Multiple per batch. Group by `batch_registry_id` for harvest/operational views.
- **batch_registry**: One row per batch. Source of truth for harvest dates, lifecycle state.
- **inventory_items**: Has TWO batch columns (`batch` AND `batch_number`). Both must be updated on rename.
- **products**: Categories are `packaged`, `preroll`, `bulk`. Trim products are `bulk` category with names like "Bulk - [Strain] - Trim".
- **v_inventory_sales**: Primary view for sales/inventory queries. Use `LOWER(status)` due to casing inconsistency.

## Coding Standards

- TypeScript strict mode
- Tailwind CSS for all styling (no CSS modules, no styled-components)
- Supabase JS v2 client patterns (`.from().select().eq()`)
- Edge functions: three files per function (index.ts, lib.ts, handlers.ts), always version together
- All quantity changes go through `inventory_movements` table — never direct UPDATE on qty columns

## Testing Approach

- Changes should be verified against production data patterns
- Known data quirks: grade_code ~96% UNDEFINED, thc_percentage 0% populated, batch codes encode plant dates not harvest dates

## Context Database

The project maintains a Supabase-hosted context database that serves as persistent memory across all development tools and sessions. Key tables:

- `business_context`: Canonical knowledge, build state, architecture decisions
- `lessons_learned`: Critical/high severity lessons from past incidents
- `cowork_queue`: Pending development tasks with priority and specs
- `user_profiles`: Team member personas with communication styles
- `decisions`: Architecture and business decisions with rationale

Any agent working on this project MUST run `npm run ai:init` before making any plan or code changes, and MUST write back status drafts to `proposed_context_updates` after completing work instead of directly updating canonical tables.
