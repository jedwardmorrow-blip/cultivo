import { supabase } from '@/lib/supabase';
import { errorService } from '@/services/error.service';
import { DEFAULT_LICENSE_NUMBER } from '@/lib/constants';
import { getCoversheetByOrderId, generateCoversheet, getCoversheetPublicUrl } from './coversheet.service';

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

function parseNetWeightFromName(productName: string): number | null {
  const match = productName.match(/(\d+\.?\d*)g/);
  return match ? parseFloat(match[1]) : null;
}

class LabelAutoFillServiceError extends Error {
  constructor(message: string, public originalError?: any, public code?: string) {
    super(message);
    this.name = 'LabelAutoFillServiceError';
  }
}

async function getOrCreateCoversheetUrl(orderId: string): Promise<string | null> {
  try {
    const existing = await getCoversheetByOrderId(orderId);
    if (existing?.access_token) {
      return getCoversheetPublicUrl(existing.access_token);
    }
    const created = await generateCoversheet(orderId);
    if (created?.access_token) {
      return getCoversheetPublicUrl(created.access_token);
    }
    return null;
  } catch (err) {
    errorService.debug('[labelAutoFillService] Could not get coversheet URL for QR code', { orderId, error: err });
    return null;
  }
}

export const labelAutoFillService = {
  async getCompleteLabelDataForPackage(packageId: string): Promise<LabelAutoFillData | null> {
    errorService.debug('[labelAutoFillService] Fetching complete label data for package', {
      packageId
    });

    try {
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('package_id, batch, batch_number, strain, product_name, package_date, available_qty, thc_percentage, cbd_percentage, unit, net_weight, batch_id, strain_id, category')
        .eq('package_id', packageId)
        .maybeSingle();

      if (itemError) {
        throw new LabelAutoFillServiceError('Failed to fetch inventory item', itemError, itemError.code);
      }

      if (!item) {
        errorService.debug('[labelAutoFillService] No inventory item found for package', { packageId });
        return null;
      }

      let coaData: {
        thc_percentage: number | null;
        cbd_percentage: number | null;
        total_cannabinoids_percentage: number | null;
        harvest_date: string | null;
        sample_date: string | null;
        terpene_1_name: string | null;
        terpene_1_value: number | null;
        terpene_2_name: string | null;
        terpene_2_value: number | null;
        terpene_3_name: string | null;
        terpene_3_value: number | null;
      } | null = null;

      if (item.batch_id) {
        const { data: coa, error: coaError } = await supabase
          .from('certificates_of_analysis')
          .select('thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date, sample_date, terpene_1_name, terpene_1_value, terpene_2_name, terpene_2_value, terpene_3_name, terpene_3_value')
          .eq('batch_id', item.batch_id)
          .eq('is_active', true)
          .maybeSingle();

        if (coaError) {
          errorService.debug('[labelAutoFillService] COA query error (non-fatal)', { error: coaError.message });
        }

        if (!coa) {
          const batchLabel = item.batch_number || item.batch || 'unknown';
          throw new LabelAutoFillServiceError(
            `Cannot generate label: no active COA found for batch ${batchLabel}. Upload a COA in Batch Management before generating labels.`,
            null,
            'NO_ACTIVE_COA'
          );
        }

        coaData = coa;
      }

      let batchData: { harvest_date: string | null; strain_id: string | null } | null = null;
      if (item.batch_id) {
        const { data: batch } = await supabase
          .from('batch_registry')
          .select('harvest_date, strain_id')
          .eq('id', item.batch_id)
          .maybeSingle();
        batchData = batch;
      }

      const strainId = item.strain_id || batchData?.strain_id;
      let strainData: { name: string | null; genetics_description: string | null; dominance_type: string | null } | null = null;
      if (strainId) {
        const { data: strain } = await supabase
          .from('strains')
          .select('name, genetics_description, dominance_type')
          .eq('id', strainId)
          .maybeSingle();
        strainData = strain;
      }

      let productData: { id: string; type: string | null; net_weight: number | null } | null = null;
      if (item.product_name) {
        const { data: product } = await supabase
          .from('products')
          .select('id, type, net_weight')
          .eq('name', item.product_name)
          .eq('is_archived', false)
          .maybeSingle();
        productData = product;
      }

      const resolvedNetWeight = productData?.net_weight ?? item.net_weight
        ?? (item.product_name ? parseNetWeightFromName(item.product_name) : null);

      const labelData: LabelAutoFillData = {
        package_id: item.package_id,
        batch: item.batch || item.batch_number || null,
        batch_number: item.batch_number,
        strain: item.strain || strainData?.name || null,
        product_name: item.product_name,
        package_date: item.package_date,
        available_qty: item.available_qty,

        thc_percentage: coaData?.thc_percentage ?? item.thc_percentage ?? null,
        cbd_percentage: coaData?.cbd_percentage ?? item.cbd_percentage ?? null,
        total_cannabinoids_percentage: coaData?.total_cannabinoids_percentage ?? null,
        harvest_date: batchData?.harvest_date ?? coaData?.harvest_date ?? null,
        test_date: coaData?.sample_date ?? null,
        lab_name: null,
        terpene_1_name: coaData?.terpene_1_name ?? null,
        terpene_1_value: coaData?.terpene_1_value ?? null,
        terpene_2_name: coaData?.terpene_2_name ?? null,
        terpene_2_value: coaData?.terpene_2_value ?? null,
        terpene_3_name: coaData?.terpene_3_name ?? null,
        terpene_3_value: coaData?.terpene_3_value ?? null,

        product_id: productData?.id ?? null,
        product_type: productData?.type ?? item.category ?? null,
        net_weight: resolvedNetWeight,
        unit: item.unit,

        lineage: strainData?.genetics_description ?? null,
        dominance_type: strainData?.dominance_type ?? null,
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
    assignmentId?: string,
    orderId?: string
  ): Promise<GeneratedLabel> {
    errorService.debug('[labelAutoFillService] Creating auto-populated label', {
      packageId,
      assignmentId,
      orderId
    });

    try {
      const labelData = await this.getCompleteLabelDataForPackage(packageId);

      if (!labelData) {
        throw new LabelAutoFillServiceError(
          'Unable to fetch label data for package',
          null,
          'NO_DATA'
        );
      }

      const labelNumber = await this.generateLabelNumber();
      const fallbackBarcodeData = this.formatBarcodeData(labelData.package_date, labelData.batch);
      const terpeneProfile = this.buildTerpeneProfile(labelData);

      let qrCodeData = fallbackBarcodeData;
      if (orderId) {
        const coversheetUrl = await getOrCreateCoversheetUrl(orderId);
        if (coversheetUrl) {
          qrCodeData = coversheetUrl;
        }
      }

      // Look up customer license via order → customer
      let customerLicenseName: string | null = null;
      let customerLicenseNumber: string | null = null;
      if (orderId) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('customers:customer_id ( license_name, license_number )')
          .eq('id', orderId)
          .single();

        const customer = (orderData as any)?.customers;
        if (customer?.license_name || customer?.license_number) {
          customerLicenseName = customer.license_name || null;
          customerLicenseNumber = customer.license_number || null;
        }
      }

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
          qr_code_data: qrCodeData,
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
          dominance_type: labelData.dominance_type,
          compliance_uid: DEFAULT_LICENSE_NUMBER,
          customer_license_name: customerLicenseName,
          customer_license_number: customerLicenseNumber,
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
      const { data: assignment, error } = await supabase
        .from('package_assignments')
        .select('package_id, label_id, order_id')
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) {
        throw new LabelAutoFillServiceError(
          'Assignment not found',
          error,
          'ASSIGNMENT_NOT_FOUND'
        );
      }

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

      return await this.createAutoPopulatedLabel(assignment.package_id, assignmentId, assignment.order_id);
    } catch (error) {
      errorService.handle(error, {
        operation: 'Create Label for Assignment',
        metadata: { assignmentId },
      });
      throw error;
    }
  },

  /**
   * Generate labels for all package assignments in an order
   * Returns array of generated labels and any errors encountered
   */
  async generateLabelsForOrder(orderId: string): Promise<{
    success: GeneratedLabel[];
    errors: Array<{ assignmentId: string; error: string }>;
  }> {
    errorService.debug('[labelAutoFillService] Generating labels for entire order', {
      orderId
    });

    try {
      // Get all package assignments for the order
      const { data: assignments, error } = await supabase
        .from('package_assignments')
        .select('id, package_id, label_id')
        .eq('order_id', orderId);

      if (error) {
        throw new LabelAutoFillServiceError(
          'Failed to fetch package assignments',
          error,
          error.code
        );
      }

      if (!assignments || assignments.length === 0) {
        errorService.debug('[labelAutoFillService] No package assignments found for order');
        return { success: [], errors: [] };
      }

      // Generate labels for each assignment
      const success: GeneratedLabel[] = [];
      const errors: Array<{ assignmentId: string; error: string }> = [];

      for (const assignment of assignments) {
        try {
          // Skip if label already exists
          if (assignment.label_id) {
            const { data: existingLabel } = await supabase
              .from('labels')
              .select('id, label_number, package_id, qr_code_data, created_at')
              .eq('id', assignment.label_id)
              .maybeSingle();

            if (existingLabel) {
              success.push({
                id: existingLabel.id,
                label_number: existingLabel.label_number,
                package_id: existingLabel.package_id,
                barcode_data: existingLabel.qr_code_data,
                created_at: existingLabel.created_at,
              });
              continue;
            }
          }

          const label = await this.createAutoPopulatedLabel(
            assignment.package_id,
            assignment.id,
            orderId
          );
          success.push(label);
        } catch (error: any) {
          errors.push({
            assignmentId: assignment.id,
            error: error.message || 'Failed to generate label',
          });
        }
      }

      errorService.debug('[labelAutoFillService] Batch label generation complete', {
        successCount: success.length,
        errorCount: errors.length
      });

      return { success, errors };
    } catch (error) {
      errorService.handle(error, {
        operation: 'Generate Labels for Order',
        metadata: { orderId },
      });
      throw error;
    }
  },

  /**
   * Get all labels for an order (via package assignments)
   */
  async getLabelsForOrder(orderId: string): Promise<Array<GeneratedLabel & { assignment_id: string }>> {
    errorService.debug('[labelAutoFillService] Fetching labels for order', {
      orderId
    });

    try {
      const { data: assignments, error } = await supabase
        .from('package_assignments')
        .select(`
          id,
          package_id,
          label_id,
          labels!inner (
            id,
            label_number,
            package_id,
            qr_code_data,
            created_at,
            printed_at,
            voided_at
          )
        `)
        .eq('order_id', orderId)
        .not('label_id', 'is', null);

      if (error) {
        throw new LabelAutoFillServiceError(
          'Failed to fetch labels',
          error,
          error.code
        );
      }

      const labels = (assignments || []).map((assignment: any) => ({
        assignment_id: assignment.id,
        id: assignment.labels.id,
        label_number: assignment.labels.label_number,
        package_id: assignment.labels.package_id,
        barcode_data: assignment.labels.qr_code_data,
        created_at: assignment.labels.created_at,
        printed_at: assignment.labels.printed_at,
        voided_at: assignment.labels.voided_at,
      }));

      errorService.debug('[labelAutoFillService] Successfully fetched labels', {
        count: labels.length
      });

      return labels;
    } catch (error) {
      errorService.handle(error, {
        operation: 'Get Labels for Order',
        metadata: { orderId },
      });
      throw error;
    }
  },

  /**
   * Void a label
   * Marks label as voided with reason and timestamp
   */
  async voidLabel(
    labelId: string,
    reason: string = 'Label voided by user'
  ): Promise<void> {
    errorService.debug('[labelAutoFillService] Voiding label', {
      labelId,
      reason
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('labels')
        .update({
          voided_at: new Date().toISOString(),
          voided_by: user?.id || null,
          void_reason: reason,
        })
        .eq('id', labelId)
        .is('voided_at', null); // Only void if not already voided

      if (error) {
        throw new LabelAutoFillServiceError(
          'Failed to void label',
          error,
          error.code
        );
      }

      errorService.debug('[labelAutoFillService] Successfully voided label');
    } catch (error) {
      errorService.handle(error, {
        operation: 'Void Label',
        metadata: { labelId, reason },
      });
      throw error;
    }
  },

  /**
   * Regenerate a label (void old one and create new)
   * Useful when package data has been updated
   */
  async regenerateLabel(
    assignmentId: string,
    reason: string = 'Label regenerated due to data update'
  ): Promise<GeneratedLabel> {
    errorService.debug('[labelAutoFillService] Regenerating label', {
      assignmentId,
      reason
    });

    try {
      const { data: assignment, error } = await supabase
        .from('package_assignments')
        .select('package_id, label_id, order_id')
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) {
        throw new LabelAutoFillServiceError(
          'Assignment not found',
          error,
          'ASSIGNMENT_NOT_FOUND'
        );
      }

      if (assignment.label_id) {
        await this.voidLabel(assignment.label_id, reason);
      }

      return await this.createAutoPopulatedLabel(assignment.package_id, assignmentId, assignment.order_id);
    } catch (error) {
      errorService.handle(error, {
        operation: 'Regenerate Label',
        metadata: { assignmentId, reason },
      });
      throw error;
    }
  },
};
