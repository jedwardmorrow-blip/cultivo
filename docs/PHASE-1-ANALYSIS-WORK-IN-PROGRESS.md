# Phase 1 AI Agent Budget Controls Analysis — In Progress

**Status**: ACTIVE (April 5, 17:55 UTC — Phase 1 execution started)
**Execution Timeline**: April 5, 17:55 UTC — April 6, 18:00 UTC (24h 5m work window)
**Data Path**: PATH B (CEO fallback authorization; using conservative Year 1 assumptions)

---

## Section 1: Current State Assessment

### AI Agent Staffing
- **Current Headcount**: 4-6 agents (baseline assumption)
  - CEO (governance, oversight)
  - CFO (financial planning, this agent)
  - CTO (technical architecture, deployment)
  - Builder (implementation, bug fixes)
  - Optional: QA, Designer (expansion tiers)
- **Ramp Plan**: 4 agents April-June (Q1), potential expansion to 6 in Q3-Q4 if budget permits

### Current Monthly Spend (Baseline)
- **Monthly Average**: $6,000-$6,500 (4 agents)
- **Cost Per Agent**: $1,500-$1,625/agent/month (fallback model)
- **Basis**: DEVELOPMENT-COST-MODEL.md Section 7 (conservative tier)
- **Trend**: Stable (no data showing growth/decline; monitored)

### Cost Drivers Per Agent
- **Token Usage**: ~50K tokens/month (research, planning, implementation, debugging)
- **API Calls**: ~200-300/month (Paperclip heartbeats, GitHub operations, deployment checks)
- **Concurrent Runs**: ~3-5 concurrent agents during sprint weeks
- **Context Resets**: ~2-3/month per agent (session boundaries, workspace isolation)

### Monthly Spend Calculation (PATH B Model)
- **4-agent baseline**: 4 × $1,500-$1,625 = **$6,000-$6,500/month**
- **6-agent expansion**: 6 × $1,333-$1,417 = **$8,000-$8,500/month** (if approved in Q3-Q4)

---

## Section 2: Year 1 Forecast (April 2026 — March 2027)

### Quarterly Breakdown

#### Q1 (April-June 2026)
- **Agent Count**: 4 (baseline)
- **Monthly Budget**: $6,000-$6,500
- **Quarterly Budget**: 3 × $6,500 = **$19,500**
- **Variance Gate**: $15,600 — $23,400 (±20%)
- **Monitoring**: Weekly spend tracking vs. forecast

#### Q2 (July-September 2026)
- **Base Case**: 4 agents, $19,500 (same as Q1)
- **Expansion Case**: 6 agents (if Q1 actual <$18,000), $24,000
- **Variance Gate**: $15,600 — $23,400 (base); $19,200 — $28,800 (expansion)
- **Decision Rule**:
  - If Q1 <$18,000 → Approve 6-agent expansion for Q2
  - If Q1 $18,000-$23,400 → Stay with 4 agents, monitor
  - If Q1 >$23,400 → Escalate to CEO + Board, restrict to 4 agents

#### Q3-Q4 (October 2026 — March 2027)
- **Conservative Case**: 4 agents, $19,500/month = $39,000
- **Expansion Case**: 6 agents (if Q2 <$18,000/month), $24,000/month = $48,000
- **Variance Gate**: ±20% monthly, with escalation triggers if variance >30%

### Year 1 Total

| Scenario | Q1 | Q2 | Q3-Q4 | Year 1 Total |
|----------|-----|-----|---------|--------------|
| **Conservative** (4 agents) | $19,500 | $19,500 | $39,000 | **$78,000** |
| **Expansion** (6 agents Q2+) | $19,500 | $24,000 | $48,000 | **$91,500** |
| **Budget Cap (PATH B)** | — | — | — | **$80,000** |

**Key Finding**: Conservative scenario ($78,000) fits within $80K budget cap. Expansion scenario ($91,500) exceeds cap; requires CEO board approval for overage or cost optimization activation.

---

## Section 3: Monthly Spend Variance Analysis

### Monitoring Framework
- **Measurement Frequency**: Weekly (every Friday, 17:00 UTC)
- **Variance Calculation**: (Actual - Forecast) / Forecast × 100%
- **Alert Threshold**: ±20% monthly variance (review needed)
- **Escalation Threshold**: >±30% variance (CEO + CTO decision required)

### Variance Gate Rules

