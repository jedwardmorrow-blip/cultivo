import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import type { Coversheet, CoversheetInsert, CoversheetItemSummary, ComplianceHeader, BatchComplianceInfo, DistributedToInfo } from '@/types';

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function generateCoversheet(orderId: string): Promise<Coversheet> {
  const accessToken = generateSecureToken();
  const publicUrl = getCoversheetPublicUrl(accessToken);

  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  const [complianceHeader, batchCompliance, distributedTo, packageManifest] = await Promise.all([
    getComplianceHeaderData(),
    getBatchComplianceInfo(orderId),
    getDistributedToInfo(orderId).catch(() => ({
      customer_name: 'Unknown Customer',
      license_number: 'License Not Found',
    } as DistributedToInfo)),
    getCoversheetPackageAssignments(orderId),
  ]);

  const { data: existing, error: checkError } = await supabase
    .from('coversheets')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing coversheet: ${checkError.message}`);
  }

  const precomputedFields = {
    compliance_header: complianceHeader as any,
    batch_compliance_data: batchCompliance as any,
    distributed_to_data: distributedTo as any,
    package_manifest_data: packageManifest as any,
  };

  if (existing) {
    const { data, error } = await supabase
      .from('coversheets')
      .update({
        access_token: accessToken,
        qr_code_data: qrCodeDataUrl,
        ...precomputedFields,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update coversheet: ${error.message}`);
    }

    await supabase
      .from('orders')
      .update({
        coversheet_url: publicUrl,
        coversheet_id: existing.id
      })
      .eq('id', orderId);

    return data;
  } else {
    const { data: orderData } = await supabase
      .from('orders')
      .select('order_number, customer_id, customers(name), scheduled_delivery_date')
      .eq('id', orderId)
      .single();

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('product_id, quantity, products(name, type)')
      .eq('order_id', orderId);

    const itemsSummary = (itemsData || []).map(item => ({
      product_id: item.product_id,
      product_name: (item.products as any)?.name || 'Unknown',
      product_type: (item.products as any)?.type || 'Unknown',
      quantity: item.quantity
    }));

    const coversheetNumber = `CS-${orderData?.order_number || 'UNKNOWN'}`;
    const customerName = (orderData?.customers as any)?.name || 'Unknown Customer';

    const { data, error } = await supabase
      .from('coversheets')
      .insert({
        coversheet_number: coversheetNumber,
        order_id: orderId,
        access_token: accessToken,
        qr_code_data: qrCodeDataUrl,
        customer_name: customerName,
        delivery_date: orderData?.scheduled_delivery_date || null,
        total_packages: itemsSummary.reduce((sum, item) => sum + item.quantity, 0),
        items_summary: itemsSummary as any,
        ...precomputedFields,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create coversheet: ${error.message}`);
    }

    await supabase
      .from('orders')
      .update({
        coversheet_url: publicUrl,
        coversheet_id: data.id
      })
      .eq('id', orderId);

    return data;
  }
}

export async function getCoversheetByToken(token: string): Promise<Coversheet | null> {
  const { data, error } = await supabase
    .from('coversheets')
    .select('*')
    .eq('access_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get coversheet: ${error.message}`);
  }

  if (data) {
    await updateCoversheetAccessCount(data.id);
  }

  return data;
}

export async function getCoversheetByOrderId(orderId: string): Promise<Coversheet | null> {
  const { data, error } = await supabase
    .from('coversheets')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get coversheet: ${error.message}`);
  }

  return data;
}

export async function getAllActiveCoversheets(): Promise<Coversheet[]> {
  const { data, error } = await supabase
    .from('coversheets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get coversheets: ${error.message}`);
  }

  return data || [];
}

export async function updateCoversheetAccessCount(coversheetId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_coversheet_access', {
    coversheet_id: coversheetId
  });

  if (error) {
    console.error('Failed to update access count:', error);
  }
}

export async function toggleCoversheetActive(coversheetId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('coversheets')
    .update({ is_active: isActive })
    .eq('id', coversheetId);

  if (error) {
    throw new Error(`Failed to toggle coversheet: ${error.message}`);
  }
}

