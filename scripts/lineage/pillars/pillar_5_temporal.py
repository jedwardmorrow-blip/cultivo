"""
Pillar 5 — Temporal exclusions prevent overlapping reality.

What this check does:
  Flags CREATE TABLE statements where the table has a pair of period
  columns (e.g. period_start + period_end, audit_period_start +
  audit_period_end, effective_from + effective_to) but declares no
  EXCLUDE USING GIST constraint. The parser surfaces
  `has_period_columns` and `has_exclude_using_gist` on ParsedStatement
  for exactly this check.

  Severity is `ask`, not `deny`, because:
    (a) The btree_gist extension may not be installed on both
        environments yet (as of contract adoption — 2026-04-11 — it is
        not).
    (b) Some period-column tables are genuinely append-only lineage logs
        where overlap is the point (you want multiple rows recording
        multiple observations). Human review is the safety net.

  Once btree_gist is installed on both prod + staging and the contract
  row flips `btree_gist_installed = true`, this check should escalate
  to `deny` — that's a v1.1 follow-up.

What this check DOES NOT do:
  - It does not check ALTER TABLE ADD CONSTRAINT separately. If you add
    the period columns in one migration and the GIST constraint in a
    follow-up migration, the first migration will get an `ask` finding
    — which is the correct behavior (a human should confirm the GIST
    constraint is coming).
  - It does not verify the GIST constraint uses the right column pair.
    `EXCLUDE USING GIST (some_other_col WITH =, ...)` passes here and
    is caught by human review.

Bypass:
  `-- cultops:no-temporal-exclusion <reason>` annotation on the CREATE
  TABLE statement. Use this for append-only observation logs where
  overlap is intentional.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from findings import PillarFinding, preview

if TYPE_CHECKING:
    from context_loader import LineageContract
    from sql_parser import ParsedStatement


PILLAR = 5
ANNOTATION_KEY = "cultops:no-temporal-exclusion"


def check(
    statements: list["ParsedStatement"],
    contract: "LineageContract",
) -> list[PillarFinding]:
    findings: list[PillarFinding] = []

    for stmt in statements:
        if stmt.kind != "create_table":
            continue
        if not stmt.has_period_columns:
            continue
        if stmt.has_exclude_using_gist:
            continue
        if ANNOTATION_KEY in stmt.annotations:
            continue

        # Severity depends on whether the prerequisite extension is live.
        if contract.btree_gist_installed:
            severity = "deny"
            remediation_verb = "Add"
        else:
            severity = "ask"
            remediation_verb = (
                "Either add (once btree_gist is installed on prod + staging) or "
                "confirm this table is an append-only observation log with"
            )

        findings.append(
            PillarFinding(
                pillar=PILLAR,
                severity=severity,
                statement_preview=preview(stmt.raw_text),
                message=(
                    f"New table `{stmt.target_table}` has a period-column "
                    "signature (matching `_start`/`_end` pair) but does not "
                    "declare an `EXCLUDE USING GIST` constraint. Pillar 5 "
                    "requires temporal exclusions to prevent overlapping "
                    "reality for the same subject."
                ),
                remediation=(
                    f"{remediation_verb} an EXCLUDE USING GIST constraint: "
                    "`ALTER TABLE <t> ADD CONSTRAINT no_overlap EXCLUDE USING "
                    "GIST (<subject_col> WITH =, tstzrange(<start>, <end>) "
                    "WITH &&);`. If overlap is intentional, annotate the "
                    f"CREATE TABLE with `-- {ANNOTATION_KEY} <reason>`."
                ),
            )
        )

    return findings
