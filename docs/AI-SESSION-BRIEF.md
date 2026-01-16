---
title: AI Session Brief
category: AI Development
version: 1.0
updated: 2025-11-26
priority: CRITICAL - READ THIS FIRST
---

# AI Session Brief - CULT Seed-to-Sale System

> **⚠️ READ THIS FIRST when starting any work session**
> **Last Updated:** 2025-11-26
> **Current Phase:** Phase 6 - Testing & Validation Complete

---

## CRITICAL CONTEXT (30 seconds)

### What This System Is

**Cannabis seed-to-sale tracking and production management system**

**Core Architecture:**
- **Batch-centric** - Everything links to batches (YYMMDD-STRAIN format)
- **Event-driven inventory** - Immutable ledger with automatic balance updates
- **Compliance-first** - COA tracking, AZDHS manifests, regulatory fields
- **Full lifecycle** - Harvest → Trim → Buck → Package → Order → Deliver

**Tech Stack:**
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Tailwind CSS + Lucide React icons
- PDF generation (jsPDF), barcode/QR (jsbarcode, qrcode)
- Leaflet maps for delivery routing

---

## CURRENT IMPLEMENTATION STATUS

### ✅ PHASES COMPLETE

**Phase 1-5: Core Features (PRODUCTION READY)**
- ✅ Sessions Module (Trim, Bucking, Packaging) - 800+ lines
- ✅ Batches Module (Batch-centric architecture) - 200+ lines
- ✅ Orders Module (Pipeline, fulfillment, invoicing) - 700+ lines
- ✅ Inventory Module (Event-driven tracking, audits) - 600+ lines
- ✅ COA Module (Certificate management) - 180+ lines
- ✅ Customers Module (License tracking, geocoding) - 132+ lines
- ✅ Dashboard Module (Widgets, analytics) - 200+ lines
- ✅ Analytics Module (Reporting) - 100+ lines
- ✅ Settings Module (Configuration) - 150+ lines

**Phase 6: Testing & Validation (COMPLETE ✅)**
- ✅ Test Mode System (Database-driven test isolation)
- ✅ Movement Trigger System (Automated inventory updates)
- ✅ Trigger Testing Dashboard (Scenario simulation)
- ✅ Audit Log System (Immutable operation tracking)
- ✅ Build verification (2,441 modules, 20s build time)

**Last Major Update:** 2025-11-28
**Latest Session:** Phase 1 Complete - Added 9 missing legacy columns to TypeScript types - see CHANGELOG.md and SESSION-2025-11-28-PHASE1-TYPE-SYSTEM-REPAIR.md
**Build Status:** ✅ PASSING (2,444 modules, 15.74s)
**Assessment:** **PHASE 1 COMPLETE - REQUIRES PHASE 4 TESTING**
**Critical Learning:** Schema/type mismatches occur across THREE layers (database, types, triggers). Comprehensive audits catch root causes that incremental fixes miss. Legacy and event-driven architectures can coexist if properly typed.

---

### 🎯 YOUR MISSION

The system is **feature-complete** and in **maintenance/enhancement mode**.

**Common Tasks:**
1. **Bug fixes** - Address issues in production-ready modules
2. **UI enhancements** - Improve user experience and accessibility
3. **Performance optimization** - Speed up queries, reduce bundle size
4. **New feature requests** - Extend existing modules with new capabilities
5. **Documentation updates** - Keep docs aligned with code changes
6. **Test coverage** - Add unit/integration tests for critical paths

**Current Focus Areas:**
- Test mode integration into UI workflows
- Inventory trigger validation and monitoring
- Order fulfillment workflow refinements
- Delivery routing optimization
- Analytics dashboard enhancements

---

## BEFORE YOU CODE: READ THESE (5 minutes)

### MUST READ (Every Session)

