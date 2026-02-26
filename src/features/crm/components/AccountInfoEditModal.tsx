import { useState, useEffect, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { BaseModal, BaseForm, FormField, FormInput } from '@/shared/components';
import type { AccountSummary, AccountInfoInput } from '../types';

interface AccountInfoEditModalProps {
  account: AccountSummary;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: AccountInfoInput) => Promise<void>;
}

const PAYMENT_TERMS_OPTIONS = [
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Due on Receipt',
  'COD',
];

const DELIVERY_DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

function buildInitialData(account: AccountSummary): AccountInfoInput {
  return {
    name: account.name,
    contact_name: account.contact_name || '',
    email: account.email || '',
    phone: account.phone || '',
    address: account.delivery_address || account.address || '',
    city: account.delivery_city || account.city || '',
    state: account.delivery_state || account.state || 'AZ',
    postal_code: account.delivery_postal_code || account.postal_code || '',
    license_name: account.license_name || '',
    license_number: account.license_number || '',
    ato_number: account.ato_number || '',
    default_payment_terms: account.default_payment_terms || 'Net 30',
    preferred_delivery_day: account.preferred_delivery_day || '',
    notes: account.notes || '',
  };
}

export function AccountInfoEditModal({ account, isOpen, onClose, onSave }: AccountInfoEditModalProps) {
  const [formData, setFormData] = useState<AccountInfoInput>(() => buildInitialData(account));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialData(account));
    }
  }, [account, isOpen]);

  const isDirty = useMemo(() => {
    const initial = buildInitialData(account);
    return (Object.keys(initial) as (keyof AccountInfoInput)[]).some(
      (key) => (formData[key] || '') !== (initial[key] || '')
    );
  }, [formData, account]);

  const isValid = formData.name.trim() !== '';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (field: keyof AccountInfoInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Account Info"
      icon={<Building2 className="w-6 h-6" />}
      maxWidth="3xl"
      isDirty={isDirty}
      closeOnEscape
    >
      <BaseForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        isValid={isValid}
        submitLabel="Save Changes"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider border-b border-cult-medium-gray pb-2">
              Dispensary Identity
            </h3>

            <FormField label="Dispensary Name" required>
              <FormInput
                value={formData.name}
                onChange={(v) => update('name', v)}
                placeholder="Dispensary name"
              />
            </FormField>

            <div className="flex items-center gap-2 text-xs text-cult-light-gray">
              <span className="font-mono bg-cult-dark-gray px-2 py-1 rounded text-cult-silver">
                {account.dispensary_code}
              </span>
              <span>Dispensary code (read-only)</span>
            </div>

            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider border-b border-cult-medium-gray pb-2 mt-6">
              Contact Information
            </h3>

            <FormField label="Contact Name">
              <FormInput
                value={formData.contact_name || ''}
                onChange={(v) => update('contact_name', v)}
                placeholder="Primary contact name"
              />
            </FormField>

            <FormField label="Email">
              <FormInput
                type="email"
                value={formData.email || ''}
                onChange={(v) => update('email', v)}
                placeholder="contact@dispensary.com"
              />
            </FormField>

            <FormField label="Phone">
              <FormInput
                type="tel"
                value={formData.phone || ''}
                onChange={(v) => update('phone', v)}
                placeholder="(480) 555-1234"
              />
            </FormField>

            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider border-b border-cult-medium-gray pb-2 mt-6">
              Account Settings
            </h3>

            <FormField label="Payment Terms">
              <select
                value={formData.default_payment_terms || 'Net 30'}
                onChange={(e) => update('default_payment_terms', e.target.value)}
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-4 py-2 focus:outline-none focus:border-cult-white transition-colors"
              >
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Preferred Delivery Day">
              <select
                value={formData.preferred_delivery_day || ''}
                onChange={(e) => update('preferred_delivery_day', e.target.value)}
                className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-4 py-2 focus:outline-none focus:border-cult-white transition-colors"
              >
                <option value="">No preference</option>
                {DELIVERY_DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider border-b border-cult-medium-gray pb-2">
              Delivery Address
            </h3>

            <FormField label="Street Address">
              <FormInput
                value={formData.address || ''}
                onChange={(v) => update('address', v)}
                placeholder="123 Main St"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="City">
                <FormInput
                  value={formData.city || ''}
                  onChange={(v) => update('city', v)}
                  placeholder="Phoenix"
                />
              </FormField>

              <FormField label="State">
                <FormInput
                  value={formData.state || 'AZ'}
                  onChange={(v) => update('state', v)}
                  placeholder="AZ"
                  maxLength={2}
                />
              </FormField>
            </div>

            <FormField label="Postal Code">
              <FormInput
                value={formData.postal_code || ''}
                onChange={(v) => update('postal_code', v)}
                placeholder="85001"
                maxLength={10}
              />
            </FormField>

            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider border-b border-cult-medium-gray pb-2 mt-6">
              License & Compliance
            </h3>

            <FormField label="License Name" helpText="Business name on license (if different)">
              <FormInput
                value={formData.license_name || ''}
                onChange={(v) => update('license_name', v)}
                placeholder="Legal business name"
              />
            </FormField>

            <FormField label="License Number">
              <FormInput
                value={formData.license_number || ''}
                onChange={(v) => update('license_number', v)}
                placeholder="00000000000000000000"
              />
            </FormField>

            <FormField label="ATO Number" helpText="AZDHS Transport Order number">
              <FormInput
                value={formData.ato_number || ''}
                onChange={(v) => update('ato_number', v)}
                placeholder="ATO-123456"
              />
            </FormField>

            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider border-b border-cult-medium-gray pb-2 mt-6">
              Notes
            </h3>

            <textarea
              value={formData.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              placeholder="Internal notes about this account..."
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-4 py-2 focus:outline-none focus:border-cult-white transition-colors placeholder-cult-lighter-gray resize-none"
            />
          </div>
        </div>
      </BaseForm>
    </BaseModal>
  );
}
