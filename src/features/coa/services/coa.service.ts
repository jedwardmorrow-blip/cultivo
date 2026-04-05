import { supabase } from '@/lib/supabase';

let _pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjsLib() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist');
    _pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return _pdfjsLib;
}

/**
 * COA Service
 *
 * Handles Certificate of Analysis (COA) management including PDF upload,
 * parsing, data extraction, and batch association.
 *
 * @module coaService
 */

// Helper function to map database COA row to application type
function mapDatabaseCOAToApp(
  dbRow: any,
  strainName: string,
  batchNumber: string,
  harvestDate: string | null,
  manufactureDate: string | null
): COAData {
  return {
    id: dbRow.id,
    strain_name: strainName || dbRow.strain_name,
    batch_number: batchNumber || dbRow.batch_number,
    batch_id: dbRow.batch_id,
    harvest_date: harvestDate || dbRow.harvest_date,
    manufacture_date: manufactureDate || dbRow.manufacture_date,
    sample_date: dbRow.sample_date,
    thc_percentage: dbRow.thc_percentage,
    thca_percentage: dbRow.thca_percentage ?? null,
    delta8_thc_percentage: dbRow.delta8_thc_percentage ?? null,
    delta10_thc_percentage: dbRow.delta10_thc_percentage ?? null,
    cbd_percentage: dbRow.cbd_percentage,
    cbda_percentage: dbRow.cbda_percentage ?? null,
    total_cannabinoids_percentage: dbRow.total_cannabinoids_percentage,
    total_terpenes_mg_g: dbRow.total_terpenes_mg_g,
    terpene_1_name: dbRow.terpene_1_name,
    terpene_1_value: dbRow.terpene_1_value,
    terpene_1_percentage: dbRow.terpene_1_percentage,
    terpene_2_name: dbRow.terpene_2_name,
    terpene_2_value: dbRow.terpene_2_value,
    terpene_2_percentage: dbRow.terpene_2_percentage,
    terpene_3_name: dbRow.terpene_3_name,
    terpene_3_value: dbRow.terpene_3_value,
    terpene_3_percentage: dbRow.terpene_3_percentage,
    pesticides_pass: dbRow.pesticides_pass ?? null,
    heavy_metals_pass: dbRow.heavy_metals_pass ?? null,
    microbials_pass: dbRow.microbials_pass ?? null,
    residual_solvents_pass: dbRow.residual_solvents_pass ?? null,
    pdf_file_path: dbRow.pdf_file_path,
    is_active: dbRow.is_active,
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at
  };
}

export interface COAData {
  id?: string;
  strain_name: string;
  batch_number: string;
  batch_id?: string;
  harvest_date: string | null;
  manufacture_date: string | null;
  sample_date: string | null;
  thc_percentage: number | null;
  thca_percentage: number | null;
  delta8_thc_percentage: number | null;
  delta10_thc_percentage: number | null;
  cbd_percentage: number | null;
  cbda_percentage: number | null;
  total_cannabinoids_percentage: number | null;
  total_terpenes_mg_g: number | null;
  terpene_1_name: string | null;
  terpene_1_value: number | null;
  terpene_1_percentage: number | null;
  terpene_2_name: string | null;
  terpene_2_value: number | null;
  terpene_2_percentage: number | null;
  terpene_3_name: string | null;
  terpene_3_value: number | null;
  terpene_3_percentage: number | null;
  pesticides_pass: boolean | null;
  heavy_metals_pass: boolean | null;
  microbials_pass: boolean | null;
  residual_solvents_pass: boolean | null;
  pdf_file_path: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ParsedCOAData {
  strain_name: string;
  batch_number: string;
  harvest_date: string | null;
  manufacture_date: string | null;
  sample_date: string | null;
  thc_percentage: number | null;
  thca_percentage: number | null;
  delta8_thc_percentage: number | null;
  delta10_thc_percentage: number | null;
  cbd_percentage: number | null;
  cbda_percentage: number | null;
  total_cannabinoids_percentage: number | null;
  total_terpenes_mg_g: number | null;
  terpenes: Array<{ name: string; value: number; percentage: number }>;
  pesticides_pass: boolean | null;
  heavy_metals_pass: boolean | null;
  microbials_pass: boolean | null;
  residual_solvents_pass: boolean | null;
}

/**
 * AZDHS Total THC formula: Δ9-THC + (0.877 × THCa) + Δ8-THC + Δ10-THC
 * Returns null if no cannabinoid components are available.
 */
export function calculateTotalTHC(data: {
  thc_percentage: number | null;
  thca_percentage: number | null;
  delta8_thc_percentage: number | null;
  delta10_thc_percentage: number | null;
}): number | null {
  const { thc_percentage, thca_percentage, delta8_thc_percentage, delta10_thc_percentage } = data;
  const hasComponents = thca_percentage != null || delta8_thc_percentage != null || delta10_thc_percentage != null;
  if (!hasComponents) return thc_percentage;

  const d9 = thc_percentage ?? 0;
  const thca = thca_percentage ?? 0;
  const d8 = delta8_thc_percentage ?? 0;
  const d10 = delta10_thc_percentage ?? 0;

  return Math.round((d9 + (0.877 * thca) + d8 + d10) * 100) / 100;
}

/**
 * Uploads a COA PDF file to storage
 *
 * @param file - PDF file to upload
 * @returns Promise<string> - Storage path of uploaded file
 * @throws {Error} If upload fails
 * @description Uploads to 'coa-pdfs' bucket with timestamp prefix
 */
export async function uploadCOAPDF(file: File): Promise<string> {
  // Check authentication status
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    const authError = 'Authentication required for file upload. Please log in again.';
    console.error('uploadCOAPDF: Auth error:', authError);
    throw new Error(authError);
  }

