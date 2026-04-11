"""
Pillar 3 — Historical facts are immutable; lifecycle is not.

What this check does:
  Flags UPDATE statements that touch fact columns on append-only tables
  unless the session has set an approved retroactive reason code via a
  SQL comment annotation (`-- cultops:allow-retroactive <code>`).

  Fact columns are: quantities_g, source_ids, recorded_at, actor_id,
  event_type, from_state, to_state.

  Append-only tables are: batch_lifecycle_events, batch_package_lineage,
  batch_production_history, plant_stage_transitions,
  plant_group_stage_history, plant_group_room_history.

  (Both lists come from the contract, not hardcoded here.)

What this check DOES NOT do:
  - It does not enforce on INSERT (inserts are always allowed — that's the
    point of append-only).
  - It does not enforce on UPDATE of *lifecycle* columns (is_locked,
    applied_at, cancelled_at, status enums, etc.) — those are explicitly
    carved out by the contract.
  - It does not verify that the annotated reason code is actually one of
    the approved codes — but it does warn if the code isn't in the
    contract's approved_reason_codes set.
  - It does not detect retroactive writes done via CTE / MERGE / INSERT
    ... ON CONFLICT DO UPDATE — those are caught by Pillar 2 (v2 scope).

Bypass:
  `-- cultops:allow-retroactive <reason_code>` as a SQL comment anywhere
  in the statement text. The comment is extracted by the parser and
  surfaced on parsed.annotations.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from findings import PillarFinding, preview

if TYPE_CHECKING:
    from context_loader import LineageContract
    from sql_parser import ParsedStatement


PILLAR = 3
ANNOTATION_KEY = "cultops:allow-retroactive"


def check(
    statements: list["ParsedStatement"],
    contract: "LineageContract",
) -> list[PillarFinding]:
    findings: list[PillarFinding] = []

    for stmt in statements:
        if stmt.kind != "update":
            continue

        table = (stmt.target_table or "").lower()
        if not table:
            continue

        # Only enforce on append-only tables.
        if table not in contract.append_only_tables:
            continue

        # Which fact columns (if any) are being updated?
        updated_cols = set(c.lower() for c in stmt.updated_columns)
        touched_facts = updated_cols & contract.fact_column_names
        if not touched_facts:
            # UPDATE touches only lifecycle / non-fact columns — legitimate.
            continue

        annotation = stmt.annotations.get(ANNOTATION_KEY)
        if annotation is None:
            findings.append(
                PillarFinding(
                    pillar=PILLAR,
                    severity="deny",
                    statement_preview=preview(stmt.raw_text),
                    message=(
                        f"UPDATE on append-only table `{table}` touches fact "
                        f"columns {sorted(touched_facts)}. Pillar 3 refuses "
                        "retroactive writes to historical facts."
                    ),
                    remediation=(
                        f"If this is a legitimate audit reconciliation, add "
                        f"`-- {ANNOTATION_KEY} <reason_code>` above the "
                        "statement and ensure the reason code is listed in "
                        "cultops_approved_write_paths. Otherwise, rewrite as "
                        "an append (new event row) instead of a mutation."
                    ),
                )
            )
            continue

        # Annotation present — verify the reason code is approved.
        if annotation.lower() not in contract.approved_reason_codes:
            findings.append(
                PillarFinding(
                    pillar=PILLAR,
                    severity="ask",
                    statement_preview=preview(stmt.raw_text),
                    message=(
                        f"UPDATE on append-only table `{table}` carries "
                        f"`{ANNOTATION_KEY} {annotation}` but `{annotation}` "
                        "is not in the approved reason codes "
                        f"{sorted(contract.approved_reason_codes)}."
                    ),
                    remediation=(
                        "Either use an approved reason code, or add the new "
                        "code to cultops_approved_write_paths (with a decisions "
                        "row) and re-run."
                    ),
                )
            )
            # Don't deny — the annotation is there, we just want a human to
            # confirm the code is legitimate.

    return findings
