#!/usr/bin/env node

/**
 * CULT Seed-to-Sale -- Full Schema DDL Extraction
 *
 * Connects to source Supabase via @supabase/supabase-js and uses exec_sql RPC
 * to run pg_catalog queries. Extracts all schema objects to separate SQL files.
 *
 * Usage: node go-live-extract/extract-schema-ddl.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = __dirname;

function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

function quoteIdent(name) {
  if (/^[a-z_][a-z0-9_]*$/.test(name)) return name;
  return '"' + name.replace(/"/g, '""') + '"';
}

async function execSql(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) throw new Error(`exec_sql failed: ${error.message}\nQuery: ${query.slice(0, 200)}`);
  return data;
}

async function execSqlRaw(query) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'text/plain',
    },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`exec_sql failed (${resp.status}): ${body}\nQuery: ${query.slice(0, 200)}`);
  }
  return resp.text();
}

function header(title, count) {
  return [
    '-- ============================================================',
    `-- ${title}`,
    `-- Source: ${SUPABASE_URL}`,
    `-- Extracted: ${new Date().toISOString().slice(0, 10)}`,
    count !== undefined ? `-- Count: ${count}` : null,
    '-- ============================================================',
    '',
  ].filter(Boolean).join('\n');
}

async function extractBatched(type, countQuery, batchQuery, batchSize = 20) {
  const countResult = await execSql(countQuery);
  let total = 0;
  if (Array.isArray(countResult) && countResult.length > 0) {
    total = parseInt(countResult[0].total, 10);
  } else if (typeof countResult === 'string') {
    try {
      const parsed = JSON.parse(countResult);
      if (Array.isArray(parsed)) total = parseInt(parsed[0].total, 10);
    } catch { total = parseInt(countResult, 10) || 0; }
  }

  console.log(`  Count: ${total}`);
  if (total === 0) return { total: 0, sql: '' };

  const parts = [];
  let offset = 0;
  let batchNum = 0;
  while (offset < total) {
    batchNum++;
    const q = batchQuery(batchSize, offset);
    process.stdout.write(`  Batch ${batchNum} (offset ${offset})...`);
    const result = await execSql(q);

    let sqlOutput = '';
    if (Array.isArray(result) && result.length > 0) {
      sqlOutput = result[0].sql_output || '';
    } else if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed)) sqlOutput = parsed[0]?.sql_output || '';
        else sqlOutput = result;
      } catch { sqlOutput = result; }
    }

    if (sqlOutput) {
      parts.push(sqlOutput);
      console.log(` OK (${sqlOutput.length} chars)`);
    } else {
      console.log(' (empty)');
    }
    offset += batchSize;
  }

  return { total, sql: parts.join('\n\n') };
}

// ── 1. ENUMS ──────────────────────────────────────────────────────────
async function extractEnums() {
  console.log('\n[1/10] Extracting custom ENUM types...');
  const q = `
    SELECT
      t.typname as enum_name,
      string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `;
  const result = await execSql(q);
  let rows = [];
  if (Array.isArray(result)) rows = result;
  const lines = rows.map(r =>
    `CREATE TYPE ${r.enum_name} AS ENUM (\n  ${r.enum_values.split(', ').join(',\n  ')}\n);`
  );
  const sql = lines.join('\n\n');
  console.log(`  Found ${rows.length} enum types`);
  return { sql, count: rows.length };
}

// ── 2. TABLES ─────────────────────────────────────────────────────────
async function extractTables() {
  console.log('\n[2/10] Extracting table DDL...');

  const tablesQ = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const tables = await execSql(tablesQ);
  let tableList = [];
  if (Array.isArray(tables)) {
    tableList = tables.map(r => r.table_name);
  } else if (typeof tables === 'string') {
    try { tableList = JSON.parse(tables).map(r => r.table_name); } catch {}
  }

  console.log(`  Found ${tableList.length} tables`);
  const ddlParts = [];

  for (let i = 0; i < tableList.length; i += 5) {
    const batch = tableList.slice(i, i + 5);
    process.stdout.write(`  Tables ${i + 1}-${Math.min(i + 5, tableList.length)}...`);

    const subQueries = batch.map(t => `
      SELECT '-- Table: ${t}' || E'\\n' ||
        'CREATE TABLE IF NOT EXISTS ${t} (' || E'\\n' ||
        string_agg(
          '  ' || column_name || ' ' ||
          CASE
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name
            WHEN character_maximum_length IS NOT NULL THEN data_type || '(' || character_maximum_length || ')'
            ELSE data_type
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          E',\\n'
          ORDER BY ordinal_position
        ) || E'\\n);' as sql_output
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      GROUP BY table_name
    `).join('\nUNION ALL\n');

    const result = await execSql(subQueries);
    let sqls = [];
    if (Array.isArray(result)) {
      sqls = result.map(r => r.sql_output).filter(Boolean);
    } else if (typeof result === 'string') {
      try { sqls = JSON.parse(result).map(r => r.sql_output).filter(Boolean); } catch {}
    }
    ddlParts.push(...sqls);
    console.log(` OK`);
  }

  return { sql: ddlParts.join('\n\n'), count: tableList.length };
}

// ── 3. INDEXES ────────────────────────────────────────────────────────
async function extractIndexes() {
  console.log('\n[3/10] Extracting indexes...');
  return extractBatched(
    'indexes',
    `SELECT count(*)::int as total FROM pg_indexes WHERE schemaname = 'public'`,
    (limit, offset) => `
      SELECT string_agg(indexdef || ';', E'\\n\\n') as sql_output
      FROM (
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
        LIMIT ${limit} OFFSET ${offset}
      ) sub
    `,
    30
  );
}

// ── 4. FOREIGN KEYS ──────────────────────────────────────────────────
async function extractForeignKeys() {
  console.log('\n[4/10] Extracting foreign key constraints...');
  const q = `
    SELECT string_agg(
      '-- FK: ' || tc.constraint_name || E'\\n' ||
      'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name ||
      ' FOREIGN KEY (' || kcu.column_name || ') REFERENCES ' ||
      ccu.table_name || '(' || ccu.column_name || ')' ||
      CASE WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule ELSE '' END ||
      CASE WHEN rc.update_rule != 'NO ACTION' THEN ' ON UPDATE ' || rc.update_rule ELSE '' END ||
      ';',
      E'\\n\\n'
    ) as sql_output
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
  `;
  const result = await execSql(q);
  let sql = '';
  if (Array.isArray(result) && result.length > 0) {
    sql = result[0].sql_output || '';
  } else if (typeof result === 'string') {
    try { sql = JSON.parse(result)[0]?.sql_output || ''; } catch { sql = result; }
  }
  const count = (sql.match(/ALTER TABLE/g) || []).length;
  console.log(`  Found ${count} foreign keys`);
  return { sql, total: count };
}

// ── 5. VIEWS ──────────────────────────────────────────────────────────
async function extractViews() {
  console.log('\n[5/10] Extracting views...');
  return extractBatched(
    'views',
    `SELECT count(*)::int as total FROM pg_views WHERE schemaname = 'public'`,
    (limit, offset) => `
      SELECT string_agg(
        '-- View: ' || viewname || E'\\nCREATE OR REPLACE VIEW ' || viewname || ' AS\\n' || definition,
        E'\\n\\n'
      ) as sql_output
      FROM (
        SELECT viewname, definition FROM pg_views
        WHERE schemaname = 'public'
        ORDER BY viewname
        LIMIT ${limit} OFFSET ${offset}
      ) v
    `,
    15
  );
}

// ── 6. FUNCTIONS ──────────────────────────────────────────────────────
async function extractFunctions() {
  console.log('\n[6/10] Extracting functions...');
  return extractBatched(
    'functions',
    `SELECT count(*)::int as total FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'`,
    (limit, offset) => `
      SELECT string_agg(
        '-- Function: ' || p.proname || E'\\n' || pg_get_functiondef(p.oid) || ';',
        E'\\n\\n'
      ) as sql_output
      FROM (
        SELECT p.proname, p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
        LIMIT ${limit} OFFSET ${offset}
      ) p
    `,
    10
  );
}

// ── 7. TRIGGERS ───────────────────────────────────────────────────────
async function extractTriggers() {
  console.log('\n[7/10] Extracting triggers...');
  return extractBatched(
    'triggers',
    `SELECT count(*)::int as total FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND NOT t.tgisinternal`,
    (limit, offset) => `
      SELECT string_agg(
        '-- Trigger: ' || t.tgname || ' ON ' || c.relname || E'\\n' || pg_get_triggerdef(t.oid, true) || ';',
        E'\\n\\n'
      ) as sql_output
      FROM (
        SELECT t.oid, t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
        ORDER BY t.tgname
        LIMIT ${limit} OFFSET ${offset}
      ) sub
      JOIN pg_trigger t ON t.oid = sub.oid
      JOIN pg_class c ON t.tgrelid = c.oid
    `,
    20
  );
}

// ── 8. RLS POLICIES ──────────────────────────────────────────────────
async function extractPolicies() {
  console.log('\n[8/10] Extracting RLS policies...');
  return extractBatched(
    'policies',
    `SELECT count(*)::int as total FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public'`,
    (limit, offset) => `
      SELECT string_agg(
        '-- Policy: ' || pol.polname || ' ON ' || c.relname || E'\\n' ||
        'CREATE POLICY ' || quote_ident(pol.polname) || E'\\n  ON ' || c.relname ||
        E'\\n  AS ' || CASE pol.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END ||
        E'\\n  FOR ' || CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END ||
        E'\\n  TO ' || COALESCE(
          (SELECT string_agg(r.rolname, ', ') FROM unnest(pol.polroles) AS role_oid JOIN pg_roles r ON r.oid = role_oid),
          'public'
        ) ||
        CASE WHEN pol.polqual IS NOT NULL THEN E'\\n  USING (' || pg_get_expr(pol.polqual, pol.polrelid) || ')' ELSE '' END ||
        CASE WHEN pol.polwithcheck IS NOT NULL THEN E'\\n  WITH CHECK (' || pg_get_expr(pol.polwithcheck, pol.polrelid) || ')' ELSE '' END ||
        ';',
        E'\\n\\n'
      ) as sql_output
      FROM (
        SELECT pol.oid
        FROM pg_policy pol
        JOIN pg_class c ON pol.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY c.relname, pol.polname
        LIMIT ${limit} OFFSET ${offset}
      ) sub
      JOIN pg_policy pol ON pol.oid = sub.oid
      JOIN pg_class c ON pol.polrelid = c.oid
    `,
    20
  );
}

// ── 9. EXTENSIONS ─────────────────────────────────────────────────────
async function extractExtensions() {
  console.log('\n[9/10] Extracting extensions...');
  const q = `
    SELECT extname, nspname, extversion
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    ORDER BY extname
  `;
  const result = await execSql(q);
  let rows = [];
  if (Array.isArray(result)) rows = result;
  const lines = rows.map(r =>
    `CREATE EXTENSION IF NOT EXISTS ${quoteIdent(r.extname)} WITH SCHEMA ${quoteIdent(r.nspname)} VERSION '${r.extversion}';`
  );
  const sql = lines.join('\n');
  console.log(`  Found ${rows.length} extensions`);
  return { sql, total: rows.length };
}

// ── 10. SEQUENCES ─────────────────────────────────────────────────────
async function extractSequences() {
  console.log('\n[10/10] Extracting sequences...');
  const q = `
    SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment, cycle_option
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name;
  `;
  const result = await execSql(q);
  let seqs = [];
  if (Array.isArray(result)) {
    seqs = result;
  } else if (typeof result === 'string') {
    try { seqs = JSON.parse(result); } catch {}
  }

  if (seqs.length === 0) {
    console.log('  No public sequences found (schema uses UUIDs)');
    return { sql: '-- No public sequences (schema uses UUID primary keys via gen_random_uuid())', total: 0 };
  }

  const lines = seqs.map(s =>
    `CREATE SEQUENCE IF NOT EXISTS ${s.sequence_name} AS ${s.data_type} ` +
    `INCREMENT BY ${s.increment} MINVALUE ${s.minimum_value} MAXVALUE ${s.maximum_value} ` +
    `${s.cycle_option === 'YES' ? 'CYCLE' : 'NO CYCLE'};`
  );
  console.log(`  Found ${seqs.length} sequences`);
  return { sql: lines.join('\n\n'), total: seqs.length };
}

// ── MAIN ──────────────────────────────────────────────────────────────
async function main() {
  console.log('=================================================================');
  console.log('  CULT Seed-to-Sale -- Schema DDL Extraction');
  console.log('=================================================================');
  console.log(`  Source: ${SUPABASE_URL}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log('=================================================================');

  console.log('\n[0] Testing exec_sql RPC...');
  try {
    const test = await execSql("SELECT 1 as ok");
    console.log('  Connection OK');
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    console.error('  The exec_sql RPC function must exist on the source database.');
    console.error('  Create it with: CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json ...');
    process.exit(1);
  }

  const results = {};

  // 1. Enums
  const enums = await extractEnums();
  writeFileSync(resolve(OUTPUT_DIR, '001-enums.sql'), header('Custom ENUM Types', enums.count) + '\n' + enums.sql + '\n');
  results.enums = enums.count;

  // 2. Tables
  const tables = await extractTables();
  writeFileSync(resolve(OUTPUT_DIR, '002-tables.sql'), header('Table DDL', tables.count) + '\n' + tables.sql + '\n');
  results.tables = tables.count;

  // 3. Indexes
  const indexes = await extractIndexes();
  writeFileSync(resolve(OUTPUT_DIR, '003-indexes.sql'), header('Indexes', indexes.total) + '\n' + indexes.sql + '\n');
  results.indexes = indexes.total;

  // 4. Foreign keys
  const fks = await extractForeignKeys();
  writeFileSync(resolve(OUTPUT_DIR, '004-foreign-keys.sql'), header('Foreign Key Constraints', fks.total) + '\n' + fks.sql + '\n');
  results.foreign_keys = fks.total;

  // 5. Views
  const views = await extractViews();
  writeFileSync(resolve(OUTPUT_DIR, '005-views.sql'), header('Views', views.total) + '\n' + views.sql + '\n');
  results.views = views.total;

  // 6. Functions
  const functions = await extractFunctions();
  writeFileSync(resolve(OUTPUT_DIR, '006-functions.sql'), header('Functions', functions.total) + '\n' + functions.sql + '\n');
  results.functions = functions.total;

  // 7. Triggers
  const triggers = await extractTriggers();
  writeFileSync(resolve(OUTPUT_DIR, '007-triggers.sql'), header('Triggers', triggers.total) + '\n' + triggers.sql + '\n');
  results.triggers = triggers.total;

  // 8. RLS Policies
  const policies = await extractPolicies();
  writeFileSync(resolve(OUTPUT_DIR, '008-rls-policies.sql'), header('RLS Policies', policies.total) + '\n' + policies.sql + '\n');
  results.policies = policies.total;

  // 9. Extensions
  const extensions = await extractExtensions();
  writeFileSync(resolve(OUTPUT_DIR, '009-extensions.sql'), header('Extensions', extensions.total) + '\n' + extensions.sql + '\n');
  results.extensions = extensions.total;

  // 10. Sequences
  const sequences = await extractSequences();
  writeFileSync(resolve(OUTPUT_DIR, '010-sequences.sql'), header('Sequences', sequences.total) + '\n' + sequences.sql + '\n');
  results.sequences = sequences.total;

  // Summary
  console.log('\n=================================================================');
  console.log('  EXTRACTION COMPLETE');
  console.log('=================================================================');
  console.log('');
  console.log('  File                        Objects');
  console.log('  ─────────────────────────── ───────');
  const files = [
    ['001-enums.sql', 'enums'],
    ['002-tables.sql', 'tables'],
    ['003-indexes.sql', 'indexes'],
    ['004-foreign-keys.sql', 'foreign_keys'],
    ['005-views.sql', 'views'],
    ['006-functions.sql', 'functions'],
    ['007-triggers.sql', 'triggers'],
    ['008-rls-policies.sql', 'policies'],
    ['009-extensions.sql', 'extensions'],
    ['010-sequences.sql', 'sequences'],
  ];
  for (const [file, key] of files) {
    console.log(`  ${file.padEnd(28)} ${results[key]}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
