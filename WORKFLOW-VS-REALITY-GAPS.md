# SYSTEM-WORKFLOW vs. Reality - Key Disconnects

**Date:** 2025-11-10
**Purpose:** Identify where SYSTEM-WORKFLOW.md expectations don't match actual module implementations
**Source:** Complete module validation results (13 of 13 modules)

---

## Executive Summary

The SYSTEM-WORKFLOW.md document is **generally accurate** (v2.2, updated 2025-11-10) and includes a comprehensive "Known Gaps" section (8.1) that documents most implementation shortcomings. However, several **architectural and feature-level expectations don't match reality**.

### ✅ What the Workflow Gets Right

1. **Known Gaps Section (8.1)** - Documents 9 missing features with status tracking
2. **Batch-Centric Architecture** - Correctly emphasizes batches as system foundation
3. **Session Workflows** - Accurately describes trim/packaging session flows
4. **Order Status States** - Matches actual order workflow implementation
5. **COA Management** - Correctly describes batch-scoped COA approach
6. **Conversions Workflow** - Accurately documents pending_conversions and manager approval

### ⚠️ What the Workflow Misses or Misrepresents

---

## Category 1: Missing Modules (Not Mentioned in Workflow)

### 1. Dashboard Module - NO MENTION

**What Workflow Says:** Nothing. Dashboard is not referenced anywhere.

**What Actually Exists:**
- 14 files, 1,508 lines of code
- 9 comprehensive widgets (sales, orders, batch allocation, sessions, deliveries)
- Real-time Supabase subscriptions
- Main application entry point
- Uses 3 database views

**Impact:** **HIGH**
- Dashboard is the PRIMARY user interface
- Provides operational visibility that's undocumented
- Real-time batch allocation monitoring not mentioned
- Over-allocation detection widgets not in workflow

**Recommendation:** Add Section 6.3 "Dashboard & Operational Visibility"
- Document 9 widgets and their data sources
- Explain real-time monitoring capabilities
- Link to batch allocation overview widget

---

### 2. Order-Form Module (Public) - PARTIALLY MENTIONED

**What Workflow Says:**
- Section 3.1 mentions "public order form" briefly
- Listed as source: `order_source: 'public_form' OR 'internal'`
- No details on workflow or features

**What Actually Exists:**
- 10 files, 1,551 lines of code
- Multi-step wizard (Details → Products → Cart → Review)
- **Auto-save drafts** (2s debounce, session recovery)
- `draft_orders` table for session-based storage
- Public access (no authentication required)
- Price locking feature for negotiated rates
- Mobile-responsive design

**Impact:** **MEDIUM**
- Public-facing feature is underdocumented
- Auto-save draft system not mentioned (affects data flow)
- `draft_orders` table not in workflow
- Session recovery mechanism not explained

**Recommendation:** Add Section 3.0.5 "Public Order Submission"
- Document draft_orders table and purpose
- Explain auto-save mechanism (affects db writes)
- Clarify authentication model (public vs internal)
- Document session-based draft recovery

---

### 3. Auth Module - NO MENTION

**What Workflow Says:** Nothing. Authentication/authorization not mentioned.

**What Actually Exists:**
- 6 files, 509 lines of code
- Supabase Auth integration
- Role-Based Access Control (admin/manager/user)
- Auto profile creation on signup
- First user becomes admin automatically
- Password reset flow
- `user_profiles` table with roles

**Impact:** **HIGH**
- Workflow mentions "manager approval" repeatedly but doesn't explain auth
- Section 2.4 says "manager-only conversions" but no auth context
- Role checks (isAdmin, isManager) affect all workflows
- RLS policies depend on auth.uid() but workflow doesn't explain this

**Recommendation:** Add Section 0.5 "Authentication & Authorization"
- Document user_profiles table and roles
- Explain manager vs admin vs user permissions
- Link role requirements to workflow steps (e.g., "requires manager role")
- Document first-user bootstrap logic

---

## Category 2: Event-Driven Architecture Mismatch

### 4. Event-Driven Inventory Ledger - DOCUMENTED BUT NOT IMPLEMENTED

**What Workflow Says (Section 4.1):**
```
INVARIANT: Every quantity change MUST flow through inventory_movements

Trigger Logic:
CREATE TRIGGER trg_update_on_hand_qty_after_movement
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION fn_update_inventory_on_hand();
```

**What Actually Exists:**
- ✅ 7 migrations create event-driven infrastructure
- ❌ Application doesn't use it (bypasses ledger)
- ❌ Only 1 of 9 movement_kinds is used
- ❌ Most code does direct `UPDATE inventory_items SET on_hand_qty`
- ❌ Missing 10 triggers documented in workflow

