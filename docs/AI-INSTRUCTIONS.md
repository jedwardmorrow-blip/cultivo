---
title: AI Development Instructions
category: AI Development
version: 1.0
updated: 2025-11-26
---

# AI Development Instructions

> **Purpose:** Rules and protocols for AI assistants working on this codebase
> **Audience:** AI assistants (Claude, GPT-4, etc.), developers using AI tools
> **Compliance:** Mandatory for all AI-generated code

---

## Table of Contents

1. [Session Start Protocol](#session-start-protocol)
2. [Before Writing Code](#before-writing-code)
3. [Code Modification Protocol](#code-modification-protocol)
4. [After Writing Code](#after-writing-code)
5. [Communication Guidelines](#communication-guidelines)
6. [Emergency Procedures](#emergency-procedures)
7. [Quality Gates](#quality-gates)
8. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Session Start Protocol

### Step 1: Read Documentation (REQUIRED)

**Every session MUST start by reading these documents:**

1. **[AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md)** (5-10 minutes)
   - Current system status
   - Implementation phase
   - Critical rules
   - Recent decisions

2. **[DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md)** (5 minutes)
   - Code patterns
   - Naming conventions
   - Common tasks
   - Useful commands

3. **[CHANGELOG.md](../CHANGELOG.md)** - Last 5-10 entries (2 minutes)
   - Recent changes
   - What was completed
   - Current work

**Total time investment:** 12-17 minutes
**Benefit:** Prevents hours of wasted effort and mistakes

---

### Step 2: Confirm Understanding

After reading documentation, you MUST confirm:

```markdown
✅ **Session Context Confirmed**

**System:** Cannabis seed-to-sale tracking system
**Phase:** [Current phase from AI-SESSION-BRIEF.md]
**Last Update:** [Date from CHANGELOG.md]
**Build Status:** [Status from AI-SESSION-BRIEF.md]

**My Mission This Session:**
[Brief description of what you're working on]

**Top 3 Rules I Must Follow:**
1. [Rule from AI-SESSION-BRIEF.md]
2. [Rule from AI-SESSION-BRIEF.md]
3. [Rule from AI-SESSION-BRIEF.md]

**Ready to proceed?** Yes/No
```

Do NOT start coding without this confirmation.

---

### Step 3: Identify Task Scope

Before proposing approach, clarify:

1. **What is being built/fixed?**
   - Specific feature or bug
   - User-facing or internal
   - New or modification

2. **Why is this needed?**
   - Business requirement
   - Bug fix
   - Technical debt
   - Performance improvement

3. **Where does it fit?**
   - Which module/feature
   - Existing files or new
   - Frontend, backend, or both

4. **Dependencies?**
   - Other features
   - Database changes
   - External services

---

## Before Writing Code

### Rule 1: Search for Existing Implementations

**ALWAYS search before creating:**

```bash
# Search for similar functionality
grep -r "similar pattern" src/

# Check if types exist
grep -r "interface TypeName" src/types/

# Find existing services
find src/ -name "*.service.ts"

# Check for existing components
find src/ -name "*ComponentName*.tsx"
```

**If found:** Extend or reuse
**If not found:** Create new (following patterns)

---

### Rule 2: Check Centralized Types

**Before defining ANY type, check:**

1. `src/types/index.ts` - Centralized type exports
2. `src/lib/database/database.types.ts` - Auto-generated database types
3. `src/types/*.types.ts` - Domain type definitions

**Import types from centralized location:**

```typescript
// ✅ CORRECT
import type { Order, Product, Batch, Customer } from '@/types';

// ❌ WRONG - Creating duplicate
interface Order {
  id: string;
  // ...
}
```

**Feature-specific types (UI state, props) can be local:**

```typescript
// ✅ OK - Feature-specific type
interface OrderFormState {
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

---

### Rule 3: Verify Architectural Patterns

**Read relevant documentation:**

- **Working with inventory?** → Read [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- **Working with orders?** → Read [ORDERS.md](./ORDERS.md)
- **Working with sessions?** → Read [SESSIONS.md](./SESSIONS.md)
- **Working with batches?** → Read [BATCHES.md](./BATCHES.md)

**Understand the pattern before coding.**

---

### Rule 4: Plan File Organization

**Determine correct location:**

```
src/
├── features/[module]/          # Feature-specific code
│   ├── components/             # UI components
│   ├── services/               # Business logic
│   ├── hooks/                  # React hooks
│   └── types/                  # Feature-specific types
├── shared/                     # Shared across features
│   ├── components/             # Reusable UI
│   ├── services/               # Shared logic
│   └── hooks/                  # Shared hooks
├── types/                      # Domain types (centralized)
├── lib/                        # Utilities, helpers
└── services/                   # Global services
```

**Ask yourself:**
- Is this feature-specific or shared?
- Does similar functionality already exist?
- Where would developers expect to find this?

---

## Code Modification Protocol

### Creating New Files

**Before creating, verify:**

1. ✅ Similar file doesn't exist
2. ✅ Location is appropriate
3. ✅ Name follows conventions
4. ✅ Imports from centralized types

**File naming conventions:**

```
Components:      PascalCase.tsx        (OrdersList.tsx)
Services:        camelCase.service.ts  (orders.service.ts)
Types:           camelCase.types.ts    (order.types.ts)
Hooks:           useCamelCase.ts       (useOrders.ts)
Utilities:       camelCase.ts          (formatDate.ts)
Constants:       SCREAMING_SNAKE.ts    (ORDER_STATUS.ts)
```

---

### Editing Existing Files

**Principles:**

1. **Preserve existing functionality** - Don't break what works
2. **Follow established patterns** - Match existing code style
3. **Minimal changes** - Fix only what needs fixing
4. **Comment reasoning** - Explain WHY for non-obvious changes

**Before editing:**

```typescript
// Read the entire file first
// Understand its purpose and patterns
// Identify where new code fits
// Match existing style (indentation, naming, structure)
```

**When adding functions:**

```typescript
// ✅ GOOD - Matches existing pattern
export const ordersService = {
  existingMethod: () => { /* ... */ },

  // New method follows same pattern
  newMethod: async (params: Params): Promise<Result> => {
    try {
      // Implementation
    } catch (error) {
      // Error handling matches existing style
    }
  }
};
```

---

### Type Definitions

**Centralized domain types (src/types/):**

```typescript
// ✅ Define once in src/types/order.types.ts
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  // ...
}

// Export from src/types/index.ts
export * from './order.types';
```

**Feature-specific types (feature directories):**

```typescript
// ✅ OK in src/features/orders/types/index.ts
export interface OrderFormState {
  isLoading: boolean;
  errors: Record<string, string>;
}

export interface OrderFilterParams {
  status?: OrderStatus;
  dateRange?: [Date, Date];
}
```

**Never duplicate domain types:**

```typescript
// ❌ WRONG - Don't redefine Order in feature file
interface Order {  // This is a duplicate!
  id: string;
  // ...
}
```

---

### Working with Inventory

**CRITICAL RULE: Always use inventoryMovementService**

```typescript
// ✅ CORRECT
import { inventoryMovementService } from '@/services/inventoryMovement.service';

await inventoryMovementService.recordMovement({
  movement_kind: 'FULFILLMENT',
  source_item_id: inventoryItemId,
  qty: 100,
  unit: 'g',
  reference_id: orderId,
  reference_type: 'order',
  notes: 'Order fulfillment'
});
// Trigger automatically updates inventory_items.on_hand_qty
```

```typescript
// ❌ WRONG - Never update directly
await supabase
  .from('inventory_items')
  .update({ on_hand_qty: newQty })  // BREAKS AUDIT TRAIL
  .eq('id', itemId);
```

**Movement kinds available:**

```typescript
type MovementKind =
  | 'PACKAGING'      // Session creates packaged goods
  | 'ADJUSTMENT'     // Manual correction
  | 'FULFILLMENT'    // Order shipment
  | 'AUDIT_VARIANCE' // Physical count correction
  | 'CONVERSION'     // Stage transformation
  | 'CANCELLATION'   // Session reversal
  | 'COMBINE'        // Package consolidation
```

---

### Database Operations

**Use Supabase client from lib:**

```typescript
import { supabase } from '@/lib/supabase';

// Query data
const { data, error } = await supabase
  .from('orders')
  .select('*, order_items(*)')
  .eq('status', 'processing');

// Handle errors
if (error) {
  console.error('Error fetching orders:', error);
  throw error;
}
```

**Never modify these tables directly:**

- ❌ `inventory_items.on_hand_qty` (use movement service)
- ❌ `batches.lifecycle_state` (trigger updates automatically)
- ❌ `inventory_ledger` (immutable except via movement service)

---

### Error Handling

**Pattern to follow:**

```typescript
try {
  // Operation
  const result = await someOperation();
  return result;
} catch (error) {
  console.error('Context-specific error message:', error);
  throw error; // Re-throw for caller to handle
}
```

**For user-facing operations:**

```typescript
import { notificationService } from '@/services/notification.service';

try {
  await riskyOperation();
  notificationService.success('Operation completed successfully');
} catch (error) {
  console.error('Operation failed:', error);
  notificationService.error('Failed to complete operation');
  throw error;
}
```

---

### UI Components

**Follow existing patterns:**

```tsx
// Standard component structure
import React, { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import type { ComponentProps } from '@/types';

export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State
  const [loading, setLoading] = useState(false);

  // Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // Handlers
  const handleAction = async () => {
    try {
      setLoading(true);
      // Operation
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <div className="container mx-auto p-4">
      {/* Content */}
    </div>
  );
};
```

**Use Tailwind CSS:**

```tsx
// ✅ Use Tailwind classes
<div className="bg-white rounded-lg shadow-md p-4">
  <h2 className="text-xl font-semibold mb-2">Title</h2>
</div>

// ❌ Avoid inline styles
<div style={{ background: 'white', padding: '1rem' }}>
  <h2 style={{ fontSize: '1.25rem' }}>Title</h2>
</div>
```

**Use Lucide React for icons:**

```tsx
import { Package, AlertCircle, Check } from 'lucide-react';

<Package className="w-5 h-5 text-blue-600" />
<AlertCircle className="w-4 h-4 text-red-600" />
<Check className="w-6 h-6 text-green-600" />
```

---

## After Writing Code

### Step 1: Self-Review Checklist

Before submitting code, verify:

#### Type Safety
- [ ] Types imported from `src/types/index.ts`
- [ ] No duplicate type definitions created
- [ ] No `any` types without strong justification
- [ ] TypeScript compiles: `npm run typecheck`

#### Architecture
- [ ] Follows established patterns
- [ ] Uses centralized services (inventory, notifications)
- [ ] No direct database updates (uses movement service)
- [ ] Batch-centric (batch_id never null)

#### Code Quality
- [ ] Code style matches existing files
- [ ] Comments explain WHY not WHAT
- [ ] Error handling included
- [ ] No console.logs left in (except error logging)

#### File Organization
- [ ] Files in correct locations
- [ ] Naming conventions followed
- [ ] Imports organized (React → libraries → local)
- [ ] No unused imports

#### Testing
- [ ] Build succeeds: `npm run build`
- [ ] Manual testing performed
- [ ] Edge cases considered
- [ ] Error states handled

---

### Step 2: Documentation Updates

**Update CHANGELOG.md:**

```markdown
## [Date] - [Brief Title]

**Type:** Feature / Bug Fix / Enhancement / Refactor
**Module:** [orders / inventory / sessions / etc.]
**Files Changed:**
- path/to/file1.ts
- path/to/file2.tsx

**Description:**
[What was built/fixed]

**Why:**
[Business reason or technical motivation]

**Implementation:**
[Key technical decisions]

**Testing:**
[How it was verified]

**Build Status:** ✅ Passing
```

**Update module documentation if needed:**

If you added new functionality, update relevant docs:
- [ORDERS.md](./ORDERS.md) - Order-related changes
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Inventory changes
- [SESSIONS.md](./SESSIONS.md) - Session workflow changes
- etc.

**Update DOCS-INTEGRATION-PROGRESS.md:**

If you completed a feature or changed status:

```markdown
| Module | Status | Evidence | Next Action |
|--------|--------|----------|-------------|
| Orders | ✅ Complete | CHANGELOG 2025-XX-XX | Maintenance |
```

---

### Step 3: Verify Build

**Run these commands:**

```bash
# Type check
npm run typecheck
# Should pass with no errors

# Build
npm run build
# Should succeed and output: "✓ built in XXXms"

# Optional: Run tests
npm run test
```

**If build fails:**

1. Read error messages carefully
2. Fix TypeScript errors first
3. Check for missing imports
4. Verify file paths are correct
5. Don't submit broken code

---

## Communication Guidelines

### Proposing Approach

**Before coding, explain your plan:**

```markdown
## Proposed Approach: [Feature Name]

**Goal:** [What you're trying to accomplish]

**Files to modify:**
1. `src/features/module/Component.tsx` - [What changes]
2. `src/features/module/services/service.ts` - [What changes]

**New files to create:**
1. `src/features/module/NewComponent.tsx` - [Purpose]

**Key decisions:**
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

**Alternatives considered:**
- [Alternative approach]: [Why not chosen]

**Testing plan:**
- [How you'll verify it works]

**Questions:**
- [Any uncertainties or clarifications needed]
```

**Wait for approval before coding large changes.**

---

### Explaining Code

**For non-obvious logic:**

```typescript
// ✅ GOOD - Explains WHY
// We must check quarantine status before allowing fulfillment
// because AZDHS regulations prohibit shipping untested product
if (batch.coa_status !== 'approved') {
  throw new Error('Cannot fulfill: COA not approved');
}

// ❌ BAD - States the obvious
// Check if COA is approved
if (batch.coa_status !== 'approved') {
```

---

### Asking Questions

**When unclear, ask before assuming:**

```markdown
**Question:** Should this feature support bulk operations?

**Context:** Currently implementing order fulfillment. The UI allows
selecting one package at a time. Should we support selecting multiple
packages in one action?

**My recommendation:** Start with single selection for MVP, add bulk
later if needed.

**Trade-offs:**
- Single: Simpler, faster to implement, less error-prone
- Bulk: More efficient for users, but complex validation

**What would you prefer?**
```

---

### Reporting Issues

**If you discover a problem:**

```markdown
**Issue Found:** [Brief description]

**Location:** `src/path/to/file.ts:line`

**Severity:** Critical / High / Medium / Low

**Problem:**
[Detailed explanation of the issue]

**Reproduction:**
1. Step 1
2. Step 2
3. Observe issue

**Impact:**
[What breaks or what's affected]

**Proposed fix:**
[Your recommendation]

**Should I fix this now, or create a separate task?**
```

---

## Emergency Procedures

### If You Created Duplicate Types

**Immediate action:**

1. **Stop coding** - Don't continue with duplicates
2. **Search for all usages:**
   ```bash
   grep -r "DuplicateTypeName" src/
   ```
3. **Consolidate to `src/types/`:**
   - Move definition to appropriate `*.types.ts` file
   - Export from `src/types/index.ts`
4. **Update all imports:**
   ```typescript
   // Change from
   import { Type } from '../local/types';
   // To
   import { Type } from '@/types';
   ```
5. **Delete duplicate definitions**
6. **Verify build:** `npm run typecheck && npm run build`

---

### If You Broke Existing Functionality

**Immediate action:**

1. **Stop** - Don't make it worse
2. **Document what changed:**
   ```markdown
   - Changed: [File and function]
   - Broke: [What functionality]
   - Symptoms: [What errors occur]
   ```
3. **Attempt to rollback:**
   - Revert your changes
   - Restore original code
   - Verify functionality restored
4. **Ask for guidance:**
   "I attempted to [goal] by [approach], but it broke [functionality].
   Should I try a different approach or need help?"

---

### If You Used Wrong Pattern

**Corrective action:**

1. **Identify correct pattern:**
   - Review relevant documentation
   - Find similar implementations
   - Understand why pattern exists
2. **Refactor to match:**
   - Update your code to follow pattern
   - Test thoroughly
   - Document why you changed approach
3. **Learn from it:**
   - Add comment explaining correct pattern
   - Update personal notes
   - Less likely to repeat mistake

---

### If You Made Architectural Change

**Required protocol:**

1. **Document the change:**
   ```markdown
   ## Architectural Change: [Brief title]

   **What changed:** [Technical description]

   **Why:** [Business or technical reason]

   **Impact:** [What's affected]

   **Migration:** [How to update existing code]

   **Rollback plan:** [How to undo if needed]
   ```
2. **Get user approval** - Don't proceed without confirmation
3. **Update architecture docs** - Keep documentation current
4. **Add CHANGELOG entry** - Explain decision for future reference

---

## Quality Gates

### Required Standards

**All code must meet these standards:**

1. **Type Safety:** TypeScript strict mode, no `any` without justification
2. **Error Handling:** Try-catch blocks, meaningful error messages
3. **Documentation:** Comments explaining WHY for complex logic
4. **Testing:** Manual verification of functionality
5. **Build:** Must compile without errors or warnings
6. **Patterns:** Follows established conventions

---

### Code Review Checklist

**Before submitting, review:**

```markdown
## Code Quality Review

### Type Safety
- [ ] No duplicate types
- [ ] Imports from centralized location
- [ ] TypeScript compiles cleanly
- [ ] No unsafe `any` types

### Architecture
- [ ] Follows batch-centric principles
- [ ] Uses inventory movement service
- [ ] Respects database triggers
- [ ] Test mode compatible

### Implementation
- [ ] Error handling included
- [ ] Edge cases considered
- [ ] Loading states handled
- [ ] No memory leaks

### Code Style
- [ ] Matches existing patterns
- [ ] Consistent naming
- [ ] Proper file organization
- [ ] Clean imports

### Documentation
- [ ] Comments explain reasoning
- [ ] CHANGELOG.md updated
- [ ] Module docs updated if needed
- [ ] Type definitions documented

### Testing
- [ ] Build succeeds
- [ ] Manual testing completed
- [ ] No regressions
- [ ] Error states tested
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Creating Duplicate Types

```typescript
// WRONG - Redefining Order in feature
interface Order {
  id: string;
  order_number: string;
  // ...
}
```

**Solution:** Import from `@/types`

```typescript
// CORRECT
import type { Order } from '@/types';
```

---

### ❌ Mistake 2: Directly Updating Inventory

```typescript
// WRONG - Bypasses audit trail
await supabase
  .from('inventory_items')
  .update({ on_hand_qty: newQty })
  .eq('id', itemId);
```

**Solution:** Use movement service

```typescript
// CORRECT
await inventoryMovementService.recordMovement({
  movement_kind: 'ADJUSTMENT',
  source_item_id: itemId,
  qty: changeAmount,
  unit: 'g',
  notes: 'Reason for adjustment'
});
```

---

### ❌ Mistake 3: Creating New File When One Exists

```bash
# WRONG - Creating duplicate
touch src/features/orders/services/orderService2.ts
```

**Solution:** Search first, extend existing

```bash
# CORRECT - Search for existing
find src/ -name "*order*service*"
# Extend found service instead
```

---

### ❌ Mistake 4: Not Handling Errors

```typescript
// WRONG - Silent failure
const data = await fetchOrders();
```

**Solution:** Proper error handling

```typescript
// CORRECT
try {
  const data = await fetchOrders();
  return data;
} catch (error) {
  console.error('Failed to fetch orders:', error);
  notificationService.error('Could not load orders');
  throw error;
}
```

---

### ❌ Mistake 5: Ignoring Batch Requirements

```typescript
// WRONG - Creating inventory without batch
await supabase
  .from('inventory_items')
  .insert({
    product_id: productId,
    qty: 100,
    batch_id: null  // ❌ NOT NULL constraint will fail
  });
```

**Solution:** Always include batch_id

```typescript
// CORRECT
await supabase
  .from('inventory_items')
  .insert({
    product_id: productId,
    qty: 100,
    batch_id: batchId  // ✅ Required
  });
```

---

### ❌ Mistake 6: Inconsistent Naming

```bash
# WRONG - Inconsistent patterns
OrderList.tsx      # Missing 's'
order-service.ts   # Kebab case instead of camel
UseOrders.ts       # Missing lowercase 'use'
```

**Solution:** Follow conventions

```bash
# CORRECT
OrdersList.tsx
orders.service.ts
useOrders.ts
```

---

### ❌ Mistake 7: Installing Unnecessary Packages

```bash
# WRONG - Adding new dependencies without checking
npm install moment lodash axios
```

**Solution:** Use existing tools

```bash
# CORRECT - Use built-in or existing
# Date handling: Use native Date or existing utils
# Utilities: Check lib/utils.ts
# HTTP: Use fetch or Supabase client
```

---

## Summary

**Remember these key principles:**

1. 📖 **Read documentation first** - 15 minutes saves hours
2. 🔍 **Search before creating** - Extend, don't duplicate
3. 🏗️ **Follow architecture** - Batch-centric, event-driven
4. 📝 **Document changes** - CHANGELOG.md every time
5. ✅ **Test thoroughly** - Build + manual verification
6. 🎯 **Minimal edits** - Fix what's needed, nothing more
7. 💬 **Communicate clearly** - Ask before assuming
8. 🚨 **Handle errors** - Never fail silently

**Success formula:**

```
Good Code = Documentation Read + Patterns Followed + Tests Passed + Changes Documented
```

---

**Questions about these instructions?**

- Consult [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md)
- Review [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md)
- Ask user for clarification

**Happy coding!** 🚀

---

**Last Updated:** 2025-11-26 by Claude AI
**Next Review:** As needed when development practices evolve
**Maintainer:** Development team