  // Validate file
  if (!file || file.size === 0) {
    throw new Error('Invalid file: File is empty or missing');
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
  }

  const fileName = `${Date.now()}-${file.name}`;

  try {
    const { data, error } = await supabase.storage
      .from('coa-pdfs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('uploadCOAPDF: Storage API error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        fileName: fileName,
        fileSize: file.size
      });
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return data.path;
  } catch (err: any) {
    console.error('uploadCOAPDF: Unexpected error:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    });

    // Provide user-friendly error messages
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error('Network error: Unable to reach storage service. Please check your internet connection and try again.');
    }

    throw err;
  }
}

/**
 * Parses a COA PDF file and extracts data
 *
 * @param file - PDF file to parse
 * @returns Promise<ParsedCOAData> - Extracted COA data
 * @description Uses pdfjs to extract text and parse cannabinoid/terpene data
 */
export async function parseCOAPDF(file: File): Promise<ParsedCOAData> {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  const parsed: ParsedCOAData = {
    strain_name: '',
    batch_number: '',
    harvest_date: null,
    manufacture_date: null,
    sample_date: null,
    thc_percentage: null,
    thca_percentage: null,
    delta8_thc_percentage: null,
    delta10_thc_percentage: null,
    cbd_percentage: null,
    cbda_percentage: null,
    total_cannabinoids_percentage: null,
    total_terpenes_mg_g: null,
    terpenes: [],
    pesticides_pass: null,
    heavy_metals_pass: null,
    microbials_pass: null,
    residual_solvents_pass: null
  };

  const strainMatch = fullText.match(/Strain:\s*([^\n;]+?)(?:\s*Batch|;|$)/i);
  if (strainMatch) {
    parsed.strain_name = strainMatch[1].trim();
  }

  const batchMatch = fullText.match(/(?:External Batch ID|Batch ID):\s*([^\n\s;]+)/i);
  if (batchMatch) {
    parsed.batch_number = batchMatch[1].trim();
  }

  const harvestMatch = fullText.match(/Harvest Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (harvestMatch) {
    const [month, day, year] = harvestMatch[1].split('/');
    parsed.harvest_date = `${year}-${month}-${day}`;
  }

  const mfgMatch = fullText.match(/Manufacturing Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (mfgMatch) {
    const [month, day, year] = mfgMatch[1].split('/');
    parsed.manufacture_date = `${year}-${month}-${day}`;
  }

  const sampleMatch = fullText.match(/Sampling Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (sampleMatch) {
    const [month, day, year] = sampleMatch[1].split('/');
    parsed.sample_date = `${year}-${month}-${day}`;
  }

  let thcMatch = fullText.match(/(\d+\.?\d*)\s*%\s+Total THC/i);
  if (!thcMatch) {
    thcMatch = fullText.match(/Total THC\s+(\d+\.?\d*)\s*%/i);
  }
  if (thcMatch) {
    parsed.thc_percentage = parseFloat(thcMatch[1]);
  }

  // Parse individual cannabinoid components for AZDHS Total THC formula
  const thcaMatch = fullText.match(/THCa\s+(\d+\.?\d*)\s*%/i)
    || fullText.match(/(\d+\.?\d*)\s*%\s+THCa/i)
    || fullText.match(/THCA\s+(\d+\.?\d*)/i);
  if (thcaMatch) {
    parsed.thca_percentage = parseFloat(thcaMatch[1]);
  }

  const delta8Match = fullText.match(/[Δδ]8[- ]?THC\s+(\d+\.?\d*)\s*%/i)
    || fullText.match(/(\d+\.?\d*)\s*%\s+[Δδ]8[- ]?THC/i)
    || fullText.match(/Delta[- ]?8[- ]?THC\s+(\d+\.?\d*)/i);
  if (delta8Match) {
    parsed.delta8_thc_percentage = parseFloat(delta8Match[1]);
  } else if (fullText.match(/[Δδ]8[- ]?THC\s+ND/i) || fullText.match(/Delta[- ]?8[- ]?THC\s+ND/i)) {
    parsed.delta8_thc_percentage = 0;
  }

  const delta10Match = fullText.match(/[Δδ]10[- ]?THC\s+(\d+\.?\d*)\s*%/i)
    || fullText.match(/(\d+\.?\d*)\s*%\s+[Δδ]10[- ]?THC/i)
    || fullText.match(/Delta[- ]?10[- ]?THC\s+(\d+\.?\d*)/i);
  if (delta10Match) {
    parsed.delta10_thc_percentage = parseFloat(delta10Match[1]);
  } else if (fullText.match(/[Δδ]10[- ]?THC\s+ND/i) || fullText.match(/Delta[- ]?10[- ]?THC\s+ND/i)) {
    parsed.delta10_thc_percentage = 0;
  }

  if (fullText.match(/ND\s+Total CBD/i)) {
    parsed.cbd_percentage = 0;
  } else {
    let cbdMatch = fullText.match(/(\d+\.?\d*)\s*%\s+Total CBD/i);
    if (!cbdMatch) {
      cbdMatch = fullText.match(/Total CBD\s+(\d+\.?\d*)\s*%/i);
    }
    if (cbdMatch) {
      parsed.cbd_percentage = parseFloat(cbdMatch[1]);
    }
  }

  // Parse CBDa (AZDHS Table 3.1 potency analyte)
  const cbdaMatch = fullText.match(/CBDa\s+(\d+\.?\d*)\s*%/i)
    || fullText.match(/(\d+\.?\d*)\s*%\s+CBDa/i)
    || fullText.match(/CBDA\s+(\d+\.?\d*)/i);
  if (cbdaMatch) {
    parsed.cbda_percentage = parseFloat(cbdaMatch[1]);
  } else if (fullText.match(/CBDa\s+ND/i) || fullText.match(/CBDA\s+ND/i)) {
    parsed.cbda_percentage = 0;
  }

  // Parse AZDHS Table 3.1 pass/fail statuses
  const passPattern = (category: string) => new RegExp(category + '[^]*?(?:pass|passed)', 'i');
  const failPattern = (category: string) => new RegExp(category + '[^]*?(?:fail|failed|not detected)', 'i');

  if (passPattern('pesticide').test(fullText)) {
    parsed.pesticides_pass = true;
  } else if (failPattern('pesticide').test(fullText)) {
    parsed.pesticides_pass = false;
  }

  if (passPattern('heavy metal').test(fullText)) {
    parsed.heavy_metals_pass = true;
  } else if (failPattern('heavy metal').test(fullText)) {
    parsed.heavy_metals_pass = false;
  }

  if (passPattern('microbial').test(fullText) || passPattern('microbiolog').test(fullText)) {
    parsed.microbials_pass = true;
  } else if (failPattern('microbial').test(fullText) || failPattern('microbiolog').test(fullText)) {
    parsed.microbials_pass = false;
  }

  if (passPattern('residual solvent').test(fullText) || passPattern('solvent').test(fullText)) {
    parsed.residual_solvents_pass = true;
  } else if (failPattern('residual solvent').test(fullText) || failPattern('solvent').test(fullText)) {
    parsed.residual_solvents_pass = false;
  }

  let totalCannMatch = fullText.match(/(\d+\.?\d*)\s*%\s+Total\s+Cannabinoids/i);
  if (!totalCannMatch) {
    totalCannMatch = fullText.match(/Total Cannabinoids[^\d]*(\d+\.?\d*)\s*%/i);
  }
  if (!totalCannMatch) {
    totalCannMatch = fullText.match(/Total\s+(\d+\.?\d*)\s+\d+\.?\d*\s+Q3/);
  }
  if (totalCannMatch) {
    parsed.total_cannabinoids_percentage = parseFloat(totalCannMatch[1]);
  }

  const terpMatch = fullText.match(/Total Terpenes[^\d]*(\d+\.?\d*)\s*mg\/g/i) ||
                   fullText.match(/(\d+\.?\d*)\s*mg\/g\s*Total Terpenes/i);
  if (terpMatch) {
    parsed.total_terpenes_mg_g = parseFloat(terpMatch[1]);
  }

  const terpenes: Array<{ name: string; value: number; percentage: number }> = [];

  const terpeneNames = [
    'β-Caryophyllene', 'δ-Limonene', 'α-Humulene', 'Linalool', 'β-Myrcene',
    'Fenchol', 'α-Bisabolol', 'α-Terpineol', 'β-Pinene', 'α-Pinene',
    'Farnesene', 'cis-Ocimene', 'trans-Ocimene', 'Camphene', 'α-Cedrene',
    'Caryophyllene', 'Limonene', 'Humulene', 'Myrcene', 'Pinene', 'Terpineol', 'Ocimene'
  ];

  for (const terpName of terpeneNames) {
    const escapedName = terpName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedName + '\\s+(\\d+\\.?\\d*)\\s+(\\d+\\.?\\d*)\\s+(\\d+\\.?\\d*)', 'i');
    const match = fullText.match(pattern);

    if (match) {
      const value = parseFloat(match[2]);
      const percentage = parseFloat(match[3]);

      if (value > 0 && !isNaN(value)) {
        terpenes.push({
          name: terpName,
          value: value,
          percentage: percentage
        });
      }
    }
  }

  terpenes.sort((a, b) => b.value - a.value);
  parsed.terpenes = terpenes.slice(0, 3);

  return parsed;
}

/**
 * Creates a new COA record in the database
 *
 * @param data - COA data (without id, created_at, updated_at)
 * @returns Promise<COAData> - Created COA record
 * @description Auto-links COA to batch if batch_id provided
 */
export async function createCOA(data: Omit<COAData, 'id' | 'created_at' | 'updated_at'>): Promise<COAData> {
  // Map COAData to database schema (certificates_of_analysis table)
  const dbInsert = {
    strain_name: data.strain_name,
    batch_number: data.batch_number,
    batch_id: data.batch_id ?? null,
    harvest_date: data.harvest_date,
    manufacture_date: data.manufacture_date,
    sample_date: data.sample_date,
    thc_percentage: data.thc_percentage,
    thca_percentage: data.thca_percentage,
    delta8_thc_percentage: data.delta8_thc_percentage,
    delta10_thc_percentage: data.delta10_thc_percentage,
    cbd_percentage: data.cbd_percentage,
    cbda_percentage: data.cbda_percentage,
    total_cannabinoids_percentage: data.total_cannabinoids_percentage,
    total_terpenes_mg_g: data.total_terpenes_mg_g,
    terpene_1_name: data.terpene_1_name,
    terpene_1_value: data.terpene_1_value,
    terpene_1_percentage: data.terpene_1_percentage,
    terpene_2_name: data.terpene_2_name,
    terpene_2_value: data.terpene_2_value,
    terpene_2_percentage: data.terpene_2_percentage,
    terpene_3_name: data.terpene_3_name,
    terpene_3_value: data.terpene_3_value,
    terpene_3_percentage: data.terpene_3_percentage,
    pesticides_pass: data.pesticides_pass,
    heavy_metals_pass: data.heavy_metals_pass,
    microbials_pass: data.microbials_pass,
    residual_solvents_pass: data.residual_solvents_pass,
    pdf_file_path: data.pdf_file_path,
    is_active: data.is_active
  };

  const { data: coa, error } = await supabase
    .from('certificates_of_analysis')
    .insert(dbInsert)
    .select()
    .single();

  if (error) {
    console.error('createCOA error:', error);
    console.error('createCOA data:', data);
    throw new Error(`Failed to create COA: ${error.message}`);
  }

  if (data.batch_id && data.is_active && coa.id) {
    await supabase
      .from('batch_registry')
      .update({ coa_id: coa.id })
      .eq('id', data.batch_id);
  }

  return mapDatabaseCOAToApp(coa, data.strain_name, data.batch_number, data.harvest_date, data.manufacture_date);
}

/**
 * Updates an existing COA record
 *
 * @param id - COA UUID
 * @param data - Fields to update
 * @returns Promise<COAData> - Updated COA record
 */
export async function updateCOA(id: string, data: Partial<COAData>): Promise<COAData> {
  // Map partial COAData to database schema (certificates_of_analysis table)
  const dbUpdate: any = {};
  if (data.strain_name !== undefined) dbUpdate.strain_name = data.strain_name;
  if (data.batch_number !== undefined) dbUpdate.batch_number = data.batch_number;
  if (data.harvest_date !== undefined) dbUpdate.harvest_date = data.harvest_date;
  if (data.manufacture_date !== undefined) dbUpdate.manufacture_date = data.manufacture_date;
  if (data.sample_date !== undefined) dbUpdate.sample_date = data.sample_date;
  if (data.thc_percentage !== undefined) dbUpdate.thc_percentage = data.thc_percentage;
  if (data.thca_percentage !== undefined) dbUpdate.thca_percentage = data.thca_percentage;
  if (data.delta8_thc_percentage !== undefined) dbUpdate.delta8_thc_percentage = data.delta8_thc_percentage;
  if (data.delta10_thc_percentage !== undefined) dbUpdate.delta10_thc_percentage = data.delta10_thc_percentage;
  if (data.cbd_percentage !== undefined) dbUpdate.cbd_percentage = data.cbd_percentage;
  if (data.total_cannabinoids_percentage !== undefined) dbUpdate.total_cannabinoids_percentage = data.total_cannabinoids_percentage;
  if (data.total_terpenes_mg_g !== undefined) dbUpdate.total_terpenes_mg_g = data.total_terpenes_mg_g;
  if (data.cbda_percentage !== undefined) dbUpdate.cbda_percentage = data.cbda_percentage;
  if (data.pesticides_pass !== undefined) dbUpdate.pesticides_pass = data.pesticides_pass;
  if (data.heavy_metals_pass !== undefined) dbUpdate.heavy_metals_pass = data.heavy_metals_pass;
  if (data.microbials_pass !== undefined) dbUpdate.microbials_pass = data.microbials_pass;
  if (data.residual_solvents_pass !== undefined) dbUpdate.residual_solvents_pass = data.residual_solvents_pass;
  if (data.pdf_file_path !== undefined) dbUpdate.pdf_file_path = data.pdf_file_path;
  if (data.is_active !== undefined) dbUpdate.is_active = data.is_active;
  if (data.batch_id !== undefined) dbUpdate.batch_id = data.batch_id;

  const { data: coa, error } = await supabase
    .from('certificates_of_analysis')
    .update(dbUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update COA: ${error.message}`);
  }

  if (coa.batch_id && coa.is_active) {
    await supabase
      .from('batch_registry')
      .update({ coa_id: id })
      .eq('id', coa.batch_id);
  }

  return mapDatabaseCOAToApp(
    coa,
    data.strain_name || '',
    data.batch_number || '',
    data.harvest_date || null,
    data.manufacture_date || null
  );
}

/**
 * Deletes a COA record and its associated PDF
 *
 * @param id - COA UUID
 * @param pdfPath - Path to PDF file in storage (if exists)
 * @returns Promise<void>
 * @description Deletes PDF from storage then removes database record
 */
export async function deleteCOA(id: string, pdfPath: string | null): Promise<void> {
  const { data: coaRecord } = await supabase
    .from('certificates_of_analysis')
    .select('batch_id')
    .eq('id', id)
    .maybeSingle();

  if (coaRecord?.batch_id) {
    await supabase
      .from('batch_registry')
      .update({ coa_id: null })
      .eq('id', coaRecord.batch_id)
      .eq('coa_id', id);
  }

  if (pdfPath) {
    const { error: storageError } = await supabase.storage
      .from('coa-pdfs')
      .remove([pdfPath]);

    if (storageError) {
      console.error('deleteCOA storage error:', storageError);
    }
  }

  const { error } = await supabase
    .from('certificates_of_analysis')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete COA: ${error.message}`);
  }
}

export async function getAllCOAs(): Promise<COAData[]> {
  const { data, error } = await supabase
    .from('certificates_of_analysis')
    .select('*')
    .order('sample_date', { ascending: false });

  if (error) {
    console.error('getAllCOAs error:', error);
    throw new Error(`Failed to load COAs: ${error.message}`);
  }

  // Map database rows to application type
  return (data || []).map(row => mapDatabaseCOAToApp(row, '', '', null, null));
}

export async function getActiveCOAs(): Promise<COAData[]> {
  const { data, error } = await supabase
    .from('certificates_of_analysis')
    .select('*')
    .eq('is_active', true)
    .order('sample_date', { ascending: false });

  if (error) {
    console.error('getActiveCOAs error:', error);
    throw new Error(`Failed to load active COAs: ${error.message}`);
  }

  // Map database rows to application type
  return (data || []).map(row => mapDatabaseCOAToApp(row, '', '', null, null));
}

export async function getCOAById(id: string): Promise<COAData | null> {
  const { data, error } = await supabase
    .from('certificates_of_analysis')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('getCOAById error:', error);
    throw new Error(`Failed to load COA: ${error.message}`);
  }

  if (!data) return null;

  // Map database row to application type (without batch details since we don't have them)
  return mapDatabaseCOAToApp(data, '', '', null, null);
}