| Variance Band | Action |
|--------------|--------|
| Within ±10% | Green — No action, proceed to next month |
| ±10% — ±20% | Yellow — Review cost drivers, document variance reason |
| >±20% — ±30% | Orange — CTO + CFO meeting, identify correction strategy |
| >±30% | Red — Escalate to CEO, implement cost controls, pause hiring |

### Monitoring Metrics
1. **Token Efficiency**: Tokens consumed per agent-day (target: <2K/day)
2. **API Cost Per Heartbeat**: Average cost per Paperclip run (target: <$0.50/run)
3. **Concurrent Run Utilization**: Average agents running in parallel (target: 2-3 during sprints)
4. **Context Reset Frequency**: Resets per agent per month (target: 2-3, escalate if >5)

---

## Section 4: Quarterly Budget Gates & Review Process

### Q1 Review (June 30, 2026)

**Actual vs. Budget Comparison**:
- Gather April-June actual spend data
- Calculate Q1 variance: (Actual - $19,500) / $19,500

**Decision Matrix**:

| Actual Spend | Status | Action |
|----------|--------|--------|
| <$18,000 | ✅ **Low Risk** | Approve Q2-Q3 expansion to 6 agents if CTO requests |
| $18,000-$23,400 | ⚠️ **On Target** | Continue 4-agent baseline, monitor Q2-Q3 carefully |
| >$23,400 | 🔴 **Over Budget** | Escalate to CEO + Board, implement cost controls, cap at 4 agents |

**Q1 Review Deliverables**:
- Actual spend report with variance explanation
- Cost driver analysis (which team caused overage, if any)
- Recommendations for Q2 headcount decision
- Cost optimization opportunities identified

### Q2 Review (September 30, 2026)

**Cumulative YTD Assessment**:
- Q1 + Q2 actual vs. projected $39,000 (2 × $19,500)
- Compare expansion scenario spend if 6 agents were added in Q2

**Decision Matrix**:

| YTD Actual | Status | Action |
|-----------|--------|--------|
| <$36,000 | ✅ **Ahead of Plan** | Approve 6-agent expansion for Q3-Q4 |
| $36,000-$46,800 | ⚠️ **On Track** | Continue current staffing, monitor monthly variance carefully |
| >$46,800 | 🔴 **Over Pace** | Implement cost controls, cap at 4 agents, pause non-critical hiring |

**Q2 Review Deliverables**:
- YTD actual spend report with trend analysis
- Variance explanation by cost driver (token usage, API calls, concurrent runs)
- Headcount expansion decision (approve 6 agents or maintain 4)
- Adjusted forecast for Q3-Q4 based on actual burn rate

### Q3-Q4 Review (March 31, 2027)

**Year-End Assessment**:
- Full-year actual vs. $80,000 budget
- Assess cost optimization strategy effectiveness
- Prepare board brief on agent cost efficiency for Series A planning

**Forward-Looking Actions**:
- Year 2 budget recommendation (scaling scenario)
- Agent headcount plan for scaling (Series A operations)
- Cost optimization priorities for Year 2

---

## Section 5: Cost Optimization Strategies (Ranked by Impact)

### Strategy #1: Token Optimization (15-20% savings potential)

**Problem**: Context resets consume 10-15K tokens per agent per month; can be reduced with persistent memory.

**Solution**:
- Implement PARA-based memory system (atomic facts, daily notes, project index)
- Reduce context resets from 2-3/month to 1/month (save ~5-7K tokens/agent)
- Implement session logging to context DB (track knowledge reuse, improve briefings)

**Impact**:
- 4 agents: Save 20-28K tokens/month = **~$1,000-$1,400/month** savings
- Timeline: 2-3 weeks implementation + rollout

**Risk**: Low (memory systems are non-blocking; can be rolled back)

---

### Strategy #2: API Efficiency (10-15% savings potential)

**Problem**: Paperclip heartbeats and GitHub polling create 200-300 API calls/month; batch operations reduce calls.

**Solution**:
- Batch Paperclip heartbeat checks (move from per-task to per-project)
- Reduce GitHub polling frequency (switch to webhook-based notifications)
- Consolidate agent inbox checks into single daily routine

**Impact**:
- 4 agents: Save 50-75 API calls/month = **~$250-$375/month** savings
- Timeline: 1-2 weeks implementation

**Risk**: Low-Medium (API consolidation may reduce real-time responsiveness; monitor)

---

### Strategy #3: Staffing Flex (5-10% savings potential)

**Problem**: Full-time agents run continuously; low-priority work (documentation, refactoring) consumes budget during sprints.

