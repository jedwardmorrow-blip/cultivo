"""
Pillar 1 — Every row reachable from a root.

What this check does:
  For every CREATE TABLE statement in the payload, verify that the new
  table declares at least one NOT NULL FOREIGN KEY. We cannot fully prove
  reachability from sqlparse alone (that would require walking the live
  FK graph), but we can catch the 80% case: brand-new tables landing with
  zero FKs. That's the scenario the contract explicitly refuses.

What this check DOES NOT do:
  - It does not prove transitive reachability. A table with an FK to a
    known orphan is still flagged by the reviewer, not by the hook.
  - It does not enforce on existing tables — only on CREATE TABLE. ALTER
    TABLE ADD COLUMN referencing a new table would be caught when that
    table itself is created.
  - It does not enforce NOT NULL on the FK in v1. sqlparse can't reliably
    tell us whether a NOT NULL clause applied to a column-level FK vs a
    constraint-level FK. We emit an "ask" finding when FKs exist but we
    can't prove at least one is NOT NULL, so Justin can eyeball it.

Exemptions:
  - Tables listed in contract.structural_orphan_tables (the grandfathered
    4 as of contract adoption).
  - Tables listed in contract.root_tables (roots by definition don't need
    FKs back to roots).
  - Pure reference-data tables tagged in the SQL with
    `-- cultops:reference-data <reason>` annotation.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from findings import PillarFinding, preview

if TYPE_CHECKING:
    from context_loader import LineageContract
    from sql_parser import ParsedStatement


PILLAR = 1


def check(
    statements: list["ParsedStatement"],
    contract: "LineageContract",
) -> list[PillarFinding]:
    findings: list[PillarFinding] = []

    for stmt in statements:
        if stmt.kind != "create_table":
            continue

        table = (stmt.target_table or "").lower()
        if not table:
            continue

        # Root tables are exempt by definition.
        if table in contract.root_tables:
            continue

        # Grandfathered orphans are exempt — enforcement is forward-looking.
        if table in contract.structural_orphan_tables:
            continue

        # Reference-data bypass via SQL comment annotation.
        if "cultops:reference-data" in stmt.annotations:
            continue

        if not stmt.foreign_keys:
            findings.append(
                PillarFinding(
                    pillar=PILLAR,
                    severity="deny",
                    statement_preview=preview(stmt.raw_text),
                    message=(
                        f"New table `{table}` declares no FOREIGN KEY. "
                        "Pillar 1 requires every non-root row to be reachable "
                        f"from a root ({sorted(contract.root_tables)}) via a "
                        "NOT NULL FK chain."
                    ),
                    remediation=(
                        "Add a NOT NULL FK that leads to a root, or annotate the "
                        "statement `-- cultops:reference-data <reason>` if this "
                        "is a reference table and add it to the allowlist."
                    ),
                )
            )
            continue

        # FKs exist — soft-check that at least one is "probably" NOT NULL by
        # looking at the raw column def for the FK'd columns. If we can't
        # prove it, emit an "ask" rather than a "deny": the human review path
        # is the safety net here, not the hook.
        fk_columns = {fk["column"] for fk in stmt.foreign_keys}
        if not _any_fk_column_is_not_null(stmt, fk_columns):
            findings.append(
                PillarFinding(
                    pillar=PILLAR,
                    severity="ask",
                    statement_preview=preview(stmt.raw_text),
                    message=(
                        f"New table `{table}` has FK(s) on {sorted(fk_columns)} "
                        "but the validator cannot confirm any are `NOT NULL`. "
                        "Pillar 1 requires a NOT NULL FK chain to a root. "
                        "If at least one FK column is NOT NULL, approve; "
                        "otherwise fix and resubmit."
                    ),
                    remediation=(
                        "Mark at least one FK column `NOT NULL` on the column def, "
                        "e.g. `plant_group_id uuid NOT NULL REFERENCES plant_groups(id)`."
                    ),
                )
            )

    return findings


def _any_fk_column_is_not_null(stmt: "ParsedStatement", fk_columns: set[str]) -> bool:
    """
    Scan the column defs of a CREATE TABLE for a line that (a) starts with
    one of the FK columns and (b) contains NOT NULL. Deliberately lenient —
    we want to err toward "probably fine, ask if unsure" rather than false
    positives on legitimate migrations.
    """
    for defn in stmt.column_defs:
        stripped = defn.strip().lower()
        for col in fk_columns:
            # Match at the start of the definition (column def, not a
            # constraint line).
            if stripped.startswith(col + " ") or stripped.startswith(f'"{col}"'):
                if "not null" in stripped:
                    return True
    return False
