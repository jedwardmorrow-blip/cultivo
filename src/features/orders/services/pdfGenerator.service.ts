import type { InvoiceData } from './invoiceService';
import type { ManifestData } from './manifestService';

export interface PDFGenerationOptions {
  filename?: string;
  scale?: number;
  quality?: number;
}

// Legacy html2canvas approach — still used by coversheet
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    scale = 2,
    quality = 0.95
  } = options;

  try {
    const [html2canvasModule, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const html2canvas = html2canvasModule.default;

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector('.invoice-container');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.transform = 'scale(1)';
        }
      }
    });

    const imgWidth = 8.5;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: imgHeight > 11 ? 'portrait' : 'portrait',
      unit: 'in',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/jpeg', quality);

    if (imgHeight <= 11) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 11;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return await new Promise<string | null>((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T00:00:00' : dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

type jsPDFInstance = import('jspdf').jsPDF;

function addPageNumbers(pdf: jsPDFInstance) {
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
}

// Colors
const HEADER_BG: [number, number, number] = [30, 30, 30];
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALT_ROW: [number, number, number] = [245, 245, 245];
const BORDER_COLOR: [number, number, number] = [200, 200, 200];

// ---------------------------------------------------------------------------
// INVOICE PDF
// ---------------------------------------------------------------------------

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- Logo + Company header ---
  const logoBase64 = data.company_logo_path ? await loadImageAsBase64(data.company_logo_path) : null;
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', margin, y, 100, 100);
  }

  // Company info — right-aligned
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.company_brand_name, pageWidth - margin, y + 14, { align: 'right' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.company_entity_name, pageWidth - margin, y + 28, { align: 'right' });
  pdf.text(data.company_license_name, pageWidth - margin, y + 40, { align: 'right' });
  pdf.setFontSize(8);
  pdf.text(`Lic #: ${data.company_license_number}`, pageWidth - margin, y + 52, { align: 'right' });
  pdf.setFontSize(9);
  pdf.text(data.company_address, pageWidth - margin, y + 68, { align: 'right' });
  pdf.text(`${data.company_city}, ${data.company_state} ${data.company_postal_code}`, pageWidth - margin, y + 80, { align: 'right' });

  y += 115;

  // --- Sold To + Invoice Meta side by side ---
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Sold To:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  let soldY = y + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.customer_name, margin, soldY);
  pdf.setFont('helvetica', 'normal');
  soldY += 12;
  if (data.customer_delivery_address) {
    pdf.text(data.customer_delivery_address, margin, soldY);
    soldY += 12;
  }
  if (data.customer_delivery_city) {
    pdf.text(`${data.customer_delivery_city}, ${data.customer_delivery_state} ${data.customer_delivery_postal_code}`, margin, soldY);
    soldY += 12;
  }
  if (data.customer_license_name) {
    pdf.setFontSize(8);
    pdf.text(`License Name: ${data.customer_license_name}`, margin, soldY);
    soldY += 11;
  }
  if (data.customer_license_number) {
    pdf.setFontSize(8);
    pdf.text(`License #: ${data.customer_license_number}`, margin, soldY);
    soldY += 11;
  }

  // Invoice meta — right side
  const metaX = pageWidth - margin;
  pdf.setFontSize(9);
  const metaLabels = ['Invoice:', 'Order Date:', 'Est Delivery:'];
  const metaValues = [
    data.invoice_number,
    formatDate(data.order_date),
    formatDate(data.estimated_delivery_date) || 'TBD'
  ];
  let metaY = y;
  metaLabels.forEach((label, i) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, metaX - 100, metaY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metaValues[i], metaX, metaY, { align: 'right' });
    metaY += 14;
  });

  y = Math.max(soldY, metaY) + 16;

  // --- Line Items Table ---
  const tableColumns = [
    { header: 'Item', dataKey: 'item' },
    { header: 'Qty', dataKey: 'qty' },
    { header: 'Unit Wt', dataKey: 'unitWt' },
    { header: 'Total Wt', dataKey: 'totalWt' },
    { header: 'Price', dataKey: 'price' },
    { header: 'Subtotal', dataKey: 'subtotal' },
    { header: 'Discount', dataKey: 'discount' },
    { header: 'Total', dataKey: 'total' },
  ];

  const tableRows = data.line_items.map(item => {
    const categoryPrefix = item.product_category === 'bulk' ? 'Bulk - ' : '';
    let itemText = `${categoryPrefix}${item.strain || item.product_name}`;

    const details: string[] = [];
    if (item.strain_dominance) details.push(`${item.strain_dominance}`);
    if (item.strain_lineage) details.push(`Lineage: ${item.strain_lineage}`);
    if (item.batch_number) {
      const harvestDisplay = item.harvest_date ? formatDate(item.harvest_date) : '--';
      const thcDisplay = item.thc_percentage !== null ? `${item.thc_percentage.toFixed(2)}%` : '--';
      details.push(`Batch: ${item.batch_number} | Harvest: ${harvestDisplay} | THC: ${thcDisplay}`);
    }
    if (details.length > 0) {
      itemText += '\n' + details.join('\n');
    }

    return {
      item: itemText,
      qty: `${item.quantity} ${item.unit}`,
      unitWt: item.unit_weight > 0 ? `${item.unit_weight}g` : '—',
      totalWt: item.total_weight > 0 ? `${item.total_weight.toFixed(1)}g` : '—',
      price: `$${formatCurrency(item.unit_price)}`,
      subtotal: `$${formatCurrency(item.subtotal)}`,
      discount: `$${formatCurrency(item.discount)}`,
      total: `$${formatCurrency(item.total)}`,
    };
  });

  autoTable(pdf, {
    startY: y,
    head: [tableColumns.map(c => c.header)],
    body: tableRows.map(r => tableColumns.map(c => r[c.dataKey as keyof typeof r])),
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: HEADER_TEXT,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [0, 0, 0],
      lineColor: BORDER_COLOR,
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: ALT_ROW,
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 45 },
      3: { halign: 'right', cellWidth: 50 },
      4: { halign: 'right', cellWidth: 50 },
      5: { halign: 'right', cellWidth: 55 },
      6: { halign: 'right', cellWidth: 55 },
      7: { halign: 'right', cellWidth: 55, fontStyle: 'bold' },
    },
    styles: {
      overflow: 'linebreak',
    },
    didParseCell: (hookData) => {
      // Style the sub-details (strain/batch info) differently
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const lines = String(hookData.cell.text).split('\n');
        if (lines.length > 1) {
          hookData.cell.styles.fontSize = 8;
        }
      }
    },
  });

  // Get final Y after table
  y = (pdf as any).lastAutoTable.finalY + 16;

  // Check if we need a new page for the footer
  const footerHeight = 80;
  if (y + footerHeight > pdf.internal.pageSize.getHeight() - 30) {
    pdf.addPage();
    y = margin;
  }

  // --- Footer: Notes + Totals ---
  const totalsX = pageWidth - margin - 160;

  // Notes (left side)
  if (data.notes) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const noteLines = pdf.splitTextToSize(data.notes, totalsX - margin - 20);
    pdf.text(noteLines, margin, y + 12);
  }

  // Originator license
  const notesBottom = data.notes
    ? y + 12 + pdf.splitTextToSize(data.notes, totalsX - margin - 20).length * 10 + 8
    : y;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Originator Lic #:', margin, notesBottom);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.company_license_number, margin + 85, notesBottom);

  // Totals (right side)
  const totalsW = 160;
  const tX1 = pageWidth - margin - totalsW;
  const tX2 = pageWidth - margin;
  let tY = y;

  const drawTotalRow = (label: string, value: string, bold = false) => {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, tX2 - 10, tY, { align: 'right' });
    pdf.text(value, tX2, tY, { align: 'right' });
    // Shift label to be left of value
    pdf.text(label, tX1, tY);
    pdf.text(value, tX2, tY, { align: 'right' });
    tY += 14;
  };

  // Clear the double-draw — proper totals block
  tY = y;
  pdf.setFontSize(9);

  const totalRows: [string, string, boolean][] = [
    ['Sub-total:', `$${formatCurrency(data.subtotal)}`, false],
    ['Discounts:', `$${formatCurrency(data.discounts)}`, false],
  ];
  if (data.credit > 0) {
    totalRows.push(['Credit:', `$${formatCurrency(data.credit)}`, false]);
  }

  totalRows.forEach(([label, value, bold]) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(label, tX1, tY);
    pdf.text(value, tX2, tY, { align: 'right' });
    tY += 14;
  });

  // Grand total with top line
  pdf.setDrawColor(0);
  pdf.setLineWidth(1.5);
  pdf.line(tX1, tY - 4, tX2, tY - 4);
  tY += 4;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Grand Total:', tX1, tY);
  pdf.text(`$${formatCurrency(data.grand_total)}`, tX2, tY, { align: 'right' });

  // --- Page numbers ---
  addPageNumbers(pdf);

  // --- Save ---
  const filename = generateInvoiceFilename(data.invoice_number, data.customer_name);
  pdf.save(filename);
}