export function getCoversheetPublicUrl(accessToken: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/coversheet?token=${accessToken}`;
}

export async function getCoversheetPackageAssignments(orderId: string) {
  const { data, error } = await supabase
    .from('package_assignments_details')
    .select('*')
    .eq('order_id', orderId)
    .order('order_item_id');

  if (error) {
    console.error('[getCoversheetPackageAssignments] Error:', error);
    return [];
  }

  return data || [];
}

export async function getCoversheetBatchInfo(orderId: string) {
  const { data: assignments } = await supabase
    .from('package_assignments_details')
    .select('batch, strain')
    .eq('order_id', orderId);

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const uniqueBatches = Array.from(new Set(
    assignments.map(a => a.batch).filter(b => b !== null)
  ));

  const batchInfoPromises = uniqueBatches.map(async (batch) => {
    const { data: coaData } = await supabase
      .from('certificates_of_analysis')
      .select(`
        id,
        batch_number,
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
      `)
      .eq('batch_number', batch)
      .maybeSingle();

    return {
      batch,
      coa: coaData,
      strain: assignments.find(a => a.batch === batch)?.strain || null
    };
  });

  const batchInfo = await Promise.all(batchInfoPromises);
  return batchInfo;
}

// ============================================================================
// COMPLIANCE DATA FUNCTIONS
// ============================================================================

/**
 * Get Compliance Header Data
 *
 * Fetches company information, license number, and regulatory warnings from app settings.
 * This data is required by Arizona DHS and must appear on all coversheets.
 *
 * @returns ComplianceHeader object with company name, license, and warning text
 * @throws Error if settings cannot be retrieved
 *
 * @example
 * const header = await getComplianceHeaderData();
 * // Returns:
 * // {
 * //   company_name: "Kind Meds Inc.",
 * //   license_number: "00000078DCBK00628996",
 * //   pregnancy_warning: "Using marijuana during pregnancy could cause..."
 * // }
 */
export async function getComplianceHeaderData(): Promise<ComplianceHeader> {
  const { data: settings, error } = await supabase
    .from('app_settings')
    .select('company_name, license_number, company_phone')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch compliance settings: ${error.message}`);
  }

  // Arizona-required pregnancy warning (mandated by state law)
  const pregnancyWarning = '"Using marijuana during pregnancy could cause birth defects or other health issues to your unborn child."';

  return {
    company_name: settings?.company_name || 'Kind Meds Inc.',
    license_number: settings?.license_number || '00000078DCBK00628996',
    pregnancy_warning: pregnancyWarning
  };
}

/**
 * Get Batch Compliance Information
 *
 * Retrieves batch traceability data for all packages assigned to an order.
 * Includes strain, batch ID, harvest date, and manufacture date for compliance reporting.
 *
 * @param orderId - UUID of the order
 * @returns Array of BatchComplianceInfo with unique batches and their dates
 * @throws Error if batch data cannot be retrieved
 *
 * @example
 * const batches = await getBatchComplianceInfo(orderId);
 * // Returns:
 * // [
 * //   {
 * //     strain: "Animal Tsunami",
 * //     batch_id: "250916-ASU",
 * //     harvest_date: "09/16/2025",
 * //     manufacture_date: "09/25/2025",
 * //     coa_url: "/coa-library?batch=250916-ASU"
 * //   },
 * //   ...
 * // ]
 *
 * @note Dates are formatted as MM/DD/YYYY per Arizona compliance requirements
 * @note Only includes batches with assigned packages (excludes unallocated items)
 */
