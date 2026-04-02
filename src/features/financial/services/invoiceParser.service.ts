/**
 * Invoice Parser Service
 *
 * Extracts structured data from vendor invoice PDFs using pdfjs-dist.
 * Designed for cannabis industry vendor invoices (nutrient suppliers,
 * lab testing, packaging, utilities, etc.)
 *
 * Uses the same pdfjs pipeline as the COA parser but with invoice-specific
 * regex patterns for vendor name, invoice number, dates, amounts, and line items.
 */

let _pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjsLib() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist');
    _pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return _pdfjsLib;
}

export interface ParsedLineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
}

export interface ParsedInvoiceData {
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  line_items: ParsedLineItem[];
  raw_text: string;
  confidence: 'high' | 'medium' | 'low';
}

// Common date formats found on invoices
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,       // MM/DD/YYYY or MM-DD-YYYY
  /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,        // YYYY-MM-DD or YYYY/MM/DD
  /([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/,        // Month DD, YYYY
  /(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})/,          // DD Month YYYY
];

// Month name lookup
const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(text: string): string | null {
  // Try YYYY-MM-DD first (ISO)
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Try MM/DD/YYYY or MM-DD-YYYY
  const usMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (usMatch) {
    const m = usMatch[1].padStart(2, '0');
    const d = usMatch[2].padStart(2, '0');
    return `${usMatch[3]}-${m}-${d}`;
  }

  // Try "Month DD, YYYY"
  const namedMatch = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (namedMatch) {
    const monthNum = MONTHS[namedMatch[1].toLowerCase()];
    if (monthNum) {
      const d = namedMatch[2].padStart(2, '0');
      return `${namedMatch[3]}-${monthNum}-${d}`;
    }
  }

  // Try "DD Month YYYY"
  const euMatch = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (euMatch) {
    const monthNum = MONTHS[euMatch[2].toLowerCase()];
    if (monthNum) {
      const d = euMatch[1].padStart(2, '0');
      return `${euMatch[3]}-${monthNum}-${d}`;
    }
  }

  return null;
}

function parseCurrency(text: string): number | null {
  const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? null : val;
  }
  return null;
}

function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /inv(?:oice)?[\s#:.\-]*([A-Z0-9][\w\-]+)/i,
    /bill[\s#:.\-]*([A-Z0-9][\w\-]+)/i,
    /ref(?:erence)?[\s#:.\-]*([A-Z0-9][\w\-]+)/i,
    /(?:no|number|num)[\s.:]*([A-Z0-9][\w\-]+)/i,
    /po[\s#:.\-]*([A-Z0-9][\w\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length >= 2 && match[1].length <= 30) {
      return match[1];
    }
  }
  return null;
}

function extractVendorName(text: string, lines: string[]): string | null {
  // Usually the vendor/company name is in the first few lines of the invoice
  // Look for company-like patterns in the header area (first 10 lines)
  const headerLines = lines.slice(0, 10).filter(l => l.trim().length > 2);

  for (const line of headerLines) {
    const trimmed = line.trim();
    // Skip lines that are just numbers, dates, or common labels
    if (/^[\d\s\-\/.$,]+$/.test(trimmed)) continue;
    if (/^(invoice|bill|date|due|total|from|to|ship|sold|page|phone|fax|email)/i.test(trimmed)) continue;
    if (trimmed.length < 3 || trimmed.length > 80) continue;

    // Good candidate for a company name
    return trimmed;
  }
  return null;
}

function extractDates(text: string): { invoice_date: string | null; due_date: string | null } {
  let invoiceDate: string | null = null;
  let dueDate: string | null = null;

  // Look for labeled dates
  const invoiceDateMatch = text.match(/(?:invoice\s*date|date\s*of\s*invoice|bill\s*date|date)[:\s]+([^\n]{6,20})/i);
  if (invoiceDateMatch) {
    invoiceDate = parseDate(invoiceDateMatch[1]);
  }

  const dueDateMatch = text.match(/(?:due\s*date|payment\s*due|pay\s*by|net\s*due)[:\s]+([^\n]{6,20})/i);
  if (dueDateMatch) {
    dueDate = parseDate(dueDateMatch[1]);
  }

  // If no labeled invoice date, try to find any date in the header area
  if (!invoiceDate) {
    const headerText = text.substring(0, Math.min(text.length, 500));
    for (const pattern of DATE_PATTERNS) {
      const match = headerText.match(pattern);
      if (match) {
        invoiceDate = parseDate(match[0]);
        if (invoiceDate) break;
      }
    }
  }

  return { invoice_date: invoiceDate, due_date: dueDate };
}

function extractAmounts(text: string): { subtotal: number | null; tax_amount: number | null; total_amount: number | null } {
  let subtotal: number | null = null;
  let taxAmount: number | null = null;
  let totalAmount: number | null = null;

  // Total - usually the largest/last amount, often labeled
  const totalPatterns = [
    /(?:total\s*(?:due|amount|balance)?|amount\s*due|balance\s*due|grand\s*total)[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      totalAmount = parseCurrency(match[0]);
      if (totalAmount) break;
    }
  }

  // Subtotal
  const subtotalMatch = text.match(/sub\s*total[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  if (subtotalMatch) {
    subtotal = parseCurrency(subtotalMatch[0]);
  }

  // Tax
  const taxPatterns = [
    /(?:tax|sales\s*tax|vat|gst)[:\s]*\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const pattern of taxPatterns) {
    const match = text.match(pattern);
    if (match) {
      taxAmount = parseCurrency(match[0]);
      if (taxAmount) break;
    }
  }

  // If we only found total but not subtotal, derive it
  if (totalAmount && !subtotal && taxAmount) {
    subtotal = totalAmount - taxAmount;
  }

  return { subtotal, tax_amount: taxAmount, total_amount: totalAmount };
}

function extractLineItems(text: string): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];
  const lines = text.split('\n');

  // Look for lines that have a description followed by a dollar amount
  // Common patterns: "Product Name    2    $50.00    $100.00"
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    // Skip header/label lines
    if (/^(item|description|qty|quantity|price|amount|total|subtotal|tax|date|invoice|bill|due|from|to)/i.test(trimmed)) continue;

    // Try to match: description ... qty ... price ... amount
    const fullMatch = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+\$?([\d,]+\.?\d+)\s+\$?([\d,]+\.?\d+)\s*$/);
    if (fullMatch) {
      items.push({
        description: fullMatch[1].trim(),
        quantity: parseFloat(fullMatch[2]),
        unit_price: parseFloat(fullMatch[3].replace(/,/g, '')),
        amount: parseFloat(fullMatch[4].replace(/,/g, '')),
      });
      continue;
    }

    // Try: description ... amount (no qty/price breakdown)
    const simpleMatch = trimmed.match(/^(.{3,}?)\s+\$?([\d,]+\.\d{2})\s*$/);
    if (simpleMatch) {
      const desc = simpleMatch[1].trim();
      // Make sure description isn't just numbers
      if (/[a-zA-Z]/.test(desc)) {
        items.push({
          description: desc,
          quantity: null,
          unit_price: null,
          amount: parseFloat(simpleMatch[2].replace(/,/g, '')),
        });
      }
    }
  }

  return items;
}

