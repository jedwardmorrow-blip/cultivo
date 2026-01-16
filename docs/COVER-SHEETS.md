---
title: COVER-SHEETS
category: Sales & Fulfillment
version: 2.0
updated: 2025-11-10
---

# COVER-SHEETS - Distribution Manifests & Compliance Documentation

## Purpose
Cover sheets are comprehensive distribution manifests that accompany all cannabis orders, providing complete compliance documentation, traceability information, and delivery details required by Arizona DHS regulations. They serve as the primary document for tracking product movement from distributor to dispensary.

## Overview

Cover sheets are legally required documents that contain:
- **Compliance information** (company license, warnings, etc.)
- **Batch traceability data** (harvest dates, COAs, etc.)
- **Order details** (customer, products, delivery information)
- **Package assignments** (complete manifest of all packages)
- **QR code access** (secure public viewing for verification)

Each cover sheet is:
- Generated automatically or manually from an order
- Assigned a unique coversheet number (format: `CS-{order_number}`)
- Accessible via secure token for public viewing
- Tracked for access count and freshness (auto-outdated flagging)

---

## Cover Sheet Components

### 1. Compliance Header

**Purpose:** Display distributor license information and required regulatory warnings

**Data Structure (JSONB):**
```json
{
  "company_name": "Kind Meds Inc.",
  "license_number": "00000078DCBK00628996",
  "pregnancy_warning": "\"Using marijuana during pregnancy could cause birth defects or other health issues to your unborn child.\""
}
```

**Required Elements:**
- Company legal name
- Arizona state license number
- Mandated pregnancy warning text

**Source Function:** `getComplianceHeaderData(): Promise<ComplianceHeader>`
- Fetches from `app_settings` table
- Returns structured compliance header object
- Used in coversheet PDF generation

**Display Location:** Top of coversheet, prominently visible

**Regulatory Requirement:** Arizona DHS requires distributor license on all distribution documents

---

### 2. Order Information

**Purpose:** Identify order and delivery details

**Contents:**
- **Coversheet Number:** `CS-{order_number}` (e.g., `CS-ORD-2025-001`)
- **Order Date:** Date order was placed
- **Scheduled Delivery Date:** Planned delivery date
- **Customer Name:** Receiving dispensary legal name
- **Customer License:** Dispensary state license number
- **Total Package Count:** Total number of packages in shipment
- **Items Summary:** List of products with quantities

**Database Fields:**
```sql
-- From coversheets table
coversheet_number: text       -- Unique CS identifier
order_id: uuid                -- Foreign key to orders
customer_name: text           -- Cached from customers
delivery_date: date           -- Scheduled delivery
total_packages: integer       -- Count of packages
items_summary: jsonb          -- Product list snapshot
```

**Items Summary Structure:**
```json
[
  {
    "product_id": "uuid",
    "product_name": "Flower - 3.5g - Animal Tsunami",
    "product_type": "Packaged_3_5g",
    "quantity": 10
  }
]
```

---

### 3. Batch Compliance Information

**Purpose:** Provide complete traceability for each unique batch in the order

**Data Per Batch:**
- **Strain Name:** Cannabis strain (e.g., "Animal Tsunami")
- **Batch ID:** Harvest batch identifier (format: `YYMMDD-XXX`, e.g., `250916-ASU`)
- **Harvest Date:** Date product was harvested (MM/DD/YYYY)
- **Manufacture Date:** Date product was packaged (MM/DD/YYYY)
- **COA URL:** Link to Certificate of Analysis (e.g., `/coa-library?batch=250916-ASU`)

**Source Function:** `getBatchComplianceInfo(orderId: string): Promise<BatchComplianceInfo[]>`

**Implementation Details:**
```typescript
// Queries package_assignments_details view
// Joins with inventory_items → batches → harvest_date
// Joins with inventory_items → package_date (manufacture date)
// Groups by unique batch_id
// Sorts by strain name for consistency
```

**Display Format:**
| Strain | Batch ID | Harvest Date | Manufacture Date | COA Link |
|--------|----------|--------------|------------------|----------|
| Animal Tsunami | 250916-ASU | 09/16/2025 | 09/25/2025 | View COA |
| GSC | 251001-GSC | 10/01/2025 | 10/10/2025 | View COA |

**Compliance Purpose:** Enables complete seed-to-sale traceability for audits