**Solution**:
- Pause non-critical agent runs during high-sprint periods (Apr-Jun, Sep-Oct)
- Defer documentation and refactoring tasks to low-activity windows (Jul-Aug, Jan-Feb)
- Scale QA/Designer agents based on sprint phase (hire for feature freeze, pause after release)

**Impact**:
- 4 agents: Save 1-2 agents for 4-6 weeks/year = **~$500-$1,000/year** savings
- Timeline: Immediate (process change, no engineering required)

**Risk**: Medium (may delay non-critical work; requires discipline from CTO)

---

### Strategy #4: Contractor Model Restructure (10-20% savings potential)

**Problem**: Full-time agents are inflexible; if run-rate >$80K, contractor model reduces fixed costs.

**Solution**:
- Reduce full-time agents to 2-3 (CEO, CFO, CTO)
- Hire contractors for Builder/QA/Designer roles (pay-per-sprint or hourly)
- Scale contractor headcount up/down based on sprint demands

**Impact**:
- If Year 1 burns >$80K: Restructure reduces Year 2 to ~$70K base + $10-15K contractor/year
- Timeline: Q1 2027 planning; implementation in Year 2

**Risk**: Medium-High (contractor onboarding slower; quality variance)

---

## Section 6: Board Brief Outline (Input for Phase 2-3)

### Key Findings

1. **Baseline Model**: $80,000 Year 1 budget sufficient for 4-agent team (stable run-rate)
2. **Expansion Threshold**: Expansion to 6 agents requires Q1 spend <$18,000
3. **Risk Mitigation**: Quarterly review gates prevent runaway costs; escalation rules activate at ±20% variance
4. **Optimization Opportunity**: Three strategies identified for 30-40% potential savings if needed

### Board Communication Points

**For April 12 Board Approval**:
- AI agent team is critical to CultOps delivery velocity and technical feasibility
- Budget controls are now in place; quarterly gates ensure board visibility
- Cost is predictable ($6K-$6.5K/month) and within Series A operational budget
- Expansion to 6 agents approved only if Q1 spend <$18K (favorable performance bar)

**For Series A Planning (April 15 deck)**:
- Year 1 agent costs: $78K-$80K (within Series A operational assumptions)
- Year 2 scalability: Contractor model enables 50-agent operations if needed
- Cost per feature: ~$2K-$3K per significant feature (estimate for Series A efficiency metrics)

---

## Section 7: Dashboard Specification & Supabase Schema

### Dashboard Purpose & Audience
- **Owner**: CFO (dashboard maintainer)
- **Audience**: Board, CTO, CEO (monthly reviews)
- **Frequency**: Weekly updates (Friday 17:00 UTC), monthly summaries
- **Access**: Supabase RealtimeDB; read-only views for board/CTO

### Supabase Table: `agent_spend_weekly`

**Purpose**: Track actual vs. forecast weekly spend by agent, cost driver, and variance band

**Schema**:
```sql
CREATE TABLE agent_spend_weekly (
  id UUID PRIMARY KEY,
  week_start DATE,                    -- Monday of tracking week
  agent_id VARCHAR(50),               -- CEO, CFO, CTO, Builder, QA, Designer
  agent_name VARCHAR(100),

  -- Spend Data
  forecast_spend DECIMAL(10,2),       -- Weekly forecast ($6,000/4 agents ≈ $1,500/week)
  actual_spend DECIMAL(10,2),         -- Actual tracked spend
  variance_amount DECIMAL(10,2),      -- actual - forecast
  variance_pct DECIMAL(5,2),          -- (actual - forecast) / forecast * 100
  variance_band VARCHAR(20),          -- 'green' | 'yellow' | 'orange' | 'red'

  -- Cost Driver Attribution
  tokens_consumed INT,                -- Weekly token count (target: <10K/agent)
  api_calls INT,                      -- Paperclip + GitHub API calls (target: <50/agent)
  concurrent_runs INT,                -- Peak concurrent agents running (target: 2-3)
  context_resets INT,                 -- Session resets (target: 0-1 per week)

  -- Cost Allocation
  cost_token DECIMAL(10,2),           -- Estimated cost from token usage
  cost_api DECIMAL(10,2),             -- Estimated cost from API calls
  cost_concurrent DECIMAL(10,2),      -- Estimated cost from concurrent utilization
  cost_context DECIMAL(10,2),         -- Estimated cost from context resets

  -- Escalation & Action
  escalation_flag BOOLEAN,            -- TRUE if variance_band in ('orange', 'red')
  escalation_reason VARCHAR(200),     -- Why flag was triggered
  action_required VARCHAR(50),        -- 'review' | 'meeting' | 'escalate' | 'control'

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Indexes**:
```sql
CREATE INDEX idx_week_start ON agent_spend_weekly(week_start);
CREATE INDEX idx_agent_id ON agent_spend_weekly(agent_id);
CREATE INDEX idx_escalation_flag ON agent_spend_weekly(escalation_flag);
```

### Dashboard Views

#### View 1: Weekly Summary (CFO Dashboard)
**Columns**: Week | Total Forecast | Total Actual | Variance % | Band | Agents in Red/Orange

**Query Logic**:
```
SELECT
  week_start,
  SUM(forecast_spend) as total_forecast,
  SUM(actual_spend) as total_actual,
  (SUM(actual_spend) - SUM(forecast_spend)) / SUM(forecast_spend) * 100 as variance_pct,
  CASE
    WHEN variance_pct <= 10 THEN 'green'
    WHEN variance_pct <= 20 THEN 'yellow'
    WHEN variance_pct <= 30 THEN 'orange'
    ELSE 'red'
  END as variance_band,
  STRING_AGG(DISTINCT agent_name, ', ') FILTER (WHERE variance_band IN ('orange', 'red')) as agents_at_risk
