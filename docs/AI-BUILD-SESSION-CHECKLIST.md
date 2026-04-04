---
title: AI Build Session Checklist
category: AI Development
updated: 2026-03-01
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-04-04 (Continuation: CFO Financial Planning + Paperclip Task Execution)
**Sessions:**
- [CUL-375](/CUL/issues/CUL-375): Arroya Cash Flow Modeling & Runway Integration (COMPLETE)
- [CUL-372](/CUL/issues/CUL-372): Arroya Financial Contract Terms & Payment Schedule (COMPLETE)
**Status:** COMPLETE — 2 high-priority Arroya tasks executed; 2 remaining in backlog

**What was done (Session 2 - April 4 Afternoon/Evening via Paperclip):**

Completed [CUL-372](/CUL/issues/CUL-372) — **Arroya Partnership: Financial Contract Terms and Payment Schedule**

Created `ARROYA-CONTRACT-TERMS-SCHEDULE.md` (board-ready contract terms, 10 sections, 480+ lines):

1. **Revenue Share Mechanics:** Three contract options (tiered 15→12→10%, fixed 12%, or performance-based 10%+2% bonus) with rationale; recommended: Option A (tiered) for growth incentives + unit economics
2. **Payment Schedule & Terms:** Monthly Net 30 invoicing; payment delay escalation (30/60/90-day thresholds with CEO involvement); ASC 606 accrual accounting
3. **MDF (Marketing Development Fund):** $20K Year 1 allocation, quarterly disbursement ($5K/quarter cap); eligible uses (co-branded content, webinars, events, lead gen); Year 2+ scaling to $25K–$40K based on revenue
4. **Year-End True-Up & Reconciliation:** Jan 15 summary, Jan 31 claims deadline, Feb 15 settlement; recalculation methodology; dispute resolution procedure
5. **Termination & Wind-Down:** 90-day mutual termination for convenience; termination for cause (material breach, SLA degradation); post-term customer/data handling (60-day transition, 90-day retention); no clawback
6. **Contract Schedules (Legal Exhibits):** Schedule A (ASC 606 revenue recognition), B (MDF guidelines), C (data/reporting specs), D (customer segment definitions)
7. **Implementation Roadmap:** Board approval checklist; CRO negotiation timeline (kickoff April 9–12, target execution April 30); Finance setup by April 12
8. **Risk Registry & Assumptions:** Year 1 base case $300K revenue (conservative vs. $400K aggressive in cash flow model); key risks (churn >15%, payment delays, MDF ROI)
9. **Sign-Off Blocks:** Board approval, legal review, CEO execution, Arroya signature (target: April 30, 2026)
10. **Related Documents:** Links to financial model, cash flow projections, P&L structure, revenue recognition policy

**Key Findings:**
- Revenue share recommendations support $668.5K cumulative Year 1–3 Arroya revenue per cash flow model
- Three contract options let Arroya choose while protecting unit economics (payback 3.3 months at any tier)
- MDF governance limits spend to $20K Y1, tracks ROI, enables board to scale for Y2 based on partnership performance
- Built-in reconciliation & dispute resolution reduce post-execution financial risk
- Finance setup (QB integration, billing flags, monthly reporting) enables flawless execution once contract signed

**CFO Priorities Completed:**
- ✅ **AI Agent Budget Controls Framework** (Session 1, [CUL-375](/CUL/issues/CUL-375))
- ✅ **SaaS Pricing Model** (Session 1, [CUL-375](/CUL/issues/CUL-375))
- ✅ **Development Costs** integrated into financial projections (Session 1, [CUL-375](/CUL/issues/CUL-375))
- ✅ **Cash Flow Modeling** with Arroya integration (Session 1, [CUL-375](/CUL/issues/CUL-375))
- ✅ **Contract Terms & Payment Schedule** for CRO negotiation (Session 2, [CUL-372](/CUL/issues/CUL-372))

**Build status:** Not applicable (financial planning, not code)
**Key Files (Session 1 + 2):**
- `docs/FINANCIAL-MODEL-ARROYA-PITCH.md` (584 lines)
- `docs/ARROYA-CASH-FLOW-MODEL.md` (550+ lines)
- `docs/ARROYA-CONTRACT-TERMS-SCHEDULE.md` (480+ lines)

