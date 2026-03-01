import { useState, useEffect } from 'react';
import type { PackagingSessionInsert, InventoryItem } from '../types';
import { createPackagingSession } from '../services/sessions.service';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components';
import { notificationService } from '@/services/notification.service';

const AVAILABLE_PACKAGERS = ['Laura', 'Sam', 'Viana', 'Roxy', 'Justin', 'Greg', 'Andrew', 'Leo', 'Mike', 'Josie'];

interface PackagingSessionStartFormProps {
  inventoryPackages: InventoryItem[];
  availableStrains: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackagingSessionStartForm({
  inventoryPackages,
  availableStrains,
  onSuccess,
  onCancel
}: PackagingSessionStartFormProps) {
  const [formData, setFormData] = useState<Partial<PackagingSessionInsert>>({
    packager_name: '',
    strain: '',
    package_id: '',
    batch_id: '',
    package_weight: 0,
    pull_weight: 0,
    notes: ''
  });

  const [coaStatus, setCoaStatus] = useState<{
    loading: boolean;
    hasValidCoa: boolean | null;
    batchRegistryId: string | null;
  }>({
    loading: false,
    hasValidCoa: null,
    batchRegistryId: null,
  });

  // Check COA status when batch is selected
  useEffect(() => {
    const checkCoaStatus = async () => {
      if (!formData.batch_id) {
        setCoaStatus({ loading: false, hasValidCoa: null, batchRegistryId: null });
        return;
      }

      setCoaStatus(prev => ({ ...prev, loading: true }));

      try {
        // formData.batch_id now contains the UUID, not batch_number
        // Check for active COA directly using the batch_id
        const { data: coaData, error: coaError } = await supabase
          .from('certificates_of_analysis')
          .select('id')
          .eq('batch_id', formData.batch_id)
          .eq('is_active', true)
          .limit(1);

        if (coaError) {
          console.error('Error fetching COA:', coaError);
          setCoaStatus({ loading: false, hasValidCoa: null, batchRegistryId: formData.batch_id });
          return;
        }

        const hasValidCoa = (coaData && coaData.length > 0);
        setCoaStatus({
          loading: false,
          hasValidCoa,
          batchRegistryId: formData.batch_id
        });
      } catch (error) {
        console.error('Unexpected error checking COA:', error);
        setCoaStatus({ loading: false, hasValidCoa: null, batchRegistryId: null });
      }
    };

    checkCoaStatus();
  }, [formData.batch_id]);

  const getAvailableBatchesForStrain = (strain: string) => {
    if (!strain || !inventoryPackages || inventoryPackages.length === 0) {
      return [];
    }

    // Create a map to store unique batch_number mappings
    // CRITICAL: Key by batch_number (text) NOT batch_id (UUID) to ensure correct database format
    const batchMap = new Map<string, { batch_id: string; batch_number: string }>();

    inventoryPackages
      .filter((pkg: any) => pkg && pkg.strain === strain && pkg.batch_number)
      .forEach((pkg: any) => {
        if (!batchMap.has(pkg.batch_number)) {
          batchMap.set(pkg.batch_number, {
            batch_id: pkg.batch_id,
            batch_number: pkg.batch_number
          });
        }
      });

    // Return array sorted by batch_number
    return Array.from(batchMap.values()).sort((a, b) =>
      a.batch_number.localeCompare(b.batch_number)
    );
  };

  const getPackagesForBatch = (strain: string, batchNumber: string) => {
    return inventoryPackages.filter((pkg: any) =>
      pkg.strain === strain &&
      pkg.batch_number === batchNumber &&
      pkg.available_qty && pkg.available_qty > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate pull_weight against available inventory
    const selectedPackage = inventoryPackages.find(p => p.package_id === formData.package_id);
    if (!selectedPackage) {
      notificationService.warning('Selected package not found. Please select a valid package.');
      return;
    }

    const pullWeight = formData.pull_weight || 0;
    const availableQty = selectedPackage.available_qty || 0;

    if (pullWeight <= 0) {
      notificationService.warning('Pull weight must be greater than 0.');
      return;
    }

    if (pullWeight > availableQty) {
      notificationService.warning(
        `Insufficient inventory!\n\n` +
        `Package ${formData.package_id} has ${availableQty.toFixed(1)}g available.\n` +
        `You are trying to pull ${pullWeight.toFixed(1)}g.\n\n` +
        `Please reduce the pull weight or select a different package.`
      );
      return;
    }

    // Attempt to create the session
    const { error } = await createPackagingSession({
      ...formData,
      session_status: 'active',
      session_date: new Date().toISOString().split('T')[0]
    } as PackagingSessionInsert);

    if (error) {
      console.error('Error starting packaging session:', error);

      // Parse error message for user-friendly display
      if (error.message.includes('Insufficient inventory')) {
        notificationService.error(
          'Insufficient Inventory\n\n' +
          'The selected package does not have enough available inventory for this pull weight. ' +
          'Another session may have reserved inventory since you loaded this page.\n\n' +
          'Please refresh and try again with updated inventory levels.'
        );
      } else if (error.message.includes('not found')) {
        notificationService.error(
          'Package Not Found\n\n' +
          'The selected package could not be found in inventory. ' +
          'It may have been consumed or removed.\n\n' +
          'Please refresh and select a different package.'
        );
      } else if (error.message.includes('Certificate of Analysis') || error.message.includes('COA')) {
        notificationService.error(
          'COA Required\n\n' +
          error.message + '\n\n' +
          'Please upload a Certificate of Analysis in the Batches section before packaging this batch.'
        );
      } else {
        notificationService.error('Error starting session: ' + error.message);
      }
    } else {
      onSuccess();
    }
  };

  return (
    <div className="bg-cult-near-black p-6 rounded-lg shadow-xl border-2 border-cult-green mb-6">
      <h2 className="text-2xl font-bold mb-6 text-cult-white uppercase tracking-wide">Start New Packaging Session</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Packager*</label>
            <select
              value={formData.packager_name || ''}
              onChange={(e) => setFormData({ ...formData, packager_name: e.target.value })}
              className="w-full px-3 py-2 bg-cult-black text-cult-off-white border border-cult-charcoal rounded-cult focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all duration-300"
              required
            >
              <option value="">Select Packager</option>
              {AVAILABLE_PACKAGERS.map(packager => (
                <option key={packager} value={packager}>{packager}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Strain* {availableStrains.length > 0 && <span className="text-xs text-cult-light-gray">({availableStrains.length} with bulk inventory)</span>}
            </label>
            <select
              value={formData.strain || ''}
              onChange={(e) => setFormData({ ...formData, strain: e.target.value, package_id: '', batch_id: '' })}
              className="w-full px-3 py-2 bg-cult-black text-cult-off-white border border-cult-charcoal rounded-cult focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all duration-300"
              required
            >
              <option value="">Select Strain First</option>
              {availableStrains.map(strain => {
                const batchCount = inventoryPackages.filter(pkg => pkg.strain === strain).length;
                return (
                  <option key={strain} value={strain}>
                    {strain} ({batchCount} {batchCount === 1 ? 'batch' : 'batches'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Batch ID*
              {formData.strain && getAvailableBatchesForStrain(formData.strain).length > 0 && (
                <span className="text-xs text-cult-light-gray ml-1">
                  ({getAvailableBatchesForStrain(formData.strain).length} available)
                </span>
              )}
            </label>
            <select
              value={formData.batch_id}
              onChange={(e) => setFormData({ ...formData, batch_id: e.target.value, package_id: '' })}
              className="w-full px-3 py-2 bg-cult-dark-gray text-cult-white border border-cult-medium-gray rounded focus:ring-2 focus:ring-cult-green focus:border-cult-green disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={!formData.strain}
            >
              <option value="">{formData.strain ? 'Select Batch ID' : 'Select strain first'}</option>
              {getAvailableBatchesForStrain(formData.strain || '').map(batch => (
                <option key={batch.batch_number} value={batch.batch_number}>
                  {batch.batch_number}
                </option>
              ))}
            </select>

            {/* COA Status Indicator */}
            {formData.batch_id && (
              <div className="mt-2">
                {coaStatus.loading ? (
                  <div className="flex items-center gap-2 text-sm text-cult-light-gray">
                    <div className="animate-spin h-4 w-4 border-2 border-cult-light-gray border-t-transparent rounded-full"></div>
                    <span>Checking COA status...</span>
                  </div>
                ) : coaStatus.hasValidCoa === true ? (
                  <div className="flex items-center gap-2 text-sm text-cult-green">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Valid COA on file</span>
                  </div>
                ) : coaStatus.hasValidCoa === false ? (
                  <div className="flex items-center gap-2 text-sm text-yellow-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">No COA found - upload required before packaging</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Package ID*
              {formData.batch_id && getPackagesForBatch(formData.strain || '', formData.batch_id).length > 0 && (
                <span className="text-xs text-cult-light-gray ml-1">
                  ({getPackagesForBatch(formData.strain || '', formData.batch_id).length} available)
                </span>
              )}
            </label>
            <select
              value={formData.package_id}
              onChange={(e) => {
                const selectedPackage = inventoryPackages.find(p => p.package_id === e.target.value);
                if (selectedPackage) {
                  setFormData({
                    ...formData,
                    package_id: e.target.value,
                    package_weight: selectedPackage.available_qty || 0
                  });
                } else {
                  setFormData({ ...formData, package_id: e.target.value });
                }
              }}
              className="w-full px-3 py-2 bg-cult-dark-gray text-cult-white border border-cult-medium-gray rounded focus:ring-2 focus:ring-cult-green focus:border-cult-green disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={!formData.batch_id}
            >
              <option value="">{formData.batch_id ? 'Select Package ID' : 'Select batch first'}</option>
              {getPackagesForBatch(formData.strain || '', formData.batch_id || '').map(pkg => {
                const productType = pkg.product_name?.includes('Flower') ? 'Flower' : 'Smalls';
                return (
                  <option key={pkg.id} value={pkg.package_id}>
                    {pkg.package_id} ({productType}, {(pkg.available_qty || 0).toFixed(0)}g)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Available in Package (g)
              {formData.package_id && (
                <span className="ml-2 text-xs text-cult-green font-bold">
                  {(inventoryPackages.find(p => p.package_id === formData.package_id)?.available_qty || 0).toFixed(1)}g
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.package_weight}
              onChange={(e) => setFormData({ ...formData, package_weight: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-cult-black text-cult-off-white border border-cult-charcoal rounded-cult focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all duration-300"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Pull Weight (g)*
              {formData.pull_weight > 0 && formData.package_id && (
                <span className={`ml-2 text-xs font-bold ${
                  formData.pull_weight <= (inventoryPackages.find(p => p.package_id === formData.package_id)?.available_qty || 0)
                    ? 'text-cult-green'
                    : 'text-red-500'
                }`}>
                  {formData.pull_weight <= (inventoryPackages.find(p => p.package_id === formData.package_id)?.available_qty || 0)
                    ? '✓ Valid'
                    : '✗ Exceeds available'}
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.pull_weight || ''}
              onChange={(e) => setFormData({ ...formData, pull_weight: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-cult-black text-cult-off-white border border-cult-charcoal rounded-cult focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all duration-300"
              required
              min="0.1"
              max={inventoryPackages.find(p => p.package_id === formData.package_id)?.available_qty || undefined}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-1">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-cult-dark-gray text-cult-white border border-cult-medium-gray rounded focus:ring-2 focus:ring-cult-green focus:border-cult-green placeholder-cult-light-gray"
            rows={2}
            placeholder="Any notes..."
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" size="sm">
            Start Session
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
