# Phase 0 — Cultivo Rebrand Migration

**Two files. Drop-in replacements. No component changes required.**

## What's in this package

```
phase-0-rebrand/
  tailwind.config.js   ← replaces cult-ops/tailwind.config.js
  index.css            ← replaces cult-ops/src/index.css
  README.md            ← this file
```

## How to apply

```bash
cd cult-ops
cp /path/to/phase-0-rebrand/tailwind.config.js ./tailwind.config.js
cp /path/to/phase-0-rebrand/index.css ./src/index.css
npm run dev
```

That's it. Every `cult-*` class in the codebase resolves to the new Cultivo values automatically because the token names are preserved.

## What changed

### tailwind.config.js

| Token group | Before (Cult Ops) | After (Cultivo) | Why |
|---|---|---|---|
| `cult-surface` | `rgba(10,10,10,0.95)` (translucent) | `#0A0A0A` (opaque) | No gradient mesh to show through |
| `cult-surface-raised` | `rgba(255,255,255,0.06)` | `#111111` | Opaque instrument surfaces |
| `cult-surface-overlay` | `rgba(255,255,255,0.08)` | `#161616` | Same |
| `cult-text-primary` | `#FFFFFF` | `#F5F4F1` | Warm white, matches accent |
| `cult-text-secondary` | `#A6A6A6` | `rgba(245,244,241,0.62)` | Relative to warm white |
| `cult-text-muted` | `#666666` | `rgba(245,244,241,0.40)` | Same |
| `cult-text-faint` | `#404040` | `rgba(245,244,241,0.22)` | Same |
| `cult-accent-hover` | `#F5EDE0` (lighter) | `#D8CFC0` (press-darker) | Instrument: press = deepen, not lighten |
| `cult-success` | `#10B981` (vivid) | `#6EAA8D` (desaturated) | Accent stays the only bright thing |
| `cult-danger` | `#DC4545` | `#C56A6A` | Same principle |
| `cult-warning` | `#F59E0B` | `#C8943A` | Same |
| `cult-info` | `#3B82F6` | `#7B9EC4` | Same |
| `cult-border` | `rgba(255,255,255,0.10)` | `rgba(255,255,255,0.06)` | Subtler hairlines |
| `cult-border-strong` | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.12)` | Same |
| Font family | `Montserrat, Inter` | `IBM Plex Sans` + `IBM Plex Mono` | `font-mono` is new — use on numbers, codes, IDs |
| `rounded-cult` | `16px` | `12px` | Cultivo max radius |
| `shadow-glow-*` | Various glow values | All `none` | No glow shadows in instrument aesthetic |
| Stage colors | Unchanged | Unchanged | Hex identical — usage rules change in Phase 1 |

### index.css

| Change | Detail |
|---|---|
| **Font import** | `Montserrat` → `IBM Plex Sans` (6 weights + 2 italic) + `IBM Plex Mono` (3 weights + 1 italic) |
| **Body background** | `#1A1A2E` → `#0A0A0A` |
| **Gradient mesh** | `body::before` with 5 radial gradients → **deleted entirely** |
| **`.glass`** | `bg white/6 + blur(8px) saturate(1.4)` → `#111111 + 1px border` |
| **`.glass-card`** | `bg white/8 + blur + saturate + box-shadow` → `#111111 + 1px border + 12px radius` |
| **`.glass-card:hover`** | `bg white/12 + glow shadow` → `#161616 + stronger border` |
| **`.glass-elevated`** | `bg white/12 + blur(12px)` → `#161616 + 1px stronger border` |
| **`.glass-modal`** | `rgba(26,26,46,0.85) + blur(24px)` → `#0A0A0A + 1px border` |
| **`.glass-nav`** | `rgba(26,26,46,0.7) + blur(16px)` → `#0A0A0A + 1px right border` |
| **`.glass-input`** | Focus ring removed, border-only focus state |
| **`.glass-skeleton`** | Same shimmer animation, radius 12px, no blur |
| **Scrollbar** | Slightly dimmer thumb to match warm-white hierarchy |
| **`.tnum`** | **New** — tabular numerals utility for number columns |
| **`-webkit-font-smoothing`** | **New** — antialiased for Plex on macOS |

## What did NOT change

- **All animation classes** — `animate-fade-in`, `stagger-fade-in`, `card-fade-up`, etc. all work identically
- **All `cult-stage-*` color tokens** — same hex values
- **Safe-area utilities** — untouched
- **Touch optimizations** — untouched
- **Print styles** — untouched
- **Every `cult-*` class name** — preserved, so components don't need edits

## What to do after applying

### Immediate (same PR)

1. **Nav wordmark**: replace "CULT OPS" text with "cultivo" in lowercase. Use `font-sans font-semibold text-cult-accent tracking-tight`.
2. **Favicon**: replace with `assets/favicon.svg` from the design system project (lowercase "c" on dark canvas).
3. **`<title>` tags**: "Cult Ops" → "Cultivo" across all pages.

### Verify (manual spot-check)

The glass-to-opaque swap is the riskiest visual change. Check these surfaces:
- **Login/auth pages** — glass was heaviest here
- **CommandCenter** — card swap pattern, bento tiles
- **Modals** — nested glass depth is now flat; check contrast
- **Nav sidebar** — was translucent, now opaque

If any component looks broken, it's because it relied on `backdrop-filter` showing content behind. Fix: add an opaque `bg-cult-surface-raised` to the element.

### Phase 1 (post-launch, per-module)

- Replace stage-color background fills with 6px dot markers
- Audit `rounded-2xl` usage (should now be `rounded-cult` at 12px max)
- Migrate KPI numbers to `font-mono tnum` for tabular alignment
- Apply batch/room codes in `font-mono` instead of `font-sans`

## Token mapping reference

For Claude Code or any other session working on the codebase, the canonical token contract is:

```
CultivoDS/ui_kits/cult-ops-brand/brand-tokens.css
```

The `tailwind.config.js` in this package maps every `cult-*` token to the values defined there.