---

### 4. Package Assignments

**Purpose:** Complete manifest of all packages included in shipment

**Data Source:** `package_assignments_details` view

**Contents Per Package:**
- Package ID (e.g., `251110-ASU-01`)
- Product name
- Weight or unit count
- Batch ID
- Strain name
- Assignment status

**Display Format:**
```
Order Item: Flower - 3.5g - Animal Tsunami (10 units)

Assigned Packages:
  ✓ 251110-ASU-01  |  3.5g  |  Batch: 251110-ASU  |  Animal Tsunami
  ✓ 251110-ASU-02  |  3.5g  |  Batch: 251110-ASU  |  Animal Tsunami
  ✓ 251110-ASU-03  |  3.5g  |  Batch: 251110-ASU  |  Animal Tsunami
  ...
```

**Service Function:** `getCoversheetPackageAssignments(orderId: string): Promise<PackageAssignment[]>`

**Purpose:**
- Detailed inventory verification
- Package-level traceability
- Receiving confirmation document
- Audit trail for product movement

---

### 5. Distributed To Section

**Purpose:** Document receiving customer information for compliance

**Current Implementation (Single-Location):**
```typescript
interface DistributedToInfo {
  customer_name: string;        // Legal business name
  license_number: string;       // State license number
  location_name?: string;       // Optional location identifier
}
```

**Example:**
```
DISTRIBUTED TO:
  Cannabis Research Group, Inc
  License: 00000104ESDH57805022
  Location: Tolleson
```

**Source Function:** `getDistributedToInfo(orderId: string): Promise<DistributedToInfo>`

**Implementation:**
```typescript
// Queries orders table
// Joins with customers table
// Returns customer.name and customer.license_number
// location_name currently unused (reserved for future)
```

**Current Limitation:** One customer per order (one-to-one relationship)

**Future Enhancement - Multi-Location Distribution:**

Some customers have multiple locations that handle distribution independently. When implementing:

```typescript
// Future structure (array of locations)
interface DistributedToInfo {
  customer_name: string;
  license_number: string;
  location_name?: string;
}

// Will return: DistributedToInfo[]
```

**Implementation Notes for Multi-Location:**
- Add `customer_locations` table for proper relational structure
- Update `getDistributedToInfo()` to return array
- Modify `DistributedToSection` component to render multiple entries
- Add `distributed_to` JSONB array field to coversheets table
- Track which packages go to which location

**Example Multi-Location Structure:**
```json
[
  {
    "customer_name": "Green Leaf Dispensaries LLC",
    "license": "ABC123",
    "location": "North Phoenix Store",
    "package_ids": ["251110-ASU-01", "251110-ASU-02"]
  },
  {
    "customer_name": "Green Leaf Dispensaries LLC",
    "license": "ABC124",
    "location": "South Phoenix Store",
    "package_ids": ["251110-ASU-03", "251110-ASU-04"]
  }
]
```

---

### 6. QR Code Public Access

**Purpose:** Enable secure public viewing of cover sheet for verification

**Access System:**
- **Token Generation:** 32-byte cryptographically secure random token
- **URL Format:** `{baseUrl}/coversheet?token={access_token}`
- **QR Code:** Base64-encoded data URL for physical printing
- **Access Tracking:** Increment counter on each view

**Security Features:**
- No authentication required (public access)
- Token is unguessable (256-bit entropy)
- Access count tracked for audit purposes
- Can be deactivated (`is_active = false`)

**Service Functions:**
```typescript
generateSecureToken(): string
getCoversheetPublicUrl(accessToken: string): string
getCoversheetByToken(token: string): Promise<Coversheet | null>
updateCoversheetAccessCount(coversheetId: string): Promise<void>
```

**QR Code Generation:**
```typescript
import QRCode from 'qrcode';

const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
  width: 400,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});
```

**Use Cases:**
- Customer verification of order details
- Third-party auditor review
- Regulatory inspector access
- Delivery driver confirmation
- Receiving warehouse validation

---

## Auto-Outdated Flagging System

**Purpose:** Automatically detect when coversheet data becomes stale due to order changes

### How It Works

**Database Triggers:**

