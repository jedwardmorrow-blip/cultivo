import { useState, useEffect } from 'react';
import { Car, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { settingsService } from '../services/settings.service';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VehicleFormData {
  make: string;
  model: string;
  year: number | '';
  license_plate: string;
  vin: string;
}

export function VehiclesManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vin: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const data = await settingsService.getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error('Error loading vehicles:', err);
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingVehicle(null);
    setFormData({
      make: '',
      model: '',
      year: '',
      license_plate: '',
      vin: '',
    });
    setError(null);
    setShowModal(true);
  }

  function openEditModal(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.license_plate,
      vin: vehicle.vin,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      setError('Please enter a valid year');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        year: Number(formData.year),
      };

      if (editingVehicle) {
        await settingsService.updateVehicle(editingVehicle.id, {
          ...dataToSave,
          updated_at: new Date().toISOString(),
        });
      } else {
        await settingsService.createVehicle(dataToSave);
      }

      setShowModal(false);
      loadVehicles();
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      if (err.code === '23505') {
        setError('VIN already exists');
      } else {
        setError('Failed to save vehicle');
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const { error } = await supabase
        .from('delivery_vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Failed to delete vehicle. It may be referenced in existing manifests.');
    }
  }

  async function toggleActive(vehicle: Vehicle) {
    try {
      const { error } = await supabase
        .from('delivery_vehicles')
        .update({
          is_active: !vehicle.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicle.id);

      if (error) throw error;
      loadVehicles();
    } catch (err) {
      console.error('Error toggling vehicle status:', err);
      setError('Failed to update vehicle status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading vehicles...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-cult-white" />
          <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
            Delivery Vehicles
          </h2>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-cult-surface-raised transition-all duration-200 font-medium uppercase tracking-wider text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
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
                Vehicle
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider">
                License Plate
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider">
                VIN
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
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-cult-light-gray">
                  No vehicles found. Add your first vehicle to get started.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-cult-black transition-colors">
                  <td className="px-4 py-3 text-cult-white">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </td>
                  <td className="px-4 py-3 text-cult-light-gray font-mono">
                    {vehicle.license_plate}
                  </td>
                  <td className="px-4 py-3 text-cult-light-gray font-mono text-sm">
                    {vehicle.vin}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(vehicle)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium uppercase tracking-wider transition-all ${
                        vehicle.is_active
                          ? 'bg-green-900/30 text-green-400 border border-green-600 hover:bg-green-900/50'
                          : 'bg-cult-surface/30 text-cult-text-muted border border-cult-border-strong hover:bg-cult-surface/50'
                      }`}
                    >
                      {vehicle.is_active ? (
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
                        onClick={() => openEditModal(vehicle)}
                        className="p-2 text-cult-light-gray hover:text-cult-white hover:bg-cult-black transition-all"
                        title="Edit vehicle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="p-2 text-cult-light-gray hover:text-red-400 hover:bg-cult-black transition-all"
                        title="Delete vehicle"
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
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Make
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  License Plate
                </label>
                <input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  VIN
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  maxLength={17}
                  required
                />
                <p className="mt-1 text-xs text-cult-lighter-gray">
                  Vehicle Identification Number (17 characters)
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
                  {editingVehicle ? 'Update' : 'Add'} Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
