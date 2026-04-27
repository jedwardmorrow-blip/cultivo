# Cultivo Design System — Reference

This folder is the canonical Claude Design contract, lifted from the design system project (Cultivo Design System v7, 2026-04-26) and committed alongside the code. Read these before designing or modifying any operator surface.

## Files

- **`PHASE-0-REBRAND.md`** — token-swap migration. The drop-in tailwind config plus index.css that replaced the Cult Ops legacy palette. Already applied to this repo (see `tailwind.config.js`, `src/brand-tokens.css`, `src/index.css`). Reference for what changed and why.
- **`PHASE-1-SURFACE-GUIDE.md`** — surface-by-surface treatment map. Three treatments (A hairline, B gapped, C hybrid) with a per-surface assignment for every module. The contract for which composition each screen uses. Migration priority listed.

## How to use

When building or reviewing any operator surface in this repo:

1. Find the surface in `PHASE-1-SURFACE-GUIDE.md`. Confirm the assigned treatment (A, B, or C).
2. Implement against the canonical patterns in section "CSS implementation notes" of the guide.
3. Apply the stage-color migration (6px dot only, never fill) and typography migration (`font-mono` for codes, `font-mono tnum` for KPIs).
4. Validate against the violation lint in `Cultivo · System Reference.html` (in the Claude Design project) before shipping.

## Canonical token contract

`src/brand-tokens.css` at `:root`. All visual values resolve through these custom properties. Do not introduce magic numbers or off-token colors. If you need a new token, add it there and request a Claude Design review.

## Surface treatment quick reference

- **A · Hairline grid** — KPI strips, env rails, lifecycle ribbons, analytics, order/inventory lists, activity logs. 5+ data groups, comparison matters.
- **B · Gapped cards** — room tiles, dashboard tiles, worker surfaces, production tickets, auth, forms. Individually actionable, touch device, fewer than 5 items visible.
- **C · Hybrid** — alert panels, room detail, order detail, batch body, modals. Outer gapped card, hairline interior rows.

Worker module is always B. Public/marketing surfaces are out of scope for the operator polarity guard.

## Reference surfaces in this repo

- **`/cultivation-floor-plan`** — Floor Plan Live (variant C from Claude Design). Demonstrates A in the top state strip and timeline, gapped outer canvas, hairline rooms, C in the side rail. The gold standard for cultivation surfaces.
- **`/cultivation-command-preview`** — earlier v0.1 attempt that did not yet capture Claude Design language. Retire candidate; kept for reference until the new template is in place across the module.
- **`/claude-design-canvas`** — the entire Claude Design bundle embedded as an iframe at `public/claude-design/` (DEV only). Use to compare a port against its source.

All three routes are DEV-only via `import.meta.env.DEV`.

## Source of truth

Canonical Claude Design project lives outside this repo. When that project ships an update, it propagates here through:

1. A new `phase-N-...` document copied into this folder, and
2. Token edits to `src/brand-tokens.css` (and `tailwind.config.js` derivatives), in a single commit.

This folder is the typed contract Claude Code reads. The Claude Design project is where the contract is authored.
