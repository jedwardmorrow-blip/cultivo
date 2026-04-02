import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryMovementService } from '@/services/inventoryMovement.service';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../mocks/supabase';
import type { CreateMovementPayload } from '@/types/movement.types';
import { errorService } from '@/services/error.service';

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

    it('returns failure with error message when retryOperation throws — catch path', async () => {
      (errorService.retryOperation as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network timeout after retries')
      );

      const result = await inventoryMovementService.recordMovement(validProducePayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout after retries');
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

    it('treats RECONCILIATION as an absolute set — resets running total to qty', async () => {
      // DESC order from DB: RECONCILIATION (Jan 2) first, PRODUCE (Jan 1) second.
      // After .reverse(), processed chronologically: PRODUCE → RECONCILIATION sets absolute 400.
      const movements = [
        { movement_kind: 'RECONCILIATION', dest_item_id: 'inv-item-123', source_item_id: null, qty: 400,  created_at: '2026-01-02T00:00:00Z' },
        { movement_kind: 'PRODUCE',        dest_item_id: 'inv-item-123', source_item_id: null, qty: 1000, created_at: '2026-01-01T00:00:00Z' },
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
      expect(qty).toBe(400);
    });

    it('correctly adds RETURN and RELEASE as increment movements', async () => {
      // DESC order: RELEASE (Jan 2) first, RETURN (Jan 1) second.
      // After .reverse(): RETURN 200 + RELEASE 150 = 350.
      const movements = [
        { movement_kind: 'RELEASE', dest_item_id: 'inv-item-123', source_item_id: null, qty: 150, created_at: '2026-01-02T00:00:00Z' },
        { movement_kind: 'RETURN',  dest_item_id: 'inv-item-123', source_item_id: null, qty: 200, created_at: '2026-01-01T00:00:00Z' },
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
      expect(qty).toBe(350);
    });

    it('correctly subtracts FULFILLMENT and RESERVE as decrement movements', async () => {
      // DESC order: RESERVE (Jan 3), FULFILLMENT (Jan 2), PRODUCE (Jan 1).
      // After .reverse(): PRODUCE 1000 - FULFILLMENT 300 - RESERVE 100 = 600.
      const movements = [
        { movement_kind: 'RESERVE',     dest_item_id: null,           source_item_id: 'inv-item-123', qty: 100,  created_at: '2026-01-03T00:00:00Z' },
        { movement_kind: 'FULFILLMENT', dest_item_id: null,           source_item_id: 'inv-item-123', qty: 300,  created_at: '2026-01-02T00:00:00Z' },
        { movement_kind: 'PRODUCE',     dest_item_id: 'inv-item-123', source_item_id: null,           qty: 1000, created_at: '2026-01-01T00:00:00Z' },
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
  });

  // =====================================================
  // getMovementHistory — query + filter options
  // =====================================================

  describe('getMovementHistory', () => {
    it('returns movement array on happy path with no options', async () => {
      const movements = [
        { id: 'mov-1', movement_kind: 'PRODUCE', dest_item_id: 'inv-item-123', source_item_id: null, qty: 100, created_at: '2026-01-01T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess(movements));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
      });

      const result = await inventoryMovementService.getMovementHistory('inv-item-123');

      expect(result).toHaveLength(1);
      expect(result[0].movement_kind).toBe('PRODUCE');
      expect(supabase.from).toHaveBeenCalledWith('inventory_movements');
    });

    it('filters by movement_kind — calls eq() with the kind value', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        eq: mockEq,
      });

      await inventoryMovementService.getMovementHistory('inv-item-123', { movement_kind: 'CONSUME' });

      expect(mockEq).toHaveBeenCalledWith('movement_kind', 'CONSUME');
    });

    it('filters by start_date — calls gte() with ISO string', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        gte: mockGte,
      });

      await inventoryMovementService.getMovementHistory('inv-item-123', { start_date: startDate });

      expect(mockGte).toHaveBeenCalledWith('created_at', startDate.toISOString());
    });

    it('filters by end_date — calls lte() with ISO string', async () => {
      const endDate = new Date('2026-02-01T00:00:00Z');

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        lte: mockLte,
      });

      await inventoryMovementService.getMovementHistory('inv-item-123', { end_date: endDate });

      expect(mockLte).toHaveBeenCalledWith('created_at', endDate.toISOString());
    });

    it('applies limit — calls limit() with provided value', async () => {
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

      await inventoryMovementService.getMovementHistory('inv-item-123', { limit: 10 });

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('applies offset using range() — defaults limit to 50 when not provided', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        range: mockRange,
      });

      await inventoryMovementService.getMovementHistory('inv-item-123', { offset: 20 });

      // offset=20, no limit so default=50: range(20, 20+50-1) = range(20, 69)
      expect(mockRange).toHaveBeenCalledWith(20, 69);
    });

    it('returns empty array on database error — does not throw', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseError('permission denied'));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
      });

      const result = await inventoryMovementService.getMovementHistory('inv-item-123');

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // getMovementStats — aggregation logic
  // =====================================================

  describe('getMovementStats', () => {
    it('returns total_movements, by_kind aggregation, and by_day grouping for mixed kinds', async () => {
      const movements = [
        { id: 'm1', movement_kind: 'PRODUCE', dest_item_id: 'inv-1', source_item_id: null, qty: 500, created_at: '2026-01-01T00:00:00Z' },
        { id: 'm2', movement_kind: 'PRODUCE', dest_item_id: 'inv-1', source_item_id: null, qty: 300, created_at: '2026-01-01T00:00:00Z' },
        { id: 'm3', movement_kind: 'CONSUME', dest_item_id: null,    source_item_id: 'inv-1', qty: 200, created_at: '2026-01-02T00:00:00Z' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockResolvedValue(mockSupabaseSuccess(movements));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
      });

      const result = await inventoryMovementService.getMovementStats();

      expect(result.total_movements).toBe(3);
      expect(result.by_kind).toHaveLength(2);
      const produceEntry = result.by_kind.find(k => k.movement_kind === 'PRODUCE');
      expect(produceEntry?.count).toBe(2);
      expect(produceEntry?.total_qty).toBe(800);
      expect(result.by_day).toHaveLength(2); // Jan 1 and Jan 2
    });

    it('applies itemId or-filter when itemId is provided', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        or: mockOr,
      });

      await inventoryMovementService.getMovementStats('inv-item-123');

      expect(mockOr).toHaveBeenCalledWith('source_item_id.eq.inv-item-123,dest_item_id.eq.inv-item-123');
    });

    it('does not apply or-filter when itemId is omitted', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn();
      const mockGte = vi.fn().mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        or: mockOr,
      });

      await inventoryMovementService.getMovementStats();

      expect(mockOr).not.toHaveBeenCalled();
    });

    it('returns zero stats on database error — does not throw', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockResolvedValue(mockSupabaseError('connection refused'));

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
      });

      const result = await inventoryMovementService.getMovementStats();

      expect(result.total_movements).toBe(0);
      expect(result.by_kind).toEqual([]);
      expect(result.by_day).toEqual([]);
    });
  });

  // =====================================================
  // verifyInventoryQuantity — reconciliation check
  // =====================================================

  describe('verifyInventoryQuantity', () => {
    it('returns matches=true and discrepancy=0 when current qty equals ledger', async () => {
      // First from() → inventory_items
      const mockItemChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ on_hand_qty: 1000 })),
      };

      // Second from() → inventory_movements (via calculateOnHandFromMovements → getMovementHistory)
      const mockMovementsChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockSupabaseSuccess([
          { movement_kind: 'PRODUCE', dest_item_id: 'inv-item-123', source_item_id: null, qty: 1000, created_at: '2026-01-01T00:00:00Z' },
        ])),
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockItemChain)
        .mockReturnValueOnce(mockMovementsChain);

      const result = await inventoryMovementService.verifyInventoryQuantity('inv-item-123');

      expect(result.matches).toBe(true);
      expect(result.current_qty).toBe(1000);
      expect(result.ledger_qty).toBe(1000);
      expect(result.discrepancy).toBe(0);
    });

    it('returns matches=false with positive discrepancy when ledger exceeds current qty', async () => {
      const mockItemChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ on_hand_qty: 800 })),
      };

      const mockMovementsChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockSupabaseSuccess([
          { movement_kind: 'PRODUCE', dest_item_id: 'inv-item-123', source_item_id: null, qty: 1000, created_at: '2026-01-01T00:00:00Z' },
        ])),
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockItemChain)
        .mockReturnValueOnce(mockMovementsChain);

      const result = await inventoryMovementService.verifyInventoryQuantity('inv-item-123');

      expect(result.matches).toBe(false);
      expect(result.discrepancy).toBe(200); // ledger(1000) - current(800)
    });

    it('rethrows error when inventory item lookup fails — catch rethrows, does not swallow', async () => {
      const mockItemChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('item not found')),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockItemChain);

      await expect(
        inventoryMovementService.verifyInventoryQuantity('inv-item-123')
      ).rejects.toBeTruthy();
    });
  });
});
