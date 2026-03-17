import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database';
import { Package, Edit2, Save, X, Filter } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import type { ProductWithRelations } from '@/types';

type Product = Database['public']['Tables']['products']['Row'];

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        stage:product_stages(id, name),
        type:product_types(id, name),
        strain:strains(id, name, abbreviation)
      `)
      .eq('is_archived', false)
      .order('product_category')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setEditForm(product);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveProduct() {
    if (!editingId) return;

    const { error } = await supabase
      .from('products')
      .update({
        price_per_unit: editForm.price_per_unit,
        pricing_unit: editForm.pricing_unit,
        product_category: editForm.product_category,
        allows_fractional_quantity: editForm.allows_fractional_quantity,
        available_quantity: editForm.available_quantity,
        gross_weight: editForm.gross_weight,
        net_weight: editForm.net_weight,
      })
      .eq('id', editingId);

    if (error) {
      console.error('Error updating product:', error);
      notificationService.error('Failed to update product: ' + error.message);
    } else {
      fetchProducts();
      cancelEditing();
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = categoryFilter === 'all' || product.product_category === categoryFilter;
    const matchesStage = stageFilter === 'all' || (product as ProductWithRelations).stage?.name === stageFilter;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.strain && product.strain.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesStage && matchesSearch;
  });

  const stats = {
    total: products.length,
    bulk: products.filter(p => p.product_category === 'bulk').length,
    packaged: products.filter(p => p.product_category === 'packaged').length,
    preroll: products.filter(p => p.product_category === 'preroll').length,
  };

  if (loading) {
    return <div className="p-6">Loading products...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide flex items-center gap-2">
              <Package className="w-6 h-6" />
              Products Management
            </h2>
            <p className="text-cult-light-gray mt-1">
              {stats.total} total products ({stats.bulk} bulk, {stats.packaged} packaged, {stats.preroll} preroll)
            </p>
            <p className="text-cult-lighter-gray text-sm mt-1">
              Products are automatically generated for all strains when they are added or activated
            </p>
          </div>
        </div>
      </div>

      <>
          <div className="mb-6 flex gap-4 flex-wrap items-center">
            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-cult-light-gray" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-cult-near-black border border-cult-medium-gray text-cult-white"
              >
                <option value="all">All Categories</option>
                <option value="bulk">Bulk</option>
                <option value="packaged">Packaged</option>
                <option value="preroll">Pre-roll</option>
              </select>

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-4 py-2 bg-cult-near-black border border-cult-medium-gray text-cult-white"
              >
                <option value="all">All Stages</option>
                <option value="Bulk">Bulk</option>
                <option value="Binned">Binned</option>
                <option value="Bucked">Bucked</option>
                <option value="Packaged">Packaged</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search by name, strain, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-cult-near-black border border-cult-medium-gray text-cult-white placeholder-cult-medium-gray"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-cult-medium-gray">
              <thead className="bg-cult-near-black">
                <tr>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Name</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Stage</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Type</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Strain</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Category</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Price</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">SKU</th>
                  <th className="px-4 py-3 text-left text-cult-white font-semibold border-b border-cult-medium-gray">Weights</th>
                  <th className="px-4 py-3 text-right text-cult-white font-semibold border-b border-cult-medium-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-cult-medium-gray hover:bg-cult-near-black">
                    {editingId === product.id ? (
                      <>
                        <td className="px-4 py-3 text-cult-white">{product.name}</td>
                        <td className="px-4 py-3 text-cult-light-gray">{(product as ProductWithRelations).stage?.name || '-'}</td>
                        <td className="px-4 py-3 text-cult-light-gray">{(product as ProductWithRelations).product_type?.name || '-'}</td>
                        <td className="px-4 py-3 text-cult-light-gray">{(product as ProductWithRelations).strain_info?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={editForm.product_category || product.product_category}
                            onChange={(e) => setEditForm({ ...editForm, product_category: e.target.value })}
                            className="px-2 py-1 bg-cult-near-black border border-cult-medium-gray text-cult-white text-sm"
                          >
                            <option value="bulk">Bulk</option>
                            <option value="packaged">Packaged</option>
                            <option value="preroll">Pre-roll</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <span className="text-cult-light-gray">$</span>
                            <input
                              type="number"
                              value={editForm.price_per_unit ?? product.price_per_unit ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, price_per_unit: parseFloat(e.target.value) })}
                              className="w-24 px-2 py-1 bg-cult-near-black border border-cult-medium-gray text-cult-white text-sm"
                              step="0.01"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-cult-light-gray text-sm">{product.sku || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex gap-1 items-center">
                              <span className="text-cult-light-gray text-xs">Gross:</span>
                              <input
                                type="number"
                                value={editForm.gross_weight ?? product.gross_weight ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, gross_weight: parseFloat(e.target.value) || null })}
                                className="w-16 px-1 py-0.5 bg-cult-near-black border border-cult-medium-gray text-cult-white text-xs"
                                step="0.01"
                              />
                              <span className="text-cult-light-gray text-xs">g</span>
                            </div>
                            <div className="flex gap-1 items-center">
                              <span className="text-cult-light-gray text-xs">Net:</span>
                              <input
                                type="number"
                                value={editForm.net_weight ?? product.net_weight ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, net_weight: parseFloat(e.target.value) || null })}
                                className="w-16 px-1 py-0.5 bg-cult-near-black border border-cult-medium-gray text-cult-white text-xs"
                                step="0.01"
                              />
                              <span className="text-cult-light-gray text-xs">g</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={saveProduct}
                              className="p-1.5 text-green-400 hover:text-green-300 hover:bg-cult-near-black"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 text-cult-light-gray hover:text-cult-white hover:bg-cult-near-black"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-cult-white">{product.name}</td>
                        <td className="px-4 py-3 text-cult-light-gray">{(product as ProductWithRelations).stage?.name || '-'}</td>
                        <td className="px-4 py-3 text-cult-light-gray">{(product as ProductWithRelations).product_type?.name || '-'}</td>
                        <td className="px-4 py-3 text-cult-light-gray">
                          {(product as ProductWithRelations).strain_info?.name ? (
                            <span>
                              {(product as ProductWithRelations).strain_info.name}
                              {(product as ProductWithRelations).strain_info.abbreviation && (
                                <span className="text-cult-medium-gray text-xs ml-1">
                                  ({(product as ProductWithRelations).strain_info.abbreviation})
                                </span>
                              )}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs ${
                            product.product_category === 'bulk' ? 'bg-blue-900 text-blue-200' :
                            product.product_category === 'packaged' ? 'bg-green-900 text-green-200' :
                            'bg-purple-900 text-purple-200'
                          }`}>
                            {product.product_category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-cult-light-gray">
                          {product.price_per_unit ? `$${product.price_per_unit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-cult-light-gray text-sm">{product.sku || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs text-cult-light-gray">
                            {product.gross_weight && <div>Gross: {product.gross_weight}g</div>}
                            {product.net_weight && <div>Net: {product.net_weight}g</div>}
                            {!product.gross_weight && !product.net_weight && <div>-</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEditing(product)}
                              className="p-1.5 text-cult-gold hover:text-cult-white hover:bg-cult-near-black"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-cult-light-gray">
              No products found matching your filters.
            </div>
          )}
        </>
    </div>
  );
}
