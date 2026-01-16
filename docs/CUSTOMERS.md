---
title: CUSTOMERS
category: Sales & Fulfillment
version: 1.0
updated: 2025-11-10
---

# CUSTOMERS - Customer Management & License Tracking

> **Status:** Documented (Evidence-Based) v1.0
> **Last Evidence Review:** 2025-11-10
> **Implementation Status:** ✅ Fully Implemented

---

## Purpose

This document describes the customer management system, including dispensary profile management, license tracking, address management with geocoding, customer status management, and the customer-order relationship. Customer records are essential for order processing, delivery routing, compliance reporting, and manifest generation.

---

## Table of Contents

1. [Overview](#overview)
2. [Customer Schema](#customer-schema)
3. [Customer Creation & Management](#customer-creation--management)
4. [License Tracking](#license-tracking)
5. [Address Management & Geocoding](#address-management--geocoding)
6. [Customer Status Management](#customer-status-management)
7. [Dispensary Code System](#dispensary-code-system)
8. [Customer-Order Relationship](#customer-order-relationship)
9. [Implementation Status](#implementation-status)
10. [Related Documentation](#related-documentation)

---

## Overview

### What is a Customer?

A **customer** in this system is a licensed dispensary or retail location authorized to purchase cannabis products. Customers are **not** end-consumers; they are businesses that buy wholesale products for resale.

### Key Customer Attributes

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER RECORD                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  IDENTITY                                                             │
│    • Customer Name: "The Dispensary Henderson"                       │
│    • Dispensary Code: "TDH" (used in order numbers)                 │
│                                                                       │
│  LICENSE INFORMATION (Compliance)                                     │
│    • License Number: "00000123ESRE08192024" (AZDHS format)           │
│    • License Name: "The Dispensary LLC"                              │
│    • ATO Number: "ATO-2024-001" (Alternative Transport Order)        │
│                                                                       │
│  CONTACT INFORMATION                                                  │
│    • Contact Name: "John Smith, Manager"                             │
│    • Email: "orders@dispensary.com"                                  │
│    • Phone: "(702) 555-0123"                                         │
│                                                                       │
│  DELIVERY ADDRESS (Geocoded)                                          │
│    • Address: "123 Main St"                                          │
│    • City: "Henderson"                                               │
│    • State: "AZ"                                                     │
│    • Postal Code: "85014"                                            │
│    • Coordinates: (36.0395, -115.0814) [for routing]                │
│                                                                       │
│  STATUS                                                               │
│    • is_archived: false (active customer)                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Customer Schema

### customers Table

**Purpose:** Store dispensary/retail customer information

**Schema:**
```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name text NOT NULL,                      -- Dispensary name
  dispensary_code text UNIQUE NOT NULL,    -- 2-5 char code for order numbers

  -- License Information (Compliance)
  license_number text,                     -- AZDHS license number
  license_name text,                       -- Legal entity name
  ato_number text,                         -- Alternative Transport Order number

  -- Contact Information
  contact_name text,                       -- Primary contact person
  email text,                              -- Email for order confirmations
  phone text,                              -- Phone number

  -- Delivery Address
  address text,                            -- Street address
  city text,                               -- City
  state text DEFAULT 'AZ',                -- State (default Arizona)
  postal_code text,                        -- ZIP code

  -- Geocoding (for routing)
  latitude numeric,                        -- Latitude coordinate
  longitude numeric,                       -- Longitude coordinate
  geocoded_at timestamptz,                 -- When geocoding was performed

  -- Legacy Address Fields (deprecated - use above)
  delivery_address text,
  delivery_city text,
  delivery_state text,
  delivery_postal_code text,

  -- Status
  is_archived boolean DEFAULT false,       -- Soft delete

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
- Primary key on `id`
- Unique constraint on `dispensary_code`
- Index on `is_archived` (for filtering active customers)

**RLS Policies:**
- Authenticated users: Full CRUD access
- No anonymous access

**Evidence:**
- Migration: `supabase/migrations/20251010233459_populate_dispensary_customers.sql`
- Migration: `supabase/migrations/20251011001019_add_ato_number_to_customers.sql`
- Migration: `supabase/migrations/20251011215147_add_dispensary_code_to_customers.sql`
- Migration: `supabase/migrations/20251013221148_add_license_name_to_customers.sql`
- Migration: `supabase/migrations/20251017022949_add_geocoding_to_customers.sql`

---

## Customer Creation & Management

### Customer Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    CUSTOMER LIFECYCLE                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [NEW CUSTOMER]                                               │
│    │                                                          │
│    ├─→ Enter basic information (name, code, contact)         │
│    ├─→ Enter license information (for compliance)            │
│    ├─→ Enter delivery address                                │
│    │                                                          │
│    ▼                                                          │
│  [GEOCODING]                                                  │
│    │                                                          │
│    ├─→ Automatic geocoding of address                        │
│    ├─→ Coordinates stored (latitude, longitude)              │
│    ├─→ Used for delivery route optimization                  │
│    │                                                          │
│    ▼                                                          │
│  [ACTIVE CUSTOMER]                                            │
│    │                                                          │
│    ├─→ Available for order placement                         │
│    ├─→ Appears in customer dropdowns                         │
│    ├─→ Can receive deliveries                                │
│    │                                                          │
│    ├─→ (Manager edits information as needed)                 │
│    │                                                          │
│    ▼                                                          │
│  [ARCHIVED] (Optional)                                        │
│    │                                                          │
│    ├─→ No longer doing business                              │
│    ├─→ Hidden from order forms                               │
│    ├─→ Historical orders preserved                           │
│    ├─→ Can be reactivated if needed                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Required Fields

**Minimum Required:**
- `name` - Customer/dispensary name
- `dispensary_code` - Unique identifier for order numbers

**Strongly Recommended:**
- `license_number` - Required for compliance/manifest generation
- `address`, `city`, `state`, `postal_code` - Required for deliveries
- `contact_name`, `phone`, `email` - For order communications

**Optional:**
- `license_name` - Legal entity name (may differ from DBA)
- `ato_number` - Alternative Transport Order number (if applicable)

**Evidence:**
- File: `src/features/customers/components/CustomerForm.tsx:15-28`
- File: `src/features/customers/components/CustomerForm.tsx:69`

---

## License Tracking

### License Information Fields

Cannabis dispensaries must maintain valid licenses to operate. The system tracks:

**1. License Number**
- Format: AZDHS standard (e.g., `00000123ESRE08192024`)
- Required for manifest generation
- Used in compliance reporting
- Must match state database

**2. License Name**
- Legal entity name on license
- May differ from DBA (doing business as) name
- Example: License Name = "Dispensary Holdings LLC", Customer Name = "The Dispensary"

**3. ATO Number**
- Alternative Transport Order number
- Required for deliveries in some jurisdictions
- Optional field in system

### License Compliance

**Manifest Generation:**
- License number included on all manifests
- Required field for AZDHS reporting
- Validated during manifest creation

**Order Restrictions:**
- No enforcement of license expiration (future enhancement)
- Manual verification by staff currently

**Evidence:**
- File: `src/features/customers/components/CustomerForm.tsx:18-20`
- File: `src/features/customers/components/CustomerForm.tsx:35-37`
- See: [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) for manifest integration

---

## Address Management & Geocoding

### Address Structure

**Dual Address System:**
The system historically supported separate billing and delivery addresses. This has been consolidated to a single address model:

**Current Address Fields (Active):**
- `address` - Street address
- `city` - City
- `state` - State (default: AZ)
- `postal_code` - ZIP code

**Legacy Address Fields (Deprecated):**
- `delivery_address`, `delivery_city`, `delivery_state`, `delivery_postal_code`
- Maintained for backward compatibility
- New customers use primary address fields only

**Evidence:**
- File: `src/features/customers/components/CustomerForm.tsx:38-44`
- Migration: `supabase/migrations/20251017174809_fix_address_field_consolidation.sql`

### Geocoding System

**Purpose:** Convert street addresses to GPS coordinates for delivery route optimization.

**Geocoding Flow:**
```
┌────────────────────────────────────────────────────────────────┐
│                      GEOCODING WORKFLOW                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User enters address:                                        │
│     "123 Main St, Henderson, AZ 85014"                         │
│                                                                 │
│  2. System calls geocoding service (e.g., OpenStreetMap)       │
│     • Sends full address string                                │
│     • Receives latitude/longitude coordinates                  │
│                                                                 │
│  3. System stores coordinates:                                  │
│     • latitude: 36.0395                                        │
│     • longitude: -115.0814                                     │
│     • geocoded_at: 2025-11-10 12:30:00                        │
│                                                                 │
│  4. Coordinates used for:                                       │
│     • Delivery route optimization                              │
│     • Route map visualization                                  │
│     • Distance calculations                                    │
│     • Multi-stop routing                                       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Geocoding Operations:**

**1. Single Customer Geocoding**
```typescript
// Geocode one customer at a time
await customersService.geocodeCustomer(customerId);
```

**2. Bulk Geocoding**
```typescript
// Geocode all customers missing coordinates
await geocodeAll();
// Confirms before proceeding
// Processes all customers sequentially
```

**Geocoding Status:**
- Tracked via `useCustomers` hook
- Displays geocoded count vs. total
- Shows customers needing geocoding

**Evidence:**
- File: `src/features/customers/hooks/useCustomerMutations.ts:57-95`
- File: `src/features/customers/hooks/useCustomers.ts:25-26`
- Service: `src/features/customers/services/customers.service.ts`
- See: [INVOICING-&-MANIFESTING.md - Routing](./INVOICING-&-MANIFESTING.md#delivery-routing)

---

## Customer Status Management

### Active vs. Archived

**Active Customers:**
- `is_archived = false`
- Visible in dropdowns and order forms
- Can place new orders
- Included in customer lists

**Archived Customers:**
- `is_archived = true`
- Hidden from order forms
- Historical orders remain intact
- Can be reactivated

### Status Transitions

**Archiving a Customer:**
```typescript
// Soft delete - preserves data
await customersService.updateCustomer(customerId, {
  is_archived: true
});
```

**Reactivating a Customer:**
```typescript
// Restore archived customer
await customersService.updateCustomer(customerId, {
  is_archived: false
});
```

**When to Archive:**
- Business closed permanently
- No longer purchasing
- Duplicate record (consolidation)
- Lost license (compliance issue)

**Important:** Orders from archived customers remain in system and are not affected.

**Evidence:**
- File: `src/features/customers/hooks/useCustomers.ts:14` (filter by is_archived)

---

## Dispensary Code System

### Purpose

The **dispensary code** is a short identifier used in order number generation.

**Format:**
- Length: 2-5 characters
- Case: UPPERCASE letters only
- Uniqueness: Must be unique across all customers

**Usage:**
- Order numbers: `YYMMDD-CODE-NN` (e.g., `251110-TDH-01`)
- Quick customer identification
- Manifest references
- Internal communications

### Code Assignment

**Guidelines:**
1. Use first letters of dispensary name
   - "The Dispensary Henderson" → `TDH`
   - "Green Life Wellness" → `GLW`

2. Handle duplicates with numbers or variations
   - "Desert Bloom" → `DB`
   - "Desert Bloom (Tucson)" → `DBT`

3. Avoid ambiguous codes
   - Don't use: O (looks like 0), I (looks like 1)

**Validation:**
- Uniqueness enforced by database UNIQUE constraint
- System prevents duplicate codes
- Required field (cannot be empty)

**Evidence:**
- File: `src/features/customers/components/CustomerForm.tsx:100-107`
- Migration: `supabase/migrations/20251011215147_add_dispensary_code_to_customers.sql`
- Migration: `supabase/migrations/20251011215208_add_dispensary_code_constraints.sql`
- See: [ORDERS.md - Order Number Generation](./ORDERS.md#order-creation)

---

## Customer-Order Relationship

### Relationship Model

```
┌─────────────────────────────────────────────────────────────┐
│              CUSTOMER-ORDER RELATIONSHIP                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CUSTOMER: The Dispensary Henderson (TDH)                   │
│    │                                                         │
│    ├─→ ORDER: 251110-TDH-01                                 │
│    │    • Products: GSC Bulk Flower (5 lbs)                 │
│    │    • Status: Ready for Delivery                        │
│    │    • Delivery Address: Customer's address              │
│    │                                                         │
│    ├─→ ORDER: 251103-TDH-01                                 │
│    │    • Products: GDP Bulk Flower (3 lbs)                 │
│    │    • Status: Delivered                                 │
│    │    • Delivery Date: 2025-11-03                         │
│    │                                                         │
│    └─→ ORDER: 251020-TDH-01                                 │
│         • Products: MAC Pre-Rolls (200 units)               │
│         • Status: Delivered                                 │
│         • Delivery Date: 2025-10-20                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Foreign Key Relationship

**orders Table:**
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),  -- FK to customers
  order_number text UNIQUE NOT NULL,
  -- ... other fields
);
```

**Referential Integrity:**
- Orders linked via `customer_id` foreign key
- Customer cannot be hard-deleted if orders exist
- Archiving customer preserves order history

**Data Flow:**

**1. Order Creation:**
```typescript
// Customer selected from dropdown
const order = {
  customer_id: selectedCustomer.id,
  // ... order details
};
```

**2. Manifest Generation:**
```typescript
// Customer license info pulled for manifest
const manifest = {
  customer_name: customer.name,
  license_number: customer.license_number,
  delivery_address: customer.address,
  // ... manifest fields
};
```

**3. Delivery Routing:**
```typescript
// Customer coordinates used for route optimization
const route = {
  stops: orders.map(order => ({
    customer: order.customer,
    latitude: order.customer.latitude,
    longitude: order.customer.longitude,
  }))
};
```

**Evidence:**
- See: [ORDERS.md](./ORDERS.md) for complete order workflow
- See: [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) for manifest integration

---

## Implementation Status

### Implemented Features

✅ **Customer Management UI**
- Component: `CustomersManagement.tsx` (3,380 bytes)
- Operations: View, Filter, Search
- Features:
  - Customer list with inline actions
  - Status filtering (active/archived)
  - Search by name
  - Geocoding status display

✅ **Customer CRUD Operations**
- Component: `CustomerForm.tsx` (7,299 bytes)
- Component: `NewCustomerModal.tsx` (810 bytes)
- Operations: Create, Update, Archive
- Features:
  - Multi-section form (basic info, license, contact, address)
  - Field validation
  - Required field enforcement
  - Address geocoding integration

✅ **Customer Filtering**
- Component: `CustomersFilters.tsx` (3,712 bytes)
- Features:
  - Active/Archived toggle
  - Search by name
  - Filter state management

✅ **Customer List Display**
- Component: `CustomersList.tsx` (7,820 bytes)
- Features:
  - Tabular display with key info
  - Inline edit/archive actions
  - Geocoding status indicators
  - Responsive design

✅ **Geocoding Integration**
- Hooks: `useCustomerMutations.ts` (geocoding functions)
- Hooks: `useCustomers.ts` (geocoding status)
- Features:
  - Single customer geocoding
  - Bulk geocoding (all customers)
  - Geocoded/missing counts
  - Timestamp tracking

✅ **Customer Service Layer**
- Service: `customers.service.ts` (3,865 bytes)
- Operations:
  - getAllCustomers()
  - createCustomer()
  - updateCustomer()
  - geocodeCustomer()
  - Supabase integration

### Database Integration

**Fully Integrated:**
- `customers` table with complete schema
- Foreign keys to `orders` table
- RLS policies for authenticated access
- Unique constraints on `dispensary_code`

**Migrations Applied:**
- Customer schema creation
- Dispensary code system
- License tracking fields
- Geocoding fields
- Address field consolidation

**Evidence:**
- 6 components (22,821 bytes total)
- 2 hooks (customer operations)
- 1 service layer (3,865 bytes)
- 1 types file
- 7+ database migrations

---

## Known Gaps & Future Enhancements

### Current Gaps

**No Active Gaps Identified**
- Customer management is fully implemented
- All core features operational
- No critical missing functionality

### Future Enhancements

**Planned Features:**

1. **License Expiration Tracking**
   - Track license expiration dates
   - Alert when licenses near expiration
   - Prevent orders to expired licenses
   - Priority: MEDIUM

2. **Credit Limits & Payment Terms**
   - Track credit limits per customer
   - Payment terms (NET 30, NET 60, etc.)
   - Credit usage tracking
   - Priority: MEDIUM

3. **Customer Notes & History**
   - Free-form notes per customer
   - Delivery instructions
   - Special handling requirements
   - Priority: LOW

4. **Customer Segmentation**
   - Customer tiers (Gold, Silver, Bronze)
   - Volume-based pricing
   - Loyalty programs
   - Priority: LOW

5. **Automated Geocoding**
   - Geocode automatically on address save
   - Background geocoding job
   - Geocoding API integration options
   - Priority: MEDIUM

---

## Related Documentation

**Order Integration:**
- [ORDERS.md](./ORDERS.md) - Customer-order relationship
- [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) - Manifest generation with customer data

**Delivery Integration:**
- [INVOICING-&-MANIFESTING.md - Routing](./INVOICING-&-MANIFESTING.md#delivery-routing) - Route optimization using geocoding

**System Overview:**
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Customer role in workflow
- [DATASETS.md](./DATASETS.md) - Complete schema reference

**Implementation Tracking:**
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Feature status

---

## Document Version History

### v1.0 (2025-11-10)
- **Initial comprehensive documentation**
- Documented customer schema with all fields
- Documented license tracking system (license number, license name, ATO)
- Documented address management and geocoding integration
- Documented dispensary code system for order numbers
- Documented customer status management (active/archived)
- Documented customer-order relationship
- Added complete implementation status (6 components, 1 service, 7 migrations)
- Added future enhancement roadmap
- Added comprehensive examples and workflows

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Comprehensive Reference Documentation
**Maintainer:** Sales Team
**Evidence Review:** Complete - All features verified against codebase
