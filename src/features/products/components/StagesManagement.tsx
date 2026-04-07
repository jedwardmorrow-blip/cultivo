import { useEffect, useState } from 'react';
import { Package, Edit2, Save, X } from 'lucide-react';
import { productsService } from '../services/products.service';

interface ProductStage {
  id: string;
  name: string;
  sort_order: number;
  default_pricing_unit: string;
  allows_fractional_quantity: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function StagesManagement() {
  const [stages, setStages] = useState<ProductStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductStage>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStages();
  }, []);

  async function loadStages() {
    try {
      const stages = await productsService.fetchProductStages();
      setStages(stages);
    } catch (error) {
      console.error('Error loading stages:', error);
      setMessage({ type: 'error', text: 'Failed to load product stages' });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(stage: ProductStage) {
    setEditingId(stage.id);
    setEditForm(stage);
  }

  function handleCancel() {
    setEditingId(null);
    setEditForm({});
  }

  async function handleSave(id: string) {
    try {
      await productsService.updateProductStage(id, {
        default_pricing_unit: editForm.default_pricing_unit,
        allows_fractional_quantity: editForm.allows_fractional_quantity,
        description: editForm.description,
        updated_at: new Date().toISOString(),
      });

      setMessage({ type: 'success', text: 'Stage updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
      setEditingId(null);
      setEditForm({});
      loadStages();
    } catch (error) {
      console.error('Error updating stage:', error);
      setMessage({ type: 'error', text: 'Failed to update stage' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading stages...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-6 p-4 border ${
            message.type === 'success'
              ? 'bg-cult-success-muted border-cult-success text-cult-text-primary'
              : 'bg-cult-danger-muted border-cult-danger text-cult-text-primary'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-cult-near-black border border-cult-medium-gray p-8">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-6 h-6 text-cult-white" />
          <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
            Product Stages
          </h2>
        </div>

        <div className="mb-6 bg-cult-black border border-cult-medium-gray p-4">
          <p className="text-sm text-cult-light-gray">
            Product stages represent the different phases of your product workflow.
            Each stage can have its own pricing unit and quantity rules.
          </p>
        </div>

        <div className="space-y-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="bg-cult-black border border-cult-medium-gray p-6"
            >
              {editingId === stage.id ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
                      {stage.name}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(stage.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Default Pricing Unit
                      </label>
                      <select
                        value={editForm.default_pricing_unit}
                        onChange={(e) =>
                          setEditForm({ ...editForm, default_pricing_unit: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                      >
                        <option value="unit">Unit</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="g">Gram (g)</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.allows_fractional_quantity}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              allows_fractional_quantity: e.target.checked,
                            })
                          }
                          className="w-5 h-5 bg-cult-near-black border-2 border-cult-medium-gray checked:bg-cult-white checked:border-cult-white"
                        />
                        <span className="text-sm font-medium text-cult-white uppercase tracking-wider">
                          Allow Fractional Quantities
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
                      {stage.name}
                    </h3>
                    <button
                      onClick={() => handleEdit(stage)}
                      className="flex items-center gap-2 px-4 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-cult-lighter-gray uppercase tracking-wider text-xs">
                        Pricing Unit
                      </span>
                      <p className="text-cult-white mt-1 font-medium">
                        {stage.default_pricing_unit.toUpperCase()}
                      </p>
                    </div>

                    <div>
                      <span className="text-cult-lighter-gray uppercase tracking-wider text-xs">
                        Fractional Quantities
                      </span>
                      <p className="text-cult-white mt-1 font-medium">
                        {stage.allows_fractional_quantity ? 'Allowed' : 'Not Allowed'}
                      </p>
                    </div>

                    <div>
                      <span className="text-cult-lighter-gray uppercase tracking-wider text-xs">
                        Sort Order
                      </span>
                      <p className="text-cult-white mt-1 font-medium">{stage.sort_order}</p>
                    </div>
                  </div>

                  {stage.description && (
                    <div className="mt-4 pt-4 border-t border-cult-medium-gray">
                      <p className="text-sm text-cult-light-gray">{stage.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
