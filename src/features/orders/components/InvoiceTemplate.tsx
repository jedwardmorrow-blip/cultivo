import { forwardRef, useState, useEffect } from 'react';
import { InvoiceData } from '../services/invoiceService';

interface InvoiceTemplateProps {
  invoiceData: InvoiceData;
  forPrint?: boolean;
  onImagesLoaded?: () => void;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceData, forPrint = false, onImagesLoaded }, ref) => {
    const [logoDataUrl, setLogoDataUrl] = useState<string>('');
    const [_logoLoaded, setLogoLoaded] = useState(false);

    useEffect(() => {
      const loadLogo = async () => {
        if (!invoiceData.company_logo_path) {
          setLogoLoaded(true);
          if (onImagesLoaded) onImagesLoaded();
          return;
        }

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              console.error('Could not get canvas context');
              setLogoLoaded(true);
              if (onImagesLoaded) onImagesLoaded();
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const dataUrl = canvas.toDataURL('image/png');
            setLogoDataUrl(dataUrl);
            setLogoLoaded(true);
            if (onImagesLoaded) onImagesLoaded();
          };

          img.onerror = () => {
            console.error('Failed to load logo from URL:', invoiceData.company_logo_path);
            setLogoDataUrl('');
            setLogoLoaded(true);
            if (onImagesLoaded) onImagesLoaded();
          };

          img.src = invoiceData.company_logo_path;
        } catch (error) {
          console.error('Error loading logo:', error);
          setLogoDataUrl('');
          setLogoLoaded(true);
          if (onImagesLoaded) onImagesLoaded();
        }
      };

      loadLogo();
    }, [invoiceData.company_logo_path, onImagesLoaded]);
    const formatDate = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T00:00:00' : dateString);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
      return amount.toFixed(2);
    };

    return (
      <div ref={ref} className="invoice-container bg-white text-black p-8 min-h-[11in]" style={{ width: '8.5in' }}>
        <div className="invoice-header flex items-start justify-between mb-8">
          <div className="invoice-logo flex-shrink-0">
            {(logoDataUrl || invoiceData.company_logo_path) && (
              <img
                src={forPrint && logoDataUrl ? logoDataUrl : invoiceData.company_logo_path}
                alt="Cult Cannabis Co"
                className="h-48 w-auto mb-4"
                style={{ maxHeight: '240px' }}
              />
            )}
          </div>

          <div className="invoice-company-info text-right">
            <div className="company-brand-name font-bold text-xl">{invoiceData.company_brand_name}</div>
            <div className="company-entity-name text-sm font-semibold">{invoiceData.company_entity_name}</div>
            <div className="company-license-name text-sm">{invoiceData.company_license_name}</div>
            <div className="company-license-number text-xs">Lic #: {invoiceData.company_license_number}</div>
            <div className="company-address text-sm mt-2">{invoiceData.company_address}</div>
            <div className="text-sm">{invoiceData.company_city}, {invoiceData.company_state} {invoiceData.company_postal_code}</div>
          </div>
        </div>

        <div className="invoice-details-grid grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div className="sold-to-section">
            <div className="section-title font-bold mb-2">Sold To:</div>
            <div className="text-sm">
              <div className="customer-name font-semibold">{invoiceData.customer_name}</div>
              {invoiceData.customer_delivery_address && (
                <div className="customer-address">{invoiceData.customer_delivery_address}</div>
              )}
              {invoiceData.customer_delivery_city && (
                <div className="customer-address">
                  {invoiceData.customer_delivery_city}, {invoiceData.customer_delivery_state} {invoiceData.customer_delivery_postal_code}
                </div>
              )}
              {invoiceData.customer_license_name && (
                <div className="customer-license-info mt-2 text-xs">
                  <span className="font-semibold">License Name:</span> {invoiceData.customer_license_name}
                </div>
              )}
              {invoiceData.customer_license_number && (
                <div className="customer-license-info text-xs">
                  <span className="font-semibold">License #:</span> {invoiceData.customer_license_number}
                </div>
              )}
            </div>
          </div>

          <div className="invoice-meta text-right">
            <table className="ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="font-bold pr-4 py-1">Invoice:</td>
                  <td>{invoiceData.invoice_number}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-4 py-1">OrderDate:</td>
                  <td>{formatDate(invoiceData.order_date)}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-4 py-1">Est Delivery:</td>
                  <td>{formatDate(invoiceData.estimated_delivery_date) || 'TBD'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="line-items-table w-full border-t-2 border-b-2 border-black mb-6">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-2 px-2 text-sm font-bold">Item</th>
              <th className="text-right py-2 px-2 text-sm font-bold">Qty</th>
              <th className="text-right py-2 px-2 text-sm font-bold">G/C</th>
              <th className="text-right py-2 px-2 text-sm font-bold">Price</th>
              <th className="text-right py-2 px-2 text-sm font-bold">Subtotal</th>
              <th className="text-right py-2 px-2 text-sm font-bold">Discount</th>
              <th className="text-right py-2 px-2 text-sm font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.line_items.map((item, index) => {
              const categoryPrefix = item.product_category === 'bulk' ? 'Bulk - ' : '';
              const productDisplay = `${categoryPrefix}${item.strain || item.product_name}`;

              const strainDetails = [];
              if (item.strain) strainDetails.push(`Strain: ${item.strain}`);
              if (item.strain_dominance) strainDetails.push(`Dominance: ${item.strain_dominance}`);
              if (item.strain_lineage) strainDetails.push(`Lineage: ${item.strain_lineage}`);
              const strainInfo = strainDetails.length > 0 ? strainDetails.join(' | ') : '';

              let batchInfo = '';
              if (item.batch_number) {
                const harvestDisplay = item.harvest_date ? formatDate(item.harvest_date) : '--';
                const thcDisplay = item.thc_percentage !== null ? `${item.thc_percentage.toFixed(2)}%` : '--';
                batchInfo = `Batch: ${item.batch_number} | Harvest: ${harvestDisplay} | THC: ${thcDisplay}`;
              }

              return (
                <tr key={item.id} className={index < invoiceData.line_items.length - 1 ? '' : ''}>
                  <td className="py-2 px-2 text-sm align-top">
                    <div className="product-name font-semibold">{productDisplay}</div>
                    {strainInfo && (
                      <div className="strain-info text-xs text-cult-text-muted mt-0.5">{strainInfo}</div>
                    )}
                    {batchInfo && (
                      <div className="batch-info text-xs text-cult-text-faint mt-0.5 font-medium">{batchInfo}</div>
                    )}
                  </td>
                  <td className="text-right py-2 px-2 text-sm align-top">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="text-right py-2 px-2 text-sm align-top"></td>
                  <td className="text-right py-2 px-2 text-sm align-top">
                    ${formatCurrency(item.unit_price)}
                  </td>
                  <td className="text-right py-2 px-2 text-sm align-top">
                    ${formatCurrency(item.subtotal)}
                  </td>
                  <td className="text-right py-2 px-2 text-sm align-top">
                    ${formatCurrency(item.discount)}
                  </td>
                  <td className="line-item-total text-right py-2 px-2 text-sm align-top font-semibold">
                    ${formatCurrency(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="invoice-footer flex justify-between items-start">
          <div className="notes-section flex-1">
            {invoiceData.notes && (
              <div>
                <div className="notes-title font-bold text-sm mb-1">Notes:</div>
                <div className="notes-content text-sm text-cult-text-muted">{invoiceData.notes}</div>
              </div>
            )}
            <div className="originator-license mt-4">
              <div className="text-sm">
                <span className="label font-bold">Originator Lic #:</span> {invoiceData.company_license_number}
              </div>
            </div>
          </div>

          <div className="totals-section w-64 ml-8">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-right font-bold">Sub-total:</td>
                  <td className="py-1 text-right">${formatCurrency(invoiceData.subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-right font-bold">Discounts:</td>
                  <td className="py-1 text-right">${formatCurrency(invoiceData.discounts)}</td>
                </tr>
                {invoiceData.credit > 0 && (
                  <tr>
                    <td className="py-1 pr-4 text-right font-bold">Credit:</td>
                    <td className="py-1 text-right">${formatCurrency(invoiceData.credit)}</td>
                  </tr>
                )}
                <tr className="grand-total-row border-t-2 border-black">
                  <td className="py-2 pr-4 text-right font-bold text-base">Grand Total:</td>
                  <td className="py-2 text-right font-bold text-base">${formatCurrency(invoiceData.grand_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