1. **This document** (AI-SESSION-BRIEF.md) - You're reading it now ✓
2. **[AI-BUILD-SESSION-CHECKLIST.md](./AI-BUILD-SESSION-CHECKLIST.md)** - Review Hand-Off from previous session, track current work ✓
3. [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Code patterns, naming conventions, commands
4. [CHANGELOG.md](../CHANGELOG.md) - Last 5-10 entries to see recent changes

### REFERENCE WHEN BUILDING

**System Architecture:**
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Complete end-to-end workflows
- [BATCHES.md](./BATCHES.md) - Batch-centric architecture (PRIMARY REFERENCE)
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Event-driven inventory system
- [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md) - Trigger system architecture

**Module-Specific:**
- [ORDERS.md](./ORDERS.md) - Order pipeline and fulfillment
- [SESSIONS.md](./SESSIONS.md) - Production session workflows
- [PRODUCTS.md](./PRODUCTS.md) - Product catalog and conversions
- [CUSTOMERS.md](./CUSTOMERS.md) - Customer management
- [COA-HANDLING.md](./COA-HANDLING.md) - Certificate of Analysis
- [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) - Documents and delivery
- [RECONCILIATION.md](./RECONCILIATION.md) - Inventory audits
- [ANALYTICS.md](./ANALYTICS.md) - Reporting and dashboards
- [TEST-MODE.md](./TEST-MODE.md) - Test mode system architecture

**UI/Frontend:**
- [UI-PATTERNS.md](./UI-PATTERNS.md) - Navigation, forms, modals, tables
- [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md) - Shared components API

---

## CRITICAL RULES (NON-NEGOTIABLE)

### 1. Centralized Type System

**✅ DO:**
- Import types from `src/types/index.ts`
- Use auto-generated `database.types.ts` as foundation
- Define domain types in `src/types/*.types.ts`
- Keep feature-specific types (UI state, props) in feature directories

**❌ DON'T:**
- Create duplicate type definitions
- Define Order, Batch, Product types in feature files
- Use `any` type without strong justification

**Verification:**
```bash
# Check centralized exports
grep "export \* from" src/types/index.ts
# Find duplicate definitions
grep -r "interface Order" src/features/
```

---

### 2. Minimal Edit Principle

**✅ DO:**
- Search codebase BEFORE creating new utilities
- Extend existing components/services
- Delete deprecated files immediately
- Keep file count minimal

**❌ DON'T:**
- Create `utils2.ts` when `utils.ts` exists
- Create separate service for single function
- Leave old implementations commented out
- Create new files without checking for existing solutions

**Example:**
```typescript
// ❌ BAD: Creating new duplicate service
// src/features/orders/services/newOrderService.ts

// ✅ GOOD: Extend existing service
// src/features/orders/services/ordersService.ts
export const ordersService = {
  ...existingMethods,
  newMethod: () => { /* new functionality */ }
};
```

---

### 3. Batch-Centric Architecture

**EVERY inventory item MUST link to a batch.**

**Batch Number Format:** `YYMMDD-STRAIN`
- Example: `251015-GPURP` (October 15, 2025 - Grand Daddy Purple)

**Package ID Format:** `YYMMDD-STRAIN-PKG`
- Inherits from batch
- Example: `251015-GPURP-PKG001`

**Database Requirement:**
- `batch_id` is **NOT NULL** in `inventory_items` table
- All inventory operations require valid batch reference
- Use `batches` table for batch metadata

**Why:** Enables full traceability from seed to sale, required for cannabis compliance.

---

### 4. Event-Driven Inventory System

**Use `inventoryMovementService` for ALL inventory changes.**

**✅ DO:**
```typescript
import { inventoryMovementService } from '@/services/inventoryMovement.service';

// Record movement (trigger updates inventory automatically)
await inventoryMovementService.recordMovement({
  movement_kind: 'FULFILLMENT',
  source_item_id: inventoryItemId,
  qty: 100,
  unit: 'g',
  reference_id: orderId,
  reference_type: 'order',
  notes: 'Order #12345 fulfillment'
});
// Database trigger automatically updates inventory_items.on_hand_qty
```

**❌ DON'T:**
```typescript
// NEVER directly update inventory quantities
await supabase
  .from('inventory_items')
  .update({ on_hand_qty: newQty }) // ❌ BREAKS AUDIT TRAIL
  .eq('id', itemId);
```

**Movement Types:**
- `PACKAGING` - Creating packaged goods
- `ADJUSTMENT` - Manual corrections
- `FULFILLMENT` - Order shipment
- `AUDIT_VARIANCE` - Audit corrections
- `CONVERSION` - Stage transformations
- `CANCELLATION` - Reversal movements

**Why:** Immutable audit trail, automatic balance updates, regulatory compliance.

---

### 5. Database Triggers (DO NOT MODIFY DIRECTLY)

**The database has sophisticated triggers that:**
- Update `inventory_items.on_hand_qty` based on ledger movements
- Maintain `batches.lifecycle_state` based on inventory status
- Track allocation health and availability
- Enforce business rules (quarantine gates, etc.)

**✅ DO:**
- Use movement service to create ledger entries
- Let triggers handle quantity updates
- Test trigger behavior with Test Mode system
- Document trigger interactions in code comments

**❌ DON'T:**
- Modify trigger SQL without deep understanding
- Bypass triggers with direct quantity updates
- Assume triggers run synchronously (they're AFTER triggers)
- Modify `inventory_ledger` table directly

**See:** [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md) for complete documentation.

---

### 6. Test Mode System

**Database-driven test isolation for safe experimentation.**

**How It Works:**
- `test_mode_context` table stores active test session
- All operations tagged with `test_mode_session_id`
- Audit log tracks all test operations
- Reset functionality removes test data atomically

**✅ DO:**
```typescript
import { testModeService } from '@/services/testMode.service';

// Check if test mode active
const { isActive, sessionId } = await testModeService.getStatus();

// Include session_id in test operations
if (isActive) {
  await recordMovement({
    ...data,
    test_mode_session_id: sessionId
  });
}
```

**❌ DON'T:**
- Create test data without test mode tagging
- Modify test_mode_context directly from client
- Assume test mode is always inactive
- Hard-delete test data (use service reset methods)

**See:** [TEST-MODE.md](./TEST-MODE.md) for complete documentation.

---

### 7. Code Style & Conventions

**Tailwind CSS:**
- Use Tailwind classes (already configured)
- Avoid inline styles unless absolutely necessary
- Follow mobile-first responsive design

**Icons:**
- Use `lucide-react` for all icons (already installed)
- Avoid installing other icon libraries

**File Organization:**
- Features in `src/features/[module]/`
- Shared types in `src/types/`
- Shared components in `src/shared/components/`
- Services in feature or shared directories

**Naming Conventions:**
- Components: PascalCase (e.g., `OrdersList.tsx`)
- Services: camelCase with `.service.ts` suffix
- Types: PascalCase with `.types.ts` suffix
- Hooks: camelCase starting with `use` (e.g., `useOrders.ts`)

**Comments:**
- Explain WHY, not WHAT
- Document non-obvious business logic
- Add JSDoc for public APIs

---

## COMMON TASKS QUICK REFERENCE

### Adding a New Feature

1. **Research first:**
   ```bash
   # Search for similar implementations
   grep -r "similar feature" src/
   # Check if types exist
   grep "FeatureType" src/types/
   ```

2. **Choose location:**
   - Feature-specific: `src/features/[module]/`
   - Shared utility: `src/shared/` or `src/lib/`

3. **Import centralized types:**
   ```typescript
   import type { Order, Product, Batch } from '@/types';
   ```

4. **Follow existing patterns:**
   - Check similar components/services
   - Use same error handling approach
   - Match UI patterns from UI-PATTERNS.md

5. **Document changes:**
   - Add CHANGELOG.md entry
   - Update module documentation if needed
   - Update DOCS-INTEGRATION-PROGRESS.md status

### Fixing a Bug

1. **Understand the issue:**
   - Reproduce the bug
   - Check error logs/console
   - Review related code

2. **Make minimal changes:**
   - Fix the specific issue
   - Don't refactor unrelated code
   - Preserve existing functionality

3. **Verify the fix:**
   ```bash
   npm run typecheck
   npm run build
   # Test the specific scenario
   ```

4. **Document the fix:**
   ```markdown
   ## Bug Fix: [Brief description]
   **Issue:** [What was broken]
   **Cause:** [Why it happened]
   **Solution:** [How you fixed it]
   **Files Changed:** [List files]
   **Verified:** [How you tested]
   ```

### Working with Inventory

**Always use the movement service:**
```typescript
import { inventoryMovementService } from '@/services/inventoryMovement.service';

// Create, move, adjust, fulfill, convert inventory
await inventoryMovementService.recordMovement({
  movement_kind: 'ADJUSTMENT',
  source_item_id: itemId,
  qty: adjustmentAmount,
  unit: 'g',
  notes: 'Reason for adjustment'
});
```

**Query current inventory:**
```typescript
// Use inventory service (includes business logic)
import { inventoryService } from '@/features/inventory/services/inventory.service';

const items = await inventoryService.getInventoryByStage('PACKAGED');
```

### Working with Orders

**Order status flow:**
```
submitted → processing → ready_for_delivery → delivered
```

**Fulfillment process:**
```typescript
import { packageAssignmentService } from '@/features/orders/services/packageAssignment.service';

// Assign packages to order
await packageAssignmentService.assignPackage(orderId, inventoryItemId);

// Record fulfillment movement
await inventoryMovementService.recordMovement({
  movement_kind: 'FULFILLMENT',
  source_item_id: inventoryItemId,
  qty: quantity,
  unit: 'g',
  reference_id: orderId,
  reference_type: 'order'
});
```

---

## VERIFICATION CHECKLIST

Before submitting code, verify:

- [ ] Types imported from `src/types/index.ts`
- [ ] No duplicate type definitions created
- [ ] Follows existing file structure
- [ ] Uses `inventoryMovementService` for inventory changes
- [ ] Never directly updates `on_hand_qty`
- [ ] Follows UI patterns from `UI-PATTERNS.md`
- [ ] `batch_id` never null in inventory operations
- [ ] Code style matches existing components
- [ ] Comments explain WHY, not WHAT
- [ ] No new npm packages installed without approval
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] CHANGELOG.md updated with changes
- [ ] Module documentation updated if needed

---

## WHEN IN DOUBT

1. **Check documentation:**
   - Start with DEVELOPER_QUICK_REFERENCE.md
   - Read relevant module documentation
   - Review SYSTEM-WORKFLOW.md for context

2. **Search existing code:**
   ```bash
   # Find similar implementations
   grep -r "pattern" src/
   # Check service usage
   grep -r "serviceName" src/
   ```

3. **Ask for clarification:**
   - Describe what you're trying to accomplish
   - Explain approaches you're considering
   - Ask about architectural impact

4. **Document decisions:**
   - Add comments explaining reasoning
   - Update CHANGELOG.md
   - Note any deviations from patterns

---

## RECENT ARCHITECTURAL DECISIONS

### Test Mode System (2025-11-24)
**Decision:** Database-driven test isolation with audit logging
**Rationale:** Safe experimentation without affecting production data
**Implementation:** `test_mode_context` table + audit log + reset utilities
**Status:** Complete, integrated with trigger testing dashboard

### Event-Driven Inventory (2025-10-21)
**Decision:** Immutable ledger with database triggers for balance updates
**Rationale:** Audit trail compliance + automatic calculations + data integrity
**Implementation:** `inventory_ledger` + triggers + movement service
**Status:** Production-ready, all modules integrated

### Batch-Centric Architecture (2025-10-20)
**Decision:** All inventory must link to batches (NOT NULL constraint)
**Rationale:** Cannabis traceability requirements + compliance
**Implementation:** `batches` table + hierarchical allocation + strain tracking
**Status:** Enforced at database level, all features compliant

### Centralized Type System (2025-10-12)
**Decision:** Single source of truth for domain types in `src/types/`
**Rationale:** Prevent duplication + ensure consistency + simplify refactoring
**Implementation:** `src/types/*.types.ts` + centralized exports
**Status:** Established standard, actively maintained

---

## USEFUL COMMANDS

```bash
# Development
npm run dev              # Start dev server (auto-reload)
npm run build           # Production build
npm run typecheck       # TypeScript validation
npm run lint            # ESLint validation

# Database
npm run types:generate  # Generate database types from Supabase

# Testing
npm run test            # Run Vitest tests
npm run test:ui         # Vitest UI mode
npm run test:coverage   # Generate coverage report

# Documentation
npm run docs:validate   # Validate documentation accuracy
```

---

## GETTING HELP

**Documentation:**
- Start: [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md)
- Architecture: [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md)
- Modules: Individual module docs (ORDERS.md, BATCHES.md, etc.)

**Code References:**
- Type definitions: `src/types/`
- Service implementations: `src/features/[module]/services/`
- Component patterns: `src/features/[module]/components/`

**Recent Changes:**
- [CHANGELOG.md](../CHANGELOG.md) - All system changes
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Module status

---

## EMERGENCY RECOVERY

If you realize you've made a mistake:

**Created Duplicate Types:**
1. Search for all usages: `grep -r "DuplicateType" src/`
2. Consolidate to `src/types/`
3. Update imports across codebase
4. Delete duplicate definitions

**Broke Existing Functionality:**
1. Stop immediately
2. Document what changed
3. Ask user for guidance
4. Consider rollback if necessary

**Used Wrong Pattern:**
1. Review relevant documentation
2. Identify correct pattern
3. Refactor to match established approach
4. Document lesson learned

**Made Architectural Change:**
1. Document the change and reasoning
2. Get user approval before proceeding
3. Update relevant documentation
4. Add CHANGELOG entry explaining decision

---

## SUCCESS METRICS

**Code Quality:**
- ✅ TypeScript compiles without errors
- ✅ Build succeeds without warnings
- ✅ No duplicate type definitions
- ✅ Follows established patterns
- ✅ Comprehensive error handling

**Documentation:**
- ✅ CHANGELOG.md updated
- ✅ Code comments explain reasoning
- ✅ Module docs reflect changes
- ✅ Breaking changes clearly noted

**Testing:**
- ✅ Manual testing performed
- ✅ Edge cases considered
- ✅ Error states handled gracefully
- ✅ No regressions introduced

---

**Last Updated:** 2025-11-26 by Claude AI
**Next Review:** As needed when architecture changes
**Maintainer:** Development team

---

**Ready to code?**
- Confirm you understand current phase
- Identify what you're building
- Review relevant module documentation
- Follow the critical rules above
- Ask questions before making assumptions

**Let's build something great! 🚀**
