# Cultivo Pipeline · Rollup Canvas — Session Prompt

Paste the body below into a fresh Claude Design session. Designed for token-budget reset; everything Claude Design needs to read is named by path inside the cultivo-design repo connected via the GitHub connector.

---

## Session prompt

Read the cultivo-design repo. We are refining the Pipeline rollup row toward Gate A.

**Reference docs (read in this order):**

1. `briefs/pipeline.md` — one-page session opener.
2. `specs/pipeline.md` — full 13-section spec; section 5 (six non-negotiables), section 5-A (page header), section 9 (aesthetic constraints), section 12-A (working assumptions confirmed in v4 review), and section 12-B (fixture) are load-bearing for this session.
3. `fixtures/pipeline.json` — 15 real production batches, strain wholesale price table, conversion factor and cost-to-actualize working assumptions.
4. `tokens/brand-tokens.css` — typed token contract.
5. `mockups/pipeline/rollup-30-90-v3.html` — the prior-session Room Roll Strip recommended as primary.
6. `mockups/pipeline/decision-note-rollup-30-90-2026-04-26.md` — the prior-session decision note. Read both before drawing.

**Why we are running this session.** The v3 Room Roll Strip is recommended primary but the canonical four-number rollup row it sits within has not been mocked yet. The prior session refined one tile in isolation; this session refines the whole row at canvas scope, against real fixture distribution, in every state the surface has to survive.

**Return ONE design canvas with five layers:**

(a) **Composition at canonical width.** The full rollup row at 1366 landscape, comfortable mode. All elements named in spec section 5 #1 (four numbers: grams in flight, gross projected revenue, allocated, realized) plus the Room Roll Strip slotted into one of the four positions. The point of the exercise is to settle which position the strip displaces, or whether it lives outside the four-number row entirely.

(b) **Density at parity.** The same row in compact mode rendered immediately below the comfortable version, both populated with the same fixture row, both at canonical width. Compact is not a later concern; it is the constraint that shapes the comfortable layout. If a chart in the broader canvas would demote to a sparkline strip below 180px, render the strip next to the comfortable version so the visual relationship between modes is decided once.

(c) **Six state-slices, fixture-driven, on the same canvas.** Slice the fixture six ways and render all six:

  - Calm Tuesday — three rooms in the strip, zero callouts triggered.
  - Busy Tuesday — three rooms, one callout triggered.
  - Crisis Tuesday — three rooms with callouts, "+2 more · 1 severe" affordance below.
  - Cold-start — fresh tenant, no shipped history, no allocations.
  - Loading — skeleton state for every tile and the strip.
  - Error — Supabase timeout, single-line graceful failure across the row.

  Empty, loading, and error are 80% of the lived surface and have never been mocked. Mock them.

(d) **Six-frame demo storyboard of the COO's morning arc.** Frame 1 opens at start of day. Frame 2 five-second scan, eye lands on FLW-06 +5d. Frame 3 drills into FLW-08 (deep-dive overlay). Frame 4 returns. Frame 5 switches persona to Cultivation Manager. Frame 6 opens at-risk list. Render as a horizontal filmstrip of static frames, not as motion; the storyboard is to test that the surface behaves as a moment in someone's day, not a static frame.

(e) **Tweaks panel exposing every dial.** Italic load-bearing (on/off). Density mode (comfortable/compact). Allocation chip style (dot/filled/outlined). "+N more" severity policy (count-only/severity-tagged/hidden). Callout verbosity (terse/inline/hidden). Strain-count column (visible/hidden). Stage dot color binding (eyebrow-fixed/per-row/none). Tweaks panel is for combinatoric discovery, not A/B. Use the tweaks_panel.jsx starter and the EDITMODE persistence protocol so dial states survive reload.

