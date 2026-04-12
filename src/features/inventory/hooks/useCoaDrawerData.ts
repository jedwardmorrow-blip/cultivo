import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CoaDrawerData {
  coa: CoaRecord | null;
  loading: boolean;
}

export interface CoaRecord {
  id: string;
  batch_id: string;
  batch_number: string;
  strain: string;
  coa_status: string;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  total_cannabinoids_percentage: number | null;
  total_terpenes_mg_g: number | null;
  terpene_1_name: string | null;
  terpene_1_value: number | null;
  terpene_2_name: string | null;
  terpene_2_value: number | null;
  terpene_3_name: string | null;
  terpene_3_value: number | null;
  pdf_file_path: string | null;
  sample_date: string | null;
  manufacture_date: string | null;
  testing_submitted_at: string | null;
  coa_is_active: boolean;
}

/**
 * Fetches COA detail for a given batch from batch_with_coa_status.
 */
export function useCoaDrawerData(batchId: string | null) {
  const [data, setData] = useState<CoaDrawerData>({ coa: null, loading: false });

  const fetch = useCallback(async () => {
    if (!batchId) {
      setData({ coa: null, loading: false });
      return;
    }

    setData({ coa: null, loading: true });

    try {
      const { data: row, error } = await supabase
        .from('batch_with_coa_status')
        .select('coa_id, batch_id, batch_number, strain, coa_status, thc_percentage, cbd_percentage, total_cannabinoids_percentage, total_terpenes_mg_g, terpene_1_name, terpene_1_value, terpene_2_name, terpene_2_value, terpene_3_name, terpene_3_value, pdf_file_path, sample_date, manufacture_date, testing_submitted_at, coa_is_active')
        .eq('batch_id', batchId)
        .maybeSingle();

      if (error) {
        console.error('[useCoaDrawerData] query failed:', error);
        throw error;
      }

      const coa: CoaRecord | null = row
        ? {
            id: row.coa_id ?? batchId,
            batch_id: row.batch_id,
            batch_number: row.batch_number,
            strain: row.strain,
            coa_status: row.coa_status,
            thc_percentage: row.thc_percentage != null ? Number(row.thc_percentage) : null,
            cbd_percentage: row.cbd_percentage != null ? Number(row.cbd_percentage) : null,
            total_cannabinoids_percentage: row.total_cannabinoids_percentage != null ? Number(row.total_cannabinoids_percentage) : null,
            total_terpenes_mg_g: row.total_terpenes_mg_g != null ? Number(row.total_terpenes_mg_g) : null,
            terpene_1_name: row.terpene_1_name,
            terpene_1_value: row.terpene_1_value != null ? Number(row.terpene_1_value) : null,
            terpene_2_name: row.terpene_2_name,
            terpene_2_value: row.terpene_2_value != null ? Number(row.terpene_2_value) : null,
            terpene_3_name: row.terpene_3_name,
            terpene_3_value: row.terpene_3_value != null ? Number(row.terpene_3_value) : null,
            pdf_file_path: row.pdf_file_path,
            sample_date: row.sample_date,
            manufacture_date: row.manufacture_date,
            testing_submitted_at: row.testing_submitted_at,
            coa_is_active: row.coa_is_active ?? false,
          }
        : null;

      setData({ coa, loading: false });
    } catch (err) {
      console.error('[useCoaDrawerData] Failed:', err);
      setData({ coa: null, loading: false });
    }
  }, [batchId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, refetch: fetch };
}