1. **Order Updates Trigger:**
```sql
CREATE TRIGGER trigger_mark_coversheet_outdated_on_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (
    OLD.customer_id IS DISTINCT FROM NEW.customer_id OR
    OLD.order_date IS DISTINCT FROM NEW.order_date OR
    OLD.scheduled_delivery_date IS DISTINCT FROM NEW.scheduled_delivery_date OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION mark_coversheet_outdated();
```

2. **Order Items Changes Trigger:**
```sql
CREATE TRIGGER trigger_mark_coversheet_outdated_on_items_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION mark_coversheet_outdated();
```

**Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION mark_coversheet_outdated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coversheets
  SET
    is_outdated = true,
    last_order_update = now()
  WHERE
    order_id = COALESCE(NEW.order_id, NEW.id)
    AND is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### UI Behavior

**When Coversheet is Outdated:**
1. Badge appears: "⚠️ OUTDATED - Order changed after generation"
2. Warning message: "This coversheet contains outdated information. Please regenerate."
3. "Regenerate Coversheet" button becomes prominent
4. Old coversheet remains accessible for audit trail

**Regeneration Workflow:**
1. Manager clicks "Regenerate Coversheet"
2. System calls `regenerateCoversheet(orderId)`
3. Function:
   - Resets `is_outdated = false`
   - Calls `generateCoversheet(orderId)` (updates existing record)
   - Fetches fresh data from orders, customers, packages, batches
   - Maintains same coversheet ID and access token
   - Updates `updated_at` timestamp
4. UI shows success message
5. Fresh coversheet available for download/print

**Service Functions:**
```typescript
markCoversheetOutdated(orderId: string): Promise<void>
regenerateCoversheet(orderId: string): Promise<Coversheet>
```

**Database Fields:**
```sql
is_outdated: boolean DEFAULT false
last_order_update: timestamptz
```

**Benefits:**
- Prevents distribution of incorrect information
- Automatic detection (no manual checking)
- Preserves audit trail (old coversheet kept)
- Clear UI indication of staleness

---

## Cover Sheet Generation Workflow

```
┌─────────────┐
│ Order       │
│ Created     │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│ Manager     │─────▶│ Generate     │
│ Clicks      │      │ Coversheet   │
│ Generate    │      │ Button       │
└─────────────┘      └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Check        │
                     │ Existing?    │
                     └──┬───────┬───┘
                        │       │
                   YES  │       │ NO
                        │       │
         ┌──────────────┘       └──────────────┐
         │                                     │
         ▼                                     ▼
  ┌──────────────┐                     ┌──────────────┐
  │ Update       │                     │ Create New   │
  │ Existing     │                     │ Record       │
  │ - New token  │                     │ - Gen token  │
  │ - New QR     │                     │ - Gen QR     │
  └──────┬───────┘                     │ - Fetch data │
         │                             └──────┬───────┘
         │                                    │
         └────────────────┬───────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Update       │
                   │ orders.      │
                   │ coversheet_  │
                   │ url & id     │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Coversheet   │
                   │ Ready        │
                   └──────────────┘
```

### Step-by-Step Process

**1. Initiation**
- User navigates to order detail view
- Clicks "Generate Coversheet" button
- System calls `generateCoversheet(orderId)`

**2. Token & QR Generation**
```typescript
const accessToken = generateSecureToken();  // 32-byte random
const publicUrl = getCoversheetPublicUrl(accessToken);
const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);
```

**3. Check for Existing**
```typescript
const { data: existing } = await supabase
  .from('coversheets')
  .select('id')
  .eq('order_id', orderId)
  .maybeSingle();
```

**4A. Update Existing Coversheet**
```typescript
if (existing) {
  await supabase
    .from('coversheets')
    .update({
      access_token: accessToken,
      qr_code_data: qrCodeDataUrl,
      is_outdated: false  // Reset outdated flag
    })
    .eq('id', existing.id);
}
```

