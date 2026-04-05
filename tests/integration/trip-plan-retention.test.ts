/**
 * CUL-622: Integration test for trip_plan retention_expires_at trigger
 *
 * Validates that the DB trigger `set_trip_plan_retention_on_insert`
 * automatically sets retention_expires_at = created_at + 2 years
 * on every INSERT into trip_plans.
 *
 * Run: PATH="/opt/homebrew/bin:$PATH" pnpm exec tsx tests/integration/trip-plan-retention.test.ts
 *
 * Requires: Supabase local instance running with CUL-355 migration applied.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let testDriverId: string | null = null;
let testVehicleId: string | null = null;
let testTripPlanId: string | null = null;

async function setup() {
  // Create test driver
  const { data: driver, error: driverErr } = await supabase
    .from('delivery_drivers')
    .insert({ first_name: 'Test', last_name: 'Driver', fa_number: 'FA-TEST-622' })
    .select('id')
    .single();
  if (driverErr) throw new Error(`Setup failed (driver): ${driverErr.message}`);
  testDriverId = driver.id;

  // Create test vehicle
  const { data: vehicle, error: vehicleErr } = await supabase
    .from('delivery_vehicles')
    .insert({ make: 'Test', model: 'Vehicle', year: 2025, license_plate: 'TEST-622', vin: 'TEST622VIN00000000' })
    .select('id')
    .single();
  if (vehicleErr) throw new Error(`Setup failed (vehicle): ${vehicleErr.message}`);
  testVehicleId = vehicle.id;
}

async function cleanup() {
  if (testTripPlanId) {
    await supabase.from('trip_plans').delete().eq('id', testTripPlanId);
  }
  if (testVehicleId) {
    await supabase.from('delivery_vehicles').delete().eq('id', testVehicleId);
  }
  if (testDriverId) {
    await supabase.from('delivery_drivers').delete().eq('id', testDriverId);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function testRetentionTrigger() {
  console.log('\nTest 1: retention_expires_at is auto-populated on INSERT');

  const { data: plan, error } = await supabase
    .from('trip_plans')
    .insert({
      driver_id: testDriverId!,
      vehicle_id: testVehicleId!,
      status: 'draft',
      product_manifest: [],
    })
    .select('id, created_at, retention_expires_at')
    .single();

  if (error) throw new Error(`Insert failed: ${error.message}`);
  testTripPlanId = plan.id;

  assert(plan.retention_expires_at !== null, 'retention_expires_at is not null');
  assert(plan.created_at !== null, 'created_at is not null');

  const createdAt = new Date(plan.created_at);
  const retentionExpires = new Date(plan.retention_expires_at);

  // Expected: created_at + 2 years
  const expectedExpiry = new Date(createdAt);
  expectedExpiry.setFullYear(expectedExpiry.getFullYear() + 2);

  // Allow 1 second tolerance for timestamp precision
  const diffMs = Math.abs(retentionExpires.getTime() - expectedExpiry.getTime());
  assert(diffMs < 1000, `retention_expires_at = created_at + 2 years (diff: ${diffMs}ms)`);

  console.log(`    created_at:          ${plan.created_at}`);
  console.log(`    retention_expires_at: ${plan.retention_expires_at}`);
}

async function testRetentionWithExplicitCreatedAt() {
  console.log('\nTest 2: retention_expires_at respects explicit created_at');

  // Clean up previous plan
  if (testTripPlanId) {
    await supabase.from('trip_plans').delete().eq('id', testTripPlanId);
    testTripPlanId = null;
  }

  const fixedDate = '2025-06-15T10:30:00Z';
  const { data: plan, error } = await supabase
    .from('trip_plans')
    .insert({
      driver_id: testDriverId!,
      vehicle_id: testVehicleId!,
      status: 'draft',
      product_manifest: [],
      created_at: fixedDate,
    })
    .select('id, created_at, retention_expires_at')
    .single();

  if (error) throw new Error(`Insert failed: ${error.message}`);
  testTripPlanId = plan.id;

  assert(plan.retention_expires_at !== null, 'retention_expires_at is not null');

  const retentionExpires = new Date(plan.retention_expires_at);
  const expected = new Date('2027-06-15T10:30:00Z');

  const diffMs = Math.abs(retentionExpires.getTime() - expected.getTime());
  assert(diffMs < 1000, `retention_expires_at = 2027-06-15T10:30:00Z (diff: ${diffMs}ms)`);

  console.log(`    created_at:          ${plan.created_at}`);
  console.log(`    retention_expires_at: ${plan.retention_expires_at}`);
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('CUL-622: Trip plan retention_expires_at trigger test');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  try {
    await setup();
    await testRetentionTrigger();
    passed++;
    await testRetentionWithExplicitCreatedAt();
    passed++;
  } catch (err: any) {
    failed++;
    console.error(`\n✗ ${err.message}`);
  } finally {
    await cleanup();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
