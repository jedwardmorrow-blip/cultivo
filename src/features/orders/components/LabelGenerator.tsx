import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, Plus, Eye } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { logoService } from '@/features/settings/services';
import { notificationService } from '@/services/notification.service';
import { DEFAULT_LICENSE_NUMBER } from '@/lib/constants';

interface Label {
  id: string;
  label_number: string;
  product_name: string;
  strain: string;
  product_type: string;
  net_weight_grams: number;
  unit_count: number;
  qr_code_data: string;
  thc_percentage: number;
  cbd_percentage: number;
  package_id: string;
  batch_id: string;
  test_date: string;
  package_date: string;
  harvest_date: string;
  printed_at: string;
  compliance_uid: string;
  warnings: string[];
  lineage: string;
  upc_code?: string;
  barcode_url?: string;
  barcode_format?: string;
}

interface Product {
  id: string;
  name: string;
  type: string;
  strain: string;
}

export function LabelGenerator() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLabelForm, setShowNewLabelForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [upcBarcodeUrl, setUpcBarcodeUrl] = useState<string>('');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [imageError, setImageError] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    batch_id: '',
    package_id: '',
    net_weight_grams: 3.5,
    unit_count: 1,
    thc_percentage: 0,
    cbd_percentage: 0,
    test_date: '',
    package_date: new Date().toISOString().split('T')[0],
    harvest_date: '',
    lineage: '',
    product_category: 'Indica Hybrid',
    compliance_uid: '',
    quantity_to_generate: 1,
    upc_code: ''
  });
  const [packageIdPreview, setPackageIdPreview] = useState<string[]>([]);
  const [packageIdWarning, setPackageIdWarning] = useState<string>('');

  useEffect(() => {
    loadLabels();
    loadProducts();
  }, []);

  useEffect(() => {
    checkPackageIdDuplicates();
  }, [formData.package_id, formData.quantity_to_generate]);

  useEffect(() => {
    if (selectedLabel && showPreview) {
      setImagesLoaded(false);
      setImageError('');
      const upcCode = selectedLabel.upc_code || generateUPCFromProduct(selectedLabel);

      const createLogoDataUrl = async () => {
        try {
          const logoUrl = await logoService.getLogoUrl('label');
          if (!logoUrl) {
            setLogoDataUrl('');
            return;
          }

          return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
              }

              const sourceWidth = img.width;
              const sourceHeight = img.height;
              const cropTop = sourceHeight * 0.25;
              const cropBottom = sourceHeight * 0.25;
              const croppedHeight = sourceHeight - cropTop - cropBottom;

              canvas.width = sourceWidth;
              canvas.height = croppedHeight;

              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.drawImage(
                img,
                0, cropTop,
                sourceWidth, croppedHeight,
                0, 0,
                sourceWidth, croppedHeight
              );

              const dataUrl = canvas.toDataURL('image/png');
              setLogoDataUrl(dataUrl);
              resolve();
            };

            img.onerror = () => {
              console.error('Failed to load logo from URL:', logoUrl);
              setLogoDataUrl('');
              resolve();
            };

            img.src = logoUrl;
          });
        } catch (error) {
          console.error('Error loading logo:', error);
          setLogoDataUrl('');
        }
      };

      Promise.all([
        generateQRCode(selectedLabel.qr_code_data),
        generateBarcode(`${selectedLabel.package_id}${selectedLabel.batch_id}`),
        generateUPCBarcode(upcCode),
        createLogoDataUrl()
      ]).then(() => {
        setTimeout(() => {
          setImagesLoaded(true);
        }, 800);
      }).catch(err => {
        console.error('Error generating codes:', err);
        setImageError('Failed to generate barcodes/images: ' + err.message);
        setImagesLoaded(true);
      });
    }
  }, [selectedLabel, showPreview]);

  useEffect(() => {
    if (!showPreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPreview(false);
        setSelectedLabel(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPreview]);

  async function generateQRCode(data: string): Promise<void> {
    try {
      const url = await QRCode.toDataURL(data, {
        width: 200,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  function generateBarcode(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, data, {
          format: 'CODE128',
          width: 3.0,
          height: 100,
          displayValue: true,
          fontSize: 12,
          margin: 0
        });
        const dataUrl = canvas.toDataURL();
        setBarcodeUrl(dataUrl);
        resolve();
      } catch (error) {
        console.error('Error generating barcode:', error);
        reject(error);
      }
    });
  }

  function generateUPCBarcode(upcCode: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      try {
        if (!upcCode || upcCode.length < 8) {
          setUpcBarcodeUrl('');
          resolve();
          return;
        }

        const canvas = document.createElement('canvas');
        const format = upcCode.length === 12 ? 'UPC' : upcCode.length === 8 ? 'EAN8' : 'CODE128';

        JsBarcode(canvas, upcCode, {
          format: format,
          width: 2,
          height: 35,
          displayValue: true,
          fontSize: 9,
          margin: 0
        });
        const dataUrl = canvas.toDataURL();
        setUpcBarcodeUrl(dataUrl);
        resolve();
      } catch (error) {
        console.error('Error generating UPC barcode:', error, upcCode);
        setUpcBarcodeUrl('');
        resolve();
      }
    });
  }

  function generateUPCFromProduct(label: Label): string {
    const strainCode = label.strain.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const weightCode = Math.floor(label.net_weight_grams * 10).toString().padStart(3, '0');
    const typeCode = label.product_type.includes('Indica') ? '1' : label.product_type.includes('Sativa') ? '2' : '3';
    const randomPart = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `0${typeCode}${strainCode.substring(0, 2)}${weightCode}${randomPart}`.substring(0, 12);
  }

  async function loadLabels() {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error('Error loading labels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, strain')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async function checkPackageIdDuplicates() {
    if (!formData.package_id || formData.quantity_to_generate < 1) {
      setPackageIdPreview([]);
      setPackageIdWarning('');
      return;
    }

    const previewIds: string[] = [];
    for (let i = 0; i < formData.quantity_to_generate; i++) {
      const packageId = `${formData.package_id}${String(i + 1).padStart(3, '0')}`;
      previewIds.push(packageId);
    }
    setPackageIdPreview(previewIds);

    // Check for existing labels with these package IDs
    const { data: existingLabels, error } = await supabase
      .from('labels')
      .select('package_id')
      .in('package_id', previewIds);

    if (error) {
      console.error('Error checking for duplicate package IDs:', error);
      return;
    }

    if (existingLabels && existingLabels.length > 0) {
      const duplicateIds = existingLabels.map(l => l.package_id).join(', ');
      setPackageIdWarning(`Warning: The following package IDs already exist: ${duplicateIds}`);
    } else {
      setPackageIdWarning('');
    }
  }

  async function generateLabels() {
    try {
      const product = products.find(p => p.id === formData.product_id);
      if (!product) {
        notificationService.warning('Please select a product');
        return;
      }

      if (!formData.package_id) {
        notificationService.warning('Please enter a package ID prefix');
        return;
      }

      // Final check for duplicates before creating
      await checkPackageIdDuplicates();
      if (packageIdWarning) {
        const confirmed = confirm(`${packageIdWarning}\n\nDo you want to proceed anyway?`);
        if (!confirmed) return;
      }

      const labelsToCreate = [];

      for (let i = 0; i < formData.quantity_to_generate; i++) {
        const packageId = `${formData.package_id}${String(i + 1).padStart(3, '0')}`;
        const labelNumber = `LBL-${Date.now()}-${i}`;
        const qrCodeData = `${formData.batch_id}-${packageId}`;

        labelsToCreate.push({
          label_number: labelNumber,
          product_id: formData.product_id,
          package_id: packageId,
          batch_id: formData.batch_id,
          strain: product.strain,
          product_name: product.name,
          product_type: formData.product_category,
          net_weight_grams: formData.net_weight_grams,
          unit_count: formData.unit_count,
          qr_code_data: qrCodeData,
          thc_percentage: formData.thc_percentage,
          cbd_percentage: formData.cbd_percentage,
          test_date: formData.test_date || null,
          package_date: formData.package_date,
          harvest_date: formData.harvest_date || null,
          expiration_date: null,
          compliance_uid: formData.compliance_uid || DEFAULT_LICENSE_NUMBER,
          lineage: formData.lineage || '',
          upc_code: formData.upc_code || null,
          barcode_format: formData.upc_code ? (formData.upc_code.length === 12 ? 'UPC' : 'CODE128') : 'CODE128',
          warnings: [
            'For medical use only',
            'Keep out of reach of children',
            'May cause drowsiness',
            'Do not operate heavy machinery'
          ]
        });
      }

      const { error } = await supabase
        .from('labels')
        .insert(labelsToCreate);

      if (error) throw error;

      setShowNewLabelForm(false);
      setFormData({
        product_id: '',
        batch_id: '',
        package_id: '',
        net_weight_grams: 3.5,
        unit_count: 1,
        thc_percentage: 0,
        cbd_percentage: 0,
        test_date: '',
        package_date: new Date().toISOString().split('T')[0],
        harvest_date: '',
        lineage: '',
        product_category: 'Indica Hybrid',
        compliance_uid: '',
        quantity_to_generate: 1,
        upc_code: ''
      });

      await loadLabels();
    } catch (error) {
      console.error('Error generating labels:', error);
      notificationService.error('Failed to generate labels. Please try again.');
    }
  }

  async function markAsPrinted(labelId: string) {
    try {
      const { error } = await supabase
        .from('labels')
        .update({ printed_at: new Date().toISOString() })
        .eq('id', labelId);

      if (error) throw error;
      await loadLabels();
    } catch (error) {
      console.error('Error marking label as printed:', error);
    }
  }

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

      const labelHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Print Label</title>
          <style>
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
              margin: 0;
              padding: 0;
              width: 1.5in;
              height: 2in;
            }
            body {
              font-family: Arial, sans-serif;
            }
            #print-label {
              padding: 0.08in !important;
            }
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
      setLoadingPrint(false);
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
          overflow: 'visible'
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
                    width: '0.55in',
                    height: '0.55in',
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

          <div style={{ display: 'flex', gap: '0.08in', marginBottom: '0.01in' }}>
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

          <div style={{ fontSize: '4.5pt', marginBottom: '0.008in', lineHeight: '1.25' }}>
            <div><strong>Additives:</strong> Nitrogen, Phosphorus, Boron, Potassium, Calcium, Magnesium, Zinc, Vitamin B</div>
            <div style={{ marginTop: '0.005in' }}><strong>License:</strong> (Kind Meds Inc.) {selectedLabel.compliance_uid}</div>
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
    return <div className="text-gray-400">Loading labels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Compliance Label Generator</h2>
        <button
          onClick={() => setShowNewLabelForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Labels
        </button>
      </div>

      {showNewLabelForm && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Label Batch</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Product</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
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
              <label className="block text-sm text-gray-400 mb-1">Batch ID</label>
              <input
                type="text"
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="25064H"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Package ID Prefix</label>
              <input
                type="text"
                value={formData.package_id}
                onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="072125"
              />
              {packageIdPreview.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-gray-400 mb-1">Will generate:</div>
                  <div className="flex flex-wrap gap-1">
                    {packageIdPreview.map(id => (
                      <span key={id} className="px-2 py-1 bg-gray-800 rounded text-gray-300 font-mono">
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
              <label className="block text-sm text-gray-400 mb-1">Net Weight (grams)</label>
              <input
                type="number"
                step="0.1"
                value={formData.net_weight_grams}
                onChange={(e) => setFormData({ ...formData, net_weight_grams: parseFloat(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">THC %</label>
              <input
                type="number"
                step="0.01"
                value={formData.thc_percentage}
                onChange={(e) => setFormData({ ...formData, thc_percentage: parseFloat(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">CBD %</label>
              <input
                type="number"
                step="0.01"
                value={formData.cbd_percentage}
                onChange={(e) => setFormData({ ...formData, cbd_percentage: parseFloat(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Product Category</label>
              <input
                type="text"
                value={formData.product_category}
                onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Indica Hybrid"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Lineage</label>
              <input
                type="text"
                value={formData.lineage}
                onChange={(e) => setFormData({ ...formData, lineage: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="(Face Off OG x Kush Mints) x (Biscotti x Sherb BX)"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Harvest Date</label>
              <input
                type="date"
                value={formData.harvest_date}
                onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Package Date</label>
              <input
                type="date"
                value={formData.package_date}
                onChange={(e) => setFormData({ ...formData, package_date: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Compliance UID</label>
              <input
                type="text"
                value={formData.compliance_uid}
                onChange={(e) => setFormData({ ...formData, compliance_uid: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder={DEFAULT_LICENSE_NUMBER}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">UPC Code (Optional)</label>
              <input
                type="text"
                value={formData.upc_code}
                onChange={(e) => setFormData({ ...formData, upc_code: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="12-digit UPC-A or 8-digit EAN-8"
                maxLength={12}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate from product info</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity to Generate</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quantity_to_generate}
                onChange={(e) => setFormData({ ...formData, quantity_to_generate: parseInt(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
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
              onClick={() => setShowNewLabelForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Label #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Batch ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Package ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Weight</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">THC/CBD</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {labels.map(label => (
                <tr key={label.id} className="hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-white font-mono text-sm">{label.label_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-white">{label.product_name}</div>
                    <div className="text-sm text-gray-400">{label.strain}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{label.batch_id}</td>
                  <td className="px-4 py-3 text-gray-400">{label.package_id}</td>
                  <td className="px-4 py-3 text-white">{label.net_weight_grams}g</td>
                  <td className="px-4 py-3 text-gray-400">
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
                          setSelectedLabel(label);
                          setShowPreview(true);
                        }}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Preview & Print"
                      >
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      {!label.printed_at && (
                        <button
                          onClick={() => markAsPrinted(label.id)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                          title="Mark as Printed"
                        >
                          <Printer className="w-4 h-4 text-gray-400" />
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
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 p-4 border-b border-gray-700 flex items-center justify-between no-print bg-gray-900 z-10">
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
                      setShowPreview(false);
                      setSelectedLabel(null);
                    }}
                    className="text-gray-400 hover:text-white px-4"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-16 bg-gray-100 flex items-center justify-center no-print overflow-hidden" style={{ minHeight: '800px' }}>
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
