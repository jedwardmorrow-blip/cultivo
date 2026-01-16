import { supabase } from '@/lib/supabase';
import { errorService } from '@/services/error.service';

export interface LabelAutoFillData {
  // Inventory data
  package_id: string;
  batch: string | null;
  batch_number: string | null;
  strain: string | null;
  product_name: string;
  package_date: string | null;
  available_qty: number;

  // COA data
  thc_percentage: number | null;
  cbd_percentage: number | null;
  total_cannabinoids_percentage: number | null;
  harvest_date: string | null;
  test_date: string | null;
  lab_name: string | null;
  terpene_1_name: string | null;
  terpene_1_value: number | null;
  terpene_2_name: string | null;
  terpene_2_value: number | null;
  terpene_3_name: string | null;
  terpene_3_value: number | null;

  // Product data
  product_id: string | null;
  product_type: string | null;
  net_weight: number | null;
  unit: string | null;

  // Strain data
  lineage: string | null;
  dominance_type: string | null;
}

export interface GeneratedLabel {
  id: string;
  label_number: string;
  package_id: string;
  barcode_data: string;
  created_at: string;
}

class LabelAutoFillServiceError extends Error {
  constructor(message: string, public originalError?: any, public code?: string) {
    super(message);
    this.name = 'LabelAutoFillServiceError';
  }
}

