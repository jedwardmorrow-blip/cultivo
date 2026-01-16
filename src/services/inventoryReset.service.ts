import { supabase } from '../lib/supabase';

export interface ParsedInventoryData {
  items: InventoryItem[];
  totalRecords: number;
  strainNames: string[];
}

export interface InventoryItem {
  strain: string;
  stage: string;
  package_id: string;
  quantity_grams: number;
  notes?: string;
}

export interface StrainValidationResult {
  valid: string[];
  invalid: string[];
  missing: string[];
}

export async function parseDutchieCSV(file: File): Promise<InventoryItem[]> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].toLowerCase().split(',');

  const items: InventoryItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    if (row['strain'] && row['quantity']) {
      items.push({
        strain: row['strain'],
        stage: row['stage'] || 'bulk',
        package_id: row['package_id'] || '',
        quantity_grams: parseFloat(row['quantity']) || 0,
        notes: row['notes']
      });
    }
  }

  return items;
}

export async function parseGoogleSheetCSV(file: File): Promise<InventoryItem[]> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].toLowerCase().split(',');

  const items: InventoryItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    if (row['strain'] && row['quantity']) {
      items.push({
        strain: row['strain'],
        stage: row['stage'] || 'bulk',
        package_id: row['package_id'] || '',
        quantity_grams: parseFloat(row['quantity']) || 0,
        notes: row['notes']
      });
    }
  }

  return items;
}

export function extractStrainNames(items: InventoryItem[]): string[] {
  const uniqueStrains = new Set(items.map(item => item.strain));
  return Array.from(uniqueStrains);
}

export async function validateStrainNames(strainNames: string[]): Promise<StrainValidationResult> {
  const { data: existingStrains, error } = await supabase
    .from('strains')
    .select('name')
    .in('name', strainNames);

  if (error) {
    throw new Error(`Failed to validate strains: ${error.message}`);
  }

  const existingStrainNames = existingStrains?.map(s => s.name) || [];
  const valid = strainNames.filter(name => existingStrainNames.includes(name));
  const invalid = strainNames.filter(name => !existingStrainNames.includes(name));

  return {
    valid,
    invalid,
    missing: invalid
  };
}

export async function parseAndMergeInventoryData(
  dutchieFile: File,
  googleSheetFile: File
): Promise<ParsedInventoryData> {
  const [dutchieItems, googleItems] = await Promise.all([
    parseDutchieCSV(dutchieFile),
    parseGoogleSheetCSV(googleSheetFile)
  ]);

  const allItems = [...dutchieItems, ...googleItems];
  const strainNames = extractStrainNames(allItems);

  return {
    items: allItems,
    totalRecords: allItems.length,
    strainNames
  };
}

export async function executeInventoryReset(items: InventoryItem[]): Promise<void> {
  const { error } = await supabase.rpc('reset_inventory', {
    inventory_items: items
  });

  if (error) {
    throw new Error(`Inventory reset failed: ${error.message}`);
  }
}
