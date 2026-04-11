"""
cult-ops lineage contract pillar checks.

Each module exports a single callable:

    def check(
        statements: list[ParsedStatement],
        contract: LineageContract,
    ) -> list[PillarFinding]:
        ...

`check` must be pure w.r.t. its inputs — no network, no disk, no mutation of
`contract`. It is called once per hook invocation. Findings returned from
multiple pillars are aggregated by validate_sql.py and reduced to a single
allow/ask/deny decision.

v1 scope:
  - Pillar 1: reachability (FK to root on new tables)
  - Pillar 3: fact immutability on append-only tables
  - Pillar 4: GENERATED ALWAYS for variance/mass-balance columns
  - Pillar 5: EXCLUDE USING GIST for temporal-range tables
  - Pillar 8: RLS enabled on new tables

Punted to v2 (require runtime context the parser can't cheaply give us):
  - Pillar 2: approved write path resolution
  - Pillar 6: view-join analysis for canonical read surfaces
  - Pillar 7: every write path wrapped in a named RPC
"""
