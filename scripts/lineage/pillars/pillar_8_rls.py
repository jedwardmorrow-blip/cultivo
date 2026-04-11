"""
Pillar 8 — RLS on everything touching lineage.

What this check does:
  For every CREATE TABLE statement in the payload, verify that the SAME
  payload also contains an `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY`
  statement. Migrations that create a lineage-bearing table and leave
  RLS disabled are refused.

  This is a whole-payload check: we scan all statements once, collect
  the set of newly created tables, and the set of tables that had RLS
  enabled in the same payload, then flag any in the difference.

What this check DOES NOT do:
  - It does not verify that RLS policies were actually added. A table
    with RLS enabled and zero policies is effectively locked down to
    `service_role` only, which is a valid (if unusual) posture. Human
    review catches the mismatch.
  - It does not enforce on existing tables. Closing the 4-table RLS gap
    on production (163/167 → 167/167) is tracked separately in
    task_tracker.
  - It does not enforce on ALTER TABLE ... DISABLE ROW LEVEL SECURITY.
    That's a Pillar 8 violation by a different path — v2 scope.

Bypass:
  `-- cultops:no-rls <reason>` annotation on the CREATE TABLE. Use this
  for lookup/reference tables that genuinely don't need RLS (and add
  them to the allowlist).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from findings import PillarFinding, preview

if TYPE_CHECKING:
    from context_loader import LineageContract
    from sql_parser import ParsedStatement


PILLAR = 8
ANNOTATION_KEY = "cultops:no-rls"


def check(
    statements: list["ParsedStatement"],
    contract: "LineageContract",
) -> list[PillarFinding]:
    findings: list[PillarFinding] = []

    # Collect the set of tables that got RLS enabled in this payload.
    rls_enabled: set[str] = set()
    for stmt in statements:
        if stmt.kind == "enable_rls" and stmt.target_table:
            rls_enabled.add(stmt.target_table.lower())

    for stmt in statements:
        if stmt.kind != "create_table":
            continue
        table = (stmt.target_table or "").lower()
        if not table:
            continue
        if ANNOTATION_KEY in stmt.annotations:
            continue
        if table in rls_enabled:
            continue

        findings.append(
            PillarFinding(
                pillar=PILLAR,
                severity="deny",
                statement_preview=preview(stmt.raw_text),
                message=(
                    f"New table `{table}` is created without an accompanying "
                    "`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statement in "
                    "the same payload. Pillar 8 requires RLS on every "
                    "lineage-touching table."
                ),
                remediation=(
                    f"Add `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;` "
                    "and at least one policy in the same migration. If this "
                    "is a reference/lookup table that genuinely does not "
                    f"need RLS, annotate `-- {ANNOTATION_KEY} <reason>` and "
                    "add it to the allowlist."
                ),
            )
        )

    return findings