export function getCOAPDFUrl(path: string): string {
  const { data } = supabase.storage
    .from('coa-pdfs')
    .getPublicUrl(path);

  return data.publicUrl;
}

export interface COAUploadQueueItem {
  id: string;
  file: File;
  fileName: string;
  status: 'pending' | 'parsing' | 'parsed' | 'error' | 'reviewed';
  parsedData: ParsedCOAData | null;
  error: string | null;
  selectedStrain: string | null;
  selectedBatchId: string | null;
  uploadedPath: string | null;
}

export interface COABulkUploadState {
  queue: COAUploadQueueItem[];
  currentIndex: number;
  isReviewing: boolean;
  isUploading: boolean;
}

export async function bulkUploadCOAs(
  items: COAUploadQueueItem[]
): Promise<{ success: COAData[]; failed: Array<{ item: COAUploadQueueItem; error: string }> }> {
  const success: COAData[] = [];
  const failed: Array<{ item: COAUploadQueueItem; error: string }> = [];

  for (const item of items) {
    if (!item.parsedData || !item.selectedBatchId || item.status !== 'reviewed') {
      failed.push({ item, error: 'Item not ready for upload' });
      continue;
    }

    try {
      let filePath = item.uploadedPath;

      if (!filePath) {
        filePath = await uploadCOAPDF(item.file);
      }

      const coaData: Omit<COAData, 'id' | 'created_at' | 'updated_at'> = {
        strain_name: item.parsedData.strain_name,
        batch_number: item.parsedData.batch_number,
        batch_id: item.selectedBatchId,
        harvest_date: item.parsedData.harvest_date,
        manufacture_date: item.parsedData.manufacture_date,
        sample_date: item.parsedData.sample_date,
        thc_percentage: item.parsedData.thc_percentage,
        thca_percentage: item.parsedData.thca_percentage,
        delta8_thc_percentage: item.parsedData.delta8_thc_percentage,
        delta10_thc_percentage: item.parsedData.delta10_thc_percentage,
        cbd_percentage: item.parsedData.cbd_percentage ?? 0,
        cbda_percentage: item.parsedData.cbda_percentage,
        total_cannabinoids_percentage: item.parsedData.total_cannabinoids_percentage,
        total_terpenes_mg_g: item.parsedData.total_terpenes_mg_g,
        terpene_1_name: item.parsedData.terpenes[0]?.name || null,
        terpene_1_value: item.parsedData.terpenes[0]?.value || null,
        terpene_1_percentage: item.parsedData.terpenes[0]?.percentage || null,
        terpene_2_name: item.parsedData.terpenes[1]?.name || null,
        terpene_2_value: item.parsedData.terpenes[1]?.value || null,
        terpene_2_percentage: item.parsedData.terpenes[1]?.percentage || null,
        terpene_3_name: item.parsedData.terpenes[2]?.name || null,
        terpene_3_value: item.parsedData.terpenes[2]?.value || null,
        terpene_3_percentage: item.parsedData.terpenes[2]?.percentage || null,
        pesticides_pass: item.parsedData.pesticides_pass,
        heavy_metals_pass: item.parsedData.heavy_metals_pass,
        microbials_pass: item.parsedData.microbials_pass,
        residual_solvents_pass: item.parsedData.residual_solvents_pass,
        pdf_file_path: filePath,
        is_active: true
      };

      const savedCOA = await createCOA(coaData);
      success.push(savedCOA);
    } catch (err: any) {
      failed.push({ item, error: err.message || 'Failed to save COA' });
    }
  }

  return { success, failed };
}

