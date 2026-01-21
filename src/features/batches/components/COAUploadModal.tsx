import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseCOAPDF, uploadCOAPDF, createCOA, type ParsedCOAData, type COAData } from '@/features/coa/services/coa.service';
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

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

  async function handleUpload() {
    if (!file || !batchId || !strain || !batchNumber) {
      setError('Missing required data');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Pre-flight check: Verify storage service is accessible
      console.log('COAUploadModal: Running storage health check...');
      const healthCheck = await checkStorageHealth();
      console.log('COAUploadModal: Health check result:', healthCheck);

      if (!healthCheck.ok) {
        const healthError = `Storage service unavailable: ${healthCheck.error}`;
        console.error('COAUploadModal:', healthError);
        throw new Error(healthError);
      }

      // Step 1: Upload PDF file to storage
      console.log('COAUploadModal: Initiating PDF upload...');
      const pdfFilePath = await uploadCOAPDF(file);
      console.log('COAUploadModal: PDF uploaded successfully:', pdfFilePath);

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
        cbd_percentage: formData.cbd_percentage ? parseFloat(formData.cbd_percentage) : null,
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
        pdf_file_path: pdfFilePath,
        is_active: true
      };

      // Step 4: Create COA record
      await createCOA(coaData);

      notificationService.success(`COA uploaded successfully for batch ${batchNumber}`);
      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      errorService.handle(err, 'Upload COA');
      setError(err.message || 'Failed to upload COA');
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
      <div className="bg-cult-near-black border border-cult-medium-gray max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-cult-medium-gray">
          <div>
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
              Upload COA
            </h2>
            <p className="text-sm text-cult-light-gray mt-1">
              Batch: <span className="text-cult-white font-medium">{batchNumber}</span>
              {' '} | Strain: <span className="text-cult-white font-medium">{strain}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-cult-light-gray hover:text-cult-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-900/20 border border-red-700">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-100 font-medium mb-1">Error</p>
                <p className="text-sm text-red-200">{error}</p>
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
                  disabled={isParsing}
                  className="w-full p-8 border-2 border-dashed border-cult-medium-gray hover:border-cult-white transition-all flex flex-col items-center gap-4 disabled:opacity-50"
                >
                  <Upload className="w-12 h-12 text-cult-light-gray" />
                  <div className="text-center">
                    <p className="text-cult-white font-medium uppercase tracking-wider mb-2">
                      {isParsing ? 'Parsing PDF...' : 'Click to Select COA PDF'}
                    </p>
                    <p className="text-sm text-cult-light-gray">
                      PDF file will be automatically scanned for cannabinoid data
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && parsedData && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-700">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-100 font-medium mb-2">Batch Information Mismatch</p>
                  <p className="text-sm text-yellow-200 mb-4">
                    The COA PDF contains different information than the selected batch. Please confirm this is correct before proceeding.
                  </p>

                  <div className="space-y-3 bg-cult-black p-4 border border-cult-medium-gray">
                    {parsedData.strain_name && parsedData.strain_name.toLowerCase() !== strain?.toLowerCase() && (
                      <div>
                        <p className="text-xs text-cult-light-gray uppercase mb-1">Strain</p>
                        <p className="text-sm text-cult-white">
                          PDF: <span className="font-medium">{parsedData.strain_name}</span>
                          {' '} | Batch: <span className="font-medium">{strain}</span>
                        </p>
                      </div>
                    )}
                    {parsedData.batch_number && parsedData.batch_number !== batchNumber && (
                      <div>
                        <p className="text-xs text-cult-light-gray uppercase mb-1">Batch Number</p>
                        <p className="text-sm text-cult-white">
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
                  className="flex-1 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider"
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
                  className="px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all font-medium uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'review' && parsedData && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700">
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-100 font-medium mb-1">PDF Parsed Successfully</p>
                  <p className="text-sm text-blue-200">
                    Review the extracted data below. Make corrections if needed.
                  </p>
                </div>
              </div>

              {hasMismatch && confirmedMismatch && (
                <div className="flex items-start gap-3 p-3 bg-yellow-900/10 border border-yellow-700/50">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200">
                    Mismatch confirmed. COA will be linked to batch <strong>{batchNumber}</strong> ({strain}).
                  </p>
                </div>
              )}

              {parsedData.terpenes && parsedData.terpenes.length > 0 && (
                <div className="bg-cult-black p-4 border border-cult-medium-gray">
                  <p className="text-sm text-cult-light-gray uppercase tracking-wider mb-3">
                    Detected Terpenes (Top 3 will be saved)
                  </p>
                  <div className="space-y-2">
                    {parsedData.terpenes.slice(0, 3).map((terp, idx) => (
                      <div key={idx} className="text-sm text-cult-white flex justify-between">
                        <span>{terp.name}</span>
                        <span className="text-cult-light-gray">
                          {terp.value} mg/g ({terp.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Harvest Date
                  </label>
                  <input
                    type="date"
                    value={formData.harvest_date}
                    onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Manufacture Date
                  </label>
                  <input
                    type="date"
                    value={formData.manufacture_date}
                    onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Sample Date
                  </label>
                  <input
                    type="date"
                    value={formData.sample_date}
                    onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    THC %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.thc_percentage}
                    onChange={(e) => setFormData({ ...formData, thc_percentage: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    CBD %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cbd_percentage}
                    onChange={(e) => setFormData({ ...formData, cbd_percentage: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Total Cannabinoids %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_cannabinoids_percentage}
                    onChange={(e) => setFormData({ ...formData, total_cannabinoids_percentage: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Total Terpenes (mg/g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_terpenes_mg_g}
                    onChange={(e) => setFormData({ ...formData, total_terpenes_mg_g: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload COA'}
                </button>
                <button
                  onClick={() => {
                    setStep('select');
                    setFile(null);
                    setParsedData(null);
                    setConfirmedMismatch(false);
                  }}
                  disabled={isUploading}
                  className="px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all font-medium uppercase tracking-wider disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-cult-white uppercase tracking-wide mb-2">
                COA Uploaded Successfully
              </h3>
              <p className="text-cult-light-gray">
                Closing...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
