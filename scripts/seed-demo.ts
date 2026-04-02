/**
 * Demo Environment Seed Script
 *
 * Creates sanitized fictional data on the staging database for prospect demos.
 * Safe to re-run — all records use fixed UUIDs and upsert on conflict.
 *
 * STAGING ONLY: Will refuse to run against production (fonreynkfeqywshijqpi).
 *
 * Usage:
 *   VITE_SUPABASE_URL=https://... VITE_SUPABASE_ANON_KEY=... npx tsx scripts/seed-demo.ts
 *   OR (if .env.local is configured for staging):
 *   npx tsx scripts/seed-demo.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const STAGING_PROJECT_ID = 'cbxwippkzeszvxewhebd';
const PRODUCTION_PROJECT_ID = 'fonreynkfeqywshijqpi';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Safety guard: never run against production
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is not set. Aborting.');
  process.exit(1);
}
if (supabaseUrl.includes(PRODUCTION_PROJECT_ID)) {
  console.error('❌ Refusing to seed production database. Set VITE_SUPABASE_URL to staging.');
  process.exit(1);
}
if (!supabaseUrl.includes(STAGING_PROJECT_ID)) {
  console.warn(`⚠️  VITE_SUPABASE_URL does not match known staging project (${STAGING_PROJECT_ID}).`);
  console.warn('   Proceeding anyway — confirm this is not a production database.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Fixed UUIDs (stable across re-runs) ────────────────────────────────────

const IDS = {
  strains: {
    sunsetGelato: 'ddemo001-0000-0000-0000-000000000001',
    purpleHaze: 'ddemo001-0000-0000-0000-000000000002',
    ogKush: 'ddemo001-0000-0000-0000-000000000003',
    blueDream: 'ddemo001-0000-0000-0000-000000000004',
    gorillaDust: 'ddemo001-0000-0000-0000-000000000005',
    whiteFrost: 'ddemo001-0000-0000-0000-000000000006',
  },
  growRooms: {
    vegRoom: 'ddemo002-0000-0000-0000-000000000001',
    flowerRoom: 'ddemo002-0000-0000-0000-000000000002',
  },
  plantGroups: {
    vegGroup1: 'ddemo003-0000-0000-0000-000000000001',
    vegGroup2: 'ddemo003-0000-0000-0000-000000000002',
    flowerGroup1: 'ddemo003-0000-0000-0000-000000000003',
    flowerGroup2: 'ddemo003-0000-0000-0000-000000000004',
  },
  batches: {
    batch1: 'ddemo004-0000-0000-0000-000000000001',
    batch2: 'ddemo004-0000-0000-0000-000000000002',
    batch3: 'ddemo004-0000-0000-0000-000000000003',
    batch4: 'ddemo004-0000-0000-0000-000000000004',
    batch5: 'ddemo004-0000-0000-0000-000000000005',
  },
  harvestSessions: {
    harvest1: 'ddemo005-0000-0000-0000-000000000001',
    harvest2: 'ddemo005-0000-0000-0000-000000000002',
  },
  customers: {
    greenLeaf: 'ddemo006-0000-0000-0000-000000000001',
    sunriseDispo: 'ddemo006-0000-0000-0000-000000000002',
    mountainHerb: 'ddemo006-0000-0000-0000-000000000003',
    desertBloom: 'ddemo006-0000-0000-0000-000000000004',
  },
  orders: {
    order1: 'ddemo007-0000-0000-0000-000000000001',
    order2: 'ddemo007-0000-0000-0000-000000000002',
    order3: 'ddemo007-0000-0000-0000-000000000003',
    order4: 'ddemo007-0000-0000-0000-000000000004',
    order5: 'ddemo007-0000-0000-0000-000000000005',
    order6: 'ddemo007-0000-0000-0000-000000000006',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(entity: string, count: number) {
  console.log(`  ✓ ${entity}: ${count} records upserted`);
}

function err(entity: string, error: unknown) {
  console.error(`  ✗ ${entity} failed:`, error);
  process.exitCode = 1;
}

// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedStrains() {
  const { error, data } = await supabase
    .from('strains')
    .upsert(
      [
        {
          id: IDS.strains.sunsetGelato,
          name: 'Sunset Gelato',
          display_name: 'Sunset Gelato',
          abbreviation: 'SGL',
          is_active: true,
          category: 'Hybrid',
          dominance_type: 'Hybrid',
          thc_range: '22-26%',
          cbd_range: '0.1-0.3%',
          flowering_time_days: 63,
          flowering_time_class: 'medium',
          notes: '[DEMO]',
        },
        {
          id: IDS.strains.purpleHaze,
          name: 'Purple Haze',
          display_name: 'Purple Haze',
          abbreviation: 'PHZ',
          is_active: true,
          category: 'Sativa',
          dominance_type: 'Sativa',
          thc_range: '18-22%',
          cbd_range: '0.1-0.2%',
          flowering_time_days: 70,
          flowering_time_class: 'long',
          notes: '[DEMO]',
        },
        {
          id: IDS.strains.ogKush,
          name: 'OG Kush',
          display_name: 'OG Kush',
          abbreviation: 'OGK',
          is_active: true,
          category: 'Indica',
          dominance_type: 'Indica',
          thc_range: '20-25%',
          cbd_range: '0.1-0.3%',
          flowering_time_days: 56,
          flowering_time_class: 'short',
          notes: '[DEMO]',
        },
        {
          id: IDS.strains.blueDream,
          name: 'Blue Dream',
          display_name: 'Blue Dream',
          abbreviation: 'BDR',
          is_active: true,
          category: 'Hybrid',
          dominance_type: 'Sativa-dominant',
          thc_range: '17-21%',
          cbd_range: '0.1-0.2%',
          flowering_time_days: 65,
          flowering_time_class: 'medium',
          notes: '[DEMO]',
        },
        {
          id: IDS.strains.gorillaDust,
          name: 'Gorilla Dust',
          display_name: 'Gorilla Dust',
          abbreviation: 'GDT',
          is_active: true,
          category: 'Hybrid',
          dominance_type: 'Indica-dominant',
          thc_range: '24-28%',
          cbd_range: '0.1-0.3%',
          flowering_time_days: 60,
          flowering_time_class: 'medium',
          notes: '[DEMO]',
        },
        {
          id: IDS.strains.whiteFrost,
          name: 'White Frost',
          display_name: 'White Frost',
          abbreviation: 'WFR',
          is_active: true,
          category: 'Hybrid',
          dominance_type: 'Hybrid',
          thc_range: '19-23%',
          cbd_range: '0.1-0.2%',
          flowering_time_days: 58,
          flowering_time_class: 'short',
          notes: '[DEMO]',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('strains', error);
  else log('strains', data?.length ?? 0);
}

async function seedGrowRooms() {
  const { error, data } = await supabase
    .from('grow_rooms')
    .upsert(
      [
        {
          id: IDS.growRooms.vegRoom,
          name: 'Demo Veg Room A',
          room_code: 'DEMO-VEG-A',
          room_type: 'veg',
          capacity_plants: 120,
          square_footage: 400,
          is_active: true,
        },
        {
          id: IDS.growRooms.flowerRoom,
          name: 'Demo Flower Room B',
          room_code: 'DEMO-FLW-B',
          room_type: 'flower',
          capacity_plants: 80,
          square_footage: 600,
          is_active: true,
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('grow_rooms', error);
  else log('grow_rooms', data?.length ?? 0);
}

async function seedPlantGroups() {
  const { error, data } = await supabase
    .from('plant_groups')
    .upsert(
      [
        {
          id: IDS.plantGroups.vegGroup1,
          name: 'Demo Veg — Sunset Gelato',
          strain_id: IDS.strains.sunsetGelato,
          grow_room_id: IDS.growRooms.vegRoom,
          growth_stage: 'veg',
          plant_count: 40,
          source_type: 'clone',
          planted_date: '2026-02-15',
          estimated_harvest_date: '2026-05-10',
          stage_entered_at: '2026-02-15T08:00:00Z',
          notes: '[DEMO]',
        },
        {
          id: IDS.plantGroups.vegGroup2,
          name: 'Demo Veg — OG Kush',
          strain_id: IDS.strains.ogKush,
          grow_room_id: IDS.growRooms.vegRoom,
          growth_stage: 'veg',
          plant_count: 35,
          source_type: 'clone',
          planted_date: '2026-02-22',
          estimated_harvest_date: '2026-05-17',
          stage_entered_at: '2026-02-22T08:00:00Z',
          notes: '[DEMO]',
        },
        {
          id: IDS.plantGroups.flowerGroup1,
          name: 'Demo Flower — Blue Dream',
          strain_id: IDS.strains.blueDream,
          grow_room_id: IDS.growRooms.flowerRoom,
          growth_stage: 'flower',
          plant_count: 32,
          source_type: 'clone',
          planted_date: '2026-01-10',
          estimated_harvest_date: '2026-04-15',
          stage_entered_at: '2026-02-05T08:00:00Z',
          notes: '[DEMO]',
        },
        {
          id: IDS.plantGroups.flowerGroup2,
          name: 'Demo Flower — Gorilla Dust',
          strain_id: IDS.strains.gorillaDust,
          grow_room_id: IDS.growRooms.flowerRoom,
          growth_stage: 'flower',
          plant_count: 28,
          source_type: 'clone',
          planted_date: '2026-01-18',
          estimated_harvest_date: '2026-04-20',
          stage_entered_at: '2026-02-12T08:00:00Z',
          notes: '[DEMO]',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('plant_groups', error);
  else log('plant_groups', data?.length ?? 0);
}

async function seedBatches() {
  const { error, data } = await supabase
    .from('batch_registry')
    .upsert(
      [
        {
          id: IDS.batches.batch1,
          batch_number: '260115-SUNGELATO',
          strain: 'Sunset Gelato',
          strain_id: IDS.strains.sunsetGelato,
          harvest_date: '2026-01-15',
          initial_weight_grams: 1800,
          status: 'completed',
          lifecycle_state: 'packaged',
          production_path: 'flower',
          notes: '[DEMO]',
        },
        {
          id: IDS.batches.batch2,
          batch_number: '260120-PURPLHAZE',
          strain: 'Purple Haze',
          strain_id: IDS.strains.purpleHaze,
          harvest_date: '2026-01-20',
          initial_weight_grams: 1450,
          status: 'completed',
          lifecycle_state: 'trimming',
          production_path: 'flower',
          notes: '[DEMO]',
        },
        {
          id: IDS.batches.batch3,
          batch_number: '260201-OGKUSH',
          strain: 'OG Kush',
          strain_id: IDS.strains.ogKush,
          harvest_date: '2026-02-01',
          initial_weight_grams: 2100,
          status: 'active',
          lifecycle_state: 'drying',
          production_path: 'flower',
          notes: '[DEMO]',
        },
        {
          id: IDS.batches.batch4,
          batch_number: '260210-BLUEDRM',
          strain: 'Blue Dream',
          strain_id: IDS.strains.blueDream,
          harvest_date: '2026-02-10',
          initial_weight_grams: 1650,
          status: 'active',
          lifecycle_state: 'bucking',
          production_path: 'flower',
          notes: '[DEMO]',
        },
        {
          id: IDS.batches.batch5,
          batch_number: '251215-WHITEFRS',
          strain: 'White Frost',
          strain_id: IDS.strains.whiteFrost,
          harvest_date: '2025-12-15',
          initial_weight_grams: 1920,
          status: 'completed',
          lifecycle_state: 'sold',
          production_path: 'flower',
          notes: '[DEMO]',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('batch_registry', error);
  else log('batch_registry', data?.length ?? 0);
}

async function seedHarvestSessions() {
  const { error, data } = await supabase
    .from('harvest_sessions')
    .upsert(
      [
        {
          id: IDS.harvestSessions.harvest1,
          harvest_date: '2026-01-15',
          plant_count_harvested: 30,
          wet_weight_grams: 18000,
          adjusted_weight_grams: 1800,
          session_status: 'completed',
          grow_room_id: IDS.growRooms.flowerRoom,
          batch_registry_id: IDS.batches.batch1,
          plant_group_id: IDS.plantGroups.flowerGroup1,
          completed_at: '2026-01-15T18:00:00Z',
          notes: '[DEMO] Completed harvest — excellent yield',
        },
        {
          id: IDS.harvestSessions.harvest2,
          harvest_date: '2026-01-20',
          plant_count_harvested: 25,
          wet_weight_grams: 14500,
          adjusted_weight_grams: 1450,
          session_status: 'completed',
          grow_room_id: IDS.growRooms.flowerRoom,
          batch_registry_id: IDS.batches.batch2,
          plant_group_id: IDS.plantGroups.flowerGroup2,
          completed_at: '2026-01-20T17:30:00Z',
          notes: '[DEMO] Completed harvest — standard yield',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('harvest_sessions', error);
  else log('harvest_sessions', data?.length ?? 0);
}

async function seedInventory() {
  const { error, data } = await supabase
    .from('inventory_items')
    .upsert(
      [
        // Bulk items
        {
          id: 'ddemo008-0000-0000-0000-000000000001',
          batch_id: '260115-SUNGELATO',
          package_id: 'DEMO-BULK-SGL-001',
          strain: 'Sunset Gelato',
          strain_id: IDS.strains.sunsetGelato,
          product_name: 'Bulk — Sunset Gelato — Flower',
          category: 'bulk',
          unit: 'g',
          on_hand_qty: 850,
          available_qty: 750,
          reserved_qty: 100,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        {
          id: 'ddemo008-0000-0000-0000-000000000002',
          batch_id: '260120-PURPLHAZE',
          package_id: 'DEMO-BULK-PHZ-001',
          strain: 'Purple Haze',
          strain_id: IDS.strains.purpleHaze,
          product_name: 'Bulk — Purple Haze — Flower',
          category: 'bulk',
          unit: 'g',
          on_hand_qty: 620,
          available_qty: 520,
          reserved_qty: 100,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        {
          id: 'ddemo008-0000-0000-0000-000000000003',
          batch_id: '260201-OGKUSH',
          package_id: 'DEMO-BULK-OGK-001',
          strain: 'OG Kush',
          strain_id: IDS.strains.ogKush,
          product_name: 'Bulk — OG Kush — Flower',
          category: 'bulk',
          unit: 'g',
          on_hand_qty: 1100,
          available_qty: 1100,
          reserved_qty: 0,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        // Packaged items
        {
          id: 'ddemo008-0000-0000-0000-000000000004',
          batch_id: '260115-SUNGELATO',
          package_id: 'DEMO-PKG-SGL-3.5-001',
          strain: 'Sunset Gelato',
          strain_id: IDS.strains.sunsetGelato,
          product_name: 'Packaged — Sunset Gelato — 3.5g',
          category: 'packaged',
          unit: 'qty',
          net_weight: 3.5,
          on_hand_qty: 80,
          available_qty: 60,
          reserved_qty: 20,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        {
          id: 'ddemo008-0000-0000-0000-000000000005',
          batch_id: '260115-SUNGELATO',
          package_id: 'DEMO-PKG-SGL-7-001',
          strain: 'Sunset Gelato',
          strain_id: IDS.strains.sunsetGelato,
          product_name: 'Packaged — Sunset Gelato — 7g',
          category: 'packaged',
          unit: 'qty',
          net_weight: 7.0,
          on_hand_qty: 40,
          available_qty: 30,
          reserved_qty: 10,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        {
          id: 'ddemo008-0000-0000-0000-000000000006',
          batch_id: '260120-PURPLHAZE',
          package_id: 'DEMO-PKG-PHZ-3.5-001',
          strain: 'Purple Haze',
          strain_id: IDS.strains.purpleHaze,
          product_name: 'Packaged — Purple Haze — 3.5g',
          category: 'packaged',
          unit: 'qty',
          net_weight: 3.5,
          on_hand_qty: 60,
          available_qty: 50,
          reserved_qty: 10,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        {
          id: 'ddemo008-0000-0000-0000-000000000007',
          batch_id: '260201-OGKUSH',
          package_id: 'DEMO-PKG-OGK-28-001',
          strain: 'OG Kush',
          strain_id: IDS.strains.ogKush,
          product_name: 'Packaged — OG Kush — 28g',
          category: 'packaged',
          unit: 'qty',
          net_weight: 28.0,
          on_hand_qty: 24,
          available_qty: 24,
          reserved_qty: 0,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
        // Trim / smalls
        {
          id: 'ddemo008-0000-0000-0000-000000000008',
          batch_id: '260115-SUNGELATO',
          package_id: 'DEMO-TRIM-SGL-001',
          strain: 'Sunset Gelato',
          strain_id: IDS.strains.sunsetGelato,
          product_name: 'Trim — Sunset Gelato',
          category: 'trim',
          unit: 'g',
          on_hand_qty: 320,
          available_qty: 320,
          reserved_qty: 0,
          status: 'active',
          test_mode: false,
          notes: '[DEMO]',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('inventory_items', error);
  else log('inventory_items', data?.length ?? 0);
}

async function seedCustomers() {
  const { error, data } = await supabase
    .from('customers')
    .upsert(
      [
        {
          id: IDS.customers.greenLeaf,
          name: 'Green Leaf Dispensary',
          dispensary_code: 'DEMO-GLD',
          account_type: 'dispensary',
          account_status: 'active',
          delivery_model: 'delivery',
          contact_name: 'Jamie Rivera',
          email: 'demo-greenleaf@example.com',
          phone: '(602) 555-0101',
          address: '1234 Desert Palm Ave',
          city: 'Phoenix',
          state: 'AZ',
          postal_code: '85001',
          pipeline_stage: 'customer',
          notes: '[DEMO]',
        },
        {
          id: IDS.customers.sunriseDispo,
          name: 'Sunrise Cannabis Co.',
          dispensary_code: 'DEMO-SRC',
          account_type: 'dispensary',
          account_status: 'active',
          delivery_model: 'delivery',
          contact_name: 'Alex Chen',
          email: 'demo-sunrise@example.com',
          phone: '(303) 555-0202',
          address: '567 Mountain View Rd',
          city: 'Denver',
          state: 'CO',
          postal_code: '80202',
          pipeline_stage: 'customer',
          notes: '[DEMO]',
        },
        {
          id: IDS.customers.mountainHerb,
          name: 'Mountain Herb Collective',
          dispensary_code: 'DEMO-MHC',
          account_type: 'dispensary',
          account_status: 'active',
          delivery_model: 'pickup',
          contact_name: 'Sam Torres',
          email: 'demo-mountain@example.com',
          phone: '(602) 555-0303',
          address: '890 Cactus Wren Blvd',
          city: 'Scottsdale',
          state: 'AZ',
          postal_code: '85251',
          pipeline_stage: 'prospect',
          notes: '[DEMO]',
        },
        {
          id: IDS.customers.desertBloom,
          name: 'Desert Bloom Wellness',
          dispensary_code: 'DEMO-DBW',
          account_type: 'dispensary',
          account_status: 'active',
          delivery_model: 'delivery',
          contact_name: 'Morgan Lee',
          email: 'demo-desert@example.com',
          phone: '(303) 555-0404',
          address: '321 High Plains Dr',
          city: 'Boulder',
          state: 'CO',
          postal_code: '80301',
          pipeline_stage: 'prospect',
          notes: '[DEMO]',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('customers', error);
  else log('customers', data?.length ?? 0);
}

async function seedOrders() {
  const statuses = ['draft', 'confirmed', 'scheduled', 'in_transit', 'delivered', 'invoiced'];
  const priorities = ['standard', 'standard', 'rush', 'standard', 'standard', 'standard'];

  const { error, data } = await supabase
    .from('orders')
    .upsert(
      [
        {
          id: IDS.orders.order1,
          order_number: 'DEMO-ORD-001',
          customer_id: IDS.customers.greenLeaf,
          status: statuses[4], // delivered
          priority: priorities[0],
          order_date: '2026-01-10',
          requested_delivery_date: '2026-01-18',
          scheduled_delivery_date: '2026-01-18',
          total_amount: 1540.00,
          test_mode: false,
          internal_notes: '[DEMO]',
        },
        {
          id: IDS.orders.order2,
          order_number: 'DEMO-ORD-002',
          customer_id: IDS.customers.sunriseDispo,
          status: statuses[5], // invoiced
          priority: priorities[1],
          order_date: '2026-01-15',
          requested_delivery_date: '2026-01-22',
          scheduled_delivery_date: '2026-01-22',
          total_amount: 2200.00,
          test_mode: false,
          internal_notes: '[DEMO]',
        },
        {
          id: IDS.orders.order3,
          order_number: 'DEMO-ORD-003',
          customer_id: IDS.customers.greenLeaf,
          status: statuses[2], // scheduled
          priority: priorities[2], // rush
          order_date: '2026-02-01',
          requested_delivery_date: '2026-02-05',
          scheduled_delivery_date: '2026-02-05',
          total_amount: 880.00,
          test_mode: false,
          internal_notes: '[DEMO]',
        },
        {
          id: IDS.orders.order4,
          order_number: 'DEMO-ORD-004',
          customer_id: IDS.customers.mountainHerb,
          status: statuses[1], // confirmed
          priority: priorities[3],
          order_date: '2026-02-08',
          requested_delivery_date: '2026-02-20',
          total_amount: 1760.00,
          test_mode: false,
          internal_notes: '[DEMO]',
        },
        {
          id: IDS.orders.order5,
          order_number: 'DEMO-ORD-005',
          customer_id: IDS.customers.sunriseDispo,
          status: statuses[0], // draft
          priority: priorities[4],
          order_date: '2026-02-12',
          requested_delivery_date: '2026-03-01',
          total_amount: 3080.00,
          test_mode: false,
          internal_notes: '[DEMO]',
        },
        {
          id: IDS.orders.order6,
          order_number: 'DEMO-ORD-006',
          customer_id: IDS.customers.desertBloom,
          status: statuses[0], // draft
          priority: priorities[5],
          order_date: '2026-02-15',
          requested_delivery_date: '2026-03-05',
          total_amount: 1320.00,
          test_mode: false,
          internal_notes: '[DEMO]',
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (error) err('orders', error);
  else log('orders', data?.length ?? 0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 CULT Demo Seed Script');
  console.log(`   Target: ${supabaseUrl}`);
  console.log('   Mode: idempotent upsert (safe to re-run)\n');

  await seedStrains();
  await seedGrowRooms();
  await seedPlantGroups();
  await seedBatches();
  await seedHarvestSessions();
  await seedInventory();
  await seedCustomers();
  await seedOrders();

  if (process.exitCode === 1) {
    console.log('\n❌ Seed completed with errors. Check output above.');
  } else {
    console.log('\n✅ Demo seed complete. Staging database is ready for prospect demos.');
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