**Known dependencies (Board + Operations):**
- ✅ CEO must review and approve revenue share tier by April 8 (contract negotiation prep)
- ✅ Board must approve partnership financial structure ($2.5M ask, revenue share, MDF, quarterly gates) by April 8
- ⏳ Legal counsel must review contract terms before CEO execution (by April 20)
- ⏳ CRO kicks off Arroya negotiation April 9–12 (payment terms, revenue tier thresholds, exclusive territories)
- ⏳ Finance must implement QB + billing setup by April 12 (monthly reconciliation automation)
- ⏳ Target contract execution: April 30, 2026 (pre-Series A pitch)

**Remaining Arroya Tasks (Assigned to CFO, High-Priority Backlog):**
- [CUL-373](/CUL/issues/CUL-373): Revenue Recognition Policy (ASC 606) — audit readiness; needed pre-Series A
- [CUL-374](/CUL/issues/CUL-374): P&L Structure and Monthly Reporting — partnership governance; needed post-contract execution

**Next steps (depends on board approval by April 8):**
1. ✅ Financial model + cash flow modeling + contract terms complete
2. ⏳ CEO/board review & approval of revenue share tier + financial structure (April 5–8)
3. ⏳ CRO negotiation kickoff with Arroya (April 9–12)
4. ⏳ Finance setup (QB integration, billing automation, reporting) (April 12–18)
5. ⏳ Legal review + CEO signature on final contract (April 20–25)
6. ⏳ Contract execution with Arroya (April 30, 2026)
7. ⏳ Implement [CUL-373](/CUL/issues/CUL-373) (ASC 606 policy) for audit readiness
8. ⏳ Implement [CUL-374](/CUL/issues/CUL-374) (P&L structure) for post-execution partnership governance

---

---

## Pre-Session Checklist

- [ ] Read [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md)
- [ ] Read [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) if touching inventory/sessions
- [ ] Read [PRODUCTS.md](./PRODUCTS.md) if touching conversions
- [ ] Scan last 3-5 entries in [CHANGELOG.md](../CHANGELOG.md)
- [ ] Read the Hand-Off section above

---

## Current Session

**Date:** _(fill in)_
**Goal:** _(fill in)_
**Status:** _(Not Started / In Progress / Complete)_

### Work Items

| Item | Status | Files Changed | Notes |
|------|--------|---------------|-------|
| _(add items as you work)_ | | | |

### Issues Encountered

| Issue | Resolution |
|-------|------------|
| _(log problems here)_ | |

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| _(log choices here)_ | |

---

## End-of-Session Checklist

- [ ] `npm run build` passes
- [ ] `npm run typecheck` run; error count documented (baseline: **501 errors** as of 2026-02-18)
- [ ] CHANGELOG.md updated (if significant changes)
- [ ] Hand-Off section updated with what was done, known issues, next steps
- [ ] Any new architectural decisions added to [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)

---

## Reference Links

**Start Here:**
- [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md) - System context and critical rules
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Code patterns

**Architecture:**
- [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) - Key design decisions
- [PRODUCTS.md](./PRODUCTS.md) - Canonical product stages and conversions
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - End-to-end workflows
- [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md) - Trigger system
- [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md) - Phased optimization plan (type safety, bundle, cleanup)

**Cultivation Module (C-1 complete — docs locked):**
- [CULTIVATION.md](./CULTIVATION.md) - Scope, entities, lifecycle, UI screens (START HERE for C-2/C-3)
- [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md) - Full schema, RLS, triggers, migration plan
- [CULTIVATION-RULES.md](./CULTIVATION-RULES.md) - Invariants, decisions, error messages, test requirements

**Pre-Cultivation Preparation:**
- [SYSTEM-HEALTH-ASSESSMENT.md](./SYSTEM-HEALTH-ASSESSMENT.md) - Readiness scores and Phase A-D work plan
- [CULTIVATION-PHASE-A-RISK-ANALYSIS.md](./CULTIVATION-PHASE-A-RISK-ANALYSIS.md) - Phase A: type hardening (COMPLETE)
- [CULTIVATION-PHASE-B-RISK-ANALYSIS.md](./CULTIVATION-PHASE-B-RISK-ANALYSIS.md) - Phase B: pagination caps (COMPLETE)
- [CULTIVATION-PHASE-C-RISK-ANALYSIS.md](./CULTIVATION-PHASE-C-RISK-ANALYSIS.md) - Phase C: service refactoring (COMPLETE)
- [CULTIVATION-PHASE-D-RISK-ANALYSIS.md](./CULTIVATION-PHASE-D-RISK-ANALYSIS.md) - Phase D: testing (244 tests, 177/178 passing)

**Modules:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [ANALYTICS.md](./ANALYTICS.md) | [RECONCILIATION.md](./RECONCILIATION.md)

**UI:** [UI-PATTERNS.md](./UI-PATTERNS.md) | [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md)
