# CultOps — Antigravity Agent Rules

> These rules govern ALL agent behavior in this project. Read fully before any action.

## MANDATORY FIRST STEP: Initialize AI Context

Before starting ANY task — code changes, database work, investigation, or planning — you MUST run the initialization script to load the context database:

```bash
npm run ai:init
```

This atomic command will automatically fetch the current `cultops_build_state_current`, the latest `lessons_learned`, and the top active tasks from `v_cowork_queue_active`. **Do not assume you know the current project state. Read the output of this script before making any plan.**

## Critical Rules (Non-Negotiable)

1. **NEVER auto-fix anything.** Diagnose, propose, get approval from Justin, then execute.
2. **Production DB = `fonreynkfeqywshijqpi`.** Always verify before any migration.
3. **Apply migrations to BOTH production AND staging** (`cbxwippkzeszvxewhebd`) unless told otherwise.
4. **Read `get_edge_function` before touching any edge function.** Never assume deployed state.
5. **Version all three edge function files** (index.ts, lib.ts, handlers.ts) to the same number on every deploy.
6. **After any significant deploy**, write a canonical state entry to context DB.
7. **Batch rename touches 5 places**: batch_registry + inventory_items.batch_number + inventory_items.batch + bulk_inventory + inventory_internal_labels.label_data JSONB.
8. **trg_prevent_batch_id_update** must be disabled before batch_id changes, re-enabled after.
9. **All qty changes via inventory_movements** — never direct UPDATE on qty columns.
10. **RELEASE movements use dest_item_id** (not source_item_id).
11. **Never suggest `rm .git/index.lock`** without providing the full repo path: `/Users/justinmorrow/Desktop/Claude/cult-ops`

## Supabase Project Map

| Purpose | Project ID | Notes |
|---------|-----------|-------|
| **Production** | `fonreynkfeqywshijqpi` | Live data. All user-facing queries. |
| **Context DB** | `uayyhluztelnfxfvdhyt` | Business context, lessons, personas, cowork queue. The brain. |
| **Staging** | `cbxwippkzeszvxewhebd` | Mirrors prod schema. Apply migrations here too. |
| **CULT LOS** | `blcvkropuiadheukhniu` | EOS/L10 system. Separate project. |

## Stack

- React 18 / TypeScript / Vite / Tailwind CSS
- Supabase JS v2 (client + edge functions)
- Vercel deployment (main = production)
- GitHub: `jedwardmorrow-blip/cult-ops`

## Who You're Working With

Justin Morrow — CEO, sole builder. Investigative background. Prefers direct analysis, honest pushback, no fluff. If you're unsure, ask. If something looks wrong, say so. Don't validate — inform.

## Context DB as Memory

The context database (`uayyhluztelnfxfvdhyt`) is the persistent memory across all tools and sessions. Use it:

### Before Starting Work
Run `npm run ai:init` to load the primary state. If you need hyper-specific archived documentation for a module, you can manually query:
```sql
-- Get relevant context for what you're about to touch
SELECT key, value FROM business_context
WHERE category IN ('architecture', 'development_workflow')
AND key ILIKE '%[relevant_keyword]%'
ORDER BY updated_at DESC LIMIT 5;
```

### After Completing Work (DRAFT SYSTEM)
Never UPDATE canonical states directly. Log a draft:
```sql
-- Log what you accomplished as a pending draft
INSERT INTO proposed_context_updates (summary, files_touched, next_steps, agent_id)
VALUES ('[what_changed_and_why]', '{[files_touched]}', '[next_steps_if_any]', 'antigravity');
```

### When You Learn Something New
```sql
-- Log lessons so future sessions don't repeat mistakes
INSERT INTO lessons_learned (category, lesson, prevention, severity, applies_to, incident_date)
VALUES ('[category]', '[what_happened]', '[how_to_prevent]', '[critical/high/medium]', '{[module]}', '[date]');
```

## Known Data Issues (Do Not Re-Diagnose)

Query these from context DB if needed, but the essentials:
- `thc_percentage`: 0% populated — COA gate disabled
- Status casing: mix of available/Available — always use `LOWER(status)` in queries
- `inventory_items` has TWO batch columns: `batch` AND `batch_number` — both need updating on rename
- Batch codes encode PLANT dates not harvest dates. `harvest_date` is in `batch_registry`
- `grade_code`: ~96% of inventory shows UNDEFINED
- Always use `LOWER(status)` in inventory queries

## Edge Function Protocol

Before modifying any edge function:
1. Call `get_edge_function` via Supabase MCP to read current deployed state
2. Compare against canonical state in build state document
3. Propose changes, get approval
4. Deploy via Supabase MCP `deploy_edge_function` (NOT via git push)
5. Version bump all three files
6. Write canonical state to context DB after deploy

## Session End Protocol

Before ending any session where you made changes, you must submit a draft update for Justin to review:

```sql
-- Insert an append-only draft instead of an UPDATE
INSERT INTO proposed_context_updates (summary, files_touched, next_steps, agent_id)
VALUES ('[summary_of_session_changes]', '{[Array_of_files]}', '[any_unresolved_tasks]', 'antigravity');
```

Ask Justin: "Please review the drafted context updates in your queue. Are there any other architecture changes from this session that should be logged as lessons learned?"
