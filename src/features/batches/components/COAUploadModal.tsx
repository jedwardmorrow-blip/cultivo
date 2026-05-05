import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { parseCOAPDF, uploadCOAPDF, createCOA, getActiveCOAForBatch, replaceCOA, type ParsedCOAData, type COAData } from '@/features/coa/services/coa.service';
import { notificationService, errorService } from '@/services';
import { checkStorageHealth } from '@/lib/supabase';

interface COAUploadModalProps {
  batchId: string | null;
  batchNumber: string | null;
  strain: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function COAUploadModal({
  batchId,
  batchNumber,
  strain,
  onClose,
  onSuccess
}: COAUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCOAData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'review' | 'confirm' | 'success'>('select');
  const [confirmedMismatch, setConfirmedMismatch] = useState(false);
  const [existingCOA, setExistingCOA] = useState<COAData | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    harvest_date: '',
    manufacture_date: '',
    sample_date: '',
    thc_percentage: '',
    cbd_percentage: '',
    total_cannabinoids_percentage: '',
    total_terpenes_mg_g: ''
  });

  // Check for existing COA on mount
  useEffect(() => {
    async function checkExisting() {
      if (!batchId) {
        setCheckingExisting(false);
        return;
      }

      try {
        const existing = await getActiveCOAForBatch(batchId);
        setExistingCOA(existing);
      } catch (err: any) {
        console.error('COAUploadModal: Error checking existing COA:', err);
      } finally {
        setCheckingExisting(false);
      }
    }

    checkExisting();
  }, [batchId]);

  async function processFile(selectedFile: File) {
    if (!selectedFile.type.includes('pdf')) {
      setError('Please select a PDF file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsParsing(true);

    try {
      const parsed = await parseCOAPDF(selectedFile);
      setParsedData(parsed);
      setFormData({
        harvest_date: parsed.harvest_date || '',
        manufacture_date: parsed.manufacture_date || '',
        sample_date: parsed.sample_date || '',
        thc_percentage: parsed.thc_percentage?.toString() || '',
        cbd_percentage: parsed.cbd_percentage?.toString() || '',
        total_cannabinoids_percentage: parsed.total_cannabinoids_percentage?.toString() || '',
        total_terpenes_mg_g: parsed.total_terpenes_mg_g?.toString() || ''
      });

      // Check if parsed data matches batch
      const strainMismatch = parsed.strain_name && parsed.strain_name.toLowerCase() !== strain?.toLowerCase();
      const batchMismatch = parsed.batch_number && parsed.batch_number !== batchNumber;

      if (strainMismatch || batchMismatch) {
        setStep('confirm');
      } else {
        setStep('review');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse PDF');
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  }

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  }

  async function handleUpload() {
    if (!file || !batchId || !strain || !batchNumber) {
      setError('Missing required data');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Pre-flight check: Verify storage service is accessible
      const healthCheck = await checkStorageHealth();

      if (!healthCheck.ok) {
        const healthError = `Storage service unavailable: ${healthCheck.error}`;
        console.error('COAUploadModal:', healthError);
        throw new Error(healthError);
      }

      // Step 1: Upload PDF file to storage
      const pdfFilePath = await uploadCOAPDF(file);

      // Step 2: Extract terpenes (first 3)
      const terpenes = parsedData?.terpenes || [];
      const terpene1 = terpenes[0] || null;
      const terpene2 = terpenes[1] || null;
      const terpene3 = terpenes[2] || null;

      // Step 3: Build COAData object
      const coaData: Omit<COAData, 'id' | 'created_at' | 'updated_at'> = {
        strain_name: strain, // Use batch's strain
        batch_number: batchNumber, // Use batch's batch_number
        batch_id: batchId,
        harvest_date: formData.harvest_date || null,
        manufacture_date: formData.manufacture_date || null,
        sample_date: formData.sample_date || null,
        thc_percentage: formData.thc_percentage ? parseFloat(formData.thc_percentage) : null,
        thca_percentage: parsedData?.thca_percentage ?? null,
        delta8_thc_percentage: parsedData?.delta8_thc_percentage ?? null,
        delta10_thc_percentage: parsedData?.delta10_thc_percentage ?? null,
        cbd_percentage: formData.cbd_percentage ? parseFloat(formData.cbd_percentage) : null,
        cbda_percentage: parsedData?.cbda_percentage ?? null,
        total_cannabinoids_percentage: formData.total_cannabinoids_percentage ? parseFloat(formData.total_cannabinoids_percentage) : null,
        total_terpenes_mg_g: formData.total_terpenes_mg_g ? parseFloat(formData.total_terpenes_mg_g) : null,
        terpene_1_name: terpene1?.name || null,
        terpene_1_value: terpene1?.value || null,
        terpene_1_percentage: terpene1?.percentage || null,
        terpene_2_name: terpene2?.name || null,
        terpene_2_value: terpene2?.value || null,
        terpene_2_percentage: terpene2?.percentage || null,
        terpene_3_name: terpene3?.name || null,
        terpene_3_value: terpene3?.value || null,
        terpene_3_percentage: terpene3?.percentage || null,
        pesticides_pass: parsedData?.pesticides_pass ?? null,
        heavy_metals_pass: parsedData?.heavy_metals_pass ?? null,
        microbials_pass: parsedData?.microbials_pass ?? null,
        residual_solvents_pass: parsedData?.residual_solvents_pass ?? null,
        pdf_file_path: pdfFilePath,
        is_active: true
      };

      // Step 4: Create or Replace COA record
      if (existingCOA) {
        await replaceCOA(batchId, existingCOA, file, coaData);
        notificationService.success(`COA replaced successfully for batch ${batchNumber}`);
      } else {
        await createCOA(coaData);
        notificationService.success(`COA uploaded successfully for batch ${batchNumber}`);
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      // Check for unique constraint violation
      if (err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        setError('This batch already has an active COA. Please refresh the page and try again.');
      } else {
        setError(err.message || 'Failed to upload COA');
      }
      errorService.handle(err, 'Upload COA');
    } finally {
      setIsUploading(false);
    }
  }

  function handleConfirmMismatch() {
    setConfirmedMismatch(true);
    setStep('review');
  }

  const hasMismatch = parsedData && (
    (parsedData.strain_name && parsedData.strain_name.toLowerCase() !== strain?.toLowerCase()) ||
    (parsedData.batch_number && parsedData.batch_number !== batchNumber)
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-cult-surface border border-cult-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-cult-border">
          <div>
            <h2 className="text-2xl font-bold text-cult-text-primary uppercase tracking-wide">
              Upload COA
            </h2>
            <p className="text-sm text-cult-text-muted mt-1">
              Batch: <span className="text-cult-text-primary font-medium">{batchNumber}</span>
              {' '} | Strain: <span className="text-cult-text-primary font-medium">{strain}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-cult-text-muted hover:text-cult-text-primary transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {checkingExisting ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-8 h-8 text-cult-text-muted mx-auto mb-4 animate-spin" />
              <p className="text-cult-text-muted">Checking for existing COA...</p>
            </div>
          ) : (
            <>
              {existingCOA && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-cult-info-muted border border-cult-info">
                  <AlertTriangle className="w-5 h-5 text-cult-info flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-cult-text-primary font-medium mb-1">Existing COA Detected</p>
                    <p className="text-sm text-cult-text-primary/80 mb-2">
                      This batch already has an active COA. Uploading a new COA will replace the existing one.
                    </p>
                    <div className="text-xs text-cult-text-primary/70 space-y-1">
                      <p>Sample Date: {existingCOA.sample_date || 'N/A'}</p>
                      <p>THC: {existingCOA.thc_percentage?.toFixed(2)}% | CBD: {existingCOA.cbd_percentage?.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-cult-danger-muted border border-cult-danger">
                  <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-cult-text-primary font-medium mb-1">Error</p>
                    <p className="text-sm text-cult-text-primary/80">{error}</p>
                  </div>
                </div>
              )}

              {step === 'select' && (
            <div className="space-y-6">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  disabled={isParsing}
                  className={`w-full p-8 border-2 border-dashed transition-all flex flex-col items-center gap-4 disabled:opacity-50 ${isDragOver ? 'border-cult-accent bg-cult-accent/5' : 'border-cult-border hover:border-cult-accent'}`}
                >
                  <Upload className="w-12 h-12 text-cult-text-muted" />
                  <div className="text-center">
                    <p className="text-cult-text-primary font-medium uppercase tracking-wider mb-2">
                      {isParsing ? 'Parsing PDF...' : isDragOver ? 'Drop PDF Here' : 'Click or Drop COA PDF'}
                    </p>
                    <p className="text-sm text-cult-text-muted">
                      PDF file will be automatically scanned for cannabinoid data
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && parsedData && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-cult-warning-muted border border-cult-warning">
                <AlertTriangle className="w-5 h-5 text-cult-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-cult-text-primary font-medium mb-2">Batch Information Mismatch</p>
                  <p className="text-sm text-cult-text-primary/80 mb-4">
                    The COA PDF contains different information than the selected batch. Please confirm this is correct before proceeding.
                  </p>

                  <div className="space-y-3 bg-cult-black p-4 border border-cult-border">
                    {parsedData.strain_name && parsedData.strain_name.toLowerCase() !== strain?.toLowerCase() && (
                      <div>
                        <p className="text-xs text-cult-text-muted uppercase mb-1">Strain</p>
                        <p className="text-sm text-cult-text-primary">
                          PDF: <span className="font-medium">{parsedData.strain_name}</span>
                          {' '} | Batch: <span className="font-medium">{strain}</span>
                        </p>
                      </div>
                    )}
                    {parsedData.batch_number && parsedData.batch_number !== batchNumber && (
                      <div>
                        <p className="text-xs text-cult-text-muted uppercase mb-1">Batch Number</p>
                        <p className="text-sm text-cult-text-primary">
                          PDF: <span className="font-medium">{parsedData.batch_number}</span>
                          {' '} | Batch: <span className="font-medium">{batchNumber}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmMismatch}
                  className="flex-1 px-6 py-3 bg-cult-accent text-cult-opaque-black hover:bg-cult-accent-hover transition-all font-medium uppercase tracking-wider"
                >
                  Confirm & Continue
                </button>
                <button
                  onClick={() => {
                    setStep('select');
                    setFile(null);
                    setParsedData(null);
                    setConfirmedMismatch(false);
                  }}
                  className="px-6 py-3 border border-cult-border text-cult-text-primary hover:border-cult-accent transition-all font-medium uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'review' && parsedData && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-cult-info-muted border border-cult-info">
                <FileText className="w-5 h-5 text-cult-info flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-cult-text-primary font-medium mb-1">PDF Parsed Successfully</p>
                  <p className="text-sm text-cult-text-primary/80">
                    Review the extracted data below. Make corrections if needed.
                  </p>
                </div>
              </div>

              {hasMismatch && confirmedMismatch && (
                <div className="flex items-start gap-3 p-3 bg-cult-warning-muted border border-cult-warning/50">
                  <AlertTriangle className="w-4 h-4 text-cult-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-cult-text-primary/80">
                    Mismatch confirmed. COA will be linked to batch <strong>{batchNumber}</strong> ({strain}).
                  </p>
                </div>
              )}

              {parsedData.terpenes && parsedData.terpenes.length > 0 && (
                <div className="bg-cult-black p-4 border border-cult-border">
                  <p className="text-sm text-cult-text-muted uppercase tracking-wider mb-3">
                    Detected Terpenes (Top 3 will be saved)
                  </p>
                  <div className="space-y-2">
                    {parsedData.terpenes.slice(0, 3).map((terp, idx) => (
                      <div key={idx} className="text-sm text-cult-text-primary flex justify-between">
                        <span>{terp.name}</span>
                        <span className="text-cult-text-muted">
                          {terp.value} mg/g ({terp.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    Harvest Date
                  </label>
                  <input
                    type="date"
                    value={formData.harvest_date}
                    onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    Manufacture Date
                  </label>
                  <input
                    type="date"
                    value={formData.manufacture_date}
                    onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    Sample Date
                  </label>
                  <input
                    type="date"
                    value={formData.sample_date}
                    onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    THC %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.thc_percentage}
                    onChange={(e) => setFormData({ ...formData, thc_percentage: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    CBD %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cbd_percentage}
                    onChange={(e) => setFormData({ ...formData, cbd_percentage: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    Total Cannabinoids %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_cannabinoids_percentage}
                    onChange={(e) => setFormData({ ...formData, total_cannabinoids_percentage: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-cult-text-muted mb-2 uppercase tracking-wider">
                    Total Terpenes (mg/g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_terpenes_mg_g}
                    onChange={(e) => setFormData({ ...formData, total_terpenes_mg_g: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-border text-cult-text-primary focus:outline-none focus:border-cult-accent transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-cult-accent text-cult-opaque-black hover:bg-cult-accent-hover transition-all font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (existingCOA ? 'Replacing...' : 'Uploading...') : (existingCOA ? 'Replace COA' : 'Upload COA')}
                </button>
                <button
                  onClick={() => {
                    setStep('select');
                    setFile(null);
                    setParsedData(null);
                    setConfirmedMismatch(false);
                  }}
                  disabled={isUploading}
                  className="px-6 py-3 border border-cult-border text-cult-text-primary hover:border-cult-accent transition-all font-medium uppercase tracking-wider disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

              {step === 'success' && (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-cult-success mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-cult-text-primary uppercase tracking-wide mb-2">
                    COA {existingCOA ? 'Replaced' : 'Uploaded'} Successfully
                  </h3>
                  <p className="text-cult-text-muted">
                    Closing...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
