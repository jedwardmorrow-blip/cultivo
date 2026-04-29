#!/usr/bin/env bash
# ============================================================================
# lint-design-tokens.sh
# ============================================================================
# Catches AI-generated design system violations at commit time.
# Run via: npm run lint:tokens
#
# Two checks:
#   1. Raw white/[opacity] Tailwind patterns (replaced by semantic tokens)
#   2. Banned aesthetic patterns (backdrop-blur, large radii, standard shadows,
#      stage colors as fills, raw Tailwind palette colors, etc)
#
# Mapping table for #1:
#   Raw pattern                  Semantic token
#   -------------------------    ----------------------------
#   bg-white/[0.02]              bg-cult-surface-inset
#   bg-white/[0.03]              bg-cult-surface-subtle
#   bg-white/[0.04]              bg-cult-near-black
#   bg-white/[0.06]              bg-cult-surface-raised
#   bg-white/[0.08]              bg-cult-surface-overlay
#   bg-white/[0.10]              bg-cult-surface-active
#   border-white/[0.04]          border-cult-border-faint
#   border-white/[0.06]          border-cult-border-subtle
#   border-white/[0.08]          border-cult-border
#   border-white/[0.10]          border-cult-border
#   border-white/[0.12]          border-cult-border-active
#   border-white/[0.15+]         border-cult-border-strong
#
# Banned patterns for #2:
#   - backdrop-blur-* (any variant): surfaces are opaque
#   - shadow-sm/md/lg/xl/2xl/3xl: hairlines only, no shadows
#   - rounded-xl/2xl/3xl: max radius is rounded-cult (12px)
#   - bg-cult-stage-*/N or border-cult-stage-*/N: stage colors as fills
#   - animate-[pulseUrgent*]: pulse animations are banned
#   - hover:-translate-y-*: cards don't float
#
# Usage:
#   bash scripts/lint-design-tokens.sh
#
# Exit codes:
#   0  No violations found
#   1  Violations found
# ============================================================================

set -euo pipefail

SRC_DIR="src"
fail=0

# ── Check 1: raw white/[opacity] patterns ─────────────────────────────────
PATTERN_WHITE='(bg|border|divide|ring)-white/\['
white_violations=$(grep -rn --include='*.ts' --include='*.tsx' -E "$PATTERN_WHITE" "$SRC_DIR" 2>/dev/null || true)

if [ -n "$white_violations" ]; then
  echo "[lint-tokens] Raw white/[opacity] patterns found. Use semantic tokens."
  echo "--------------------------------------------------------------------------------"
  echo "$white_violations"
  echo "--------------------------------------------------------------------------------"
  fail=1
fi

# ── Check 2: banned aesthetic patterns ────────────────────────────────────
# Each entry is "pattern|description"
BANNED_PATTERNS=(
  '\bbackdrop-blur-(sm|md|lg|xl|2xl|3xl|none)\b|backdrop-blur (surfaces are opaque, see CLAUDE.md Banned Patterns)'
  '\bshadow-(sm|md|lg|xl|2xl|3xl|inner)\b|standard Tailwind shadow (use hairline borders, see CLAUDE.md)'
  '\brounded-(xl|2xl|3xl)\b|oversized radius (cap at rounded-cult / 12px)'
  '\b(bg|border)-cult-stage-[a-z]+/[0-9]+\b|stage color as fill or border (use 6px dot marker only)'
  'animate-\[pulseUrgent(Red|Amber)|urgency pulse animation (use static dot + text label)'
  'hover:-translate-y-|hover translate (cards do not float)'
)

for entry in "${BANNED_PATTERNS[@]}"; do
  pattern="${entry%%|*}"
  desc="${entry#*|}"
  # Skip JSDoc / line comments by dropping any matched line whose code portion
  # (after file:line:) starts with whitespace + `*` or `//`. This lets
  # CLAUDE.md ban-list mentions inside header comments not trigger the lint.
  hits=$(grep -rn --include='*.ts' --include='*.tsx' -E "$pattern" "$SRC_DIR" 2>/dev/null \
    | grep -vE '^[^:]+:[0-9]+:\s*(\*|//)' \
    || true)
  if [ -n "$hits" ]; then
    echo "[lint-tokens] Banned: $desc"
    echo "--------------------------------------------------------------------------------"
    echo "$hits"
    echo "--------------------------------------------------------------------------------"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "lint-design-tokens: No violations. All clean."
  exit 0
fi

echo ""
echo "See CLAUDE.md > 'Banned patterns (working-instrument)' for the full list and rationale."
exit 1
