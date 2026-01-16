import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customersService } from '@/features/customers/services/customers.service';
import { supabase } from '@/lib/supabase';
import { createMockCustomer } from '../../../fixtures/mockData';
import { mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/features/delivery/services/geocoding.service', () => ({
  updateCustomerGeocode: vi.fn(),
  formatAddressForGeocoding: vi.fn((addr: string) => addr),
  geocodeAllCustomers: vi.fn(),
}));

describe('customersService', () => {
  const mockCustomer = createMockCustomer();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAll', () => {
    it('should fetch all customers', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseSuccess([mockCustomer]));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const customers = await customersService.fetchAll();

      expect(supabase.from).toHaveBeenCalledWith('customers');
      expect(mockSelect).toHaveBeenCalled();
      expect(customers).toEqual([mockCustomer]);
    });

    it('should handle fetch errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue(
        mockSupabaseError('Database connection failed')
      );

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      await expect(customersService.fetchAll()).rejects.toThrow();
    });
  });

  describe('fetchById', () => {
    it('should fetch customer by id', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue(mockSupabaseSuccess(mockCustomer));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const customer = await customersService.fetchById('cust-123');

      expect(supabase.from).toHaveBeenCalledWith('customers');
      expect(mockEq).toHaveBeenCalledWith('id', 'cust-123');
      expect(customer).toEqual(mockCustomer);
    });

    it('should return null for non-existent customer', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const customer = await customersService.fetchById('non-existent');

      expect(customer).toBeNull();
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer with delivery address fields', async () => {
      const input = {
        name: 'New Dispensary',
        address: '456 Test Ave',
        city: 'Phoenix',
        state: 'AZ',
        postal_code: '85001',
        contact_name: 'Jane Doe',
        email: 'jane@test.com',
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess({ ...mockCustomer, ...input })
      );

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      await customersService.createCustomer(input as any);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'New Dispensary',
          address: '456 Test Ave',
          city: 'Phoenix',
          state: 'AZ',
          zip: '85001',
        })
      ]);
    });
  });

  describe('updateCustomer', () => {
    it('should update customer and sync delivery fields', async () => {
      const updates = {
        name: 'Updated Name',
        address: '789 New St',
        city: 'Tempe',
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess({ ...mockCustomer, ...updates })
      );

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await customersService.updateCustomer('cust-123', updates);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          address: '789 New St',
          city: 'Tempe',
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'cust-123');
    });
  });


  describe('geocodeCustomer', () => {
    it('should throw error if customer not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      await expect(
        customersService.geocodeCustomer('non-existent')
      ).rejects.toThrow('Customer not found');
    });

    it('should throw error if customer has no address', async () => {
      const customerNoAddress = createMockCustomer({
        address: null,
        city: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue(
        mockSupabaseSuccess(customerNoAddress)
      );

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      await expect(
        customersService.geocodeCustomer('cust-123')
      ).rejects.toThrow('must have a complete address');
    });
  });

  describe('delete', () => {
    it('should delete a customer', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      await customersService.delete('cust-123');

      expect(supabase.from).toHaveBeenCalledWith('customers');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'cust-123');
    });

    it('should handle delete errors', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue(
        mockSupabaseError('Cannot delete customer')
      );

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      await expect(customersService.delete('cust-123')).rejects.toThrow();
    });
  });
});