**Aesthetic constraints, non-negotiable:**

  Operator canvas. `--op-canvas` background. IBM Plex Sans body. IBM Plex Mono on every number, code, ID, timestamp. IBM Plex Mono Italic for estimated numbers; roman for realized. Italic-vs-roman is load-bearing — do not dilute with secondary indicators.
  Hairlines, not cards. No glass. No gradient. No serif. No backdrop blur.
  Stage colors as 6px functional dots only.
  Single warm-white accent `--accent` for chrome.
  All tokens through `tokens/brand-tokens.css`. If a needed token does not exist, name the gap in the decision note.
  Tap targets 44px minimum y-axis (partnership demos run on tablet).

**Spec compliance check before commit.**

Section 5 #1 demands four numbers: grams in flight, gross projected revenue, allocated, realized. The Room Roll Strip currently displaces or supplements one of those four positions. Make this explicit in the canvas. The realization remainder bucket from section 8 (D16: 68 percent unattributed) must surface honestly somewhere in the rollup, not silently omit attribution.

**Three artifacts to ship, all in this session:**

1. The canvas HTML at `mockups/pipeline/rollup-canvas-2026-04-27.html` (or current date).

2. Decision note at `mockups/pipeline/decision-note-rollup-canvas-2026-04-27.md`. Five lines minimum (atoms new, atoms reused, tokens touched, question answered, question open) plus an explicit `views needed` list naming any database view or column that does not yet exist in `v_batch_lifecycle`.

3. Wiring contract at `mockups/pipeline/wiring-rollup-canvas-2026-04-27.md`. Spell out, in TypeScript-ish shorthand:

  - The new view shape needed for the Room Roll Strip (recommend `v_room_cohort_rollup`) with column names and types.
  - The callout rules function signature: `(cohort) => {severity: 'bad'|'warn'|'info', text: string}` plus the four-rule lookup body.
  - Empty / loading / error contracts per tile.
  - Click-target deep-link map (Room Roll Strip rows → ?, four-number tiles → ?, allocated tile → ?).
  - The two engineering deps from spec section 13 that gate this surface (strain wholesale price, expected_stage_durations lookup) named explicitly.

Without this third artifact Claude Code reads the mockup and makes ten micro-decisions on its own. With it, the wiring is mechanical.

**Gate A scorecard, five axes (not the usual three).** Justin will score:

  Speed-to-decision (1-5).
  Decision quality (1-5).
  Token cost (1-5, 5 = lowest cost).
  Survives crisis Tuesday (1-5) — does the layout hold when 3 of 3 rooms have callouts and 2 more are queued behind +N more?
  Sixty-second demo legibility (1-5) — can a Sostanza prospect who has never seen this app follow Justin's morning arc without him explaining what anything means?

The artifact that ships is the one that survives the partnership demo, not just the one that wins the canvas-quality vote.

**Open questions explicitly in scope for this session:**

  Italic-vs-roman cadence on rollup totals when projected and realized sit adjacent (treatment A: italic everywhere; treatment B: italic on line items, roman on rollup totals, small estimate-share indicator).
  Override / derived badge typography on the gross-projected-revenue line (deep-dive only confirmed; rollup tile placement still open).
  Realization remainder typography — sigil "u" after unattributed, or parenthetical "unattrib" inline label.
  "+N more" severity-tagging rule for the Room Roll Strip overflow.
  Header collapse at 1024 portrait — confirm the four-number rollup plus at-risk summary plus cash-conversion strip-mode chart all fit above the fold.

**Out of scope for this session:** the at-risk list rendering, the cash-conversion paired-bar chart, the full batch list, the deep-dive overlay (referenced in the storyboard but not designed here), persona variants beyond COO and one CFO toggle, mobile phone form factor.

**Working assumptions confirmed in spec section 12-A apply throughout.** Italic load-bearing for estimates. At-risk weighting per spec. Banner first-paint twelve-second pause then eight-second cycle. Compact chart floor at 180px. Override badge deep-dive only.

**End of prompt.** Read the docs, ask any clarifying questions before drawing, then return the canvas + decision note + wiring contract as one session deliverable.
