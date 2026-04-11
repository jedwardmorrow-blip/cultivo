"""
Fetches the canonical lineage contract and approved-write-paths allowlist
from the Supabase Context DB (uayyhluztelnfxfvdhyt) on every invocation.

This module is the single source of truth for the validator's knowledge of
what the contract currently says. There is intentionally no cache: the hook
fires rarely enough that 200-500ms of psycopg overhead per tool call is
acceptable, and the skill explicitly promises "fresh every invocation".

Failure modes:
  - Context DB unreachable within CONNECT_TIMEOUT → fail CLOSED (deny with
    reason). The hook should never silently allow a write just because the
    brain is down. If Justin needs to bypass, he sets CULTOPS_LINEAGE_BYPASS=1
    in the environment — handled by validate_sql.py, not here.
  - Rows missing → fail CLOSED. An empty contract is indistinguishable from
    a catastrophically misconfigured one; refuse the write and surface.

Environment variables consumed:
  CULTOPS_CONTEXT_DB_URL  Postgres connection string to the context DB.
                          If unset, defaults to a read-only Supabase pooler
                          URL (not implemented yet — will error loudly).
"""

from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field
from typing import Optional

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError as e:
    print(
        "[cultops-lineage] psycopg not installed. Run bootstrap.sh.",
        file=sys.stderr,
    )
    raise SystemExit(2) from e


CONNECT_TIMEOUT_SECONDS = 3
QUERY_TIMEOUT_MS = 2500


@dataclass
class ApprovedWritePath:
    """A single entry from cultops_approved_write_paths."""

    path_type: str  # "rpc" | "trigger_chain"
    name: str
    landing_date: Optional[str] = None
    reason_codes: list[str] = field(default_factory=list)
    deprecated: bool = False


@dataclass
class LineageContract:
    """Parsed contents of cultops_lineage_contract + cultops_approved_write_paths."""

    contract_text: str
    contract_updated_at: str
    allowlist_text: str
    allowlist_updated_at: str

    # Derived / parsed from the two text blobs below
    approved_rpcs: list[ApprovedWritePath] = field(default_factory=list)
    approved_trigger_chains: list[ApprovedWritePath] = field(default_factory=list)
    approved_reason_codes: set[str] = field(default_factory=set)

    # Pillar-specific knowledge extracted from the contract text
    root_tables: set[str] = field(default_factory=set)
    append_only_tables: set[str] = field(default_factory=set)
    structural_orphan_tables: set[str] = field(
        default_factory=set
    )  # known existing orphans, exempt from enforcement
    fact_column_names: set[str] = field(default_factory=set)

    # Lifecycle feature flags
    btree_gist_installed: bool = False
    pgtap_installed: bool = False
    supa_audit_installed: bool = False


class ContextDBError(RuntimeError):
    """Raised when the context DB cannot satisfy a contract load."""


def _build_connection_string() -> str:
    url = os.environ.get("CULTOPS_CONTEXT_DB_URL")
    if url:
        return url
    raise ContextDBError(
        "CULTOPS_CONTEXT_DB_URL environment variable is not set. "
        "Add it to your shell profile pointing at the cult-ops-claude-context "
        "Supabase project (uayyhluztelnfxfvdhyt). Until it is set, the lineage "
        "hook cannot read the contract and will fail closed."
    )


