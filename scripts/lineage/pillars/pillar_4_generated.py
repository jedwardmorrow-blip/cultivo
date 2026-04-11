"""
Pillar 4 — Invariants live in generated columns, not in application code.

What this check does:
  Flags CREATE TABLE and ALTER TABLE ADD COLUMN statements where a column
  with a variance/mass-balance name (variance, variance_g, variance_qty,
  variance_percentage, expected_g, counted_g, ending_inventory_calculated_g,
  etc.) is declared WITHOUT a GENERATED ALWAYS clause.

  The heuristic is name-based: any column whose name starts with or
  contains "variance" or ends with "_calculated" or "_calculated_g" is
  treated as a derived quantity. This is intentionally broad — false
  positives are easier to carve out with a `-- cultops:computed-column`
  annotation than false negatives are to catch after the fact.

What this check DOES NOT do:
  - It does not verify the GENERATED expression is semantically correct.
    `variance_g GENERATED ALWAYS AS (0) STORED` passes. That's a human
    review problem.
  - It does not enforce on plain UPDATE statements that set variance
    columns — that's Pillar 3's job (fact immutability) and Pillar 2's
    job (write path enforcement).
  - It does not catch variance computation hidden in a trigger body.
    Triggers are out of scope for v1.

Bypass:
  `-- cultops:computed-column <reason>` annotation on the statement.
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from findings import PillarFinding, preview
from sql_parser import has_generated_always

if TYPE_CHECKING:
    from context_loader import LineageContract
    from sql_parser import ParsedStatement


PILLAR = 4
ANNOTATION_KEY = "cultops:computed-column"

# Name patterns that signal "this is a derived quantity and should be
# GENERATED ALWAYS". The patterns match against lowercased column names.
_DERIVED_PATTERNS = [
    re.compile(r"^variance(_.+)?$"),  # variance, variance_g, variance_pct
    re.compile(r"_variance(_.+)?$"),  # total_variance, weight_variance_g
    re.compile(r"_calculated(_g)?$"),  # ending_inventory_calculated_g
    re.compile(r"^calculated_"),  # calculated_variance_g
    re.compile(r"_mass_balance$"),
]


def check(
    statements: list["ParsedStatement"],
    contract: "LineageContract",
) -> list[PillarFinding]:
    findings: list[PillarFinding] = []

    for stmt in statements:
        if ANNOTATION_KEY in stmt.annotations:
            continue

        if stmt.kind == "create_table":
            findings.extend(_check_create_table(stmt))
        elif stmt.kind == "alter_table":
            findings.extend(_check_alter_table(stmt))

    return findings


def _check_create_table(stmt: "ParsedStatement") -> list[PillarFinding]:
    out: list[PillarFinding] = []
    for defn in stmt.column_defs:
        col_name = _extract_column_name(defn)
        if not col_name:
            continue
        if not _looks_derived(col_name):
            continue
        if has_generated_always(defn):
            continue
        out.append(
            PillarFinding(
                pillar=PILLAR,
                severity="deny",
                statement_preview=preview(stmt.raw_text),
                message=(
                    f"Column `{col_name}` on new table "
                    f"`{stmt.target_table}` looks like a derived quantity "
                    "but is not declared `GENERATED ALWAYS AS (...) STORED`. "
                    "Pillar 4 requires variances and mass-balance results to "
                    "live in generated columns, not in application code."
                ),
                remediation=(
                    f"Rewrite as `{col_name} <type> GENERATED ALWAYS AS "
                    "(<expression>) STORED`, or annotate the statement "
                    f"`-- {ANNOTATION_KEY} <reason>` if this column is "
                    "legitimately input-only."
                ),
            )
        )
    return out


def _check_alter_table(stmt: "ParsedStatement") -> list[PillarFinding]:
    out: list[PillarFinding] = []
    for action in stmt.alter_actions:
        action_stripped = action.strip()
        # Only interested in ADD COLUMN <name> <type> ...
        m = re.match(
            r"add\s+column\s+(?:if\s+not\s+exists\s+)?"
            r'"?([a-zA-Z_][a-zA-Z0-9_]*)"?',
            action_stripped,
            flags=re.IGNORECASE,
        )
        if not m:
            continue
        col_name = m.group(1).lower()
        if not _looks_derived(col_name):
            continue
        if has_generated_always(action_stripped):
            continue
        out.append(
            PillarFinding(
                pillar=PILLAR,
                severity="deny",
                statement_preview=preview(stmt.raw_text),
                message=(
                    f"ALTER TABLE `{stmt.target_table}` ADD COLUMN "
                    f"`{col_name}` looks like a derived quantity but is not "
                    "`GENERATED ALWAYS`. Pillar 4 requires variances and "
                    "mass-balance results to live in generated columns."
                ),
                remediation=(
                    f"Add the column as `{col_name} <type> GENERATED ALWAYS "
                    "AS (<expression>) STORED`, or annotate the statement "
                    f"`-- {ANNOTATION_KEY} <reason>`."
                ),
            )
        )
    return out


def _looks_derived(col_name: str) -> bool:
    for pat in _DERIVED_PATTERNS:
        if pat.search(col_name):
            return True
    return False


def _extract_column_name(defn: str) -> str | None:
    m = re.match(r'^\s*"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+', defn)
    if not m:
        return None
    name = m.group(1).lower()
    # Skip constraint lines
    if name in (
        "constraint",
        "primary",
        "unique",
        "check",
        "foreign",
        "exclude",
        "like",
    ):
        return None
    return name
