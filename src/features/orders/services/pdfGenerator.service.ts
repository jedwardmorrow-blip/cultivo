
export interface PDFGenerationOptions {
  filename?: string;
  scale?: number;
  quality?: number;
}

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