function assessConfidence(result: ParsedInvoiceData): 'high' | 'medium' | 'low' {
  let score = 0;
  if (result.vendor_name) score++;
  if (result.invoice_number) score++;
  if (result.invoice_date) score++;
  if (result.total_amount) score++;
  if (result.line_items.length > 0) score++;
  if (result.due_date) score++;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * Parse a vendor invoice PDF and extract structured data.
 *
 * @param file - The PDF file to parse
 * @returns ParsedInvoiceData with extracted fields and confidence score
 */
export async function parseInvoicePDF(file: File): Promise<ParsedInvoiceData> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are accepted. Please upload a valid PDF invoice.');
  }
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  // Magic bytes: PDF files start with %PDF (0x25 0x50 0x44 0x46)
  const magic = new Uint8Array(arrayBuffer.slice(0, 4));
  if (magic[0] !== 0x25 || magic[1] !== 0x50 || magic[2] !== 0x44 || magic[3] !== 0x46) {
    throw new Error('File does not appear to be a valid PDF. Please upload a valid PDF invoice.');
  }
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  const vendorName = extractVendorName(fullText, lines);
  const invoiceNumber = extractInvoiceNumber(fullText);
  const { invoice_date, due_date } = extractDates(fullText);
  const { subtotal, tax_amount, total_amount } = extractAmounts(fullText);
  const lineItems = extractLineItems(fullText);

  const result: ParsedInvoiceData = {
    vendor_name: vendorName,
    invoice_number: invoiceNumber,
    invoice_date,
    due_date,
    subtotal,
    tax_amount,
    total_amount,
    line_items: lineItems,
    raw_text: fullText,
    confidence: 'low',
  };

  result.confidence = assessConfidence(result);
  return result;
}

/**
 * Upload a vendor invoice PDF to Supabase storage.
 *
 * @param file - The PDF file to upload
 * @param vendorBillId - The vendor_bill ID to associate with
 * @returns Storage path of uploaded file
 */
export async function uploadInvoicePDF(file: File, vendorBillId: string): Promise<string> {
  const { supabase } = await import('@/lib/supabase');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Authentication required for file upload');
  }

  if (!file || file.size === 0) throw new Error('File is empty or missing');
  if (file.size > 15 * 1024 * 1024) throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 15MB)`);
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are accepted. Please upload a valid PDF invoice.');
  }

  const fileName = `${vendorBillId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('vendor-invoices')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return data.path;
}
