# Decision note · Room Roll Strip · 2026-04-26

**Surface:** Cultivo · Pipeline · COO view · Rollup row · Tile 2 (double-width)
**Pivot from:** "Projected harvest split · 30d / 90d" (single number, single window)
**To:** "Next room cohorts" (per-room rows, sorted by next harvest event)

---

## Why the pivot earned its keep

The 30/90 split was answering "how big is the harvest window?" The COO's actual question on this surface is "**which rooms am I about to be standing in front of, and are they fine?**" That's a per-room question, not a windowed-total question. Three things follow:

1. The unit of operational reality is the **room cohort**, not the batch and not the time-window. A room is where the COO walks, where SOPs apply, where stuck-stage problems live. Batches that share a room and harvest_date are functionally one event.
2. **Window split (30d/90d) doesn't survive at room granularity.** The fixture has 3 living harvest-relevant rooms; FLW-06 is overdue (today), FLW-08 is drying-out (days, not weeks), FLW-10 is 18d. None of these care about the 30/90 cliff. A room-level strip naturally surfaces "what's next" without needing a window.
3. The old at-risk count tile starts feeling redundant once stuck-stage info is per-row in the strip. Worth flagging for the next pass — not collapsing it yet, but watch the overlap.

---

## What's the same across v1 / v2 / v3

- Tile spans 2 columns of the rollup row (occupies the slot the old single-number tile occupied, ×2 width).
- Header eyebrow + flower stage dot, same chrome as siblings.
- Body is a header row + 3 cohort rows. Cap at 3 visible; "+N more" affordance below for overflow (not shown — no overflow in fixture).
- Sort order: overdue first, then stuck (warn), then by ascending days-to-harvest. Earliest event up top.
- Days column has three states with one type rule each:
  - **overdue** → `status-bad`, no italic, leading "+" sign
  - **stuck** → `status-warn`, no italic, "d17"-style stage-day notation
  - **future** → `--op-ink`, *italic* (estimate convention), "18d"-style
- Allocation chip: dot + caps label, three states (allocated / partial / none).
- Cohort grams render italic when projected, roman when actual (current fixture has all projected; FLW-06 is "tbd" because cultivation-stage estimates aren't reliable).

---

## What each variant adds

| Variant | Adds | Costs | Best for |
|---|---|---|---|
| **v1 — basic list** | Strain count column. Maximum row density, fastest scan. | No historical context. No inline problem callouts. | Daily standup glance. Calm farms with mature ops. |
| **v2 — per-room sparkline** | 6-cycle history sparkline replaces strain count. Encodes room memory. | Sparkline is illustrative until `v_batch_lifecycle` rollup ships; cold-start needs a "—" floor. Strain count moves to row-detail. | COO who's been burned by trust-but-verify; planning-grade view. |
| **v3 — inline callouts** | Second line per problem-row in mono caps. Self-modulating density — quiet when calm, loud when not. | Variable row height (36px → 58px). At-risk-count tile starts feeling redundant. | Active operations with frequent stuck-stage signal; FLW-06 + FLW-08 today exemplify why. |

---

## Recommendation

**Ship v3 as primary, v1 as the "compact" mode.**

Reasoning:

- **v3 carries the most operational signal per pixel.** The fixture has two of three rows triggering callouts (FLW-06 overdue, FLW-08 drying-out). Those are exactly the things the COO needs surfaced; v1 makes them work for it (decode "+5d" + status-bad + 141 plants), v3 spells it out in the row.
- **v3's self-modulation is the right default behavior for an operations dashboard.** A calm farm shows three tight single-line rows. A farm with two problems grows the tile by ~44px to flag them. The chrome itself reflects state — that's a pattern that pays compounding dividends across other surfaces (Order Rail, Strain Health, etc.).
- **v2's sparkline is genuinely useful but needs a real backend.** Worth keeping as a "depth" view (click-through, or a Production Planning view) once room-level historical rollups are in `v_batch_lifecycle`. Surfacing it now risks teaching users to trust illustrative data, then yanking it. **Land it second, as Room Detail page accent, not in the rollup.**
- **v1 should be available as a density toggle**, not deleted. Some users will want maximum scan speed and don't need the prose. Same component, different layout mode (`<RoomRollStrip mode="compact" />` vs `mode="annotated"`).

---

## Open questions for the call

1. **Cohort definition** — is "shared room + shared harvest_date prefix" the right grouping, or should it be "shared room + adjacent harvest_dates within ±3d"? FLW-08's two batches (251212-SWF, 251212-CZL) share a date prefix exactly, so this isn't tested. **Confirm with someone who's actually run a multi-strain drying room.**
2. **What happens when a room has 4+ active strains?** Cap rows shown (compress to "FLW-08 · 4 strains")? Show all and let the row wrap? Need a rule before the first time we see it in real data.
3. **How does this tile relate to the at-risk count tile** to its right? v3 surfaces 2 of the 3 at-risk batches inline. Does the at-risk tile become the "everywhere else" indicator (rooms not in the next-3 + non-room batches like processing_pending), or do we drop it? **Recommend: revisit once v3 ships and we have a week of usage data.**
4. **Cold-start for v2** — what does the sparkline render when a room has < 3 closed cycles? Proposal: hide the sparkline cell and show "—", expand the strain-count column back in for that row only. Mixed-mode rows are visually awkward but honest.
5. **Click target** — does clicking a room row deep-link to a Room Detail page (cohort breakdown, strain rows, allocation editor), or to a filtered Pipeline list view (`pipeline?room=FLW-06`)? Affects how much detail this tile needs to carry.

---

## Files

- `mockups/pipeline/rollup-30-90-v1.html` — basic list
- `mockups/pipeline/rollup-30-90-v2.html` — per-room sparkline
- `mockups/pipeline/rollup-30-90-v3.html` — inline callouts (recommended primary)
- `mockups/pipeline/_shared/variant-chrome.css` — variant chrome only; nothing here belongs in the typed contract

Filenames preserved from the prior framing for stable bookmark/asset history. Will rename to `room-roll-strip-vN.html` once a direction is chosen.
