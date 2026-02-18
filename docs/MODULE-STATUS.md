---
title: Module Status
updated: 2026-02-18
---

# Module Status

Quick reference for the implementation status of each module.

| Module | Status | Last Updated | Key Files | Known Issues |
|--------|--------|-------------|-----------|-------------|
| Sessions (Trim/Buck/Pkg) | Production | 2026-01-28 | `src/features/sessions/` | None |
| Conversions | Production | 2026-02-05 | `src/features/inventory/components/ConversionsView.tsx` | None |
| Inventory | Production | 2026-02-05 | `src/features/inventory/` | ~58 strict TS errors (non-blocking) |
| Batches | Production | 2026-01-22 | `src/features/batches/` | None |
| Orders | Production | 2026-01-21 | `src/features/orders/` | None |
| COA | Production | 2026-02-06 | `src/features/coa/` | PDF.js worker version lock |
| Customers | Production | 2026-01-13 | `src/features/customers/` | None |
| Products | Production | 2026-01-14 | `src/features/products/` | None |
| Dashboard | Production | 2026-01-21 | `src/features/dashboard/` | None |
| Analytics | Production | 2025-10-12 | `src/features/analytics/` | None |
| Settings | Production | 2025-10-17 | `src/features/settings/` | None |
| Delivery/Routing | Production | 2025-10-17 | `src/features/delivery/` | None |
| Auth | Production | 2025-10-12 | `src/features/auth/`, `src/lib/auth.tsx` | None |
| Order Form (Public) | Production | 2025-10-24 | `src/features/order-form/` | None |
| Test Mode | Production | 2025-11-24 | `src/contexts/TestModeContext.tsx` | Not integrated into all UI workflows |
| Labels | Production | 2025-10-13 | `src/features/orders/components/LabelGenerator.tsx` | None |
| Coversheets | Production | 2025-10-17 | `src/features/orders/components/coversheet/` | None |
| Invoicing | Production | 2025-10-13 | `src/features/orders/services/invoiceService.ts` | None |
| Manifests | Production | 2025-10-17 | `src/features/orders/services/manifestService.ts` | None |

**Deferred items (post-launch):**
- Command palette (Cmd+K)
- CSV export
- Table sorting/filtering
- Dark mode
- Phase D testing (critical path coverage — see `docs/CULTIVATION-PHASE-D-RISK-ANALYSIS.md`)

**Completed optimization phases (2026-02-17/18):**
- Bundle size optimization (main chunk 2,487 KB → 331 KB)
- Hardcoded values extraction (license, stage UUIDs → constants/DB lookup)
- Type safety cleanup (6 shadow types renamed, 10 double-casts removed)
- Service consolidation verification (orders services already consolidated)
- Pre-cultivation phases A, B, C (type hardening, pagination caps, service refactoring)

> **Archive:** For detailed historical progress tracking, see [docs/archive/DOCS-INTEGRATION-PROGRESS.md](./archive/DOCS-INTEGRATION-PROGRESS.md)
