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

**Canonical references for working-instrument** are `/dashboard` and `/executive-hub` Overview. Reference them when building new instrument-grade screens.

**Login has been ported to the V4 Bureau dialect** (Tier 1 ceremonial) as of session 475 / commit `e86ebc4`. The V4 Bureau dialect is a parallel doctrine being validated section-by-section across three tiers (ceremonial / instrument / worker). It is sandbox-scoped under `.bureau-*` wrappers using a `--pv4-*` token namespace, so it does not displace working-instrument outside those wrappers. See "V4 Bureau dialect (in-progress migration)" below before designing auth, ceremonial, or worker-tier surfaces.

## Surface treatment contract (Phase 1)

Every operator surface uses one of three treatments. **Density follows the persona's task, not a global toggle.**

- **A · Hairline grid** — cells share an outer container with `1px` `--op-line` dividers. No per-cell radius, no per-cell background. Use for KPI strips, env rails, lifecycle ribbons, analytics, order/inventory lists, activity logs. 5+ data groups, comparison matters.
- **B · Gapped cards** — each card has its own border, radius (`--r-md`), background (`--op-surface`). 12–16px gap between cards. Use for room tiles, dashboard bento tiles, worker surfaces, production tickets, auth, forms.
- **C · Hybrid** — outer gapped card, hairline-divided interior rows. No nested cards. Use for alert panels, room detail expanded view, order detail, batch detail body, modals.

**Worker module is always B.** Workers are on tablets with gloves; 44px minimum hit targets, clear card boundaries.

**Canonical surface treatment guide is `docs/design-system/PHASE-1-SURFACE-GUIDE.md`** (Cultivo Design System v7, lifted from Claude Design). It contains the per-surface assignment for every module, the migration priority, and the CSS implementation patterns. Read it before designing or modifying any operator surface. The Phase 0 rebrand reference is at `docs/design-system/PHASE-0-REBRAND.md`.

**Reference port:** `/executive-hub` (Hub section "Overview" tab) is the gold-standard cultivation surface — Floor Plan Live mounted inside HubShell. A in the top state strip and timeline, gapped outer canvas, hairline rooms, C in the side rail. Source: `src/features/cultivation/components/command/floor-plan/`. Legacy executive panels live in a "Details" accordion below the floor plan on the same route.

## Instrument vs interpretation principle

The product is the **instrument**. The dashboard, floor plan, room board, alerts panel, env rail must always be true and unmediated. **The Seed is the only narrative surface.** All synthesis, story, interpretation, summary, and pattern-matching belongs to The Seed. See `cultivo_seed_surface_contract` (brain id `257b7034`) for the full visual + voice contract.

- No editorial UI in product. No data-driven hero headlines. No story-of-the-day baked into screens.
- The Seed is the named synthesis surface (formerly "AI chat widget"). Pattern recall, daily digest, real-time observation, reactive query response all live here. One surface, one organism, one voice.
- Story-of-the-day for the COO surfaces in The Seed, not on the dashboard.
- Voice contract: observational, never editorial. Subject-verb-object, no first person, no value judgment, no conversational warmth, no apology. Periods are legal only inside The Seed.
- Naming grammar: "The Seed" in narrative documentation; "Seed" (bare) in operator UI strings (`SEED · sales`, `seed thinking 3s`, `OPEN IN SEED →`).

This separation keeps the failure modes of mediated content local to The Seed. The dashboard stays cold and trustworthy.

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

## Banned patterns (working-instrument)

These patterns are AI-generated reflexes that betray the aesthetic. Operator tools should feel **made**, not **generated**. Lint and the Tailwind config block most of them at build time. Do not re-introduce them by hand.

