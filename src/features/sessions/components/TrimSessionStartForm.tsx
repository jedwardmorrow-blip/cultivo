import { useState } from 'react';
import type { TrimSessionInsert, InventoryItem } from '../types';
import { useActiveStaff } from '../hooks/useActiveStaff';
import { createTrimSession } from '../services/sessions.service';

interface TrimSessionStartFormProps {
  buckedPackages: InventoryItem[];
  availableStrains: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrimSessionStartForm({
  buckedPackages,
  availableStrains,
  onSuccess,
  onCancel,
}: TrimSessionStartFormProps) {
  const { staff, loading: staffLoading, getDisplayName } = useActiveStaff();
  const [form, setForm] = useState<Partial<TrimSessionInsert>>({
    trim_method: 'hand',
    pulled_weight: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof TrimSessionInsert, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || sessionCreated) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Explicitly map fields to ensure pulled_weight is included
      const sessionData = {
        trimmer_name: form.trimmer_name,
        trimmer_staff_id: form.trimmer_staff_id, // Link to staff table
        strain: form.strain,
        batch_id: form.batch_id,
        package_id: form.package_id,
        pulled_weight: form.pulled_weight, // Explicitly include pulled_weight
        trim_method: form.trim_method,
        notes: form.notes,
        started_at: new Date().toISOString(),
      };

      const { data, error: createError } = await createTrimSession(sessionData);

      if (createError) {
        throw new Error(createError.message || 'Failed to create trim session');
      }

      if (!data) {
        throw new Error('No data returned from server');
      }

      // Session created — prevent re-submission
      setSessionCreated(true);

      // Label reprint moved to session COMPLETION flow per Laura's request (2026-03-18)
      // Just call onSuccess to refresh the sessions list and close the form
      onSuccess();
    } catch (err: any) {
      console.error('Error creating trim session:', err);
      setError(err.message || 'Failed to create trim session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBatchesForStrain = (strain: string) => {
    if (!strain || !buckedPackages || buckedPackages.length === 0) {
      return [];
    }

    // Create a map to store unique batch_number mappings
    // Key by batch_number (text) so we send text format to database
    const batchMap = new Map<string, { batch_id: string; batch_number: string }>();

    buckedPackages
      .filter((pkg: any) => pkg && pkg.strain?.name === strain && pkg.batch_number)
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
    if (!strain || !batchNumber || !buckedPackages || buckedPackages.length === 0) {
      return [];
    }

    return buckedPackages.filter((pkg: any) =>
      pkg &&
      pkg.strain?.name === strain &&
      pkg.batch_number === batchNumber &&
      pkg.available_qty && pkg.available_qty > 0
    );
  };

  const batches: Array<{ batch_id: string; batch_number: string }> = form.strain ? getBatchesForStrain(form.strain) : [];
  const packages = form.strain && form.batch_id ? getPackagesForBatch(form.strain, form.batch_id) : [];

  return (
    <div className="bg-cult-near-black p-6 rounded-lg shadow-xl border-2 border-cult-green mb-6">
      <h2 className="text-2xl font-bold mb-6 text-cult-white uppercase tracking-wide">
        Start New Trim Session
      </h2>

      {error && (
        <div className="mb-4 bg-cult-danger-muted border border-cult-danger text-cult-danger p-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Trimmer*</label>
            <select
              value={form.trimmer_staff_id || ''}
              onChange={(e) => {
                const selectedStaff = staff.find(s => s.id === e.target.value);
                if (selectedStaff) {
                  handleChange('trimmer_staff_id', selectedStaff.id);
                  handleChange('trimmer_name', selectedStaff.first_name);
                } else {
                  handleChange('trimmer_staff_id', '');
                  handleChange('trimmer_name', '');
                }
              }}
              required
              disabled={isSubmitting || staffLoading}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            >
              <option value="">{staffLoading ? 'Loading staff...' : 'Select trimmer'}</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>{getDisplayName(member)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Strain*</label>
            <select
              value={form.strain || ''}
              onChange={(e) => {
                handleChange('strain', e.target.value);
                handleChange('batch_id', '');
                handleChange('package_id', '');
              }}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
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
                handleChange('batch_id', e.target.value);
                handleChange('package_id', '');
              }}
              required
              disabled={!form.strain || isSubmitting}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            >
              <option value="">Select batch</option>
              {batches.map(batch => (
                <option key={batch.batch_number} value={batch.batch_number}>
                  {batch.batch_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Package ID*</label>
            <select
              value={form.package_id || ''}
              onChange={(e) => {
                const selectedPkg = packages.find((p) => p.package_id === e.target.value);
                handleChange('package_id', e.target.value);
                if (selectedPkg) {
                  handleChange('pulled_weight', selectedPkg.available_qty || 0);
                }
              }}
              required
              disabled={!form.batch_id || isSubmitting}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            >
              <option value="">Select package</option>
              {packages.map((pkg: any) => (
                <option key={pkg.package_id} value={pkg.package_id}>
                  {pkg.package_id} ({(pkg.available_qty || 0).toFixed(0)}g)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Pulled Weight (g)*</label>
            <input
              type="number"
              step="0.01"
              value={form.pulled_weight || ''}
              onChange={(e) => handleChange('pulled_weight', parseFloat(e.target.value))}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Trim Method</label>
            <select
              value={form.trim_method || 'hand'}
              onChange={(e) => handleChange('trim_method', e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            >
              <option value="hand">Hand Trim</option>
              <option value="machine">Machine Trim</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-1">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green disabled:opacity-50"
            placeholder="Any special notes or observations..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 bg-cult-dark-gray text-white rounded hover:bg-cult-medium-gray transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || sessionCreated}
            className="px-6 py-2 bg-cult-green text-cult-black rounded font-bold hover:bg-cult-green-bright transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Start Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
