import { useState } from 'react';
import type { PackagingSessionInsert, InventoryItem } from '../types';
import { createPackagingSession } from '../services/sessions.service';

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

  const getAvailableBatchesForStrain = (strain: string) => {
    const batches = inventoryPackages
      .filter(pkg => pkg.strain === strain && pkg.batch)
      .map(pkg => pkg.batch as string);
    return [...new Set(batches)].sort();
  };

  const getPackagesForBatch = (strain: string, batchId: string) => {
    return inventoryPackages.filter(pkg =>
      pkg.strain === strain &&
      pkg.batch === batchId &&
      pkg.available_qty && pkg.available_qty > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate pull_weight against available inventory
    const selectedPackage = inventoryPackages.find(p => p.package_id === formData.package_id);
    if (!selectedPackage) {
      alert('Selected package not found. Please select a valid package.');
      return;
    }

    const pullWeight = formData.pull_weight || 0;
    const availableQty = selectedPackage.available_qty || 0;

    if (pullWeight <= 0) {
      alert('Pull weight must be greater than 0.');
      return;
    }

    if (pullWeight > availableQty) {
      alert(
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
        alert(
          'Insufficient Inventory\n\n' +
          'The selected package does not have enough available inventory for this pull weight. ' +
          'Another session may have reserved inventory since you loaded this page.\n\n' +
          'Please refresh and try again with updated inventory levels.'
        );
      } else if (error.message.includes('not found')) {
        alert(
          'Package Not Found\n\n' +
          'The selected package could not be found in inventory. ' +
          'It may have been consumed or removed.\n\n' +
          'Please refresh and select a different package.'
        );
      } else {
        alert('Error starting session: ' + error.message);
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
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </select>
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
          <button
            type="submit"
            className="bg-white text-cult-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-gray-100 transition"
          >
            Start Session
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-cult-medium-gray text-cult-white px-6 py-2 font-semibold uppercase tracking-wider hover:border-cult-white transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
