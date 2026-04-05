---
title: CUL-651 — AI Budget Controls Data Pack (CTO Summary)
source: CFO Agent Budget Control Framework (April 4, 2026)
recipient: CTO (Engineering)
deadline: April 6, 2026 EOD
---

# CUL-651 CTO Data Request — Ready to Integrate

This document extracts the 4 required data items from the board's existing AI budget framework (doc: CFO-AGENT-BUDGET-CONTROL-FRAMEWORK.md). All data is current as of April 4, 2026.

---

## 1. AGENT ARCHITECTURE INVENTORY

**Current Paperclip Agents (Live + Planned):**

| Agent Name | Type | Owner | Scope | Status | Features |
|-----------|------|-------|-------|--------|----------|
| **Builder** | Code Generation | CTO | Dev acceleration | ✅ Live | PR reviews, doc gen, tests |
| **DBA** | Data Automation | CTO | Infrastructure | ✅ Live | Schema automation, migration helpers |
| **QA** | Test Automation | CTO | QA/Testing | ✅ Live | Test generation, coverage analysis |
| **Support Bot** | Customer-Facing | CEO | Customer support | 🔄 In dev (Q2) | Support chatbot, FAQs, report gen |
| **Product Research** | Analytics | Product | Market analysis | ⏳ Q2 roadmap | Feature validation, market research |
| **COO (this agent)** | Domain Knowledge | COO | Cannabis domain | ✅ Live | Knowledge extraction, briefings, context DB |

**Total Agent Count (Year 1):** 6 agents across 3 ownership domains
- Engineering-owned: 3 (Builder, DBA, QA)
- CEO/Product-owned: 2 (Support Bot, Product Research)
- Operations-owned: 1 (COO/Domain Knowledge)

**Architecture Type:** Paperclip multi-tenant agent SDK with:
- Task routing via Paperclip API
- Budget enforcement per agent
- Monthly cost tracking + quarterly ROI review
- Governance checkpoints at 75%, 100%, 110%, 125% spend thresholds

---

## 2. MONTHLY AGENT COSTS (CURRENT + PLANNED)

**Current Spend (Live Agents Only):**

| Agent | Monthly Cost | Quarterly Limit | Annual Cost | Features Powered |
|-------|-------------|-----------------|------------|------------------|
| Builder | $3.0K | $9K | $36K | PR reviews, doc gen, test automation |
| DBA | $1.5K | $4.5K | $18K | Schema automation, migration support |
| QA | $1.0K | $3K | $12K | Test generation, coverage analysis |
| **Live Subtotal** | **$5.5K** | **$16.5K** | **$66K** | — |

**Planned/Development (Q2+):**

| Agent | Monthly Cost | Quarterly Limit | Annual Cost | Features Powered |
|-------|-------------|-----------------|------------|------------------|
| Support Bot | $2.0K | $6K | $24K | Support chatbot, FAQs, report gen |
| Product Research | $1.0K | $3K | $12K | Market analysis, feature validation |
| **Planned Subtotal** | **$3.0K** | **$9K** | **$36K** | — |

**Total Year 1 Allocation:** $84K (within $80–96K board-approved target)

**Budget Constraints:**
- **Monthly cap:** $12K (all agents combined)
- **Quarterly cap:** $36K
- **Annual hard cap:** $96K
- **Current utilization:** $5.5K/month = 46% of monthly cap

---

## 3. YEAR 1 SCALING — AGENT COUNT + COST TRAJECTORY

**Scaling Plan (Board Approved):**

| Quarter | Live Agents | Cost/Month | Quarterly Total | Annual Projection | Growth |
|---------|------------|-----------|-----------------|------------------|--------|
| **Q1 (Jan-Mar)** | 3 | $5.5K | $16.5K | $66K | Baseline (3 live) |
| **Q2 (Apr-Jun)** | 4 | $7.5K | $22.5K | $84K | +1 agent (Support Bot) |
| **Q3 (Jul-Sep)** | 5 | $8.5K | $25.5K | $84K | +1 agent (Product Research) |
| **Q4 (Oct-Dec)** | 5 | $8.5K | $25.5K | $84K | Growth slows (ROI constraints) |

**Year 1 Total:** $84K (no new agents after Q3; ROI gating prevents additional hires)

**Projected Year 2 (if approved):**
- New agents only if existing ROI >3:1 at quarterly review
- Expected capacity: 6–8 agents max (board decision Q4 2026)
- Estimated cost: $100–120K annually

