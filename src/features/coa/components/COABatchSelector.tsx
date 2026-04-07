import { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { getStrains, getBatchesByStrain, type BatchOption } from '../services/coa.service';

interface COABatchSelectorProps {
  selectedStrain: string | null;
  selectedBatchId: string | null;
  onStrainChange: (strain: string | null) => void;
  onBatchChange: (batchId: string | null) => void;
  suggestedStrain?: string;
  suggestedBatchNumber?: string;
}

export function COABatchSelector({
  selectedStrain,
  selectedBatchId,
  onStrainChange,
  onBatchChange,
  suggestedStrain,
  suggestedBatchNumber
}: COABatchSelectorProps) {
  const [strains, setStrains] = useState<string[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loadingStrains, setLoadingStrains] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStrains();
  }, []);

  useEffect(() => {
    if (selectedStrain) {
      loadBatches(selectedStrain);
    } else {
      setBatches([]);
      onBatchChange(null);
    }
  }, [selectedStrain]);

  useEffect(() => {
    if (suggestedStrain && strains.includes(suggestedStrain) && !selectedStrain) {
      onStrainChange(suggestedStrain);
    }
  }, [suggestedStrain, strains, selectedStrain]);

  useEffect(() => {
    if (suggestedBatchNumber && batches.length > 0 && !selectedBatchId) {
      const matchingBatch = batches.find(
        b => b.batch_number.toLowerCase() === suggestedBatchNumber.toLowerCase()
      );
      if (matchingBatch) {
        onBatchChange(matchingBatch.id);
      }
    }
  }, [suggestedBatchNumber, batches, selectedBatchId]);

  async function loadStrains() {
    try {
      setLoadingStrains(true);
      setError(null);
      const data = await getStrains();
      setStrains(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load strains');
    } finally {
      setLoadingStrains(false);
    }
  }

  async function loadBatches(strain: string) {
    try {
      setLoadingBatches(true);
      setError(null);
      const data = await getBatchesByStrain(strain);
      setBatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const hasMatch = suggestedStrain && strains.includes(suggestedStrain);
  const hasBatchMatch = suggestedBatchNumber && batches.some(
    b => b.batch_number.toLowerCase() === suggestedBatchNumber.toLowerCase()
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
          Select Strain *
        </label>
        {loadingStrains ? (
          <div className="px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-light-gray text-sm">
            Loading strains...
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedStrain || ''}
              onChange={(e) => onStrainChange(e.target.value || null)}
              className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all appearance-none"
              required
            >
              <option value="">-- Select a strain --</option>
              {strains.map((strain) => (
                <option key={strain} value={strain}>
                  {strain}
                  {strain === suggestedStrain && ' (Suggested)'}
                </option>
              ))}
            </select>
            {hasMatch && selectedStrain === suggestedStrain && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <Check className="w-5 h-5 text-cult-success" />
              </div>
            )}
          </div>
        )}
        {suggestedStrain && !hasMatch && (
          <div className="mt-2 flex items-start gap-2 text-xs text-cult-warning">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Parsed strain "{suggestedStrain}" not found. Please select the correct strain.
            </span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
          Select Batch *
        </label>
        {!selectedStrain ? (
          <div className="px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-light-gray text-sm">
            Select a strain first
          </div>
        ) : loadingBatches ? (
          <div className="px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-light-gray text-sm">
            Loading batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-light-gray text-sm">
            No active batches found for this strain
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedBatchId || ''}
              onChange={(e) => onBatchChange(e.target.value || null)}
              className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all appearance-none"
              required
            >
              <option value="">-- Select a batch --</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number}
                  {batch.harvest_date && ` - ${new Date(batch.harvest_date).toLocaleDateString()}`}
                  {batch.batch_number.toLowerCase() === suggestedBatchNumber?.toLowerCase() && ' (Suggested)'}
                </option>
              ))}
            </select>
            {hasBatchMatch && selectedBatch?.batch_number.toLowerCase() === suggestedBatchNumber?.toLowerCase() && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <Check className="w-5 h-5 text-cult-success" />
              </div>
            )}
          </div>
        )}
        {selectedBatch && (
          <div className="mt-2 p-3 bg-cult-success-muted border border-cult-success">
            <p className="text-sm text-cult-text-primary">
              <span className="font-medium">Selected Batch:</span> {selectedBatch.batch_number}
              {selectedBatch.harvest_date && (
                <span className="text-cult-text-primary/80">
                  {' '}- Harvested {new Date(selectedBatch.harvest_date).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        )}
        {suggestedBatchNumber && !hasBatchMatch && batches.length > 0 && (
          <div className="mt-2 flex items-start gap-2 text-xs text-cult-warning">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Parsed batch "{suggestedBatchNumber}" not found. Please select the correct batch.
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-cult-danger-muted border border-cult-danger text-cult-text-primary text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
