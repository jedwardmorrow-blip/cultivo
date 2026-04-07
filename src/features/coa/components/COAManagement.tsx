import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Eye, EyeOff, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import {
  parseCOAPDF,
  updateCOA,
  deleteCOA,
  getAllCOAs,
  getCOAPDFUrl,
  bulkUploadCOAs,
  calculateTotalTHC,
  type COAData,
  type COAUploadQueueItem,
  type COABulkUploadState
} from '../services/coa.service';
import { COAUploadQueue } from './COAUploadQueue';
import { COAReviewWizard } from './COAReviewWizard';
import { COAConfirmationScreen } from './COAConfirmationScreen';

export function COAManagement() {
  const [coas, setCoas] = useState<COAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<COABulkUploadState>({
    queue: [],
    currentIndex: 0,
    isReviewing: false,
    isUploading: false
  });

  useEffect(() => {
    loadCOAs();
  }, []);

  async function loadCOAs() {
    try {
      setLoading(true);
      const data = await getAllCOAs();
      setCoas(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load COAs');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.type.includes('pdf'));
    if (pdfFiles.length === 0) {
      setError('Please select PDF files only');
      return;
    }

    setError(null);
    setSuccess(null);

    const newItems: COAUploadQueueItem[] = pdfFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      fileName: file.name,
      status: 'pending',
      parsedData: null,
      error: null,
      selectedStrain: null,
      selectedBatchId: null,
      uploadedPath: null
    }));

    setUploadState(prev => ({
      ...prev,
      queue: [...prev.queue, ...newItems]
    }));

    for (const item of newItems) {
      parseQueueItem(item.id, item.file);
    }
  }

  async function parseQueueItem(itemId: string, file: File) {
    setUploadState(prev => ({
      ...prev,
      queue: prev.queue.map(item =>
        item.id === itemId ? { ...item, status: 'parsing' as const } : item
      )
    }));

    try {
      const parsed = await parseCOAPDF(file);
      setUploadState(prev => ({
        ...prev,
        queue: prev.queue.map(item =>
          item.id === itemId
            ? { ...item, status: 'parsed' as const, parsedData: parsed, error: null }
            : item
        )
      }));
    } catch (err: any) {
      setUploadState(prev => ({
        ...prev,
        queue: prev.queue.map(item =>
          item.id === itemId
            ? { ...item, status: 'error' as const, error: err.message || 'Failed to parse PDF' }
            : item
        )
      }));
    }
  }

  function removeFromQueue(itemId: string) {
    setUploadState(prev => ({
      ...prev,
      queue: prev.queue.filter(item => item.id !== itemId)
    }));
  }

  function startReview() {
    const parsedItems = uploadState.queue.filter(item => item.status === 'parsed' || item.status === 'reviewed');
    if (parsedItems.length === 0) {
      setError('No COAs are ready for review');
      return;
    }

    setUploadState(prev => ({
      ...prev,
      isReviewing: true,
      currentIndex: 0
    }));
  }

  function updateQueueItem(itemId: string, updates: Partial<COAUploadQueueItem>) {
    setUploadState(prev => ({
      ...prev,
      queue: prev.queue.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  }

  function handleNext() {
    setUploadState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.queue.length - 1)
    }));
  }

  function handlePrevious() {
    setUploadState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0)
    }));
  }

  function handleFinishReview() {
    setUploadState(prev => ({
      ...prev,
      isReviewing: false
    }));
  }

  function handleEditFromConfirmation(index: number) {
    setUploadState(prev => ({
      ...prev,
      isReviewing: true,
      currentIndex: index
    }));
  }

  async function handleConfirmUpload() {
    setUploadState(prev => ({ ...prev, isUploading: true }));
    setError(null);
    setSuccess(null);

    try {
      const result = await bulkUploadCOAs(uploadState.queue);

      if (result.failed.length > 0) {
        setError(`${result.failed.length} COA(s) failed to upload. Check console for details.`);
        console.error('Failed COAs:', result.failed);
      }

      if (result.success.length > 0) {
        setSuccess(`Successfully uploaded ${result.success.length} COA(s)!`);
        await loadCOAs();

        setUploadState({
          queue: result.failed.map(f => f.item),
          currentIndex: 0,
          isReviewing: false,
          isUploading: false
        });

        if (result.failed.length === 0) {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload COAs');
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  }

  async function handleToggleActive(coa: COAData) {
    try {
      await updateCOA(coa.id!, { is_active: !coa.is_active });
      await loadCOAs();
    } catch (err: any) {
      setError(err.message || 'Failed to update COA');
    }
  }

  async function handleDeleteCOA(coa: COAData) {
    if (!confirm(`Are you sure you want to delete the COA for ${coa.strain_name}?`)) return;

    try {
      await deleteCOA(coa.id!, coa.pdf_file_path);
      await loadCOAs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete COA');
    }
  }

  function handleCancel() {
    setUploadState({
      queue: [],
      currentIndex: 0,
      isReviewing: false,
      isUploading: false
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="space-y-6">
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-cult-white" />
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
            Certificate of Analysis Management
          </h2>
        </div>

        {success && (
          <div className="mb-4 flex items-start gap-2 p-4 bg-cult-success-muted border border-cult-success text-cult-text-primary">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Success</p>
              <p className="text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {!uploadState.isReviewing && uploadState.queue.length === 0 && (
          <div className="border-2 border-dashed border-cult-medium-gray p-8 text-center">
            <Upload className="w-12 h-12 text-cult-light-gray mx-auto mb-4" />
            <p className="text-cult-white font-medium mb-2">Upload Certificate of Analysis (PDF)</p>
            <p className="text-sm text-cult-lighter-gray mb-4">
              The system will automatically extract strain, batch, test results, and terpene data
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="coa-upload"
              multiple
            />
            <label
              htmlFor="coa-upload"
              className="inline-block px-6 py-3 bg-cult-white text-cult-black font-medium uppercase tracking-wider cursor-pointer hover:bg-cult-off-white transition-all"
            >
              Select PDF Files
            </label>
          </div>
        )}

        {uploadState.queue.length > 0 && !uploadState.isReviewing && (
          <div className="mt-6">
            <COAUploadQueue
              queue={uploadState.queue}
              onRemove={removeFromQueue}
              currentIndex={uploadState.currentIndex}
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={startReview}
                disabled={uploadState.queue.every(q => q.status !== 'parsed' && q.status !== 'reviewed')}
                className="flex-1 px-6 py-3 bg-cult-white text-cult-black font-medium uppercase tracking-wider hover:bg-cult-off-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Review Process
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-cult-medium-gray text-cult-white font-medium uppercase tracking-wider hover:border-cult-white transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-4 bg-cult-danger-muted border border-cult-danger text-cult-text-primary">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {uploadState.isReviewing && (
        <COAReviewWizard
          queue={uploadState.queue}
          currentIndex={uploadState.currentIndex}
          onUpdateItem={updateQueueItem}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onFinish={handleFinishReview}
          onCancel={handleCancel}
        />
      )}

      {!uploadState.isReviewing && uploadState.queue.length > 0 && uploadState.queue.some(q => q.status === 'reviewed') && (
        <COAConfirmationScreen
          queue={uploadState.queue}
          onEdit={handleEditFromConfirmation}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancel}
          isUploading={uploadState.isUploading}
        />
      )}

      {uploadState.queue.length === 0 && (
        <>
        <div className="bg-cult-near-black border border-cult-medium-gray p-6">
          <h3 className="text-xl font-bold text-cult-white uppercase tracking-wide mb-4">
            Public Facing Pages
          </h3>
        <p className="text-cult-lighter-gray mb-6 text-sm">
          View how your COAs appear to customers on public pages
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-cult-black border border-cult-medium-gray p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-2">
                  Cover Sheet
                </h4>
                <p className="text-sm text-cult-light-gray">
                  Displays product info with QR code
                </p>
              </div>
              <FileText className="w-8 h-8 text-cult-light-gray" />
            </div>

            <div className="bg-cult-near-black border border-cult-medium-gray/50 p-4 mb-4">
              <div className="text-xs text-cult-light-gray mb-2 uppercase tracking-wider">Preview Features:</div>
              <ul className="text-sm text-cult-lighter-gray space-y-1">
                <li>• Product name and details</li>
                <li>• Batch and harvest information</li>
                <li>• QR code to COA library</li>
                <li>• Company branding</li>
              </ul>
            </div>

            <a
              href="/public/coversheet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black font-medium text-sm uppercase tracking-wider hover:bg-cult-off-white transition-all"
            >
              View Cover Sheet
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-cult-black border border-cult-medium-gray p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-2">
                  Testing Library
                </h4>
                <p className="text-sm text-cult-light-gray">
                  Public searchable COA database
                </p>
              </div>
              <Eye className="w-8 h-8 text-cult-light-gray" />
            </div>

            <div className="bg-cult-near-black border border-cult-medium-gray/50 p-4 mb-4">
              <div className="text-xs text-cult-light-gray mb-2 uppercase tracking-wider">Preview Features:</div>
              <ul className="text-sm text-cult-lighter-gray space-y-1">
                <li>• Search by strain or batch</li>
                <li>• View THC, CBD, terpenes</li>
                <li>• Download original PDFs</li>
                <li>• Mobile-friendly layout</li>
              </ul>
            </div>

            <a
              href="/public/testing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black font-medium text-sm uppercase tracking-wider hover:bg-cult-off-white transition-all"
            >
              View Testing Library
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-4 p-4 bg-cult-info-muted border border-cult-info">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-cult-info flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cult-text-primary">
              <p className="font-medium mb-1">Visibility Control</p>
              <p>Only COAs marked as "Active" will appear on public pages. Use the eye icon toggle in the list below to control visibility.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <h3 className="text-xl font-bold text-cult-white uppercase tracking-wide mb-4">
          Uploaded Certificates ({coas.length})
        </h3>

        {loading ? (
          <p className="text-cult-light-gray text-center py-8">Loading COAs...</p>
        ) : coas.length === 0 ? (
          <p className="text-cult-light-gray text-center py-8">No COAs uploaded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cult-medium-gray">
                  <th className="text-left py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">Strain</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">Batch</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">Harvest Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">THC %</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">CBD %</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coas.map((coa) => (
                  <tr key={coa.id} className="border-b border-cult-medium-gray/30 hover:bg-cult-black transition-colors">
                    <td className="py-3 px-4 text-cult-white">{coa.strain_name}</td>
                    <td className="py-3 px-4 text-cult-lighter-gray text-sm">{coa.batch_number}</td>
                    <td className="py-3 px-4 text-cult-lighter-gray text-sm">
                      {coa.harvest_date ? new Date(coa.harvest_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-cult-white font-medium">
                      {coa.thc_percentage != null ? (
                        <span title={
                          coa.thca_percentage != null || coa.delta8_thc_percentage != null || coa.delta10_thc_percentage != null
                            ? `Δ9: ${coa.thc_percentage}%${coa.thca_percentage != null ? ` · THCa: ${coa.thca_percentage}%` : ''}${coa.delta8_thc_percentage ? ` · Δ8: ${coa.delta8_thc_percentage}%` : ''}${coa.delta10_thc_percentage ? ` · Δ10: ${coa.delta10_thc_percentage}%` : ''}`
                            : undefined
                        }>
                          {calculateTotalTHC(coa)?.toFixed(2) ?? coa.thc_percentage.toFixed(2)}%
                          {coa.thca_percentage != null && <span className="text-cult-light-gray text-xs ml-1">(AZDHS)</span>}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-cult-white font-medium">{coa.cbd_percentage != null ? `${coa.cbd_percentage.toFixed(2)}%` : '-'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(coa)}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                          coa.is_active
                            ? 'bg-cult-success-muted text-cult-success border border-cult-success'
                            : 'bg-cult-medium-gray/20 text-cult-light-gray border border-cult-medium-gray'
                        }`}
                      >
                        {coa.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {coa.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {coa.pdf_file_path && (
                          <a
                            href={getCOAPDFUrl(coa.pdf_file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-cult-medium-gray transition-colors"
                            title="View PDF"
                          >
                            <FileText className="w-4 h-4 text-cult-white" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteCOA(coa)}
                          className="p-2 hover:bg-cult-danger-muted transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-cult-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
