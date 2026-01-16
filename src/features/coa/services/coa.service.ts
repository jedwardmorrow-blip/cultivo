import { supabase } from '@/lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const terpeneProfile = dbRow.terpene_profile as any || {};
  return {
    id: dbRow.id,
    strain_name: strainName,
    batch_number: batchNumber,
    batch_id: dbRow.batch_id,
    harvest_date: harvestDate,
    manufacture_date: manufactureDate,
    sample_date: dbRow.test_date,
    thc_percentage: dbRow.thc_percentage,
    cbd_percentage: dbRow.cbd_percentage,
    total_cannabinoids_percentage: (dbRow.thc_percentage || 0) + (dbRow.cbd_percentage || 0),
    total_terpenes_mg_g: terpeneProfile.total_mg_g || null,
    terpene_1_name: terpeneProfile.terpene_1?.name || null,
    terpene_1_value: terpeneProfile.terpene_1?.value || null,
    terpene_1_percentage: terpeneProfile.terpene_1?.percentage || null,
    terpene_2_name: terpeneProfile.terpene_2?.name || null,
    terpene_2_value: terpeneProfile.terpene_2?.value || null,
    terpene_2_percentage: terpeneProfile.terpene_2?.percentage || null,
    terpene_3_name: terpeneProfile.terpene_3?.name || null,
    terpene_3_value: terpeneProfile.terpene_3?.value || null,
    terpene_3_percentage: terpeneProfile.terpene_3?.percentage || null,
    pdf_file_path: dbRow.file_path,
    is_active: dbRow.status === 'active',
    created_at: dbRow.created_at,
    updated_at: dbRow.created_at
  };
}

export interface COAData {
  id?: string;
  strain_name: string;
  batch_number: string;
  batch_id?: string | null;
  harvest_date: string | null;
  manufacture_date: string | null;
  sample_date: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
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
  cbd_percentage: number | null;
  total_cannabinoids_percentage: number | null;
  total_terpenes_mg_g: number | null;
  terpenes: Array<{ name: string; value: number; percentage: number }>;
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
  const fileName = `${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('coa-pdfs')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('uploadCOAPDF error:', error);
    console.error('uploadCOAPDF fileName:', fileName);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  return data.path;
}

/**
 * Parses a COA PDF file and extracts data
 *
 * @param file - PDF file to parse
 * @returns Promise<ParsedCOAData> - Extracted COA data
 * @description Uses pdfjs to extract text and parse cannabinoid/terpene data
 */
export async function parseCOAPDF(file: File): Promise<ParsedCOAData> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  console.log('Extracted PDF text:', fullText);

  const parsed: ParsedCOAData = {
    strain_name: '',
    batch_number: '',
    harvest_date: null,
    manufacture_date: null,
    sample_date: null,
    thc_percentage: null,
    cbd_percentage: null,
    total_cannabinoids_percentage: null,
    total_terpenes_mg_g: null,
    terpenes: []
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
  // Map COAData to database schema
  const dbInsert = {
    batch_id: data.batch_id || null,
    file_path: data.pdf_file_path || '',
    file_name: `${data.batch_number}_COA.pdf`,
    test_date: data.sample_date,
    lab_name: null,
    thc_percentage: data.thc_percentage,
    cbd_percentage: data.cbd_percentage,
    terpene_profile: {
      total_mg_g: data.total_terpenes_mg_g,
      terpene_1: { name: data.terpene_1_name, value: data.terpene_1_value, percentage: data.terpene_1_percentage },
      terpene_2: { name: data.terpene_2_name, value: data.terpene_2_value, percentage: data.terpene_2_percentage },
      terpene_3: { name: data.terpene_3_name, value: data.terpene_3_value, percentage: data.terpene_3_percentage }
    },
    contaminants: null,
    status: data.is_active ? 'active' : 'inactive'
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

  // Map database row back to application type
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
  // Map partial COAData to database schema
  const dbUpdate: any = {};
  if (data.pdf_file_path !== undefined) dbUpdate.file_path = data.pdf_file_path;
  if (data.sample_date !== undefined) dbUpdate.test_date = data.sample_date;
  if (data.thc_percentage !== undefined) dbUpdate.thc_percentage = data.thc_percentage;
  if (data.cbd_percentage !== undefined) dbUpdate.cbd_percentage = data.cbd_percentage;
  if (data.is_active !== undefined) dbUpdate.status = data.is_active ? 'active' : 'inactive';
  if (data.batch_id !== undefined) dbUpdate.batch_id = data.batch_id;

  const { data: coa, error } = await supabase
    .from('certificates_of_analysis')
    .update(dbUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateCOA error:', error);
    console.error('updateCOA id:', id);
    console.error('updateCOA data:', data);
    throw new Error(`Failed to update COA: ${error.message}`);
  }

  // Map database row back to application type
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
    console.error('deleteCOA error:', error);
    console.error('deleteCOA id:', id);
    throw new Error(`Failed to delete COA: ${error.message}`);
  }
}

export async function getAllCOAs(): Promise<COAData[]> {
  const { data, error } = await supabase
    .from('certificates_of_analysis')
    .select('*')
    .order('test_date', { ascending: false });

  if (error) {
    console.error('getAllCOAs error:', error);
    throw new Error(`Failed to load COAs: ${error.message}`);
  }

  // Map database rows to application type (without batch details since we don't have them)
  return (data || []).map(row => mapDatabaseCOAToApp(row, '', '', null, null));
}

export async function getActiveCOAs(): Promise<COAData[]> {
  const { data, error } = await supabase
    .from('certificates_of_analysis')
    .select('*')
    .eq('status', 'active')
    .order('test_date', { ascending: false });

  if (error) {
    console.error('getActiveCOAs error:', error);
    throw new Error(`Failed to load active COAs: ${error.message}`);
  }

  // Map database rows to application type (without batch details since we don't have them)
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
        cbd_percentage: item.parsedData.cbd_percentage ?? 0,
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