**4B. Create New Coversheet**
```typescript
else {
  // Fetch order data
  const { data: orderData } = await supabase
    .from('orders')
    .select('order_number, customer_id, customers(name), scheduled_delivery_date')
    .eq('id', orderId)
    .single();

  // Fetch items summary
  const { data: itemsData } = await supabase
    .from('order_items')
    .select('product_id, quantity, products(name, type)')
    .eq('order_id', orderId);

  // Build items summary
  const itemsSummary = itemsData.map(item => ({
    product_id: item.product_id,
    product_name: item.products.name,
    product_type: item.products.type,
    quantity: item.quantity
  }));

  // Insert new coversheet
  await supabase
    .from('coversheets')
    .insert({
      coversheet_number: `CS-${orderData.order_number}`,
      order_id: orderId,
      access_token: accessToken,
      qr_code_data: qrCodeDataUrl,
      customer_name: orderData.customers.name,
      delivery_date: orderData.scheduled_delivery_date,
      total_packages: itemsSummary.reduce((sum, item) => sum + item.quantity, 0),
      items_summary: itemsSummary
    });
}
```

**5. Link to Order**
```typescript
await supabase
  .from('orders')
  .update({
    coversheet_url: publicUrl,
    coversheet_id: coversheet.id
  })
  .eq('id', orderId);
```

**6. Coversheet Ready**
- Download PDF button enabled
- Print button enabled
- QR code displays for scanning
- Public URL copyable

---

## Database Schema

### Coversheets Table

```sql
CREATE TABLE coversheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coversheet_number text UNIQUE NOT NULL,    -- CS-{order_number}
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,

  -- Cached order data
  customer_name text NOT NULL,
  delivery_date date,
  total_packages integer DEFAULT 0,
  items_summary jsonb,                      -- Product list snapshot

  -- Compliance data
  compliance_header jsonb,                  -- Company info, license, warnings
  manufacture_date date,                    -- Latest package date (for compliance)

  -- Public access
  access_token text UNIQUE NOT NULL,        -- 256-bit secure token
  qr_code_data text,                        -- Base64 QR code image
  access_count integer DEFAULT 0,           -- View tracking
  is_active boolean DEFAULT true,           -- Can be deactivated

  -- Freshness tracking
  is_outdated boolean DEFAULT false,        -- Auto-set by triggers
  last_order_update timestamptz,            -- When related order changed

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX idx_coversheets_order_id ON coversheets(order_id);
CREATE INDEX idx_coversheets_access_token ON coversheets(access_token);
CREATE INDEX idx_coversheets_is_outdated ON coversheets(is_outdated) WHERE is_outdated = true;
```

### RLS Policies

```sql
-- Authenticated users can view all coversheets
CREATE POLICY "Authenticated users can view coversheets"
  ON coversheets FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create coversheets
CREATE POLICY "Authenticated users can create coversheets"
  ON coversheets FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update coversheets
CREATE POLICY "Authenticated users can update coversheets"
  ON coversheets FOR UPDATE
  TO authenticated
  USING (true);

-- Anonymous users can view active coversheets by token
CREATE POLICY "Public can view active coversheets by token"
  ON coversheets FOR SELECT
  TO anon
  USING (is_active = true);
```

---

## Related Functions

### RPC Functions

**Increment Access Count:**
```sql
CREATE OR REPLACE FUNCTION increment_coversheet_access(coversheet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coversheets
  SET access_count = access_count + 1
  WHERE id = coversheet_id;
END;
$$;
```

---

## Service File References

**Backend Service:**
- `src/features/orders/services/coversheet.service.ts` (493 lines)
  - `generateCoversheet(orderId): Promise<Coversheet>`
  - `getCoversheetByToken(token): Promise<Coversheet | null>`
  - `getCoversheetByOrderId(orderId): Promise<Coversheet | null>`
  - `getAllActiveCoversheets(): Promise<Coversheet[]>`
  - `getComplianceHeaderData(): Promise<ComplianceHeader>`
  - `getBatchComplianceInfo(orderId): Promise<BatchComplianceInfo[]>`
  - `getDistributedToInfo(orderId): Promise<DistributedToInfo>`
  - `markCoversheetOutdated(orderId): Promise<void>`
  - `regenerateCoversheet(orderId): Promise<Coversheet>`

**Frontend Components:**
- `src/features/orders/components/coversheet/ComplianceHeader.tsx`
- `src/features/orders/components/coversheet/BatchComplianceTable.tsx`
- `src/features/orders/components/coversheet/DistributedToSection.tsx`
- `src/features/orders/components/coversheet/CoversheetActions.tsx`
- `src/features/orders/components/CoversheetButton.tsx`
- `src/pages/public/CoversheetPublic.tsx` (public access page)
- `src/pages/public/CoversheetLibrary.tsx` (internal library)

