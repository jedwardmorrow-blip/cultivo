---
title: CultOps AI/Agent Budget Control Framework
category: Financial Operations & Governance
version: 1.0
created: 2026-04-04
status: Ready for CTO Implementation
owner: CFO (Justin Morrow)
---

# CFO Agent Budget Control Framework

**Purpose:** Operationalize AI/agent spending controls to mitigate critical risk flagged by CTO. This document defines budget allocation, spending rules, ROI thresholds, monitoring, and reporting for all Paperclip agents and AI-powered features.

**Status:** Framework approved for implementation (April 2026). CTO to integrate with Paperclip governance.

---

## SECTION 1: BUDGET ALLOCATION & GOVERNANCE

### Overall Budget
- **Total CultOps Operating Budget (Year 1):** $2.5M
- **AI/Agent Budget Allocation:** $80K (3.2% of total) ← **HARD CAP**
- **Engineering Budget:** $680K (27%) — agents are a cost within engineering
- **Runway Protection:** $1.14M contingency (46%)

### Monthly Budget Caps by Use Case

| Use Case | Monthly Cap | Quarterly Limit | Examples & Owner |
|----------|------------|-----------------|-----------------|
| **Dev Acceleration** | $5K | $15K | Code gen, PR reviews, docs automation → CTO/Builder |
| **Customer-Facing** | $3K | $9K | Support chatbot, report gen, predictive insights → CEO/Product |
| **Ops/Admin** | $2K | $6K | Task automation, scheduling, data reconciliation → COO/Operations |
| **Experiments** | $1K | $3K | Market research, A/B testing, feature validation → Product/CTO |
| **Contingency** | $1K | $3K | Emergency overages or urgent needs → CFO approval only |
| **TOTAL MONTHLY** | **$12K** | **$36K** | Hard stop at $12K/month average |

**Annual Target:** $80K–$96K (depending on quarterly adjustments)

---

## SECTION 2: SPENDING RULES & CONTROLS

### Rule 1: Monthly Spend Tracking & Alerts
**Who tracks:** CTO (engineering) + CFO (monthly reconciliation)

- **By the 5th of each month:** CTO provides actual agent costs (Paperclip billing, Claude API, vendor costs) to CFO
- **Trigger points:**
  - At 75% of monthly budget → CTO notifies CFO (informational)
  - At 100% of monthly budget → CTO requests CFO approval for any new agent work
  - At 110% of monthly budget → CTO halt new agent features immediately; alert CEO
  - Above 125% → Emergency meeting with CFO + CEO; requires board notification

### Rule 2: Quarterly Review & Re-allocation
**Schedule:** End of Q1 (March 31), Q2 (June 30), Q3 (Sept 30), Q4 (Dec 31)

**Review Process:**
1. CTO + CFO review actual spend vs. budget (actual vs. plan)
2. Assess ROI of each agent-powered feature (see Rule 4 below)
3. Decide whether to:
   - Roll forward budget to next quarter
   - Cut underperforming features
   - Reallocate between use case buckets (with CFO sign-off)
   - Request board approval for budget increase
4. CFO documents decision in monthly report

### Rule 3: Agent Assignment & Accountability
**Every agent must have:**
- **Assigned budget** (e.g., "PR Review Bot: $1.5K/month")
- **Responsible owner** (CTO assigns; CFO validates)
- **Feature list** it powers
- **ROI target** for each feature
- **Review cadence** (monthly cost vs. plan; quarterly ROI review)

**Current Agents (Paperclip):**
| Agent | Owner | Monthly Budget | Features | Status |
|-------|-------|----------------|----------|--------|
| Builder (Code Gen) | CTO | $3K | PR reviews, doc gen, tests | ✅ Live |
| DBA (Data Automation) | CTO | $1.5K | Schema automation, migration helpers | ✅ Live |
| QA (Test Automation) | CTO | $1K | Test generation, coverage analysis | ✅ Live |
| Support Bot | CEO | $2K | Customer support, FAQs, report gen | 🔄 In dev |
| Product Research | Product | $1K | Market analysis, feature validation | ⏳ Q2 |
| **TOTAL** | **—** | **$8.5K** | **—** | **48% of monthly cap** |

*Note: This table is maintained by CTO and updated monthly.*

### Rule 4: ROI Threshold & Sunset Policy

**Every agent-powered feature must demonstrate >3:1 ROI within 90 days of launch.**

**ROI Calculation:**
- **Value** = (Time saved × hourly cost) + (Quality improvement × $ impact) + (Compliance/risk reduction)
- **Cost** = (Agent/API cost) + (Overhead/maintenance, amortized)
- **ROI Ratio** = Value / Cost (minimum: 3:1)
- **Payback Period** = Cost / Monthly Value (target: <6 months)

**Examples:**

