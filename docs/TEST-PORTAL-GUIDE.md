# Test Portal - Quick Start Guide

**Version:** 2.0
**Updated:** November 26, 2025
**Status:** ✅ Fully Implemented

---

## What is the Test Portal?

The Test Portal is a **completely isolated sandbox environment** where you can safely experiment with all application features without affecting your production data. Think of it as a playground version of the app.

---

## How to Access

1. **Log into the application**
2. **Look for the Portal Switcher** in the top navigation bar (next to the logo)
3. **Click "Test Sandbox"** to switch to the Test Portal
4. **Click "Production"** to switch back

```
┌────────────────────────────────────────┐
│  [Logo]  ◉ Production  ○ Test Sandbox │
└────────────────────────────────────────┘
```

---

## Visual Indicators

When in Test Portal, you'll see:

### 🧪 Banner at Top
```
┌──────────────────────────────────────────────────────────────┐
│ 🧪 TEST SANDBOX - SAFE TO EXPERIMENT                        │
│ 15 test orders • 42 test items • 8 test sessions            │
└──────────────────────────────────────────────────────────────┘
```

### 🎨 Amber Theme
- Navigation bar has amber tint
- Amber accent colors throughout
- "Test Portal" navigation item visible (Production only shows this when in Test Portal)

### 🏷️ Test Badges
- All data cards show test indicators
- Forms display "Test Mode Active" badges

---

## What Can You Do?

### In Test Portal, You Can:

✅ **Create Orders Without Inventory**
- Order any quantity, even if you have 0 in stock
- System bypasses availability checks

✅ **Assign Packages with Insufficient Quantity**
- Assign more than available
- No errors, no blockers

✅ **Run Production Sessions**
- Start trim/packaging sessions without input inventory
- Complete sessions with any output values

✅ **Adjust Inventory Freely**
- Add/remove quantities without restrictions
- Negative quantities allowed (with warning)

✅ **Generate Documents**
- Invoices, manifests, labels (all watermarked "TEST")
- Practice document workflows

✅ **Reset Everything**
- Clear all test data with one click
- Start fresh anytime

### What's Still Enforced?

⚠️ **Required Fields**
- Customer name, product selection still required
- Dates, quantities must be valid

⚠️ **Business Logic**
- Order totals calculated correctly
- Pricing still enforced

⚠️ **Security**
- Login required
- User permissions respected

---

## Production Portal vs Test Portal

| Feature | Production Portal | Test Portal |
|---------|------------------|-------------|
| **Data Shown** | Real business data | Test data only |
| **Inventory Checks** | ✅ Enforced | ❌ Bypassed |
| **Batch Allocation** | ✅ Required | ❌ Optional |
| **Document Watermarks** | None | "TEST" watermark |
| **Reset Data** | ❌ Not allowed | ✅ Anytime |
| **Audit Logging** | Standard logs | Test mode audit trail |

---

## Test Portal Dashboard

When in Test Portal, a new "Test Portal" navigation item appears. Click it to access:

### Statistics
- Test orders count
- Test inventory items count
- Test sessions count
- Test movements count
- Audit trail statistics

### Reset Controls
- **Reset Orders** - Delete all test orders
- **Reset Inventory** - Delete all test inventory
- **Reset Sessions** - Delete all test sessions
- **Reset All** - Complete wipe (⚠️ careful!)

### Audit Log Viewer
- See all bypassed validations
- Filter by type
- Export to CSV

---

## Common Workflows

### 1. Learning Order Management

```
1. Switch to Test Portal
2. Navigate to Orders
3. Create a new order
4. Add products (any quantity works!)
5. Assign packages (even with 0 inventory)
6. Mark ready for delivery
7. Generate invoice/manifest
8. Review the complete workflow
```

### 2. Training New Staff

```
1. Switch to Test Portal
2. Have staff member create test orders
3. Walk through fulfillment process
4. Practice document generation
5. Reset test data when done
6. Repeat as needed
```

### 3. Testing New Features

```
1. Switch to Test Portal
2. Try the new feature
3. Create test scenarios
4. Verify behavior
5. Reset if needed
6. Switch to Production when ready
```

---

## Data Management

