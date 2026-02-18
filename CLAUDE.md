# CULT Seed-to-Sale System - AI Context

Cannabis seed-to-sale tracking system. React 18 + TypeScript + Vite + Supabase + Tailwind.

## Current State (February 2026)

Feature-complete, production use. Last migration: 2026-02-16. Build: passing.
Cultivation module: documentation complete (Session C-1), migrations and UI pending (C-2, C-3).

## Critical Rules

1. **Never directly update inventory quantities.** Use `inventoryMovementService.recordMovement()`. Database triggers handle balance updates.
2. **Finalization = Creation.** Session finalization sets quantities directly on INSERT. Movement records are audit-only (bypass via `reason_code='session_finalization'`).
3. **batch_id is never null** in inventory operations. Format: `YYMMDD-STRAIN`.
4. **Import types from `@/types`.** Never duplicate domain type definitions.
5. **Search before creating.** Extend existing services/components instead of creating new files.

## Before You Code

1. Read `docs/AI-SESSION-BRIEF.md` - full system context and rules
2. Read Hand-Off section in `docs/AI-BUILD-SESSION-CHECKLIST.md` - what happened last session
3. If touching inventory/sessions: read `docs/ARCHITECTURE-DECISIONS.md`
4. If touching conversions: read `docs/PRODUCTS.md`
5. If doing optimization, cleanup, type safety, or bundle work: read `docs/OPTIMIZATION-ROADMAP.md`
6. If working on the Cultivation module: read `docs/CULTIVATION.md`, `docs/CULTIVATION-ARCHITECTURE.md`, and `docs/CULTIVATION-RULES.md` — all three, in order

## File Structure

```
src/features/[module]/     # Feature modules (sessions, inventory, orders, batches, coa, etc.)
src/types/                 # Centralized domain types
src/shared/                # Shared components, hooks
src/services/              # Global services (inventoryMovement, error, notification)
src/lib/                   # Core utilities (supabase client, auth)
docs/                      # Documentation
supabase/migrations/       # Database migrations
```

## After You Code

- Run `npm run build` (must pass)
- Update CHANGELOG.md for significant changes
- Update Hand-Off section in `docs/AI-BUILD-SESSION-CHECKLIST.md`
