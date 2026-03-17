import { createCrudService } from '@/shared/services';
import { supabase } from '@/lib/supabase';
import {
  updateCustomerGeocode,
  formatAddressForGeocoding,
  geocodeAllCustomers
} from '../../delivery/services/geocoding.service';
import type { Customer, CustomerInput, CustomerUpdate } from '../types';

const baseCrud = createCrudService<Customer, CustomerInput, CustomerUpdate>({
  tableName: 'customers',
  orderBy: { column: 'name', ascending: true },
});

async function createCustomer(input: CustomerInput): Promise<Customer> {
  const customerData: Omit<CustomerInput, 'address' | 'city' | 'state' | 'postal_code'> & {
    delivery_address: string | null;
    delivery_city: string | null;
    delivery_state: string;
    delivery_postal_code: string | null;
  } = {
    ...input,
    delivery_address: input.address || null,
    delivery_city: input.city || null,
    delivery_state: input.state || 'AZ',
    delivery_postal_code: input.postal_code || null,
  };

  return baseCrud.create(customerData as CustomerInput);
}

async function updateCustomer(id: string, input: CustomerUpdate): Promise<Customer> {
  const updateData: Omit<CustomerUpdate, 'address' | 'city' | 'state' | 'postal_code'> & {
    delivery_address?: string | null;
    delivery_city?: string | null;
    delivery_state?: string;
    delivery_postal_code?: string | null;
    updated_at: string;
  } = {
    ...input,
    delivery_address: input.address,
    delivery_city: input.city,
    delivery_state: input.state,
    delivery_postal_code: input.postal_code,
    updated_at: new Date().toISOString(),
  };

  return baseCrud.update(id, updateData as CustomerUpdate);
}

async function updateCustomerWithGeocodeCheck(
  id: string,
  input: CustomerUpdate,
  originalCustomer: Customer
): Promise<Customer> {
  const addressChanged =
    input.address !== originalCustomer.address ||
    input.city !== originalCustomer.city ||
    input.state !== originalCustomer.state ||
    input.postal_code !== originalCustomer.postal_code;

  const customer = await updateCustomer(id, input);

  if (addressChanged) {
    await supabase
      .from('customers')
      .update({
        latitude: null,
        longitude: null,
        formatted_address: null,
        geocoded_at: null,
        geocoding_error: null
      })
      .eq('id', id);

    if (input.address && input.city) {
      try {
        const addressToGeocode = formatAddressForGeocoding(
          input.address,
          input.city,
          input.state,
          input.postal_code,
          null,
          null,
          null,
          null
        );
        await updateCustomerGeocode(id, addressToGeocode);
      } catch (error) {
        console.error('Failed to geocode address:', error);
      }
    }
  }

  return customer;
}

async function geocodeCustomer(customerId: string): Promise<void> {
  const customer = await baseCrud.fetchById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const hasAddress = (customer.delivery_address || customer.address) &&
                     (customer.delivery_city || customer.city);

  if (!hasAddress) {
    throw new Error('Customer must have a complete address to geocode');
  }

  const addressToGeocode = formatAddressForGeocoding(
    customer.delivery_address || null,
    customer.delivery_city || null,
    customer.delivery_state || null,
    customer.delivery_postal_code || null,
    customer.address,
    customer.city,
    customer.state,
    customer.postal_code
  );

  await updateCustomerGeocode(customerId, addressToGeocode);
}

async function geocodeAll(): Promise<{ successful: number; failed: number; total: number; errors: any[] }> {
  return await geocodeAllCustomers();
}

async function searchCustomers(term: string): Promise<Customer[]> {
  // Simple search implementation
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${term}%,dispensary_code.ilike.%${term}%,license_number.ilike.%${term}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export const customersService = {
  ...baseCrud,
  createCustomer,
  updateCustomer,
  updateCustomerWithGeocodeCheck,
  geocodeCustomer,
  geocodeAll,
  searchCustomers,
};
