#!/usr/bin/env node

/**
 * CULT Seed-to-Sale -- Go-Live Data Extraction Script
 *
 * Connects to the source Supabase instance via the REST RPC endpoint
 * export_table_inserts() and extracts production data as INSERT SQL.
 *
 * Prerequisites:
 *   - The RPC function export_table_inserts() must be deployed on the source DB
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be in .env
 *
 * Output: go-live-extract/output/
 *   - 03_auth_users.sql
 *   - 03.5_disable_triggers.sql
 *   - 04_production_data_all.sql  (combined, with trigger disable/enable wrapper)
 *   - 04.5_enable_triggers.sql
 *   - 06_relink_strains.sql
 *   - 08_verification.sql
 *   - tier{N}_{table}.sql  (one per table)
 *
 * Usage:
 *   node go-live-extract/extract-schema.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(__dirname, 'output');

// ---------------------------------------------------------------------------
// ENV
// ---------------------------------------------------------------------------
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

if (!SUPABASE_URL) { console.error('ERROR: VITE_SUPABASE_URL not in .env'); process.exit(1); }
if (!ANON_KEY) { console.error('ERROR: VITE_SUPABASE_ANON_KEY not in .env'); process.exit(1); }

// ---------------------------------------------------------------------------
// RPC helpers
// ---------------------------------------------------------------------------
const PAGE_SIZE = 500;

async function rpcExportInserts(tableName, orderBy = 'id', limit = PAGE_SIZE, offset = 0) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/export_table_inserts`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      p_table_name: tableName,
      p_order_by: orderBy,
      p_limit: limit,
      p_offset: offset,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`RPC export_table_inserts(${tableName}) failed ${resp.status}: ${body}`);
  }
  return resp.json();
}

async function rpcTableCount(tableName) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/export_table_count`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ p_table_name: tableName }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`RPC export_table_count(${tableName}) failed ${resp.status}: ${body}`);
  }
  const val = await resp.json();
  return typeof val === 'number' ? val : Number(val);
}

// ---------------------------------------------------------------------------
// Data corrections (applied to raw INSERT SQL strings)
// ---------------------------------------------------------------------------
function applyCorrections(tableName, sql) {
  let s = sql;

  if (tableName === 'order_items') {
    s = s.replace(/'Super Silver Marker'/g, "'Silver Marker'");
    s = s.replace(/'Flava Flav'/g, "'Flavor Flav'");
  }

  if (tableName === 'products') {
    s = s.replace(/'Super Silver Marker'/g, "'Silver Marker'");
    s = s.replace(/'Flava Flav'/g, "'Flavor Flav'");
  }

  if (tableName === 'product_types') {
    s = s.replace(/Fresh Frozdn/g, 'Fresh Frozen');
  }

  return s;
}

/**
 * For certain columns we need to NULL-out FK references that won't exist
 * on the target. We do this via regex on the generated INSERT strings.
 * The column positions are determined from information_schema at runtime.
 */
function nullifyColumns(tableName, sql, columnPositions) {
  let s = sql;

  const nullCols = {};
  if (tableName === 'order_items') {
    nullCols['strain_id'] = true;
    nullCols['batch_id'] = true;
  }
  if (tableName === 'products') {
    nullCols['strain_id'] = true;
  }
  if (tableName === 'labels') {
    nullCols['strain_id'] = true;
  }

  if (Object.keys(nullCols).length === 0) return s;

  const colsInTable = columnPositions[tableName];
  if (!colsInTable) return s;

  // Strategy: parse the VALUES(...) portion and replace specific positions
  const valuesMatch = s.match(/VALUES \((.+)\);$/);
  if (!valuesMatch) return s;

  const prefix = s.slice(0, s.indexOf('VALUES (') + 8);
  const valuesPart = valuesMatch[1];

  // Split values carefully (respecting quoted strings)
  const values = splitSqlValues(valuesPart);
  for (const colName of Object.keys(nullCols)) {
    const idx = colsInTable.indexOf(colName);
    if (idx >= 0 && idx < values.length) {
      values[idx] = 'NULL';
    }
  }

  return prefix + values.join(', ') + ');';
}

