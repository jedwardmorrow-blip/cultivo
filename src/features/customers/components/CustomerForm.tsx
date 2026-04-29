import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { BaseModal, BaseForm, FormField, FormInput } from '@/shared/components';
import type { Customer, CustomerInput } from '../types';

interface CustomerFormProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CustomerInput, originalCustomer?: Customer) => Promise<void>;
  isSubmitting?: boolean;
}

export function CustomerForm({ customer, isOpen, onClose, onSave, isSubmitting }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerInput>({
    name: '',
    dispensary_code: '',
    license_name: '',
    license_number: '',
    ato_number: '',
    address: '',
    city: '',
    state: 'AZ',
    postal_code: '',
    contact_name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        dispensary_code: customer.dispensary_code,
        license_name: customer.license_name || '',
        license_number: customer.license_number || '',
        ato_number: customer.ato_number || '',
        address: customer.delivery_address || customer.address || '',
        city: customer.delivery_city || customer.city || '',
        state: customer.delivery_state || customer.state || 'AZ',
        postal_code: customer.delivery_postal_code || customer.postal_code || '',
        contact_name: customer.contact_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      });
    } else {
      setFormData({
        name: '',
        dispensary_code: '',
        license_name: '',
        license_number: '',
        ato_number: '',
        address: '',
        city: '',
        state: 'AZ',
        postal_code: '',
        contact_name: '',
        email: '',
        phone: '',
      });
    }
  }, [customer, isOpen]);

  const handleSubmit = async () => {
    await onSave(formData, customer || undefined);
    onClose();
  };

  const isValid = formData.name.trim() !== '' && formData.dispensary_code.trim() !== '';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      icon={<Building2 className="w-6 h-6" />}
      maxWidth="3xl"
    >
      <BaseForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        isValid={isValid}
        submitLabel={customer ? 'Update Customer' : 'Add Customer'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cult-text-primary uppercase tracking-wider border-b border-cult-border pb-2">
              Basic Information
            </h3>

            <FormField label="Customer Name" required>
              <FormInput
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                placeholder="Dispensary name"
              />
            </FormField>

            <FormField label="Dispensary Code" required helpText="Short code for order numbers">
              <FormInput
                value={formData.dispensary_code}
                onChange={(value) => setFormData({ ...formData, dispensary_code: value.toUpperCase() })}
                placeholder="ABC"
                maxLength={10}
              />
            </FormField>

            <h3 className="text-lg font-bold text-cult-text-primary uppercase tracking-wider border-b border-cult-border pb-2 mt-6">
              License Information
            </h3>

            <FormField label="License Name" helpText="Business name on license (if different)">
              <FormInput
                value={formData.license_name || ''}
                onChange={(value) => setFormData({ ...formData, license_name: value })}
                placeholder="Legal business name"
              />
            </FormField>

            <FormField label="License Number">
              <FormInput
                value={formData.license_number || ''}
                onChange={(value) => setFormData({ ...formData, license_number: value })}
                placeholder="00000000000000000000"
              />
            </FormField>

            <FormField label="ATO Number" helpText="AZDHS Transport Order number">
              <FormInput
                value={formData.ato_number || ''}
                onChange={(value) => setFormData({ ...formData, ato_number: value })}
                placeholder="ATO-123456"
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cult-text-primary uppercase tracking-wider border-b border-cult-border pb-2">
              Delivery Address
            </h3>

            <FormField label="Street Address">
              <FormInput
                value={formData.address || ''}
                onChange={(value) => setFormData({ ...formData, address: value })}
                placeholder="123 Main St"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="City">
                <FormInput
                  value={formData.city || ''}
                  onChange={(value) => setFormData({ ...formData, city: value })}
                  placeholder="Phoenix"
                />
              </FormField>

              <FormField label="State">
                <FormInput
                  value={formData.state || 'AZ'}
                  onChange={(value) => setFormData({ ...formData, state: value })}
                  placeholder="AZ"
                  maxLength={2}
                />
              </FormField>
            </div>

            <FormField label="Postal Code">
              <FormInput
                value={formData.postal_code || ''}
                onChange={(value) => setFormData({ ...formData, postal_code: value })}
                placeholder="85001"
                maxLength={10}
              />
            </FormField>

            <h3 className="text-lg font-bold text-cult-text-primary uppercase tracking-wider border-b border-cult-border pb-2 mt-6">
              Contact Information
            </h3>

            <FormField label="Contact Name">
              <FormInput
                value={formData.contact_name || ''}
                onChange={(value) => setFormData({ ...formData, contact_name: value })}
                placeholder="John Doe"
              />
            </FormField>

            <FormField label="Email" helpText="Separate multiple emails with commas">
              <FormInput
                type="text"
                value={formData.email || ''}
                onChange={(value) => setFormData({ ...formData, email: value })}
                placeholder="buyer@dispensary.com, manager@dispensary.com"
              />
            </FormField>

            <FormField label="Phone">
              <FormInput
                type="tel"
                value={formData.phone || ''}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                placeholder="(480) 555-1234"
              />
            </FormField>
          </div>
        </div>
      </BaseForm>
    </BaseModal>
  );
}
