---
title: PRODUCTS
category: Catalog & Configuration
version: 1.0
updated: 2025-11-10
---

# PRODUCTS - Product Catalog & Strain Management

> **Status:** Documented (Evidence-Based) v1.0
> **Last Evidence Review:** 2025-11-10
> **Implementation Status:** ✅ Fully Implemented

---

## Purpose

This document describes the product catalog system, strain management, product types, stages, and the relationships between products, strains, and inventory. The product catalog is the foundation for order entry, pricing, and inventory tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Product Catalog Structure](#product-catalog-structure)
3. [Strains Management](#strains-management)
4. [Product Types](#product-types)
5. [Product Stages](#product-stages)
6. [Conversions System](#conversions-system)
7. [Product-Strain Relationships](#product-strain-relationships)
8. [Pricing Model](#pricing-model)
9. [Product Lifecycle](#product-lifecycle)
10. [Implementation Status](#implementation-status)

---

## Overview

### What is a Product?

A **product** is a sellable item in the catalog that customers can order. Products represent specific combinations of:
- **Strain** (e.g., Girl Scout Cookies, Grandaddy Purple)
- **Product Type** (e.g., Bulk Flower, Pre-Rolls, Concentrates)
- **Product Stage** (e.g., Bulk Available, Packaged)
- **Pricing** (price per unit, unit of measure)

### Key Concepts

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCT CATALOG HIERARCHY                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐                                                    │
│  │   STRAINS    │  Genetic profiles with cannabinoid data           │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         ├─→ GSC (Girl Scout Cookies) - Hybrid, 22% THC             │
│         ├─→ GDP (Grandaddy Purple) - Indica, 20% THC               │
│         └─→ MAC (Miracle Alien Cookies) - Hybrid, 24% THC          │
│                                                                       │
│  ┌──────────────┐                                                    │
│  │ PRODUCT TYPES│  Categories of products                           │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         ├─→ Bulk Flower (wholesale flower by weight)                │
│         ├─→ Pre-Rolls (packaged pre-rolled joints)                  │
│         ├─→ Concentrates (extracts, wax, shatter)                   │
│         └─→ Edibles (infused products)                              │
│                                                                       │
│  ┌──────────────┐                                                    │
│  │PRODUCT STAGES│  Processing stages                                │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         ├─→ Bulk Available (ready for sale as bulk flower)          │
│         ├─→ Packaged (consumer-ready packages)                      │
│         ├─→ Bucked (stems removed, not yet trimmed)                 │
│         └─→ Binned (just harvested, wet weight)                     │
│                                                                       │
│  ┌──────────────┐                                                    │
│  │   PRODUCTS   │  Orderable items (strain + type + stage + price)  │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         ├─→ "GSC - Bulk Flower" ($2800/lb)                          │
│         ├─→ "GDP - Bulk Flower" ($2600/lb)                          │
│         ├─→ "MAC - Pre-Rolls (1g)" ($8/unit)                        │
│         └─→ "GSC - Concentrates" ($25/g)                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Product Catalog Structure

### Core Tables

#### 1. products

**Purpose:** Central catalog of orderable products

**Schema:**
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                      -- Display name (auto-generated)
  product_category text,                    -- 'flower', 'preroll', 'concentrate', etc.
  product_type_id uuid REFERENCES product_types(id),
  product_stage_id uuid REFERENCES product_stages(id),
  strain_id uuid REFERENCES strains(id),   -- FK to strains table

  -- Pricing
  price_per_unit numeric,                   -- Price per pricing_unit
  pricing_unit text DEFAULT 'gram',         -- 'gram', 'unit', 'pound', 'ounce'

  -- Inventory Control
  available_quantity numeric DEFAULT 0,     -- Current available qty (materialized)
  allows_fractional_quantity boolean DEFAULT false,

  -- Weight Information (for compliance)
  gross_weight numeric,                     -- Total package weight (g)
  net_weight numeric,                       -- Product weight only (g)

  -- Lifecycle
  is_archived boolean DEFAULT false,        -- Soft delete

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Relationships:**
- `product_type_id` → `product_types.id` (category of product)
- `product_stage_id` → `product_stages.id` (processing stage)
- `strain_id` → `strains.id` (genetic profile)

**Evidence:**
- File: `src/features/products/components/ProductsManagement.tsx:22-32`
- Migration: `supabase/migrations/20251010031618_create_post_production_schema.sql`

#### 2. strains

**Purpose:** Genetic profiles with cannabinoid data

**Schema:**
```sql
CREATE TABLE strains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,               -- Full name (e.g., "Girl Scout Cookies")
  abbreviation text UNIQUE NOT NULL,       -- 3-5 char code (e.g., "GSC")
  type text,                                -- 'indica', 'sativa', 'hybrid'
  thc_percentage numeric,                   -- Average THC %
  cbd_percentage numeric,                   -- Average CBD %
  description text,                         -- Strain characteristics
  lineage text,                             -- Genetic lineage
  created_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `abbreviation`: Used in batch numbers (YYMMDD-STRAIN format)
- `type`: Indica/Sativa/Hybrid classification
- `thc_percentage`, `cbd_percentage`: Expected cannabinoid profiles

**Evidence:**
- File: `src/features/products/components/StrainsManagement.tsx`
- Migration: `supabase/migrations/20251010034324_populate_strain_catalog.sql`

#### 3. product_types

**Purpose:** Product category definitions

**Schema:**
```sql
CREATE TABLE product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,               -- 'Bulk Flower', 'Pre-Rolls', etc.
  abbreviation text UNIQUE NOT NULL,       -- 'BF', 'PR', etc.
  description text,
  requires_packaging boolean DEFAULT true,  -- If true, must go through packaging
  created_at timestamptz DEFAULT now()
);
```

**Common Product Types:**
- Bulk Flower (BF) - Wholesale flower sold by weight
- Pre-Rolls (PR) - Pre-rolled joints
- Concentrates (CO) - Extracts, wax, shatter
- Edibles (ED) - Infused products
- Topicals (TO) - Creams, lotions

**Evidence:**
- File: `src/features/products/components/ProductTypesManagement.tsx`

#### 4. product_stages

**Purpose:** Processing stage definitions

**Schema:**
```sql
CREATE TABLE product_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,               -- 'Bulk Available', 'Packaged', etc.
  abbreviation text UNIQUE NOT NULL,       -- 'BA', 'PK', etc.
  sort_order integer,                       -- Display order
  created_at timestamptz DEFAULT now()
);
```

**Common Product Stages:**
1. **Binned** - Just harvested, wet weight
2. **Bucked** - Stems removed, ready for trim
3. **Bulk Available** - Trimmed, ready for bulk sale
4. **Packaged** - Consumer-ready packages

**Processing Flow:**
```
Binned → Bucked → Bulk Available → Packaged
        (Bucking)   (Trimming)     (Packaging)
```

**Evidence:**
- File: `src/features/products/components/StagesManagement.tsx`

---

## Strains Management

### Strain Catalog

**Purpose:** Maintain genetic profiles for all cannabis strains cultivated.

**Key Operations:**

1. **Create Strain**
   ```typescript
   // Strain creation includes genetic data
   {
     name: "Girl Scout Cookies",
     abbreviation: "GSC",
     type: "hybrid",
     thc_percentage: 22.5,
     cbd_percentage: 0.3,
     lineage: "OG Kush x Durban Poison",
     description: "Sweet and earthy flavor profile"
   }
   ```

2. **Strain Code Format**
   - **Length:** 3-5 uppercase letters
   - **Uniqueness:** Must be unique across all strains
   - **Usage:** Used in batch numbers (YYMMDD-STRAIN)
   - **Examples:** GSC, GDP, MAC, LEMON, BLUE

3. **Cannabinoid Profiles**
   - THC and CBD percentages are **averages** across harvests
   - Actual values vary per batch (measured via COA)
   - Used for marketing and customer expectations

**Management Interface:**
- Component: `StrainsManagement.tsx`
- Operations: Create, Update, Archive
- Validation: Abbreviation uniqueness, format constraints

---

## Product Types

### Type Categories

Product types determine:
- How products are processed (packaging requirements)
- Pricing structure (by weight, by unit, etc.)
- Inventory tracking method

### Type Characteristics

| Type | Requires Packaging | Pricing Unit | Fractional Allowed |
|------|-------------------|--------------|-------------------|
| Bulk Flower | No | Pound/Gram | Yes |
| Pre-Rolls | Yes | Unit | No |
| Concentrates | Yes | Gram | Yes |
| Edibles | Yes | Unit | No |
| Topicals | Yes | Unit | No |

**Example:**
- **Bulk Flower:** Sold by weight (lb/g), customers can order 3.5 lbs
- **Pre-Rolls:** Sold by unit (each), customers order whole numbers only
- **Edibles:** Sold by unit (each), fractional quantities not allowed

**Evidence:**
- File: `src/features/products/components/ProductTypesManagement.tsx:1-200`

---

## Product Stages

### Stage Definitions

Stages represent the **processing state** of cannabis material:

```
┌──────────────────────────────────────────────────────────────┐
│                    STAGE PROGRESSION                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  HARVEST                                                      │
│     │                                                         │
│     ├──→ [BINNED] - Wet flower, just harvested               │
│     │    • Weight: Wet weight (2-3x dry weight)              │
│     │    • Duration: 1-7 days                                │
│     │                                                         │
│     ├──→ [BUCKED] - Stems removed                            │
│     │    • Weight: ~70-80% of binned weight                  │
│     │    • Duration: 1-3 days                                │
│     │                                                         │
│     ├──→ [BULK AVAILABLE] - Trimmed, ready for sale          │
│     │    • Weight: ~60-75% of bucked weight                  │
│     │    • Status: Ready for bulk orders                     │
│     │                                                         │
│     └──→ [PACKAGED] - Consumer packages created              │
│          • Weight: Individual package weights (1g, 3.5g, 7g) │
│          • Status: Ready for retail/distribution             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Stage Transitions

**Allowed Transitions:**
- Binned → Bucked (via Bucking Session)
- Bucked → Bulk Available (via Trim Session)
- Bulk Available → Packaged (via Packaging Session)

**Not Allowed:**
- Skipping stages (e.g., Binned → Bulk Available directly)
- Reverse transitions (except via cancellation)

**Evidence:**
- File: `src/features/products/components/StagesManagement.tsx`
- See also: [SESSIONS.md](./SESSIONS.md) for stage transition workflows

---

## Conversions System

### Purpose

The conversions system manages **stage-to-stage transformations**, tracking:
- Source stage → Target stage mappings
- Expected yield percentages
- Minimum/maximum batch sizes

### Conversions Table

**Schema:**
```sql
CREATE TABLE conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_stage_id uuid REFERENCES product_stages(id),
  target_stage_id uuid REFERENCES product_stages(id),
  expected_yield_percentage numeric,       -- Expected output % (e.g., 75%)
  min_quantity numeric,                     -- Minimum input qty
  max_quantity numeric,                     -- Maximum input qty
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Common Conversions

| Name | Source Stage | Target Stage | Expected Yield | Notes |
|------|-------------|--------------|----------------|-------|
| Bucking | Binned | Bucked | 75% | Stem removal |
| Trimming | Bucked | Bulk Available | 80% | Trim to smokable flower |
| Trim to Smalls | Bucked | Bucked Smalls | 15% | Separate small buds |
| Packaging Bulk | Bulk Available | Packaged | 98% | Minimal loss |
| Packaging Smalls | Bucked Smalls | Packaged | 98% | Package small buds |

**Expected Yield:**
- Represents average conversion efficiency
- Actual yields tracked via `pending_conversions` table
- Variance analysis compares expected vs. actual

**Evidence:**
- File: `src/features/products/components/ConversionsManagement.tsx`
- See also: [SESSIONS.md Section 2.4](./SESSIONS.md#conversions-workflow)

---

## Product-Strain Relationships

### Relationship Model

```
┌─────────────────────────────────────────────────────────────┐
│              PRODUCT-STRAIN LINKAGE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STRAIN: Girl Scout Cookies (GSC)                           │
│    │                                                         │
│    ├─→ PRODUCT: "GSC - Bulk Flower" (Bulk Available)        │
│    │     • Price: $2800/lb                                  │
│    │     • Stage: Bulk Available                            │
│    │                                                         │
│    ├─→ PRODUCT: "GSC - Pre-Rolls (1g)" (Packaged)           │
│    │     • Price: $8/unit                                   │
│    │     • Stage: Packaged                                  │
│    │                                                         │
│    └─→ PRODUCT: "GSC - Bucked Smalls" (Bucked)              │
│          • Price: $2200/lb                                  │
│          • Stage: Bucked Smalls                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Rules

1. **One Strain, Multiple Products**
   - A single strain can have products at different stages
   - Each product represents a specific stage + type combination

2. **Product Naming Convention**
   - Format: `{STRAIN} - {PRODUCT_TYPE}`
   - Example: "GDP - Bulk Flower", "MAC - Pre-Rolls (1g)"
   - Auto-generated based on strain and type

3. **Strain Validation (GAP-010)**
   - **Current Status:** Manual validation only
   - **Risk:** Wrong strain could be allocated to orders
   - **Mitigation:** UI displays strain name, manager must verify
   - **Planned:** Trigger to validate batch.strain_id = product.strain_id

**Evidence:**
- See: [BATCHES.md GAP-010](./BATCHES.md#gap-010-strain-mismatch-validation)
- See: [ORDERS.md Section 3.2](./ORDERS.md#batch-allocation)

---

## Pricing Model

### Pricing Structure

Products support flexible pricing based on unit of measure:

```
┌──────────────────────────────────────────────────────────────┐
│                      PRICING EXAMPLES                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Bulk Flower:                                                 │
│    • price_per_unit: 2800                                    │
│    • pricing_unit: 'pound'                                   │
│    • Customer orders 5 lbs → Total: $14,000                  │
│                                                               │
│  Pre-Rolls (1g):                                              │
│    • price_per_unit: 8                                       │
│    • pricing_unit: 'unit'                                    │
│    • Customer orders 100 units → Total: $800                 │
│                                                               │
│  Concentrates:                                                │
│    • price_per_unit: 25                                      │
│    • pricing_unit: 'gram'                                    │
│    • Customer orders 50g → Total: $1,250                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Pricing Units

**Supported Units:**
- `gram` - Individual grams
- `ounce` - 28.35 grams
- `pound` - 453.592 grams
- `unit` - Individual items (pre-rolls, edibles, etc.)

**Unit Conversion:**
- System stores all weights internally in grams
- Pricing can be per pound, but inventory tracked in grams
- Order totals calculated: `quantity * (price_per_unit / conversion_factor)`

**Fractional Quantities:**
- `allows_fractional_quantity` = true: Customer can order 3.5 lbs
- `allows_fractional_quantity` = false: Customer must order whole units

**Evidence:**
- File: `src/features/products/services/products.service.ts:1-200`
- File: `src/features/products/components/ProductsManagement.tsx:58-65`

---

## Product Lifecycle

### Product States

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCT LIFECYCLE                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [ACTIVE]                                                     │
│    • is_archived = false                                     │
│    • Available for orders                                    │
│    • Visible in catalog                                      │
│    • Inventory tracked                                       │
│                                                               │
│         │                                                     │
│         │ (Manager archives product)                         │
│         ▼                                                     │
│                                                               │
│  [ARCHIVED]                                                   │
│    • is_archived = true                                      │
│    • Not available for new orders                            │
│    • Hidden from catalog                                     │
│    • Historical data retained                                │
│    • Can be reactivated if needed                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Archival Rules

**When to Archive:**
- Strain no longer cultivated
- Product type discontinued
- Seasonal products (out of season)
- Replaced by newer product variant

**What Happens:**
- Product hidden from order forms
- Historical orders remain intact
- Inventory movements preserved
- Analytics still include archived products

**Soft Delete:**
- Products are NEVER hard-deleted from database
- `is_archived` flag used for visibility
- Maintains referential integrity with orders and inventory

**Evidence:**
- File: `src/features/products/components/ProductsManagement.tsx:30`
- Query: `.eq('is_archived', false)` filters active products

---

## Implementation Status

### Implemented Features

✅ **Product Catalog Management**
- Component: `ProductsManagement.tsx` (15,227 bytes)
- Operations: View, Edit, Filter, Search, Archive
- Features:
  - Category filtering
  - Stage filtering
  - Search by name/description
  - Inline editing (price, category, quantities)
  - Archive/restore products

✅ **Strains Management**
- Component: `StrainsManagement.tsx` (19,255 bytes)
- Operations: Create, Update, View, Archive
- Features:
  - Cannabinoid profile tracking (THC, CBD)
  - Lineage documentation
  - Abbreviation validation
  - Type classification (Indica/Sativa/Hybrid)

✅ **Product Types Management**
- Component: `ProductTypesManagement.tsx` (19,190 bytes)
- Operations: Create, Update, View
- Features:
  - Type creation with abbreviation
  - Packaging requirement flags
  - Type descriptions

✅ **Product Stages Management**
- Component: `StagesManagement.tsx` (9,776 bytes)
- Operations: Create, Update, View, Reorder
- Features:
  - Stage creation with abbreviation
  - Sort order management
  - Stage-based filtering

✅ **Conversions Management**
- Component: `ConversionsManagement.tsx` (21,006 bytes)
- Operations: Create, Update, View, Activate/Deactivate
- Features:
  - Source → Target stage mapping
  - Expected yield percentage
  - Min/max quantity constraints
  - Active/inactive status

✅ **Branding Management**
- Component: `BrandingManagement.tsx` (11,846 bytes)
- Operations: Logo upload, branding configuration
- Features:
  - Company logo management
  - Eye logo configuration
  - Label branding customization

### Services

**products.service.ts**
- Product CRUD operations
- Product filtering and search
- Product archival
- Evidence: 6,952 bytes, 200+ lines

**orderableProducts.service.ts**
- Fetches products available for ordering
- Filters by active status
- Joins strain, type, stage data
- Evidence: 1,244 bytes

### Database Integration

**Fully Integrated Tables:**
- `products` - Product catalog
- `strains` - Strain profiles
- `product_types` - Product categories
- `product_stages` - Processing stages
- `conversions` - Stage transformations

**RLS Policies:**
- All tables use authenticated user access
- No anonymous access to product catalog
- CRUD operations restricted to authenticated users

**Evidence:**
- Migration: `supabase/migrations/20251010031618_create_post_production_schema.sql`
- Migration: `supabase/migrations/20251010034324_populate_strain_catalog.sql`

---

## Known Gaps & Future Enhancements

### GAP-010: Strain Validation (HIGH Priority)

**Status:** 🔴 NOT IMPLEMENTED
**Impact:** Wrong strain could be allocated to orders (e.g., GSC order gets GDP batch)
**Current Mitigation:** UI displays strain name, manager must verify visually
**Planned Solution:** Trigger to validate `batch.strain_id = product.strain_id` on allocation
**Priority:** HIGH (Batch 2 planned)
**See:** [BATCHES.md GAP-010](./BATCHES.md#gap-010-strain-mismatch-validation)

### GAP-017: Batch Number Format Validation (MEDIUM Priority)

**Status:** 🔴 NOT IMPLEMENTED
**Impact:** Inconsistent batch IDs break manifest/COA lookups
**Current Mitigation:** UNIQUE constraint catches duplicates
**Planned Solution:** CHECK constraint matching regex `^\d{6}-[A-Z]{3,5}$`
**Priority:** MEDIUM (Batch 3 backlog)
**See:** [BATCHES.md GAP-017](./BATCHES.md#gap-017-batch-number-auto-generation)

### Future Enhancements

**Planned Features:**
1. **Automatic Product Sync** (✅ IMPLEMENTED - 2025-10-27)
   - Triggers create products automatically for new strains
   - Status: Migration `20251027174747_create_automatic_product_sync_system.sql`

2. **Product Pricing History**
   - Track price changes over time
   - Maintain pricing audit trail
   - Support historical pricing analysis

3. **Product Variants**
   - Multiple package sizes per product
   - Variant-specific pricing
   - SKU management

4. **Product Bundles**
   - Mixed strain packages
   - Variety packs
   - Promotional bundles

---

## Related Documentation

**Core References:**
- [BATCHES.md](./BATCHES.md) - Batch-strain linkage
- [SESSIONS.md](./SESSIONS.md) - Stage transitions via sessions
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Product inventory tracking
- [ORDERS.md](./ORDERS.md) - Product ordering and fulfillment

**System Overview:**
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - End-to-end product flow
- [DATASETS.md](./DATASETS.md) - Complete schema reference

**Implementation:**
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Feature status tracking

---

## Document Version History

### v1.0 (2025-11-10)
- **Initial comprehensive documentation**
- Documented product catalog structure (products, strains, types, stages)
- Documented conversions system with yield tracking
- Documented product-strain relationships and validation gaps
- Documented pricing model with examples
- Documented product lifecycle and archival process
- Added complete implementation status (6 components, 2 services)
- Added known gaps (GAP-010, GAP-017) with cross-references
- Added future enhancement roadmap

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Comprehensive Reference Documentation
**Maintainer:** Product Team
**Evidence Review:** Complete - All features verified against codebase
