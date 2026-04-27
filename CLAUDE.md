# Cultivo - AI Context

Cannabis cultivation operations platform. Cultivo is the new product brand; cult-ops is the legacy fork it descends from. React 18 + TypeScript + Vite + Supabase + Tailwind.

## Brand and architecture

**Cultivo supersedes Cult Ops** as the product brand (decision locked in session 365, 2026-04-26). Cult Cannabis is the first tenant, operator name preserved as "Cult Cannabis" wherever it appears in user-facing strings. cultops.io continues serving Cult Cannabis users until the Q2/Q3 migration; cultivo.ag is the canonical Cultivo domain (DNS pending GoDaddy A record to 76.76.21.21).

**Architecture: parallel-frontend, shared-backend.**

- This repo (`cultivo`) is a fresh Vite frontend cloned from cult-ops main at commit `18a69d4`.
- Backend is the same Supabase project as cult-ops: `fonreynkfeqywshijqpi`. No database fork. Schema, RLS, triggers, Edge Functions are shared.
- Vercel project: `cultivo` (prj_7OQ742bzyxlqL5jxFhDsaPr8yHYr) under justin-morrows-projects-bd1c185b. Auto-deploys from `main`.
- Custom domain: `cultivo.ag` (DNS pending). Auto-alias `cultivo-five.vercel.app`.

## Design system contract (working-instrument aesthetic)

The aesthetic is **working-instrument**: earned, used, quiet. Rejects "Tesla touchscreen" and "premium SaaS" framings. Single locked word: **Earned**.

- **Type.** IBM Plex Sans + IBM Plex Mono. **No serif inside the product.** Marketing artifacts get a separate kit and may add serif there. Polarity rule.
- **Color.** Single warm-white accent `#E8E0D4`. Operator canvas `#0A0A0A`. Surface stops `#111111` and `#161616`.
- **Borders.** Hairlines, not shadows. No glass. No backdrop blur. No gradient mesh.
- **Stage colors.** 6px markers only. Never as fills, borders, backgrounds, or chart lines.
- **Status colors.** Desaturated. `#6EAA8D` ok, `#C8943A` warn, `#C56A6A` bad.
- **Source of truth.** `src/brand-tokens.css` at `:root`. Imported at the top of `src/index.css`.
- **Tailwind alignment.** `tailwind.config.js` `cult-*` tokens repoint to `var(--op-*)` and `var(--accent)` etc. so existing `cult-surface`, `cult-border`, `cult-text-primary` class usage automatically inherits the new tokens.

**Glass utilities are flattened.** `.glass`, `.glass-card`, `.glass-input`, `.glass-elevated`, `.glass-modal`, `.glass-nav`, `.glass-skeleton` in `src/index.css` resolve to opaque hairline equivalents. Existing components using these classes auto-inherit working-instrument without refactoring. **Do not re-introduce backdrop-blur or rgba surfaces.** If a component needs a flat opaque surface, use `cult-surface` or `cult-surface-raised`. If it needs a hairline border, use `cult-border` or `cult-border-strong`.

**Box shadows neutralized.** `shadow-glass`, `shadow-glass-lg`, all `shadow-glow-*` classes are now `'none'`. Migrate components to hairlines over time; do not add new shadow utilities.

**Login is the canonical example** of the new aesthetic at `src/features/auth/components/Login.tsx`. Reference it when building new instrument-grade screens.

## Surface treatment contract (Phase 1)

Every operator surface uses one of three treatments. **Density follows the persona's task, not a global toggle.**

- **A · Hairline grid** — cells share an outer container with `1px` `--op-line` dividers. No per-cell radius, no per-cell background. Use for KPI strips, env rails, lifecycle ribbons, analytics, order/inventory lists, activity logs. 5+ data groups, comparison matters.
- **B · Gapped cards** — each card has its own border, radius (`--r-md`), background (`--op-surface`). 12–16px gap between cards. Use for room tiles, dashboard bento tiles, worker surfaces, production tickets, auth, forms.
- **C · Hybrid** — outer gapped card, hairline-divided interior rows. No nested cards. Use for alert panels, room detail expanded view, order detail, batch detail body, modals.

