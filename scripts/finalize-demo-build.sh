#!/usr/bin/env bash
#
# Finalize the standalone Sostanza demo build.
#
# Runs after `vite build --config vite.config.demo.ts`. Renames the
# entry HTML so the / route serves the demo with no rewrite needed,
# then enforces a strict allowlist on the dist-demo directory so
# stray Cult/Praxis assets cannot ship with the demo deploy.
#
# Why an allowlist instead of the publicDir override alone: vite's
# publicDir guards against future regressions where someone adds a
# file to public/ thinking it's universal. The allowlist below is
# the second line of defense and the human-readable contract for
# what may legitimately appear at the prospect-facing URL.

set -euo pipefail

DIST="dist-demo"

if [[ ! -d "$DIST" ]]; then
  echo "finalize-demo-build: $DIST not found, did you run vite build first?" >&2
  exit 1
fi

if [[ -f "$DIST/index-demo.html" ]]; then
  mv -f "$DIST/index-demo.html" "$DIST/index.html"
fi

ALLOW=(
  "index.html"
  "favicon.svg"
  "assets"
)

shopt -s dotglob nullglob
violations=0
for entry in "$DIST"/*; do
  base="$(basename "$entry")"
  keep=false
  for allowed in "${ALLOW[@]}"; do
    if [[ "$base" == "$allowed" ]]; then
      keep=true
      break
    fi
  done
  if [[ "$keep" == false ]]; then
    rm -rf "$entry"
    violations=$((violations + 1))
  fi
done
shopt -u dotglob nullglob

echo "finalize-demo-build: removed $violations non-allowlisted entries from $DIST"

remaining=()
shopt -s dotglob nullglob
for entry in "$DIST"/*; do
  remaining+=("$(basename "$entry")")
done
shopt -u dotglob nullglob

for base in "${remaining[@]}"; do
  expected=false
  for allowed in "${ALLOW[@]}"; do
    if [[ "$base" == "$allowed" ]]; then
      expected=true
      break
    fi
  done
  if [[ "$expected" == false ]]; then
    echo "finalize-demo-build: ASSERTION FAILED — $DIST/$base is not on the allowlist" >&2
    exit 2
  fi
done

echo "finalize-demo-build: $DIST contents verified ($(printf '%s ' "${remaining[@]}"))"
