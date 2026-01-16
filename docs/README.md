# CULT Seed-to-Sale — Documentation Index

Last updated: 2025-11-26
Owner: Justin (Product) • Admins: CULT Core Team

---

## 🤖 For AI Assistants (Bolt.new, Claude, GPT-4, etc.)

> **⚠️ START HERE EVERY SESSION** - This section is CRITICAL for AI consistency

**Before doing ANYTHING, read these documents in order:**

1. **[AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md)** ⭐ **MOST IMPORTANT**
   - Current system status and implementation phase
   - Critical architectural rules you MUST follow
   - Recent decisions and context
   - **Read time:** 5-10 minutes

2. **[AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md)** - Development protocols
   - Session start checklist
   - Code modification rules
   - Quality gates
   - **Read time:** 5 minutes when needed

3. **[MASTER-IMPLEMENTATION-PLAN.md](./MASTER-IMPLEMENTATION-PLAN.md)** - 8-phase development plan
   - What's been completed (Phases 1-6 ✅)
   - Current work (Phase 7 - UI/UX Polish)
   - Future roadmap
   - **Read time:** Skim for context, deep-dive sections as needed

4. **[CHANGELOG-GUIDE.md](./CHANGELOG-GUIDE.md)** - How to document changes
   - Every code change MUST have a changelog entry
   - Documentation standards
   - **Read time:** 3 minutes

**Quick Session Start Template:**

```
🎯 SESSION START

Read docs/AI-SESSION-BRIEF.md first.

After reading, confirm:
1. Current phase: [You fill in]
2. My mission: [You fill in]
3. Critical rules: [List top 3]

Then we'll discuss what to build.
```

**Why This Matters:**
- ✅ Prevents duplicate work
- ✅ Ensures architectural consistency
- ✅ Avoids common mistakes
- ✅ Maintains code quality
- ✅ Preserves context across sessions

**No time to read?** At minimum, read **AI-SESSION-BRIEF.md** - it's the distilled essence of everything you need to know.

---

## How to use this
Start here, then open the linked document for the module you're working on.
All specifications are **additive and non-destructive**, preserving working Bolt features.

## For Developers

**🚀 Getting Started:**
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - **START HERE** - Quick answers to common questions
- [TESTING-&-MIGRATION.md](./TESTING-&-MIGRATION.md) - Database type generation, testing protocols, migration procedures
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Documentation status, implementation tracking, type generation strategy

**📊 System Architecture:**
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Complete end-to-end workflow with state machines
- [DATASETS.md](./DATASETS.md) - Database schema and data model reference
- [BATCHES.md](./BATCHES.md) - Batch-centric architecture (PRIMARY REFERENCE)

**🎨 UI/Frontend Development:**
- [UI-PATTERNS.md](./UI-PATTERNS.md) - Navigation patterns, forms, modals, tables, and state feedback
- [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md) - Shared component library API documentation

**🔧 Feature Modules:**
- [PRODUCTS.md](./PRODUCTS.md) - Product catalog, strains, types, stages, and conversions
- [CUSTOMERS.md](./CUSTOMERS.md) - Customer management, license tracking, and geocoding
- [SESSIONS.md](./SESSIONS.md) - Trim, bucking, and packaging session workflows
- [ORDERS.md](./ORDERS.md) - Order creation, fulfillment, and status tracking
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Event-driven inventory management
- [COA-HANDLING.md](./COA-HANDLING.md) - Certificate of Analysis management
- [INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md) - Invoice and manifest generation, delivery routing
- [RECONCILIATION.md](./RECONCILIATION.md) - Physical inventory audits and variance tracking
- [ANALYTICS.md](./ANALYTICS.md) - Analytics, reporting, and dashboard widgets

## Navigation Architecture

**Latest UI Update (2025-11-10):**

The application uses a **hamburger menu with slide-out drawer** navigation pattern:

- **Hamburger Button** (☰): Three horizontal lines in header that toggle navigation drawer
- **Slide-Out Drawer**: Panel slides in from left with tree navigation menu
- **Tree Navigation**: Hierarchical menu with collapsible sections (accordion pattern)
- **Menu Structure**: Organized into logical groups (Operations, Production, Distribution, Settings)
- **Settings Page**: Uses same tree navigation pattern for 14+ subsections

See [UI-PATTERNS.md](./UI-PATTERNS.md) for complete implementation guide.

---

## Conventions
- Weight Units: grams (`g`) or `unit`, round to 0.1 g
- Package ID: `YYMMDD-STRAIN-PKG` (inherits batch prefix)
- Batch ID: `YYMMDD-STRAIN`
- Conversions: 1 lb = 453.592 g, 0.5 lb = 226.796 g
- Time Zone: Store UTC, display America/Phoenix