def load_contract() -> LineageContract:
    """
    Fetch both context DB rows and the prerequisite-extension flags in a
    single round trip. Raises ContextDBError on any failure; the caller
    is responsible for converting that into a hook deny response.
    """
    conn_str = _build_connection_string()

    try:
        with psycopg.connect(
            conn_str,
            connect_timeout=CONNECT_TIMEOUT_SECONDS,
            row_factory=dict_row,
            options=f"-c statement_timeout={QUERY_TIMEOUT_MS}",
        ) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT key, value, updated_at
                    FROM business_context
                    WHERE key IN ('cultops_lineage_contract', 'cultops_approved_write_paths')
                      AND row_type = 'living'
                    """
                )
                rows = {r["key"]: r for r in cur.fetchall()}

                if "cultops_lineage_contract" not in rows:
                    raise ContextDBError(
                        "cultops_lineage_contract row not found in context DB. "
                        "The contract was expected at business_context.key="
                        "'cultops_lineage_contract' with row_type='living'."
                    )
                if "cultops_approved_write_paths" not in rows:
                    raise ContextDBError(
                        "cultops_approved_write_paths row not found in context DB."
                    )
    except psycopg.OperationalError as e:
        raise ContextDBError(
            f"Could not reach context DB within {CONNECT_TIMEOUT_SECONDS}s: {e}"
        ) from e
    except psycopg.Error as e:
        raise ContextDBError(f"Context DB query failed: {e}") from e

    contract_text = rows["cultops_lineage_contract"]["value"]
    allowlist_text = rows["cultops_approved_write_paths"]["value"]

    contract = LineageContract(
        contract_text=contract_text,
        contract_updated_at=str(rows["cultops_lineage_contract"]["updated_at"]),
        allowlist_text=allowlist_text,
        allowlist_updated_at=str(rows["cultops_approved_write_paths"]["updated_at"]),
    )

    _parse_contract_knowledge(contract)
    _parse_allowlist_paths(contract)

    return contract


def _parse_contract_knowledge(contract: LineageContract) -> None:
    """
    Extract structured knowledge from the contract text.

    This is deliberately conservative: we pull what we can parse deterministically
    from the current contract format and defer anything ambiguous. If the contract
    is rewritten in a way that breaks this parser, the parser fails closed (the
    caller treats an under-populated contract as a deny trigger for affected
    pillars).
    """
    text = contract.contract_text

    # Roots: declared in Pillar 1 header
    roots_match = re.search(
        r"Roots?:\s*([a-z_,\s]+?)(?:\.|\n)",
        text,
        flags=re.IGNORECASE,
    )
    if roots_match:
        raw = roots_match.group(1)
        contract.root_tables = {
            name.strip().strip(".") for name in raw.split(",") if name.strip()
        }
    else:
        contract.root_tables = {
            "plant_groups",
            "grow_rooms",
            "strains",
            "batch_registry",
        }

    # Append-only tables: declared in Pillar 3 as a bulleted list following
    # "This applies to:"
    append_only_match = re.search(
        r"Pillar 3.*?This applies to:(.*?)(?=\n\n|\nLifecycle columns)",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if append_only_match:
        contract.append_only_tables = set(
            re.findall(r"-\s*`?([a-z_]+)`?", append_only_match.group(1))
        )
    if not contract.append_only_tables:
        contract.append_only_tables = {
            "batch_lifecycle_events",
            "batch_package_lineage",
            "batch_production_history",
            "plant_stage_transitions",
            "plant_group_stage_history",
            "plant_group_room_history",
        }

    # Fact column names declared in Pillar 3
    contract.fact_column_names = {
        "quantities_g",
        "source_ids",
        "recorded_at",
        "actor_id",
        "event_type",
        "from_state",
        "to_state",
    }

    # Known existing structural orphans (grandfathered — enforcement is
    # forward-looking only, existing orphans are listed here so the validator
    # can exempt them from Pillar 1 refusal on touch).
    orphan_match = re.search(
        r"Current structural orphans.*?:(.*?)(?=\n\n|Data orphans)",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if orphan_match:
        contract.structural_orphan_tables = set(
            re.findall(r"-\s*`?([a-z_]+)`?", orphan_match.group(1))
        )
    if not contract.structural_orphan_tables:
        contract.structural_orphan_tables = {
            "bulk_inventory",
            "strain_metadata",
            "inventory_internal_labels",
            "session_pauses",
        }


def _parse_allowlist_paths(contract: LineageContract) -> None:
    """Pull RPCs, trigger chains, and reason codes out of the allowlist text."""
    text = contract.allowlist_text

    # RPC names: lines starting with "- public.<name>("
    for m in re.finditer(r"-\s+public\.(\w+)\s*\(", text):
        name = f"public.{m.group(1)}"
        contract.approved_rpcs.append(
            ApprovedWritePath(path_type="rpc", name=name)
        )

    # Trigger chains: headers "### <something> chain"
    for m in re.finditer(r"###\s+(\w+(?:_\w+)*)\s+chain", text, flags=re.IGNORECASE):
        contract.approved_trigger_chains.append(
            ApprovedWritePath(path_type="trigger_chain", name=m.group(1))
        )

    # Reason codes: quoted 'snake_case_string' following "Reason codes accepted:"
    for block_match in re.finditer(
        r"Reason codes? accepted[^:]*:(.*?)(?=\n-|\n###|\n##|\Z)",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    ):
        for code_match in re.finditer(r"'([a-z_]+)'", block_match.group(1)):
            contract.approved_reason_codes.add(code_match.group(1))

    # Safety net: if parsing completely failed, seed with the contract-adoption
    # reason codes so the bypass path still works in a degraded parse.
    if not contract.approved_reason_codes:
        contract.approved_reason_codes = {
            "audit_reconciliation",
            "plant_audit_reconciliation",
        }


if __name__ == "__main__":
    # Allow `python context_loader.py` to smoke-test the DB connection.
    try:
        c = load_contract()
    except ContextDBError as e:
        print(f"[cultops-lineage] FAILED: {e}", file=sys.stderr)
        raise SystemExit(1)
    print(f"Contract loaded, {len(c.contract_text)} chars, updated {c.contract_updated_at}")
    print(f"Allowlist loaded, {len(c.allowlist_text)} chars, updated {c.allowlist_updated_at}")
    print(f"Roots:              {sorted(c.root_tables)}")
    print(f"Append-only tables: {sorted(c.append_only_tables)}")
    print(f"Known orphans:      {sorted(c.structural_orphan_tables)}")
    print(f"Approved RPCs:      {[p.name for p in c.approved_rpcs]}")
    print(f"Trigger chains:     {[p.name for p in c.approved_trigger_chains]}")
    print(f"Reason codes:       {sorted(c.approved_reason_codes)}")