**Evidence from Module Validations:**
- **Inventory Module (60% accuracy):** "CRITICAL architectural divergence. Event-driven ledger infrastructure exists but application doesn't use it."
- **Sessions Module (85% accuracy):** "Bypasses event-driven ledger, dual batch references"
- **Orders Module (80% accuracy):** "Fulfillment trigger uses deprecated inventory system"

**Impact:** **CRITICAL**
- Workflow describes ideal architecture, not actual implementation
- Developers following workflow will be confused
- Audit trail incomplete (movements not logged)

**Recommendation:**
**Option A:** Implement event-driven ledger as documented
**Option B:** Update workflow to reflect direct-update architecture
**Decision needed:** Which direction to take?

---

## Category 3: Analytics & Reporting

### 5. Analytics Module - NOT IN WORKFLOW

**What Workflow Says:**
- Section 6.1 "Batch Yield Analysis" - describes queries
- Section 6.2 "Variance Trending" - describes queries
- Both sections show SQL examples only

**What Actually Exists:**
- 7 files, 984 lines of code
- 3 production-ready reports:
  1. AnalyticsDashboard - Comprehensive metrics
  2. ProductionSummary - Session-based analytics
  3. EOD Summary - Daily operations report
- 7 service functions
- 4 database views for analytics
- Print-friendly report designs

**Impact:** **LOW-MEDIUM**
- Analytics are more comprehensive than workflow suggests
- 4 database views exist but aren't documented in workflow
- Reports have UI but workflow only shows SQL
- EOD Summary report not mentioned

**Recommendation:** Update Section 6
- List 3 report types and their purposes
- Document 4 analytics database views
- Explain print workflow (reports designed for printing)
- Link to ANALYTICS.md (once created)

---

## Category 4: Delivery & Logistics

### 6. Delivery Module - BASIC WORKFLOW ONLY

**What Workflow Says (Section 3.4):**
- Basic manifest generation
- Driver/vehicle assignment
- Delivery status tracking
- Mentions multi-stop routing as "MISSING"

**What Actually Exists:**
- 13 files, 3,121 lines of code
- **OpenRouteService API integration** (routing + geocoding)
- **Leaflet maps** for route visualization
- **Route caching** for performance
- **Multi-stop optimization** (not missing!)
- **Distribution calendar** for scheduling
- 5 service layers
- GeocTo coding service for address validation

**Impact:** **MEDIUM**
- Workflow says "MISSING: Multi-stop route optimization" (DELTA Section 3.4)
- Actually implemented with external API integration
- Sophisticated mapping system not mentioned
- Route caching strategy not explained

**Recommendation:** Update Section 3.4
- Remove "MISSING" tag for route optimization
- Document OpenRouteService integration
- Explain geocoding flow for customer addresses
- Add route caching strategy
- Document distribution calendar

---

## Category 5: Settings & Configuration

### 7. Settings Module - NO MENTION

**What Workflow Says:** Nothing. Settings/configuration not mentioned.

**What Actually Exists:**
- 15 files, 2,650 lines of code
- Centralized configuration hub
- `app_settings` table (key-value storage)
- User management UI
- Driver/vehicle CRUD
- Logo management (Supabase Storage)
- **Embeds 10+ other module UIs in tabs**
- Product types, stages, strains management

**Impact:** **MEDIUM**
- Workflow references `app_settings` table but doesn't explain it
- Driver/vehicle entities used in Section 3.4 but not introduced
- Configuration workflow missing entirely
- Logo management (affects coversheets/labels) not mentioned

**Recommendation:** Add Section 0.6 "System Configuration"
- Document app_settings table structure
- Explain key-value storage pattern
- List configurable settings (category-based)
- Document driver/vehicle management
- Link to Settings hub as central config point

---

## Category 6: Module-Level Implementation Gaps

### 8. Database Types Outdated (Affects All Modules)

**What Workflow Says:** Nothing. Assumes types are current.

**What Actually Exists:**
- `database.types.ts` is **outdated**
- Missing 40+ tables from schema
- `lifecycle_state` type unusable
- Affects 4 modules: Batches, Inventory, Sessions, Orders

**Impact:** **HIGH**
- Workflow references types that don't exist in generated file
- Developers can't use type system as documented
- GAP-001 mentions batch_id nullability but types don't reflect this

**Recommendation:** Add to Known Gaps (Section 8.1)
```
#### 10. Database Types Generation Outdated
**Status:** 🔴 CRITICAL BLOCKER
**Reality:** database.types.ts missing 40+ tables
**Impact:** Type system incomplete, TypeScript errors
**Fix:** Run `npm run types:generate`
**Priority:** CRITICAL - Blocks development
```

