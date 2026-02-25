# CRM Sub-Accounts & Hub Delivery Architecture

## Overview

Some dispensary chains operate multiple locations but receive deliveries through a central hub. This document covers the data model for parent/child account relationships and how they integrate with orders, deliveries, and invoicing.

## Current Hub Delivery Customers

### Sol Flower (SOL)
- **Parent**: Sol Flower - Kannaboost Technology Inc
- **Hub Address**: 2424 W University Dr, Tempe, AZ
- **License**: 00000118DCKD00426097
- **Notes**: Orders placed centrally by Matthew (Operations Analyst) and Joshua Stolp (Temp Buyer). Deliveries go to hub for distribution to multiple Sol Flower retail locations.

### Earth's Healing (WEE)
- **Parent**: Earth's Healing
- **Hub Address**: 2075 E Benson Hwy, Tucson, AZ
- **License**: 4444444
- **Notes**: Hub delivery to Tucson location, distributed to multiple Earth's Healing dispensaries.

## Data Model

### Self-Referential Hierarchy on `customers` Table

```
customers
  parent_customer_id  uuid  FK -> customers.id  (nullable)
  account_type        text  'direct' | 'hub_parent' | 'hub_child'
```

### Hierarchy Rules
1. `hub_parent` accounts have `parent_customer_id = NULL`
2. `hub_child` accounts have `parent_customer_id` pointing to their hub parent
3. `direct` accounts (most dispensaries) have `parent_customer_id = NULL` and `account_type = 'direct'`
4. A hub_child inherits the parent's `dispensary_code` prefix for order numbering
5. Orders can be placed against either the parent or a child account

### Example Structure

```
Sol Flower (hub_parent)
  id: fa4eb1fe-...
  dispensary_code: SOL
  account_type: hub_parent
  parent_customer_id: NULL
  address: 2424 W University Dr, Tempe (hub delivery address)

  Sol Flower - Sun City (hub_child)
    dispensary_code: SOL-SC
    account_type: hub_child
    parent_customer_id: fa4eb1fe-...
    address: [retail location address]

  Sol Flower - Tempe (hub_child)
    dispensary_code: SOL-TM
    account_type: hub_child
    parent_customer_id: fa4eb1fe-...
    address: [retail location address]
```

## Order Flow for Hub Accounts

### Option A: Parent-Level Orders (Current Model)
1. Hub parent places a single order covering all child locations
2. Order is created against the parent `customer_id`
3. Delivery goes to parent hub address
4. Internal distribution to child locations handled by the dispensary
5. Invoice goes to parent account

### Option B: Child-Level Orders (Future Enhancement)
1. Individual orders per child location
2. Delivery consolidated to parent hub address
3. Separate invoices per child or consolidated to parent

### Current Implementation: Option A
We start with Option A as it matches the existing workflow. The sub-account structure provides visibility into which child locations exist under each hub parent, even though orders are placed at the parent level.

## Revenue Rollup

The `crm_customer_summary` view handles hub accounts by:
1. For `hub_parent` accounts: revenue includes orders placed directly against the parent
2. For `hub_child` accounts: shows individual order history if any orders are placed against the child
3. A separate `crm_hub_summary` aggregation can roll up child revenue to the parent for total account visibility

## Migration Strategy

### Step 1: Add columns to customers table
- `parent_customer_id` (uuid, FK self-referential, nullable)
- `account_type` (text, default 'direct')

### Step 2: Set existing accounts
- All existing 38 accounts default to `account_type = 'direct'`
- Sol Flower (SOL) updated to `account_type = 'hub_parent'`
- Earth's Healing (WEE) updated to `account_type = 'hub_parent'`

### Step 3: Create child accounts (manual via CRM UI)
- Child location records created by sales staff through the CRM Account Detail page
- Inherits parent license info where applicable
- Gets its own address for reporting purposes

## Story Dispensaries Note

Story has 9 separate location entries (Midtown Phoenix, Tolleson, Bullhead City, Dunlap, Havasu, Bell, Grand, North Chandler, South Chandler, McDowell, Williams). These are currently modeled as separate `direct` accounts with independent orders, which is correct since each Story location places and receives its own orders independently. They share the same buyer contact (Nialetti Delay) but operate as independent accounts.

If Story ever moves to a hub delivery model, the same parent/child pattern can be applied by:
1. Creating a "Story Partners" hub_parent record
2. Updating all Story location records to `hub_child` with `parent_customer_id` pointing to the parent
3. Existing orders remain linked to the individual location records (no data migration needed)

## UI Implementation

### Account Detail Page - Sub-Accounts Panel
- Visible only when `account_type = 'hub_parent'`
- Lists all child locations with address, dispensary_code, order count
- "Add Location" button to create new hub_child record
- Click on child to navigate to its own detail page

### Accounts List - Hub Indicator
- Hub parent accounts show a badge/icon indicating they have child locations
- Optional filter to show hub parents only, or expand to show children
