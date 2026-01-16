# DOCS_OVERVIEW.md

A brief index for all CULT Seed-to-Sale v1.0 modules.

## Documentation Categories

### System Overview
Core system architecture, data structures, and workflows.

### Frontend Development
UI components, patterns, and implementation guides.

### Inventory & Production
Material tracking, batch management, and production workflows.

### Sales & Fulfillment
Order processing, invoicing, labeling, and compliance documentation.

### Analytics & Reporting
Performance metrics and business intelligence.

### Platform, Settings & Safety
System configuration, error handling, and deployment procedures.

---

## Documentation Index

| File | Category | Summary |
|------|-----------|----------|
| **System Overview** |
| SYSTEM-WORKFLOW.md | System Overview | Defines system flow from cultivation to sales |
| DATASETS.md | System Overview | Describes all tables and relationships |
| DEVELOPER_QUICK_REFERENCE.md | System Overview | Quick reference for developers |
| **Frontend Development** |
| UI-PATTERNS.md | Frontend Development | Common UI interaction patterns and navigation |
| UI-COMPONENTS-REFERENCE.md | Frontend Development | Shared component library API documentation |
| **Inventory & Production** |
| INVENTORY-TRACKING.md | Inventory & Production | Manages material flow, batch states, conversions |
| RECONCILIATION.md | Inventory & Production | Audit and variance management |
| EXTERNAL-PROCESSING.md | Inventory & Production | Outbound/inbound vendor processing |
| BATCHES.md | Inventory & Production | Batch lifecycle and management |
| SESSIONS.md | Inventory & Production | Production sessions (trim, packaging, bucking) |
| **Sales & Fulfillment** |
| ORDERS.md | Sales & Fulfillment | Order entry and processing logic |
| INVOICING-&-MANIFESTING.md | Sales & Fulfillment | Invoice and manifest creation workflows |
| LABELS.md | Sales & Fulfillment | Internal and compliance label logic |
| COA-HANDLING.md | Sales & Fulfillment | COA uploads, verification, and linkage |
| COVER-SHEETS.md | Sales & Fulfillment | Order-level compliance documentation |
| CUSTOMERS.md | Sales & Fulfillment | Customer management and licensing |
| **Analytics & Reporting** |
| ANALYTICS.md | Analytics & Reporting | Production metrics, sales forecasting, and conversion analysis |
| **Platform, Settings & Safety** |
| SETTINGS.md | Platform, Settings & Safety | System-level configurations and access |
| ERROR-HANDLING.md | Platform, Settings & Safety | Error UX and validation responses |
| TESTING-&-MIGRATION.md | Platform, Settings & Safety | Deployment and verification procedures |

---

## Quick Navigation Guide

**New to the project?** Start here:
1. SYSTEM-WORKFLOW.md - Understand overall system flow
2. DEVELOPER_QUICK_REFERENCE.md - Development setup and patterns
3. UI-PATTERNS.md - Learn UI conventions and patterns
4. DATASETS.md - Understand database structure

**Implementing a feature?**
- UI work → UI-PATTERNS.md + UI-COMPONENTS-REFERENCE.md
- Backend work → Relevant feature doc (ORDERS.md, INVENTORY-TRACKING.md, etc.)
- Database changes → DATASETS.md + TESTING-&-MIGRATION.md

**Navigation Updates (Latest):**
- Hamburger menu with slide-out drawer pattern added to UI-PATTERNS.md
- Tree navigation/accordion pattern documented
- NavigationDrawer, HamburgerButton, TreeNavigation, and Breadcrumbs components added to UI-COMPONENTS-REFERENCE.md