**Worker module is always B.** Workers are on tablets with gloves; 44px minimum hit targets, clear card boundaries.

**Canonical surface treatment guide is `docs/design-system/PHASE-1-SURFACE-GUIDE.md`** (Cultivo Design System v7, lifted from Claude Design). It contains the per-surface assignment for every module, the migration priority, and the CSS implementation patterns. Read it before designing or modifying any operator surface. The Phase 0 rebrand reference is at `docs/design-system/PHASE-0-REBRAND.md`.

**Reference port:** `/cultivation-floor-plan` (DEV-only) is the gold-standard cultivation surface — A in the top state strip and timeline, gapped outer canvas, hairline rooms, C in the side rail. Source: `src/features/cultivation/components/command/floor-plan/`.

## Instrument vs interpretation principle

The product is the **instrument**. The dashboard, floor plan, room board, alerts panel, env rail must always be true and unmediated. **The AI chat widget is the only narrative surface.** All synthesis, story, interpretation, summary, and pattern-matching belongs in the chat.

- No editorial UI in product. No data-driven hero headlines. No story-of-the-day baked into screens.
- The Seed (cross-cycle pattern matching) is a chat behavior, not a separate alert tone with bespoke UI.
- Story-of-the-day for the COO opens via the chat, not via the dashboard.

This separation keeps the failure modes of mediated content local to the chat. The dashboard stays cold and trustworthy.

## Persona contracts

Eight active personas with surface contracts in the World Model. Pull a persona row before designing or implementing any role-specific surface:

- **COO** (`cultivo_persona_coo`). Default module Pipeline. Density high. Full financial domain.
- **Cultivation Manager** (`cultivo_persona_cultivation_manager`). Default module Cultivation Command. No financial. References CUL-299 audit.
- **Post-Production Manager** (`cultivo_persona_post_production_manager`). Default module Production Hub. Persona-filter shipped in cultops-ai-chat v24 (lesson `1bc2214a`).
- **Sales / Account Manager** (`cultivo_persona_sales_account_manager`). Default module Orders.
- **Distribution Coordinator** (`cultivo_persona_distribution_coordinator`). Default module Distribution Command Center.
- **Compliance / QA** (`cultivo_persona_compliance_qa`). Default module Compliance Dashboard (yet to build).
- **Cultivation Worker** (`cultivo_persona_cultivation_worker`). PIN-login auth, mobile-first, three-big-buttons density. Two scope variants (assigned-rooms, IPM lead).
- **Rosin Lab Operator** (`cultivo_persona_rosin_lab_operator`). Default module Rosin Lab.

Taxonomy: `cultivo_persona_taxonomy`. Handoff protocol: `cultivo_design_handoff_protocol`. All in `business_context` where `category = 'cultops_design'`.

**Active personas at Cult Cannabis right now**: COO, Cultivation Manager, Post-Production Manager, Cultivation Worker. Do not over-design for the others until the second tenant lands.

## Critical product rules (carry forward from cult-ops)

1. **Never directly update inventory quantities.** Use `inventoryMovementService.recordMovement()`. Database triggers handle balance updates.
2. **Finalization = Creation.** Session finalization sets quantities directly on INSERT. Movement records are audit-only (bypass via `reason_code='session_finalization'`).
3. **batch_id is never null** in inventory operations. Format: `YYMMDD-STRAIN`.
4. **Import types from `@/types`.** Never duplicate domain type definitions.
5. **Search before creating.** Extend existing services/components instead of creating new files.
6. **Use semantic tokens, not raw palette.** Use `bg-cult-surface`, `bg-cult-surface-raised`, `border-cult-border`, `text-cult-accent`. Never `bg-[#0A0A0A]` or hardcoded hex. Tokens are now opaque (instrument-grade), not translucent (legacy glass). Read `cultivo_persona_*` rows in the World Model before designing role-specific surfaces.

## Session start protocol

Every session must call:

```sql
SELECT prepare_session_context('<2-6 word focus string>');
```

Against Praxis World Model project `uayyhluztelnfxfvdhyt` (`cult-ops-claude-context`). Examples:

