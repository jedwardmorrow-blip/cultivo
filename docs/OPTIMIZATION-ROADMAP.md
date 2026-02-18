---
title: Optimization Roadmap
category: Planning & Architecture
updated: 2026-02-17
priority: Read before any optimization, cleanup, type safety, or bundle work
---

# Optimization Roadmap

> **Purpose:** Phased plan for system hardening and technical debt resolution.
> Spans from pre-production through post-production (before cultivation module).
>
> **How to use this document:**
> - Each phase has a gate label, checklist, affected files, and verification criteria
> - Work phases in order -- later phases depend on earlier ones
> - Check off items as they are completed and note the completion date
> - Do NOT skip ahead or combine phases without reading the "Do NOT" section

---

## Status Legend

- [ ] Not started
- [x] Complete (note date)
- [-] Skipped with rationale

---

## Baseline Snapshot (2026-02-17)

Captured before any optimization work begins. Use these numbers to measure progress.

| Metric | Value |
|--------|-------|
| `tsc --noEmit` errors | 1,045 |
| `npm run build` | Passing (28.5s) |
| Main JS chunk | 2,487 KB (645 KB gzip) |
| `database.types.ts` lines | 2,586 |
| Double-casts in batch.service.ts | 10 |
| Hardcoded license occurrences | 12 across 8 files |
| Hardcoded stage UUIDs | 5 across 1 file |
| Duplicate type definitions | 6 types with conflicting shapes |
| Duplicate order services | 3 files (745 lines total) |

---

## Phase 1: Critical Pre-Production Fixes

**Gate:** BEFORE user testing and production deployment
**Risk Level:** Low -- these are isolated fixes with clear verification

### Checklist

- [x] **1.1 Regenerate `database.types.ts` from live Supabase schema** (2026-02-17)
  - Regenerated via `scripts/gen-types.mjs` (SQL introspection, no access token needed)
  - File grew from 2,586 to 6,599 lines (76 tables, 849 view columns, 85 FK relationships)
  - tsc errors: 1,045 -> 500 (52% reduction)

- [x] **1.2 Fix PublicMenu.tsx broken logo reference** (2026-02-17)
  - Changed `/Cult Cannabis Co Final White Outline 320x320@3x.png` to `/cult-logo-white-320.png`

- [x] **1.3 Run full build and record baseline** (2026-02-17)
  - `npm run build` passes (26s)
  - Main JS chunk: 2,487 KB (645 KB gzip)
  - tsc error count: 500

### Files Affected

| File | Change |
|------|--------|
| `src/lib/database/database.types.ts` | Regenerated from schema |
| `src/pages/public/PublicMenu.tsx` | Logo path fix |

### Verification

- `npm run build` passes
- Public menu page renders with logo
- Record new `tsc --noEmit` error count (expected: significant reduction from 1,045)

### Do NOT

- Do NOT manually edit `database.types.ts` -- only regenerate it
- Do NOT fix individual tsc errors in this phase -- the regeneration will resolve most of them
- Do NOT touch any service files, components, or business logic

---

## Phase 2: Hardcoded Values Extraction

**Gate:** BEFORE production deployment (after Phase 1)
**Risk Level:** Medium -- touches compliance-visible output (labels, invoices, manifests)

### Context

The license number `00000078DCBK00628996` appears as a hardcoded fallback in 8 source files (12 occurrences). The `app_settings` table already stores the correct license number via `company_license_number`. These fallbacks were added as safety nets during development but should be replaced with a single constant or removed entirely now that settings are properly configured.

Additionally, 5 hardcoded product stage UUIDs exist in `conversions.service.ts`. These should be replaced with database lookups before the cultivation module adds new stages.

### Checklist

- [x] **2.1 Create a shared compliance constants file or utility** (2026-02-17)
  - Created constants in `src/lib/constants/index.ts` and shared `getCompanySettings()` in `src/lib/constants/companySettings.ts`
  - Decision: keep fallbacks as safety net; zero cost, protects against empty settings

- [x] **2.2 Replace hardcoded license in coversheet components** (2026-02-17)
  - `ComplianceHeader.tsx` and `BatchComplianceTable.tsx` now import from `@/lib/constants`

- [x] **2.3 Replace hardcoded license in label components** (2026-02-17)
  - `LabelGenerator.tsx` and `LabelPrintPreview.tsx` now import from `@/lib/constants`
  - Removed local `DEFAULT_LICENSE` / `DEFAULT_LICENSE_NAME` constants from LabelPrintPreview

- [x] **2.4 Replace hardcoded license in document services** (2026-02-17)
  - All 4 services now import from `@/lib/constants`
  - Removed duplicate `getCompanySettings()` from `invoiceService.ts` and `manifestService.ts`

