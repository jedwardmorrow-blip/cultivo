import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';
import { createMockOrder } from '../../../fixtures/mockData';

vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

import { supabase } from '@/lib/supabase';
import { ordersDataService } from '@/features/orders/services/ordersService';

const mockClient = supabase as ReturnType<typeof createMockSupabaseClient>;

describe('ordersDataService — status transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateOrderStatus', () => {
    it('transitions order from pending to confirmed', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.updateOrderStatus('order-123', 'confirmed')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.from).toHaveBeenCalledWith('orders');
      expect(mockClient.mocks.update).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(mockClient.mocks.eq).toHaveBeenCalledWith('id', 'order-123');
    });

    it('transitions order from confirmed to ready_for_delivery', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.updateOrderStatus('order-123', 'ready_for_delivery')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.update).toHaveBeenCalledWith({ status: 'ready_for_delivery' });
    });

    it('transitions order to completed', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.updateOrderStatus('order-123', 'completed')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.update).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('transitions order to cancelled', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.updateOrderStatus('order-123', 'cancelled')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.update).toHaveBeenCalledWith({ status: 'cancelled' });
    });

    it('throws when the database returns an error', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(
        mockSupabaseError('Order not found', 'PGRST116')
      );

      await expect(
        ordersDataService.updateOrderStatus('order-bad', 'confirmed')
      ).rejects.toMatchObject({ message: 'Order not found' });
    });

    it('sends the update to the orders table, not order_items', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await ordersDataService.updateOrderStatus('order-123', 'pending');

      expect(mockClient.mocks.from).toHaveBeenCalledWith('orders');
      expect(mockClient.mocks.from).not.toHaveBeenCalledWith('order_items');
    });
  });

  describe('updateItemStatus', () => {
    it('updates a single order item status', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.updateItemStatus('item-123', 'packaging')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.from).toHaveBeenCalledWith('order_items');
      expect(mockClient.mocks.update).toHaveBeenCalledWith({ status: 'packaging' });
      expect(mockClient.mocks.eq).toHaveBeenCalledWith('id', 'item-123');
    });

    it('throws when item update fails', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(
        mockSupabaseError('Foreign key violation', '23503')
      );

      await expect(
        ordersDataService.updateItemStatus('item-bad', 'packaging')
      ).rejects.toMatchObject({ message: 'Foreign key violation' });
    });
  });

  describe('archiveOrder', () => {
    it('sets archived flag to true', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.archiveOrder('order-123')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.update).toHaveBeenCalledWith({ archived: true });
      expect(mockClient.mocks.eq).toHaveBeenCalledWith('id', 'order-123');
    });

    it('throws when archive fails', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseError('DB error'));

      await expect(
        ordersDataService.archiveOrder('order-123')
      ).rejects.toMatchObject({ message: 'DB error' });
    });
  });

  describe('fetchOrders — status filtering', () => {
    it('excludes cancelled orders by default', async () => {
      const orders = [createMockOrder({ status: 'pending' })];
      mockClient.mocks.order.mockResolvedValueOnce(mockSupabaseSuccess(orders));

      const result = await ordersDataService.fetchOrders();

      expect(mockClient.mocks.neq).toHaveBeenCalledWith('status', 'cancelled');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('excludes archived orders when includeArchived is false', async () => {
      const orders = [createMockOrder()];
      mockClient.mocks.order.mockResolvedValueOnce(mockSupabaseSuccess(orders));

      await ordersDataService.fetchOrders(false);

      expect(mockClient.mocks.eq).toHaveBeenCalledWith('archived', false);
    });

    it('does not filter archived orders when includeArchived is true', async () => {
      const orders = [createMockOrder(), createMockOrder({ id: 'order-456', is_archived: true })];
      mockClient.mocks.order.mockResolvedValueOnce(mockSupabaseSuccess(orders));

      await ordersDataService.fetchOrders(true);

      const eqCalls = mockClient.mocks.eq.mock.calls;
      const archivedFilterApplied = eqCalls.some(
        ([col, val]) => col === 'archived' && val === false
      );
      expect(archivedFilterApplied).toBe(false);
    });

    it('returns empty array when no orders match', async () => {
      mockClient.mocks.order.mockResolvedValueOnce(mockSupabaseSuccess([]));

      const result = await ordersDataService.fetchOrders();

      expect(result).toEqual([]);
    });

    it('throws when fetch fails', async () => {
      mockClient.mocks.order.mockResolvedValueOnce(mockSupabaseError('Connection timeout'));

      await expect(ordersDataService.fetchOrders()).rejects.toMatchObject({
        message: 'Connection timeout',
      });
    });
  });

  describe('updateDeliveryDate', () => {
    it('updates the requested_delivery_date field', async () => {
      const newDate = '2026-03-15';
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await ordersDataService.updateDeliveryDate('order-123', newDate);

      expect(mockClient.mocks.update).toHaveBeenCalledWith({
        requested_delivery_date: newDate,
      });
    });
  });

  describe('deleteOrder', () => {
    it('deletes the order by id', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await expect(
        ordersDataService.deleteOrder('order-123')
      ).resolves.toBeUndefined();

      expect(mockClient.mocks.from).toHaveBeenCalledWith('orders');
      expect(mockClient.mocks.delete).toHaveBeenCalled();
      expect(mockClient.mocks.eq).toHaveBeenCalledWith('id', 'order-123');
    });

    it('throws when delete fails', async () => {
      mockClient.mocks.eq.mockResolvedValueOnce(mockSupabaseError('Cannot delete'));

      await expect(
        ordersDataService.deleteOrder('order-123')
      ).rejects.toMatchObject({ message: 'Cannot delete' });
    });
  });

  describe('addItemToOrder', () => {
    it('inserts item with trimming as default status', async () => {
      mockClient.mocks.insert.mockResolvedValueOnce(mockSupabaseSuccess(null));

      await ordersDataService.addItemToOrder('order-123', 'prod-123', 5, 1200);

      expect(mockClient.mocks.insert).toHaveBeenCalledWith({
        order_id: 'order-123',
        product_id: 'prod-123',
        quantity: 5,
        unit_price: 1200,
        status: 'trimming',
      });
    });
  });
});