export const labelAutoFillService = {
  /**
   * Fetch complete label data from 4-table JOIN
   * Joins: inventory_items + certificates_of_analysis + products + strain_catalog
   */
  async getCompleteLabelDataForPackage(packageId: string): Promise<LabelAutoFillData | null> {
    errorService.debug('[labelAutoFillService] Fetching complete label data for package', {
      packageId
    });

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          package_id,
          batch,
          batch_number,
          strain,
          product_name,
          package_date,
          available_qty,
          thc_percentage,
          cbd_percentage,
          unit,
          net_weight,
          batch_id,
          certificates_of_analysis!inner (
            thc_percentage,
            cbd_percentage,
            total_cannabinoids_percentage,
            harvest_date,
            sample_date,
            lab_name,
            terpene_1_name,
            terpene_1_value,
            terpene_2_name,
            terpene_2_value,
            terpene_3_name,
            terpene_3_value
          ),
          batches!inner (
            product_id,
            strain_id
          )
        `)
        .eq('package_id', packageId)
        .maybeSingle();

      if (error) {
        throw new LabelAutoFillServiceError(
          'Failed to fetch label data',
          error,
          error.code
        );
      }

      if (!data) {
        errorService.debug('[labelAutoFillService] No data found for package', { packageId });
        return null;
      }

      // Fetch product and strain details
      const batch = Array.isArray(data.batches) ? data.batches[0] : data.batches;
      const productId = batch?.product_id;
      const strainId = batch?.strain_id;

      let productData = null;
      let strainData = null;

      if (productId) {
        const { data: product } = await supabase
          .from('products')
          .select('id, type, net_weight')
          .eq('id', productId)
          .maybeSingle();
        productData = product;
      }

      if (strainId) {
        const { data: strain } = await supabase
          .from('strain_catalog')
          .select('genetics_description, dominance_type')
          .eq('id', strainId)
          .maybeSingle();
        strainData = strain;
      }

      const coa = Array.isArray(data.certificates_of_analysis)
        ? data.certificates_of_analysis[0]
        : data.certificates_of_analysis;

      const labelData: LabelAutoFillData = {
        // Inventory data
        package_id: data.package_id,
        batch: data.batch,
        batch_number: data.batch_number,
        strain: data.strain,
        product_name: data.product_name,
        package_date: data.package_date,
        available_qty: data.available_qty,

        // COA data
        thc_percentage: coa?.thc_percentage || data.thc_percentage || null,
        cbd_percentage: coa?.cbd_percentage || data.cbd_percentage || null,
        total_cannabinoids_percentage: coa?.total_cannabinoids_percentage || null,
        harvest_date: coa?.harvest_date || null,
        test_date: coa?.sample_date || null,
        lab_name: coa?.lab_name || null,
        terpene_1_name: coa?.terpene_1_name || null,
        terpene_1_value: coa?.terpene_1_value || null,
        terpene_2_name: coa?.terpene_2_name || null,
        terpene_2_value: coa?.terpene_2_value || null,
        terpene_3_name: coa?.terpene_3_name || null,
        terpene_3_value: coa?.terpene_3_value || null,

        // Product data
        product_id: productId || null,
        product_type: productData?.type || null,
        net_weight: productData?.net_weight || data.net_weight || null,
        unit: data.unit,

        // Strain data
        lineage: strainData?.genetics_description || null,
        dominance_type: strainData?.dominance_type || null,
      };

      errorService.debug('[labelAutoFillService] Successfully fetched label data');
      return labelData;
    } catch (error) {
      errorService.handle(error, {
        operation: 'Get Complete Label Data',
        metadata: { packageId },
      });
      throw error;
    }
  },

  /**
   * Generate barcode data in format: YYMMDDBatchID
   */
  formatBarcodeData(packageDate: string | null, batch: string | null): string {
    if (!packageDate || !batch) {
      return `CULT-${Date.now()}`;
    }

    try {
      const date = new Date(packageDate);
      const yy = date.getFullYear().toString().slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');

      return `${yy}${mm}${dd}${batch}`;
    } catch (error) {
      return `CULT-${Date.now()}`;
    }
  },

  /**
   * Generate unique label number
   */
  async generateLabelNumber(): Promise<string> {
    try {
      // Format: LBL-YYYYMMDD-NNN
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

      const { count } = await supabase
        .from('labels')
        .select('id', { count: 'exact', head: true })
        .like('label_number', `LBL-${today}-%`);

      const sequence = ((count || 0) + 1).toString().padStart(3, '0');
      return `LBL-${today}-${sequence}`;
    } catch (error) {
      // Fallback to timestamp-based
      return `LBL-${Date.now()}`;
    }
  },

  /**
   * Build terpene profile JSONB from COA data
   */
  buildTerpeneProfile(labelData: LabelAutoFillData): Record<string, number> | null {
    const profile: Record<string, number> = {};

    if (labelData.terpene_1_name && labelData.terpene_1_value) {
      profile[labelData.terpene_1_name] = labelData.terpene_1_value;
    }
    if (labelData.terpene_2_name && labelData.terpene_2_value) {
      profile[labelData.terpene_2_name] = labelData.terpene_2_value;
    }
    if (labelData.terpene_3_name && labelData.terpene_3_value) {
      profile[labelData.terpene_3_name] = labelData.terpene_3_value;
    }

    return Object.keys(profile).length > 0 ? profile : null;
  },

  /**
   * Create a fully populated label in the labels table
   */
  async createAutoPopulatedLabel(
    packageId: string,
    assignmentId?: string
  ): Promise<GeneratedLabel> {
    errorService.debug('[labelAutoFillService] Creating auto-populated label', {
      packageId,
      assignmentId
    });

    try {
      // Get complete label data
      const labelData = await this.getCompleteLabelDataForPackage(packageId);

      if (!labelData) {
        throw new LabelAutoFillServiceError(
          'Unable to fetch label data for package',
          null,
          'NO_DATA'
        );
      }

      // Generate label number and barcode
      const labelNumber = await this.generateLabelNumber();
      const barcodeData = this.formatBarcodeData(labelData.package_date, labelData.batch);
      const terpeneProfile = this.buildTerpeneProfile(labelData);

      // Calculate expiration date (1 year from package date)
      let expirationDate = null;
      if (labelData.package_date) {
        const packageDate = new Date(labelData.package_date);
        packageDate.setFullYear(packageDate.getFullYear() + 1);
        expirationDate = packageDate.toISOString().split('T')[0];
      }

      // Insert into labels table
      const { data, error } = await supabase
        .from('labels')
        .insert({
          label_number: labelNumber,
          product_id: labelData.product_id,
          package_id: packageId,
          batch_id: labelData.batch,
          batch_number: labelData.batch_number,
          strain: labelData.strain,
          product_name: labelData.product_name,
          product_type: labelData.product_type,
          net_weight_grams: labelData.net_weight,
          qr_code_data: barcodeData,
          thc_percentage: labelData.thc_percentage,
          cbd_percentage: labelData.cbd_percentage,
          total_cannabinoids: labelData.total_cannabinoids_percentage,
          terpene_profile: terpeneProfile,
          test_date: labelData.test_date,
          lab_name: labelData.lab_name,
          harvest_date: labelData.harvest_date,
          package_date: labelData.package_date,
          expiration_date: expirationDate,
          lineage: labelData.lineage,
          warnings: ['Keep out of reach of children', 'For use only by adults 21 years of age and older'],
        })
        .select('id, label_number, package_id, qr_code_data, created_at')
        .single();

      if (error) {
        throw new LabelAutoFillServiceError(
          'Failed to create label',
          error,
          error.code
        );
      }

      // If assignment provided, link the label to the assignment
      if (assignmentId && data.id) {
        await supabase
          .from('package_assignments')
          .update({ label_id: data.id })
          .eq('id', assignmentId);
      }

      errorService.debug('[labelAutoFillService] Successfully created label', {
        labelId: data.id,
        labelNumber: data.label_number
      });

      return {
        id: data.id,
        label_number: data.label_number,
        package_id: data.package_id,
        barcode_data: data.qr_code_data,
        created_at: data.created_at,
      };
    } catch (error) {
      errorService.handle(error, {
        operation: 'Create Auto-Populated Label',
        metadata: { packageId, assignmentId },
      });
      throw error;
    }
  },

  /**
   * Create label for a package assignment
   * Convenience method that links assignment and label
   */
  async createLabelForAssignment(assignmentId: string): Promise<GeneratedLabel> {
    errorService.debug('[labelAutoFillService] Creating label for assignment', {
      assignmentId
    });

    try {
      // Get assignment details
      const { data: assignment, error } = await supabase
        .from('package_assignments')
        .select('package_id, label_id')
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) {
        throw new LabelAutoFillServiceError(
          'Assignment not found',
          error,
          'ASSIGNMENT_NOT_FOUND'
        );
      }

      // Check if label already exists
      if (assignment.label_id) {
        const { data: existingLabel } = await supabase
          .from('labels')
          .select('id, label_number, package_id, qr_code_data, created_at')
          .eq('id', assignment.label_id)
          .single();

        if (existingLabel) {
          errorService.debug('[labelAutoFillService] Label already exists for assignment');
          return {
            id: existingLabel.id,
            label_number: existingLabel.label_number,
            package_id: existingLabel.package_id,
            barcode_data: existingLabel.qr_code_data,
            created_at: existingLabel.created_at,
          };
        }
      }

      // Create new label
      return await this.createAutoPopulatedLabel(assignment.package_id, assignmentId);
    } catch (error) {
      errorService.handle(error, {
        operation: 'Create Label for Assignment',
        metadata: { assignmentId },
      });
      throw error;
    }
  },
};
