import re
import sys

FILE_PATH = 'src/features/orders/components/LabelGenerator.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. SPLIT AT renderLabelContent
parts = content.split('  const renderLabelContent = (forPrint: boolean = false) => {', 1)
if len(parts) != 2:
    print("Failed to split at renderLabelContent")
    sys.exit(1)

# 2. CREATE NEW TOP HEADER
new_top = """import { useRef } from 'react';
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

  const renderLabelContent = (forPrint: boolean = false) => {"""

# 3. REWRITE THE JSX WITH REGEX
jsx = parts[1]

# Replace setFormData({ ...formData, x: y }) -> dispatchForm({ type: 'SET_FIELD', field: 'x', value: y })
jsx = re.sub(r'setFormData\(\{\s*\.\.\.formData,\s*(\w+):\s*(.*?)\s*\}\)', r"dispatchForm({ type: 'SET_FIELD', field: '\1', value: \2 })", jsx)

# Replace setShowNewLabelForm(true)
jsx = jsx.replace('setShowNewLabelForm(true)', "dispatchForm({ type: 'SHOW_NEW_FORM' })")
jsx = jsx.replace('setShowNewLabelForm(false)', "dispatchForm({ type: 'CLOSE_NEW_FORM' })")

# Replace Preview UI state toggles
jsx = jsx.replace('setShowPreview(true);\n                        }}', "dispatchForm({ type: 'SHOW_PREVIEW', label });\n                        }}")
jsx = jsx.replace('setSelectedLabel(label);\n                          setShowPreview(true);', "dispatchForm({ type: 'SHOW_PREVIEW', label });")
jsx = jsx.replace('setShowPreview(false);\n                      setSelectedLabel(null);', "dispatchForm({ type: 'CLOSE_PREVIEW' });")

# Write final file
new_content = new_top + jsx

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Successfully refactored {FILE_PATH}!")
