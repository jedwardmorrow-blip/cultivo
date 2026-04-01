/**
 * Integration tests: Inventory Reconciliation
 *
 * Covers three reconciliation paths:
 *
 * 1. validateRebalance — pure validation logic (no DB)
 *    - Checks business rules before a weight transfer is executed
 *    - Source ≠ destination, amount > 0, amount ≤ available qty, matching units
 *
 * 2. executeRebalance — DB-backed transfer via RPC
 *    - Calls fn_rebalance_inventory_weight RPC
 *    - Requires authenticated user
 *    - Returns before/after qty for both items
 *
 * 3. adjustInventoryItem — ad-hoc quantity correction
 *    - Validates new_qty is non-negative and differs from current
 *    - Creates ADJUSTMENT movement via inventoryMovementService
 *    - Logs variance (non-blocking if variance log fails)
 *    - Balance update is handled by DB trigger, not explicit update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateRebalance,
  executeRebalance,
} from '@/features/inventory/services/rebalance.service';
import { adjustInventoryItem } from '@/features/inventory/services/adjustment.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../mocks/supabase';
import { inventoryMovementService } from '@/services';
import { logVariance } from '@/features/inventory/services/varianceLog.service';

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
    recordMovement: vi.fn(),
  },
  errorService: {
    handle: vi.fn(),
  },
}));

// varianceLog.service is called directly by adjustment.service, not via @/services
vi.mock('@/features/inventory/services/varianceLog.service', () => ({
  logVariance: vi.fn().mockResolvedValue({ id: 'var-log-001' }),
  createVarianceLog: vi.fn().mockResolvedValue({ id: 'var-log-001' }),
}));

// =====================================================
// SHARED FIXTURES
// =====================================================

const MOCK_USER_ID = 'user-001';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-001',
    package_id: 'PKG-001',
    product_name: 'Bulk - Blue Dream - Flower',
    strain: 'Blue Dream',
    batch: '260331-blue-dream',
    on_hand_qty: 1000,
    available_qty: 1000,
    unit: 'g',
    product_stage_id: 'stage-trimmed',
    product_stages: { name: 'Trimmed' },
    ...overrides,
  };
}

describe('Inventory Reconciliation — integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
    });
  });

  // =====================================================
  // validateRebalance — pure business rule validation
  // =====================================================

  describe('validateRebalance', () => {
    const source = makeItem({ id: 'item-001', on_hand_qty: 1000 });
    const dest   = makeItem({ id: 'item-002', package_id: 'PKG-002' });

    it('returns is_valid=true for a valid rebalance request', async () => {
      const result = await validateRebalance(source as any, dest as any, 200);

      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects when source and destination are the same item', async () => {
      const result = await validateRebalance(source as any, source as any, 200);

      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Source and destination must be different items');
    });

    it('rejects when transfer amount is zero', async () => {
      const result = await validateRebalance(source as any, dest as any, 0);

      expect(result.is_valid).toBe(false);
      expect(result.errors).toContain('Transfer amount must be greater than zero');
    });

    it('rejects when transfer amount is negative', async () => {
      const result = await validateRebalance(source as any, dest as any, -50);

      expect(result.is_valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects when transfer amount exceeds source on_hand_qty', async () => {
      const result = await validateRebalance(source as any, dest as any, 1001);

      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds source quantity'))).toBe(true);
    });

    it('rejects when source and destination units differ', async () => {
      const destDifferentUnit = makeItem({ id: 'item-002', unit: 'unit' });
      const result = await validateRebalance(source as any, destDifferentUnit as any, 200);

      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unit mismatch'))).toBe(true);
    });

    it('adds warning (not error) when transferring more than 50% of source', async () => {
      const result = await validateRebalance(source as any, dest as any, 600); // 60% of 1000

      expect(result.is_valid).toBe(true); // still valid
      expect(result.warnings.some(w => w.includes('50%'))).toBe(true);
    });

    it('no warning when transferring exactly 50%', async () => {
      const result = await validateRebalance(source as any, dest as any, 500);

      expect(result.is_valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  // =====================================================
  // executeRebalance — DB-backed weight transfer
  // =====================================================

  describe('executeRebalance', () => {
    const request = {
      source_item_id: 'item-001',
      dest_item_id: 'item-002',
      transfer_qty: 200,
      reason_code: 'rebalance',
      notes: 'Correcting over-packed batch',
    };

    const rpcSuccess = {
      success: true,
      source_movement_id: 'mov-src-001',
      dest_movement_id: 'mov-dst-001',
      source_before: 1000,
      source_after: 800,
      dest_before: 0,
      dest_after: 200,
      transfer_qty: 200,
      unit: 'g',
    };

    it('calls fn_rebalance_inventory_weight RPC with correct params', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseSuccess(rpcSuccess)
      );

      await executeRebalance(request);

      expect(supabase.rpc).toHaveBeenCalledWith('fn_rebalance_inventory_weight', {
        p_source_item_id: 'item-001',
        p_dest_item_id: 'item-002',
        p_transfer_qty: 200,
        p_user_id: MOCK_USER_ID,
        p_reason_code: 'rebalance',
        p_notes: 'Correcting over-packed batch',
      });
    });

    it('passes null for notes when omitted', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseSuccess(rpcSuccess)
      );

      await executeRebalance({ ...request, notes: undefined });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'fn_rebalance_inventory_weight',
        expect.objectContaining({ p_notes: null })
      );
    });

    it('returns correct before/after quantities on success', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseSuccess(rpcSuccess)
      );

      const result = await executeRebalance(request);

      expect(result.success).toBe(true);
      expect(result.source_before).toBe(1000);
      expect(result.source_after).toBe(800);
      expect(result.dest_before).toBe(0);
      expect(result.dest_after).toBe(200);
      expect(result.transfer_qty).toBe(200);
    });

    it('returns failure when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
      });

      const result = await executeRebalance(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authenticated');
    });

    it('returns failure when RPC throws an error', async () => {
      (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabaseError('insufficient quantity')
      );

      const result = await executeRebalance(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rebalance failed');
    });
  });

  // =====================================================
  // adjustInventoryItem — ad-hoc quantity correction
  // =====================================================

  describe('adjustInventoryItem', () => {
    const adjustRequest = {
      inventory_item_id: 'item-001',
      new_qty: 950,
      variance_reason: 'audit_correction',
      notes: 'Weighed after audit',
    };

    function mockItemFetch(item = makeItem()) {
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(item)),
          }),
        }),
      });
    }

    it('fetches inventory item before applying adjustment', async () => {
      mockItemFetch();
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        movement_id: 'mov-001',
      });

      await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      expect(supabase.from).toHaveBeenCalledWith('inventory_items');
    });

    it('creates ADJUSTMENT movement with the new quantity', async () => {
      mockItemFetch();
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        movement_id: 'mov-001',
      });

      await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      expect(inventoryMovementService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_kind: 'ADJUSTMENT',
          dest_item_id: 'item-001',
          qty: 950,
          reason_code: 'audit_correction',
        })
      );
    });

    it('returns success with correct variance values', async () => {
      mockItemFetch(); // on_hand_qty: 1000
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        movement_id: 'mov-001',
      });

      const result = await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.old_qty).toBe(1000);
      expect(result.new_qty).toBe(950);
      expect(result.variance_qty).toBe(-50);
    });

    it('rejects when new_qty equals current on_hand_qty (no-op)', async () => {
      mockItemFetch(); // on_hand_qty: 1000

      const noOpRequest = { ...adjustRequest, new_qty: 1000 };
      const result = await adjustInventoryItem(noOpRequest, MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be different');
    });

    it('rejects negative new_qty', async () => {
      mockItemFetch();

      const negativeRequest = { ...adjustRequest, new_qty: -1 };
      const result = await adjustInventoryItem(negativeRequest, MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('returns failure when inventory item not found', async () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseError('not found')),
          }),
        }),
      });

      const result = await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      expect(result.success).toBe(false);
    });

    it('returns failure when movement creation fails', async () => {
      mockItemFetch();
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Movement service unavailable',
      });

      const result = await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Movement service unavailable');
    });

    it('adjustment succeeds even if variance log fails (non-blocking)', async () => {
      (logVariance as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Variance DB down'));

      mockItemFetch();
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        movement_id: 'mov-001',
      });

      const result = await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      // Adjustment must still succeed even when variance log throws
      expect(result.success).toBe(true);
      expect(result.movement_id).toBe('mov-001');
    });

    it('calculates correct variance_percentage', async () => {
      mockItemFetch(); // on_hand_qty: 1000
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        movement_id: 'mov-001',
      });

      // Adjust from 1000 → 950: variance = -50, percentage = -5%
      const result = await adjustInventoryItem(adjustRequest, MOCK_USER_ID);

      expect(result.variance_qty).toBe(-50);
      expect(result.variance_percentage).toBeCloseTo(-5, 1);
    });

    it('calculates 0% variance when starting from zero quantity', async () => {
      mockItemFetch(makeItem({ on_hand_qty: 0 }));
      (inventoryMovementService.recordMovement as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        movement_id: 'mov-001',
      });

      const result = await adjustInventoryItem({ ...adjustRequest, new_qty: 100 }, MOCK_USER_ID);

      expect(result.variance_percentage).toBe(0); // avoid division by zero
    });
  });
});
