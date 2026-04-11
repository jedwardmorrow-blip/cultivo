"""
Shared finding dataclass for lineage pillar checks.

Extracted into its own module so each pillar can import it without creating
an import cycle with validate_sql.py.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class PillarFinding:
    """A single verdict from a pillar check.

    severity semantics:
      - "deny": hard block. The proposed SQL will be refused unless the
        operator sets CULTOPS_LINEAGE_BYPASS=1 or annotates the statement
        with an approved reason code.
      - "ask":  soft confirmation. Claude Code surfaces the reason and waits
        for Justin to approve. Use this for ambiguous cases where the
        statement *might* be legitimate but we can't tell from sqlparse alone.
      - "warn": informational. Does not change the decision, but is included
        in the reason text so the operator sees it. Reserved for pillars
        where the prerequisite infrastructure isn't installed yet (e.g.
        Pillar 5 before btree_gist lands).
    """

    pillar: int  # 1..8
    severity: str  # "deny" | "ask" | "warn"
    statement_preview: str  # first ~120 chars of the offending statement
    message: str  # human-readable explanation
    remediation: Optional[str] = None  # optional suggested fix


def preview(text: str, limit: int = 120) -> str:
    """Return the first N characters of a SQL statement, collapsed to one line."""
    collapsed = " ".join(text.split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 3] + "..."
