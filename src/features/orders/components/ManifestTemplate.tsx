import { forwardRef, useState, useEffect } from 'react';
import { ManifestData } from '../services/manifestService';
import { logoService } from '@/features/settings/services';

interface ManifestTemplateProps {
  manifestData: ManifestData;
  forPrint?: boolean;
  onImagesLoaded?: () => void;
}

export const ManifestTemplate = forwardRef<HTMLDivElement, ManifestTemplateProps>(
  ({ manifestData, onImagesLoaded }, ref) => {
    const [logoDataUrl, setLogoDataUrl] = useState<string>('');
    const [_imagesLoaded, setImagesLoaded] = useState(false);

    useEffect(() => {
      async function loadLogos() {
        try {
          const url = await logoService.getLogoUrl('dark');
          const logoUrlToLoad = url || '/cult-logo-cropped.svg';

          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              console.error('Could not get canvas context');
              setLogoDataUrl(logoUrlToLoad);
              setImagesLoaded(true);
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
            setImagesLoaded(true);
            if (onImagesLoaded) onImagesLoaded();
          };

          img.onerror = () => {
            console.error('Failed to load logo from URL:', logoUrlToLoad);
            setLogoDataUrl('/cult-logo-outline.png');
            setImagesLoaded(true);
            if (onImagesLoaded) onImagesLoaded();
          };

          img.src = logoUrlToLoad;
        } catch (error) {
          console.error('Error loading logo:', error);
          setLogoDataUrl('/cult-logo-outline.png');
          setImagesLoaded(true);
          if (onImagesLoaded) onImagesLoaded();
        }
      }
      loadLogos();
    }, [onImagesLoaded]);

    return (
      <div ref={ref} className="bg-white text-black p-8 min-h-[11in]" style={{ width: '8.5in' }}>
        <div className="border-2 border-black">
          <div className="border-b-2 border-black p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {logoDataUrl && (
                <img
                  src={logoDataUrl}
                  alt="CULT Cannabis Co"
                  className="h-16 w-16 object-contain"
                />
              )}
              <div>
                <div className="font-bold text-sm">Invoice #</div>
                <div className="text-lg font-semibold">{manifestData.invoice_number}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-3xl">CULT DELIVERY MANIFEST</div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="border-r border-black p-4">
              <div className="font-bold text-sm mb-1">Date Completed</div>
              <div className="text-base">{manifestData.date_completed}</div>
            </div>
            <div className="p-4">
              <div className="font-bold text-sm mb-1">Invoice Number</div>
              <div className="text-base">{manifestData.invoice_number.split('-').pop()}</div>
            </div>
          </div>

          <div className="border-b-2 border-black bg-cult-surface-sunken">
            <div className="p-4">
              <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Route Origin</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Starting Location</div>
                  <div className="text-sm font-semibold">{manifestData.origin_location_name}</div>
                </div>
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Stop Number</div>
                  <div className="text-sm font-semibold">{manifestData.stop_number}</div>
                </div>
                <div className="col-span-2 border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Address</div>
                  <div className="text-sm">{manifestData.origin_location_address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-black bg-white">
            <div className="p-4">
              <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Company Information</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Company</div>
                  <div className="text-sm">{manifestData.originating_entity_name}</div>
                </div>
                <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">License Number</div>
                  <div className="text-sm">{manifestData.originating_entity_license}</div>
                </div>
                <div className="col-span-2 border border-cult-border p-2 bg-cult-surface-sunken">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Facility Address</div>
                  <div className="text-sm">{manifestData.originating_entity_address}</div>
                  <div className="text-sm">{manifestData.originating_entity_city}, {manifestData.originating_entity_state} {manifestData.originating_entity_postal_code}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-black">
            <div className="p-4">
              <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Transport Information</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Delivery Person</div>
                  <div className="text-sm">{manifestData.driver.first_name} {manifestData.driver.last_name}</div>
                  <div className="text-xs text-cult-text-faint">FA: {manifestData.driver.fa_number}</div>
                </div>
                <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Vehicle</div>
                  <div className="text-sm">{manifestData.vehicle.year} {manifestData.vehicle.make} {manifestData.vehicle.model}</div>
                  <div className="text-xs text-cult-text-faint">License: {manifestData.vehicle.license_plate}</div>
                  <div className="text-xs text-cult-text-faint">VIN: {manifestData.vehicle.vin}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-black bg-cult-surface-sunken">
            <div className="p-4">
              <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Destination Information</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Destination Entity</div>
                  <div className="text-sm">{manifestData.destination_entity_name}</div>
                </div>
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">License Number</div>
                  <div className="text-sm">{manifestData.destination_entity_license}</div>
                </div>
                <div className="col-span-2 border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Address</div>
                  <div className="text-sm">{manifestData.destination_entity_address}</div>
                  <div className="text-sm">{manifestData.destination_entity_city}, {manifestData.destination_entity_state} {manifestData.destination_entity_postal_code}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-3">
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Departure Time</div>
                  <div className="border-b border-cult-border mt-2 pb-1">______________</div>
                </div>
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Arrival Time</div>
                  <div className="border-b border-cult-border mt-2 pb-1">______________</div>
                </div>
                <div className="border border-cult-border p-2 bg-white">
                  <div className="font-semibold text-xs text-cult-text-faint mb-1">Stop Number</div>
                  <div className="border-b border-cult-border mt-2 pb-1">______________</div>
                </div>
              </div>
            </div>
          </div>

          {manifestData.route_map_url && manifestData.route_map_url.startsWith('data:image') ? (
            <div className="border-b-2 border-black bg-white">
              <div className="p-4">
                <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2 flex items-center justify-between">
                  <span>Route Visualization</span>
                  {manifestData.route_distance && manifestData.route_duration && (
                    <span className="text-xs font-normal text-cult-text-faint">
                      Distance: {manifestData.route_distance} | Est. Time: {manifestData.route_duration}
                    </span>
                  )}
                </div>
                <div className="flex justify-center bg-cult-surface-sunken p-4">
                  <img
                    src={manifestData.route_map_url}
                    alt="Route Map"
                    className="border-2 border-cult-border max-w-full"
                    style={{ width: '600px', height: '400px', objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-2 text-xs text-cult-text-faint text-center">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 border border-white"></span>
                    Origin: {manifestData.origin_location_name}
                    <span className="mx-2">•</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 border border-white"></span>
                    Destination: {manifestData.destination_entity_name}
                  </span>
                </div>
              </div>
            </div>
          ) : manifestData.route_distance && manifestData.route_duration ? (
            <div className="border-b-2 border-black bg-cult-surface-sunken">
              <div className="p-4">
                <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Route Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-cult-border p-2 bg-white">
                    <div className="font-semibold text-xs text-cult-text-faint mb-1">Distance</div>
                    <div className="text-base font-semibold">{manifestData.route_distance}</div>
                  </div>
                  <div className="border border-cult-border p-2 bg-white">
                    <div className="font-semibold text-xs text-cult-text-faint mb-1">Estimated Time</div>
                    <div className="text-base font-semibold">{manifestData.route_duration}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {manifestData.route_instructions && manifestData.route_instructions.length > 0 && (
            <div className="border-b-2 border-black bg-white">
              <div className="p-4">
                <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2 flex items-center justify-between">
                  <span>Turn-by-Turn Directions</span>
                  {manifestData.route_distance && manifestData.route_duration && !manifestData.route_map_url && (
                    <span className="text-xs font-normal text-cult-text-faint">
                      Distance: {manifestData.route_distance} | Est. Time: {manifestData.route_duration}
                    </span>
                  )}
                </div>
                <ol className="space-y-1.5 text-xs">
                  {manifestData.route_instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="font-bold text-cult-text-muted min-w-[1.5rem]">{instruction.step_number}.</span>
                      <div className="flex-1">
                        <span>{instruction.instruction_text}</span>
                        {instruction.distance_meters > 0 && (
                          <span className="text-cult-text-faint ml-2">
                            ({(instruction.distance_meters / 1609.34).toFixed(1)} mi)
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r border-black p-2 text-left font-bold">#</th>
                <th className="border-r border-black p-2 text-left font-bold">Item Description</th>
                <th className="border-r border-black p-2 text-right font-bold">Qty</th>
                <th className="border-r border-black p-2 text-right font-bold">Unit Price</th>
                <th className="border-r border-black p-2 text-right font-bold">Net Wt (g)</th>
                <th className="border-r border-black p-2 text-right font-bold">Gross Wt (g)</th>
                <th className="p-2 text-right font-bold">Price</th>
              </tr>
            </thead>
            <tbody>
              {manifestData.line_items.map((item, index) => {
                const productDisplay = item.strain ? `${item.strain}` : item.product_name;
                const packageInfo = item.package_id && item.batch_number
                  ? `Package: ${item.package_id} | Batch: ${item.batch_number}`
                  : '';

                return (
                  <tr key={item.item_number} className={index < manifestData.line_items.length - 1 ? 'border-b border-black' : ''}>
                    <td className="border-r border-black p-2 align-top">{item.item_number}</td>
                    <td className="border-r border-black p-2 align-top">
                      <div className="font-semibold">{productDisplay}</div>
                      {packageInfo && (
                        <div className="text-xs text-cult-text-muted mt-0.5">{packageInfo}</div>
                      )}
                    </td>
                    <td className="border-r border-black p-2 text-right align-top">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="border-r border-black p-2 text-right align-top">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="border-r border-black p-2 text-right align-top">
                      {item.net_weight.toFixed(2)}
                    </td>
                    <td className="border-r border-black p-2 text-right align-top">
                      {item.gross_weight.toFixed(2)}
                    </td>
                    <td className="p-2 text-right align-top font-semibold">
                      ${item.total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {manifestData.line_items.length < 3 && Array.from({ length: 3 - manifestData.line_items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-black">
                  <td className="border-r border-black p-2 h-12">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                </tr>
              ))}
              <tr className="border-t-2 border-black">
                <td colSpan={6} className="border-r border-black p-2 text-right font-bold">Total</td>
                <td className="p-2 text-right font-bold">${manifestData.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="border-t-2 border-black p-4 bg-cult-surface-sunken">
            <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Delivery Verification</div>
            <div className="border border-cult-border p-3 bg-white">
              <div className="mb-4">
                <div className="font-bold text-sm mb-2">Delivery Person Information</div>
                <div className="text-sm">{manifestData.driver.first_name} {manifestData.driver.last_name}, FA: {manifestData.driver.fa_number}</div>
              </div>
              <div>
                <div className="font-bold text-sm mb-2">Signature of Delivery Person</div>
                <div className="border-b-2 border-black mt-8"></div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black p-4 bg-white">
            <div className="font-bold text-base mb-3 uppercase border-b border-cult-border pb-2">Receiver Verification</div>
            <div className="text-xs italic mb-3 text-cult-text-muted">
              I confirm that the contents of this shipment match weight and quantity records entered above, and I agree to take custody of this shipment as indicated.
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                <div className="font-bold text-xs mb-1">Name of Receiver</div>
                <div className="mt-6 border-b-2 border-black"></div>
              </div>
              <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                <div className="font-bold text-xs mb-1">Receiver FA #</div>
                <div className="mt-6 border-b-2 border-black"></div>
              </div>
            </div>
            <div className="grid grid-cols-[2fr,1fr,1fr] gap-3">
              <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                <div className="font-bold text-xs mb-1">Signature of Receiver</div>
                <div className="mt-8 border-b-2 border-black"></div>
              </div>
              <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                <div className="font-bold text-xs mb-1">Date</div>
                <div className="mt-8 border-b-2 border-black"></div>
              </div>
              <div className="border border-cult-border p-2 bg-cult-surface-sunken">
                <div className="font-bold text-xs mb-1">Page</div>
                <div className="mt-8 text-sm">1 of 1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ManifestTemplate.displayName = 'ManifestTemplate';