**Type Definitions:**
- `src/types/coversheet.types.ts` (85 lines)
  - `Coversheet`, `CoversheetInsert`, `CoversheetUpdate`
  - `ComplianceHeader`, `BatchComplianceInfo`, `DistributedToInfo`
  - `CoversheetWithDetails`

---

## Migration Files

**Core Implementation:**
- `20251017200000_add_order_coversheet_integration.sql`
  - Creates `coversheets` table
  - Adds `orders.coversheet_id` and `orders.coversheet_url` fields
  - Creates RLS policies
  - Creates `increment_coversheet_access` RPC function

**Compliance Enhancements:**
- `20251027010000_enhance_coversheets_for_compliance.sql`
  - Adds `compliance_header` jsonb field
  - Adds `manufacture_date` field
  - Adds `is_outdated` flag
  - Adds `last_order_update` timestamp
  - Creates auto-outdated triggers on orders and order_items
  - Creates `mark_coversheet_outdated()` function

---

## Compliance Requirements

### Arizona DHS Requirements

Cover sheets MUST include:

1. **Distributor Information:**
   - Legal entity name
   - State license number
   - Contact information

2. **Product Traceability:**
   - Complete batch information for all products
   - Harvest dates
   - Manufacture/package dates
   - Certificate of Analysis links

3. **Customer Verification:**
   - Receiving dispensary name
   - Dispensary license number
   - Delivery date

4. **Package Manifest:**
   - Complete list of all packages
   - Package IDs for traceability
   - Product types and quantities
   - Batch assignments

5. **Required Warnings:**
   - Pregnancy warning text (state-mandated)

**Regulatory Reference:** Arizona Administrative Code (A.A.C.) R9-17 Article 3

---

## Future Enhancements

### Planned Features

1. **Digital Signature Integration**
   - Electronic signature capture on delivery
   - Driver and receiver signature fields
   - Timestamp and GPS coordinates

2. **Photo Documentation**
   - Upload delivery photos
   - Package condition verification
   - Receiving area photos

3. **Multi-Location Distribution** (Already Documented Above)
   - Support customers with multiple receiving locations
   - Track which packages go to which location
   - Separate distributed_to entries per location

4. **Automated Email Delivery**
   - Email coversheet PDF to customer on generation
   - Reminder emails before delivery
   - Confirmation emails after delivery

5. **Temperature Tracking**
   - Record temperature during transport
   - Alert on temperature excursions
   - Compliance with storage requirements

### Consideration for Phase 2

- Integration with Metrc for state reporting
- RFID scanning for automated package verification
- Blockchain for immutable audit trail
- Multi-language support (Spanish)

---

## Related Documentation

- [LABELS.md](./LABELS.md) - Product label management
- [COA-HANDLING.md](./COA-HANDLING.md) - Certificate of Analysis system
- [ORDERS.md](./ORDERS.md) - Order fulfillment workflow
- [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) - Invoice generation
- [DATASETS.md](./DATASETS.md) - Database schema reference

---

## Testing & Validation

### Test Scenarios

1. **Basic Generation:**
   - Create order with multiple products
   - Generate coversheet
   - Verify all data populated correctly
   - Check QR code scans to correct URL

2. **Update/Regeneration:**
   - Generate initial coversheet
   - Modify order (change delivery date)
   - Verify `is_outdated` flag set automatically
   - Regenerate coversheet
   - Verify new data reflected

3. **Public Access:**
   - Access coversheet via public URL
   - Verify no authentication required
   - Check access count increments
   - Test with invalid token (should fail gracefully)

4. **Batch Compliance:**
   - Create order with multiple batches
   - Generate coversheet
   - Verify all batches listed with correct dates
   - Verify COA links work

5. **Auto-Outdated:**
   - Generate coversheet for order
   - Add/remove order items
   - Verify coversheet marked outdated
   - Change customer on order
   - Verify coversheet marked outdated

---

## Notes

This document represents the **production-ready** implementation of the cover sheets system as of November 2025. The system is fully functional and compliant with Arizona DHS requirements for cannabis distribution documentation.

The architecture separates concerns between:
- **Compliance data** (regulatory requirements)
- **Order data** (business logic)
- **Public access** (verification and transparency)

This separation ensures maintainability and allows for future enhancements without disrupting core compliance functionality.
