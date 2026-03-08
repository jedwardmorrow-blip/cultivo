import { supabase } from '@/lib/supabase';
import {
  getCompanySettings,
  DEFAULT_BRAND_NAME, DEFAULT_ENTITY_NAME, DEFAULT_COMPANY_NAME,
  DEFAULT_LICENSE_NAME, DEFAULT_COMPANY_ADDRESS, DEFAULT_COMPANY_CITY,
  DEFAULT_COMPANY_STATE, DEFAULT_COMPANY_POSTAL_CODE, DEFAULT_LICENSE_NUMBER,
} from '@/lib/constants';

export interface InvoiceLineItem {
  id: string;
  product_name: string;
  package_id: string | null;
  batch_number: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  discount: number;
  total: number;
  strain: string | null;
  product_category: string;
  strain_dominance: string | null;
  strain_lineage: string | null;
  thc_percentage: number | null;
  harvest_date: string | null;
}

export interface InvoiceData {
  invoice_number: string;
  invoice_id: string;
  order_number: string;
  order_date: string;
  estimated_delivery_date: string | null;

  company_brand_name: string;
  company_entity_name: string;
  company_name: string;
  company_license_name: string;
  company_address: string;
  company_city: string;
  company_state: string;
  company_postal_code: string;
  company_license_number: string;
  company_logo_path: string;

  customer_name: string;
  customer_license_name: string | null;
  customer_license_number: string | null;
  customer_delivery_address: string | null;
  customer_delivery_city: string | null;
  customer_delivery_state: string | null;
  customer_delivery_postal_code: string | null;

  line_items: InvoiceLineItem[];

  subtotal: number;
  discounts: number;
  credit: number;
  grand_total: number;

  notes: string | null;
}