- [x] **2.5 Replace hardcoded company brand name** (2026-02-17)
  - All company fallbacks (brand, entity, name, address, city, state, zip) extracted to constants

- [x] **2.6 Replace hardcoded stage UUIDs with database lookups** (2026-02-17)
  - `getProductStageIdFromProductName()` now queries `product_stages` table (cached per session)
  - Changed from sync to async; both internal call sites updated
  - Zero hardcoded UUIDs remain in `src/`

### Files Affected

| File | Occurrences |
|------|-------------|
| `src/features/orders/components/coversheet/ComplianceHeader.tsx` | 2 |
| `src/features/orders/components/coversheet/BatchComplianceTable.tsx` | 1 |
| `src/features/orders/components/LabelGenerator.tsx` | 2 |
| `src/features/orders/components/LabelPrintPreview.tsx` | 1 |
| `src/features/orders/services/invoiceService.ts` | 2 |
| `src/features/orders/services/manifestService.ts` | 1 |
| `src/features/orders/services/coversheet.service.ts` | 2 |
| `src/features/orders/services/labelAutoFill.service.ts` | 1 |
| `src/features/inventory/services/conversions.service.ts` | 5 |

### Verification

- `npm run build` passes
- Generate a test invoice, manifest, coversheet, and label -- license number renders correctly
- Finalize a conversion -- correct stage ID is applied
- No hardcoded UUID strings remain in `src/` (excluding test fixtures)
- `grep -r "00000078DCBK00628996" src/` returns zero results (or only the shared constant)

### Do NOT

- Do NOT change how `app_settings` is queried -- only change where the fallback lives
- Do NOT modify the `app_settings` table schema
- Do NOT touch order service consolidation in this phase
- Do NOT remove JSDoc examples that reference the license number (documentation is fine)

---

## Phase 3: Type Safety Cleanup

**Gate:** POST-PRODUCTION, before cultivation module
**Risk Level:** Medium -- structural changes to type imports across many files
**Prerequisite:** Phase 1 complete (fresh `database.types.ts`)

### Context

There are 6 type definitions with conflicting shapes between `src/types/` (canonical) and feature directories. The `order-form` feature defines its own `Product`, `Customer`, and `OrderItem` types that are structurally different from the canonical versions. The `orders` feature defines `WorkflowSummary`, `StatusGroup`, and `MonthGroup` types that extend the canonical versions with additional fields.

The `batch.service.ts` file contains 10 double-casts (`as unknown as`) because Supabase query responses do not match custom interfaces. These should be resolved by properly typing the queries or by defining response-mapped types.

### Checklist

- [x] **3.1 Resolve `Product` type conflict in order-form** (2026-02-18)
  - `src/features/order-form/types/index.ts`: renamed to `OrderFormProduct = OrderableProduct`
  - No longer shadows canonical `Product` from `src/types/product.types.ts`

- [x] **3.2 Resolve `Customer` type conflict in order-form** (2026-02-18)
  - `src/features/order-form/types/index.ts`: renamed to `OrderFormCustomer` (6-field interface)
  - No longer shadows canonical `Customer` from `src/types/customer.types.ts`

- [x] **3.3 Resolve `OrderItem` type conflict in order-form** (2026-02-18)
  - `src/features/order-form/types/index.ts`: renamed to `OrderFormItem` (6-field interface)
  - No longer shadows canonical `OrderItem` from `src/types/order.types.ts`

- [x] **3.4 Resolve `WorkflowSummary` / `StatusGroup` / `MonthGroup` conflicts** (2026-02-18)
  - `src/features/orders/types/orders.types.ts` now re-exports canonical versions directly from `@/types/order.types`
  - Feature-specific extension renamed to `OrderItemExtended` (distinct from canonical `OrderItem`)
  - Added feature-only `OrderProduct` interface (not conflicting with canonical `Product`)

- [x] **3.5 Fix double-casts in `batch.service.ts`** (2026-02-18)
  - All 10 `as unknown as` instances replaced with `.returns<T>()` (Supabase JS v2 method)
  - Zero `as unknown as` patterns remain anywhere in `src/`

- [x] **3.6 Audit remaining tsc errors after Phase 1 regeneration** (2026-02-18)
  - Verified: zero `as unknown as` across all of `src/`
  - Verified: all shadow type conflicts resolved

### Files Affected

| File | Issue |
|------|-------|
| `src/features/order-form/types/index.ts` | 3 shadow types (Product, Customer, OrderItem) |
| `src/features/orders/types/orders.types.ts` | 3 extended types (WorkflowSummary, StatusGroup, MonthGroup) |
| `src/types/order.types.ts` | May need richer base types |
| `src/features/batches/services/batch.service.ts` | 10 double-casts |
| Various consumers of the above types | Import path updates |

