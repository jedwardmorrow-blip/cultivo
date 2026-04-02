import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import { getCOAPDFUrl } from '@/features/coa/services/coa.service';
import { getSiteUrl } from '@/lib/utils';
import { DEFAULT_LICENSE_NUMBER, DEFAULT_LICENSE_NAME } from '@/lib/constants';
import type { Coversheet, ComplianceHeader, BatchComplianceInfo, DistributedToInfo, CoversheetPrecomputedFields, OrderWithCustomer, OrderItemWithProduct } from '@/types';

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function generateCoversheet(orderId: string): Promise<Coversheet> {
  const { data: orderData } = await supabase
    .from('orders')
    .select('order_number, customer_id, customers(name), scheduled_delivery_date')
    .eq('id', orderId)
    .single() as { data: OrderWithCustomer | null; error: any };

  const [complianceHeader, batchCompliance, distributedTo] = await Promise.all([
    getComplianceHeaderData(),
    getBatchComplianceInfo(orderId),
    getDistributedToInfo(orderId).catch(() => ({
      originator_name: DEFAULT_LICENSE_NAME,
      originator_license: DEFAULT_LICENSE_NUMBER,
      customer_name: 'Unknown Customer',
      license_number: 'License Not Found',
    } as DistributedToInfo)),
  ]);

  const { data: existing, error: checkError } = await supabase
    .from('coversheets')
    .select('id, access_token')
    .eq('order_id', orderId)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing coversheet: ${checkError.message}`);
  }

  const deliveryDate = orderData?.scheduled_delivery_date || null;

  const precomputedFields: CoversheetPrecomputedFields = {
    compliance_header: complianceHeader,
    batch_compliance_data: batchCompliance,
    distributed_to_data: distributedTo,
    package_manifest_data: [],
  };

  if (existing) {
    const publicUrl = getCoversheetPublicUrl(existing.access_token);
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    // Refresh items_summary and total_packages from current order items
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('product_id, quantity, products(name, type)')
      .eq('order_id', orderId) as { data: OrderItemWithProduct[] | null; error: any };

    const itemsSummary = (itemsData || []).map(item => ({
      product_id: item.product_id,
      product_name: item.products?.name || 'Unknown',
      product_type: item.products?.type || 'Unknown',
      quantity: item.quantity
    }));

    const customerName = orderData?.customers?.name || 'Unknown Customer';

    const { data, error } = await supabase
      .from('coversheets')
      .update({
        delivery_date: deliveryDate,
        qr_code_data: qrCodeDataUrl,
        customer_name: customerName,
        items_summary: itemsSummary,
        total_packages: itemsSummary.reduce((sum, item) => sum + item.quantity, 0),
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
      .update({ coversheet_url: publicUrl })
      .eq('id', orderId);

    return data;
  } else {
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

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('product_id, quantity, products(name, type)')
      .eq('order_id', orderId) as { data: OrderItemWithProduct[] | null; error: any };

    const itemsSummary = (itemsData || []).map(item => ({
      product_id: item.product_id,
      product_name: item.products?.name || 'Unknown',
      product_type: item.products?.type || 'Unknown',
      quantity: item.quantity
    }));

    const coversheetNumber = `CS-${orderData?.order_number || 'UNKNOWN'}`;
    const customerName = orderData?.customers?.name || 'Unknown Customer';

    const { data, error } = await supabase
      .from('coversheets')
      .insert({
        coversheet_number: coversheetNumber,
        order_id: orderId,
        access_token: accessToken,
        qr_code_data: qrCodeDataUrl,
        customer_name: customerName,
        delivery_date: deliveryDate,
        total_packages: itemsSummary.reduce((sum, item) => sum + item.quantity, 0),
        items_summary: itemsSummary,
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

export function getCoversheetPath(accessToken: string): string {
  return `/coversheet?token=${accessToken}`;
}

export function getCoversheetPublicUrl(accessToken: string): string {
  return `${getSiteUrl()}/coversheet?token=${accessToken}`;
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
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .eq('category', 'company');

  if (error) {
    throw new Error(`Failed to fetch compliance settings: ${error.message}`);
  }

  const settings: Record<string, string> = {};
  data?.forEach(item => {
    settings[item.setting_key] = item.setting_value || '';
  });

  const pregnancyWarning = '"Using marijuana during pregnancy could cause birth defects or other health issues to your unborn child."';

  return {
    company_name: settings.company_license_name || DEFAULT_LICENSE_NAME,
    license_number: settings.company_license_number || DEFAULT_LICENSE_NUMBER,
    pregnancy_warning: pregnancyWarning
  };
}

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

  const [{ data: batchRecords }, { data: coaRecords }] = await Promise.all([
    supabase
      .from('batch_registry')
      .select('batch_number, harvest_date')
      .in('batch_number', uniqueBatches),
    supabase
      .from('certificates_of_analysis')
      .select('batch_number, pdf_file_path')
      .in('batch_number', uniqueBatches)
      .eq('is_active', true),
  ]);

  const harvestMap = new Map<string, string | null>();
  for (const rec of batchRecords || []) {
    harvestMap.set(rec.batch_number, rec.harvest_date);
  }

  const coaPdfMap = new Map<string, string>();
  for (const coa of coaRecords || []) {
    if (coa.batch_number && coa.pdf_file_path) {
      coaPdfMap.set(coa.batch_number, coa.pdf_file_path);
    }
  }

  const batchMap = new Map<string, BatchComplianceInfo>();

  for (const assignment of assignments) {
    if (!assignment.batch || batchMap.has(assignment.batch)) continue;

    const rawHarvest = harvestMap.get(assignment.batch);
    const harvestDate = rawHarvest
      ? new Date(rawHarvest + 'T00:00:00').toLocaleDateString('en-US')
      : 'N/A';

    const dateValue = assignment.package_date
      ? new Date(assignment.package_date + 'T00:00:00').toLocaleDateString('en-US')
      : 'N/A';

    const pdfPath = coaPdfMap.get(assignment.batch);
    const coaPdfUrl = pdfPath ? getCOAPDFUrl(pdfPath) : undefined;

    batchMap.set(assignment.batch, {
      strain: assignment.strain || 'Unknown',
      batch_id: assignment.batch,
      harvest_date: harvestDate,
      manufacture_date: dateValue,
      package_date: dateValue,
      coa_url: coaPdfUrl || `/coa-library?batch=${assignment.batch}`,
      coa_pdf_url: coaPdfUrl,
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
  const [{ data: orderData, error }, { data: settingsData }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        customer_id,
        customers!inner(
          name,
          license_number
        )
      `)
      .eq('id', orderId)
      .single() as Promise<{ data: OrderWithCustomer | null; error: any }>,
    supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['company_license_name', 'company_license_number']),
  ]);

  if (error) {
    throw new Error(`Failed to fetch customer data: ${error.message}`);
  }

  const customer = orderData?.customers;

  const settings: Record<string, string> = {};
  settingsData?.forEach(item => {
    settings[item.setting_key] = item.setting_value || '';
  });

  return {
    originator_name: settings.company_license_name || DEFAULT_LICENSE_NAME,
    originator_license: settings.company_license_number || DEFAULT_LICENSE_NUMBER,
    customer_name: customer?.name || 'Unknown Customer',
    license_number: customer?.license_number || 'License Not Found',
    location_name: undefined
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
  // Generate first — only mark as not outdated after successful generation
  const result = await generateCoversheet(orderId);

  await supabase
    .from('coversheets')
    .update({ is_outdated: false })
    .eq('order_id', orderId);

  return result;
}
