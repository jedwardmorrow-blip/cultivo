---
title: CultOps Domain Knowledge Program
category: Operations
date: 2026-04-02
status: active
---

# CultOps Domain Knowledge Program

> **What This Is:** A systematic program to extract the board's deep cannabis industry expertise and make it available to the engineering team *before* features are built, so the platform is designed with the right business mental model from day one.

> **Who I Am:** COO agent (knowledge authority). I run in Paperclip heartbeats to extract knowledge, write briefings, and maintain a structured domain knowledge base.

---

## The Problem We're Solving

The **CULT platform is technically complete and production-ready**. However, there's a knowledge gap:

- **Board (Justin)** has 15+ years of cannabis industry expertise — understands workflows, compliance, customer personas, pricing models, and edge cases.
- **Engineering team** (CTO, Builder, DBA, QA) is technically skilled but lacks cannabis domain depth.
- **Result:** Features may work technically but miss real-world business context, user workflows, compliance gates, and edge cases.

**Goal:** Systematically extract board knowledge and integrate it into engineering decision-making so features solve real problems correctly the first time.

---

## How This Works

### 1. Knowledge Extraction Q&A (Async)

Before each sprint, I post 10–15 targeted questions on the Paperclip task. Board responds async (no urgency, no blocking).

**Session 1 (2026-04-02):** [15 questions across 7 categories](./COO-DOMAIN-KNOWLEDGE-BRIEFING.md#session-1-qa-topics)

- Cultivation workflows, processing, orders, inventory, regulatory, customer personas, business strategy

### 2. Knowledge Base Structuring

Board responses are structured into the **context DB** (Supabase `uayyhluztelnfxfvdhyt`) by category:
- `domain`: Core cannabis concepts (cultivation, harvesting, curing)
- `cultivation`: Grow operations, plant management, METRC
- `inventory`: Batch lifecycle, conversions, water loss, ATP
- `regulatory`: State compliance, METRC manifests, COA, deadlines
- `customer`: Dispensary workflows, B2B vs. retail, pricing models
- `pricing`: Wholesale, bulk, per-unit, seasonal variance
- `workflow`: Daily operations, handoffs, pain points, edge cases

### 3. Pre-Sprint Engineering Briefings

When a sprint task touches a domain area, I write a **1–2 page domain brief** and post it as a comment:

- **What problem are we solving?** (user workflow context)
- **Why does it matter?** (business impact)
- **What edge cases exist?** (real-world variations)
- **What can break?** (compliance, inventory, customer impact)
- **What should we ask the board if unclear?**

### 4. Session Logging

After each task, I log to the context DB `session_log` table:
- What was extracted
- Key decisions made
- What's next
- Tools used

---

## Session 1: Q&A Topics

**Cultivation & Harvest** (3 questions)
- Daily decisions cultivation managers make
- Compliance gates when moving from veg to flower
- End-to-end harvest workflow and bottlenecks

**Processing & Conversions** (3 questions)
- Water loss write-off: when, how much, regulatory permission
- Batch-to-product relationship (1:1 or 1:many?)
- Pricing models: wholesale vs. bulk vs. per-unit

**Orders & Sales** (2 questions)
- Typical dispensary order workflow (frequency, lead time, pain points)
- Invoice/manifest handling: who does it, when, handoffs

**Inventory & Compliance** (2 questions)
- METRC manifests: initiation, timing, failure modes
- Inventory discrepancies: frequency, tolerance, audit triggers

**Regulatory & Licensing** (2 questions)
- State regulations (differences from Arizona)
- COA reporting: who, deadline, consequences

**Customer & Operator Personas** (2 questions)
- Main personas using CULT and their priorities
- Small craft vs. large operations: how usage differs

**Business Strategy** (1 question)
- One feature that would most improve profitability or reduce headaches

---

## Integration Points

### For Engineering Tasks

When a ticket touches any of these areas, I'll post a domain brief:
- Session management (trimming, bucking, packaging)
- Batch transitions (cultivation → harvest → inventory)
- Order workflows (entry, packaging, fulfillment)
- METRC/compliance integration
- Inventory movements and ATP
- Customer/pricing workflows

### For Board

- Link to knowledge extraction Q&A on Paperclip
- Async response process (no meetings, structured feedback)
- Knowledge will flow directly into engineering briefings

### For Team

- Domain briefs posted on relevant tickets before coding starts
- Business context for architectural decisions
- Clear escalation path if questions arise during implementation

---

## Knowledge Base Location

**Context DB:** Supabase project `uayyhluztelnfxfvdhyt`

Tables (current plan):
- `context_entries` — indexed domain knowledge by category, source, date
- `session_log` — session summaries, work performed, decisions, next actions

---

## Timeline

- **Session 1 (2026-04-02):** Q&A prepared, posted for board response
- **After Board Response:** Responses structured into context DB, indexed by category
- **Ongoing:** Pre-sprint briefings generated for engineering tasks
- **Recurring:** New Q&A sessions as knowledge gaps emerge (monthly or as-needed)

---

## Questions?

This is a systematic approach to keeping the engineering team aligned with business reality *before* decisions are made. If you have questions about this process, ask — this program is designed to support the team, not create overhead.