### Viewing Test Data

When in Test Portal:
- **Orders Page** shows ONLY test orders
- **Inventory Page** shows ONLY test inventory
- **Sessions Page** shows ONLY test sessions

All filtered automatically - no manual filtering needed!

### Resetting Test Data

**Option 1: Selective Reset**
```
1. Go to Test Portal Dashboard
2. Click specific reset button:
   - Reset Orders
   - Reset Inventory
   - Reset Sessions
3. Confirm action
```

**Option 2: Full Reset**
```
1. Go to Test Portal Dashboard
2. Click "Reset All"
3. Review what will be deleted
4. Confirm "Yes, Reset All Test Data"
```

**⚠️ Important:** Only test data is deleted. Production data is NEVER affected.

---

## Safety Guarantees

### What's Protected?

1. **Production Data is Untouchable**
   - Test Portal cannot see or modify production data
   - Database-level isolation via `test_mode` flag
   - Impossible to accidentally affect production

2. **Reset Only Affects Test Data**
   - Reset operations check `test_mode = true`
   - Production records have `test_mode = false`
   - Database constraints prevent cross-contamination

3. **Audit Trail**
   - Every bypassed validation logged
   - User, timestamp, context captured
   - Review what happened in test sessions

---

## FAQ

### Q: Can I switch portals mid-workflow?
**A:** Yes! Your portal preference persists. However, incomplete workflows may reset.

### Q: What happens if I create an order in Test Portal then switch to Production?
**A:** The order stays in Test Portal. You won't see it in Production Portal because it's test data.

### Q: Can I move test data to production?
**A:** No. Test data and production data are completely separate. This is by design for safety.

### Q: Do test documents look different?
**A:** Yes! All test documents are watermarked with "TEST" to prevent confusion.

### Q: How long is test data kept?
**A:** Test data persists until you reset it. Audit logs are kept for 30 days by default.

### Q: Can multiple users use Test Portal simultaneously?
**A:** Yes! Each user can independently switch between portals. Test data is shared among all test portal users.

### Q: Will test operations appear in production reports/analytics?
**A:** No. Production analytics automatically exclude test data.

---

## Developer Notes

### Accessing Portal Context

```typescript
import { useTestPortal } from '@/contexts/TestPortalContext';

function MyComponent() {
  const { isTestPortal, portalFilter, getTaggedData } = useTestPortal();

  // Automatically filter queries
  const { data } = await supabase
    .from('orders')
    .select('*')
    .match(portalFilter);  // Filters by test_mode automatically

  // Tag new records
  const newOrder = getTaggedData({
    customer_id: '...',
    // ... other fields
  });  // Adds test_mode: true/false automatically

  return (
    <div>
      {isTestPortal && <TestBadge />}
      {/* rest of component */}
    </div>
  );
}
```

### Database Schema

All tables with test portal support have:
- `test_mode` boolean column (default: false)
- Indexed for performance
- Automatically filtered by portal context

**Supported Tables:**
- `orders`
- `order_items`
- `inventory_items`
- `trim_sessions`
- `packaging_sessions`

---

## Best Practices

### ✅ Do:
- Use Test Portal for training new staff
- Experiment freely with workflows
- Reset test data regularly to keep it clean
- Review audit logs to understand what was bypassed
- Document workflows using test data

### ❌ Don't:
- Process real customer orders in Test Portal
- Rely on test data for business decisions
- Use test documents for compliance
- Mix test and production workflows
- Forget you're in Test Portal (check the banner!)

---

## Support

Having issues with Test Portal?

1. Check the banner - are you in the correct portal?
2. Try refreshing the page
3. Check the audit log for clues
4. Reset test data if behavior seems odd
5. Contact support with audit log exports

---

## Changelog

### Version 2.0 (November 2025)
- ✅ Complete dual-portal architecture implemented
- ✅ Automatic data isolation via `test_mode` flag
- ✅ Portal Switcher in navigation
- ✅ Test Portal Dashboard with statistics
- ✅ Selective and full reset functionality
- ✅ Audit trail system
- ✅ Visual differentiation (amber theme)

### Version 1.0 (November 2024)
- Initial test mode toggle concept
- Basic validation bypasses
