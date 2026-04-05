import type { Database } from '../lib/database/database.types';

export type COA = Database['public']['Tables']['certificates_of_analysis']['Row'];
export type COAInsert = Database['public']['Tables']['certificates_of_analysis']['Insert'];
export type COAUpdate = Database['public']['Tables']['certificates_of_analysis']['Update'];

export interface BatchCOAData {
  id: string;
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
}

export interface LabelCOAValidation {
  hasCOA: boolean;
  coaData: BatchCOAData | null;
  error: string | null;
}
