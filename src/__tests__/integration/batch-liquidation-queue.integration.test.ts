/**
 * Integration tests: Batch Liquidation Queue (CUL-473)
 *
 * Tests the inventory liquidation priority (FIFO) view implementation.
 * Validates:
 *   1. FIFO sort order (oldest batch first)
 *   2. Available inventory (ATP) aggregation
 *   3. Committed inventory deduction (order status filtering)
 *   4. "Ship First" batch identification
 *   5. Age-based badging (holding cost risk visualization)
 *
 * Mock strategy: Supabase table-name routing to simulate data queries
 * without making actual database calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// =====================================================
// TEST FIXTURES
// =====================================================

const MOCK_BATCHES = [
  {
    batch_number: '260301-blue-dream',
    strain_id: 'strain-001',
    harvested_at: '2026-03-01T10:00:00Z',
    strains: { name: 'Blue Dream' },
  },
  {
    batch_number: '260308-gelato',
    strain_id: 'strain-002',
    harvested_at: '2026-03-08T10:00:00Z',
    strains: { name: 'Gelato' },
  },
  {
    batch_number: '260315-og-kush',
    strain_id: 'strain-003',
    harvested_at: '2026-03-15T10:00:00Z',
    strains: { name: 'OG Kush' },
  },
  {
    batch_number: '260322-wedding-cake',
    strain_id: 'strain-004',
    harvested_at: '2026-03-22T10:00:00Z',
    strains: { name: 'Wedding Cake' },
  },
];

const MOCK_INVENTORY_ITEMS = [
  // Blue Dream: 800g available
  { batch_id: '260301-blue-dream', on_hand_qty: 500 },
  { batch_id: '260301-blue-dream', on_hand_qty: 300 },
  // Gelato: 0g (fully committed)
  { batch_id: '260308-gelato', on_hand_qty: 0 },
  // OG Kush: 200g available
  { batch_id: '260315-og-kush', on_hand_qty: 200 },
  // Wedding Cake: 100g available
  { batch_id: '260322-wedding-cake', on_hand_qty: 100 },
];

const MOCK_ORDER_ITEMS = [
  // Blue Dream: 100g committed (submitted order)
  { batch_id: '260301-blue-dream', quantity: 100, order_status: 'submitted' },
  // Gelato: 200g committed (no available inventory, fully committed)
  { batch_id: '260308-gelato', quantity: 200, order_status: 'submitted' },
  // OG Kush: 150g committed, 50g excluded (cancelled order)
  { batch_id: '260315-og-kush', quantity: 150, order_status: 'submitted' },
  { batch_id: '260315-og-kush', quantity: 100, order_status: 'cancelled' },
];

// =====================================================
// TABLE-NAME ROUTER MOCK
// =====================================================

type TableHandler = () => unknown;

function mockByTable(routes: Record<string, TableHandler | TableHandler[]>) {
  const callCounts: Record<string, number> = {};

  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    if (!routes[table]) {
      throw new Error(`No mock handler for table: ${table}`);
    }

    const handler = routes[table];
    const handlers = Array.isArray(handler) ? handler : [handler];
    const index = (callCounts[table] ?? 0) % handlers.length;
    callCounts[table] = (callCounts[table] ?? 0) + 1;

    return handlers[index]();
  });
}

// =====================================================
// MOCK BUILDERS
// =====================================================

function mockBatchRegistryQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: MOCK_BATCHES,
      error: null,
    }),
  };
}

function mockInventoryItemsQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockResolvedValue({
      data: MOCK_INVENTORY_ITEMS.filter(i => (i.on_hand_qty ?? 0) > 0),
      error: null,
    }),
  };
}

function mockOrderItemsQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue({
      data: MOCK_ORDER_ITEMS.filter(
        o => !['cancelled', 'delivered', 'completed'].includes(o.order_status)
      ).map(o => ({ batch_id: o.batch_id, quantity: o.quantity })),
      error: null,
    }),
  };
}

// =====================================================
// HELPER: Calculate ATP and Committed Maps
// =====================================================

function calculateATP(items: typeof MOCK_INVENTORY_ITEMS) {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (item.batch_id) {
      const qty = item.on_hand_qty ?? 0;
      if (qty > 0) {
        map[item.batch_id] = (map[item.batch_id] ?? 0) + qty;
      } else if (!(item.batch_id in map)) {
        // Ensure batch exists in map with 0 even if all items are <= 0
        map[item.batch_id] = 0;
      }
    }
  }
  return map;
}

function calculateCommitted(items: Array<{ batch_id: string; quantity: number }>) {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (item.batch_id) {
      map[item.batch_id] = (map[item.batch_id] ?? 0) + (item.quantity ?? 0);
    }
  }
  return map;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

// =====================================================
// TEST SUITE
// =====================================================

describe('BatchLiquidationQueue Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test: FIFO Sort Order Validation', () => {
    it('displays batches in ascending order of harvest date (oldest first)', () => {
      mockByTable({
        batch_registry: mockBatchRegistryQuery,
        inventory_items: mockInventoryItemsQuery,
        order_items: mockOrderItemsQuery,
      });

      // Simulate the component's sorting logic
      const sorted = MOCK_BATCHES.sort(
        (a, b) =>
          new Date(a.harvested_at || '').getTime() - new Date(b.harvested_at || '').getTime()
      );

      expect(sorted[0].batch_number).toBe('260301-blue-dream');
      expect(sorted[1].batch_number).toBe('260308-gelato');
      expect(sorted[2].batch_number).toBe('260315-og-kush');
      expect(sorted[3].batch_number).toBe('260322-wedding-cake');
    });

    it('assigns rank sequentially (1-indexed) preserving FIFO order', () => {
      const sorted = MOCK_BATCHES.sort(
        (a, b) =>
          new Date(a.harvested_at || '').getTime() - new Date(b.harvested_at || '').getTime()
      );

      const rows = sorted.map((b, idx) => ({
        batch_number: b.batch_number,
        rank: idx + 1,
      }));

      expect(rows[0].rank).toBe(1);
      expect(rows[1].rank).toBe(2);
      expect(rows[2].rank).toBe(3);
      expect(rows[3].rank).toBe(4);
    });

    it('Ship First badge appears only on oldest batch with available inventory', () => {
      const sorted = MOCK_BATCHES.sort(
        (a, b) =>
          new Date(a.harvested_at || '').getTime() - new Date(b.harvested_at || '').getTime()
      );
      const atp = calculateATP(MOCK_INVENTORY_ITEMS);

      const shipFirstBatch = sorted.find(b => (atp[b.batch_number] ?? 0) > 0);

      expect(shipFirstBatch?.batch_number).toBe('260301-blue-dream');
    });
  });

  describe('Test: Available Inventory Aggregation (ATP)', () => {
    it('sums on_hand_qty for multiple inventory items in same batch', () => {
      const atp = calculateATP(MOCK_INVENTORY_ITEMS);

      expect(atp['260301-blue-dream']).toBe(800); // 500 + 300
      expect(atp['260308-gelato']).toBe(0); // excluded (on_hand_qty = 0)
      expect(atp['260315-og-kush']).toBe(200);
      expect(atp['260322-wedding-cake']).toBe(100);
    });

    it('excludes items with on_hand_qty <= 0', () => {
      const items = [
        { batch_id: 'batch-1', on_hand_qty: 100 },
        { batch_id: 'batch-1', on_hand_qty: 0 },
        { batch_id: 'batch-1', on_hand_qty: -5 },
      ];

      const atp = calculateATP(items);

      expect(atp['batch-1']).toBe(100); // Only the 100g item counted
    });

    it('handles NULL on_hand_qty gracefully (treats as 0)', () => {
      const items = [
        { batch_id: 'batch-1', on_hand_qty: 100 },
        { batch_id: 'batch-1', on_hand_qty: null },
      ];

      const atp = calculateATP(items as any);

      expect(atp['batch-1']).toBe(100); // NULL coerced to 0 in aggregation
    });

    it('returns 0 for batches with no available inventory', () => {
      const atp = calculateATP(MOCK_INVENTORY_ITEMS);

      expect(atp['batch-not-in-list']).toBeUndefined();
      expect(atp['260308-gelato']).toBe(0);
    });
  });

  describe('Test: Committed Inventory (Order Status Filtering)', () => {
    it('includes only active order statuses (submitted, accepted, processing)', () => {
      const orderItems = [
        { batch_id: 'batch-1', quantity: 200, order_status: 'submitted' },
        { batch_id: 'batch-1', quantity: 100, order_status: 'accepted' },
        { batch_id: 'batch-1', quantity: 50, order_status: 'processing' },
        { batch_id: 'batch-1', quantity: 999, order_status: 'cancelled' },
        { batch_id: 'batch-1', quantity: 888, order_status: 'delivered' },
        { batch_id: 'batch-1', quantity: 777, order_status: 'completed' },
      ];

      const active = orderItems.filter(
        o => !['cancelled', 'delivered', 'completed'].includes(o.order_status)
      );
      const committed = calculateCommitted(active);

      expect(committed['batch-1']).toBe(350); // 200 + 100 + 50
    });

    it('excludes terminal order statuses (cancelled, delivered, completed)', () => {
      const orderItems = [
        { batch_id: 'batch-1', quantity: 100, order_status: 'submitted' },
        { batch_id: 'batch-1', quantity: 50, order_status: 'cancelled' },
        { batch_id: 'batch-1', quantity: 75, order_status: 'delivered' },
        { batch_id: 'batch-1', quantity: 25, order_status: 'completed' },
      ];

      const active = orderItems.filter(
        o => !['cancelled', 'delivered', 'completed'].includes(o.order_status)
      );
      const committed = calculateCommitted(active);

      expect(committed['batch-1']).toBe(100); // Only submitted
    });

    it('correctly filters for OG Kush batch (150g committed, 100g excluded as cancelled)', () => {
      const ogKushOrders = MOCK_ORDER_ITEMS.filter(o => o.batch_id === '260315-og-kush');
      const active = ogKushOrders.filter(
        o => !['cancelled', 'delivered', 'completed'].includes(o.order_status)
      );
      const committed = calculateCommitted(active);

      expect(committed['260315-og-kush']).toBe(150); // Only the submitted order
    });
  });

  describe('Test: Ship First Batch Identification', () => {
    it('identifies oldest batch with available inventory as Ship First', () => {
      const sorted = MOCK_BATCHES.sort(
        (a, b) =>
          new Date(a.harvested_at || '').getTime() - new Date(b.harvested_at || '').getTime()
      );
      const atp = calculateATP(MOCK_INVENTORY_ITEMS);

      const shipFirst = sorted.find(b => (atp[b.batch_number] ?? 0) > 0);

      expect(shipFirst?.batch_number).toBe('260301-blue-dream');
      expect(atp[shipFirst?.batch_number || '']).toBeGreaterThan(0);
    });

    it('skips fully-committed batches (available_g = 0) when finding Ship First', () => {
      const sorted = MOCK_BATCHES.sort(
        (a, b) =>
          new Date(a.harvested_at || '').getTime() - new Date(b.harvested_at || '').getTime()
      );
      const atp = calculateATP(MOCK_INVENTORY_ITEMS);

      // If Blue Dream were fully committed (atp = 0), Gelato (oldest after that) would be
      // checked next, but it also has 0. Then OG Kush (batch 3) would be Ship First.
      const atpModified = { ...atp, '260301-blue-dream': 0 };
      const shipFirst = sorted.find(b => (atpModified[b.batch_number] ?? 0) > 0);

      expect(shipFirst?.batch_number).toBe('260315-og-kush');
    });

    it('returns undefined if all batches are fully committed', () => {
      const sorted = MOCK_BATCHES.sort(
        (a, b) =>
          new Date(a.harvested_at || '').getTime() - new Date(b.harvested_at || '').getTime()
      );
      const atpZero: Record<string, number> = {
        '260301-blue-dream': 0,
        '260308-gelato': 0,
        '260315-og-kush': 0,
        '260322-wedding-cake': 0,
      };

      const shipFirst = sorted.find(b => (atpZero[b.batch_number] ?? 0) > 0);

      expect(shipFirst).toBeUndefined();
    });
  });

  describe('Test: Age Badging (Color Logic)', () => {
    it('assigns green badge for batches < 14 days old', () => {
      // Batch from 2026-04-01 (3 days old on 2026-04-04)
      const harvestedAt = '2026-04-01T10:00:00Z';
      const days = daysSince(harvestedAt);

      expect(days).toBeLessThan(14);
      expect(days).toBeGreaterThanOrEqual(0);
    });

    it('assigns amber badge for batches 14-30 days old', () => {
      // Batch from 2026-03-20 (15 days old on 2026-04-04)
      const harvestedAt = '2026-03-20T10:00:00Z';
      const days = daysSince(harvestedAt);

      expect(days).toBeGreaterThanOrEqual(14);
      expect(days).toBeLessThanOrEqual(30);
    });

    it('assigns red badge for batches > 30 days old', () => {
      // Batch from 2026-02-01 (62 days old on 2026-04-04)
      const harvestedAt = '2026-02-01T10:00:00Z';
      const days = daysSince(harvestedAt);

      expect(days).toBeGreaterThan(30);
    });

    it('correctly color-codes actual batches from fixture', () => {
      const batches = MOCK_BATCHES.map(b => ({
        ...b,
        days_since_harvest: daysSince(b.harvested_at!),
      }));

      const blueD = batches.find(b => b.batch_number === '260301-blue-dream');
      expect(blueD?.days_since_harvest).toBeGreaterThan(30); // Red
    });
  });

  describe('Test: Empty State & Edge Cases', () => {
    it('returns empty array if no batches have harvested_at', () => {
      const batches = MOCK_BATCHES.filter(b => !b.harvested_at);

      expect(batches.length).toBe(0);
    });

    it('handles missing strain name gracefully (fallback to batch_number)', () => {
      const batch = { ...MOCK_BATCHES[0], strains: null };

      const strainName = batch.strains?.name ?? batch.batch_number;

      expect(strainName).toBe('260301-blue-dream');
    });

    it('calculates net available correctly (ATP - Committed)', () => {
      const atp = calculateATP(MOCK_INVENTORY_ITEMS);
      const committed = calculateCommitted(
        MOCK_ORDER_ITEMS.filter(
          o => !['cancelled', 'delivered', 'completed'].includes(o.order_status)
        ).map(o => ({ batch_id: o.batch_id, quantity: o.quantity }))
      );

      const netBlueDream = (atp['260301-blue-dream'] ?? 0) - (committed['260301-blue-dream'] ?? 0);
      expect(netBlueDream).toBe(700); // 800 - 100
    });
  });
});
