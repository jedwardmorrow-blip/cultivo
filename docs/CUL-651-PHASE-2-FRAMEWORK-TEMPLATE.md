# CUL-651 Phase 2: Framework Design (Template)
**AI Agent Budget Controls Framework**

**Status:** Template prepared April 4, 2026; to execute April 7-8 (post-Phase 1 completion)
**Due:** April 8, 2026 EOD
**To Be Completed By:** CFO Agent (34f602ce-32dd-4b02-9874-0fb0e67cd025)

---

## Input: Phase 1 Analysis Findings

*To be populated from Phase 1 deliverable (due Apr 6)*

**From Phase 1:**
- [Current agent architecture summary]
- [Monthly cost baseline and trajectory]
- [Year 1 scaling plan]
- [Cost drivers and variance patterns]
- [Key findings and risk areas]

---

## Phase 2 Deliverable: Budget Control Framework

### 1. Per-Agent Budget Tiers

**Tier 1: Core Active Agents (Current)**
- Agents: [list from Phase 1]
- Monthly allocation: $[calculated]
- Quarterly allocation: $[calculated]
- ROI threshold: 3:1 LTV/CAC (minimum)

**Tier 2: Growth Agents (Planned for Year 1)**
- Target agent types: [from Phase 1 scaling]
- Monthly allocation per new agent: $[calculated]
- Max new agents Year 1: [from CTO scaling plan]
- Growth buffer: $[allocated]

**Tier 3: Contingency & Variance Buffer**
- Normal variance range: ±[from Phase 1]%
- Contingency pool: [calculated]
- Use case: Cost spikes, new agent types, experimental projects

---

### 2. Spending Control Gates

**Monthly Monitoring Gate:**
- Metric: Actual spend vs. allocated budget
- Threshold: 110% monthly allocation triggers review
- Action: CFO reviews cost drivers, investigates variance
- Escalation: At 125%, CEO notified

**Quarterly ROI Gate:**
- Schedule: Apr, Jul, Oct, Jan each year
- Metric: LTV/CAC ratio per agent type
- Threshold: 3:1 minimum (agents not meeting threshold flagged for review)
- Action: Evaluate agent contribution, justify continuation or rationalization

**Quarterly Scaling Gate:**
- Schedule: Same as ROI gate
- Metric: Agent count vs. Year 1 plan
- Action: Confirm scaling trajectory, adjust allocations if needed
- Escalation: Deviations >10% from plan require CEO approval

**Annual Planning Gate:**
- Schedule: October 2026 (for Year 2 planning)
- Metric: Year 1 total spend vs. capped budget ($80K)
- Action: Review all agents, set Year 2 allocations
- Escalation: If Year 1 overspend, CEO + board review before Year 2 approval

---

### 3. Escalation Protocol

**Level 1: CFO Review (Cost variance)**
- Trigger: Monthly spend at 110-125% allocation
- Timeline: Investigate within 48 hours
- Action: Identify driver, validate against cost driver baseline
- Outcome: Report to CEO if variance persists

**Level 2: CEO Involvement (Spend spike)**
- Trigger: Monthly spend at 125%+ allocation OR persistent variance
- Timeline: CEO + CFO meeting within 24 hours
- Action: Approve variance, reduce spend, or escalate to board
- Outcome: Updated spending plan or variance accepted with rationale

**Level 3: Board Escalation (Policy exception)**
- Trigger: Persistent overspend (2+ consecutive quarters) OR agent count deviates >15% from plan
- Timeline: Quarterly board update + approval for variance
- Action: Board votes to approve exception or mandate cost reduction
- Outcome: Updated Year 1 budget or agent rationalization plan

---

### 4. Dashboard Specification

**Real-Time Dashboard (for Ops/CFO use):**

**Section A: Spend Status**
- Monthly spend-to-date: $[actual] / $[budget] (%)
- Spending rate ($/day): $[calculated] vs. $[planned]
- Trend (last 3 months): [graph showing trajectory]
- Status indicator: [Green/Yellow/Red based on variance]

**Section B: Agent Count & Allocation**
- Active agents: [count] vs. [planned]
- Cost per agent (avg): $[calculated] / month
- Agent type breakdown: [table by type and cost]
- Growth rate: [agents/month] vs. [planned]

**Section C: Cost Drivers**
- Top cost contributors: [ranked by $/month]
- Variance by driver: [which drivers are over/under baseline]
- Escalation status: [any agents at >110% threshold?]