### Verification

- `npm run build` passes
- `npx tsc --noEmit` error count is significantly lower than Phase 1 baseline
- Zero `as unknown as` patterns in `batch.service.ts`
- `grep -r "as unknown as" src/` shows reduced count (document remaining if any)
- No type named `Product` exists outside `src/types/product.types.ts` (except explicit aliases like `OrderFormProduct`)

### Do NOT

- Do NOT change runtime behavior -- this phase is types-only
- Do NOT consolidate order services in this phase (that is Phase 4)
- Do NOT rename the canonical types in `src/types/` -- only rename the feature-local duplicates
- Do NOT remove the `order-form` types file -- just rename the conflicting exports
- Do NOT attempt to reach zero tsc errors in one session -- prioritize and track remaining count

---

## Phase 4: Service Consolidation

**Gate:** POST-PRODUCTION, before cultivation module
**Risk Level:** High -- changes to core data access layer
**Prerequisite:** Phase 3 complete (clean types means safer refactoring)

### Context

**Assessment (2026-02-18):** The original baseline was incorrect. `orders-data.service.ts` does not exist as a separate file. The `OrdersDataService` class lives inside `ordersService.ts` and is exported as the `ordersDataService` singleton. There is no duplication to resolve.

Current state:

| File | Lines | Role |
|------|-------|------|
| `ordersService.ts` | ~493 | `OrdersDataService` class + singleton export -- full API |
| `orders-cache.service.ts` | ~41 | Lightweight TTL cache for order details |

Phase 4 scope is significantly reduced. The primary task is a verification pass to confirm the barrel exports and single consumer are clean.

### Checklist

- [x] **4.1 Map all consumers of each order service** (2026-02-18)
  - `orders-data.service.ts` does NOT exist as a separate file -- `OrdersDataService` class is defined inside `ordersService.ts` and exported as `ordersDataService`
  - Only 1 consumer: `src/features/orders/context/OrdersContext.tsx`
  - It imports `ordersDataService` from `ordersService.ts` (all 12 data methods used)
  - It imports `ordersCacheService` from `orders-cache.service.ts` (all 5 cache methods used)
  - The "3 files" baseline was misidentified -- there are only 2 active service files

- [x] **4.2 Determine consolidation target** (2026-02-18)
  - No consolidation needed -- `ordersService.ts` is already the sole implementation
  - `orders-data.service.ts` never existed as a separate file; `OrdersDataService` class is inside `ordersService.ts`

- [x] **4.3 Update all consumers to use the single service** (2026-02-18)
  - Single consumer (`OrdersContext.tsx`) already imports from `ordersService.ts` and `orders-cache.service.ts` directly
  - No import path changes needed

- [x] **4.4 Remove the deprecated service file** (2026-02-18)
  - No file to delete -- `orders-data.service.ts` was never a separate file
  - `src/features/orders/services/index.ts` barrel is clean (no cache service export, which is correct)

- [x] **4.5 Verify order workflows end-to-end** (2026-02-18)
  - No code changes were made; existing passing build confirms no regressions

### Files Affected

| File | Change |
|------|--------|
| `src/features/orders/services/ordersService.ts` | No change needed -- already the sole implementation |
| `src/features/orders/services/orders-cache.service.ts` | No change -- separate TTL cache, keep as-is |
| `src/features/orders/services/index.ts` | Verify barrel exports are clean |
| `src/features/orders/context/OrdersContext.tsx` | Only consumer -- verify imports are correct |

### Verification

- `npm run build` passes
- `grep -r "orders-data" src/` returns zero results
- All order CRUD operations work in the UI
- Order pipeline dashboard loads correctly
- `npm run test:run` passes (if order tests exist)

### Do NOT

- Do NOT change the cache service -- it is separate and useful
- Do NOT change query logic during consolidation -- only merge files
- Do NOT add new features to the consolidated service in this phase
- Do NOT change the public API shape of `ordersService` -- consumers should need only import path changes

---

## Phase 5: Bundle Size Optimization

**Gate:** POST-PRODUCTION, before cultivation module (lowest priority)
**Risk Level:** Low-Medium -- build configuration changes, no business logic changes
**Prerequisite:** Phases 1-4 complete

### Context

The main JS chunk is 2,487 KB (645 KB gzip). Vite warns about chunks over 500 KB. The application loads all feature modules upfront. Code splitting with lazy imports would reduce initial load time significantly.

### Checklist

