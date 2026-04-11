#!/usr/bin/env bash
# Bootstrap the lineage validator's Python venv if missing.
# Idempotent: safe to run on every hook invocation.
#
# The hook's settings.json command calls this script first, then
# execs the venv python against validate_sql.py. If the venv
# already exists and has the required packages installed, this
# script is effectively a no-op (<100ms).

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$DIR/.venv"
MARKER="$VENV/.lineage_bootstrapped"
REQS="$DIR/requirements.txt"

# Fast path: venv exists and requirements haven't changed since last bootstrap
if [[ -f "$MARKER" ]] && [[ "$REQS" -ot "$MARKER" ]]; then
  exit 0
fi

# Slow path: create or refresh the venv
echo "[cultops-lineage] Bootstrapping validator venv at $VENV..." >&2

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r "$REQS"
deactivate

touch "$MARKER"
echo "[cultops-lineage] Bootstrap complete." >&2
