---
title: LABELS
category: Sales & Fulfillment
version: 2.0
updated: 2025-11-10
---

# LABELS - Compliance & Internal Label Management

## Purpose
The CULT system maintains a dual-label architecture that separates regulatory compliance labels from internal warehouse tracking labels. This separation ensures compliance with Arizona DHS cannabis regulations while providing operational flexibility for internal tracking.

## Overview

The system implements **two distinct label types**:

1. **External Compliance Labels** (`labels` table) - State-mandated regulatory labels for customer-facing products
2. **Internal Inventory Labels** (`inventory_internal_labels` table) - Warehouse tracking labels for internal operations

This dual system ensures:
- Compliance with state cannabis tracking requirements
- Flexible internal warehouse operations
- Complete audit trail for both regulatory and operational purposes
- Separation of concerns between compliance and operations

---

## Label Types

### 1. External Compliance Labels

**Purpose:** State-mandated cannabis product labels required by Arizona DHS for all customer-facing packages.

**Database Table:** `labels`

**Contents:**
- **Package Identification:**
  - `package_id` - Unique package identifier (format: YYMMDD-STRAIN-##)
  - `batch_number` - Harvest batch traceability
  - `strain` - Cannabis strain name

- **Compliance Data:**
  - `thc_percentage` - THC content from COA
  - `cbd_percentage` - CBD content from COA
  - `total_cannabinoids_percentage` - Total cannabinoid content
  - `terpene_profile` - Primary terpenes from lab test

- **Traceability:**
  - `qr_code_data` - QR code linking to public COA viewer
  - `coa_url` - Direct URL to Certificate of Analysis
  - `barcode` - EAN-13 format barcode for POS scanning
  - `upc_code` - Universal Product Code

- **Required Warnings:**
  - Arizona-mandated pregnancy warning
  - Dosage information
  - Storage instructions

- **Product Details:**
  - `net_weight` - Product weight in grams/ounces
  - `manufacture_date` - Package date
  - `expiration_date` - Best-by date
  - `lineage` - Genetic lineage (Indica/Sativa/Hybrid)

**Generation Timing:**
- Created when orders reach `ready_for_delivery` status
- Triggered by package assignment to order items
- One label per customer-facing package

**Voiding System:**
Labels can be voided with reason tracking via `label_voids` table:
- **Void Reasons:**
  - `reprint` - Label damaged or misplaced, needs reprint
  - `damaged` - Label physically damaged, unreadable
  - `incorrect_data` - Wrong information on label (e.g., wrong strain)
  - `quality_issue` - Product quality issue, package rejected
  - `other` - Other reason (requires notes)

**Void Workflow:**
1. User selects label to void
2. Chooses void reason from dropdown
3. Enters optional notes
4. System creates `label_voids` record with timestamp and user
5. Original label marked as voided (but preserved for audit trail)
6. New label can be generated with same or updated data

**Migration Reference:** `20251027030000_add_label_voiding_system.sql`

---

### 2. Internal Inventory Labels

**Purpose:** Warehouse tracking and internal operations (NOT compliance-facing, NOT regulatory).

**Database Table:** `inventory_internal_labels`

**Schema:**
```sql
CREATE TABLE inventory_internal_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL,              -- References inventory_items.package_id (flexible text)
  label_data jsonb NOT NULL,             -- Flexible schema for any internal data
  printed_at timestamptz DEFAULT now(),  -- When label was printed
  created_at timestamptz DEFAULT now()   -- Record creation timestamp
);
```

**Key Differences from External Labels:**
- **No regulatory requirements** - Internal use only, not subject to state compliance
- **Flexible JSONB schema** - Can store any data structure needed for operations
- **No foreign key constraints** - Uses text package_id for maximum flexibility
- **Print history tracking** - Every internal label print creates a new record
- **Separate from compliance** - Does not affect compliance label counts or status

**Typical Use Cases:**
- Temporary warehouse location labels
- Internal batch tracking before final packaging
- Quality control checkpoints
- Production floor sorting labels
- Re-labeling during consolidation
- Cross-docking temporary IDs

**Example label_data Structure:**
```json
{
  "warehouse_location": "Bin-A-14",
  "temp_id": "TEMP-2025-001",
  "qc_status": "pending",
  "production_notes": "Hold for QC review",
  "print_count": 2,
  "last_scanned": "2025-11-10T14:30:00Z"
}
```

**Security:**
- RLS enabled for authenticated users only
- All authenticated users can read internal labels
- All authenticated users can create internal label print records
- No update or delete policies (append-only for audit trail)

**Migration Reference:** `20251025000852_create_inventory_internal_labels_table.sql`

---

## Label Generation Workflows

### External Label Generation

```
Order Ready → Package Assignment → Label Generation → QR Code Creation → Barcode Generation
```

**Step-by-Step:**

1. **Trigger:** Order status changes to `ready_for_delivery`
2. **Package Data Collection:**
   - Fetch assigned packages from `package_assignments`
   - Retrieve batch information from `batches`
   - Pull COA data from `certificates_of_analysis`
3. **Generate Label Components:**
   - QR Code: Links to `/coa-library?batch={batch_number}`
   - Barcode: EAN-13 format for POS scanning
   - UPC Code: Universal Product Code for inventory systems
4. **Insert Label Record:**
   - Create entry in `labels` table
   - Link to order_item via `order_item_id`
   - Store all compliance data
5. **Label Available for Printing:**
   - Label generator component reads from `labels` table
   - Formats label for physical printer
   - Tracks print count

**Service Functions:**
- `generateLabelForPackage(packageId: string, orderId: string): Promise<Label>`
- `generateQRCode(coaUrl: string): Promise<string>`
- `generateBarcode(packageId: string): Promise<string>`

---

### Internal Label Generation

```
Need Identified → Create Label Data → Store in JSONB → Print → Track Print Event
```

**Step-by-Step:**

1. **User Action:** Staff identifies need for internal label (e.g., warehouse move)
2. **Build Label Data:** Construct JSONB object with relevant fields
3. **Store Record:** Insert into `inventory_internal_labels` with `printed_at` timestamp
4. **Print Label:** Format and send to printer
5. **Scan & Update:** (Optional) Update `label_data` JSONB with scan events

**Service Functions:**
- `createInternalLabel(packageId: string, labelData: Record<string, any>): Promise<void>`
- `getInternalLabelHistory(packageId: string): Promise<InternalLabel[]>`

---

## QR Code & Barcode Generation

### QR Code Generation
**Purpose:** Public access to Certificate of Analysis (COA)

**URL Format:**
```
{baseUrl}/coa-library?batch={batch_number}
```

**Implementation:**
```typescript
import QRCode from 'qrcode';

const qrCodeDataUrl = await QRCode.toDataURL(coaUrl, {
  width: 400,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});
```

**Library:** `qrcode` npm package
**Storage:** Base64 encoded data URL stored in `labels.qr_code_data`

---

### Barcode Generation
**Purpose:** POS scanning and inventory tracking

**Format:** EAN-13 (13-digit European Article Number)

**Implementation:**
```typescript
import JsBarcode from 'jsbarcode';

// Generate barcode SVG or PNG
JsBarcode('#barcode-target', packageId, {
  format: 'EAN13',
  displayValue: true,
  fontSize: 14,
  height: 50
});
```

**Library:** `jsbarcode` npm package
**Storage:** Barcode string stored in `labels.barcode` field

---

## Database Schema

### External Compliance Labels Table

```sql
CREATE TABLE labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  package_id text NOT NULL,
  batch_number text NOT NULL,
  strain text NOT NULL,
  product_name text NOT NULL,
  net_weight numeric(10,2) NOT NULL,
  unit text NOT NULL,
  thc_percentage numeric(5,2),
  cbd_percentage numeric(5,2),
  total_cannabinoids_percentage numeric(5,2),
  terpene_profile jsonb,
  qr_code_data text,
  coa_url text,
  barcode text,
  upc_code text,
  lineage text,
  manufacture_date date NOT NULL,
  expiration_date date,
  is_voided boolean DEFAULT false,
  print_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX idx_labels_order_item_id ON labels(order_item_id);
CREATE INDEX idx_labels_package_id ON labels(package_id);
CREATE INDEX idx_labels_batch_number ON labels(batch_number);
```

### Label Voids Table

```sql
CREATE TABLE label_voids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid REFERENCES labels(id) ON DELETE CASCADE,
  void_reason text NOT NULL CHECK (void_reason IN ('reprint', 'damaged', 'incorrect_data', 'quality_issue', 'other')),
  void_notes text,
  voided_at timestamptz DEFAULT now(),
  voided_by uuid REFERENCES user_profiles(id)
);
```

### Internal Inventory Labels Table

```sql
CREATE TABLE inventory_internal_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  label_data jsonb NOT NULL,
  printed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inventory_internal_labels_package_id ON inventory_internal_labels(package_id);
CREATE INDEX idx_inventory_internal_labels_printed_at ON inventory_internal_labels(printed_at DESC);
```

---

## RLS Policies

### External Labels
```sql
-- Authenticated users can read all labels
CREATE POLICY "Authenticated users can read labels"
  ON labels FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create labels
CREATE POLICY "Authenticated users can create labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only label creator or manager can void
CREATE POLICY "Managers can void labels"
  ON label_voids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );
```

### Internal Labels
```sql
-- Authenticated users can read all internal labels
CREATE POLICY "Authenticated users can read internal labels"
  ON inventory_internal_labels FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create internal labels
CREATE POLICY "Authenticated users can create internal labels"
  ON inventory_internal_labels FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## Compliance Requirements

### Arizona DHS Requirements
External compliance labels MUST include:

1. **Distributor Information:**
   - Company legal name
   - License number
   - Contact information

2. **Product Information:**
   - Strain name and lineage
   - Net weight
   - Manufacture and expiration dates

3. **Lab Test Results:**
   - THC percentage
   - CBD percentage
   - Total cannabinoids
   - Primary terpenes

4. **Traceability:**
   - Batch number
   - Package ID
   - QR code linking to full COA

5. **Required Warnings:**
   - Pregnancy warning (mandated text)
   - Dosage instructions
   - Storage instructions

**Regulatory Reference:** Arizona Revised Statutes Title 36, Chapter 28.2

---

## Future Enhancements

### Planned Features
1. **Batch Label Templates** - Pre-configured templates per product type
2. **Mobile Label Scanning** - Mobile app for scanning and updating internal labels
3. **Label Printer Integration** - Direct printing to Zebra/Dymo label printers
4. **Multi-Language Labels** - Spanish language compliance labels
5. **Label Analytics** - Track label print counts, void rates, reprint frequency

### Consideration for Phase 2
- Integration with state tracking systems (e.g., Metrc)
- RFID tag support for high-security tracking
- NFC chip integration for anti-counterfeit measures

---

## Related Documentation
- [COVER-SHEETS.md](./COVER-SHEETS.md) - Distribution manifests and compliance documentation
- [COA-HANDLING.md](./COA-HANDLING.md) - Certificate of Analysis management
- [ORDERS.md](./ORDERS.md) - Order fulfillment workflow
- [DATASETS.md](./DATASETS.md) - Database schema details

---

## Service File References
- **Frontend Service:** `src/features/orders/services/labelAutoFill.service.ts`
- **Label Generation:** `src/features/orders/components/LabelGenerator.tsx`
- **Order Labels:** `src/features/orders/components/OrderLabelGenerator.tsx`

## Migration Files
- `20251025000852_create_inventory_internal_labels_table.sql`
- `20251027030000_add_label_voiding_system.sql`
- `20251012231917_add_lineage_field_to_labels.sql`
- `20251013000000_add_upc_and_barcode_fields_to_labels.sql`