| Feature | Agent Cost | Time Saved | Value | ROI | Decision |
|---------|-----------|-----------|-------|-----|----------|
| PR Review Bot | $1.5K/mo | 15 hrs/week eng time | $8K/mo | 5.3:1 | ✅ Keep (shipped Q1) |
| Doc Generation | $1K/mo | 8 hrs/week eng time | $4K/mo | 4:1 | ✅ Keep (shipped Q1) |
| Support Chatbot | $2K/mo | 20 hrs/week support | $6K/mo | 3:1 | ✅ Keep (Q2 target) |
| Predictive Analytics | $2.5K/mo | 10 hrs/week optimization | $5K/mo | 2:1 | ⚠️ Below threshold; re-evaluate at 120 days |
| Config Automation | $1.5K/mo | 6 hrs/week setup | $3K/mo | 2:1 | ⏳ Hold until Q2 (not yet live) |
| Market Research Bot | $0.5K/mo | 4 hrs/week research | $1K/mo | 2:1 | ⏳ Hold until Q3 |

**Sunset Policy:**
- If a feature does NOT hit 3:1 ROI by Day 90, feature is paused (not deleted; can be rebooted later)
- CTO notifies CFO of pause; CFO documents in quarterly report
- At next quarterly review, CTO can request 30-day extension with revised ROI plan, or feature is formally sunset

### Rule 5: Feature Prioritization by ROI
**At quarterly review, prioritize new agent work by expected ROI:**

| Priority | ROI Target | Timeline | Decision |
|----------|-----------|----------|----------|
| **Tier 1** | >5:1 | Ship immediately (highest value) | Approved |
| **Tier 2** | 3:1–5:1 | Ship in current quarter | Approved pending capacity |
| **Tier 3** | 2:1–3:1 | Defer to next quarter | On backlog (approved at review) |
| **Tier 4** | <2:1 | Don't ship | Rejected or rework |

---

## SECTION 3: MONITORING & ALERTING

### CTO Responsibilities (Monthly)
- [ ] Report actual agent costs to CFO by the 5th of each month
- [ ] Flag any spend >100% of monthly budget
- [ ] Alert CFO immediately if projected spend >110%
- [ ] Maintain agent assignment table (updated monthly)

### CFO Responsibilities (Monthly)
- [ ] Reconcile CTO costs against budget
- [ ] Confirm spending approvals
- [ ] Alert CEO if spending exceeds 125% threshold
- [ ] Post monthly spending summary to internal dashboard

### Quarterly Review Cadence
| Event | Attendees | Deliverable |
|-------|-----------|-------------|
| **End of Quarter** | CTO, CFO, Product | Quarterly Agent ROI Report (see Section 4) |
| **Quarterly Review Meeting** | CTO, CFO, CEO (if needed) | Budget adjustment decision; feature prioritization for next quarter |
| **Board Reporting** | CEO + CFO | Include AI/agent spending in financial review (if above $96K YTD or >120% monthly) |

---

## SECTION 4: MONTHLY REPORTING & DASHBOARDS

### Monthly Agent Cost Report (CFO)
**Due:** 5th of each month (CFO publishes to internal Dashboard)

**Format:**
```
Agent Cost Report — [Month] 2026
================================================

Monthly Budget: $12K
Actual Spend: $[X]
Variance: [+/-]%

By Use Case:
  Dev Acceleration: $[X] / $5K cap
  Customer-Facing: $[X] / $3K cap
  Ops/Admin: $[X] / $2K cap
  Experiments: $[X] / $1K cap
  Contingency: $[X] / $1K cap

Alerts:
  ✅ On track (under 100%)
  ⚠️ Warning (>100%, <110%)
  🔴 Critical (>110%)

Notes & Approvals:
  [Any exceptions, overages approved by CFO, forecast for month+1]

Owner: Justin Morrow (CFO)
```

### Quarterly Agent ROI Report (CTO + CFO)
**Due:** Within 10 days of quarter end

**Contents:**
1. **Actual spend vs. budget** (monthly breakdown)
2. **ROI scorecard** — each live feature with actual ROI measured
3. **Feature decisions:**
   - Features to keep/expand
   - Features to pause (sunset) due to poor ROI
   - New features approved for next quarter
4. **Budget adjustment** — request to reallocate between buckets, or increase/decrease overall cap
5. **Board/CEO summary** — 1-page executive summary of AI spending performance

