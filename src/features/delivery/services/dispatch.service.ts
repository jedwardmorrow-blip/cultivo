/**
 * Dispatch Service — Document Dispatch Queue
 *
 * Reads active orders, checks email_send_log for per-document send status,
 * and provides a sendDocument stub that logs to email_send_log.
 *
 * NOTE: This service awaits CUL-361 (DBA) for:
 *   - email_send_log.document_type column
 *   - customer_communication_preferences table (invoice_lead_time_hours)
 *   - customer_contacts.role column
 *
 * Until those land the service uses safe fallbacks:
 *   - document_type inferred from email subject keyword match
 *   - invoice_lead_time_hours defaults to DEFAULT_LEAD_TIME_HOURS = 24
 *   - role falls back to contact.title
 */

import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

export type DocumentType = 'invoice' | 'coa' | 'manifest';

export const DEFAULT_LEAD_TIME_HOURS = 24;

export interface DispatchOrderRow {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  /** Delivery date in YYYY-MM-DD format */
  delivery_date: string | null;
  /** Invoice lead-time in hours (from customer_communication_preferences, or default) */
  invoice_lead_time_hours: number;
  total_amount: number;
  status: string;
  /** Most recent send record per document type */
  invoice_send: SendRecord | null;
  coa_send: SendRecord | null;
  manifest_send: SendRecord | null;
}

export interface SendRecord {
  id: string;
  sent_at: string;
  status: string;
  email_to: string;
}

