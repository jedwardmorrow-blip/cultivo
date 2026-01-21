import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCOAPDF, createCOA, type COAData } from '@/features/coa/services/coa.service';
import { notificationService, errorService } from '@/services';

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
  const [parsedData, setParsedData] = useState<COAData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'review' | 'success'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    test_date: '',
    thc_percent: '',
    cbd_percent: '',
    total_cannabinoids: '',
    total_terpenes: '',
    notes: ''
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
        test_date: parsed.test_date || '',
        thc_percent: parsed.thc_percent?.toString() || '',
        cbd_percent: parsed.cbd_percent?.toString() || '',
        total_cannabinoids: parsed.total_cannabinoids?.toString() || '',
        total_terpenes: parsed.total_terpenes?.toString() || '',
        notes: ''
      });
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to parse PDF');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleUpload() {
    if (!file || !batchId) {
      setError('Missing required data');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await createCOA({
        file,
        batch_id: batchId,
        test_date: formData.test_date || null,
        thc_percent: formData.thc_percent ? parseFloat(formData.thc_percent) : null,
        cbd_percent: formData.cbd_percent ? parseFloat(formData.cbd_percent) : null,
        total_cannabinoids: formData.total_cannabinoids ? parseFloat(formData.total_cannabinoids) : null,
        total_terpenes: formData.total_terpenes ? parseFloat(formData.total_terpenes) : null,
        notes: formData.notes || null,
        is_active: true
      });

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
              <span className="text-red-100">{error}</span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
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
                    value={formData.thc_percent}
                    onChange={(e) => setFormData({ ...formData, thc_percent: e.target.value })}
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
                    value={formData.cbd_percent}
                    onChange={(e) => setFormData({ ...formData, cbd_percent: e.target.value })}
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
                    value={formData.total_cannabinoids}
                    onChange={(e) => setFormData({ ...formData, total_cannabinoids: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Total Terpenes %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_terpenes}
                    onChange={(e) => setFormData({ ...formData, total_terpenes: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all resize-none"
                    placeholder="Additional notes about this COA..."
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
                  }}
                  disabled={isUploading}
                  className="px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all font-medium uppercase tracking-wider disabled:opacity-50"
                >
                  Back
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