export async function getStrains(): Promise<string[]> {
  const { data, error } = await supabase
    .from('batch_registry')
    .select('strain')
    .eq('status', 'active')
    .order('strain');

  if (error) {
    console.error('getStrains error:', error);
    throw new Error(`Failed to load strains: ${error.message}`);
  }

  const uniqueStrains = [...new Set(data?.map(b => b.strain) || [])];
  return uniqueStrains;
}

export interface BatchOption {
  id: string;
  batch_number: string;
  strain: string;
  harvest_date: string | null;
  status: string | null;
}

export async function getBatchesByStrain(strain: string): Promise<BatchOption[]> {
  const { data, error } = await supabase
    .from('batch_registry')
    .select('id, batch_number, strain, harvest_date, status')
    .eq('strain', strain)
    .eq('status', 'active')
    .order('harvest_date', { ascending: false });

  if (error) {
    console.error('getBatchesByStrain error:', error);
    console.error('getBatchesByStrain strain:', strain);
    throw new Error(`Failed to load batches for strain: ${error.message}`);
  }
  return (data || []) as BatchOption[];
}

/**
 * Gets the active COA for a batch
 *
 * @param batchId - Batch UUID
 * @returns Promise<COAData | null> - Active COA or null if none exists
 */
export async function getActiveCOAForBatch(batchId: string): Promise<COAData | null> {
  const { data, error } = await supabase
    .from('certificates_of_analysis')
    .select('*')
    .eq('batch_id', batchId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('getActiveCOAForBatch error:', error);
    throw new Error(`Failed to load COA for batch: ${error.message}`);
  }

  if (!data) return null;

  return mapDatabaseCOAToApp(data, '', '', null, null);
}