**Template:**
```
Q[X] 2026 Agent ROI Report
================================================

1. SPENDING SUMMARY
   Q1 Budget: $36K
   Q1 Actual: $[X]
   Variance: [+/-]%

   Trend: [Up/Down vs. Q[X-1]]

2. FEATURE ROI SCORECARD
   [Table: Feature | Cost | Value | ROI | Status | Decision]

3. DECISIONS
   Keep/Expand:
     - [Feature]: Exceeded ROI target; approved for Q[X+1]

   Pause/Sunset:
     - [Feature]: Below 3:1 ROI; paused pending re-evaluation

   Launch (approved for next quarter):
     - [Feature]: Expected 4:1 ROI; scheduled for Month [X]

4. BUDGET ADJUSTMENT
   Recommend: [Keep cap at $12K/mo | Increase to $[X] | Reallocate to [Use Case]]
   Rationale: [1–2 sentences]

5. BOARD SUMMARY
   [1-page executive brief on AI ROI performance]

Owner: CTO + CFO
```

---

## SECTION 5: IMPLEMENTATION CHECKLIST (CTO)

**By April 15, 2026:**
- [ ] Integrate agent budget caps into Paperclip governance settings
- [ ] Assign each agent a monthly spending limit and owner
- [ ] Set up automated alerts at 75%, 100%, 110%, 125% thresholds
- [ ] Configure CTO-to-CFO monthly cost reporting (automated if possible)
- [ ] Create agent assignment table (template provided in Section 2)

**By April 30, 2026:**
- [ ] Run first full month of budget tracking (April)
- [ ] Deliver April cost report to CFO by May 5
- [ ] Review Q1 actual ROI for all live features

**By June 30, 2026:**
- [ ] Deliver Q1 Agent ROI Report to CFO/CEO
- [ ] Hold Q1 quarterly review meeting
- [ ] Finalize Q2 agent roadmap and budget allocation

---

## SECTION 6: ESCALATION & EXCEPTIONS

### When to Escalate to CFO
- **Unplanned overages** (spend >110% monthly)
- **Feature ROI below 3:1** at 90 days
- **Request to increase monthly cap** for any reason
- **Multi-agent initiatives** requiring cross-team budget coordination
- **Vendor cost increases** (Paperclip pricing, Claude API rate changes)

### When to Escalate to CEO
- **Quarterly spend >120% of annual target**
- **Loss of major customer revenue** (affects runway; may require agent spend reductions)
- **Strategic shift** in agent priorities (e.g., shift from dev tools to customer-facing features)
- **Proposed agent budget increase** >30% YoY

### When to Escalate to Board
- **Annual AI spend projected >$120K** (exceeds initial $80K allocation by >50%)
- **Systemic failures** in agent cost controls (alerts not working, budgets not enforced)
- **Opportunity to reduce agent spend** due to revenue growth (cost leverage)

---

## SECTION 7: YEAR 1 FINANCIAL IMPACT

### Expected AI Investment & ROI (Conservative)
| Feature | Cost (Year 1) | Value (Year 1) | ROI | Status |
|---------|--------------|----------------|-----|--------|
| PR Review Automation | $18K | $96K | 5.3:1 | ✅ Live |
| Documentation Generation | $12K | $48K | 4:1 | ✅ Live |
| Support Chatbot | $24K | $72K | 3:1 | 🔄 In dev (Q2) |
| Config Automation | $18K | $36K | 2:1 | ⏳ Q2 roadmap |
| Predictive Analytics | $12K | $24K | 2:1 | ⏳ Experimental |
| **TOTAL** | **$84K** | **$276K** | **3.3:1** | — |

**Net AI Benefit (Year 1):** $276K value − $84K cost = **$192K net positive**

**Comparison to Contingency:**
- AI agent budget: $84K (6% of $1.14M contingency)
- Expected value return: $276K (24% of annual operating budget)
- **Net impact on runway: POSITIVE** (agents extend runway by freeing up engineering capacity)

---

## SECTION 8: GOVERNANCE & APPROVALS

**Framework Owner:** CFO (Justin Morrow)
**Implementation Owner:** CTO (Engineering)
**Monitoring Owner:** CFO (Monthly)
**Board Sponsor:** CEO (Justin Morrow)

**Approval Status:**
- [x] CFO drafted (April 4, 2026)
- [ ] CTO review & sign-off
- [ ] CEO approval for board presentation (April 2026)
- [ ] Paperclip implementation (CTO, by April 15)
- [ ] First monthly report (May 5, 2026)

---

## APPENDIX: RELATED DOCUMENTS

- **Financial Model:** `/docs/FINANCIAL-MODEL-ARROYA-PITCH.md` (Section 6: AI Agent Budget Framework)
- **Engineering Budget:** `/docs/ENGINEERING-BUDGET-YEAR-1.md` (if available)
- **Paperclip Agent Config:** See agent instructions in `/paperclip-agent-instructions/[agent-name]/`

---

**Last Updated:** 2026-04-04
**Next Review:** 2026-04-30 (Q1 close) + Quarterly thereafter
**Questions?** Contact Justin Morrow (CFO) or CTO (Engineering)
