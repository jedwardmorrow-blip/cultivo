import { useState } from 'react';
import { customersService } from '../services/customers.service';
import type { Customer, CustomerInput, CustomerUpdate } from '../types';

export function useCustomerMutations() {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingCustomerId, setGeocodingCustomerId] = useState<string | null>(null);
  const [isGeocodingAll, setIsGeocodingAll] = useState(false);

  async function create(input: CustomerInput): Promise<Customer> {
    setIsCreating(true);
    try {
      const result = await customersService.createCustomer(input);
      return result;
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function update(id: string, input: CustomerUpdate, originalCustomer?: Customer): Promise<Customer> {
    setIsUpdating(true);
    try {
      const result = originalCustomer
        ? await customersService.updateCustomerWithGeocodeCheck(id, input, originalCustomer)
        : await customersService.updateCustomer(id, input);
      return result;
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      throw new Error(`Failed to update customer: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  }

  async function deleteCustomer(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await customersService.delete(id);
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      throw new Error(`Failed to delete customer: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  async function geocode(customerId: string): Promise<void> {
    setIsGeocoding(true);
    setGeocodingCustomerId(customerId);
    try {
      await customersService.geocodeCustomer(customerId);
    } catch (error: any) {
      console.error('Failed to geocode customer:', error);
      alert(`Failed to geocode: ${error.message}`);
      throw error;
    } finally {
      setIsGeocoding(false);
      setGeocodingCustomerId(null);
    }
  }

  async function geocodeAll(): Promise<void> {
    if (!confirm('This will geocode all customers without coordinates. Continue?')) {
      return;
    }

    setIsGeocodingAll(true);
    try {
      const result = await customersService.geocodeAll();
      alert(`Geocoding complete:\n${result.successful} successful\n${result.failed} failed\n${result.total} total`);
    } catch (error: any) {
      console.error('Failed to geocode all customers:', error);
      alert(`Failed to geocode customers: ${error.message}`);
      throw error;
    } finally {
      setIsGeocodingAll(false);
    }
  }

  return {
    create,
    update,
    delete: deleteCustomer,
    geocode,
    geocodeAll,
    isCreating,
    isUpdating,
    isDeleting,
    isGeocoding,
    geocodingCustomerId,
    isGeocodingAll,
  };
}