- **No `backdrop-blur-*`.** Modal scrims are `bg-black/60`, opaque. The Tailwind config zeroes every `backdropBlur` value including standard names.
- **No `box-shadow` (any variant).** No `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, no glow shadows, no inner glows. Elevation is hairlines (`border-cult-border`, `border-cult-border-strong`). The Tailwind config zeroes all of these at the source.
- **No `rounded-xl`, `rounded-2xl`, `rounded-3xl`.** Cap at `rounded-cult` (12px) for panels, `rounded` (4px) for chips. Soft radii are an AI reflex toward "friendly" — the kit reads as instrument, not toy.
- **No stage colors as fills, tinted backgrounds, or borders.** Stage colors are 6px dot markers next to a label, never decoration. `bg-cult-stage-flower/10`, `border-cult-stage-clone/50`, `text-cult-stage-harvest` on a chip body are all violations. The single allowed use of a stage color is a `<span class="w-1.5 h-1.5 rounded-full bg-cult-stage-X" />` next to text.
- **No `bg-white`, `text-white`, `bg-gray-*`, `bg-slate-*`.** Use semantic tokens: `bg-cult-surface`, `text-cult-text-primary`, `bg-cult-surface-raised`, etc. Pure white is not in the operator palette.
- **No noise textures.** No inline SVG `<feTurbulence>` `fractalNoise` applied as `backgroundImage`. Surfaces are flat. If you see `NOISE_BG` referenced anywhere, delete it.
- **No glow constants.** No `INNER_GLOW`, `SELECTED_TOP_GLOW`, or any equivalent map of inset/outer box-shadows per stage or room type. Cards don't glow.
- **No urgency pulse animations.** No `animate-[pulseUrgentRed]`, no `animate-[pulseUrgentAmber]`, no animated shadows that breathe. Urgency is data: render as a static 6px dot + mono text label like `OVERDUE 4d`.
- **No `hover:-translate-y-*` on cards.** Cards in an instrument don't float on hover. Use `hover:bg-cult-surface-raised hover:border-cult-border-strong`.
- **No raw Tailwind palette colors (`bg-blue-500`, `text-emerald-400`, `border-amber-600`, etc.) in nav/chrome/CTAs.** They're permitted only inside chart libraries and feature-specific data visualizations where they encode functional meaning.
- **No editorial copy in operator surfaces.** No sentences ending with periods in the dashboard / floor plan / room board / alerts / env rail. That tone belongs in The Seed (the chat surface) only. The Performance Loop is a deliberate exception, owned by Claude Design.
- **No serif in operator code.** IBM Plex Sans + IBM Plex Mono only. Marketing/public surfaces may use IBM Plex Serif; operator code never. Italic Plex Sans (400/600) is allowed.
- **No decorative icons in data tiles.** Icons are wayfinding only — top nav, sub-nav, primary action buttons. Inside KPI tiles, status pills, table rows, and section headers: no icons.

When in doubt, look at `/dashboard` and `/executive-hub` Overview. Those are the canonical working-instrument references. (Login is now V4 Bureau, not working-instrument.)

## V4 Bureau dialect (in-progress migration)

A parallel design dialect being validated section-by-section. Deep-navy canvas (`--pv4-canvas-deep`), paper-cream type (`--pv4-paper`), gold accent (`--pv4-gold`), Bureau identity marks (serial plate, registry number, dashed rules). Replaces the working-instrument aesthetic on three target tiers:

- **Tier 1 ceremonial** — Login. **Shipped** session 475, commit `e86ebc4`.
- **Tier 2 instrument** — `/dashboard` home rack (COO daily home). **Shipped** session 476. Adds Bureau plate, hero KPI tagline, severity status block, 6-stage StageFlowRibbon, tightened Facility frame with inline urgency callouts. SalesInventoryView is queued as a second-instrument-tier surface for cross-component validation. Stress-test preview at `/login?v4test=sales`.
- **Tier 3 worker** — PinLoginPage. **Shipped** session 475, commit `ca69714`. Stress-test preview at `/login?v4test=pin`.

**Implementation contract.**

- Each ported surface gets a sandbox-scoped CSS file (e.g. `login-bureau.css`) using a `--pv4-*` namespace under a wrapper class (`.bureau-login`, etc.).
- `src/brand-tokens.css` and `tailwind.config.js` are NOT touched during the migration. The working-instrument cascade through `cult-*` utilities stays intact for the rest of the operator surface.
- The only motion-permitted component in V4 Bureau is `<PraxisAtom>` at `src/features/auth/components/praxis-atom/PraxisAtom.tsx`. It subsumes loading spinners, status dots, success toasts, error states, and boot screens. Six states: `boot`, `idle`, `loading`, `success`, `error`, `reduced-motion`.
- The legacy `.glass`, `.glass-card`, etc. classes from working-instrument continue to work inside V4 Bureau wrappers because `src/index.css` already flattens them to opaque hairline equivalents that resolve through `var(--op-*)`. The `.bureau-v4` wrapper in `bureau-v4-stress.css` overrides `--op-*` locally to V4 Bureau values, so existing components inherit V4 Bureau without code changes (used by V4StressTest).
- V4 Bureau imports `Big Shoulders Display` for ceremonial / display contexts. This is a sans display face, not a serif, so the "no serif in operator code" banned-pattern rule is preserved in spirit. Operator copy inside V4 Bureau still uses IBM Plex Sans / Mono.

**Doctrine references** (in `business_context`):
- `cultivo_v4_bureau_canonical_v1` (id `086ecee8-bf68-4455-abd2-b4dbe8b583c7`).
- `praxis_atom_v1` (id `879ea6ff-e57e-4232-95ae-de2ff5da559e`).
- `cultivo_glass_doctrine_v1` (id `9ae88200-d12f-4e81-a7c8-c825ba7a66d7`).
- Decision row `d004d3fc-4f1b-4cc1-9a4c-d267dc8824fb` (V4 Bureau canonical).

Once all three tiers ship, the brain will decide whether V4 Bureau displaces working-instrument globally (a `--op-*` token swap) or stays a per-surface dialect. Until then, do NOT introduce V4 Bureau patterns into surfaces outside the three target tiers.

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
src/shared/components/     # AIChatWidget.tsx (The Seed surface; rename pending per cultivo_seed_surface_contract)
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
