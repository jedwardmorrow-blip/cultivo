import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { COABatchSelector } from './COABatchSelector';
import type { COAUploadQueueItem, ParsedCOAData } from '../services/coa.service';

interface COAReviewWizardProps {
  queue: COAUploadQueueItem[];
  currentIndex: number;
  onUpdateItem: (id: string, updates: Partial<COAUploadQueueItem>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
  onCancel: () => void;
}

export function COAReviewWizard({
  queue,
  currentIndex,
  onUpdateItem,
  onNext,
  onPrevious,
  onFinish,
  onCancel
}: COAReviewWizardProps) {
  const currentItem = queue[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === queue.length - 1;

  const [parsedData, setParsedData] = useState<ParsedCOAData | null>(null);
  const [selectedStrain, setSelectedStrain] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (currentItem) {
      setParsedData(currentItem.parsedData);
      setSelectedStrain(currentItem.selectedStrain);
      setSelectedBatchId(currentItem.selectedBatchId);
    }
  }, [currentItem]);

  if (!currentItem || !parsedData) {
    return (
      <div className="p-6 bg-cult-near-black border border-cult-medium-gray">
        <p className="text-cult-light-gray text-center">No COA data available</p>
      </div>
    );
  }

  const canProceed = selectedStrain && selectedBatchId;

  function handleNext() {
    onUpdateItem(currentItem.id, {
      parsedData,
      selectedStrain,
      selectedBatchId,
      status: 'reviewed'
    });
    onNext();
  }

  function handlePrevious() {
    onUpdateItem(currentItem.id, {
      parsedData,
      selectedStrain,
      selectedBatchId
    });
    onPrevious();
  }

  function handleFinish() {
    onUpdateItem(currentItem.id, {
      parsedData,
      selectedStrain,
      selectedBatchId,
      status: 'reviewed'
    });
    onFinish();
  }

  return (
    <div className="space-y-6">
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-cult-white uppercase tracking-wide">
              Review COA {currentIndex + 1} of {queue.length}
            </h3>
            <p className="text-sm text-cult-light-gray mt-1">
              {currentItem.fileName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-cult-light-gray">
              {queue.filter(q => q.status === 'reviewed').length} of {queue.length} reviewed
            </div>
          </div>
        </div>

        {currentItem.error && (
          <div className="mb-6 flex items-start gap-2 p-4 bg-red-900/20 border border-red-700 text-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Parse Error</p>
              <p className="text-sm mt-1">{currentItem.error}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <COABatchSelector
            selectedStrain={selectedStrain}
            selectedBatchId={selectedBatchId}
            onStrainChange={setSelectedStrain}
            onBatchChange={setSelectedBatchId}
            suggestedStrain={parsedData.strain_name}
            suggestedBatchNumber={parsedData.batch_number}
          />
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-bold text-cult-white uppercase tracking-wide mb-4">
              Parsed COA Details
            </h4>
            <div className="mb-4 p-4 bg-cult-black border border-cult-medium-gray">
              <p className="text-sm text-cult-light-gray mb-2">
                <span className="font-medium text-cult-white uppercase">Parsed Strain:</span> {parsedData.strain_name || 'Not detected'}
              </p>
              <p className="text-sm text-cult-light-gray">
                <span className="font-medium text-cult-white uppercase">Parsed Batch:</span> {parsedData.batch_number || 'Not detected'}
              </p>
              <p className="text-xs text-cult-light-gray mt-3 italic">
                Use the dropdowns above to select the actual strain and batch to link this COA to.
              </p>
            </div>

            <h4 className="text-lg font-bold text-cult-white uppercase tracking-wide mb-4 mt-6">
              Test Results
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Harvest Date
                </label>
                <input
                  type="date"
                  value={parsedData.harvest_date || ''}
                  onChange={(e) => setParsedData({ ...parsedData, harvest_date: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Sample Date
                </label>
                <input
                  type="date"
                  value={parsedData.sample_date || ''}
                  onChange={(e) => setParsedData({ ...parsedData, sample_date: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  THC %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parsedData.thc_percentage || ''}
                  onChange={(e) => setParsedData({ ...parsedData, thc_percentage: parseFloat(e.target.value) || null })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  CBD %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parsedData.cbd_percentage ?? 0}
                  onChange={(e) => setParsedData({ ...parsedData, cbd_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Total Terpenes (mg/g)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parsedData.total_terpenes_mg_g || ''}
                  onChange={(e) => setParsedData({ ...parsedData, total_terpenes_mg_g: parseFloat(e.target.value) || null })}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold text-cult-white uppercase tracking-wide mb-4">
              Top 3 Terpenes
            </h4>
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-cult-black border border-cult-medium-gray">
                  <div>
                    <label className="block text-xs text-cult-light-gray mb-1 uppercase">
                      Terpene {index + 1} Name
                    </label>
                    <input
                      type="text"
                      value={parsedData.terpenes[index]?.name || ''}
                      onChange={(e) => {
                        const newTerpenes = [...parsedData.terpenes];
                        if (!newTerpenes[index]) newTerpenes[index] = { name: '', value: 0, percentage: 0 };
                        newTerpenes[index].name = e.target.value;
                        setParsedData({ ...parsedData, terpenes: newTerpenes });
                      }}
                      className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray text-cult-white text-sm focus:outline-none focus:border-cult-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cult-light-gray mb-1 uppercase">
                      Value (mg/g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={parsedData.terpenes[index]?.value || ''}
                      onChange={(e) => {
                        const newTerpenes = [...parsedData.terpenes];
                        if (!newTerpenes[index]) newTerpenes[index] = { name: '', value: 0, percentage: 0 };
                        newTerpenes[index].value = parseFloat(e.target.value) || 0;
                        setParsedData({ ...parsedData, terpenes: newTerpenes });
                      }}
                      className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray text-cult-white text-sm focus:outline-none focus:border-cult-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cult-light-gray mb-1 uppercase">
                      Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={parsedData.terpenes[index]?.percentage || ''}
                      onChange={(e) => {
                        const newTerpenes = [...parsedData.terpenes];
                        if (!newTerpenes[index]) newTerpenes[index] = { name: '', value: 0, percentage: 0 };
                        newTerpenes[index].percentage = parseFloat(e.target.value) || 0;
                        setParsedData({ ...parsedData, terpenes: newTerpenes });
                      }}
                      className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray text-cult-white text-sm focus:outline-none focus:border-cult-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 pt-6 border-t border-cult-medium-gray">
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-cult-medium-gray text-cult-white font-medium uppercase tracking-wider hover:border-cult-white transition-all"
          >
            Cancel
          </button>

          <div className="flex gap-4">
            {!isFirst && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-6 py-3 border border-cult-medium-gray text-cult-white font-medium uppercase tracking-wider hover:border-cult-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            {!isLast ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center gap-2 px-6 py-3 bg-cult-white text-cult-black font-medium uppercase tracking-wider hover:bg-cult-off-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canProceed}
                className="px-6 py-3 bg-green-600 text-white font-medium uppercase tracking-wider hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review All
              </button>
            )}
          </div>
        </div>

        {!canProceed && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700 text-amber-100 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Please fill in all required fields and select a batch before proceeding.</span>
          </div>
        )}
      </div>
    </div>
  );
}
