/**
 * PackageCreationForm Component
 *
 * Form for creating and managing packages during conversion.
 * Supports both bulk (weight-based) and packaged (unit-based) products.
 */

import { Plus, Trash2, Package } from 'lucide-react';
import { ConversionLotSummary, PackageInProgress, isBulkProduct } from '@/types';

interface PackageCreationFormProps {
  lot: ConversionLotSummary;
  packages: PackageInProgress[];
  onAddPackage: (weight?: number, units?: number) => Promise<void>;
  onRemovePackage: (index: number) => void;
  onUpdatePackage: (index: number, weight?: number, units?: number) => void;
  isLoading: boolean;
}

export function PackageCreationForm({
  lot,
  packages,
  onAddPackage,
  onRemovePackage,
  onUpdatePackage,
  isLoading,
}: PackageCreationFormProps) {
  const isBulk = isBulkProduct(lot);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Packages ({packages.length})
        </h3>
        <button
          onClick={() => onAddPackage()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Package
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            No packages yet. Add packages to begin conversion.
          </p>
          <button
            onClick={() => onAddPackage()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Package
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <PackageCard
              key={pkg.temp_id}
              pkg={pkg}
              index={index}
              isBulk={isBulk}
              onUpdate={(weight, units) => onUpdatePackage(index, weight, units)}
              onRemove={() => onRemovePackage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PackageCardProps {
  pkg: PackageInProgress;
  index: number;
  isBulk: boolean;
  onUpdate: (weight?: number, units?: number) => void;
  onRemove: () => void;
}

function PackageCard({ pkg, index, isBulk, onUpdate, onRemove }: PackageCardProps) {
  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      {/* Package number */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-700 font-semibold rounded-lg">
        {index + 1}
      </div>

      {/* Package ID */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-500 mb-1">Package ID</div>
        <div className="text-sm font-mono font-medium text-gray-900 truncate">
          {pkg.package_id}
        </div>
      </div>

      {/* Weight/Units input */}
      <div className="flex-shrink-0 w-40">
        {isBulk ? (
          <div>
            <label htmlFor={`package-${index}-weight`} className="text-xs font-medium text-gray-500 mb-1 block">
              Weight (grams)
            </label>
            <input
              id={`package-${index}-weight`}
              type="number"
              min="0"
              step="0.01"
              value={pkg.weight || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                onUpdate(isNaN(value) ? undefined : value, undefined);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        ) : (
          <div>
            <label htmlFor={`package-${index}-units`} className="text-xs font-medium text-gray-500 mb-1 block">
              Units
            </label>
            <input
              id={`package-${index}-units`}
              type="number"
              min="0"
              step="1"
              value={pkg.units || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                onUpdate(undefined, isNaN(value) ? undefined : value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 transition-colors"
        title="Remove package"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