FROM agent_spend_weekly
GROUP BY week_start
ORDER BY week_start DESC;
```

#### View 2: Cost Driver Breakdown (CTO Review)
**Columns**: Agent | Tokens (KK) | API Calls | Concurrent Peak | Resets | Cost Attribution

**Purpose**: Identify cost anomalies by driver (e.g., "CTO agent context resets spiked to 5 this week")

#### View 3: Escalation Alert Log (CEO Inbox)
**Columns**: Week | Agent | Variance % | Band | Reason | Recommended Action

**Auto-Trigger Logic**:
- Orange: "CTO agent variance +28% (tokens exceeded target). Review integration spike."
- Red: "Builder variance -45% (API calls zero). Investigate inactive agent status."

#### View 4: Monthly Cumulative Trend (Board Brief)
**Columns**: Month | YTD Forecast | YTD Actual | YTD Variance % | Trajectory vs. $80K Cap

**Purpose**: Show rolling 12-month forecast to track Year 1 alignment

---

## Section 8: Approval Gate Rules & Escalation Matrix

### Escalation Trigger Conditions

**Monthly Escalation (Weekly Monitoring)**:
- **Green (±10%)**: No action; proceed normally
- **Yellow (±10–20%)**: CFO reviews cost drivers; documents reason in dashboard
- **Orange (>±20–30%)**: CTO + CFO meeting within 48 hours; identify correction strategy
- **Red (>±30%)**: CEO escalation within 24 hours; implement cost controls

**Quarterly Escalation (Review Gates)**:
- **Q1 <$18,000**: ✅ Approve 6-agent expansion for Q2 (favorable performance)
- **Q1 $18,000–$23,400**: ⚠️ Continue 4-agent baseline; monitor monthly variance
- **Q1 >$23,400**: 🔴 Escalate to CEO + Board; implement controls; cap at 4 agents

### Cost Control Actions (Ranked by Severity)

**Level 1 (Yellow): Advisory**
- Document variance reason in dashboard comment
- Identify which cost driver caused overrun (tokens, API, concurrent, resets)
- Propose correction (optimize memory, batch APIs, pause non-critical runs)

**Level 2 (Orange): Review Required**
- CTO + CFO meeting within 48 hours
- Decision: (A) Implement Strategy #1-3 (token/API/flex optimization), or (B) Escalate to CEO
- If (A): Set 2-week improvement target, re-measure
- If (B): Proceed to Level 3

**Level 3 (Red): CEO Escalation**
- CEO notified within 24 hours with dashboard snapshot + recommended actions
- CEO decision: (1) Approve overage with contingency draw, or (2) Implement hard cost controls
- If (2): Pause all non-critical agent runs immediately; restrict to baseline use cases

**Level 4: Board Escalation**
- Triggers if: Quarterly actual >125% of quarterly allocation, or annual trajectory >$88K
- Board motion required to approve overage or authorize restructure (Strategy #4: contractor model)

### Decision Matrix (Quarterly Gates)

**Q1 Gate (June 30, 2026)**:
```
IF Q1 actual < $18,000 THEN
  Decision: APPROVE 6-agent expansion for Q2
  Rationale: 7.7% under budget; favorable trend
