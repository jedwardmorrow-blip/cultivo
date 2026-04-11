"""
sqlparse wrapper tuned for the patterns the lineage validator needs to
recognize. sqlparse is a tokenizer, not a real AST parser — so this module
is deliberately narrow and defensive: it classifies statements and extracts
enough structure for pillar checks, but anything it can't confidently
classify it exposes via `.raw_text` so the calling pillar can refuse by
default.

Design principle: if the parser is uncertain, surface that uncertainty
to the pillar logic. Never silently assume "probably fine."
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterator, Optional

import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import DDL, DML, Keyword


StatementKind = str
# Possible values: 'create_table' | 'alter_table' | 'update' | 'insert'
# | 'delete' | 'create_function' | 'create_trigger' | 'create_policy'
# | 'create_view' | 'create_index' | 'enable_rls' | 'other'


@dataclass
class ParsedStatement:
    """A single SQL statement with enough structure for pillar checks."""

    raw_text: str
    normalized: str  # whitespace-collapsed, lowercased — for regex matching
    kind: StatementKind
    target_table: Optional[str] = None  # fully-qualified if parseable
    target_schema: Optional[str] = None

    # CREATE TABLE-specific
    column_defs: list[str] = field(default_factory=list)  # raw column def fragments
    foreign_keys: list[dict] = field(default_factory=list)  # {column, ref_table, ref_column}
    has_exclude_using_gist: bool = False
    has_period_columns: bool = False  # has both a *_start and *_end timestamp column

    # ALTER TABLE-specific
    alter_actions: list[str] = field(default_factory=list)  # e.g. "ADD COLUMN foo"

    # UPDATE-specific
    updated_columns: list[str] = field(default_factory=list)

    # Comment annotations (for bypass mechanisms)
    annotations: dict[str, str] = field(default_factory=dict)
    # e.g. {"cultops:allow-retroactive": "audit_reconciliation"}


def parse_sql(sql_text: str) -> list[ParsedStatement]:
    """Split a SQL blob into individual classified statements."""
    statements: list[ParsedStatement] = []
    for raw_stmt in sqlparse.parse(sql_text):
        text = str(raw_stmt).strip()
        if not text:
            continue
        statements.append(_classify_statement(raw_stmt, text))
    return statements


def _classify_statement(stmt: Statement, text: str) -> ParsedStatement:
    normalized = _normalize(text)
    annotations = _extract_annotations(text)

    # Fast-path keyword detection via the normalized text — sqlparse's token
    # stream misidentifies plenty of edge cases, so we cross-check with regex.
    kind: StatementKind = "other"
    target_schema: Optional[str] = None
    target_table: Optional[str] = None

    if re.match(r"create\s+table\s+(?:if\s+not\s+exists\s+)?", normalized):
        kind = "create_table"
        target_schema, target_table = _extract_qualified_name(
            text, r"create\s+table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)"
        )
    elif re.match(r"alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?", normalized):
        target_schema, target_table = _extract_qualified_name(
            text, r"alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?([^\s]+)"
        )
        if re.search(r"enable\s+row\s+level\s+security", normalized):
            kind = "enable_rls"
        else:
            kind = "alter_table"
    elif re.match(r"update\s+(?:only\s+)?", normalized):
        kind = "update"
        target_schema, target_table = _extract_qualified_name(
            text, r"update\s+(?:only\s+)?([^\s]+)"
        )
    elif re.match(r"insert\s+into\s+", normalized):
        kind = "insert"
        target_schema, target_table = _extract_qualified_name(
            text, r"insert\s+into\s+([^\s(]+)"
        )
    elif re.match(r"delete\s+from\s+", normalized):
        kind = "delete"
        target_schema, target_table = _extract_qualified_name(
            text, r"delete\s+from\s+([^\s]+)"
        )
    elif re.match(r"create\s+(?:or\s+replace\s+)?function\s+", normalized):
        kind = "create_function"
    elif re.match(r"create\s+(?:or\s+replace\s+)?trigger\s+", normalized):
        kind = "create_trigger"
    elif re.match(r"create\s+policy\s+", normalized):
        kind = "create_policy"
    elif re.match(r"create\s+(?:or\s+replace\s+)?view\s+", normalized):
        kind = "create_view"
    elif re.match(r"create\s+(?:unique\s+)?index\s+", normalized):
        kind = "create_index"

    parsed = ParsedStatement(
        raw_text=text,
        normalized=normalized,
        kind=kind,
        target_table=target_table,
        target_schema=target_schema,
        annotations=annotations,
    )

    if kind == "create_table":
        _enrich_create_table(parsed)
    elif kind == "alter_table":
        _enrich_alter_table(parsed)
    elif kind == "update":
        _enrich_update(parsed)

    return parsed


def _normalize(text: str) -> str:
    """Collapse whitespace and lowercase for regex matching.

    Leaves string literals and identifiers alone in terms of casing loss —
    we use this only for pattern-recognition, never for semantic comparison.
    """
    # Strip SQL comments first so they don't pollute the normalized text
    without_line_comments = re.sub(r"--[^\n]*", " ", text)
    without_block_comments = re.sub(
        r"/\*.*?\*/", " ", without_line_comments, flags=re.DOTALL
    )
    return re.sub(r"\s+", " ", without_block_comments).strip().lower()


def _extract_qualified_name(
    text: str, pattern: str
) -> tuple[Optional[str], Optional[str]]:
    """Pull schema.table or table out of a statement head."""
    m = re.search(pattern, text, flags=re.IGNORECASE)
    if not m:
        return (None, None)
    ident = m.group(1).strip().strip('"').rstrip(";")
    # Strip trailing parentheses/other punctuation
    ident = re.sub(r"[(),;].*$", "", ident).strip().strip('"')
    if "." in ident:
        parts = ident.split(".", 1)
        return (parts[0].strip('"'), parts[1].strip('"'))
    return (None, ident)


def _extract_annotations(text: str) -> dict[str, str]:
    """
    Parse SQL comments for bypass annotations like
    -- cultops:allow-retroactive audit_reconciliation
    -- cultops:orphan-ack task_b47f8848
    """
    out: dict[str, str] = {}
    for line in text.splitlines():
        m = re.match(r"\s*--\s*(cultops:[a-z_\-]+)\s+([a-zA-Z0-9_]+)", line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def _enrich_create_table(parsed: ParsedStatement) -> None:
    """Extract column defs, FKs, EXCLUDE constraints, period-column signature."""
    text = parsed.raw_text

    # Find the outer parenthetical body of the CREATE TABLE statement.
    # sqlparse's tokenizer struggles with nested parens, so we do a
    # paren-counting walk.
    body = _extract_paren_body(text)
    if body is None:
        return

    # Split on commas at paren-depth 0 to get column/constraint definitions
    column_defs = _split_top_level(body)
    parsed.column_defs = column_defs

    # FKs
    for defn in column_defs:
        fk = _parse_fk(defn)
        if fk:
            parsed.foreign_keys.append(fk)

    # EXCLUDE USING GIST
    for defn in column_defs:
        if re.search(r"exclude\s+using\s+gist", defn, flags=re.IGNORECASE):
            parsed.has_exclude_using_gist = True
            break

    # Period column signature: a pair of <name>_start and <name>_end
    # timestamps on the same table suggests a temporal range.
    col_names = [_parse_column_name(d) for d in column_defs]
    col_names = [n for n in col_names if n]
    start_cols = {
        n[:-6] for n in col_names if n.endswith("_start")
    }  # strip "_start"
    end_cols = {n[:-4] for n in col_names if n.endswith("_end")}  # strip "_end"
    parsed.has_period_columns = bool(start_cols & end_cols)


def _enrich_alter_table(parsed: ParsedStatement) -> None:
    """Parse each ADD COLUMN / ALTER COLUMN / ADD CONSTRAINT action."""
    text = parsed.raw_text
    # Strip the "ALTER TABLE x" header
    m = re.match(
        r"alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?[^\s]+\s+(.*)",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return
    body = m.group(1).rstrip(";").strip()
    parsed.alter_actions = _split_top_level(body)


def _enrich_update(parsed: ParsedStatement) -> None:
    """Pull column names out of the SET clause."""
    m = re.search(
        r"set\s+(.*?)(?:\s+where\s+|\s+returning\s+|;|\Z)",
        parsed.raw_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return
    set_body = m.group(1)
    assignments = _split_top_level(set_body)
    for a in assignments:
        col_m = re.match(r"\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=", a)
        if col_m:
            parsed.updated_columns.append(col_m.group(1).lower())


def _extract_paren_body(text: str) -> Optional[str]:
    """Find the outermost (...) group in a CREATE TABLE statement."""
    start = text.find("(")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        c = text[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return text[start + 1 : i]
    return None


def _split_top_level(body: str) -> list[str]:
    """Split on commas that are at paren depth 0."""
    out: list[str] = []
    depth = 0
    current = []
    in_string = False
    string_ch = ""
    for c in body:
        if in_string:
            current.append(c)
            if c == string_ch:
                in_string = False
            continue
        if c in ("'", '"'):
            in_string = True
            string_ch = c
            current.append(c)
            continue
        if c == "(":
            depth += 1
            current.append(c)
        elif c == ")":
            depth -= 1
            current.append(c)
        elif c == "," and depth == 0:
            out.append("".join(current).strip())
            current = []
        else:
            current.append(c)
    if current:
        tail = "".join(current).strip()
        if tail:
            out.append(tail)
    return out


def _parse_fk(defn: str) -> Optional[dict]:
    """
    Recognize both forms:
      CONSTRAINT name FOREIGN KEY (col) REFERENCES other_table(other_col)
      col_name type REFERENCES other_table(other_col)
    """
    m = re.search(
        r"foreign\s+key\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*"
        r"references\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)"
        r"(?:\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\))?",
        defn,
        flags=re.IGNORECASE,
    )
    if m:
        return {
            "column": m.group(1).lower(),
            "ref_table": m.group(2).split(".")[-1].lower(),
            "ref_column": (m.group(3) or "id").lower(),
        }
    # Inline form: "col_id uuid NOT NULL REFERENCES other_table"
    m = re.search(
        r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+[^,]*?references\s+"
        r"([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)"
        r"(?:\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\))?",
        defn,
        flags=re.IGNORECASE,
    )
    if m:
        return {
            "column": m.group(1).lower(),
            "ref_table": m.group(2).split(".")[-1].lower(),
            "ref_column": (m.group(3) or "id").lower(),
        }
    return None


def _parse_column_name(defn: str) -> Optional[str]:
    """Return the lowercased column name from a column definition, or None if
    this is actually a constraint definition."""
    stripped = defn.strip()
    # Skip pure constraint lines
    if re.match(
        r"^(constraint|primary\s+key|unique|check|foreign\s+key|exclude|like)\s",
        stripped,
        flags=re.IGNORECASE,
    ):
        return None
    m = re.match(r'^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s', stripped)
    if m:
        return m.group(1).lower()
    return None


def has_generated_always(column_def: str) -> bool:
    """Return True if a column def contains GENERATED ALWAYS AS (...) STORED/VIRTUAL."""
    return bool(
        re.search(
            r"generated\s+always\s+as\s*\(",
            column_def,
            flags=re.IGNORECASE,
        )
    )


if __name__ == "__main__":
    # Smoke test
    sample = """
    -- cultops:allow-retroactive audit_reconciliation
    CREATE TABLE cultivation.test_table (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
        variance_g numeric GENERATED ALWAYS AS (counted_g - expected_g) STORED,
        period_start timestamptz NOT NULL,
        period_end timestamptz NOT NULL,
        EXCLUDE USING GIST (
            plant_group_id WITH =,
            tstzrange(period_start, period_end) WITH &&
        )
    );
    ALTER TABLE cultivation.test_table ENABLE ROW LEVEL SECURITY;
    UPDATE batch_lifecycle_events SET to_state = 'packaged' WHERE id = '...';
    """
    for s in parse_sql(sample):
        print(f"[{s.kind}] {s.target_schema}.{s.target_table}")
        if s.kind == "create_table":
            print(f"  FKs: {s.foreign_keys}")
            print(f"  EXCLUDE GIST: {s.has_exclude_using_gist}")
            print(f"  period_columns: {s.has_period_columns}")
            print(f"  columns: {len(s.column_defs)}")
        if s.kind == "update":
            print(f"  updated columns: {s.updated_columns}")
        if s.annotations:
            print(f"  annotations: {s.annotations}")