// ---------------------------------------------------------------------------
// MANIFEST PDF
// ---------------------------------------------------------------------------

export async function generateManifestPDF(data: ManifestData, logoUrl?: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // --- Header bar ---
  pdf.setFillColor(...HEADER_BG);
  pdf.rect(margin, y, pageWidth - margin * 2, 40, 'F');
  pdf.setTextColor(...HEADER_TEXT);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CULT DELIVERY MANIFEST', pageWidth - margin - 8, y + 27, { align: 'right' });

  // Logo in header
  const logoBase64 = logoUrl ? await loadImageAsBase64(logoUrl) : null;
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', margin + 6, y + 4, 32, 32);
  }

  // Invoice # in header
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Invoice #: ${data.invoice_number}`, margin + (logoBase64 ? 44 : 8), y + 27);
  pdf.setTextColor(0);

  y += 50;

  // --- Date / Invoice Number row ---
  const halfW = (pageWidth - margin * 2) / 2;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date Completed', margin, y);
  pdf.text('Invoice Number', margin + halfW, y);
  y += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(data.date_completed, margin, y);
  pdf.text(data.invoice_number.split('-').pop() || '', margin + halfW, y);
  y += 18;

  // Helper: section header — light gray bar with bold title
  const sectionHeader = (title: string) => {
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y + 12, pageWidth - margin, y + 12);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, margin, y + 9);
    y += 20;
  };

  // Helper: draw a field box with label + value
  const FIELD_BG: [number, number, number] = [248, 248, 248];
  const fieldBox = (label: string, value: string, x: number, w: number, h: number) => {
    // Light background box
    pdf.setFillColor(...FIELD_BG);
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
    // Label
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(110, 110, 110);
    pdf.text(label, x + 6, y + 10);
    // Value
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(value, w - 12);
    pdf.text(lines, x + 6, y + 20);
  };

  // Helper: compute box height for multi-line values
  const boxHeight = (value: string, w: number): number => {
    const lines = pdf.splitTextToSize(value, w - 12);
    return 24 + (lines.length - 1) * 10;
  };

  const gap = 8;
  const pageBottom = pageHeight - 50; // safe bottom margin

  // Helper: ensure enough space for a section, break to new page if not
  const ensureSpace = (needed: number) => {
    if (y + needed > pageBottom) {
      pdf.addPage();
      y = margin;
    }
  };

  // --- Route Origin ---
  // Pre-calculate section height: header(20) + row1 + gap + row2 + spacing
  let bh1 = boxHeight(data.origin_location_name, halfW - gap / 2);
  let bh2 = boxHeight(data.stop_number, halfW - gap / 2);
  let rowH = Math.max(bh1, bh2);
  let bh3 = boxHeight(data.origin_location_address, pageWidth - margin * 2);
  ensureSpace(20 + rowH + gap + bh3 + 12);
  sectionHeader('ROUTE ORIGIN');
  fieldBox('Starting Location', data.origin_location_name, margin, halfW - gap / 2, rowH);
  fieldBox('Stop Number', data.stop_number, margin + halfW + gap / 2, halfW - gap / 2, rowH);
  y += rowH + gap;
  fieldBox('Address', data.origin_location_address, margin, pageWidth - margin * 2, bh3);
  y += bh3 + 12;

  // --- Company Information ---
  bh1 = boxHeight(data.originating_entity_name, halfW - gap / 2);
  bh2 = boxHeight(data.originating_entity_license, halfW - gap / 2);
  rowH = Math.max(bh1, bh2);
  const addrText = `${data.originating_entity_address}\n${data.originating_entity_city}, ${data.originating_entity_state} ${data.originating_entity_postal_code}`;
  bh3 = boxHeight(addrText, pageWidth - margin * 2);
  ensureSpace(20 + rowH + gap + bh3 + 12);
  sectionHeader('COMPANY INFORMATION');
  fieldBox('Company', data.originating_entity_name, margin, halfW - gap / 2, rowH);
  fieldBox('License Number', data.originating_entity_license, margin + halfW + gap / 2, halfW - gap / 2, rowH);
  y += rowH + gap;
  fieldBox('Facility Address', addrText, margin, pageWidth - margin * 2, bh3);
  y += bh3 + 12;

  // --- Transport Information ---
  const driverText = `${data.driver.first_name} ${data.driver.last_name}\nFA: ${data.driver.fa_number}`;
  const vehicleText = `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}\nLicense: ${data.vehicle.license_plate}\nVIN: ${data.vehicle.vin}`;
  bh1 = boxHeight(driverText, halfW - gap / 2);
  bh2 = boxHeight(vehicleText, halfW - gap / 2);
  rowH = Math.max(bh1, bh2);
  ensureSpace(20 + rowH + 12);
  sectionHeader('TRANSPORT INFORMATION');
  fieldBox('Delivery Person', driverText, margin, halfW - gap / 2, rowH);
  fieldBox('Vehicle', vehicleText, margin + halfW + gap / 2, halfW - gap / 2, rowH);
  y += rowH + 12;

  // --- Destination Information ---
  bh1 = boxHeight(data.destination_entity_name, halfW - gap / 2);
  bh2 = boxHeight(data.destination_entity_license, halfW - gap / 2);
  rowH = Math.max(bh1, bh2);
  const destAddr = `${data.destination_entity_address}\n${data.destination_entity_city}, ${data.destination_entity_state} ${data.destination_entity_postal_code}`;
  bh3 = boxHeight(destAddr, pageWidth - margin * 2);
  ensureSpace(20 + rowH + gap + bh3 + gap + 40); // include time fields
  sectionHeader('DESTINATION INFORMATION');
  fieldBox('Destination Entity', data.destination_entity_name, margin, halfW - gap / 2, rowH);
  fieldBox('License Number', data.destination_entity_license, margin + halfW + gap / 2, halfW - gap / 2, rowH);
  y += rowH + gap;
  fieldBox('Address', destAddr, margin, pageWidth - margin * 2, bh3);
  y += bh3 + gap;

  // Time fields — writable blank boxes
  const thirdW = (pageWidth - margin * 2 - gap * 2) / 3;
  const timeLabels = ['Departure Time', 'Arrival Time', 'Stop Number'];
  timeLabels.forEach((label, i) => {
    const x = margin + (thirdW + gap) * i;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, thirdW, 32, 2, 2, 'FD');
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(110, 110, 110);
    pdf.text(label, x + 6, y + 10);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(x + 6, y + 26, x + thirdW - 6, y + 26);
  });
  pdf.setTextColor(0, 0, 0);
  y += 40;

  // --- Route Map (if data URL) ---
  if (data.route_map_url && data.route_map_url.startsWith('data:image')) {
    ensureSpace(240);
    sectionHeader('ROUTE VISUALIZATION');
    if (data.route_distance && data.route_duration) {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Distance: ${data.route_distance} | Est. Time: ${data.route_duration}`, pageWidth - margin, y - 16, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }
    const mapW = 360;
    const mapH = 200;
    const mapX = margin + (pageWidth - margin * 2 - mapW) / 2;
    pdf.addImage(data.route_map_url, 'PNG', mapX, y, mapW, mapH);
    y += mapH + 12;
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Origin: ${data.origin_location_name}  •  Destination: ${data.destination_entity_name}`, pageWidth / 2, y, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    y += 16;
  }

  // --- Turn-by-Turn Directions ---
  if (data.route_instructions && data.route_instructions.length > 0) {
    ensureSpace(60);
    sectionHeader('TURN-BY-TURN DIRECTIONS');
    if (data.route_distance && data.route_duration && !(data.route_map_url && data.route_map_url.startsWith('data:image'))) {
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Distance: ${data.route_distance} | Est. Time: ${data.route_duration}`, pageWidth - margin, y - 16, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }
    pdf.setFontSize(7);
    data.route_instructions.forEach(inst => {
      if (y + 12 > pageBottom) { pdf.addPage(); y = margin; }
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${inst.step_number}.`, margin, y);
      pdf.setFont('helvetica', 'normal');
      const text = inst.distance_meters > 0
        ? `${inst.instruction_text} (${(inst.distance_meters / 1609.34).toFixed(1)} mi)`
        : inst.instruction_text;
      const lines = pdf.splitTextToSize(text, pageWidth - margin * 2 - 20);
      pdf.text(lines, margin + 16, y);
      y += lines.length * 9 + 3;
    });
    y += 6;
  }

  // --- Line Items Table ---
  ensureSpace(60);

  const manifestColumns = ['#', 'Item Description', 'Batch #', 'Qty', 'Unit Wt', 'Unit Price', 'Net Wt (g)', 'Gross Wt (g)', 'Price'];

  const manifestRows = data.line_items.map(item => {
    const productDisplay = item.strain || item.product_name;
    const pkgInfo = item.package_id ? `\nPkg: ${item.package_id}` : '';
    return [
      String(item.item_number),
      `${productDisplay}${pkgInfo}`,
      item.batch_number || '—',
      `${item.quantity} ${item.unit}`,
      item.unit_weight > 0 ? `${item.unit_weight}g` : '—',
      `$${item.unit_price.toFixed(2)}`,
      item.net_weight.toFixed(2),
      item.gross_weight.toFixed(2),
      `$${item.total.toFixed(2)}`,
    ];
  });

  // Add total row
  manifestRows.push([
    '', '', '', '', '', '', '', 'Total',
    `$${data.total_amount.toFixed(2)}`,
  ]);

  autoTable(pdf, {
    startY: y,
    head: [manifestColumns],
    body: manifestRows,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: HEADER_TEXT,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: BORDER_COLOR,
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: ALT_ROW,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 65, font: 'courier', fontSize: 6 },
      3: { halign: 'right', cellWidth: 40 },
      4: { halign: 'right', cellWidth: 42 },
      5: { halign: 'right', cellWidth: 50 },
      6: { halign: 'right', cellWidth: 50 },
      7: { halign: 'right', cellWidth: 55 },
      8: { halign: 'right', cellWidth: 45, fontStyle: 'bold' },
    },
    styles: {
      overflow: 'linebreak',
    },
    didParseCell: (hookData) => {
      // Bold the total row
      const isLastRow = hookData.row.index === manifestRows.length - 1;
      if (hookData.section === 'body' && isLastRow) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [255, 255, 255];
      }
    },
    didDrawCell: (hookData) => {
      // Draw top border on total row
      const isLastRow = hookData.row.index === manifestRows.length - 1;
      if (hookData.section === 'body' && isLastRow && hookData.column.index === 0) {
        pdf.setDrawColor(0);
        pdf.setLineWidth(1.5);
        pdf.line(margin, hookData.cell.y, pageWidth - margin, hookData.cell.y);
      }
    },
  });

  y = (pdf as any).lastAutoTable.finalY + 16;

  // --- Delivery Verification ---
  ensureSpace(100);
  sectionHeader('DELIVERY VERIFICATION');

  // Delivery person info box
  const deliveryBoxH = 60;
  pdf.setFillColor(...FIELD_BG);
  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, deliveryBoxH, 2, 2, 'FD');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Delivery Person Information', margin + 8, y + 14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${data.driver.first_name} ${data.driver.last_name}, FA: ${data.driver.fa_number}`, margin + 8, y + 26);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature of Delivery Person', margin + 8, y + 42);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1);
  pdf.line(margin + 8, y + 52, margin + 260, y + 52);
  y += deliveryBoxH + 12;

  // --- Receiver Verification ---
  ensureSpace(130);
  sectionHeader('RECEIVER VERIFICATION');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(80, 80, 80);
  const disclaimerText = 'I confirm that the contents of this shipment match weight and quantity records entered above, and I agree to take custody of this shipment as indicated.';
  const disclaimerLines = pdf.splitTextToSize(disclaimerText, pageWidth - margin * 2);
  pdf.text(disclaimerLines, margin, y);
  pdf.setTextColor(0, 0, 0);
  y += disclaimerLines.length * 9 + 8;

  // Name + FA boxes
  const recHalfW = (pageWidth - margin * 2 - gap) / 2;
  const recBoxH = 36;
  pdf.setFillColor(...FIELD_BG);
  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, recHalfW, recBoxH, 2, 2, 'FD');
  pdf.roundedRect(margin + recHalfW + gap, y, recHalfW, recBoxH, 2, 2, 'FD');
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(110, 110, 110);
  pdf.text('Name of Receiver', margin + 6, y + 10);
  pdf.text('Receiver FA #', margin + recHalfW + gap + 6, y + 10);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin + 6, y + 28, margin + recHalfW - 6, y + 28);
  pdf.line(margin + recHalfW + gap + 6, y + 28, pageWidth - margin - 6, y + 28);
  y += recBoxH + gap;

  // Signature + Date + Page boxes
  const sigW = (pageWidth - margin * 2 - gap * 2) * 0.5;
  const dateW = (pageWidth - margin * 2 - gap * 2) * 0.25;
  const pageW = (pageWidth - margin * 2 - gap * 2) * 0.25;
  const sigBoxH = 44;
  pdf.setFillColor(...FIELD_BG);
  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, sigW, sigBoxH, 2, 2, 'FD');
  pdf.roundedRect(margin + sigW + gap, y, dateW, sigBoxH, 2, 2, 'FD');
  pdf.roundedRect(margin + sigW + gap + dateW + gap, y, pageW, sigBoxH, 2, 2, 'FD');
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(110, 110, 110);
  pdf.text('Signature of Receiver', margin + 6, y + 10);
  pdf.text('Date', margin + sigW + gap + 6, y + 10);
  pdf.text('Page', margin + sigW + gap + dateW + gap + 6, y + 10);
  // Signature line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin + 6, y + 36, margin + sigW - 6, y + 36);
  pdf.line(margin + sigW + gap + 6, y + 36, margin + sigW + gap + dateW - 6, y + 36);
  pdf.setTextColor(0, 0, 0);

  // --- Page numbers ---
  addPageNumbers(pdf);

  // --- Save ---
  const sanitizedCustomer = sanitizeFilename(data.destination_entity_name);
  const sanitizedManifest = sanitizeFilename(data.manifest_number);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Manifest_${sanitizedManifest}_${sanitizedCustomer}_${timestamp}.pdf`;
  pdf.save(filename);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

export function generateInvoiceFilename(
  invoiceNumber: string,
  customerName: string
): string {
  const sanitizedCustomer = sanitizeFilename(customerName);
  const sanitizedInvoice = sanitizeFilename(invoiceNumber);
  const timestamp = new Date().toISOString().split('T')[0];

  return `${sanitizedInvoice}_${sanitizedCustomer}_${timestamp}.pdf`;
}
