#!/usr/bin/env python3
"""
Claude Code PreToolUse hook entrypoint for the cult-ops lineage validator.

Protocol (https://docs.claude.com/en/docs/claude-code/hooks):
  stdin  : JSON event payload from Claude Code (tool_name, tool_input, ...)
  stdout : JSON response with `hookSpecificOutput.permissionDecision`
           ("allow" | "deny" | "ask") and `permissionDecisionReason`.
  exit 0 : response parsed from stdout
  exit 2 : hard block (stderr becomes the block reason — last resort)
  exit 1 : non-blocking error — log to stderr, allow the tool call through

Design principles (carried forward from the Layer 3 plan):
  1. FAIL CLOSED on contract-load failures for affected pillars. If the
     brain is unreachable we refuse rather than silently allowing writes.
  2. SHORT-CIRCUIT ALLOW when the tool is not a Supabase MCP SQL call or
     the target project is not production/staging. The hook should be a
     no-op for everything it doesn't care about.
  3. ESCAPE HATCH via `CULTOPS_LINEAGE_BYPASS=1` in the environment — the
     hook emits a loud stderr warning and allows the call. Intended only
     for emergency Justin-driven carve-outs.
  4. BE HONEST about what v1 enforces. Pillars 1, 3, 4, 5, 8 are in scope.
     Pillars 2, 6, 7 are punted to v2 — they require runtime-level
     knowledge (approved write path resolution, view-join analysis, RPC
     wrapping) that sqlparse can't give us cheaply.
  5. WARN-ONLY DEFAULT (added 2026-04-11, session 305). The hook is in
     warn-only mode by default: pillar findings, contract-load failures,
     parse failures, and validator crashes are logged loudly to stderr
     but the SQL call is ALLOWED through. To re-enable strict mode (deny
     on violation), set `CULTOPS_LINEAGE_STRICT=1` in the environment.
     Rationale: earn strictness per-check instead of assuming it. The
     hook gives signal without locking the operator out of their own
     database. When a warn-only finding turns out to be a real catch
     in production, that's evidence to flip strict mode on for that
     specific case.

Tool matcher (set in settings.json):
  mcp__.*__(execute_sql|apply_migration)

The matcher is a regex — the `mcp__<uuid>__` prefix is not portable across
machines, so we match on tool-name suffix.
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from dataclasses import dataclass, field
from typing import Optional

# Make sibling modules importable when this file is invoked directly by the hook.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from context_loader import ContextDBError, LineageContract, load_contract  # noqa: E402
from findings import PillarFinding  # noqa: E402
from sql_parser import ParsedStatement, parse_sql  # noqa: E402


# Project IDs the hook cares about. Anything else short-circuits to allow.
PRODUCTION_PROJECT_ID = "fonreynkfeqywshijqpi"
STAGING_PROJECT_ID = "cbxwippkzeszvxewhebd"
WATCHED_PROJECT_IDS = {PRODUCTION_PROJECT_ID, STAGING_PROJECT_ID}

# Tool-name suffixes we care about. The matcher regex in settings.json should
# already filter to these, but we re-check here so the script is safe to run
# standalone (smoke tests, CLI invocations).
WATCHED_TOOL_SUFFIXES = ("__execute_sql", "__apply_migration")

BYPASS_ENV_VAR = "CULTOPS_LINEAGE_BYPASS"
STRICT_ENV_VAR = "CULTOPS_LINEAGE_STRICT"  # set to "1" to enforce; default is warn-only


@dataclass
class ValidationResult:
    findings: list[PillarFinding] = field(default_factory=list)

    @property
    def has_denies(self) -> bool:
        return any(f.severity == "deny" for f in self.findings)

    @property
    def has_asks(self) -> bool:
        return any(f.severity == "ask" for f in self.findings)

    def worst_decision(self) -> str:
        if self.has_denies:
            return "deny"
        if self.has_asks:
            return "ask"
        return "allow"

    def format_reason(self) -> str:
        if not self.findings:
            return "cult-ops lineage contract: no violations detected."
        lines: list[str] = ["cult-ops lineage contract violations:"]
        for f in self.findings:
            prefix = {"deny": "BLOCK", "ask": "CONFIRM", "warn": "WARN"}[f.severity]
            lines.append(f"  [{prefix}] Pillar {f.pillar}: {f.message}")
            if f.remediation:
                lines.append(f"           → {f.remediation}")
            lines.append(f"           stmt: {f.statement_preview}")
        lines.append("")
        lines.append(
            "If this is a legitimate carve-out, either (a) add an approved "
            "reason code to cultops_approved_write_paths and annotate the "
            "statement with `-- cultops:allow-retroactive <code>`, or "
            f"(b) set {BYPASS_ENV_VAR}=1 for a one-shot emergency bypass."
        )
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Hook I/O
# ---------------------------------------------------------------------------


def _read_hook_input() -> dict:
    """Parse the JSON event off stdin. Returns {} on empty/invalid input."""
    try:
        raw = sys.stdin.read()
    except Exception:
        return {}
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _emit_decision(
    decision: str,
    reason: str,
    *,
    exit_code: int = 0,
) -> None:
    """
    Write a PreToolUse hook response to stdout and exit.
    decision is one of "allow" | "deny" | "ask".
    """
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()
    sys.exit(exit_code)


def _allow(reason: str = "cult-ops lineage validator: allowed.") -> None:
    _emit_decision("allow", reason)


def _deny(reason: str) -> None:
    _emit_decision("deny", reason)


def _ask(reason: str) -> None:
    _emit_decision("ask", reason)


def _is_strict_mode() -> bool:
    """Return True if CULTOPS_LINEAGE_STRICT=1 is set in the environment."""
    return os.environ.get(STRICT_ENV_VAR) == "1"


def _deny_or_warn(reason: str) -> None:
    """
    Strict mode: deny the call (original fail-closed behavior).
    Warn-only mode (default): print the would-have-denied reason loudly to
    stderr and allow the call through. The whole point of warn-only mode is
    to never lock the operator out — they still see every catch the hook
    would have made, just without the block.
    """
    if _is_strict_mode():
        _deny(reason)
    print(
        f"[cultops-lineage] WARN-ONLY MODE: would have DENIED in strict mode.\n"
        f"{reason}\n"
        f"(set {STRICT_ENV_VAR}=1 to enforce)",
        file=sys.stderr,
    )
    _allow(
        "cult-ops lineage validator (warn-only): finding logged. "
        "See stderr for details."
    )


# ---------------------------------------------------------------------------
# Tool-call classification
# ---------------------------------------------------------------------------


def _is_watched_tool(tool_name: str) -> bool:
    if not tool_name:
        return False
    return any(tool_name.endswith(suffix) for suffix in WATCHED_TOOL_SUFFIXES)


def _extract_sql_and_project(event: dict) -> tuple[Optional[str], Optional[str]]:
    """
    Pull the SQL text and the target Supabase project_id out of the hook event.

    The Supabase MCP tools we care about take arguments in these shapes:
      execute_sql  { "project_id": "...", "query": "SELECT ..." }
      apply_migration { "project_id": "...", "name": "...", "query": "..." }

    Claude Code wraps the tool args under `tool_input`.
    """
    tool_input = event.get("tool_input") or {}
    project_id = tool_input.get("project_id")
    # Both tools use "query" as the SQL field.
    sql = tool_input.get("query") or tool_input.get("sql")
    return (sql, project_id)


# ---------------------------------------------------------------------------
# Pillar routing
# ---------------------------------------------------------------------------


def _run_pillars(
    statements: list[ParsedStatement],
    contract: LineageContract,
) -> ValidationResult:
    """
    Route each parsed statement through the v1 pillar checks.

    Pillars are imported lazily so that a syntax error in one pillar module
    doesn't take down the whole validator at import time. Any pillar that
    fails to import is logged to stderr and skipped (non-blocking) — the
    other pillars still run.
    """
    result = ValidationResult()

    pillar_modules = [
        ("pillar_1_reachability", 1),
        ("pillar_3_immutability", 3),
        ("pillar_4_generated", 4),
        ("pillar_5_temporal", 5),
        ("pillar_8_rls", 8),
    ]

    for module_name, pillar_num in pillar_modules:
        try:
            mod = __import__(f"pillars.{module_name}", fromlist=["check"])
        except ImportError as e:
            print(
                f"[cultops-lineage] Pillar {pillar_num} module {module_name} "
                f"not yet implemented ({e}). Skipping.",
                file=sys.stderr,
            )
            continue
        except Exception as e:
            print(
                f"[cultops-lineage] Pillar {pillar_num} module {module_name} "
                f"failed to import: {e}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            continue

        check = getattr(mod, "check", None)
        if not callable(check):
            print(
                f"[cultops-lineage] Pillar {pillar_num} module {module_name} "
                f"has no callable `check(statements, contract)`. Skipping.",
                file=sys.stderr,
            )
            continue

        try:
            findings = check(statements, contract)
        except Exception as e:
            # Fail closed on pillar-check crashes: surface as a deny so the
            # operator has to look at it.
            print(
                f"[cultops-lineage] Pillar {pillar_num} check crashed: {e}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            result.findings.append(
                PillarFinding(
                    pillar=pillar_num,
                    severity="deny",
                    statement_preview="(pillar check crashed)",
                    message=(
                        f"Pillar {pillar_num} validator raised {type(e).__name__}. "
                        "Failing closed — refusing the write until the validator is "
                        "fixed or bypassed explicitly."
                    ),
                    remediation=(
                        "Inspect ~/.../lineage/pillars/"
                        f"{module_name}.py or re-run with "
                        f"{BYPASS_ENV_VAR}=1 for a one-shot bypass."
                    ),
                )
            )
            continue

        if findings:
            result.findings.extend(findings)

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    # Bypass: environment-level escape hatch. Loud stderr, still allowed.
    if os.environ.get(BYPASS_ENV_VAR) == "1":
        print(
            f"[cultops-lineage] {BYPASS_ENV_VAR}=1 — bypassing lineage validator. "
            "This should only be used for emergency Justin-driven carve-outs.",
            file=sys.stderr,
        )
        _allow(f"{BYPASS_ENV_VAR}=1 set — lineage validator bypassed.")

    event = _read_hook_input()
    tool_name = event.get("tool_name", "")

    # Short-circuit: not a tool we care about.
    if not _is_watched_tool(tool_name):
        _allow(f"tool `{tool_name}` is not a watched SQL write path.")

    sql, project_id = _extract_sql_and_project(event)

    # Short-circuit: not a project we care about.
    if project_id not in WATCHED_PROJECT_IDS:
        _allow(
            f"project_id `{project_id}` is not production/staging "
            "(cult-ops lineage validator only enforces on "
            f"{PRODUCTION_PROJECT_ID} and {STAGING_PROJECT_ID})."
        )

    # No SQL to check — allow. The MCP tool will reject empty queries itself.
    if not sql or not sql.strip():
        _allow("no SQL payload to validate.")

    # Load the contract. In strict mode this is fail-closed. In warn-only
    # mode (default) the failure is logged loudly to stderr and the call
    # is allowed — Justin still sees that the brain is unreachable.
    try:
        contract = load_contract()
    except ContextDBError as e:
        _deny_or_warn(
            "cult-ops lineage validator could not load the contract from the "
            f"context DB: {e}\n\n"
            "In strict mode the validator fails closed when the brain is "
            f"unreachable. Fix the connection or set {BYPASS_ENV_VAR}=1 to "
            "bypass this one call."
        )
    except Exception as e:
        _deny_or_warn(
            f"cult-ops lineage validator crashed during contract load: "
            f"{type(e).__name__}: {e}. Strict mode would fail closed."
        )

    # Parse the SQL. A parse failure is not itself a violation — the
    # underlying Postgres will surface syntax errors. Strict mode fails
    # closed if sqlparse gives us literally nothing back for a non-empty
    # blob; warn-only mode logs and allows.
    try:
        statements = parse_sql(sql)
    except Exception as e:
        _deny_or_warn(
            f"cult-ops lineage validator could not parse the SQL payload: "
            f"{type(e).__name__}: {e}. Strict mode would fail closed so the "
            "statement could be inspected manually."
        )

    if not statements:
        _allow("cult-ops lineage validator parsed no statements from the payload.")

    # Run pillar checks.
    result = _run_pillars(statements, contract)

    if not result.findings:
        _allow(
            f"cult-ops lineage validator: {len(statements)} statement(s) "
            f"checked, no violations. (contract updated {contract.contract_updated_at})"
        )

    reason = result.format_reason()

    # Warn-only mode (default): log every finding to stderr but allow the
    # SQL call through. Justin sees what would have been blocked without
    # actually being blocked.
    if not _is_strict_mode():
        print(
            f"[cultops-lineage] WARN-ONLY MODE: {len(result.findings)} "
            f"finding(s) on {len(statements)} statement(s). Set "
            f"{STRICT_ENV_VAR}=1 to enforce.\n{reason}",
            file=sys.stderr,
        )
        _allow(
            f"cult-ops lineage validator (warn-only): {len(result.findings)} "
            f"finding(s) logged. See stderr for details."
        )

    # Strict mode: original fail-closed behavior.
    decision = result.worst_decision()
    if decision == "deny":
        _deny(reason)
    elif decision == "ask":
        _ask(reason)
    else:
        _allow(
            f"cult-ops lineage validator: {len(statements)} statement(s) "
            f"checked, no violations. (contract updated {contract.contract_updated_at})"
        )


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        # Last-resort safety net. In strict mode, exit 2 forces a hard
        # block via stderr so Justin sees the crash. In warn-only mode
        # (default) we still print loudly but allow the call through —
        # the hook should never lock the operator out of their own DB.
        print(
            f"[cultops-lineage] validator crashed: {type(e).__name__}: {e}",
            file=sys.stderr,
        )
        traceback.print_exc(file=sys.stderr)
        if os.environ.get(STRICT_ENV_VAR) == "1":
            print(
                "cult-ops lineage validator crashed. Failing closed in strict mode. "
                f"Set {BYPASS_ENV_VAR}=1 to bypass, or fix the validator.",
                file=sys.stderr,
            )
            sys.exit(2)
        print(
            "cult-ops lineage validator crashed. WARN-ONLY MODE — allowing the "
            "call through. The validator needs to be fixed, but you are not "
            f"locked out. Set {STRICT_ENV_VAR}=1 to fail closed on crashes.",
            file=sys.stderr,
        )
        # Emit an allow decision so the SDK doesn't fall back to ask.
        try:
            payload = {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": (
                        "validator crashed in warn-only mode — see stderr."
                    ),
                }
            }
            sys.stdout.write(json.dumps(payload))
            sys.stdout.flush()
        except Exception:
            pass
        sys.exit(0)