/**
 * Replaces an existing COA with a new one
 * Deactivates old COA, deletes old PDF, uploads new PDF, creates new COA
 *
 * @param batchId - Batch UUID
 * @param oldCOA - Existing active COA to replace
 * @param newFile - New PDF file
 * @param newCOAData - New COA data
 * @returns Promise<COAData> - Newly created COA
 */
export async function replaceCOA(
  batchId: string,
  oldCOA: COAData,
  newFile: File,
  newCOAData: Omit<COAData, 'id' | 'created_at' | 'updated_at'>
): Promise<COAData> {
  try {
    // Step 1: Upload new PDF first (so we don't leave batch without COA if this fails)
    const newPdfPath = await uploadCOAPDF(newFile);

    // Step 2: Deactivate old COA
    await updateCOA(oldCOA.id!, { is_active: false });

    // Step 3: Delete old PDF from storage
    if (oldCOA.pdf_file_path) {
      const { error: deleteError } = await supabase.storage
        .from('coa-pdfs')
        .remove([oldCOA.pdf_file_path]);

      if (deleteError) {
      }
    }

    // Step 4: Create new COA record with new PDF path
    const newCOA = await createCOA({
      ...newCOAData,
      pdf_file_path: newPdfPath,
      batch_id: batchId,
      is_active: true
    });

    return newCOA;
  } catch (error) {
    console.error('replaceCOA: Error during replacement:', error);
    throw error;
  }
}
