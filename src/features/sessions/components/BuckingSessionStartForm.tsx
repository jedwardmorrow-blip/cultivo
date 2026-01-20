import { useState } from 'react';
import type { BuckingSessionInsert, InventoryItem } from '../types';
import { createBuckingSession } from '../services/sessions.service';
import { AVAILABLE_BUCKERS } from '../hooks/useBuckingData';

interface BuckingSessionStartFormProps {
  binnedPackages: InventoryItem[];
  availableStrains: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function BuckingSessionStartForm({
  binnedPackages,
  availableStrains,
  onSuccess,
  onCancel,
}: BuckingSessionStartFormProps) {
  const [form, setForm] = useState<Partial<BuckingSessionInsert>>({
    bucker_name: '',
    strain: '',
    batch_id: '',
    binned_package_id: '',
    binned_weight_grams: 0,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field: keyof BuckingSessionInsert, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getBatchesForStrain = (strain: string) => {
    if (!strain || !binnedPackages || binnedPackages.length === 0) {
      return [];
    }

    // Create a map to store unique batch_id -> batch_number mappings
    const batchMap = new Map<string, { batch_id: string; batch_number: string }>();

    binnedPackages
      .filter((pkg: any) => pkg && pkg.strain === strain && pkg.batch_id)
      .forEach((pkg: any) => {
        if (!batchMap.has(pkg.batch_id)) {
          batchMap.set(pkg.batch_id, {
            batch_id: pkg.batch_id,
            batch_number: pkg.batch_number || pkg.batch_id // Fallback to UUID if missing
          });
        }
      });

    // Return array sorted by batch_number
    return Array.from(batchMap.values()).sort((a, b) =>
      a.batch_number.localeCompare(b.batch_number)
    );
  };

  const getPackagesForBatch = (strain: string, batchId: string) => {
    return binnedPackages.filter((pkg: any) =>
      pkg.strain === strain &&
      pkg.batch_id === batchId &&
      pkg.available_qty && pkg.available_qty > 0
    );
  };

  const batches: Array<{ batch_id: string; batch_number: string }> = form.strain ? getBatchesForStrain(form.strain) : [];
  const packages = form.strain && form.batch_id ? getPackagesForBatch(form.strain, form.batch_id) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate binned_weight_grams against available inventory
    const selectedPackage = binnedPackages.find(p => p.package_id === form.binned_package_id);
    if (!selectedPackage) {
      alert('Selected package not found. Please select a valid package.');
      return;
    }

    const pullWeight = form.binned_weight_grams || 0;
    const availableQty = selectedPackage.available_qty || 0;

    if (pullWeight <= 0) {
      alert('Binned weight must be greater than 0.');
      return;
    }

    if (pullWeight > availableQty) {
      alert(
        `Insufficient inventory!\n\n` +
        `Package ${form.binned_package_id} has ${availableQty.toFixed(1)}g available.\n` +
        `You are trying to pull ${pullWeight.toFixed(1)}g.\n\n` +
        `Please reduce the weight or select a different package.`
      );
      return;
    }

    setSubmitting(true);

    const { error } = await createBuckingSession({
      bucker_name: form.bucker_name!,
      binned_package_id: form.binned_package_id!,
      binned_weight_grams: form.binned_weight_grams!,
      strain: form.strain!,
      batch_id: form.batch_id!,
      notes: form.notes || null,
      session_status: 'active',
    });

    setSubmitting(false);

    if (error) {
      console.error('Error starting bucking session:', error);

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
      <h2 className="text-2xl font-bold mb-6 text-cult-white uppercase tracking-wide">
        Start New Bucking Session
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Bucker*</label>
            <select
              value={form.bucker_name || ''}
              onChange={(e) => onChange('bucker_name', e.target.value)}
              required
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
            >
              <option value="">Select bucker</option>
              {AVAILABLE_BUCKERS.map(bucker => (
                <option key={bucker} value={bucker}>{bucker}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Strain*</label>
            <select
              value={form.strain || ''}
              onChange={(e) => {
                onChange('strain', e.target.value);
                onChange('batch_id', '');
                onChange('binned_package_id', '');
              }}
              required
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
            >
              <option value="">Select strain</option>
              {availableStrains.map(strain => (
                <option key={strain} value={strain}>{strain}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Batch ID*</label>
            <select
              value={form.batch_id || ''}
              onChange={(e) => {
                onChange('batch_id', e.target.value);
                onChange('binned_package_id', '');
              }}
              required
              disabled={!form.strain}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            >
              <option value="">Select batch</option>
              {batches.map(batch => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Binned Package ID*</label>
            <select
              value={form.binned_package_id || ''}
              onChange={(e) => {
                const selectedPkg = packages.find(p => p.package_id === e.target.value);
                onChange('binned_package_id', e.target.value);
                if (selectedPkg) {
                  onChange('binned_weight_grams', selectedPkg.available_qty || 0);
                }
              }}
              required
              disabled={!form.batch_id}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            >
              <option value="">Select package</option>
              {packages.map(pkg => (
                <option key={pkg.package_id} value={pkg.package_id}>
                  {pkg.package_id} ({((pkg.available_qty || 0) / 1000).toFixed(2)}kg)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Binned Weight (g)*
              {form.binned_weight_grams > 0 && form.binned_package_id && (
                <span className={`ml-2 text-xs font-bold ${
                  form.binned_weight_grams <= (binnedPackages.find(p => p.package_id === form.binned_package_id)?.available_qty || 0)
                    ? 'text-cult-green'
                    : 'text-red-500'
                }`}>
                  {form.binned_weight_grams <= (binnedPackages.find(p => p.package_id === form.binned_package_id)?.available_qty || 0)
                    ? '✓ Valid'
                    : '✗ Exceeds available'}
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              value={form.binned_weight_grams || ''}
              onChange={(e) => onChange('binned_weight_grams', parseFloat(e.target.value))}
              required
              min="0.01"
              max={binnedPackages.find(p => p.package_id === form.binned_package_id)?.available_qty || undefined}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
            />
            <p className="text-xs text-cult-silver mt-1">
              {((form.binned_weight_grams || 0) / 1000).toFixed(2)} kg
              {form.binned_package_id && (
                <span className="ml-2">
                  • Available: {((binnedPackages.find(p => p.package_id === form.binned_package_id)?.available_qty || 0) / 1000).toFixed(2)} kg
                </span>
              )}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-1">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
            placeholder="Any special notes or observations..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-2 bg-cult-dark-gray text-white rounded hover:bg-cult-medium-gray transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-cult-green text-cult-black rounded font-bold hover:bg-cult-green-bright transition disabled:opacity-50"
          >
            {submitting ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
