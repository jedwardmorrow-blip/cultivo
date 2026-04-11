#!/usr/bin/env python3
"""
Offline smoke test for the lineage validator.

Runs each fixture in tests/fixtures/ through the full parse + pillar-check
pipeline using a MOCK LineageContract (no Supabase round trip). Prints
per-fixture verdicts so we can eyeball pillar behavior before the hook is
wired into settings.json.

Run from the lineage/ directory:
  ./.venv/bin/python tests/run_fixtures.py
"""

from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LINEAGE_DIR = os.path.dirname(HERE)
if LINEAGE_DIR not in sys.path:
    sys.path.insert(0, LINEAGE_DIR)

from context_loader import LineageContract  # noqa: E402
from sql_parser import parse_sql  # noqa: E402
from pillars import (  # noqa: E402
    pillar_1_reachability,
    pillar_3_immutability,
    pillar_4_generated,
    pillar_5_temporal,
    pillar_8_rls,
)


def build_mock_contract() -> LineageContract:
    """
    Hardcoded fixture contract that mirrors what the real Context DB would
    return as of contract adoption (2026-04-11). This lets us run the
    pipeline without hitting Supabase.
    """
    c = LineageContract(
        contract_text="(mock)",
        contract_updated_at="2026-04-11T00:00:00Z",
        allowlist_text="(mock)",
        allowlist_updated_at="2026-04-11T00:00:00Z",
    )
    c.root_tables = {"plant_groups", "grow_rooms", "strains", "batch_registry"}
    c.append_only_tables = {
        "batch_lifecycle_events",
        "batch_package_lineage",
        "batch_production_history",
        "plant_stage_transitions",
        "plant_group_stage_history",
        "plant_group_room_history",
    }
    c.structural_orphan_tables = {
        "bulk_inventory",
        "strain_metadata",
        "inventory_internal_labels",
        "session_pauses",
    }
    c.fact_column_names = {
        "quantities_g",
        "source_ids",
        "recorded_at",
        "actor_id",
        "event_type",
        "from_state",
        "to_state",
    }
    c.approved_reason_codes = {
        "audit_reconciliation",
        "plant_audit_reconciliation",
    }
    c.btree_gist_installed = False  # not yet installed on prod as of adoption
    return c


PILLARS = [
    (1, pillar_1_reachability.check),
    (3, pillar_3_immutability.check),
    (4, pillar_4_generated.check),
    (5, pillar_5_temporal.check),
    (8, pillar_8_rls.check),
]


def run_fixture(path: str, contract: LineageContract) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    statements = parse_sql(sql)

    all_findings = []
    for pillar_num, check in PILLARS:
        try:
            all_findings.extend(check(statements, contract))
        except Exception as e:  # pragma: no cover
            print(f"  [!] Pillar {pillar_num} crashed: {e}", file=sys.stderr)

    return {
        "path": path,
        "num_statements": len(statements),
        "findings": all_findings,
    }


def main() -> int:
    contract = build_mock_contract()
    fixtures_dir = os.path.join(HERE, "fixtures")

    fixtures = sorted(
        os.path.join(fixtures_dir, f)
        for f in os.listdir(fixtures_dir)
        if f.endswith(".sql")
    )

    # Expected decision per fixture — lets us verify pillar logic.
    # Values: "allow" | "ask" | "deny"
    expected = {
        "pillar_1_bad_orphan.sql": "deny",
        "pillar_1_good_fk.sql": "allow",
        "pillar_3_bad_retroactive.sql": "deny",
        "pillar_3_good_annotated.sql": "allow",
        "pillar_3_good_lifecycle.sql": "allow",
        "pillar_4_bad_plain_variance.sql": "deny",
        "pillar_4_good_generated.sql": "allow",
        "pillar_5_bad_no_gist.sql": "ask",  # btree_gist not installed yet
        "pillar_5_good_gist.sql": "allow",
        "pillar_8_bad_no_rls.sql": "deny",
    }

    fail_count = 0
    for path in fixtures:
        name = os.path.basename(path)
        result = run_fixture(path, contract)
        severities = {f.severity for f in result["findings"]}
        if "deny" in severities:
            decision = "deny"
        elif "ask" in severities:
            decision = "ask"
        else:
            decision = "allow"

        expected_decision = expected.get(name, "?")
        status = "OK " if decision == expected_decision else "FAIL"
        if decision != expected_decision:
            fail_count += 1

        print(
            f"[{status}] {name:<40} "
            f"parsed={result['num_statements']} "
            f"decision={decision:<5} expected={expected_decision}"
        )
        for f in result["findings"]:
            print(f"       · P{f.pillar} [{f.severity}] {f.message[:100]}")

    print()
    print(
        f"Summary: {len(fixtures) - fail_count}/{len(fixtures)} fixtures "
        f"matched expectation."
    )
    return 1 if fail_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
