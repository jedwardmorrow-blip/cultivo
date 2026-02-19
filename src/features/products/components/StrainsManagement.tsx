import { useEffect, useState } from 'react';
import { Leaf, Edit2, Save, X, Plus, Trash2, Search, AlertTriangle } from 'lucide-react';

function isValidAbbreviation(v: string | null | undefined): boolean {
  return !!v && /^[A-Z]{3}$/.test(v);
}
import { productsService } from '../services/products.service';

interface Strain {
  id: string;
  name: string;
  abbreviation: string | null;
  dominance_type: string | null;
  genetics_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function StrainsManagement() {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Strain>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDominance, setFilterDominance] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStrains();
  }, []);

  useEffect(() => {
    filterStrains();
  }, [strains, searchTerm, filterDominance]);

  async function loadStrains() {
    try {
      const strains = await productsService.fetchStrains();
      setStrains(strains);
    } catch (error) {
      console.error('Error loading strains:', error);
      setMessage({ type: 'error', text: 'Failed to load strains' });
    } finally {
      setLoading(false);
    }
  }

  function filterStrains() {
    let filtered = strains;

    if (searchTerm) {
      filtered = filtered.filter(
        (strain) =>
          strain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          strain.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          strain.genetics_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterDominance !== 'all') {
      filtered = filtered.filter((strain) => strain.dominance_type === filterDominance);
    }

    setFilteredStrains(filtered);
  }

  function handleEdit(strain: Strain) {
    setEditingId(strain.id);
    setEditForm(strain);
  }

  function handleAdd() {
    setAdding(true);
    setEditForm({
      name: '',
      abbreviation: '',
      dominance_type: 'Hybrid',
      genetics_description: '',
      is_active: true,
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
        await productsService.createStrain({
          name: editForm.name!,
          abbreviation: editForm.abbreviation,
          dominance_type: editForm.dominance_type,
          genetics_description: editForm.genetics_description,
          is_active: editForm.is_active ?? true,
        });
        setMessage({ type: 'success', text: 'Strain added successfully!' });
      } else {
        await productsService.updateStrain(id!, {
          name: editForm.name,
          abbreviation: editForm.abbreviation,
          dominance_type: editForm.dominance_type,
          genetics_description: editForm.genetics_description,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString(),
        });
        setMessage({ type: 'success', text: 'Strain updated successfully!' });
      }

      setTimeout(() => setMessage(null), 3000);
      setEditingId(null);
      setAdding(false);
      setEditForm({});
      loadStrains();
    } catch (error) {
      console.error('Error saving strain:', error);
      setMessage({ type: 'error', text: 'Failed to save strain' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this strain? This may affect existing products.')) return;

    try {
      await productsService.deleteStrain(id);

      setMessage({ type: 'success', text: 'Strain deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
      loadStrains();
    } catch (error) {
      console.error('Error deleting strain:', error);
      setMessage({ type: 'error', text: 'Failed to delete strain. It may be in use by existing products.' });
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    try {
      await productsService.updateStrain(id, {
        is_active: !currentStatus,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Strain ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
      });
      setTimeout(() => setMessage(null), 3000);
      loadStrains();
    } catch (error) {
      console.error('Error toggling strain status:', error);
      setMessage({ type: 'error', text: 'Failed to update strain status' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading strains...</div>
      </div>
    );
  }

  const dominanceTypes = ['Sativa', 'Indica', 'Hybrid', 'Sativa-Hybrid', 'Indica-Hybrid'];

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
            <Leaf className="w-6 h-6 text-cult-white" />
            <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
              Strain Catalog
            </h2>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 text-sm font-medium uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Add Strain
          </button>
        </div>

        <div className="mb-6 bg-cult-black border border-cult-medium-gray p-4">
          <p className="text-sm text-cult-light-gray mb-4">
            Manage your strain catalog with genetic information and classifications.
            Total strains: {strains.length}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cult-lighter-gray" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search strains..."
                className="w-full pl-10 pr-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
              />
            </div>

            <div>
              <select
                value={filterDominance}
                onChange={(e) => setFilterDominance(e.target.value)}
                className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
              >
                <option value="all">All Dominance Types</option>
                {dominanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {adding && (
          <div className="mb-4 bg-cult-black border border-cult-medium-gray p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide mb-4">
                Add New Strain
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Strain Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                    placeholder="e.g., Blue Pave"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Abbreviation *
                  </label>
                  <input
                    type="text"
                    value={editForm.abbreviation || ''}
                    onChange={(e) => setEditForm({ ...editForm, abbreviation: e.target.value.toUpperCase().slice(0, 3) })}
                    className={`w-full px-4 py-3 bg-cult-near-black border text-cult-white focus:outline-none focus:border-cult-white font-mono uppercase ${
                      editForm.abbreviation && !isValidAbbreviation(editForm.abbreviation)
                        ? 'border-amber-600'
                        : 'border-cult-medium-gray'
                    }`}
                    placeholder="e.g., BLP"
                    maxLength={3}
                  />
                  {editForm.abbreviation && !isValidAbbreviation(editForm.abbreviation) && (
                    <p className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Must be exactly 3 uppercase letters (A–Z)
                    </p>
                  )}
                  {!editForm.abbreviation && (
                    <p className="text-cult-medium-gray text-xs mt-1">Required for harvest batch IDs</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Dominance Type
                  </label>
                  <select
                    value={editForm.dominance_type || 'Hybrid'}
                    onChange={(e) => setEditForm({ ...editForm, dominance_type: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                  >
                    {dominanceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Genetics Description
                </label>
                <textarea
                  value={editForm.genetics_description || ''}
                  onChange={(e) => setEditForm({ ...editForm, genetics_description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                  placeholder="e.g., Azul Runtz x Pave"
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
                  disabled={!editForm.name || !isValidAbbreviation(editForm.abbreviation)}
                  className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 text-sm font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filteredStrains.map((strain) => (
            <div
              key={strain.id}
              className={`bg-cult-black border p-4 transition-all ${
                strain.is_active
                  ? 'border-cult-medium-gray'
                  : 'border-cult-medium-gray opacity-50'
              }`}
            >
              {editingId === strain.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Strain Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Abbreviation *
                      </label>
                      <input
                        type="text"
                        value={editForm.abbreviation || ''}
                        onChange={(e) => setEditForm({ ...editForm, abbreviation: e.target.value.toUpperCase().slice(0, 3) })}
                        className={`w-full px-4 py-3 bg-cult-near-black border text-cult-white focus:outline-none focus:border-cult-white font-mono uppercase ${
                          editForm.abbreviation && !isValidAbbreviation(editForm.abbreviation)
                            ? 'border-amber-600'
                            : 'border-cult-medium-gray'
                        }`}
                        maxLength={3}
                        placeholder="e.g., BLP"
                      />
                      {editForm.abbreviation && !isValidAbbreviation(editForm.abbreviation) && (
                        <p className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Must be exactly 3 uppercase letters
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Dominance Type
                      </label>
                      <select
                        value={editForm.dominance_type || 'Hybrid'}
                        onChange={(e) => setEditForm({ ...editForm, dominance_type: e.target.value })}
                        className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                      >
                        {dominanceTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                      Genetics Description
                    </label>
                    <textarea
                      value={editForm.genetics_description || ''}
                      onChange={(e) => setEditForm({ ...editForm, genetics_description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
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
                      onClick={() => handleSave(strain.id)}
                      disabled={!editForm.name || !isValidAbbreviation(editForm.abbreviation)}
                      className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 text-sm font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
                        {strain.name}
                      </h3>
                      {isValidAbbreviation(strain.abbreviation) ? (
                        <span className="px-2 py-1 bg-cult-near-black border border-cult-medium-gray text-cult-lighter-gray text-xs font-mono uppercase">
                          {strain.abbreviation}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-950 border border-amber-700 text-amber-400 text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3" />
                          No abbreviation — harvest blocked
                        </span>
                      )}
                      {strain.dominance_type && (
                        <span className="px-2 py-1 bg-cult-near-black border border-cult-medium-gray text-cult-lighter-gray text-xs uppercase tracking-wider">
                          {strain.dominance_type}
                        </span>
                      )}
                    </div>
                    {strain.genetics_description && (
                      <p className="text-sm text-cult-light-gray">{strain.genetics_description}</p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleActive(strain.id, strain.is_active)}
                      className={`px-3 py-1 border text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                        strain.is_active
                          ? 'border-cult-medium-gray text-cult-lighter-gray hover:border-cult-white hover:text-cult-white'
                          : 'border-green-700 text-green-500 hover:border-green-500'
                      }`}
                    >
                      {strain.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(strain)}
                      className="px-3 py-1 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 text-xs font-medium uppercase tracking-wider"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(strain.id)}
                      className="px-3 py-1 border border-red-700 text-red-500 hover:border-red-500 transition-all duration-200 text-xs font-medium uppercase tracking-wider"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredStrains.length === 0 && (
            <div className="text-center py-12 text-cult-lighter-gray">
              No strains found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