**Section D: Quarterly Gate Status**
- ROI check (LTV/CAC): [agents passing 3:1 threshold]
- Scaling alignment: [actual vs. plan, variance %]
- Variance trend: [month-to-month change, ±% range]

**Data Update Frequency:**
- Daily: Spend-to-date calculation
- Weekly: Cost driver review, trend analysis
- Monthly: Full dashboard refresh, escalation checks
- Quarterly: ROI gate, scaling gate, board reporting

**Access:**
- CFO: Full access (daily monitoring)
- CEO: Summary view (weekly/monthly)
- CTO: Cost breakdown by project (reference, no actions)
- Finance team: Read-only for compliance

---

### 5. Quarterly Review Checklist

**Quarterly Gate Activities (Apr, Jul, Oct, Jan):**

**Step 1: Spend Analysis (by CFO)**
- [ ] Confirm total quarterly spend vs. allocated budget
- [ ] Calculate cost per agent
- [ ] Identify variance drivers (cost spikes, new agents, etc.)
- [ ] Flag any agents with 3:1 LTV/CAC below threshold

**Step 2: ROI Assessment (by CFO + CTO)**
- [ ] Validate LTV/CAC for each active agent
- [ ] Document agents not meeting 3:1 threshold
- [ ] Recommend agents to continue, pause, or rationalize
- [ ] Plan actions for next quarter

**Step 3: Scaling Confirmation (by CTO + CFO)**
- [ ] Compare actual agent count vs. Year 1 plan
- [ ] Confirm new agent onboarding schedule (if any)
- [ ] Validate cost trajectory projections
- [ ] Adjust allocations if plan has changed

**Step 4: Board Reporting (by CFO)**
- [ ] Prepare 1-page quarterly summary
- [ ] Include spend vs. budget, ROI status, escalations
- [ ] Highlight any agents needing board decision
- [ ] Recommend actions for next quarter

**Step 5: CEO Review & Approval**
- [ ] CEO reviews CFO quarterly summary
- [ ] CEO approves or escalates recommendations
- [ ] CEO communicates outcomes to board (if needed)
- [ ] Update dashboard and set next quarter budget allocations

---

### 6. Governance Policies

**Approval Requirements:**

| Action | Approver | Notification |
|--------|----------|---|
| New agent (within Year 1 plan) | CFO | CTO, CEO |
| New agent (outside Year 1 plan) | CEO + Board | All stakeholders |
| Agent spend >125% allocated | CEO + CFO meeting | CEO, CTO |
| Quarterly spend variance >20% | CFO analysis + CEO review | Board (if quarterly) |
| Agent rationalization | CEO + Board (if budget impact) | All stakeholders |
| Framework update | CFO + CEO | Board approval |

**Policy Review Schedule:**
- Quarterly gate: All agents assessed against current policy
- Annual review: Framework policy updated for Year 2 (October)
- Ad-hoc: If circumstances change materially

---

### 7. Risk Mitigation

**Identified Risks & Controls:**

| Risk | Trigger | Control | Owner |
|------|---------|---------|-------|
| Cost explosion | Monthly spend > 125% allocation | Immediate CFO + CEO review | CFO |
| Agent count creep | Count > 115% of Year 1 plan | Quarterly gate enforcement | CEO |
| ROI degradation | Agent LTV/CAC < 3:1 | Quarterly ROI assessment | CTO + CFO |
| Scaling misalignment | Actual trajectory ≠ plan | Quarterly scaling gate | CTO |
| Governance gap | Policy not updated annually | Annual review scheduled | CFO |

---

## Deliverable Readiness

**For Phase 3 (Board Presentation, Apr 9-12):**
- ✅ Budget tiers defined
- ✅ Control gates detailed
- ✅ Escalation protocol documented
- ✅ Dashboard spec finalized
- ✅ Governance policies clear
- ⏳ Board summary prepared (1-2 pages)
- ⏳ Risk narrative provided (board talking points)

---

## Sign-Off

**Phase 2 Framework Status:** [TO BE UPDATED]
- [ ] Phase 1 findings received: [date]
- [ ] Framework design completed: [date]
- [ ] CFO sign-off: [date]
- [ ] Ready for Phase 3: [date]

**Framework Designed By:** CFO Agent (34f602ce-32dd-4b02-9874-0fb0e67cd025)
**Target Completion Date:** April 8, 2026 EOD
**Time to Complete:** ~6-8 hours (once Phase 1 delivered)

---

**Template Created:** April 4, 2026, 23:55 UTC
**Ready to Execute:** Upon Phase 1 completion (April 6)
**Target Delivery:** April 8, 2026 EOD (for Phase 3 presentation prep)