export async function generateInvoiceData(orderId: string): Promise<InvoiceData> {
  const [orderResult, itemsResult, companySettings] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_date,
        requested_delivery_date,
        scheduled_delivery_date,
        delivery_notes,
        internal_notes,
        total_amount,
        customers:customer_id (
          name,
          license_name,
          license_number,
          ato_number,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          address,
          city,
          state,
          postal_code,
          account_credit_balance
        )
      `)
      .eq('id', orderId)
      .single(),

    supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        notes,
        batch_id,
        products:product_id (
          name,
          strain,
          pricing_unit,
          product_category,
          type
        )
      `)
      .eq('order_id', orderId),

    getCompanySettings()
  ]);

  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const order = orderResult.data;
  const items = itemsResult.data || [];
  const customer = order.customers;

  // Fetch batch and COA information for items that have batch_id
  const batchIds = Array.from(new Set(
    items.map(item => item.batch_id).filter(Boolean)
  ));

  const batchMap = new Map<string, any>();
  const coaByBatchMap = new Map<string, any>();
  if (batchIds.length > 0) {
    const [batchResult, coaResult] = await Promise.all([
      supabase
        .from('batch_registry')
        .select('id, batch_number, strain, harvest_date')
        .in('id', batchIds),
      supabase
        .from('certificates_of_analysis')
        .select('batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date')
        .in('batch_id', batchIds)
        .eq('is_active', true)
    ]);

    batchResult.data?.forEach(batch => {
      batchMap.set(batch.id, batch);
    });
    coaResult.data?.forEach(coa => {
      if (coa.batch_id) coaByBatchMap.set(coa.batch_id, coa);
    });
  }

  const assignmentsResult = await supabase
    .from('package_assignments')
    .select(`
      order_item_id,
      package_id,
      quantity_assigned,
      status
    `)
    .eq('order_id', orderId)
    .in('status', ['reserved', 'fulfilled']);

  const assignmentsMap = new Map<string, any[]>();
  assignmentsResult.data?.forEach(pa => {
    const existing = assignmentsMap.get(pa.order_item_id) || [];
    assignmentsMap.set(pa.order_item_id, [...existing, pa]);
  });

  const assignedPackageIds = Array.from(new Set(
    assignmentsResult.data?.map(a => a.package_id) || []
  ));

  let inventoryMap = new Map<string, any>();
  if (assignedPackageIds.length > 0) {
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('id, package_id, batch, batch_number, sku, net_weight, thc_percentage, strain, batch_id')
      .in('package_id', assignedPackageIds);

    inventoryData?.forEach(inv => {
      inventoryMap.set(inv.package_id, inv);
    });

    const invBatchIds = Array.from(new Set(
      (inventoryData || []).map(inv => inv.batch_id).filter(Boolean)
    )).filter(bid => !batchMap.has(bid));

    if (invBatchIds.length > 0) {
      const { data: extraBatches } = await supabase
        .from('batch_registry')
        .select('id, batch_number, strain, harvest_date')
        .in('id', invBatchIds);

      extraBatches?.forEach(batch => {
        batchMap.set(batch.id, batch);
      });

      const { data: extraCoas } = await supabase
        .from('certificates_of_analysis')
        .select('batch_id, thc_percentage, cbd_percentage, total_cannabinoids_percentage, harvest_date')
        .in('batch_id', invBatchIds)
        .eq('is_active', true);

      extraCoas?.forEach(coa => {
        if (coa.batch_id && !coaByBatchMap.has(coa.batch_id)) {
          coaByBatchMap.set(coa.batch_id, coa);
        }
      });
    }
  }

  const strainNames = Array.from(new Set(items.map(item => item.products?.strain).filter(Boolean)));
  const strainMetadataMap = new Map<string, any>();
  if (strainNames.length > 0) {
    const { data: strainData } = await supabase
      .from('strains')
      .select('name, dominance_type, genetics_description')
      .in('name', strainNames);

    strainData?.forEach(strain => {
      strainMetadataMap.set(strain.name, {
        name: strain.name,
        type: strain.dominance_type,
        genetics: strain.genetics_description
      });
    });
  }

  const lineItems: InvoiceLineItem[] = await Promise.all(items.map(async item => {
    const product = item.products;
    const assignments = assignmentsMap.get(item.id) || [];

    let packageId = null;
    let batchNumber = null;
    let thcPercentage = null;
    let harvestDate: string | null = null;

    if (item.batch_id) {
      const batch = batchMap.get(item.batch_id);
      if (batch) {
        batchNumber = batch.batch_number;
        harvestDate = batch.harvest_date || null;
      }
      const coa = coaByBatchMap.get(item.batch_id);
      if (coa) {
        thcPercentage = coa.thc_percentage;
        if (!harvestDate && coa.harvest_date) {
          harvestDate = coa.harvest_date;
        }
      }
    }

    if (assignments.length > 0) {
      const firstAssignment = assignments[0];
      const inventory = inventoryMap.get(firstAssignment.package_id);
      if (inventory) {
        packageId = inventory.package_id;
        if (!batchNumber) {
          batchNumber = inventory.batch_number || inventory.batch;
        }
        if (!thcPercentage) {
          thcPercentage = inventory.thc_percentage;
        }
        if (inventory.batch_id) {
          const invBatch = batchMap.get(inventory.batch_id);
          if (invBatch && !harvestDate) {
            harvestDate = invBatch.harvest_date || null;
          }
          const invCoa = coaByBatchMap.get(inventory.batch_id);
          if (invCoa) {
            if (!harvestDate && invCoa.harvest_date) {
              harvestDate = invCoa.harvest_date;
            }
            if (!thcPercentage && invCoa.thc_percentage) {
              thcPercentage = invCoa.thc_percentage;
            }
          }
        }
      }
    }

    const strainName = product?.strain;
    const strainMetadata = strainName ? strainMetadataMap.get(strainName) : null;

    const discount = item.discount_amount || 0;
    const total = item.subtotal - discount;

    return {
      id: item.id,
      product_name: product?.name || 'Unknown Product',
      package_id: packageId,
      batch_number: batchNumber,
      quantity: item.quantity,
      unit: product?.pricing_unit || 'unit',
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      discount,
      total,
      strain: strainName || null,
      product_category: product?.product_category || 'packaged',
      strain_dominance: strainMetadata?.type || null,
      strain_lineage: strainMetadata?.genetics || null,
      thc_percentage: thcPercentage,
      harvest_date: harvestDate
    };
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discounts = lineItems.reduce((sum, item) => sum + item.discount, 0);
  const credit = customer?.account_credit_balance || 0;
  const grandTotal = subtotal - discounts - credit;

  const invoiceNumber = order.order_number.replace('ORD-', 'INV-');
  const invoiceId = order.order_number.split('-').pop() || '';

  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;

  const customerLicense = customer?.license_number || customer?.ato_number || null;

  const deliveryAddress = customer?.delivery_address || customer?.address || null;
  const deliveryCity = customer?.delivery_city || customer?.city || null;
  const deliveryState = customer?.delivery_state || customer?.state || null;
  const deliveryPostalCode = customer?.delivery_postal_code || customer?.postal_code || null;

  return {
    invoice_number: invoiceNumber,
    invoice_id: invoiceId,
    order_number: order.order_number,
    order_date: order.order_date,
    estimated_delivery_date: deliveryDate,

    company_brand_name: companySettings.company_brand_name || DEFAULT_BRAND_NAME,
    company_entity_name: companySettings.company_entity_name || DEFAULT_ENTITY_NAME,
    company_name: companySettings.company_name || DEFAULT_COMPANY_NAME,
    company_license_name: companySettings.company_license_name || DEFAULT_LICENSE_NAME,
    company_address: companySettings.company_address || DEFAULT_COMPANY_ADDRESS,
    company_city: companySettings.company_city || DEFAULT_COMPANY_CITY,
    company_state: companySettings.company_state || DEFAULT_COMPANY_STATE,
    company_postal_code: companySettings.company_postal_code || DEFAULT_COMPANY_POSTAL_CODE,
    company_license_number: companySettings.company_license_number || DEFAULT_LICENSE_NUMBER,
    company_logo_path: companySettings.logo_invoice_url || companySettings.logo_dark_url || '',

    customer_name: customer?.name || 'Unknown Customer',
    customer_license_name: customer?.license_name || null,
    customer_license_number: customerLicense,
    customer_delivery_address: deliveryAddress,
    customer_delivery_city: deliveryCity,
    customer_delivery_state: deliveryState,
    customer_delivery_postal_code: deliveryPostalCode,

    line_items: lineItems,

    subtotal,
    discounts,
    credit,
    grand_total: grandTotal,

    notes: order.internal_notes
  };
}

/**
 * Get all invoices with customer and order details
 */
export async function getAllInvoices() {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers:customer_id (name),
        orders:order_id (order_number)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const invoicesWithDetails = (data || []).map(inv => ({
      ...inv,
      customer_name: inv.customers?.name,
      order_number: inv.orders?.order_number
    }));

    return { data: invoicesWithDetails, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get pending invoices (orders without invoices)
 */
export async function getPendingInvoices() {
  try {
    const { data, error } = await supabase
      .from('pending_invoices')
      .select('*')
      .eq('has_invoice', false);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Create an invoice from an order
 */
export async function createInvoiceFromOrder(orderId: string, customerId: string, orderNumber: string) {
  try {
    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products:product_id (name, type, strain)
      `)
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    const lineItems = (orderItems || []).map(item => ({
      product_name: item.products?.name || 'Unknown',
      product_type: item.products?.type,
      strain: item.products?.strain,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxRate = 0.0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Generate invoice number
    const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
    const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`;

    // Insert invoice
    const { error: insertError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate.toISOString().split('T')[0],
        payment_terms: 'Net 30',
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'draft',
        notes: `Auto-generated for order ${orderNumber}`
      });

    if (insertError) throw insertError;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