export async function getBatchComplianceInfo(orderId: string): Promise<BatchComplianceInfo[]> {
  const { data: assignments, error: assignError } = await supabase
    .from('package_assignments_details')
    .select('batch, strain, package_date')
    .eq('order_id', orderId)
    .not('batch', 'is', null);

  if (assignError) {
    console.error('[getBatchComplianceInfo] Error fetching assignments:', assignError);
    return [];
  }

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const uniqueBatches = Array.from(new Set(
    assignments.map(a => a.batch).filter((b): b is string => b !== null)
  ));

  const { data: batchRecords } = await supabase
    .from('batch_registry')
    .select('batch_number, harvest_date')
    .in('batch_number', uniqueBatches);

  const harvestMap = new Map<string, string | null>();
  for (const rec of batchRecords || []) {
    harvestMap.set(rec.batch_number, rec.harvest_date);
  }

  const batchMap = new Map<string, BatchComplianceInfo>();

  for (const assignment of assignments) {
    if (!assignment.batch || batchMap.has(assignment.batch)) continue;

    const rawHarvest = harvestMap.get(assignment.batch);
    const harvestDate = rawHarvest
      ? new Date(rawHarvest).toLocaleDateString('en-US')
      : 'N/A';

    const manufactureDate = assignment.package_date
      ? new Date(assignment.package_date).toLocaleDateString('en-US')
      : 'N/A';

    batchMap.set(assignment.batch, {
      strain: assignment.strain || 'Unknown',
      batch_id: assignment.batch,
      harvest_date: harvestDate,
      manufacture_date: manufactureDate,
      coa_url: `/coa-library?batch=${assignment.batch}`
    });
  }

  return Array.from(batchMap.values()).sort((a, b) =>
    a.strain.localeCompare(b.strain)
  );
}

/**
 * Get Distributed To Information
 *
 * Retrieves customer information for the "Distributed To" compliance section.
 * Shows the receiving dispensary's name and license number.
 *
 * @param orderId - UUID of the order
 * @returns DistributedToInfo with customer details
 * @throws Error if customer data cannot be retrieved
 *
 * @example
 * const distributedTo = await getDistributedToInfo(orderId);
 * // Returns:
 * // {
 * //   customer_name: "Cannabis Research Group, Inc",
 * //   license_number: "00000104ESDH57805022",
 * //   location_name: "Tolleson"
 * // }
 *
 * @note Currently supports single customer per order
 *
 * @future Multi-Location Distribution
 * Some customers have multiple locations. When implementing:
 * - Return DistributedToInfo[] array instead of single object
 * - Query customer_locations table (to be created)
 * - Group by location and show all distribution points
 * - Update DistributedToSection component to handle array rendering
 */
export async function getDistributedToInfo(orderId: string): Promise<DistributedToInfo> {
  const { data: orderData, error } = await supabase
    .from('orders')
    .select(`
      customer_id,
      customers!inner(
        name,
        license_number
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch customer data: ${error.message}`);
  }

  const customer = orderData?.customers as any;

  return {
    customer_name: customer?.name || 'Unknown Customer',
    license_number: customer?.license_number || 'License Not Found',
    location_name: undefined // TODO: Add when implementing multi-location support
  };
}

/**
 * Mark Coversheet as Outdated
 *
 * Manually marks a coversheet as outdated when order data changes.
 * This is also handled automatically by database triggers, but can be called
 * manually when needed.
 *
 * @param orderId - UUID of the order whose coversheet should be marked outdated
 * @returns Promise that resolves when update is complete
 *
 * @example
 * await markCoversheetOutdated(orderId);
 * // Coversheet will show "outdated" warning in UI
 *
 * @note Automatic triggers handle most cases - only call manually for edge cases
 * @see Database migration: 20251027010000_enhance_coversheets_for_compliance.sql
 */
export async function markCoversheetOutdated(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('coversheets')
    .update({
      is_outdated: true,
      last_order_update: new Date().toISOString()
    })
    .eq('order_id', orderId)
    .eq('is_active', true);

  if (error) {
    console.error('[markCoversheetOutdated] Error:', error);
    throw new Error(`Failed to mark coversheet outdated: ${error.message}`);
  }
}

/**
 * Regenerate Coversheet with Updated Data
 *
 * Creates a new coversheet with fresh compliance data and resets the outdated flag.
 * This should be called when the user manually requests a coversheet refresh after
 * order modifications.
 *
 * @param orderId - UUID of the order to regenerate coversheet for
 * @returns Updated Coversheet object
 * @throws Error if regeneration fails
 *
 * @example
 * const updated = await regenerateCoversheet(orderId);
 * // Returns fresh coversheet with is_outdated = false
 *
 * @note This calls the existing generateCoversheet function, which handles both
 *       initial creation and updates intelligently
 */
export async function regenerateCoversheet(orderId: string): Promise<Coversheet> {
  // First mark as not outdated, then regenerate
  await supabase
    .from('coversheets')
    .update({ is_outdated: false })
    .eq('order_id', orderId);

  // Use existing generation logic which handles updates
  return await generateCoversheet(orderId);
}
