import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, FileText, Printer, Download, Loader2 } from 'lucide-react';
import { generateManifestData, ManifestData, Driver, Vehicle } from '../services/manifestService';
import { ManifestTemplate } from './ManifestTemplate';
import { getAllLocations, Location } from '../../delivery/services/locations.service';
import { notificationService } from '@/services/notification.service';
import { generatePDFFromElement, sanitizeFilename } from '../services/pdfGenerator.service';

interface ManifestModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}

export function ManifestModal({ orderId, orderNumber, onClose }: ManifestModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedOriginId, setSelectedOriginId] = useState('');
  const [stopNumber, setStopNumber] = useState('1');
  const [routeDescription, setRouteDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [manifestData, setManifestData] = useState<ManifestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const manifestRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDriversAndVehicles();
    loadLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && !selectedOriginId) {
      const cultLocation = locations.find(loc =>
        loc.name.toLowerCase() === 'cult cannabis co.' ||
        loc.type === 'facility'
      );
      if (cultLocation) {
        setSelectedOriginId(cultLocation.id);
      }
    }
  }, [locations, selectedOriginId]);

  async function loadDriversAndVehicles() {
    try {
      const [driversResult, vehiclesResult] = await Promise.all([
        supabase
          .from('delivery_drivers')
          .select('*')
          .eq('is_active', true)
          .order('last_name'),
        supabase
          .from('delivery_vehicles')
          .select('*')
          .eq('is_active', true)
          .order('make')
      ]);

      if (driversResult.error) throw driversResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;

      setDrivers(driversResult.data || []);
      setVehicles(vehiclesResult.data || []);

      if (driversResult.data && driversResult.data.length > 0) {
        setSelectedDriverId(driversResult.data[0].id);
      }
      if (vehiclesResult.data && vehiclesResult.data.length > 0) {
        setSelectedVehicleId(vehiclesResult.data[0].id);
      }
    } catch (err) {
      console.error('Error loading drivers and vehicles:', err);
      setError('Failed to load drivers and vehicles');
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    try {
      const allLocations = await getAllLocations();
      setLocations(allLocations);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  }

  async function handleGenerate() {
    if (!selectedDriverId || !selectedVehicleId) {
      setError('Please select both a driver and a vehicle');
      return;
    }

    setGenerating(true);
    setError(null);
    setImagesLoaded(false);

    try {
      const data = await generateManifestData(
        orderId,
        selectedDriverId,
        selectedVehicleId,
        selectedOriginId,
        stopNumber,
        routeDescription,
        notes
      );
      setManifestData(data);
      setTimeout(() => {
        setImagesLoaded(true);
      }, 800);
    } catch (err) {
      console.error('Error generating manifest:', err);
      setError('Failed to generate manifest. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrint() {
    if (!printRef.current) {
      notificationService.warning('Print area not ready. Please try again.');
      return;
    }

    if (!imagesLoaded) {
      notificationService.warning('Please wait for the manifest to finish loading...');
      return;
    }

    setLoadingPrint(true);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      const manifestHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Manifest - ${manifestData?.invoice_number || orderNumber}</title>
          <style>
            @page {
              size: letter;
              margin: 0.5in;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.5;
            }
            img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            /* Preserve all background colors */
            .bg-white { background-color: white !important; }
            .bg-cult-surface-sunken { background-color: #f9fafb !important; }
            .bg-cult-surface { background-color: #f3f4f6 !important; }

            /* Preserve all border colors */
            .border-black { border-color: black !important; }
            .border-cult-border { border-color: #d1d5db !important; }
            .border-cult-border { border-color: #9ca3af !important; }

            /* Preserve all text colors */
            .text-black { color: black !important; }
            .text-cult-text-faint { color: #4b5563 !important; }
            .text-cult-text-muted { color: #374151 !important; }

            /* Border widths */
            .border { border-width: 1px !important; }
            .border-2 { border-width: 2px !important; }
            .border-b { border-bottom-width: 1px !important; }
            .border-b-2 { border-bottom-width: 2px !important; }
            .border-t-2 { border-top-width: 2px !important; }
            .border-r { border-right-width: 1px !important; }

            /* Border styles */
            .border, .border-2, .border-b, .border-b-2, .border-t-2, .border-r {
              border-style: solid !important;
            }

            /* Padding classes */
            .p-2 { padding: 0.5rem !important; }
            .p-3 { padding: 0.75rem !important; }
            .p-4 { padding: 1rem !important; }
            .p-8 { padding: 2rem !important; }
            .pb-1 { padding-bottom: 0.25rem !important; }
            .pb-2 { padding-bottom: 0.5rem !important; }

            /* Margin classes */
            .mb-1 { margin-bottom: 0.25rem !important; }
            .mb-2 { margin-bottom: 0.5rem !important; }
            .mb-3 { margin-bottom: 0.75rem !important; }
            .mb-4 { margin-bottom: 1rem !important; }
            .mt-0\.5 { margin-top: 0.125rem !important; }
            .mt-2 { margin-top: 0.5rem !important; }
            .mt-6 { margin-top: 1.5rem !important; }
            .mt-8 { margin-top: 2rem !important; }
            .ml-2 { margin-left: 0.5rem !important; }
            .mx-2 { margin-left: 0.5rem !important; margin-right: 0.5rem !important; }

            /* Gap classes */
            .gap-2 { gap: 0.5rem !important; }
            .gap-3 { gap: 0.75rem !important; }
            .gap-4 { gap: 1rem !important; }
            .gap-x-3 { column-gap: 0.75rem !important; }
            .gap-x-4 { column-gap: 1rem !important; }
            .gap-y-3 { row-gap: 0.75rem !important; }
            .space-y-1\.5 > * + * { margin-top: 0.375rem !important; }

            /* Layout classes */
            .flex { display: flex !important; }
            .grid { display: grid !important; }
            .inline-flex { display: inline-flex !important; }
            .inline-block { display: inline-block !important; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .col-span-2 { grid-column: span 2 / span 2 !important; }
            .items-center { align-items: center !important; }
            .items-start { align-items: flex-start !important; }
            .justify-center { justify-content: center !important; }
            .justify-between { justify-content: space-between !important; }
            .flex-1 { flex: 1 1 0% !important; }

            /* Text classes */
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
            .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
            .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
            .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
            .text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-bold { font-weight: 700 !important; }
            .uppercase { text-transform: uppercase !important; }
            .italic { font-style: italic !important; }

            /* Width/Height classes */
            .w-full { width: 100% !important; }
            .w-3 { width: 0.75rem !important; }
            .h-12 { height: 3rem !important; }
            .h-16 { height: 4rem !important; }
            .w-16 { width: 4rem !important; }
            .h-3 { height: 0.75rem !important; }
            .min-w-\\[1\\.5rem\\] { min-width: 1.5rem !important; }
            .max-w-full { max-width: 100% !important; }

            /* Object fit */
            .object-contain { object-fit: contain !important; }

            /* Rounded */
            .rounded-full { border-radius: 9999px !important; }

            /* Specific color utilities */
            .bg-green-500 { background-color: #10b981 !important; }
            .bg-red-500 { background-color: #ef4444 !important; }

            /* Table styles */
            table { width: 100%; border-collapse: collapse; }
            th { font-weight: 700; }
            .align-top { vertical-align: top !important; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(manifestHTML);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 500));

      const images = iframeDoc.getElementsByTagName('img');
      const imageLoadPromises = Array.from(images).map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 3000);
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      });

      await Promise.all(imageLoadPromises);
      await new Promise(resolve => setTimeout(resolve, 500));

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => document.body.removeChild(iframe), 1000);
    } catch (error) {
      console.error('Print error:', error);
      notificationService.error('An error occurred while printing. Please try again.');
    } finally {
      setLoadingPrint(false);
    }
  }

  async function handleDownloadPDF() {
    if (!printRef.current || !manifestData) {
      notificationService.warning('Manifest not ready. Please try again.');
      return;
    }

    if (!imagesLoaded) {
      notificationService.warning('Please wait for the manifest to finish loading...');
      return;
    }

    setLoadingDownload(true);

    // html2canvas cannot render display:none elements — temporarily show off-screen
    const hiddenContainer = printRef.current.parentElement as HTMLElement | null;
    if (hiddenContainer) {
      hiddenContainer.style.display = 'block';
      hiddenContainer.style.position = 'absolute';
      hiddenContainer.style.left = '-9999px';
      hiddenContainer.style.top = '0';
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const sanitizedCustomer = sanitizeFilename(manifestData.destination_entity_name);
      const sanitizedManifest = sanitizeFilename(manifestData.manifest_number);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Manifest_${sanitizedManifest}_${sanitizedCustomer}_${timestamp}.pdf`;

      await generatePDFFromElement(printRef.current, {
        filename,
        scale: 2,
        quality: 0.95
      });
    } catch (error) {
      console.error('PDF download error:', error);
      notificationService.error('Failed to download PDF. Please try again or use the Print button.');
    } finally {
      if (hiddenContainer) {
        hiddenContainer.style.display = 'none';
        hiddenContainer.style.position = '';
        hiddenContainer.style.left = '';
        hiddenContainer.style.top = '';
      }
      setLoadingDownload(false);
    }
  }

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
      >
        <div
          className="bg-cult-near-black border-2 border-cult-medium-gray p-8"
        >
          <div className="text-cult-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (drivers.length === 0 || vehicles.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
      >
        <div
          className="bg-cult-near-black border-2 border-cult-medium-gray max-w-md w-full p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-cult-white uppercase tracking-wider">
              Cannot Generate Manifest
            </h3>
            <button
              onClick={onClose}
              className="text-cult-light-gray hover:text-cult-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-cult-light-gray mb-4">
            {drivers.length === 0 && vehicles.length === 0 && (
              <p>Please add at least one driver and one vehicle in Settings before generating a manifest.</p>
            )}
            {drivers.length === 0 && vehicles.length > 0 && (
              <p>Please add at least one driver in Settings before generating a manifest.</p>
            )}
            {drivers.length > 0 && vehicles.length === 0 && (
              <p>Please add at least one vehicle in Settings before generating a manifest.</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 font-medium uppercase tracking-wider text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div
        className="bg-cult-near-black border-2 border-cult-medium-gray max-w-6xl w-full my-8"
      >
        <div className="p-6 border-b border-cult-medium-gray flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-cult-white" />
            <h3 className="text-xl font-bold text-cult-white uppercase tracking-wider">
              Generate Delivery Manifest
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-cult-light-gray hover:text-cult-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!manifestData ? (
          <div className="p-6">
            <div className="mb-4 p-4 bg-cult-black border border-cult-medium-gray">
              <div className="text-cult-white font-semibold mb-1">Order: {orderNumber}</div>
              <div className="text-cult-light-gray text-sm">
                Configure route details and select a driver and vehicle for the delivery manifest
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-900 border border-red-700 text-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Origin Location *
                  </label>
                  <select
                    value={selectedOriginId}
                    onChange={(e) => setSelectedOriginId(e.target.value)}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    required
                  >
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} {location.type === 'facility' && '(Home)'}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-cult-light-gray">
                    Where this delivery route begins
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Stop Number *
                  </label>
                  <input
                    type="text"
                    value={stopNumber}
                    onChange={(e) => setStopNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    placeholder="1"
                    required
                  />
                  <div className="mt-1 text-xs text-cult-light-gray">
                    Position in the delivery sequence
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Driver *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  required
                >
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name} (FA: {driver.fa_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Vehicle *
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  required
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Route Description (Optional)
                </label>
                <div className="mb-2 text-xs text-cult-light-gray">
                  Leave blank to automatically use cached turn-by-turn directions
                </div>
                <textarea
                  value={routeDescription}
                  onChange={(e) => setRouteDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  rows={3}
                  placeholder="Auto-generated from cached route (or enter manually to override)..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  rows={2}
                  placeholder="Any special notes or circumstances..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 font-medium uppercase tracking-wider text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedDriverId || !selectedVehicleId}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white hover:bg-green-700 border-2 border-green-600 transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                {generating ? 'Generating...' : 'Generate Manifest'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-cult-white font-semibold">Manifest Preview</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  disabled={!imagesLoaded || loadingPrint}
                  className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  {loadingPrint ? 'Printing...' : imagesLoaded ? 'Print' : 'Loading...'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={!imagesLoaded || loadingDownload}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-cult-white text-cult-white hover:bg-cult-white hover:text-cult-black transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingDownload ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-cult-surface p-4 max-h-[70vh] overflow-y-auto">
              <ManifestTemplate ref={manifestRef} manifestData={manifestData} onImagesLoaded={() => setImagesLoaded(true)} />
            </div>
            <div style={{ display: 'none' }}>
              <ManifestTemplate ref={printRef} manifestData={manifestData} forPrint={true} />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 font-medium uppercase tracking-wider text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
