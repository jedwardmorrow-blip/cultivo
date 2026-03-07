import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, LoadingSpinner, ErrorDisplay } from '@/shared/components';
import { useCustomers } from '../hooks/useCustomers';
import { useCustomerMutations } from '../hooks/useCustomerMutations';
import { CustomersList } from './CustomersList';
import { CustomerForm } from './CustomerForm';
import { CustomersFilters } from './CustomersFilters';
import type { Customer } from '../types';

export function CustomersManagement() {
  const {
    customers,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    reload,
    geocodedCount,
    missingGeocodeCount,
    totalCount,
  } = useCustomers();

  const {
    create,
    update,
    delete: deleteCustomer,
    geocode,
    geocodeAll,
    isCreating,
    isUpdating,
    isGeocoding,
    geocodingCustomerId,
    isGeocodingAll,
  } = useCustomerMutations();

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setShowForm(true);
  };

  const handleSave = async (input: any, originalCustomer?: Customer) => {
    if (selectedCustomer) {
      await update(selectedCustomer.id, input, originalCustomer);
    } else {
      await create(input);
    }
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteCustomer(id);
    await reload();
  };

  const handleGeocode = async (id: string) => {
    await geocode(id);
    await reload();
  };

  const handleGeocodeAll = async () => {
    await geocodeAll();
    await reload();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={typeof error === 'string' ? error : error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
            Customers Management
          </h2>
          <p className="text-cult-light-gray mt-1">
            Manage dispensary customers and delivery information
          </p>
        </div>
        <Button
          onClick={handleCreate}
          icon={<Plus className="w-5 h-5" />}
        >
          Add Customer
        </Button>
      </div>

      <CustomersFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onGeocodeAll={handleGeocodeAll}
        isGeocodingAll={isGeocodingAll}
        geocodedCount={geocodedCount}
        missingGeocodeCount={missingGeocodeCount}
        totalCount={totalCount}
      />

      <CustomersList
        customers={customers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onGeocode={handleGeocode}
        isGeocoding={isGeocoding}
        geocodingCustomerId={geocodingCustomerId}
      />

      <CustomerForm
        customer={selectedCustomer}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
}
