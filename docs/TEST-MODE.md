---
title: TEST-MODE
category: Platform, Settings & Testing
version: 2.0
updated: 2025-11-26
---

# TEST PORTAL - Sandbox Environment for Testing & Training

> **Status:** ✅ Fully Implemented (November 2025)
> **Architecture:** Dual-Portal System with Complete Data Isolation
> **Purpose:** Provide a completely isolated sandbox environment for testing workflows without affecting production data
> **Critical:** Test Portal is a separate workspace - not a mode toggle within production
> **Cross-References:** [SETTINGS](./SETTINGS.md), [INVENTORY-TRACKING](./INVENTORY-TRACKING.md), [SYSTEM-WORKFLOW](./SYSTEM-WORKFLOW.md)

---

## TABLE OF CONTENTS

1. [Concept: Dual-Portal Architecture](#concept-dual-portal-architecture)
2. [How to Switch Portals](#how-to-switch-portals)
3. [Production Portal vs Test Portal](#production-portal-vs-test-portal)
4. [When to Use Test Portal](#when-to-use-test-portal)
5. [Data Isolation & Safety](#data-isolation--safety)
6. [Visual Differentiation](#visual-differentiation)
7. [Test Portal Features](#test-portal-features)
8. [Reset & Data Management](#reset--data-management)
9. [Validation Bypasses](#validation-bypasses)
10. [Audit Trail](#audit-trail)
11. [Developer Integration](#developer-integration)
12. [FAQ](#faq)

---

## Concept: Dual-Portal Architecture

The Test Portal is **not a toggle** - it's a completely separate workspace within the same application.

### The Two Portals

```
┌─────────────────────────────────────────────────────────────┐
│                      CULT CANNABIS APP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐      ┌─────────────────────────┐│
│  │  PRODUCTION PORTAL   │      │     TEST PORTAL         ││
│  │  ════════════════════ │      │  ═══════════════════════││
│  │                      │      │                         ││
│  │  • Real data         │      │  • Test data only       ││
│  │  • Full validations  │      │  • Relaxed validations  ││
│  │  • Compliance mode   │      │  • Learning mode        ││
│  │  • Production        │      │  • Sandbox              ││
│  │                      │      │  • Reset anytime        ││
│  └──────────────────────┘      └─────────────────────────┘│
│           ▲                              ▲                  │
│           │                              │                  │
│           └──────────┬───────────────────┘                  │
│                      │                                      │
│              Portal Switcher                                │
│         (Top navigation toggle)                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Complete Data Isolation**
   - Production queries ONLY see production data (`test_mode = false`)
   - Test queries ONLY see test data (`test_mode = true`)
   - No mixing, no confusion, no accidents

2. **Intentional Switching**
   - Users must explicitly switch portals
   - Portal switcher prominently displayed in navigation
   - Visual feedback confirms current portal

3. **Safe Experimentation**
   - Test Portal is a playground - break things, try workflows
   - Reset test data anytime without affecting production
   - All test operations logged for review

---

## When to Use Test Mode

### ✅ Good Use Cases

- **Initial Facility Onboarding:** Learning the system workflows and interfaces
- **Staff Training:** Teaching new employees order management and fulfillment
- **Workflow Validation:** Verifying the system supports your operational processes
- **Feature Testing:** Trying new features without impacting real inventory
- **Process Documentation:** Creating training materials and SOPs
- **UAT Testing:** User acceptance testing before go-live

### ❌ Inappropriate Use Cases

- **Production Operations:** Never use test mode for actual business operations
- **Real Inventory Tracking:** Test mode bypasses inventory accuracy
- **Compliance Documentation:** Test documents are watermarked and not compliant
- **Customer Orders:** Real customer orders must not be processed in test mode
- **Financial Reporting:** Test mode data is not suitable for business analytics

---

## What Test Mode Does

### Validation Bypasses

Test mode **relaxes** but does not eliminate all validations:

```
┌─────────────────────────────────────────────────────────────────────┐
│ TEST MODE BYPASS LAYER                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ✅ BYPASSED IN TEST MODE:                                           │
│   • On-hand quantity validations (allows orders with 0 inventory)   │
│   • Available-to-Promise calculations (always shows sufficient qty) │
│   • Batch allocation requirements (can fulfill without allocation)  │
│   • Minimum order quantity rules                                     │
│   • Credit limit checks                                              │
│   • Inventory movement logging requirements                          │
│                                                                       │
│ ⚠️ STILL ENFORCED IN TEST MODE:                                     │
│   • Required field validations (customer, products, quantities)     │
│   • Data type validations (numbers, dates, text formats)            │
│   • Referential integrity (customers and products must exist)       │
│   • Business logic (order totals, pricing calculations)             │
│   • Authentication and authorization (user permissions)              │
│                                                                       │
│ 🔒 NEVER BYPASSED:                                                  │
│   • Database constraints (NOT NULL, UNIQUE, FOREIGN KEY)            │
│   • RLS policies (security remains enforced)                        │
│   • User authentication (login still required)                      │
│   • Batch immutability (batch_id cannot be changed)                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Document Watermarking

All documents generated in test mode are watermarked:

- **Invoices:** "TEST MODE - NOT FOR COMPLIANCE" diagonal watermark
- **Labels:** "TEST" indicator in red text
- **Manifests:** "TEST MANIFEST - TRAINING PURPOSES ONLY" header
- **Coversheets:** "TEST COVERSHEET - NON-COMPLIANT" watermark

This ensures test documents cannot be confused with production documents.

---

## Architecture Overview

### Test Mode State Management

```
┌──────────────────────────────────────────────────────────────────┐
│                     TEST MODE ARCHITECTURE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  app_settings table                                               │
│  └─ test_mode_enabled: boolean (default: false)                  │
│                                                                    │
│  React Context Provider                                           │
│  └─ TestModeContext                                               │
│     ├─ isTestMode: boolean (from app_settings)                   │
│     ├─ toggleTestMode: () => Promise<void>                       │
│     └─ auditLog: TestModeAuditEntry[]                            │
│                                                                    │
│  Local Storage                                                    │
│  └─ test_mode_preference (persists UI state)                     │
│                                                                    │
│  Validation Layer                                                 │
│  └─ All validations check isTestMode flag                        │
│     ├─ if (isTestMode) return { valid: true, bypassed: true }   │
│     └─ else return actual validation result                      │
│                                                                    │
│  Audit Trail                                                      │
│  └─ test_mode_audit_log table                                    │
│     ├─ Records every bypassed validation                         │
│     ├─ Captures user, timestamp, context                         │
│     └─ Enables review of test actions                            │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Check Test Mode → Route to Handler
                    │
                    ├─ Test Mode ON → Bypass Validations → Audit Log → Continue
                    │
                    └─ Test Mode OFF → Normal Validations → Enforce Rules
```

---

## Validation Bypasses

### Inventory Validations

**Bypassed:**
- On-hand quantity checks (can order 100g when only 10g available)
- Available-to-Promise calculations (ignores existing allocations)
- Inventory movement logging (optional in test mode)
- Negative inventory prevention (can go below zero)

**Impact:** Orders can be created and fulfilled without actual inventory. This allows testing the complete workflow even with an empty inventory system.

**Audit Entry Example:**
```json
{
  "validation": "on_hand_quantity_check",
  "bypassed": true,
  "context": {
    "order_id": "uuid",
    "product": "Flower - 3.5g - GSC",
    "requested_qty": 100,
    "available_qty": 10,
    "message": "Test mode: Allowed order exceeding available inventory"
  }
}
```

### Batch Allocation Bypasses

**Bypassed:**
- Batch allocation requirement for fulfillment
- Strain matching validation (can allocate wrong strain in test mode)
- Batch availability checks

**Impact:** Orders can be marked ready for delivery without batch allocations. Useful for testing fulfillment workflows before batches are set up.

### Order Validations

**Bypassed:**
- Minimum order quantity rules
- Credit limit checks
- Scheduled delivery date constraints

**Still Enforced:**
- Customer selection required
- At least one product required
- Valid quantities (must be > 0)
- Valid pricing (must be numeric)

---

## Visual Indicators

### Test Mode Banner

When test mode is enabled, a prominent banner appears at the top of every page:

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️ TEST MODE ACTIVE - Inventory Validations Bypassed            │
│ This system is in testing mode. Do not use for production.      │
│                                               [Disable Test Mode]│
└──────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Orange/amber background color
- Warning icon
- Visible on all screens
- Cannot be dismissed (persists until test mode disabled)

### Test Mode Badges

Individual screens show what validations are bypassed:

- **Orders Page:** "Test Mode: No inventory checks" badge
- **Fulfillment Screen:** "Test Mode: Allocation optional" badge
- **Inventory Screen:** "Test Mode: Negative qty allowed" badge

### Document Watermarks

All generated documents include clear test mode indicators:

- Invoices: Diagonal "TEST MODE" watermark in light gray
- Labels: Red "TEST" text in corner
- Manifests: "TRAINING PURPOSES ONLY" header
- Coversheets: "NON-COMPLIANT" watermark

---

## Audit Trail

### Test Mode Audit Log

Every bypassed validation is recorded for review:

**Schema: `test_mode_audit_log`**

```sql
CREATE TABLE test_mode_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  validation_bypassed text NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Example Audit Entries:**

```
| Timestamp           | User         | Action            | Validation Bypassed         | Context                    |
|---------------------|--------------|-------------------|----------------------------|----------------------------|
| 2025-11-20 10:30:15 | john@cult.co | Create Order      | on_hand_quantity_check     | Product: GSC 3.5g, Qty: 50|
| 2025-11-20 10:31:42 | john@cult.co | Mark Ready        | batch_allocation_required  | Order: ORD-2025-001       |
| 2025-11-20 10:33:18 | john@cult.co | Generate Invoice  | compliance_document_check  | Invoice: INV-2025-001     |
```

### Audit Review Interface

The audit log can be viewed in Settings → Test Mode → Audit Log:

- Filter by user, date range, validation type
- Export to CSV for analysis
- Clear old audit entries
- Summary statistics (validations bypassed by type)

---

## Enabling and Disabling Test Mode

### Enable Test Mode

**Location:** Settings → Test Mode

**Steps:**
1. Navigate to Settings page
2. Click "Test Mode" in settings navigation
3. Click "Enable Test Mode" button
4. Confirm warning dialog:
   ```
   ⚠️ Enable Test Mode?

   Test mode bypasses inventory and business validations.
   Only use for training and testing purposes.

   • Orders can be created without inventory
   • Documents will be watermarked as test
   • All actions are logged for review

   [Cancel] [Enable Test Mode]
   ```
5. Test mode banner appears across application

### Disable Test Mode

**Steps:**
1. Click "Disable Test Mode" button in banner or settings
2. Confirm dialog:
   ```
   Disable Test Mode?

   This will restore normal inventory validations.
   Test data can be cleaned up separately.

   [Cancel] [Disable Test Mode]
   ```
3. Test mode banner disappears
4. Normal validations resume

### Test Mode Persistence

- Test mode state stored in `app_settings` table (server-side)
- UI preference cached in local storage (client-side)
- State syncs across browser tabs
- Survives page refreshes and browser restarts

---

## Testing Workflows

### Recommended Testing Sequence

**Phase 1: Order Creation (30 minutes)**
- Create 5-10 test orders using different customers
- Vary product quantities and types
- Test order editing and deletion
- Verify order number generation
- Check order totals and pricing

**Phase 2: Batch Allocation (30 minutes)**
- Create test batches with different strains
- Practice allocating batches to order items
- Test allocation modifications
- Verify batch availability displays
- Check allocation summaries

**Phase 3: Fulfillment (45 minutes)**
- Mark orders as ready for fulfillment
- Assign packages to order items
- Practice fulfillment workflow
- Test status transitions
- Verify fulfillment validation (still enforced items)

**Phase 4: Document Generation (45 minutes)**
- Generate invoices for test orders
- Create labels for test packages
- Generate manifests for delivery routes
- Create coversheets for orders
- Verify all documents have test watermarks

**Phase 5: End-to-End Workflow (60 minutes)**
- Complete full order workflow from creation to delivery
- Test with multiple orders simultaneously
- Practice error recovery scenarios
- Verify data consistency
- Review audit trail of actions

### Testing Checklist

```
Order Management:
□ Create new order
□ Edit existing order
□ Delete order
□ Add products to order
□ Update quantities
□ Change customer
□ Set delivery date

Batch Operations:
□ View available batches
□ Allocate batch to order
□ Modify allocation
□ View allocation summary
□ Check batch availability

Fulfillment:
□ View orders ready for fulfillment
□ Assign packages to items
□ Mark order ready for delivery
□ Verify status transitions
□ Check validation messages

Documents:
□ Generate invoice (verify watermark)
□ Generate labels (verify TEST indicator)
□ Generate manifest (verify training header)
□ Generate coversheet (verify non-compliant mark)
□ Print documents to verify formatting

System Features:
□ Test user permissions (if multiple users)
□ Test search functionality
□ Test filters and sorting
□ Test real-time updates (if multiple tabs)
□ Test error messages
```

---

## Transitioning to Production

### Pre-Production Checklist

Before disabling test mode and using the system for production:

**Documentation:**
- [ ] All workflows have been tested end-to-end
- [ ] Staff trained on system operations
- [ ] Process documentation created
- [ ] Troubleshooting procedures documented
- [ ] Escalation paths defined

**Data Preparation:**
- [ ] Customer list imported and verified
- [ ] Product catalog complete and accurate
- [ ] Batch records created for current inventory
- [ ] Initial inventory quantities reconciled
- [ ] Settings configured (company info, licenses, etc.)

**System Validation:**
- [ ] All required workflows function correctly
- [ ] Document generation produces compliant output
- [ ] User permissions configured appropriately
- [ ] Backup procedures tested
- [ ] Support contact established

### Clean Up Test Data

Before going live, remove test data:

**Settings → Test Mode → Data Cleanup:**

```
Clean Up Test Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select data to remove:
☑ Test orders (23 orders found)
☑ Test batch allocations (15 allocations)
☑ Test documents (8 invoices, 12 labels, 3 manifests)
☐ Test customers (keep for training purposes)
☐ Test products (keep for reference)
☑ Test mode audit log (2,156 entries)

⚠️ This action cannot be undone. Ensure you have
completed all necessary testing before proceeding.

[Cancel] [Clean Up Test Data]
```

**What Gets Deleted:**
- Orders created in test mode (tracked by audit log)
- Batch allocations associated with test orders
- Documents generated in test mode (invoices, labels, manifests, coversheets)
- Test mode audit log entries (optional)

**What Gets Preserved:**
- Customers (may be real customers used for testing)
- Products (needed for production)
- Batches (may be real batches)
- User accounts
- Settings configuration

### Disable Test Mode

After cleanup:
1. Disable test mode in Settings
2. Verify normal validations are enforced
3. Create a real order to confirm system ready
4. Monitor for any issues in first few hours

---

## Implementation Status

### Current Status: 🟡 In Progress

**Completed:**
- Documentation created
- Architecture designed
- Test mode requirements defined

**In Progress:**
- Database schema implementation (Phase 2)
- Configuration service layer (Phase 2)
- Test mode context provider (Phase 2)

**Planned:**
- UI components (Phase 4)
- Validation bypass layer (Phase 4)
- Audit trail system (Phase 2)
- Testing utilities (Phase 4)

**Timeline:**
- Phase 1 (Documentation): Complete
- Phase 2 (Database & Config): In Progress
- Phase 3 (Event-Driven Inventory): Planned
- Phase 4 (UI & UX): Planned
- Expected Completion: 2-3 weeks

### Dependencies

- Settings module (documented)
- App settings table (exists)
- Authentication system (implemented)
- Order management (implemented)
- Inventory system (hybrid architecture)

### Migration Strategy

Test mode will be implemented alongside event-driven inventory:
- Test mode provides immediate facility validation capability
- Event-driven inventory implemented in parallel
- Both features complement each other
- Test mode helps validate event-driven inventory implementation
- Phased rollout ensures stability

---

## Related Documentation

### Core Architecture
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Test mode workflow integration
- [BATCHES.md](./BATCHES.md) - Batch allocation with test mode
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Inventory bypasses in test mode

### Feature Modules
- [ORDERS.md](./ORDERS.md) - Order creation and fulfillment
- [SETTINGS.md](./SETTINGS.md) - Test mode configuration
- [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) - Document generation
- [LABELS.md](./LABELS.md) - Label generation with test indicators

### Implementation
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Implementation tracking
- [CHANGELOG.md](../CHANGELOG.md) - Test mode implementation history
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Test mode procedures

---

## Notes

This document is part of the CULT Seed-to-Sale system documentation. It aligns with the batch-centric architecture and event-driven inventory implementation strategy. Test mode is designed to be additive and non-destructive, providing a safety layer for facility validation without compromising the integrity of the production system.

**Version History:**
- 1.0 (2025-11-20): Initial documentation created
