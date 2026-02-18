import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryMovementService } from '@/services/inventoryMovement.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../mocks/supabase';
import type { CreateMovementPayload } from '@/types/movement.types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services/error.service', () => ({
  errorService: {
    categorizeError: vi.fn().mockReturnValue('UNKNOWN'),
    retryOperation: vi.fn((fn: () => Promise<unknown>) => fn()),
  },
  ErrorType: {
    NETWORK: 'NETWORK',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN: 'UNKNOWN',
  },
}));

const validProducePayload: CreateMovementPayload = {
  movement_kind: 'PRODUCE',
  dest_item_id: 'inv-item-456',
  qty: 500,
  unit: 'g',
  reference_id: 'session-abc',
  reference_type: 'trim_session',
};

const validConsumePayload: CreateMovementPayload = {
  movement_kind: 'CONSUME',
  source_item_id: 'inv-item-123',
  qty: 200,
  unit: 'g',
  reference_id: 'session-abc',
  reference_type: 'trim_session',
};

describe('inventoryMovementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // validateMovement — pure synchronous logic
  // =====================================================

  describe('validateMovement', () => {
    it('accepts a valid PRODUCE movement with dest_item_id', () => {
      const result = inventoryMovementService.validateMovement(validProducePayload);
      expect(result.valid).toBe(true);
    });

    it('accepts a valid CONSUME movement with source_item_id', () => {
      const result = inventoryMovementService.validateMovement(validConsumePayload);
      expect(result.valid).toBe(true);
    });

    it('rejects CONSUME without source_item_id — decrement movements must identify the source', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'CONSUME',
        qty: 100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CONSUME requires source_item_id');
    });

    it('rejects FULFILLMENT without source_item_id — decrement movements must identify the source', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'FULFILLMENT',
        qty: 100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('FULFILLMENT requires source_item_id');
    });

    it('rejects RESERVE without source_item_id — reserve movements must identify the source', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'RESERVE',
        qty: 100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('RESERVE requires source_item_id');
    });

    it('rejects PRODUCE without dest_item_id — increment movements must identify the destination', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'PRODUCE',
        qty: 100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PRODUCE requires dest_item_id');
    });

    it('rejects RECEIPT without dest_item_id', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'RECEIPT',
        qty: 100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('RECEIPT requires dest_item_id');
    });

    it('rejects ADJUSTMENT without dest_item_id', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'ADJUSTMENT',
        qty: 100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ADJUSTMENT requires dest_item_id');
    });

    it('rejects a movement with zero quantity — per Critical Rule: qty must be positive', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'PRODUCE',
        dest_item_id: 'inv-item-456',
        qty: 0,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('quantity must be positive');
    });

    it('rejects a movement with negative quantity — direction is encoded in movement_kind, not sign', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'PRODUCE',
        dest_item_id: 'inv-item-456',
        qty: -100,
        unit: 'g',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('quantity must be positive');
    });

    it('rejects a movement with no unit — unit is required for compliance traceability', () => {
      const result = inventoryMovementService.validateMovement({
        movement_kind: 'PRODUCE',
        dest_item_id: 'inv-item-456',
        qty: 100,
        unit: '',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unit is required');
    });
  });

  // =====================================================
  // recordMovement — database write path
  // =====================================================

  describe('recordMovement', () => {
    it('inserts the correct payload and returns movement_id on success', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess({ id: 'movement-001' })
      );

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await inventoryMovementService.recordMovement(validProducePayload);

      expect(result.success).toBe(true);
      expect(result.movement_id).toBe('movement-001');
      expect(supabase.from).toHaveBeenCalledWith('inventory_movements');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_kind: 'PRODUCE',
          dest_item_id: 'inv-item-456',
          qty: 500,
          unit: 'g',
        })
      );
    });

    it('passes reason_code=session_finalization through to the DB for trigger bypass — per Architecture Decision #1', async () => {
      const payload: CreateMovementPayload = {
        ...validProducePayload,
        reason_code: 'session_finalization',
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess({ id: 'movement-002' })
      );

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      await inventoryMovementService.recordMovement(payload);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ reason_code: 'session_finalization' })
      );
    });

    it('passes optional reference_id and reference_type through to the DB for audit traceability', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess({ id: 'movement-003' })
      );

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      await inventoryMovementService.recordMovement(validProducePayload);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          reference_id: 'session-abc',
          reference_type: 'trim_session',
        })
      );
    });

    it('returns failure when validation fails — does not hit the database', async () => {
      const result = await inventoryMovementService.recordMovement({
        movement_kind: 'CONSUME',
        qty: 100,
        unit: 'g',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns failure when the database insert returns an error', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseError('insert violates row-level security policy')
      );

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await inventoryMovementService.recordMovement(validProducePayload);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('sets null for optional fields not provided in the payload', async () => {
      const minimalPayload: CreateMovementPayload = {
        movement_kind: 'PRODUCE',
        dest_item_id: 'inv-item-456',
        qty: 100,
        unit: 'g',
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess({ id: 'movement-004' })
      );

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      await inventoryMovementService.recordMovement(minimalPayload);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_item_id: null,
          reason_code: null,
          reference_id: null,
          reference_type: null,
          notes: null,
        })
      );
    });
  });

  // =====================================================
  // calculateOnHandFromMovements — ledger replay logic
  // =====================================================

  describe('calculateOnHandFromMovements', () => {
    it('returns zero when no movements exist', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
      });

      const qty = await inventoryMovementService.calculateOnHandFromMovements('inv-item-123');
      expect(qty).toBe(0);
    });

    it('correctly sums PRODUCE (increment) movements', async () => {
      const movements = [
        { movement_kind: 'PRODUCE', dest_item_id: 'inv-item-123', source_item_id: null, qty: 1000, created_at: '2026-01-01T00:00:00Z' },
        { movement_kind: 'PRODUCE', dest_item_id: 'inv-item-123', source_item_id: null, qty: 500,  created_at: '2026-01-02T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseSuccess(movements));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
      });

      const qty = await inventoryMovementService.calculateOnHandFromMovements('inv-item-123');
      expect(qty).toBe(1500);
    });

    it('correctly subtracts CONSUME (decrement) movements', async () => {
      const movements = [
        { movement_kind: 'PRODUCE',  dest_item_id: 'inv-item-123',   source_item_id: null,           qty: 1000, created_at: '2026-01-01T00:00:00Z' },
        { movement_kind: 'CONSUME',  dest_item_id: null,              source_item_id: 'inv-item-123', qty: 300,  created_at: '2026-01-02T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseSuccess(movements));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
      });

      const qty = await inventoryMovementService.calculateOnHandFromMovements('inv-item-123');
      expect(qty).toBe(700);
    });

    it('treats ADJUSTMENT as an absolute set, not a delta', async () => {
      // The service queries DESC (newest first), then reverses for chronological replay.
      // Provide ADJUSTMENT (Jan 2, newer) first in the array so that after .reverse()
      // it processes PRODUCE first, then ADJUSTMENT last — setting total to 600 (absolute).
      const movements = [
        { movement_kind: 'ADJUSTMENT', dest_item_id: 'inv-item-123', source_item_id: null, qty: 600,  created_at: '2026-01-02T00:00:00Z' },
        { movement_kind: 'PRODUCE',    dest_item_id: 'inv-item-123', source_item_id: null, qty: 1000, created_at: '2026-01-01T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseSuccess(movements));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
      });

      const qty = await inventoryMovementService.calculateOnHandFromMovements('inv-item-123');
      expect(qty).toBe(600);
    });

    it('never returns a negative quantity — floors at zero', async () => {
      const movements = [
        { movement_kind: 'PRODUCE', dest_item_id: 'inv-item-123', source_item_id: null,           qty: 100, created_at: '2026-01-01T00:00:00Z' },
        { movement_kind: 'CONSUME', dest_item_id: null,            source_item_id: 'inv-item-123', qty: 200, created_at: '2026-01-02T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseSuccess(movements));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
      });

      const qty = await inventoryMovementService.calculateOnHandFromMovements('inv-item-123');
      expect(qty).toBeGreaterThanOrEqual(0);
    });
  });
});