- `prepare_session_context('cultivo coo pipeline surface')`
- `prepare_session_context('cultivo cultivation manager command')`
- `prepare_session_context('cultivo worker today tasks')`
- `prepare_session_context('cultivo rebrand wiring')`
- `prepare_session_context('cultivo performance loop sostanza')`

The brain returns active rules, persona contracts, recent decisions, open tasks, and semantically-relevant business_context for the focus.

## Bridge contracts (Claude Design vs Claude Code)

- **`src/brand-tokens.css`** is the typed contract for tokens. Claude Design ships updates; Claude Code copies into this repo in a single commit.
- **System Reference HTML** at `CultivoDS/ui_kits/cult-ops-brand/` is the typed contract for atoms and molecules. Claude Design owns; Claude Code reads.
- **Persona rows** in `business_context` are the typed contract for surfaces. Claude Code writes; Claude Design pulls via prepare_session_context or via the snapshot artifact.
- **Snapshot artifact** at `/Users/justinmorrow/Desktop/Claude/cultivo-design-handoff.md` is the portable export for Claude Design when they need to read without brain access.

## Before you code

1. Call `prepare_session_context` with a focused string.
2. If touching a role-specific surface, read the relevant `cultivo_persona_*` row first.
3. If touching tokens or aesthetic, read this file's design system contract section above.
4. If touching the AI chat widget functionality, coordinate with the parallel session (do not edit `src/shared/components/AIChatWidget.tsx` without checking).
5. If touching inventory/sessions: read `docs/ARCHITECTURE-DECISIONS.md`.
6. If touching conversions: read `docs/PRODUCTS.md`.
7. If working on the Cultivation module: read `docs/CULTIVATION.md`, `docs/CULTIVATION-ARCHITECTURE.md`, and `docs/CULTIVATION-RULES.md`.

## File structure

```
src/brand-tokens.css       # Token contract (do not edit without coordinating with Claude Design)
src/index.css              # Imports brand-tokens, defines flattened glass-* legacy utilities
src/features/[module]/     # Feature modules (sessions, inventory, orders, batches, coa, etc.)
src/features/auth/         # Login.tsx is the canonical aesthetic example
src/features/worker/       # Cultivation Worker persona (PIN auth, mobile-first)
src/types/                 # Centralized domain types
src/shared/                # Shared components, hooks
src/shared/components/     # AIChatWidget.tsx (the narrative surface)
src/services/              # Global services (inventoryMovement, error, notification)
src/lib/                   # Core utilities (supabase client, auth)
docs/                      # Documentation
supabase/migrations/       # Database migrations (shared with cult-ops project)
```

## After you code

- Run `npm run build` (must pass).
- Update CHANGELOG.md for significant changes.
- Run the dev server (`preview_start` name `cultivo` on port 5183) and verify the change visually before reporting done.
- Update the Hand-Off section in `docs/AI-BUILD-SESSION-CHECKLIST.md`.
- If you made a token change, update `cultivo-design-handoff.md` (or ask Justin to regenerate it from the brain).
- Close the session with `fn_close_session(...)` writing a structured handoff to `session_log` in the World Model.

## Deployment

- `main` branch deploys to production at `cultivo.ag` (DNS pending) and the auto-alias `cultivo-five.vercel.app`.
- Preview deploys for branches need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Preview env (set via Vercel dashboard; CLI stdin handling is bugged for preview env).
- Default deployment-protection on the Vercel project returns 401 on `*.vercel.app` URLs; custom domain is public once DNS verifies.
- Local dev: `npm run dev` (`vite --port 5183 --strictPort` via the global launch.json `cultivo` config).

## Open follow-ups (next sessions)

- TopNav rebuild on new tokens.
- Performance Loop route at `/cultivation-performance` for Sostanza demo Wed 4/29.
- ~50-file string sweep replacing Cult Ops / cult-ops / cultops with Cultivo / cultivo (preserving Cult Cannabis).
- COO Pipeline surface implementation (spec in `cultivo-design-handoff.md`).
- Role-based default-route wiring against `user_profiles.role` in the production DB.
- Logo redesign deferred to Q2/Q3; Cultivo uses typographic-only wordmark in the meantime.
- USPTO trademark filing for CULTIVO deferred to Q2 with cannabis IP attorney.
