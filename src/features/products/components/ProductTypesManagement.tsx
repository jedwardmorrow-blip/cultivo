import { useEffect, useState } from 'react';
import { Box, CreditCard as Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { productsService } from '../services/products.service';

interface ProductType {
  id: string;
  name: string;
  base_weight: number | null;
  base_unit: string | null;
  sort_order: number;
  applicable_stages: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductStage {
  id: string;
  name: string;
}

export function ProductTypesManagement() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [stages, setStages] = useState<ProductStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProductType>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [types, stages] = await Promise.all([
        productsService.fetchProductTypes(),
        productsService.fetchProductStages(),
      ]);

      setTypes(types);
      setStages(stages);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load product types' });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(type: ProductType) {
    setEditingId(type.id);
    setEditForm(type);
  }

  function handleAdd() {
    setAdding(true);
    setEditForm({
      name: '',
      base_weight: null,
      base_unit: 'g',
      applicable_stages: [],
      description: '',
      is_active: true,
      sort_order: types.length + 1,
    });
  }

  function handleCancel() {
    setEditingId(null);
    setAdding(false);
    setEditForm({});
  }

  async function handleSave(id?: string) {
    try {
      if (adding) {
        await productsService.createProductType({
          name: editForm.name!,
          base_weight: editForm.base_weight,
          base_unit: editForm.base_unit,
          applicable_stages: editForm.applicable_stages || [],
          description: editForm.description,
          sort_order: editForm.sort_order || 0,
          is_active: editForm.is_active ?? true,
        });
        setMessage({ type: 'success', text: 'Product type added successfully!' });
      } else {
        await productsService.updateProductType(id!, {
          name: editForm.name,
          base_weight: editForm.base_weight,
          base_unit: editForm.base_unit,
          applicable_stages: editForm.applicable_stages,
          description: editForm.description,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString(),
        });
        setMessage({ type: 'success', text: 'Product type updated successfully!' });
      }

      setTimeout(() => setMessage(null), 3000);
      setEditingId(null);
      setAdding(false);
      setEditForm({});
      loadData();
    } catch (error) {
      console.error('Error saving product type:', error);
      setMessage({ type: 'error', text: 'Failed to save product type' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product type?')) return;

    try {
      await productsService.deleteProductType(id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Product type deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
      loadData();
    } catch (error) {
      console.error('Error deleting product type:', error);
      setMessage({ type: 'error', text: 'Failed to delete product type' });
    }
  }

  function toggleStage(stageName: string) {
    const currentStages = editForm.applicable_stages || [];
    const newStages = currentStages.includes(stageName)
      ? currentStages.filter((s) => s !== stageName)
      : [...currentStages, stageName];
    setEditForm({ ...editForm, applicable_stages: newStages });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading product types...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-6 p-4 border ${
            message.type === 'success'
              ? 'bg-green-900 border-green-700 text-green-100'
              : 'bg-red-900 border-red-700 text-red-100'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-cult-near-black border border-cult-medium-gray p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Box className="w-6 h-6 text-cult-white" />
            <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
              Product Types
            </h2>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 text-sm font-medium uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Add Type
          </button>
        </div>

        <div className="mb-6 bg-cult-black border border-cult-medium-gray p-4">
          <p className="text-sm text-cult-light-gray">
            Product types define the different forms your products take (e.g., Flower, 3.5g Flower, 1g Preroll).
            Each type can be associated with specific stages.
          </p>
        </div>

        {adding && (
          <div className="mb-4 bg-cult-black border border-cult-medium-gray p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">
                Add New Product Type
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                    placeholder="e.g., 3.5g Flower"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Base Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.base_weight || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, base_weight: e.target.value ? Number(e.target.value) : null })
                    }
                    className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Unit
                  </label>
                  <select
                    value={editForm.base_unit || 'g'}
                    onChange={(e) => setEditForm({ ...editForm, base_unit: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="oz">Ounce (oz)</option>
                    <option value="lb">Pound (lb)</option>
                    <option value="unit">Unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Applicable Stages
                </label>
                <div className="flex flex-wrap gap-2">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => toggleStage(stage.name)}
                      className={`px-4 py-2 border text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                        editForm.applicable_stages?.includes(stage.name)
                          ? 'bg-cult-white text-cult-black border-cult-white'
                          : 'bg-cult-near-black text-cult-white border-cult-medium-gray hover:border-cult-white'
                      }`}
                    >
                      {stage.name}
                    </button>
                  ))}
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
                  className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-cult-medium-gray">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={() => handleSave()}
                  className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {types.map((type) => (
            <div key={type.id} className="bg-cult-black border border-cult-medium-gray p-6">
              {editingId === type.id ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
                      Edit Type
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(type.id)}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Base Weight
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.base_weight || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, base_weight: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Unit
                      </label>
                      <select
                        value={editForm.base_unit || 'g'}
                        onChange={(e) => setEditForm({ ...editForm, base_unit: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                      >
                        <option value="g">Gram (g)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="unit">Unit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                      Applicable Stages
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {stages.map((stage) => (
                        <button
                          key={stage.id}
                          onClick={() => toggleStage(stage.name)}
                          className={`px-4 py-2 border text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                            editForm.applicable_stages?.includes(stage.name)
                              ? 'bg-cult-white text-cult-black border-cult-white'
                              : 'bg-cult-near-black text-cult-white border-cult-medium-gray hover:border-cult-white'
                          }`}
                        >
                          {stage.name}
                        </button>
                      ))}
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
                      className="w-full px-4 py-3 bg-white border border-cult-medium-gray text-black focus:outline-none focus:border-cult-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
                      {type.name}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="flex items-center gap-2 px-4 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-700 text-red-500 hover:border-red-500 transition-all duration-200 text-sm font-medium uppercase tracking-wider"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-cult-lighter-gray uppercase tracking-wider text-xs">
                        Base Weight
                      </span>
                      <p className="text-cult-white mt-1 font-medium">
                        {type.base_weight != null ? `${type.base_weight} ${type.base_unit}` : 'N/A'}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-cult-lighter-gray uppercase tracking-wider text-xs">
                        Applicable Stages
                      </span>
                      <p className="text-cult-white mt-1 font-medium">
                        {type.applicable_stages.join(', ')}
                      </p>
                    </div>

                    <div>
                      <span className="text-cult-lighter-gray uppercase tracking-wider text-xs">Status</span>
                      <p className="text-cult-white mt-1 font-medium">
                        {type.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  {type.description && (
                    <div className="mt-4 pt-4 border-t border-cult-medium-gray">
                      <p className="text-sm text-cult-light-gray">{type.description}</p>
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
