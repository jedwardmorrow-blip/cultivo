#!/usr/bin/env bash
# ============================================================================
# lint-design-tokens.sh
# ============================================================================
# Checks for raw white/[opacity] Tailwind patterns in TSX/TS files under src/.
# These should be replaced with semantic design tokens from the CultOps
# design system.
#
# Mapping table:
#
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
#   divide-white/[*]             (use semantic border tokens)
#   ring-white/[*]               (use semantic border tokens)
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
PATTERN='(bg|border|divide|ring)-white/\['

# Find violations in .ts and .tsx files, excluding node_modules
violations=$(grep -rn --include='*.ts' --include='*.tsx' -E "$PATTERN" "$SRC_DIR" 2>/dev/null || true)

if [ -z "$violations" ]; then
  echo "lint-design-tokens: No raw white/[opacity] patterns found. All clean."
  exit 0
fi

echo "lint-design-tokens: Found raw white/[opacity] violations. Use semantic tokens instead."
echo "--------------------------------------------------------------------------------"
echo "$violations"
echo "--------------------------------------------------------------------------------"
echo ""
echo "Run 'grep -rn --include=\"*.tsx\" --include=\"*.ts\" -E \"(bg|border|divide|ring)-white/\\[\" src/' to see all hits."
echo "See scripts/lint-design-tokens.sh for the mapping table."
exit 1
