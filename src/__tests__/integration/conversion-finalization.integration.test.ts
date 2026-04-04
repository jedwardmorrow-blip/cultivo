/**
 * Integration tests: Conversion Finalization Flow
 *
 * Tests the full conversion finalization path:
 *   1. Authenticate user
 *   2. Check full vs partial finalization logic
 *   3. Call finalize_session_aggregated RPC (full only)
 *   4. Look up correct product stage from name
 *   5. Insert conversion_packages
 *   6. Fetch batch data from batch_registry for inventory item construction
 *   7. Insert inventory_items
 *   8. Perform ATP consistency check
 *
 * These tests validate the multi-step nature of finalization and the
 * interactions between conversions.service, supabase RPC, and inventory.
 *
 * Mock strategy: table-name router (not positional sequence) to avoid
 * ordering issues caused by the module-level stageIdCache in conversions.service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { finalizeConversion, getCategoryFromProductName } from '@/features/inventory/services/conversions.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/services', () => ({
  inventoryMovementService: {
    recordMovement: vi.fn().mockResolvedValue({ success: true, movement_id: 'mov-001' }),
  },
  errorService: {
    handle: vi.fn(),
  },
}));

// =====================================================
// SHARED FIXTURES
// =====================================================

const MOCK_STAGES = [
  { id: 'stage-binned',   name: 'Binned'   },
  { id: 'stage-bucked',   name: 'Bucked'   },
  { id: 'stage-trimmed',  name: 'Trimmed'  },
  { id: 'stage-packaged', name: 'Packaged' },
];

const MOCK_USER = { id: 'user-001' };

const MOCK_BATCH = {
  batch_number: '260331-blue-dream',
  strain_id: 'strain-001',
  strains: { name: 'Blue Dream' },
};

const BASE_PARAMS = {
  batch_id: 'batch-001',
  product_id: 'prod-001',
  product_name: 'Binned - Blue Dream - Flower',
  session_type: 'trim' as const,
  session_ids: ['session-001'],
  aggregation_id: 'agg-001',
  packages: [{ package_id: 'PKG-001', weight: 500, units: null }],
  output_weight: 500,
  output_units: null,
};

const MOCK_CREATED_PACKAGES = [
  { id: 'pkg-001', package_id: 'PKG-001', weight: 500, batch_id: 'batch-001' },
];

const MOCK_ATP_ITEM = {
  package_id: 'PKG-001',
  on_hand_qty: 500,
  available_qty: 500,
  reserved_qty: 0,
};

const MOCK_INV_ITEM_ID = { id: 'inv-item-001' };

// =====================================================
// TABLE-NAME ROUTER MOCK HELPER
//
// Routes supabase.from() calls by table name.
// Supports multiple sequential returns per table via arrays.
// Avoids positioning bugs caused by the module-level stageIdCache
// in conversions.service that skips product_stages on subsequent tests.
// =====================================================

type TableHandler = () => unknown;

function mockByTable(routes: Record<string, TableHandler | TableHandler[]>) {
  const counters: Record<string, number> = {};
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    const idx = counters[table] ?? 0;
    counters[table] = idx + 1;

    const route = routes[table];
    if (!route) return null;

    if (Array.isArray(route)) {
      const fn = idx < route.length ? route[idx] : route[route.length - 1];
      return fn();
    }
    return (route as TableHandler)();
  });
}

// Shared: product_stages mock (always needed for stageIdMap if cache is cold)
function stagesMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(MOCK_STAGES)),
    }),
  };
}

// Shared: conversion_packages insert mock
function packageInsertMock(packages = MOCK_CREATED_PACKAGES) {
  return () => ({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue(mockSupabaseSuccess(packages)),
    }),
  });
}

// Shared: batch_registry select mock
function batchMock(batch = MOCK_BATCH) {
  return () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(batch)),
      }),
    }),
  });
}

// inventory_items: [insert mock, ATP check mock, movement audit mock]
function inventoryItemMocks() {
  return [
    // Call 1: insert
    () => ({ insert: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) }),
    // Call 2: ATP check (select ... .single())
    () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(MOCK_ATP_ITEM)),
        }),
      }),
    }),
    // Call 3: movement audit (select('id') .eq .single())
    () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(MOCK_INV_ITEM_ID)),
        }),
      }),
    }),
  ];
}

// Default full-path routes for happy-path tests
function buildFullRoutes(overrides: Record<string, TableHandler | TableHandler[]> = {}) {
  return {
    product_stages: stagesMock,
    conversion_packages: packageInsertMock(),
    batch_registry: batchMock(),
    inventory_items: inventoryItemMocks(),
    ...overrides,
  };
}

// =====================================================
// TESTS
// =====================================================

describe('Conversion Finalization — integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: MOCK_USER },
    });
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseSuccess(null));
  });

  // =====================================================
  // FULL FINALIZATION PATH
  // =====================================================

  describe('full finalization (package weight meets output_weight)', () => {
    it('calls finalize_session_aggregated RPC before inserting packages', async () => {
      mockByTable(buildFullRoutes());

      await finalizeConversion(BASE_PARAMS);

      expect(supabase.rpc).toHaveBeenCalledWith('finalize_session_aggregated', {
        p_batch_id: 'batch-001',
        p_product_name: 'Binned - Blue Dream - Flower',
        p_session_type: 'trim',
      });
    });

    it('creates conversion_packages with finalization_status=finalized', async () => {
      let insertPayload: unknown = null;
      const captureInsert = vi.fn().mockImplementation((data: unknown) => {
        insertPayload = data;
        return { select: vi.fn().mockResolvedValue(mockSupabaseSuccess(MOCK_CREATED_PACKAGES)) };
      });

      mockByTable(buildFullRoutes({
        conversion_packages: () => ({ insert: captureInsert }),
      }));

      await finalizeConversion(BASE_PARAMS);

      expect(supabase.from).toHaveBeenCalledWith('conversion_packages');
      const packages = insertPayload as Array<Record<string, unknown>>;
      expect(packages[0]).toMatchObject({
        finalization_status: 'finalized',
        package_id: 'PKG-001',
        weight: 500,
        batch_id: 'batch-001',
      });
      expect(packages[0].finalized_at).toBeDefined();
      expect(packages[0].finalized_by).toBe('user-001');
    });

    it('fetches batch data from batch_registry (not batches table)', async () => {
      mockByTable(buildFullRoutes());

      await finalizeConversion(BASE_PARAMS);

      expect(supabase.from).toHaveBeenCalledWith('batch_registry');
      expect(supabase.from).not.toHaveBeenCalledWith('batches');
    });

    it('creates inventory_items after packages with correct quantities', async () => {
      let inventoryInsertPayload: unknown = null;
      const captureInsert = vi.fn().mockImplementation((data: unknown) => {
        inventoryInsertPayload = data;
        return mockSupabaseSuccess(null);
      });

      mockByTable(buildFullRoutes({
        inventory_items: [
          () => ({ insert: captureInsert }),
          ...inventoryItemMocks().slice(1),
        ],
      }));

      await finalizeConversion(BASE_PARAMS);

      expect(supabase.from).toHaveBeenCalledWith('inventory_items');
      const items = inventoryInsertPayload as Array<Record<string, unknown>>;
      expect(items[0]).toMatchObject({
        on_hand_qty: 500,
        available_qty: 500,
        reserved_qty: 0,
        unit: 'g',
        status: 'available',
        batch_id: 'batch-001',
        strain: 'Blue Dream',
        batch_number: '260331-blue-dream',
      });
    });

    it('derives category from product_name and stores it on inventory_item', async () => {
      let inventoryInsertPayload: unknown = null;
      const captureInsert = vi.fn().mockImplementation((data: unknown) => {
        inventoryInsertPayload = data;
        return mockSupabaseSuccess(null);
      });

      mockByTable(buildFullRoutes({
        inventory_items: [
          () => ({ insert: captureInsert }),
          ...inventoryItemMocks().slice(1),
        ],
      }));

      await finalizeConversion(BASE_PARAMS);

      const items = inventoryInsertPayload as Array<Record<string, unknown>>;
      expect(items[0].category).toBe('flower_binned');
    });

    it('returns array of created conversion packages', async () => {
      mockByTable(buildFullRoutes());

      const result = await finalizeConversion(BASE_PARAMS);

      expect(result).toEqual(MOCK_CREATED_PACKAGES);
    });

    it('performs ATP consistency check for each created package', async () => {
      mockByTable(buildFullRoutes());

      await finalizeConversion(BASE_PARAMS);

      // inventory_items is called 3 times: insert, ATP check, movement audit
      const calls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls
        .filter(([table]) => table === 'inventory_items');
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('records PRODUCE movements for each created inventory_item (Step 4)', async () => {
      const { inventoryMovementService } = await import('@/services');
      const recordMovementMock = inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>;

      mockByTable(buildFullRoutes());

      await finalizeConversion(BASE_PARAMS);

      // recordMovement should be called once for each package
      expect(recordMovementMock).toHaveBeenCalledTimes(MOCK_CREATED_PACKAGES.length);

      // Verify each call has movement_kind='PRODUCE' and reason_code='session_finalization'
      recordMovementMock.mock.calls.forEach((call) => {
        const [params] = call as [Record<string, unknown>];
        expect(params.movement_kind).toBe('PRODUCE');
        expect(params.reason_code).toBe('session_finalization');
        expect(params.qty).toBeDefined();
        expect(params.unit).toBeDefined();
        expect(params.dest_item_id).toBeDefined();
      });
    });

    it('continues finalization even if movement recording fails (non-blocking error handling)', async () => {
      const { inventoryMovementService } = await import('@/services');
      const recordMovementMock = inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>;

      // Mock recordMovement to fail
      recordMovementMock.mockResolvedValueOnce({ success: false, error: 'Movement service unavailable' });
      recordMovementMock.mockResolvedValueOnce({ success: true, movement_id: 'mov-002' });
      recordMovementMock.mockResolvedValueOnce({ success: true, movement_id: 'mov-003' });

      mockByTable(buildFullRoutes());

      // Finalization should still succeed even though first movement failed
      const result = await finalizeConversion(BASE_PARAMS);

      expect(result).toEqual(MOCK_CREATED_PACKAGES);
      // recordMovement attempts should still be made for all packages
      expect(recordMovementMock).toHaveBeenCalledTimes(MOCK_CREATED_PACKAGES.length);
    });
  });

  // =====================================================
  // PARTIAL FINALIZATION PATH
  // =====================================================

  describe('partial finalization (package weight below output_weight)', () => {
    const partialParams = {
      ...BASE_PARAMS,
      packages: [{ package_id: 'PKG-001', weight: 200, units: null }], // 200 < 500 output_weight
    };

    const partialPackages = [
      { id: 'pkg-002', package_id: 'PKG-001', weight: 200, batch_id: 'batch-001' },
    ];

    it('skips finalize_session_aggregated RPC so sessions remain pending', async () => {
      mockByTable(buildFullRoutes({
        conversion_packages: packageInsertMock(partialPackages),
        inventory_items: [
          () => ({ insert: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) }),
          () => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...MOCK_ATP_ITEM, on_hand_qty: 200, available_qty: 200 })),
              }),
            }),
          }),
          () => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(MOCK_INV_ITEM_ID)),
              }),
            }),
          }),
        ],
      }));

      await finalizeConversion(partialParams);

      expect(supabase.rpc).not.toHaveBeenCalledWith('finalize_session_aggregated', expect.anything());
    });

    it('still creates packages and inventory_items for partial conversions', async () => {
      mockByTable(buildFullRoutes({
        conversion_packages: packageInsertMock(partialPackages),
        inventory_items: [
          () => ({ insert: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)) }),
          () => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ ...MOCK_ATP_ITEM, on_hand_qty: 200, available_qty: 200 })),
              }),
            }),
          }),
          () => ({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(MOCK_INV_ITEM_ID)),
              }),
            }),
          }),
        ],
      }));

      const result = await finalizeConversion(partialParams);

      expect(result).toHaveLength(1);
      expect(supabase.from).toHaveBeenCalledWith('conversion_packages');
      expect(supabase.from).toHaveBeenCalledWith('inventory_items');
    });
  });

  // =====================================================
  // ERROR PATHS
  // =====================================================

  describe('error handling', () => {
    it('throws when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
      });

      await expect(finalizeConversion(BASE_PARAMS)).rejects.toThrow('User not authenticated');
    });

    it('throws when finalize_session_aggregated RPC fails', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseError('RPC failed')
      );

      mockByTable({ product_stages: stagesMock });

      await expect(finalizeConversion(BASE_PARAMS)).rejects.toThrow('Failed to finalize sessions');
    });

    it('throws when package insert fails', async () => {
      mockByTable({
        product_stages: stagesMock,
        conversion_packages: () => ({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(mockSupabaseError('insert failed')),
          }),
        }),
      });

      await expect(finalizeConversion(BASE_PARAMS)).rejects.toThrow('Failed to create packages');
    });

    it('throws when batch_registry lookup fails', async () => {
      mockByTable({
        product_stages: stagesMock,
        conversion_packages: packageInsertMock(),
        batch_registry: () => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseError('batch not found')),
            }),
          }),
        }),
      });

      await expect(finalizeConversion(BASE_PARAMS)).rejects.toThrow('Failed to fetch batch data');
    });

    it('throws when inventory_items insert fails', async () => {
      mockByTable({
        product_stages: stagesMock,
        conversion_packages: packageInsertMock(),
        batch_registry: batchMock(),
        inventory_items: [
          () => ({ insert: vi.fn().mockResolvedValue(mockSupabaseError('inventory insert failed')) }),
        ],
      });

      await expect(finalizeConversion(BASE_PARAMS)).rejects.toThrow('Failed to create inventory items');
    });
  });

  // =====================================================
  // CATEGORY MAPPING — pure logic, no DB
  // =====================================================

  describe('getCategoryFromProductName — drives stage assignment in inventory_items', () => {
    it.each([
      ['Binned - Test Strain - Flower', 'flower_binned'],
      ['Bulk Flower (Bucked)', 'flower_bucked'],
      ['Bucked - Blue Pave - Flower', 'flower_bucked'],
      ['Bulk - Test Strain - Flower', 'flower_bulk'],
      ['Packaged - Z Marker - 3.5g', 'flower_packaged'],
      ['1lb Flower/Smalls - Test Strain', 'smalls_packaged'],
      ['Fresh Frozen - Test Strain', 'fresh_frozen'],
    ])('"%s" → %s', (productName, expectedCategory) => {
      expect(getCategoryFromProductName(productName)).toBe(expectedCategory);
    });

    it('returns flower_bulk as default for unrecognised product names', () => {
      expect(getCategoryFromProductName('Unknown Product XYZ')).toBe('flower_bulk');
    });
  });
});