export interface DocStatusPill {
  type: DocumentType;
  label: string;
  /** 'sent' | 'overdue' | 'due_soon' | 'pending' */
  state: 'sent' | 'overdue' | 'due_soon' | 'pending';
  sentAt: string | null;
  /** Minutes remaining until deadline (negative = overdue) */
  minutesUntilDeadline: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Infer document_type from subject line (fallback for pre-CUL-361 rows) */
function inferDocType(subject: string): DocumentType | null {
  const lower = subject.toLowerCase();
  if (lower.includes('invoice')) return 'invoice';
  if (lower.includes('coa') || lower.includes('certificate')) return 'coa';
  if (lower.includes('manifest')) return 'manifest';
  return null;
}

/**
 * Compute deadline state for a document.
 * @param deliveryDate  YYYY-MM-DD string
 * @param leadTimeHours hours before delivery the document must be sent
 * @param sendRecord    most recent send record or null
 */
export function computeDocStatus(
  type: DocumentType,
  label: string,
  deliveryDate: string | null,
  leadTimeHours: number,
  sendRecord: SendRecord | null,
): DocStatusPill {
  if (sendRecord && sendRecord.status === 'sent') {
    return { type, label, state: 'sent', sentAt: sendRecord.sent_at, minutesUntilDeadline: null };
  }

  if (!deliveryDate) {
    return { type, label, state: 'pending', sentAt: null, minutesUntilDeadline: null };
  }

  const deliveryMs = new Date(deliveryDate + 'T00:00:00').getTime();
  const deadlineMs = deliveryMs - leadTimeHours * 60 * 60 * 1000;
  const nowMs = Date.now();
  const minutesUntilDeadline = Math.round((deadlineMs - nowMs) / (60 * 1000));

  if (minutesUntilDeadline < 0) {
    return { type, label, state: 'overdue', sentAt: null, minutesUntilDeadline };
  }
  if (minutesUntilDeadline < 4 * 60) {
    return { type, label, state: 'due_soon', sentAt: null, minutesUntilDeadline };
  }
  return { type, label, state: 'pending', sentAt: null, minutesUntilDeadline };
}

/** Returns true if any of the three document pills are overdue */
export function hasOverdueDocs(row: DispatchOrderRow): boolean {
  const deliveryDate = row.delivery_date;
  if (!deliveryDate) return false;

  const pills: DocStatusPill[] = [
    computeDocStatus('invoice', 'Invoice', deliveryDate, row.invoice_lead_time_hours, row.invoice_send),
    computeDocStatus('coa', 'COA', deliveryDate, DEFAULT_LEAD_TIME_HOURS, row.coa_send),
    computeDocStatus('manifest', 'Manifest', deliveryDate, DEFAULT_LEAD_TIME_HOURS, row.manifest_send),
  ];
  return pills.some(p => p.state === 'overdue');
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = ['submitted', 'accepted', 'processing', 'ready_for_delivery', 'out_for_delivery'];

/**
 * Fetch all active orders with their per-document send status.
 */
export async function getDispatchQueue(): Promise<{ data: DispatchOrderRow[]; error: any }> {
  try {
    // 1. Fetch active orders with customer names + scheduled delivery date
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        requested_delivery_date,
        scheduled_delivery_date,
        total_amount,
        status,
        customers:customer_id (name)
      `)
      .in('status', ACTIVE_STATUSES)
      .eq('archived', false)
      .order('requested_delivery_date', { ascending: true, nullsFirst: false });

    if (ordersError) throw ordersError;
    if (!ordersData || ordersData.length === 0) return { data: [], error: null };

    const orderIds = ordersData.map(o => o.id);

    // 2. Fetch all email send logs for these orders
    //    After CUL-361: filter/group by document_type column.
    //    Until then: fetch all records and infer type from subject.
    const { data: sendLogs, error: logsError } = await supabase
      .from('email_send_log')
      .select('id, order_id, subject, sent_at, status, email_to')
      .in('order_id', orderIds)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });

    if (logsError) {
      // Non-fatal: show dispatch queue without send history
      console.warn('[dispatch] email_send_log query failed:', logsError.message);
    }

    // 3. Try to fetch customer communication preferences (CUL-361 adds this table)
    //    Gracefully degrade to DEFAULT_LEAD_TIME_HOURS if table doesn't exist.
    let leadTimeMap = new Map<string, number>();
    try {
      const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: prefs } = await (supabase as any)
          .from('customer_communication_preferences')
          .select('customer_id, invoice_lead_time_hours')
          .in('customer_id', customerIds);

        (prefs || []).forEach((p: any) => {
          if (p.invoice_lead_time_hours != null) {
            leadTimeMap.set(p.customer_id, Number(p.invoice_lead_time_hours));
          }
        });
      }
    } catch {
      // Table doesn't exist yet — use default
    }

    // 4. Build per-order send maps
    type SendMap = Map<string, Map<DocumentType, SendRecord>>;
    const sendByOrder: SendMap = new Map();

    for (const log of (sendLogs || [])) {
      if (!log.order_id) continue;
      // Try document_type column first (post-CUL-361), else infer from subject
      const docType: DocumentType | null =
        (log as any).document_type ?? inferDocType(log.subject ?? '');
      if (!docType) continue;

      if (!sendByOrder.has(log.order_id)) {
        sendByOrder.set(log.order_id, new Map());
      }
      const orderMap = sendByOrder.get(log.order_id)!;
      // Keep only the most recent (rows are ordered desc by sent_at)
      if (!orderMap.has(docType)) {
        orderMap.set(docType, {
          id: log.id,
          sent_at: log.sent_at,
          status: log.status,
          email_to: log.email_to,
        });
      }
    }

    // 5. Assemble output rows
    const rows: DispatchOrderRow[] = ordersData.map(order => {
      const customer = (order.customers as any);
      const deliveryDate =
        (order as any).scheduled_delivery_date || order.requested_delivery_date || null;
      const orderMap = sendByOrder.get(order.id);
      const leadTime = leadTimeMap.get(order.customer_id) ?? DEFAULT_LEAD_TIME_HOURS;

      return {
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: customer?.name || 'Unknown',
        delivery_date: deliveryDate,
        invoice_lead_time_hours: leadTime,
        total_amount: Number(order.total_amount),
        status: order.status,
        invoice_send: orderMap?.get('invoice') ?? null,
        coa_send: orderMap?.get('coa') ?? null,
        manifest_send: orderMap?.get('manifest') ?? null,
      };
    });

    return { data: rows, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load dispatch queue');
    return { data: [], error };
  }
}

/**
 * Send a document for an order via the `send-document` Edge Function.
 *
 * Handles recipient routing, PDF/attachment generation, Gmail SMTP delivery,
 * and email_send_log write — all inside the Edge Function.
 */
export async function sendDocument(
  orderId: string,
  _orderNumber: string,
  documentType: DocumentType,
): Promise<{ success: boolean; stub?: boolean; error: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-document', {
      body: { order_id: orderId, document_type: documentType },
    });

    if (error) throw error;

    return {
      success: true,
      stub: (data as any)?.stub === true,
      error: null,
    };
  } catch (error) {
    errorService.handle(error, `Failed to send ${documentType} for order ${orderId}`);
    return { success: false, error };
  }
}

/**
 * Fetch customer contacts for an account.
 * After CUL-361: includes `role` column (AP / Compliance / Purchasing / General).
 * Until then: falls back to `title` field.
 */
export async function getCustomerContacts(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, name, title, email, phone, is_primary, notes')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false });

    if (error) throw error;

    const contacts = (data || []).map((c: any) => ({
      ...c,
      // Post-CUL-361: use role column; pre-CUL-361: use title as role label
      role: (c.role as string | null) ?? c.title ?? null,
    }));

    return { data: contacts, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customer contacts');
    return { data: [], error };
  }
}