function splitSqlValues(valStr) {
  const result = [];
  let current = '';
  let inQuote = false;
  let escapeNext = false;

  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }
    if (ch === "'" && !escapeNext) {
      if (inQuote && i + 1 < valStr.length && valStr[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      current += ch;
      continue;
    }
    if (ch === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// Column position cache (for nullification)
// ---------------------------------------------------------------------------
async function getColumnPositions(tableName) {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/export_table_inserts`,
    {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        p_table_name: tableName,
        p_order_by: 'id',
        p_limit: 1,
        p_offset: 0,
      }),
    }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  if (!data || data.length === 0) return [];
  const sql = data[0].insert_sql;
  const colMatch = sql.match(/INSERT INTO \w+ \((.+?)\) VALUES/);
  if (!colMatch) return [];
  return colMatch[1].split(',').map(c => c.trim());
}

// ---------------------------------------------------------------------------
// Self-referential table handling
// ---------------------------------------------------------------------------
function transformSelfRef(tableName, selfRefCol, insertLines) {
  const lines = [];
  const updates = [];

  lines.push(`-- Self-referential table: two-pass import for ${selfRefCol}`);
  lines.push(`-- Pass 1: INSERT all rows with ${selfRefCol} = NULL`);
  lines.push('');

  for (const sql of insertLines) {
    const colMatch = sql.match(/INSERT INTO \w+ \((.+?)\) VALUES/);
    if (!colMatch) { lines.push(sql); continue; }

    const cols = colMatch[1].split(',').map(c => c.trim());
    const selfRefIdx = cols.indexOf(selfRefCol);
    const idIdx = cols.indexOf('id');

    const valuesMatch = sql.match(/VALUES \((.+)\);$/);
    if (!valuesMatch || selfRefIdx < 0) { lines.push(sql); continue; }

    const values = splitSqlValues(valuesMatch[1]);
    const originalVal = values[selfRefIdx];
    const idVal = idIdx >= 0 ? values[idIdx] : null;

    if (originalVal !== 'NULL') {
      values[selfRefIdx] = 'NULL';
      if (idVal) {
        updates.push(`UPDATE ${tableName} SET ${selfRefCol} = ${originalVal} WHERE id = ${idVal};`);
      }
    }

    const prefix = sql.slice(0, sql.indexOf('VALUES (') + 8);
    lines.push(prefix + values.join(', ') + ');');
  }

  if (updates.length > 0) {
    lines.push('');
    lines.push(`-- Pass 2: UPDATE self-references (${updates.length} rows)`);
    lines.push(...updates);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Table definitions (from GO-LIVE-PLAN-v5.0)
// ---------------------------------------------------------------------------
const TABLES = [
  { name: 'quality_grades', tier: 1, order: 'sort_order' },
  { name: 'product_stages', tier: 1, order: 'id' },
  { name: 'product_types', tier: 1, order: 'id' },
  { name: 'label_types', tier: 1, order: 'id' },
  { name: 'conversion_rates', tier: 1, order: 'id' },
  { name: 'app_settings', tier: 1, order: 'id' },
  { name: 'delivery_drivers', tier: 1, order: 'id' },
  { name: 'delivery_vehicles', tier: 1, order: 'id' },
  { name: 'system_metadata', tier: 1, order: 'key' },
  { name: 'customers', tier: 2, order: 'created_at', selfRef: 'parent_customer_id' },
  { name: 'products', tier: 2, order: 'created_at', selfRef: 'replaced_by_product_id' },
  { name: 'user_profiles', tier: 2, order: 'id' },
  { name: 'grow_rooms', tier: 2, order: 'id' },
  { name: 'dry_rooms', tier: 2, order: 'id' },
  { name: 'room_tables', tier: 3, order: 'id' },
  { name: 'room_sections', tier: 3, order: 'id' },
  { name: 'notification_preferences', tier: 3, order: 'id' },
  { name: 'quality_grade_history', tier: 3, order: 'id' },
  { name: 'delivery_routes', tier: 3, order: 'id' },
  { name: 'route_waypoints', tier: 3, order: 'id' },
  { name: 'labels', tier: 3, order: 'created_at' },
  { name: 'orders', tier: 4, order: 'created_at' },
  { name: 'order_items', tier: 4, order: 'id' },
  { name: 'order_fulfillment_checklist', tier: 4, order: 'id' },
  { name: 'invoices', tier: 4, order: 'id' },
  { name: 'coversheets', tier: 4, order: 'id' },
  { name: 'package_assignments', tier: 4, order: 'id' },
  { name: 'customer_activity_log', tier: 5, order: 'created_at' },
  { name: 'crm_visit_schedule', tier: 5, order: 'id' },
];

const EXPECTED_COUNTS = {
  quality_grades: 5, product_stages: 4, product_types: 14, label_types: 4,
  conversion_rates: 2, app_settings: 33, delivery_drivers: 1, delivery_vehicles: 1,
  system_metadata: 1, customers: 39, products: 1049, user_profiles: 10,
  grow_rooms: 11, dry_rooms: 3, room_tables: 1, room_sections: 8,
  notification_preferences: 9, quality_grade_history: 8, delivery_routes: 18,
  route_waypoints: 236, labels: 29, orders: 132, order_items: 576,
  order_fulfillment_checklist: 576, invoices: 3, coversheets: 5,
  package_assignments: 2, customer_activity_log: 3, crm_visit_schedule: 1,
};

const NEEDS_NULLIFY = ['order_items', 'products', 'labels'];

// ---------------------------------------------------------------------------
// Extract one table
// ---------------------------------------------------------------------------
async function extractTable(tableConfig, columnPositions) {
  const { name, order, selfRef } = tableConfig;
  process.stdout.write(`  ${name}...`);

  let count;
  try {
    count = await rpcTableCount(name);
  } catch (err) {
    console.log(` FAILED (count): ${err.message}`);
    return { name, lines: [`-- ERROR extracting ${name}: ${err.message}`], count: 0 };
  }
  process.stdout.write(` ${count} rows...`);

  if (count === 0) {
    console.log(' (empty)');
    return { name, lines: [`-- ${name}: 0 rows`], count: 0 };
  }

  let allInserts = [];
  let offset = 0;
  while (offset < count) {
    const batch = await rpcExportInserts(name, order, PAGE_SIZE, offset);
    for (const row of batch) {
      let sql = row.insert_sql;
      sql = applyCorrections(name, sql);
      if (NEEDS_NULLIFY.includes(name)) {
        sql = nullifyColumns(name, sql, columnPositions);
      }
      allInserts.push(sql);
    }
    offset += PAGE_SIZE;
    if (batch.length < PAGE_SIZE) break;
  }

  let lines = [];
  lines.push(`-- ${name}: ${allInserts.length} rows`);
  lines.push(`-- Extracted: ${new Date().toISOString()}`);
  lines.push('');

  if (selfRef) {
    lines.push(...transformSelfRef(name, selfRef, allInserts));
  } else {
    lines.push(...allInserts);
  }

  console.log(' OK');
  return { name, lines, count: allInserts.length };
}

// ---------------------------------------------------------------------------
// Static SQL file generators
// ---------------------------------------------------------------------------
function generateAuthUsersSql() {
  const lines = [];
  lines.push('-- =============================================================');
  lines.push('-- Phase 3: Auth User Recreation (UUID Preservation)');
  lines.push('-- =============================================================');
  lines.push('-- Run via Supabase Admin API: supabase.auth.admin.createUser()');
  lines.push('--');
  lines.push('-- FIRST: Disable the auth trigger');
  lines.push('ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;');
  lines.push('');
  lines.push('-- Create users via admin API (not raw SQL):');
  const users = [
    { id: 'b5116e5d-cc6a-4ed1-9ba8-9ea918ed2395', email: 'justin@cultcannabis.co' },
    { id: 'f0ff44c6-b0a2-4026-86ce-b40e21b77e51', email: 'sam@cultcannabis.co' },
    { id: '647594c7-a932-476c-b7d5-f158e85f76e7', email: 'james@cultcannabis.co' },
    { id: 'c8b53f7a-82e3-44cc-ab01-4aa1a392841d', email: 'leo@cultcannabis.co' },
    { id: '04d9d91c-3d8b-4c72-a0d7-916721febac6', email: 'scott@cultcannabis.co' },
    { id: 'f9f0b692-7283-48e1-8238-fb940d34f741', email: 'josie@cultcannabis.co' },
    { id: '52704ea8-e986-4c27-9aa2-418881ceb363', email: 'laura@cultcannabis.co' },
    { id: '552ee529-8daa-4d31-a126-70e49791c749', email: 'greg@cultcannabis.co' },
    { id: '97112d43-ad9c-4ecb-a1dc-f31ac8188821', email: 'david@cultcannabis.co', note: 'FIX: source has david@cultcannabis.c' },
    { id: '3e08cb90-05c5-4644-8291-08f0c3540f3f', email: 'ynez_cross@yahoo.com' },
  ];
  for (const u of users) {
    const note = u.note ? ` -- ${u.note}` : '';
    lines.push(`-- await supabase.auth.admin.createUser({ id: '${u.id}', email: '${u.email}', password: '<temp>', email_confirm: true });${note}`);
  }
  lines.push('');
  lines.push('-- AFTER all users created, re-enable trigger:');
  lines.push('ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;');
  return lines.join('\n');
}

function generateDisableTriggersSql() {
  return [
    '-- =============================================================',
    '-- Phase 3.5: Disable INSERT triggers before data import',
    '-- =============================================================',
    'ALTER TABLE orders DISABLE TRIGGER generate_order_number_trigger;',
    'ALTER TABLE order_items DISABLE TRIGGER order_item_fulfillment_checklist_trigger;',
    'ALTER TABLE order_items DISABLE TRIGGER trigger_order_item_strain_populate;',
    'ALTER TABLE order_items DISABLE TRIGGER update_order_total_on_item_change;',
    'ALTER TABLE order_items DISABLE TRIGGER trigger_mark_coversheet_outdated_on_items_change;',
    'ALTER TABLE products DISABLE TRIGGER trigger_product_strain_id_sync;',
    'ALTER TABLE products DISABLE TRIGGER validate_product_stage_type;',
    'ALTER TABLE package_assignments DISABLE TRIGGER trg_check_assignment_quantity_limit;',
    'ALTER TABLE package_assignments DISABLE TRIGGER trg_reserve_inventory_on_assignment;',
  ].join('\n');
}

function generateEnableTriggersSql() {
  return [
    '-- =============================================================',
    '-- Re-enable INSERT triggers after data import',
    '-- =============================================================',
    'ALTER TABLE orders ENABLE TRIGGER generate_order_number_trigger;',
    'ALTER TABLE order_items ENABLE TRIGGER order_item_fulfillment_checklist_trigger;',
    'ALTER TABLE order_items ENABLE TRIGGER trigger_order_item_strain_populate;',
    'ALTER TABLE order_items ENABLE TRIGGER update_order_total_on_item_change;',
    'ALTER TABLE order_items ENABLE TRIGGER trigger_mark_coversheet_outdated_on_items_change;',
    'ALTER TABLE products ENABLE TRIGGER trigger_product_strain_id_sync;',
    'ALTER TABLE products ENABLE TRIGGER validate_product_stage_type;',
    'ALTER TABLE package_assignments ENABLE TRIGGER trg_check_assignment_quantity_limit;',
    'ALTER TABLE package_assignments ENABLE TRIGGER trg_reserve_inventory_on_assignment;',
  ].join('\n');
}

function generateRelinkSql() {
  return [
    '-- =============================================================',
    '-- Phase 6: Re-Link Preserved Data to Fresh Strains',
    '-- =============================================================',
    '',
    '-- Phase 6.0: Disable triggers that fire on UPDATE',
    'ALTER TABLE order_items DISABLE TRIGGER trigger_mark_coversheet_outdated_on_items_change;',
    'ALTER TABLE order_items DISABLE TRIGGER update_order_total_on_item_change;',
    'ALTER TABLE order_items DISABLE TRIGGER update_order_item_updated_at;',
    '',
    '-- Phase 6.1: Re-link strain references',
    'UPDATE order_items oi',
    'SET strain_id = s.id',
    'FROM strains s',
    'WHERE oi.strain = s.name',
    '  AND oi.strain_id IS NULL;',
    '',
    'UPDATE products p',
    'SET strain_id = s.id',
    'FROM strains s',
    'WHERE p.strain = s.name',
    '  AND p.strain_id IS NULL;',
    '',
    'UPDATE labels l',
    'SET strain_id = s.id',
    'FROM strains s',
    'WHERE l.strain_id IS NULL',
    '  AND EXISTS (',
    '    SELECT 1 FROM products p',
    '    WHERE p.id = l.product_id',
    '      AND p.strain_id = s.id',
    '  );',
    '',
    '-- Phase 6.2: Re-enable triggers',
    'ALTER TABLE order_items ENABLE TRIGGER trigger_mark_coversheet_outdated_on_items_change;',
    'ALTER TABLE order_items ENABLE TRIGGER update_order_total_on_item_change;',
    'ALTER TABLE order_items ENABLE TRIGGER update_order_item_updated_at;',
    '',
    '-- Verification:',
    "-- SELECT DISTINCT oi.strain FROM order_items oi WHERE oi.strain IS NOT NULL AND oi.strain != '' AND oi.strain_id IS NULL;",
    '-- (should return 0 rows)',
  ].join('\n');
}

function generateVerificationSql() {
  const lines = [
    '-- =============================================================',
    '-- Phase 8: Verification Queries',
    '-- =============================================================',
    '',
    '-- 8.2 Production Data Counts',
  ];

  const tables = Object.keys(EXPECTED_COUNTS).sort();
  const selects = tables.map((t, i) =>
    (i === 0 ? 'SELECT' : 'UNION ALL SELECT') + ` '${t}' AS tbl, COUNT(*) AS cnt FROM ${t}`
  );
  lines.push(selects.join('\n'));
  lines.push('ORDER BY tbl;');
  lines.push('');
  lines.push('-- Expected counts:');
  for (const [t, c] of Object.entries(EXPECTED_COUNTS)) {
    lines.push(`--   ${t} = ${c}`);
  }
  lines.push('');
  lines.push('-- 8.3 Fresh Data Integrity');
  lines.push('SELECT COUNT(*) AS active_strains FROM strains WHERE is_active = true;');
  lines.push('');
  lines.push('SELECT br.batch_number, br.strain FROM batch_registry br WHERE br.strain_id IS NULL;');
  lines.push('-- Must return 0 rows');
  lines.push('');
  lines.push('SELECT id, package_id, on_hand_qty, available_qty, reserved_qty');
  lines.push('FROM inventory_items');
  lines.push('WHERE available_qty != (on_hand_qty - COALESCE(reserved_qty, 0));');
  lines.push('-- Must return 0 rows (ATP check)');
  lines.push('');
  lines.push('-- 8.4 Cross-Reference Integrity');
  lines.push('SELECT COUNT(*) AS unlinked_order_items FROM order_items');
  lines.push("WHERE strain IS NOT NULL AND strain != '' AND strain_id IS NULL;");
  lines.push('-- Must be 0 after Phase 6');
  lines.push('');
  lines.push('SELECT COUNT(*) AS unlinked_products FROM products');
  lines.push("WHERE strain IS NOT NULL AND strain != '' AND strain_id IS NULL;");
  lines.push('-- Should be 0 or near-0');
  lines.push('');
  lines.push('SELECT COUNT(*) AS test_data_leaked FROM inventory_items WHERE test_mode = true;');
  lines.push('-- Must be 0');
  lines.push('');
  lines.push('SELECT COUNT(*) AS orphaned_batch_refs FROM order_items WHERE batch_id IS NOT NULL;');
  lines.push('-- Must be 0');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const ts = new Date().toISOString();
  console.log('=================================================================');
  console.log('  CULT Seed-to-Sale -- Go-Live Extraction');
  console.log('=================================================================');
  console.log(`  Source: ${SUPABASE_URL}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Time:   ${ts}`);
  console.log('=================================================================');
  console.log('');

  // -- Connection test --
  console.log('[1/5] Testing connection...');
  try {
    const cnt = await rpcTableCount('app_settings');
    console.log(`  OK (app_settings has ${cnt} rows)`);
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    console.error('  Make sure export_table_inserts() and export_table_count() are deployed.');
    process.exit(1);
  }
  console.log('');

  // -- Pre-fetch column positions for tables that need nullification --
  console.log('[2/5] Fetching column positions for nullification targets...');
  const columnPositions = {};
  for (const tbl of NEEDS_NULLIFY) {
    const cols = await getColumnPositions(tbl);
    columnPositions[tbl] = cols;
    console.log(`  ${tbl}: ${cols.length} columns`);
  }
  console.log('');

  // -- Extract all tables --
  console.log('[3/5] Extracting production data (29 tables)...');
  console.log('');

  const allDataLines = [];
  allDataLines.push('-- =============================================================');
  allDataLines.push('-- CULT Seed-to-Sale Production Data Export');
  allDataLines.push(`-- Source: ${SUPABASE_URL}`);
  allDataLines.push(`-- Extracted: ${ts}`);
  allDataLines.push('-- =============================================================');
  allDataLines.push('--');
  allDataLines.push('-- Data corrections applied:');
  allDataLines.push('--   order_items.strain: "Super Silver Marker" -> "Silver Marker"');
  allDataLines.push('--   order_items.strain: "Flava Flav" -> "Flavor Flav"');
  allDataLines.push('--   products.strain: "Super Silver Marker" -> "Silver Marker"');
  allDataLines.push('--   products.strain: "Flava Flav" -> "Flavor Flav"');
  allDataLines.push('--   product_types.description: "Fresh Frozdn" -> "Fresh Frozen"');
  allDataLines.push('--   order_items.strain_id -> NULL');
  allDataLines.push('--   order_items.batch_id -> NULL');
  allDataLines.push('--   products.strain_id -> NULL');
  allDataLines.push('--   labels.strain_id -> NULL');
  allDataLines.push('-- =============================================================');
  allDataLines.push('');

  const summary = [];
  let totalRows = 0;
  let currentTier = 0;

  for (const tbl of TABLES) {
    if (tbl.tier !== currentTier) {
      currentTier = tbl.tier;
      allDataLines.push('');
      allDataLines.push(`-- === TIER ${currentTier} ===`);
      allDataLines.push('');
    }

    const result = await extractTable(tbl, columnPositions);

    allDataLines.push(...result.lines);
    allDataLines.push('');

    writeFileSync(
      resolve(OUTPUT_DIR, `tier${tbl.tier}_${tbl.name}.sql`),
      result.lines.join('\n'),
      'utf-8'
    );

    summary.push({ table: result.name, rows: result.count, tier: tbl.tier });
    totalRows += result.count;
  }

  console.log('');

  // -- Write combined file --
  console.log('[4/5] Writing output files...');

  const combinedLines = [
    generateDisableTriggersSql(),
    '',
    allDataLines.join('\n'),
    '',
    generateEnableTriggersSql(),
  ];
  writeFileSync(resolve(OUTPUT_DIR, '04_production_data_all.sql'), combinedLines.join('\n'), 'utf-8');
  writeFileSync(resolve(OUTPUT_DIR, '03_auth_users.sql'), generateAuthUsersSql(), 'utf-8');
  writeFileSync(resolve(OUTPUT_DIR, '03.5_disable_triggers.sql'), generateDisableTriggersSql(), 'utf-8');
  writeFileSync(resolve(OUTPUT_DIR, '04.5_enable_triggers.sql'), generateEnableTriggersSql(), 'utf-8');
  writeFileSync(resolve(OUTPUT_DIR, '06_relink_strains.sql'), generateRelinkSql(), 'utf-8');
  writeFileSync(resolve(OUTPUT_DIR, '08_verification.sql'), generateVerificationSql(), 'utf-8');

  console.log('  03_auth_users.sql');
  console.log('  03.5_disable_triggers.sql');
  console.log('  04_production_data_all.sql');
  console.log('  04.5_enable_triggers.sql');
  console.log('  06_relink_strains.sql');
  console.log('  08_verification.sql');
  console.log(`  + ${TABLES.length} individual tier files`);
  console.log('');

  // -- Summary --
  console.log('[5/5] Verification...');
  console.log('');
  console.log(`  ${'Table'.padEnd(35)} ${'Tier'.padEnd(6)} ${'Rows'.padEnd(8)} Expected`);
  console.log(`  ${'─'.repeat(35)} ${'─'.repeat(5)} ${'─'.repeat(7)} ${'─'.repeat(8)}`);

  let mismatches = 0;
  for (const s of summary) {
    const expected = EXPECTED_COUNTS[s.table];
    const match = expected === undefined || s.rows === expected;
    const marker = match ? '' : ' *** MISMATCH';
    if (!match) mismatches++;
    console.log(
      `  ${s.table.padEnd(35)} ${String(s.tier).padEnd(6)} ${String(s.rows).padEnd(8)} ${expected !== undefined ? expected : '?'}${marker}`
    );
  }
  console.log(`  ${'─'.repeat(35)} ${'─'.repeat(5)} ${'─'.repeat(7)} ${'─'.repeat(8)}`);
  console.log(`  ${'TOTAL'.padEnd(35)} ${' '.repeat(6)} ${totalRows}`);
  console.log('');

  if (mismatches === 0) {
    console.log('  All row counts match GO-LIVE-PLAN-v5.0 expected values.');
  } else {
    console.log(`  WARNING: ${mismatches} mismatch(es) -- review before import.`);
    console.log('  (Row counts may have changed since the plan was written.)');
  }

  console.log('');
  console.log('EXTRACTION COMPLETE');
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('');
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
