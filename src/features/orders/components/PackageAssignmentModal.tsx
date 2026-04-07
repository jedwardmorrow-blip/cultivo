import { useState, useEffect, useMemo } from 'react';
import { Package, Check, AlertCircle, Info } from 'lucide-react';
import { BaseModal } from '@/shared/components/BaseModal';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  useAvailablePackages,
  useAssignPackage,
  useTotalAssignedQuantity,
} from '../hooks';
import type { AvailablePackage } from '../services';

interface PackageAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentComplete?: () => void | Promise<void>;
  orderId: string;
  orderItemId: string;
  productName: string;
  orderItemQuantity: number;
  unit: string;
  batchId?: string | null;
  strain?: string | null;
}

interface SelectedPackage extends AvailablePackage {
  quantityToAssign: number;
}

export function PackageAssignmentModal({
  isOpen,
  onClose,
  onAssignmentComplete,
  orderId,
  orderItemId,
  productName,
  orderItemQuantity,
  unit,
  batchId,
  strain,
}: PackageAssignmentModalProps) {
  const [selectedPackages, setSelectedPackages] = useState<Map<string, SelectedPackage>>(new Map());
  const [notes, setNotes] = useState('');

  const { packages, loading: loadingPackages, error: packagesError, refetch } = useAvailablePackages(
    productName,
    orderItemQuantity,
    batchId,
    strain
  );

  // Detect whether results came from strain fallback (no exact product_name match)
  const isStrainFallback = useMemo(() => {
    if (packages.length === 0 || !strain) return false;
    return !packages.some(pkg => pkg.product_name === productName);
  }, [packages, productName, strain]);
  const { totalAssigned, loading: loadingTotal } = useTotalAssignedQuantity(orderItemId);
  const { assignPackage, assigning } = useAssignPackage();

  const remainingQty = orderItemQuantity - totalAssigned;
  const selectedTotal = Array.from(selectedPackages.values()).reduce(
    (sum, pkg) => sum + pkg.quantityToAssign,
    0
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedPackages(new Map());
      setNotes('');
      refetch();
    }
  }, [isOpen, refetch]);

  const handleSelectPackage = (pkg: AvailablePackage) => {
    const newSelected = new Map(selectedPackages);

    if (newSelected.has(pkg.id)) {
      newSelected.delete(pkg.id);
    } else {
      const defaultQty = Math.min(pkg.available_qty, remainingQty - selectedTotal);
      newSelected.set(pkg.id, {
        ...pkg,
        quantityToAssign: defaultQty,
      });
    }

    setSelectedPackages(newSelected);
  };

  const handleQuantityChange = (packageId: string, quantity: number) => {
    const newSelected = new Map(selectedPackages);
    const pkg = newSelected.get(packageId);

    if (pkg) {
      const maxAllowed = Math.min(pkg.available_qty, remainingQty - selectedTotal + pkg.quantityToAssign);
      pkg.quantityToAssign = Math.max(0, Math.min(quantity, maxAllowed));
      newSelected.set(packageId, pkg);
      setSelectedPackages(newSelected);
    }
  };

  const handleAssign = async () => {
    const assignments = Array.from(selectedPackages.values());

    if (assignments.length === 0) {
      return;
    }

    try {
      for (const pkg of assignments) {
        await assignPackage(
          orderId,
          orderItemId,
          pkg.package_id,
          pkg.quantityToAssign,
          notes || undefined,
          true
        );
      }

      if (onAssignmentComplete) {
        await onAssignmentComplete();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('[PackageAssignmentModal] Assignment failed:', error);
    }
  };

  const canAssign = selectedTotal > 0 && selectedTotal <= remainingQty;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Packages - ${productName}`}
      icon={<Package className="w-6 h-6" />}
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {!batchId && (
          <div className="flex items-center gap-2 p-3 bg-cult-warning-muted border border-cult-warning text-cult-warning text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>No batch assigned to this order item. Assign a batch first to restrict packages to the correct batch.</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-cult-dark-gray border border-cult-medium-gray">
          <div>
            <p className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">Order Item Quantity</p>
            <p className="text-2xl font-bold text-cult-white">
              {orderItemQuantity} {unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">Already Assigned</p>
            <p className="text-2xl font-bold text-cult-success">
              {loadingTotal ? '...' : `${totalAssigned} ${unit}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">Remaining to Assign</p>
            <p className={`text-2xl font-bold ${remainingQty > 0 ? 'text-cult-warning' : 'text-cult-success'}`}>
              {loadingTotal ? '...' : `${remainingQty} ${unit}`}
            </p>
          </div>
        </div>

        {selectedPackages.size > 0 && (
          <div className="p-4 bg-cult-dark-gray border border-cult-medium-gray">
            <p className="text-sm font-bold text-cult-white mb-2 uppercase tracking-wider">
              Selected for Assignment: {selectedTotal} {unit}
            </p>
            <div className="space-y-2">
              {Array.from(selectedPackages.values()).map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-2 bg-cult-near-black border border-cult-success"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-cult-white font-medium">{pkg.package_id}</span>
                    <span className="text-cult-lighter-gray text-sm">
                      {pkg.strain} - {pkg.batch}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max={Math.min(pkg.available_qty, remainingQty - selectedTotal + pkg.quantityToAssign)}
                      value={pkg.quantityToAssign}
                      onChange={(e) => handleQuantityChange(pkg.id, parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-success"
                    />
                    <span className="text-cult-lighter-gray text-sm">
                      of {pkg.available_qty} {unit}
                    </span>
                    <button
                      onClick={() => handleSelectPackage(pkg)}
                      className="text-cult-danger hover:text-cult-danger/80 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {remainingQty > 0 && (
          <>
            <div className="border-t border-cult-medium-gray pt-4">
              <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-4">
                Available Inventory Packages
              </h3>

              {isStrainFallback && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-cult-info-muted border border-cult-info/20 rounded-cult">
                  <Info className="w-4 h-4 text-cult-info flex-shrink-0" />
                  <span className="text-sm text-cult-info">
                    Showing all <strong>{strain}</strong> inventory — no exact match for "{productName}"
                  </span>
                </div>
              )}

              {loadingPackages ? (
                <LoadingSpinner message="Loading available packages..." />
              ) : packagesError ? (
                <div className="p-4 bg-cult-danger-muted border border-cult-danger text-cult-danger">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Failed to load packages: {packagesError.message}</span>
                  </div>
                </div>
              ) : packages.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-12 h-12 text-cult-lighter-gray mx-auto mb-4" />
                  <p className="text-cult-lighter-gray">
                    {strain
                      ? `No inventory found for ${strain}. This strain may need production.`
                      : `No available packages found for ${productName}`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackages.has(pkg.id);

                    return (
                      <button
                        key={pkg.id}
                        onClick={() => handleSelectPackage(pkg)}
                        disabled={!isSelected && selectedTotal >= remainingQty}
                        className={`w-full p-4 border-2 text-left transition-all ${
                          isSelected
                            ? 'border-cult-success bg-cult-success-muted'
                            : 'border-cult-medium-gray bg-cult-dark-gray hover:border-cult-lighter-gray'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-6 h-6 border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-cult-success bg-cult-success'
                                  : 'border-cult-medium-gray'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <div>
                              <p className="font-bold text-cult-white">{pkg.package_id}</p>
                              <p className="text-sm text-cult-lighter-gray">
                                {pkg.strain || 'No strain'} • Batch: {pkg.batch || 'N/A'}
                              </p>
                              {isStrainFallback && pkg.product_name && (
                                <p className="text-xs text-cult-text-muted mt-0.5">{pkg.product_name}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-cult-white">
                              {pkg.available_qty} {unit}
                            </p>
                            <p className="text-xs text-cult-lighter-gray uppercase">Available</p>
                            {pkg.room && (
                              <p className="text-xs text-cult-lighter-gray mt-1">Room: {pkg.room}</p>
                            )}
                            {pkg.thc_percentage && (
                              <p className="text-xs text-cult-success mt-1">
                                THC: {pkg.thc_percentage.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-cult-white mb-2 uppercase tracking-wider">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this assignment..."
                rows={3}
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white placeholder-cult-lighter-gray focus:outline-none focus:border-cult-white"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-cult-medium-gray">
          {selectedTotal > remainingQty && (
            <div className="flex items-center gap-2 text-cult-danger">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">
                Selected quantity ({selectedTotal}) exceeds remaining ({remainingQty})
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={onClose}
              disabled={assigning}
              className="px-6 py-3 border border-cult-medium-gray text-cult-white hover:bg-cult-dark-gray transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!canAssign || assigning}
              className="px-6 py-3 bg-cult-success text-white hover:bg-cult-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wider"
            >
              {assigning ? 'Assigning...' : `Assign ${selectedTotal} ${unit}`}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