---

### 9. Terminology Inconsistencies

**What Workflow Says:**
- Section 3.2: Uses term "batch_allocations"
- Section 3.3: Uses term "order_fulfillment_items"

**What Actually Exists:**
- Code uses `package_assignments` (not batch_allocations)
- Both tables exist but workflow uses wrong names
- GAP-010 in Orders module documents this mismatch

**Impact:** **MEDIUM**
- Confusing for developers
- Workflow and code use different terms for same concept
- Database has both tables, workflow picks wrong one

**Recommendation:** Update Section 3.2-3.3
- Change "batch_allocations" → "package_assignments"
- Explain why both tables exist (historical evolution)
- Link to Orders module documentation for details

---

## Category 7: Storage Buckets

### 10. Storage Bucket Name Mismatches

**What Workflow Says:**
- Section 5.1: `coa_documents` bucket (public read)
- Section 3.3: Coversheet QR codes link to storage

**What Actually Exists:**
- COA bucket is actually named `coa-pdfs` (not `coa-documents`)
- Logo storage bucket exists but not mentioned
- Storage policies differ from workflow description

**Impact:** **LOW**
- Wrong bucket name in workflow
- Developers will get 404s
- Minor inconsistency

**Recommendation:** Update Section 5.1
- Change `coa_documents` → `coa-pdfs`
- Document logo storage bucket
- List all storage buckets in system
- Explain RLS policies for each bucket

---

## Summary Table: Workflow vs Reality

| Category | Workflow Claim | Reality | Impact | Priority |
|----------|---------------|---------|--------|----------|
| **Dashboard** | Not mentioned | 14 files, 9 widgets, entry point | HIGH | Add section |
| **Order-Form** | Brief mention | 10 files, draft system, public access | MEDIUM | Expand section |
| **Auth** | Not mentioned | 6 files, RBAC, critical system | HIGH | Add section |
| **Event Ledger** | "MUST use movements" | Bypassed, direct updates | CRITICAL | Update or implement |
| **Analytics** | SQL queries only | 3 reports, 4 views, print-ready | MEDIUM | Expand section |
| **Delivery** | "Multi-stop missing" | OpenRouteService integrated | MEDIUM | Update status |
| **Settings** | Not mentioned | 15 files, config hub | MEDIUM | Add section |
| **DB Types** | Assumes current | Outdated, 40+ tables missing | HIGH | Add to gaps |
| **Terminology** | batch_allocations | package_assignments | MEDIUM | Update names |
| **Storage** | coa_documents | coa-pdfs | LOW | Fix names |

---

## Recommendations

### Immediate Actions (Critical)

1. **Add Missing Module Sections**
   - Section 0.5: Authentication & Authorization
   - Section 0.6: System Configuration
   - Section 6.3: Dashboard & Operational Visibility

2. **Resolve Event-Driven Architecture**
   - **Decision Point:** Implement ledger OR update docs to reflect direct updates
   - If implementing: Follow workflow as-is, add missing triggers
   - If updating docs: Rewrite Section 4.1 to reflect actual architecture

3. **Add Database Types Gap to Known Gaps**
   - Section 8.1.10: Document outdated types blocker
   - Mark as CRITICAL priority

### Medium Priority

4. **Expand Order-Form Section**
   - Add Section 3.0.5: Public Order Submission
   - Document draft_orders table
   - Explain auto-save mechanism

5. **Update Analytics Section**
   - List 3 report types
   - Document 4 analytics views
   - Mention print-ready designs

6. **Update Delivery Section**
   - Remove "MISSING" tag for route optimization
   - Document OpenRouteService integration
   - Add geocoding flow

### Low Priority

7. **Fix Terminology**
   - Change batch_allocations → package_assignments
   - Explain historical naming evolution

8. **Fix Storage Names**
   - Change coa_documents → coa-pdfs
   - List all storage buckets

---

## Conclusion

The SYSTEM-WORKFLOW.md document (v2.2) is **substantially accurate** and includes a comprehensive Known Gaps section. The main issues are:

1. **Missing modules** (Dashboard, Auth, Settings) - Not mentioned but critical
2. **Event-driven architecture** - Documented but not implemented
3. **Feature completeness** - Some "MISSING" features actually exist

**Overall Assessment:** 85% accurate, needs 3 new sections and 1 architectural decision.

**Key Question:** Should the event-driven inventory ledger be **implemented as documented** or should the **workflow be updated to reflect direct-update architecture**?

This is the **most critical decision** affecting workflow accuracy.

---

**Document Created:** 2025-11-10
**Validation Source:** 13 module comparison reports
**Status:** Ready for review and decision on event-driven architecture
