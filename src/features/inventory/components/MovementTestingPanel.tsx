/**
 * Movement Testing Panel
 *
 * Interactive UI for manually creating and testing different movement types.
 * Allows selection of items, movement kinds, quantities, and observing
 * the trigger system in action.
 */

import { useState, useEffect } from 'react';
import { Play, Package, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database/database.types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type MovementKind = 'RECEIPT' | 'CONSUME' | 'PRODUCE' | 'FULFILLMENT' | 'RETURN' | 'RESERVE' | 'RELEASE' | 'ADJUSTMENT' | 'RECONCILIATION';

interface MovementFormData {
  movement_kind: MovementKind;
  item_id: string;
  direction: 'source' | 'dest';
  qty: number;
  reason_code: string;
  notes: string;
}

interface MovementResult {
  success: boolean;
  message: string;
  before_qty?: number;
  after_qty?: number;
  movement_id?: string;
}

export function MovementTestingPanel() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MovementResult | null>(null);

  const [formData, setFormData] = useState<MovementFormData>({
    movement_kind: 'PRODUCE',
    item_id: '',
    direction: 'dest',
    qty: 10,
    reason_code: 'test',
    notes: 'Manual test from UI'
  });

  // Movement type configurations
  const movementTypes: Record<MovementKind, { label: string; direction: 'source' | 'dest'; description: string; color: string }> = {
    RECEIPT: { label: 'Receipt', direction: 'dest', description: 'Receive inventory (increment)', color: 'blue' },
    CONSUME: { label: 'Consume', direction: 'source', description: 'Use in production (decrement)', color: 'orange' },
    PRODUCE: { label: 'Produce', direction: 'dest', description: 'Create product (increment)', color: 'green' },
    FULFILLMENT: { label: 'Fulfillment', direction: 'source', description: 'Ship to customer (decrement)', color: 'purple' },
    RETURN: { label: 'Return', direction: 'dest', description: 'Return to inventory (increment)', color: 'cyan' },
    RESERVE: { label: 'Reserve', direction: 'source', description: 'Reserve for order (decrement)', color: 'yellow' },
    RELEASE: { label: 'Release', direction: 'dest', description: 'Release reservation (increment)', color: 'lime' },
    ADJUSTMENT: { label: 'Adjustment', direction: 'dest', description: 'Manual adjustment (absolute)', color: 'indigo' },
    RECONCILIATION: { label: 'Reconciliation', direction: 'dest', description: 'Physical count (absolute)', color: 'pink' }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    setSelectedItem(item || null);
    setFormData(prev => ({ ...prev, item_id: itemId }));
    setResult(null);
  };

  const handleMovementKindChange = (kind: MovementKind) => {
    setFormData(prev => ({
      ...prev,
      movement_kind: kind,
      direction: movementTypes[kind].direction
    }));
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setSubmitting(true);
      setResult(null);

      const beforeQty = selectedItem.on_hand_qty;

      // Build movement data
      const movementData: any = {
        movement_kind: formData.movement_kind,
        qty: formData.qty,
        unit: 'g',
        reason_code: formData.reason_code,
        notes: formData.notes
      };

      // Set source or dest based on direction
      if (formData.direction === 'source') {
        movementData.source_item_id = formData.item_id;
      } else {
        movementData.dest_item_id = formData.item_id;
      }

      // Insert movement (trigger will fire automatically)
      const { data: movementResult, error: movementError } = await supabase
        .from('inventory_movements')
        .insert(movementData)
        .select('id')
        .single();

      if (movementError) throw movementError;

      // Reload item to get updated quantity
      const { data: updatedItem, error: itemError } = await supabase
        .from('inventory_items')
        .select('on_hand_qty')
        .eq('id', formData.item_id)
        .single();

      if (itemError) throw itemError;

      const afterQty = updatedItem.on_hand_qty;

      setResult({
        success: true,
        message: 'Movement created successfully! Trigger updated quantity automatically.',
        before_qty: beforeQty,
        after_qty: afterQty,
        movement_id: movementResult.id
      });

      // Update selected item
      setSelectedItem(prev => prev ? { ...prev, on_hand_qty: afterQty } : null);

      // Reload items list
      await loadItems();

    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create movement'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Movement Testing Panel</h2>
            <p className="text-gray-600 mt-1">Manually test different movement types and observe trigger behavior</p>
          </div>
          <button
            onClick={loadItems}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Reload Items
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Column */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Movement</h3>

            {/* Item Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Inventory Item
              </label>
              <select
                value={formData.item_id}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose an item...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.package_id} - {item.product_name} ({item.on_hand_qty}g)
                  </option>
                ))}
              </select>
            </div>

            {/* Movement Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Movement Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(movementTypes) as MovementKind[]).map(kind => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleMovementKindChange(kind)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                      formData.movement_kind === kind
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {movementTypes[kind].label}
                  </button>
                ))}
              </div>
              {formData.movement_kind && (
                <p className="text-sm text-gray-600 mt-2">
                  {movementTypes[formData.movement_kind].description}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (grams)
              </label>
              <input
                type="number"
                value={formData.qty}
                onChange={(e) => setFormData(prev => ({ ...prev, qty: parseFloat(e.target.value) || 0 }))}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              {selectedItem && (
                <p className="text-sm text-gray-600 mt-1">
                  Current quantity: {selectedItem.on_hand_qty}g
                </p>
              )}
            </div>

            {/* Reason Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason Code
              </label>
              <input
                type="text"
                value={formData.reason_code}
                onChange={(e) => setFormData(prev => ({ ...prev, reason_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="test, production, adjustment, etc."
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Additional details about this movement..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedItem || submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Play className={`w-4 h-4 ${submitting ? 'animate-pulse' : ''}`} />
              {submitting ? 'Creating Movement...' : 'Create Movement'}
            </button>
          </form>
        </div>

        {/* Result Column */}
        <div className="space-y-6">
          {/* Selected Item Info */}
          {selectedItem && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Selected Item</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Package ID:</span>
                  <span className="font-medium">{selectedItem.package_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-medium">{selectedItem.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Strain:</span>
                  <span className="font-medium">{selectedItem.strain || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage:</span>
                  <span className="font-medium">{selectedItem.stage || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-600">Current Quantity:</span>
                  <span className="font-bold text-lg">{selectedItem.on_hand_qty}g</span>
                </div>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className={`rounded-lg shadow-sm p-6 ${
              result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? 'Success!' : 'Error'}
                  </h3>
                  <p className={`text-sm mb-4 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>

                  {result.success && result.before_qty !== undefined && result.after_qty !== undefined && (
                    <div className="bg-white rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Before:</span>
                        <span className="font-mono font-medium">{result.before_qty}g</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">After:</span>
                        <span className="font-mono font-bold text-lg">{result.after_qty}g</span>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t pt-2">
                        <span className="text-gray-600">Change:</span>
                        <span className={`font-mono font-bold ${
                          result.after_qty > result.before_qty ? 'text-green-600' :
                          result.after_qty < result.before_qty ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {result.after_qty > result.before_qty ? '+' : ''}
                          {(result.after_qty - result.before_qty).toFixed(2)}g
                        </span>
                      </div>
                      {result.movement_id && (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          Movement ID: {result.movement_id}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!result && !selectedItem && (
            <div className="bg-blue-50 rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-blue-900 mb-2">How to Test</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Select an inventory item from the dropdown</li>
                <li>Choose a movement type to test</li>
                <li>Enter the quantity</li>
                <li>Click "Create Movement"</li>
                <li>Observe the trigger automatically update the quantity</li>
              </ol>
              <p className="text-sm text-blue-700 mt-4">
                The trigger system will handle the quantity calculation and update automatically!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
