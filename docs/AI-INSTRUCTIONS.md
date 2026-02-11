---
title: AI Development Instructions
category: AI Development
version: 2.0
updated: 2026-02-11
---

# AI Development Instructions

Rules and protocols for AI assistants working on this codebase.

---

## Session Start Protocol

1. Read [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md) - System context, critical rules, current state
2. Read the Hand-Off section in [AI-BUILD-SESSION-CHECKLIST.md](./AI-BUILD-SESSION-CHECKLIST.md)
3. If touching inventory/sessions: read [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)
4. If touching conversions: read [PRODUCT-FLOW.md](./PRODUCT-FLOW.md)
5. Scan last 3-5 entries in [CHANGELOG.md](../CHANGELOG.md)

Do NOT start coding without understanding the current state.

---

## Before Writing Code

### Search First
Always search for existing implementations before creating new files:
- Check `src/types/` for existing type definitions
- Check `src/features/[module]/services/` for existing services
- Check existing components for patterns to follow

### Centralized Types
- Import domain types from `@/types` (Order, Batch, Product, Customer, etc.)
- Feature-specific types (UI state, props) can live in feature directories
- Never duplicate domain type definitions

### File Organization
```
src/features/[module]/components/    # UI components (PascalCase.tsx)
src/features/[module]/services/      # Business logic (camelCase.service.ts)
src/features/[module]/hooks/         # React hooks (useCamelCase.ts)
src/features/[module]/types/         # Feature-specific types
src/types/                           # Centralized domain types
src/shared/                          # Cross-feature shared code
src/lib/                             # Core utilities
src/services/                        # Global services
```

---

## Code Modification Protocol

### Editing Existing Files
1. Read the entire file first
2. Understand its purpose and patterns
3. Match existing code style
4. Make minimal changes -- fix only what needs fixing

### Working with Inventory
Use `inventoryMovementService.recordMovement()` for ALL quantity changes. Never directly update `on_hand_qty`. See [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md).

### Error Handling
```typescript
try {
  const result = await someOperation();
  notificationService.success('Done');
  return result;
} catch (error) {
  console.error('Context-specific message:', error);
  notificationService.error('Failed');
  throw error;
}
```

### UI Components
- Use Tailwind CSS classes (no inline styles)
- Use Lucide React for icons
- Follow existing component patterns in the same module

---

## After Writing Code

### Verification
```bash
npm run build            # Must pass
npm run typecheck        # Check for type errors
```

### Documentation Updates
1. Update [CHANGELOG.md](../CHANGELOG.md) for significant changes
2. Update the Hand-Off section in [AI-BUILD-SESSION-CHECKLIST.md](./AI-BUILD-SESSION-CHECKLIST.md)
3. If new architectural decision: add to [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)
4. If module status changed: update [MODULE-STATUS.md](./MODULE-STATUS.md)

---

## Common Mistakes to Avoid

1. Creating duplicate type definitions instead of importing from `@/types`
2. Directly updating inventory quantities instead of using movement service
3. Creating `newService.ts` when extending existing service would work
4. Leaving old/commented-out code instead of deleting it
5. Not checking `batch_id` is present in inventory operations
6. Modifying database triggers without understanding the full trigger chain
7. Forgetting to update the Hand-Off section at end of session