---

## 4. COST DRIVERS — MONTH-TO-MONTH VARIANCE

**Primary Cost Drivers:**

### **A. Feature Maturity (Largest Impact)**
- **New agent onboarding:** First month typically 30% higher (setup, configuration, integration testing)
- **Optimization phase:** Months 2–6 gradually decrease cost/ROI as feature matures
- **Steady state:** Months 6+ stable monthly cost with seasonal adjustments

**Example:** Support Bot expected trajectory:
- Month 1: $2.5K (setup, fine-tuning)
- Month 2–6: $2.1K–$2.3K (optimization)
- Month 6+: $2.0K (steady state)

### **B. Use Case Mix Fluctuation**
Budget allocation by use case:
- **Dev Acceleration:** $5K/mo (code gen, PR reviews, docs)
- **Customer-Facing:** $3K/mo (support chatbot, reports)
- **Ops/Admin:** $2K/mo (task automation, scheduling)
- **Experiments:** $1K/mo (market research, A/B testing)
- **Contingency:** $1K/mo (emergency overages)

*Variance typically ±15% quarterly based on sprint priorities and product demands.*

### **C. Seasonal Demand (Secondary Impact)**
- **High-demand seasons (Q4, holidays):** Support Bot cost +20–30% (customer volume)
- **Low-demand seasons (Q2, summer):** Support Bot cost −10–15% (reduced ticket volume)
- **Engineering cycles:** Dev tools (Builder, DBA, QA) stable year-round; spike during major releases

### **D. Compliance & Validation (Quarterly Spikes)**
- **Quarterly ROI review:** Predictive analytics + monitoring agent activated for 1–2 weeks
- **Impact:** +$1K–$1.5K in quarter-end months (March, June, Sept, Dec)
- **Quarterly pattern:** Months 1–2 flat, Month 3 +$1K spike for review/reporting

### **E. External Factors (Rare)**
- **Vendor price changes:** Paperclip billing or Claude API rate increases (monitored monthly)
- **Incident response:** Emergency agent activation (e.g., 24/7 monitoring) requires CFO approval
- **Marketing pushes:** Product-driven support feature acceleration (Q2+)

**Expected Monthly Range (Year 1):**
- **Low:** $5.5K (Q1, live agents only)
- **High:** $9K (Q3–Q4 with all planned agents + Q3 seasonal spike)
- **Average:** $7K
- **Variance:** ±20% month-to-month (normal); >25% requires CFO notification

---

## INTEGRATION NOTES FOR CTO

**What CTO Needs to Implement in Paperclip Governance (by April 15):**

1. **Agent assignment table** with budget caps and owners (use Section 2 template)
2. **Automated cost tracking** — integrate Paperclip billing + Claude API usage into governance dashboard
3. **Alert thresholds** at 75%, 100%, 110%, 125% of monthly budget
4. **Monthly reporting pipeline** — cost data to CFO by 5th of each month
5. **Quarterly ROI calculation** framework (template in CFO framework doc, Section 4)

**Data Handoff Success Criteria:**

- ✅ CTO confirms agent architecture matches Paperclip reality
- ✅ CTO validates monthly costs against actual Paperclip billing (reconcile by April 10)
- ✅ CTO accepts Year 1 scaling plan or proposes alternative with ROI justification
- ✅ CTO integrates cost driver categories into monthly tracking (Section 4 format)
- ✅ CTO implements governance alerts in Paperclip by April 15

---

## QUICK REFERENCE (Copy for Board Presentation)

| Metric | Value | Status |
|--------|-------|--------|
| **Current Monthly Spend** | $5.5K | ✅ 46% of budget |
| **Year 1 Budget Allocation** | $84K | ✅ Within approval range |
| **Agent Count (Live)** | 3 | ✅ Builder, DBA, QA |
| **Agent Count (Year 1 Planned)** | 5 total | ✅ +Support, +Product |
| **Expected Year 1 ROI** | 3.3:1 | ✅ Exceeds 3:1 threshold |
| **Governance Readiness** | Pending CTO Implementation | ⏳ April 15 deadline |

---

**Prepared by:** COO (CultOps Domain Knowledge Agent)
**Based on:** CFO Agent Budget Control Framework (April 4, 2026)
**For:** CUL-651 Series A AI Budget Controls Framework
**Deadline:** CTO sign-off by April 6 EOD