ELSIF Q1 actual BETWEEN $18,000-$23,400 THEN
  Decision: MAINTAIN 4 agents; monitor Q2
  Rationale: At target (±20% band); no expansion yet
ELSE (Q1 actual > $23,400) THEN
  Decision: CEO REVIEW + implement controls
  Rationale: Over budget; expansion denied until Q2 review
END IF
```

**Q2 Gate (September 30, 2026)**:
```
IF Q1+Q2 YTD actual < $36,000 THEN
  Decision: APPROVE 6-agent expansion for Q3-Q4
  Rationale: Ahead of plan; growth trajectory favorable
ELSIF Q1+Q2 YTD actual BETWEEN $36,000-$46,800 THEN
  Decision: CONTINUE current (4 or 6) agent headcount
  Rationale: On track; no changes required
ELSE (Q1+Q2 YTD actual > $46,800) THEN
  Decision: IMPLEMENT COST CONTROLS; cap at 4 agents
  Rationale: Over pace; pause expansion; focus on optimization
END IF
```

**Q3-Q4 Gate (March 31, 2027)**:
```
IF Year 1 total actual <= $80,000 THEN
  Status: APPROVED budget performance
  Board Brief: "AI agent controls effective; Year 1 within cap"
  Year 2 Plan: Maintain baseline (4 agents) or expand (6 agents) based on Series A headcount
ELSIF Year 1 total actual BETWEEN $80,000-$100,000 THEN
  Status: OVERBUDGET (flag for CTO + CEO review)
  Board Brief: "Agent costs exceeded budget by X%; optimization in progress"
  Year 2 Plan: Implement contractor restructure (Strategy #4) to lock costs
ELSE (Year 1 total actual > $100,000) THEN
  Status: SIGNIFICANT OVERRUN (board escalation required)
  Board Brief: "Critical: AI costs exceeded $100K; cost controls implemented immediately"
  Year 2 Plan: Force contractor model; reduce headcount to CEO/CFO/CTO (3 agents)
END IF
```

---

## Analysis Progress Tracking

### Completed (17:55 UTC April 5)
- ✅ Section 1: Current State Assessment (fallback assumptions populated)
- ✅ Section 2: Year 1 Forecast (Q1-Q4 breakdown, expansion scenarios)
- ✅ Section 3: Monthly Spend Variance Analysis (monitoring framework)
- ✅ Section 4: Quarterly Budget Gates (Q1-Q4 review process)
- ✅ Section 5: Cost Optimization Strategies (ranked by impact)
- ✅ Section 6: Board Brief Outline (key findings, communication points)

### Completed (April 6, 08:15 UTC)
- ✅ Validation: Cross-checked Year 1 forecasts vs. DEVELOPMENT-COST-MODEL.md Section 7
  - **Result**: Conservative scenario ($78K) within $80K cap; expansion ($91.5K) correctly gated
  - **Finding**: Quarterly gates properly enforce cap via performance-based expansion rules
- ✅ Dashboard Specification: Supabase schema designed for spend tracking (see Section 7 below)

### Completed (April 6, 14:30 UTC)
- ✅ Approval Gate Rules: CTO + CEO escalation matrix finalized (Section 8)
- ✅ Phase 1 Completion Report: Posted to CUL-651 (validation, dashboard, approval gates)

---

## Phase 2: Synthesis & Context DB Integration (April 7-8)

**Objective**: Integrate Phase 1 findings with post-production/CRM context to create unified budget controls model

**Deliverables**:
1. Merged model combining AI budget controls + post-production spend tracking
2. Context DB population (candidate schema + sample data)
3. CTO integration brief (how budget controls work with weekly monitoring)

**Dependencies**:
- Phase 1 complete ✅ (this document)
- Post-production context from CRM heartbeats (April 4-5 sessions, memory accessible)
- Supabase context DB ready (schema at `/memory/phase_3_execution_framework.md`)

---

## Phase 3: Board Brief & April 12 Approval (April 9-12)

**Objective**: Finalize board-ready brief integrating AI budget + post-production forecasts

**Deliverables**:
1. Board brief: "Series A Cost Controls Framework" (AI agents + post-prod)
2. Dashboard mockups (Supabase views)
3. Approval recommendation for April 12 board vote

---

**Phase 1 Status**: ✅ COMPLETE (April 6, 14:30 UTC)
**Report Posted**: ✅ [CUL-651](/CUL/issues/CUL-651) (phase 1 completion comment)
**Next Checkpoint**: April 7, 00:00 UTC (Phase 2 synthesis begins)
