---
title: SETTINGS
category: Platform, Settings & Safety
version: 2.0
updated: 2025-11-20
---

# SETTINGS - System Configuration and Management

> **Status:** Documented (Evidence-Based)
> **Purpose:** Centralized configuration hub for system-wide settings, user management, and operational parameters
> **Foundation:** Key-value storage pattern with category-based organization
> **Critical:** Settings drive compliance documentation, user permissions, and system behavior
> **Cross-References:** [TEST-MODE](./TEST-MODE.md), [AUTH](./AUTH.md), [SYSTEM-WORKFLOW](./SYSTEM-WORKFLOW.md)

---

## TABLE OF CONTENTS

1. [Purpose](#purpose)
2. [Architecture Overview](#architecture-overview)
3. [App Settings Table](#app-settings-table)
4. [Settings Categories](#settings-categories)
5. [User Management](#user-management)
6. [Driver and Vehicle Management](#driver-and-vehicle-management)
7. [Product Catalog Settings](#product-catalog-settings)
8. [Test Mode Configuration](#test-mode-configuration)
9. [Settings UI Pattern](#settings-ui-pattern)
10. [RLS Policies](#rls-policies)
11. [Implementation Status](#implementation-status)
12. [Related Documentation](#related-documentation)

---

## Purpose

The Settings module provides a centralized configuration hub for all system-wide parameters and operational settings. It serves as:

- **Configuration Store:** Key-value storage for system parameters
- **User Administration:** User account management and role assignment
- **Operational Setup:** Driver, vehicle, and facility configuration
- **Catalog Management:** Product types, stages, strains, and conversions
- **Compliance Setup:** Company license, warnings, and regulatory text
- **Test Mode Control:** Enable/disable test mode and manage testing

**Critical Principle:** Settings define how the system behaves. Incorrect settings can lead to compliance violations, operational errors, or security issues. Settings should be managed carefully with appropriate access controls.

---

## Architecture Overview

### Settings Storage Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SETTINGS ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  app_settings table (Key-Value Store)                                │
│  └─ category: text (grouping)                                        │
│     └─ key: text (setting name)                                      │
│        └─ value: jsonb (setting data)                                │
│                                                                       │
│  Examples:                                                            │
│  ┌────────────┬─────────────────────┬──────────────────────────┐  │
│  │ Category   │ Key                 │ Value                    │  │
│  ├────────────┼─────────────────────┼──────────────────────────┤  │
│  │ compliance │ company_name        │ "Kind Meds Inc."         │  │
│  │ compliance │ license_number      │ "00000078DCBK00628996"   │  │
│  │ compliance │ pregnancy_warning   │ "Using marijuana..."     │  │
│  │ operations │ facility_lat        │ 33.4484                  │  │
│  │ operations │ facility_lng        │ -112.0740                │  │
│  │ testing    │ test_mode_enabled   │ false                    │  │
│  │ branding   │ company_logo_url    │ "/storage/logos/..."     │  │
│  │ branding   │ eye_logo_url        │ "/storage/logos/..."     │  │
│  └────────────┴─────────────────────┴──────────────────────────┘  │
│                                                                       │
│  Settings UI (Hierarchical Tree Navigation)                          │
│  └─ 📁 Company & Compliance                                          │
│  └─ 📁 User Management                                                │
│  └─ 📁 Drivers & Vehicles                                             │
│  └─ 📁 Product Catalog                                                │
│     ├─ Product Types                                                 │
│     ├─ Processing Stages                                             │
│     ├─ Strains                                                       │
│     └─ Conversions                                                   │
│  └─ 📁 Branding & Logos                                               │
│  └─ 📁 Test Mode                                                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Updates Setting → Validate Input → Save to Database → Emit Change Event → Update UI
                                             │
                                             └─ Other Components Listen → Re-fetch Settings
```

---

## App Settings Table

### Schema

```sql
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, key)
);
```

### Access Pattern

**Read Settings:**
```typescript
const { data: settings } = await supabase
  .from('app_settings')
  .select('*')
  .eq('category', 'compliance');
```

**Update Setting:**
```typescript
const { error } = await supabase
  .from('app_settings')
  .upsert({
    category: 'compliance',
    key: 'company_name',
    value: { text: 'Kind Meds Inc.' }
  }, {
    onConflict: 'category,key'
  });
```

### Setting Value Patterns

**Simple Text:**
```json
{
  "category": "compliance",
  "key": "company_name",
  "value": "Kind Meds Inc."
}
```

**Structured Data:**
```json
{
  "category": "operations",
  "key": "facility_coordinates",
  "value": {
    "latitude": 33.4484,
    "longitude": -112.0740,
    "address": "123 Main St, Phoenix, AZ 85001"
  }
}
```

**Boolean Flags:**
```json
{
  "category": "testing",
  "key": "test_mode_enabled",
  "value": false
}
```

---

## Settings Categories

### 1. Compliance Settings

**Purpose:** Regulatory and compliance information for documentation

**Settings:**
- `company_name` - Legal business name
- `license_number` - State cannabis license number
- `pregnancy_warning` - Required warning text per state law
- `company_phone` - Contact phone number
- `facility_address` - Physical address for manifests

**Usage:** These settings populate invoices, manifests, labels, and coversheets with required compliance information.

**Example:**
```typescript
const complianceSettings = {
  company_name: 'Kind Meds Inc.',
  license_number: '00000078DCBK00628996',
  pregnancy_warning: 'Using marijuana during pregnancy could cause birth defects...',
  company_phone: '(602) 555-0100'
};
```

### 2. Operations Settings

**Purpose:** Operational parameters for facility and routing

**Settings:**
- `facility_lat` - Facility latitude for route calculations
- `facility_lng` - Facility longitude for route calculations
- `facility_name` - Facility display name
- `default_route_origin` - Starting point for delivery routes

**Usage:** Route optimization and delivery manifest generation.

### 3. Branding Settings

**Purpose:** Visual branding for documents and UI

**Settings:**
- `company_logo_url` - Main company logo (Supabase Storage URL)
- `eye_logo_url` - Secondary logo/icon (Supabase Storage URL)

**Usage:** Invoices, labels, and printed documents include company branding.

**Logo Upload Process:**
1. User selects image file
2. Upload to Supabase Storage `logos` bucket
3. Get public URL
4. Save URL to app_settings
5. Documents reference URL for logo display

### 4. Testing Settings

**Purpose:** Test mode configuration and control

**Settings:**
- `test_mode_enabled` - Boolean flag enabling test mode
- `test_mode_audit_retention_days` - How long to keep audit logs

**Usage:** See [TEST-MODE.md](./TEST-MODE.md) for complete test mode documentation.

**Security:** Only admin users can enable/disable test mode.

### 5. Invoice Settings

**Purpose:** Invoice formatting and numbering

**Settings:**
- `invoice_prefix` - Prefix for invoice numbers (e.g., "INV")
- `invoice_counter` - Current invoice sequence number
- `invoice_terms` - Payment terms text
- `invoice_notes` - Default notes on invoices

**Usage:** Invoice generation and formatting.

---

## User Management

### User Administration Interface

**Location:** Settings → User Management

**Features:**
- View all user accounts
- Create new users (admin only)
- Assign roles (admin, manager, user)
- Disable user accounts
- Reset user passwords (admin-initiated email)
- View user activity logs

### Password Reset Feature

**Admin-Initiated Password Reset:**

Administrators can trigger password reset emails for any user account. This is useful when:
- User forgot their password
- User's account needs to be reset for security
- User cannot access the self-service password reset
- New user needs to set their initial password

**How It Works:**

1. **Admin triggers reset:**
   - Navigate to Settings → User Management
   - Click "Reset Password" button next to user
   - Confirm the action

2. **System sends email:**
   - Password reset email sent to user's registered email
   - Email contains secure reset link
   - Link expires after 24 hours

3. **User completes reset:**
   - User clicks link in email
   - Redirected to password reset page
   - Enters new password
   - Successfully logs in with new password

**Security Features:**
- Admin cannot see or set the password directly
- Reset link is single-use and time-limited
- All password resets are logged for audit
- Email must be delivered to user's registered address

**Configuration Requirements:**

This feature requires proper SMTP configuration in Supabase to send emails reliably:

1. **Navigate to Supabase Dashboard:**
   - Project Settings → Authentication → SMTP Settings

2. **Configure SMTP Provider:**
   - SMTP Host (e.g., smtp.sendgrid.net)
   - SMTP Port (usually 587)
   - SMTP Username
   - SMTP Password
   - Sender Email
   - Sender Name

3. **Test Email Delivery:**
   - Send test password reset
   - Verify email arrives within 2 minutes
   - Check spam folder if not received

**Recommended SMTP Providers:**
- **SendGrid:** Free tier 100 emails/day
- **Amazon SES:** Pay-as-you-go, very reliable
- **Mailgun:** Free tier 5,000 emails/month
- **Postmark:** Excellent deliverability

**Without SMTP Configuration:**
- Emails may be delayed or blocked
- Rate limits on Supabase default service
- Not recommended for production use

**See Also:** [AUTH.md](./AUTH.md) for complete password reset documentation

### User Roles

**Role Hierarchy:**
```
Admin (Full Access)
  └─ Can manage all users
  └─ Can enable/disable test mode
  └─ Can modify all settings
  └─ Can deploy migrations (with appropriate access)

Manager (Operational Control)
  └─ Can approve conversions
  └─ Can manage inventory
  └─ Can create/edit orders
  └─ Cannot manage users
  └─ Cannot enable test mode

User (Basic Access)
  └─ Can view orders
  └─ Can create orders
  └─ Can view inventory
  └─ Cannot approve conversions
  └─ Cannot modify settings
```

### User Profile Fields

```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL UNIQUE,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### First User Bootstrap

**Automatic Admin Assignment:**
- First user to sign up automatically receives admin role
- Ensures initial system access without manual database modification
- Subsequent users default to 'user' role
- Admin must manually elevate other users

**Trigger Implementation:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

---

## Driver and Vehicle Management

### Drivers

**Location:** Settings → Drivers & Vehicles → Drivers

**Schema:**
```sql
CREATE TABLE delivery_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_number text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Usage:** Manifest generation requires driver assignment for compliance.

### Vehicles

**Location:** Settings → Drivers & Vehicles → Vehicles

**Schema:**
```sql
CREATE TABLE delivery_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  license_plate text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Usage:** Manifest generation includes vehicle details for tracking.

---

## Product Catalog Settings

### Product Types

**Location:** Settings → Product Catalog → Product Types

**Purpose:** Define sellable product SKUs (e.g., "3.5g Jar", "14g Bag")

**Schema:**
```sql
CREATE TABLE product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text,
  unit_size_grams numeric,
  is_active boolean DEFAULT true
);
```

**Examples:**
- Packaged_3_5g (3.5g flower jars)
- Packaged_14g (14g flower bags)
- Packaged_28g (28g flower bags)
- Bulk_Flower (bulk weight flower)
- Trim (trim product)

### Processing Stages

**Location:** Settings → Product Catalog → Stages

**Purpose:** Define inventory processing stages

**Schema:**
```sql
CREATE TABLE processing_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  stage_order integer NOT NULL,
  description text
);
```

**Standard Stages:**
1. Binned (raw harvest material)
2. Bucked (stems removed)
3. Bulk (trimmed bulk flower)
4. Packaged (retail-ready packages)

### Strains

**Location:** Settings → Product Catalog → Strains

**Purpose:** Catalog of cannabis strains

**Schema:**
```sql
CREATE TABLE strains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  lineage text,
  thc_range text,
  cbd_range text,
  description text,
  is_active boolean DEFAULT true
);
```

**Examples:**
- Girl Scout Cookies (GSC)
- Animal Tsunami (AT)
- Blue Dream (BD)
- Gorilla Glue #4 (GG4)

### Conversions

**Location:** Settings → Product Catalog → Conversions

**Purpose:** Define stage-to-stage conversion rules

**Schema:**
```sql
CREATE TABLE conversion_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  from_stage_id uuid REFERENCES processing_stages(id),
  to_stage_id uuid REFERENCES processing_stages(id),
  requires_manager_approval boolean DEFAULT false,
  is_active boolean DEFAULT true
);
```

**Example Conversions:**
- Binned → Bucked (bucking session)
- Bucked → Bulk (trim session)
- Bulk → Packaged (packaging session)

---

## Test Mode Configuration

**Location:** Settings → Test Mode

**Purpose:** Enable and configure test mode for facility validation

### Test Mode Toggle

**Interface:**
```
Test Mode Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Status: ⚫ Disabled

Test mode allows you to test workflows without
enforcing inventory validations. Use only for
training and validation purposes.

[Enable Test Mode]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Audit Log Settings:
  Retention Period: [30] days
  Auto-cleanup:     [✓] Enabled

[View Audit Log] [Clean Up Test Data]
```

**Settings:**
- `test_mode_enabled` - Boolean flag
- `test_mode_audit_retention_days` - Integer (default: 30)
- `test_mode_auto_cleanup` - Boolean (default: true)

**See:** [TEST-MODE.md](./TEST-MODE.md) for complete documentation

---

## Settings UI Pattern

### Hierarchical Tree Navigation

The Settings page uses a **tree navigation pattern** with collapsible sections:

```
Settings
├─ 📁 Company & Compliance
│  ├─ Company Information
│  ├─ License Details
│  └─ Warnings & Disclaimers
├─ 📁 User Management
│  ├─ User List
│  ├─ Create User
│  └─ Role Management
├─ 📁 Drivers & Vehicles
│  ├─ Drivers List
│  └─ Vehicles List
├─ 📁 Product Catalog
│  ├─ Product Types
│  ├─ Processing Stages
│  ├─ Strains
│  ├─ Conversions
│  └─ Branding
├─ 📁 Facility & Operations
│  ├─ Facility Location
│  └─ Route Settings
├─ 📁 Branding & Logos
│  ├─ Company Logo
│  └─ Eye Logo
└─ 📁 Test Mode
   ├─ Test Mode Toggle
   ├─ Audit Log Viewer
   └─ Test Data Cleanup
```

### Navigation Pattern

**Accordion-Style Expansion:**
- Click section to expand/collapse
- Only one section open at a time (optional)
- Persistent selection across page refreshes
- Active section highlighted

**Responsive Behavior:**
- Desktop: Sidebar navigation with content panel
- Mobile: Full-width accordion

---

## RLS Policies

### App Settings Access

**Read Access:**
```sql
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);
```

**Write Access:**
```sql
CREATE POLICY "Only admins can modify settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

### User Profiles Access

**Read Own Profile:**
```sql
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')
  ));
```

**Admin Manage All:**
```sql
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Implementation Status

### Current Status: ✅ Implemented

**Completed:**
- App settings table schema
- User management system
- Driver and vehicle management
- Product catalog settings
- RLS policies
- Settings UI with tree navigation
- Logo storage and management

**In Progress:**
- Test mode configuration (Phase 2)
- Test mode audit trail (Phase 2)
- Enhanced settings validation

**Planned:**
- Settings versioning and audit trail
- Settings import/export
- Settings backup and restore
- Settings documentation generator

**Evidence:**
- Migration: `20251010213003_create_app_settings_table.sql`
- Migration: `20251012024203_create_user_profiles_and_roles.sql`
- Migration: `20251017012033_create_delivery_drivers_table.sql`
- Migration: `20251017012042_create_delivery_vehicles_table.sql`
- Module: `src/features/settings/` (15 files, 2,650 lines)

---

## Related Documentation

### Core Architecture
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Settings role in system workflows
- [AUTH.md](./AUTH.md) - User authentication and roles
- [TEST-MODE.md](./TEST-MODE.md) - Test mode configuration

### Feature Modules
- [PRODUCTS.md](./PRODUCTS.md) - Product catalog management
- [CUSTOMERS.md](./CUSTOMERS.md) - Customer settings and preferences
- [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) - Document settings
- [LABELS.md](./LABELS.md) - Label configuration

### Implementation
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Settings module status
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Settings access patterns
- [UI-PATTERNS.md](./UI-PATTERNS.md) - Settings UI components

---

## Notes

This document is part of the CULT Seed-to-Sale system documentation. It follows the batch-centric architecture and maintains alignment with the event-driven inventory strategy. Settings are designed to be centralized, secure, and easily manageable through a hierarchical UI pattern.

**Version History:**
- 1.0 (2025-11-06): Initial stub documentation
- 2.0 (2025-11-20): Complete documentation with all settings categories
