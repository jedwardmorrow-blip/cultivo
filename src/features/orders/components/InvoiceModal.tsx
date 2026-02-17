import { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { generateInvoiceData, InvoiceData } from '../services/invoiceService';
import { InvoiceTemplate } from './InvoiceTemplate';
import { generatePDFFromElement, generateInvoiceFilename } from '../services/pdfGenerator.service';
import { notificationService } from '@/services/notification.service';

interface InvoiceModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}

export function InvoiceModal({ orderId, orderNumber, onClose }: InvoiceModalProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInvoiceData();
  }, [orderId]);

  async function loadInvoiceData() {
    try {
      setLoading(true);
      setError(null);
      const data = await generateInvoiceData(orderId);
      setInvoiceData(data);
      setImagesLoaded(false);
    } catch (err) {
      console.error('Error generating invoice:', err);
      setError('Failed to generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (invoiceData && !loading) {
      setTimeout(() => {
        setImagesLoaded(true);
      }, 800);
    }
  }, [invoiceData, loading]);

  async function handlePrint() {
    if (!printRef.current) {
      notificationService.warning('Print area not ready. Please try again.');
      return;
    }

    if (!imagesLoaded) {
      notificationService.warning('Please wait for the invoice to finish loading...');
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

      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${invoiceData?.invoice_number || orderNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
              background: white !important;
            }
            body {
              font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.5;
              color: #000000;
            }
            img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              max-width: 100%;
              height: auto;
            }

            /* Utility Classes - Layout */
            .bg-white { background-color: #ffffff !important; }
            .text-black { color: #000000 !important; }
            .p-8 { padding: 2rem; }
            .min-h-\[11in\] { min-height: 11in; }
            .flex { display: flex; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-0\.5, .mt-0 { margin-top: 0.125rem; }
            .ml-8 { margin-left: 2rem; }
            .ml-auto { margin-left: auto; }
            .flex-shrink-0 { flex-shrink: 0; }
            .flex-1 { flex: 1 1 0%; }

            /* Grid */
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 2rem; }

            /* Text Alignment */
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }

            /* Font Sizes */
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }

            /* Font Weights */
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }

            /* Colors */
            .text-gray-700 { color: #374151; }
            .text-gray-600 { color: #4B5563; }

            /* Width */
            .w-full { width: 100%; }
            .w-64 { width: 16rem; }
            .w-auto { width: auto; }

            /* Height */
            .h-48 { height: 12rem; }

            /* Padding */
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .pr-4 { padding-right: 1rem; }

            /* Alignment */
            .align-top { vertical-align: top; }

            /* Borders */
            .border-t-2 { border-top-width: 2px; border-top-style: solid; }
            .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
            .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
            .border-black { border-color: #000000; }

            /* Table Specific */
            table { border-collapse: collapse; width: 100%; }
            th, td { text-align: inherit; }

            /* Specific Invoice Styles */
            .invoice-container {
              background-color: #ffffff;
              color: #000000;
              padding: 2rem;
              min-height: 11in;
              width: 8.5in;
              margin: 0 auto;
            }

            .invoice-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 2rem;
            }

            .invoice-logo {
              flex-shrink: 0;
            }

            .invoice-logo img {
              height: 12rem;
              width: auto;
              margin-bottom: 1rem;
              max-height: 240px;
            }

            .invoice-company-info {
              text-align: right;
            }

            .company-brand-name {
              font-weight: 700;
              font-size: 1.25rem;
              line-height: 1.75rem;
            }

            .company-entity-name {
              font-size: 0.875rem;
              line-height: 1.25rem;
              font-weight: 600;
            }

            .company-license-name {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .company-license-number {
              font-size: 0.75rem;
              line-height: 1rem;
            }

            .company-address {
              font-size: 0.875rem;
              line-height: 1.25rem;
              margin-top: 0.5rem;
            }

            .invoice-details-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 2rem;
              margin-bottom: 2rem;
            }

            .sold-to-section .section-title {
              font-weight: 700;
              margin-bottom: 0.5rem;
            }

            .sold-to-section .customer-name {
              font-weight: 600;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .sold-to-section .customer-address {
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .sold-to-section .customer-license-info {
              margin-top: 0.5rem;
              font-size: 0.75rem;
              line-height: 1rem;
            }

            .invoice-meta {
              text-align: right;
            }

            .invoice-meta table {
              margin-left: auto;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .invoice-meta td:first-child {
              font-weight: 700;
              padding-right: 1rem;
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .invoice-meta td:last-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
            }

            .line-items-table {
              width: 100%;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              margin-bottom: 1.5rem;
            }

            .line-items-table thead tr {
              border-bottom: 1px solid #000000;
            }

            .line-items-table th {
              text-align: left;
              padding: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              font-weight: 700;
            }

            .line-items-table th.text-right {
              text-align: right;
            }

            .line-items-table td {
              padding: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              vertical-align: top;
            }

            .line-items-table td.text-right {
              text-align: right;
            }

            .product-name {
              font-weight: 600;
            }

            .strain-info {
              font-size: 0.75rem;
              line-height: 1rem;
              color: #374151;
              margin-top: 0.125rem;
            }

            .batch-info {
              font-size: 0.75rem;
              line-height: 1rem;
              color: #4B5563;
              margin-top: 0.125rem;
              font-weight: 500;
            }

            .line-item-total {
              font-weight: 600;
            }

            .invoice-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }

            .notes-section {
              flex: 1 1 0%;
            }

            .notes-section .notes-title {
              font-weight: 700;
              font-size: 0.875rem;
              line-height: 1.25rem;
              margin-bottom: 0.25rem;
            }

            .notes-section .notes-content {
              font-size: 0.875rem;
              line-height: 1.25rem;
              color: #374151;
            }

            .originator-license {
              margin-top: 1rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .originator-license .label {
              font-weight: 700;
            }

            .totals-section {
              width: 16rem;
              margin-left: 2rem;
            }

            .totals-section table {
              width: 100%;
              font-size: 0.875rem;
              line-height: 1.25rem;
            }

            .totals-section td:first-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              padding-right: 1rem;
              text-align: right;
              font-weight: 700;
            }

            .totals-section td:last-child {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              text-align: right;
            }

            .totals-section .grand-total-row {
              border-top: 2px solid #000000;
            }

            .totals-section .grand-total-row td {
              padding-top: 0.5rem;
              padding-bottom: 0.5rem;
              font-weight: 700;
              font-size: 1rem;
              line-height: 1.5rem;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(invoiceHTML);
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
    if (!printRef.current || !invoiceData) {
      notificationService.warning('Invoice not ready. Please try again.');
      return;
    }

    if (!imagesLoaded) {
      notificationService.warning('Please wait for the invoice to finish loading...');
      return;
    }

    setLoadingDownload(true);

    try {
      const filename = generateInvoiceFilename(
        invoiceData.invoice_number,
        invoiceData.customer_name
      );

      await generatePDFFromElement(printRef.current, {
        filename,
        scale: 2,
        quality: 0.95
      });
    } catch (error) {
      console.error('PDF download error:', error);
      notificationService.error('Failed to download PDF. Please try again or use the Print button.');
    } finally {
      setLoadingDownload(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-cult-dark-gray border-2 border-cult-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b-2 border-cult-medium-gray bg-cult-near-black">
          <div>
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
              Invoice Preview
            </h2>
            <p className="text-cult-light-gray text-sm mt-1">
              Order: {orderNumber}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!loading && !error && (
              <>
                <button
                  onClick={handlePrint}
                  disabled={!imagesLoaded || loadingPrint}
                  className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                  {loadingPrint ? 'Printing...' : imagesLoaded ? 'Print' : 'Loading...'}
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={!imagesLoaded || loadingDownload}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-cult-white text-cult-white hover:bg-cult-white hover:text-cult-black transition-all font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download PDF"
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
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-cult-light-gray hover:text-cult-white hover:bg-cult-medium-gray transition-all"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-cult-black">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-cult-white animate-spin" />
                <p className="text-cult-light-gray">Generating invoice...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="bg-red-900/30 border-2 border-red-600 text-red-400 p-6 rounded max-w-md text-center">
                <p className="font-semibold mb-2">Error</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={loadInvoiceData}
                  className="mt-4 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all text-sm uppercase tracking-wider"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && invoiceData && (
            <>
              <div className="flex justify-center">
                <div className="shadow-2xl">
                  <InvoiceTemplate ref={invoiceRef} invoiceData={invoiceData} onImagesLoaded={() => setImagesLoaded(true)} />
                </div>
              </div>
              <div style={{ display: 'none' }}>
                <InvoiceTemplate ref={printRef} invoiceData={invoiceData} forPrint={true} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
