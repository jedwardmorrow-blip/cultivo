import { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { settingsService } from '../services/settings.service';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  fa_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DriverFormData {
  first_name: string;
  last_name: string;
  fa_number: string;
}

export function DriversManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>({
    first_name: '',
    last_name: '',
    fa_number: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      const data = await settingsService.getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error('Error loading drivers:', err);
      setError('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingDriver(null);
    setFormData({
      first_name: '',
      last_name: '',
      fa_number: '',
    });
    setError(null);
    setShowModal(true);
  }

  function openEditModal(driver: Driver) {
    setEditingDriver(driver);
    setFormData({
      first_name: driver.first_name,
      last_name: driver.last_name,
      fa_number: driver.fa_number,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (editingDriver) {
        await settingsService.updateDriver(editingDriver.id, {
          ...formData,
          updated_at: new Date().toISOString(),
        });
      } else {
        await settingsService.createDriver(formData);
      }

      setShowModal(false);
      loadDrivers();
    } catch (err: any) {
      console.error('Error saving driver:', err);
      if (err.code === '23505') {
        setError('FA number already exists');
      } else {
        setError('Failed to save driver');
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadDrivers();
    } catch (err) {
      console.error('Error deleting driver:', err);
      setError('Failed to delete driver. They may be referenced in existing manifests.');
    }
  }

  async function toggleActive(driver: Driver) {
    try {
      const { error } = await supabase
        .from('delivery_drivers')
        .update({
          is_active: !driver.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driver.id);

      if (error) throw error;
      loadDrivers();
    } catch (err) {
      console.error('Error toggling driver status:', err);
      setError('Failed to update driver status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-cult-white" />
          <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
            Delivery Drivers
          </h2>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-cult-surface-raised transition-all duration-200 font-medium uppercase tracking-wider text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900 border border-red-700 text-red-100">
          {error}
        </div>
      )}

      <div className="bg-cult-near-black border border-cult-medium-gray overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-cult-black border-b border-cult-medium-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider">
                FA Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-cult-light-gray uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-medium-gray">
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-cult-light-gray">
                  No drivers found. Add your first driver to get started.
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-cult-black transition-colors">
                  <td className="px-4 py-3 text-cult-white">
                    {driver.first_name} {driver.last_name}
                  </td>
                  <td className="px-4 py-3 text-cult-light-gray font-mono">
                    {driver.fa_number}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(driver)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium uppercase tracking-wider transition-all ${
                        driver.is_active
                          ? 'bg-green-900/30 text-green-400 border border-green-600 hover:bg-green-900/50'
                          : 'bg-cult-surface/30 text-cult-text-muted border border-cult-border-strong hover:bg-cult-surface/50'
                      }`}
                    >
                      {driver.is_active ? (
                        <>
                          <Check className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(driver)}
                        className="p-2 text-cult-light-gray hover:text-cult-white hover:bg-cult-black transition-all"
                        title="Edit driver"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(driver.id)}
                        className="p-2 text-cult-light-gray hover:text-red-400 hover:bg-cult-black transition-all"
                        title="Delete driver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
        >
          <div
            className="bg-cult-near-black border-2 border-cult-medium-gray max-w-md w-full"
          >
            <div className="p-6 border-b border-cult-medium-gray">
              <h3 className="text-xl font-bold text-cult-white uppercase tracking-wider">
                {editingDriver ? 'Edit Driver' : 'Add Driver'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  FA Number
                </label>
                <input
                  type="text"
                  value={formData.fa_number}
                  onChange={(e) => setFormData({ ...formData, fa_number: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  required
                />
                <p className="mt-1 text-xs text-cult-lighter-gray">
                  Facility Agent card number
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900 border border-red-700 text-red-100 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-white text-black hover:bg-cult-surface-raised transition-all duration-200 font-medium uppercase tracking-wider text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-black hover:bg-cult-surface-raised transition-all duration-200 font-medium uppercase tracking-wider text-sm"
                >
                  {editingDriver ? 'Update' : 'Add'} Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