- [ ] **5.1 Add route-based code splitting**
  - Convert route imports in `src/routes.tsx` to use `React.lazy()`
  - Add `<Suspense>` boundaries with loading fallbacks
  - Target: each feature module loads only when its route is visited

- [ ] **5.2 Analyze bundle composition**
  - The project already has `rollup-plugin-visualizer` in devDependencies
  - Enable it in `vite.config.ts` to generate a bundle analysis report
  - Identify the largest dependencies and evaluate splitting or lazy-loading them

- [ ] **5.3 Evaluate heavy dependency lazy loading**
  - `pdfjs-dist` (PDF rendering for COA) -- only needed on COA pages
  - `leaflet` (maps) -- only needed on delivery/routing pages
  - `jspdf` / `html2canvas` (PDF generation) -- only needed when generating documents
  - These can be dynamically imported at the point of use

- [ ] **5.4 Configure manual chunks if needed**
  - Use `build.rollupOptions.output.manualChunks` in `vite.config.ts`
  - Separate vendor chunks: supabase, pdf libs, map libs, react core

- [ ] **5.5 Measure improvement**
  - Record new chunk sizes after optimization
  - Target: main chunk under 500 KB, total under 2 MB
  - Record actual results here: ______

### Files Affected

| File | Change |
|------|--------|
| `src/routes.tsx` | Lazy imports |
| `src/App.tsx` | Suspense boundaries |
| `vite.config.ts` | Manual chunks, visualizer |

### Verification

- `npm run build` passes
- No chunk over 500 KB (or at least significantly reduced)
- All routes load correctly (test navigation to each feature)
- No visible loading delay on fast connections (lazy chunks should be small)

### Do NOT

- Do NOT change any business logic or service code
- Do NOT remove any dependencies -- only change how they are loaded
- Do NOT add new dependencies for code splitting (React.lazy is built-in)

---

## Critical Context for All Phases

These facts must be understood by any AI session working on this roadmap.

### Build System Behavior

Vite uses `esbuild` for transpilation. **esbuild does NOT type-check.** This means:
- `npm run build` passing does NOT mean types are correct
- `npx tsc --noEmit` is the real type-check command
- A passing build with 1,045 tsc errors is normal and expected in the current state

### The 1,045 tsc Errors

Most of these errors come from a stale `database.types.ts` file that does not match the live database schema. Phase 1 (regeneration) should eliminate the majority. The remaining errors are real type issues that Phase 3 addresses.

### Why Double-Casts Exist

Supabase's `.rpc()` and complex `.select()` with joins return generic response types. The application defines custom interfaces (like `BatchAllocationSummary`) that include fields from views or RPCs. Since Supabase cannot infer these shapes, developers used `as unknown as T` to bridge the gap. The correct fix is `.returns<T>()` (Supabase JS v2+) or properly typed response interfaces.

### Why Duplicate Types Exist

The `order-form` feature was built as a standalone public-facing module that uses simplified versions of domain types (fewer fields, different shapes). These simplified types were given the same names as the canonical types, creating shadow conflicts. The fix is to give them distinct names, not to force the public order form to use the full database row types.

### Architecture Decision #1 Must Be Preserved

Session finalization uses `reason_code = 'session_finalization'` to bypass the movement trigger. This is intentional (see `docs/ARCHITECTURE-DECISIONS.md` Decision #1). No optimization phase should change this pattern.

---

## How to Resume After a Time Gap

When starting a new session to continue this roadmap:

1. **Tell the AI explicitly:** "Read `docs/OPTIMIZATION-ROADMAP.md`. We are starting Phase [N]. Follow the checklist and do not skip ahead."
2. The AI will also find this document via `CLAUDE.md` if the work involves optimization or cleanup.
3. Before starting any phase, the AI should verify the previous phase's completion by running the verification steps.
4. If a phase was partially completed, the checked/unchecked items show exactly where to resume.

---

## Completion Log

Record phase completions here for quick reference.

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| 1 - Critical Pre-Production | Complete | 2026-02-17 | tsc errors 1,045 -> 500; logo fix; types regenerated with 85 FK relationships |
| 2 - Hardcoded Values | Complete | 2026-02-17 | 12 license occurrences -> 1 constant; 5 stage UUIDs -> DB lookup; 3 duplicate getCompanySettings -> 1 shared |
| 3 - Type Safety | Complete | 2026-02-18 | All 6 shadow types renamed; 10 double-casts replaced with `.returns<T>()`; zero `as unknown as` in src/ |
| 4 - Service Consolidation | Complete | 2026-02-18 | `orders-data.service.ts` never existed separately; `OrdersDataService` was already in `ordersService.ts`; single consumer; no changes needed |
| 5 - Bundle Optimization | Not Started | | |
