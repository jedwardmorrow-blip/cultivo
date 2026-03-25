import { useRef } from 'react';
import { Printer, Plus, Eye } from 'lucide-react';
import { useLabelGenerator } from '../hooks/useLabelGenerator';
import { notificationService } from '@/services/notification.service';
import { DEFAULT_LICENSE_NUMBER } from '@/lib/constants';

export function LabelGenerator() {
  const {
    labels,
    products,
    loading,
    formState,
    previewState,
    dispatchForm,
    dispatchPreview,
    generateLabels,
    markAsPrinted
  } = useLabelGenerator();

  const { formData, packageIdPreview, packageIdWarning, showNewLabelForm, showPreview, selectedLabel } = formState;
  const { qrCodeUrl, barcodeUrl, upcBarcodeUrl, logoDataUrl, imagesLoaded, loadingPrint, imageError } = previewState;

  const printRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  async function handlePrint() {
    if (!printRef.current) {
      notificationService.warning('Print area not ready. Please try again.');
      return;
    }
    if (!imagesLoaded) {
      notificationService.warning('Please wait for the label to finish loading...');
      return;
    }
    if (!qrCodeUrl || !barcodeUrl) {
      notificationService.warning('Barcodes are still generating. Please wait...');
      return;
    }
    if (imageError) {
      notificationService.error('There was an error generating the label: ' + imageError);
      return;
    }

    dispatchPreview({ type: 'SET_PRINTING', isPrinting: true });

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

      const labelHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Print Label</title>
          <style>
            @page { size: 1.5in 2in; margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            html, body { margin: 0; padding: 0; width: 1.5in; height: 2in; }
            body { font-family: Arial, sans-serif; }
            #print-label { padding: 0.08in !important; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(labelHTML);
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

      if (!selectedLabel?.printed_at) {
        await markAsPrinted(selectedLabel!.id);
      }
    } catch (error) {
      console.error('Print error:', error);
      notificationService.error('An error occurred while printing. Please try again.');
    } finally {
      dispatchPreview({ type: 'SET_PRINTING', isPrinting: false });
    }
  }

  const renderLabelContent = (forPrint: boolean = false) => {
    if (!selectedLabel) return null;

    return (
      <div id={forPrint ? "print-label-container" : undefined} style={forPrint ? { display: 'none' } : undefined}>
        <div id={forPrint ? "print-label" : undefined} ref={forPrint ? printRef : undefined} style={{
          width: '1.5in',
          height: '2in',
          backgroundColor: 'white',
          color: 'black',
          padding: '0.08in',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          fontSize: '6.5pt',
          lineHeight: '1.15',
          display: 'flex',
          flexDirection: 'column',
          border: forPrint ? 'none' : '1px solid #ddd',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.01in' }}>
            <div style={{ flex: 1 }}>
              {logoDataUrl && (
                <img
                  src={logoDataUrl}
                  alt="CULT Logo"
                  style={{
                    width: '0.85in',
                    height: 'auto',
                    marginBottom: '0.01in',
                    display: 'block'
                  }}
                />
              )}
              <div style={{ fontSize: '6.5pt', fontWeight: 'bold', marginBottom: '0.008in' }}>
                {selectedLabel.product_name}
              </div>
              {selectedLabel.lineage && (
                <div style={{ fontSize: '4.5pt', marginBottom: '0.008in', lineHeight: '1.2' }}>
                  <strong>Lineage -</strong><br />
                  {selectedLabel.lineage}
                </div>
              )}
            </div>
            <div style={{ marginLeft: '0.05in' }}>
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  style={{
                    width: '0.48in',
                    height: '0.48in',
                    display: 'block'
                  }}
                />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '0.01in' }}>
            <div style={{ fontSize: '5.5pt', fontWeight: 'bold', marginBottom: '0.005in' }}>
              {selectedLabel.product_type}
            </div>
            <div style={{ fontSize: '5pt' }}>
              <strong>Package Date:</strong> {selectedLabel.package_date ? new Date(selectedLabel.package_date).toLocaleDateString('en-US') : 'N/A'}
            </div>
            {selectedLabel.harvest_date && (
              <div style={{ fontSize: '5pt' }}>
                <strong>Harvest Date:</strong> {new Date(selectedLabel.harvest_date).toLocaleDateString('en-US')}
              </div>
            )}
            <div style={{ fontSize: '5pt' }}>
              <strong>MMJ Net Weight:</strong> {selectedLabel.net_weight_grams} Grams
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.05in', marginBottom: '0.005in' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '5pt' }}>
                <strong>Batch:</strong>
              </div>
              <div style={{ fontSize: '5.5pt', fontWeight: 'bold' }}>
                {selectedLabel.batch_id}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '5pt' }}>
                <strong>THC:</strong>
              </div>
              <div style={{ fontSize: '5.5pt', fontWeight: 'bold' }}>
                {selectedLabel.thc_percentage.toFixed(2)}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '5pt' }}>
                <strong>CBD:</strong>
              </div>
              <div style={{ fontSize: '5.5pt', fontWeight: 'bold' }}>
                {selectedLabel.cbd_percentage.toFixed(2)}%
              </div>
            </div>
          </div>

          <div style={{ fontSize: selectedLabel.customer_license_name ? '3.5pt' : '4.5pt', marginBottom: '0.004in', lineHeight: '1.25' }}>
            <div><strong>Additives:</strong> Nitrogen, Phosphorus, Boron, Potassium, Calcium, Magnesium, Zinc, Vitamin B</div>
            <div style={{ marginTop: '0.003in' }}><strong>License:</strong> (Kind Meds Inc.) {selectedLabel.compliance_uid}</div>
            {selectedLabel.customer_license_name && (
              <div style={{ marginTop: '0.003in' }}><strong>License:</strong> ({selectedLabel.customer_license_name}) {selectedLabel.customer_license_number || ''}</div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '0.005in', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {upcBarcodeUrl && (
              <div style={{ marginBottom: '0.005in', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={upcBarcodeUrl}
                  alt="UPC Barcode"
                  style={{
                    width: '100%',
                    maxWidth: '1.35in',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
            {barcodeUrl && (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={barcodeUrl}
                  alt="Package Barcode"
                  style={{
                    width: '100%',
                    maxWidth: '1.35in',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-cult-text-muted">Loading labels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Compliance Label Generator</h2>
        <button
          onClick={() => dispatchForm({ type: 'SHOW_NEW_FORM' })}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Labels
        </button>
      </div>

      {showNewLabelForm && (
        <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Label Batch</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Product</label>
              <select
                value={formData.product_id}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'product_id', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.strain})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Batch ID</label>
              <input
                type="text"
                value={formData.batch_id}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'batch_id', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
                placeholder="25064H"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Package ID Prefix</label>
              <input
                type="text"
                value={formData.package_id}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'package_id', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
                placeholder="072125"
              />
              {packageIdPreview.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-cult-text-muted mb-1">Will generate:</div>
                  <div className="flex flex-wrap gap-1">
                    {packageIdPreview.map(id => (
                      <span key={id} className="px-2 py-1 bg-cult-surface-raised rounded text-cult-text-secondary font-mono">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {packageIdWarning && (
                <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                  {packageIdWarning}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Net Weight (grams)</label>
              <input
                type="number"
                step="0.1"
                value={formData.net_weight_grams}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'net_weight_grams', value: parseFloat(e.target.value) })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">THC %</label>
              <input
                type="number"
                step="0.01"
                value={formData.thc_percentage}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'thc_percentage', value: parseFloat(e.target.value) })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">CBD %</label>
              <input
                type="number"
                step="0.01"
                value={formData.cbd_percentage}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'cbd_percentage', value: parseFloat(e.target.value) })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Product Category</label>
              <input
                type="text"
                value={formData.product_category}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'product_category', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
                placeholder="Indica Hybrid"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Lineage</label>
              <input
                type="text"
                value={formData.lineage}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'lineage', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
                placeholder="(Face Off OG x Kush Mints) x (Biscotti x Sherb BX)"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Harvest Date</label>
              <input
                type="date"
                value={formData.harvest_date}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'harvest_date', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Package Date</label>
              <input
                type="date"
                value={formData.package_date}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'package_date', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Compliance UID</label>
              <input
                type="text"
                value={formData.compliance_uid}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'compliance_uid', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
                placeholder={DEFAULT_LICENSE_NUMBER}
              />
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">UPC Code (Optional)</label>
              <input
                type="text"
                value={formData.upc_code}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'upc_code', value: e.target.value })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
                placeholder="12-digit UPC-A or 8-digit EAN-8"
                maxLength={12}
              />
              <p className="text-xs text-cult-text-muted mt-1">Leave blank to auto-generate from product info</p>
            </div>

            <div>
              <label className="block text-sm text-cult-text-muted mb-1">Quantity to Generate</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quantity_to_generate}
                onChange={(e) => dispatchForm({ type: 'SET_FIELD', field: 'quantity_to_generate', value: parseInt(e.target.value) })}
                className="w-full bg-cult-surface border border-cult-border rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={generateLabels}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Generate {formData.quantity_to_generate} Label{formData.quantity_to_generate !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => dispatchForm({ type: 'CLOSE_NEW_FORM' })}
              className="px-4 py-2 bg-cult-surface-overlay hover:bg-cult-surface-overlay text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cult-surface/50 border-b border-cult-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Label #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Batch ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Package ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Weight</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">THC/CBD</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-border">
              {labels.map(label => (
                <tr key={label.id} className="hover:bg-cult-surface/30">
                  <td className="px-4 py-3 text-white font-mono text-sm">{label.label_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-white">{label.product_name}</div>
                    <div className="text-sm text-cult-text-muted">{label.strain}</div>
                  </td>
                  <td className="px-4 py-3 text-cult-text-muted">{label.batch_id}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{label.package_id}</td>
                  <td className="px-4 py-3 text-white">{label.net_weight_grams}g</td>
                  <td className="px-4 py-3 text-cult-text-muted">
                    {label.thc_percentage.toFixed(2)}% / {label.cbd_percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    {label.printed_at ? (
                      <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                        Printed
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          dispatchForm({ type: 'SHOW_PREVIEW', label });
                        }}
                        className="p-2 hover:bg-cult-surface-overlay rounded transition-colors"
                        title="Preview & Print"
                      >
                        <Eye className="w-4 h-4 text-cult-text-muted" />
                      </button>
                      {!label.printed_at && (
                        <button
                          onClick={() => markAsPrinted(label.id)}
                          className="p-2 hover:bg-cult-surface-overlay rounded transition-colors"
                          title="Mark as Printed"
                        >
                          <Printer className="w-4 h-4 text-cult-text-muted" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPreview && selectedLabel && (
        <>
          <style>{`
            #print-label-container {
              display: none;
            }

            @media print {
              @page {
                size: 1.5in 2in;
                margin: 0;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }

              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 1.5in !important;
                height: 2in !important;
                overflow: hidden !important;
              }

              body * {
                display: none !important;
              }

              #print-label-container {
                display: block !important;
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 1.5in !important;
                height: 2in !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                z-index: 99999 !important;
              }

              #print-label-container * {
                display: revert !important;
              }

              #print-label {
                display: flex !important;
                flex-direction: column !important;
                width: 1.5in !important;
                height: 2in !important;
                margin: 0 !important;
                padding: 0.1in !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                font-family: Arial, sans-serif !important;
              }

              #print-label * {
                color: black !important;
              }

              #print-label img {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                display: block !important;
                opacity: 1 !important;
              }
            }
          `}</style>

          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 no-print">
            <div className="bg-cult-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 p-4 border-b border-cult-border flex items-center justify-between no-print bg-cult-surface z-10">
                <h3 className="text-xl font-bold text-white">Label Preview (1.5" x 2")</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    disabled={!imagesLoaded || loadingPrint}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    {loadingPrint ? 'Printing...' : imagesLoaded ? 'Print Label' : 'Loading...'}
                  </button>
                  <button
                    onClick={() => {
                      dispatchForm({ type: 'CLOSE_PREVIEW' });
                    }}
                    className="text-cult-text-muted hover:text-white px-4"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-16 bg-cult-surface flex items-center justify-center no-print overflow-hidden" style={{ minHeight: '800px' }}>
                {imageError && (
                  <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
                    {imageError}
                  </div>
                )}
                <div style={{
                  transform: 'scale(2.8)',
                  transformOrigin: 'center',
                  margin: '80px'
                }}>
                  {renderLabelContent(false)}
                </div>
              </div>
            </div>
          </div>
          <canvas ref={barcodeCanvasRef} style={{ display: 'none' }} />
          {renderLabelContent(true)}
        </>
      )}
    </div>
  );
}
