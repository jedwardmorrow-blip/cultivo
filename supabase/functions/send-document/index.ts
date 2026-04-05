import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1";
import nodemailer from "npm:nodemailer@6";

// ---------------------------------------------------------------------------
// Constants / types
// ---------------------------------------------------------------------------

type DocumentType = "invoice" | "coa" | "manifest";

interface SendDocumentRequest {
  order_id: string;
  document_type: DocumentType;
  recipient_override?: string;
  dry_run?: boolean;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Role-to-contact mapping
const DOC_ROLE: Record<DocumentType, string> = {
  invoice: "AP",
  coa: "Compliance",
  manifest: "Compliance",
};

// ---------------------------------------------------------------------------
// Email transport (Gmail SMTP)
// ---------------------------------------------------------------------------

function createTransport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: Deno.env.get("GMAIL_USER"),
      pass: Deno.env.get("GMAIL_APP_PASSWORD"),
    },
  });
}

// ---------------------------------------------------------------------------
// Invoice PDF builder (pdf-lib)
// ---------------------------------------------------------------------------

interface InvoiceRow {
  order_number: string;
  invoice_number: string;
  order_date: string;
  estimated_delivery_date: string | null;
  customer_name: string;
  customer_license_number: string | null;
  customer_delivery_address: string | null;
  company_name: string;
  company_license_number: string;
  company_address: string;
  line_items: Array<{
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    subtotal: number;
    discount: number;
    total: number;
    thc_percentage: number | null;
  }>;
  subtotal: number;
  discounts: number;
  grand_total: number;
  notes: string | null;
}

async function buildInvoicePdfData(
  db: ReturnType<typeof createClient>,
  orderId: string
): Promise<InvoiceRow> {
  const [orderRes, itemsRes] = await Promise.all([
    db
      .from("orders")
      .select(`
        order_number,
        order_date,
        requested_delivery_date,
        scheduled_delivery_date,
        internal_notes,
        customers:customer_id (
          name,
          license_number,
          ato_number,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_postal_code
        )
      `)
      .eq("id", orderId)
      .single(),
    db
      .from("order_items")
      .select(`
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        batch_id,
        products:product_id (name, pricing_unit)
      `)
      .eq("order_id", orderId),
  ]);

  if (orderRes.error) throw new Error(`Order fetch failed: ${orderRes.error.message}`);
  if (itemsRes.error) throw new Error(`Items fetch failed: ${itemsRes.error.message}`);

  const order = orderRes.data as any;
  const items = (itemsRes.data as any[]) || [];
  const customer = order.customers as any;

  // Fetch COA THC data for line items with batch_ids
  const batchIds = [...new Set(items.map((i: any) => i.batch_id).filter(Boolean))] as string[];
  const coaThcMap = new Map<string, number>();
  if (batchIds.length > 0) {
    const { data: coas } = await db
      .from("certificates_of_analysis")
      .select("batch_id, thc_percentage")
      .in("batch_id", batchIds)
      .eq("is_active", true);
    (coas || []).forEach((c: any) => {
      if (c.batch_id && c.thc_percentage != null) {
        coaThcMap.set(c.batch_id, c.thc_percentage);
      }
    });
  }

  const lineItems = items.map((item: any) => {
    const discount = item.discount_amount || 0;
    return {
      product_name: item.products?.name || "Unknown Product",
      quantity: item.quantity,
      unit: item.products?.pricing_unit || "unit",
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      discount,
      total: item.subtotal - discount,
      thc_percentage: item.batch_id ? (coaThcMap.get(item.batch_id) ?? null) : null,
    };
  });

  const subtotal = lineItems.reduce((s: number, i: any) => s + i.subtotal, 0);
  const discounts = lineItems.reduce((s: number, i: any) => s + i.discount, 0);
  const grandTotal = subtotal - discounts;
  const invoiceNumber = order.order_number.replace("ORD-", "INV-");

  const deliveryAddr = customer?.delivery_address
    ? [
        customer.delivery_address,
        [customer.delivery_city, customer.delivery_state, customer.delivery_postal_code]
          .filter(Boolean)
          .join(", "),
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    order_number: order.order_number,
    invoice_number: invoiceNumber,
    order_date: order.order_date,
    estimated_delivery_date: order.scheduled_delivery_date || order.requested_delivery_date || null,
    customer_name: customer?.name || "Unknown Customer",
    customer_license_number: customer?.license_number || customer?.ato_number || null,
    customer_delivery_address: deliveryAddr,
    company_name: "Cult Cannabis Co.",
    company_license_number: Deno.env.get("COMPANY_LICENSE_NUMBER") || "CCL24-0000000",
    company_address: Deno.env.get("COMPANY_ADDRESS") || "123 Cult St, Los Angeles, CA 90001",
    line_items: lineItems,
    subtotal,
    discounts,
    grand_total: grandTotal,
    notes: order.internal_notes || null,
  };
}

async function generateInvoicePdf(inv: InvoiceRow): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.85, 0.85, 0.85);

  let y = height - 50;
  const left = 50;
  const right = width - 50;

  // Header
  page.drawText("CULT Cannabis Co.", { x: left, y, font: fontBold, size: 18, color: black });
  page.drawText("INVOICE", { x: right - 80, y, font: fontBold, size: 18, color: black });

  y -= 18;
  page.drawText(inv.company_address, { x: left, y, font: fontReg, size: 9, color: gray });
  page.drawText(`Lic# ${inv.company_license_number}`, { x: right - 120, y, font: fontReg, size: 9, color: gray });

  y -= 24;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: black });

  // Invoice meta
  y -= 18;
  page.drawText(`Invoice Number:`, { x: left, y, font: fontBold, size: 9, color: gray });
  page.drawText(inv.invoice_number, { x: left + 100, y, font: fontReg, size: 9, color: black });
  page.drawText(`Order:`, { x: 320, y, font: fontBold, size: 9, color: gray });
  page.drawText(inv.order_number, { x: 360, y, font: fontReg, size: 9, color: black });

  y -= 14;
  page.drawText(`Invoice Date:`, { x: left, y, font: fontBold, size: 9, color: gray });
  page.drawText(inv.order_date, { x: left + 100, y, font: fontReg, size: 9, color: black });
  if (inv.estimated_delivery_date) {
    page.drawText(`Est. Delivery:`, { x: 320, y, font: fontBold, size: 9, color: gray });
    page.drawText(inv.estimated_delivery_date, { x: 360, y, font: fontReg, size: 9, color: black });
  }

  // Bill To
  y -= 24;
  page.drawText("Bill To:", { x: left, y, font: fontBold, size: 9, color: gray });
  y -= 14;
  page.drawText(inv.customer_name, { x: left, y, font: fontBold, size: 10, color: black });
  if (inv.customer_license_number) {
    y -= 13;
    page.drawText(`License: ${inv.customer_license_number}`, { x: left, y, font: fontReg, size: 9, color: gray });
  }
  if (inv.customer_delivery_address) {
    y -= 13;
    page.drawText(inv.customer_delivery_address, { x: left, y, font: fontReg, size: 9, color: gray });
  }

  // Line items table header
  y -= 28;
  page.drawRectangle({ x: left, y, width: right - left, height: 16, color: lightGray });
  const cols = { product: left + 4, qty: 320, unit: 360, price: 400, thc: 450, total: right - 50 };
  y += 4;
  page.drawText("Product", { x: cols.product, y, font: fontBold, size: 8, color: black });
  page.drawText("Qty", { x: cols.qty, y, font: fontBold, size: 8, color: black });
  page.drawText("Unit", { x: cols.unit, y, font: fontBold, size: 8, color: black });
  page.drawText("Price", { x: cols.price, y, font: fontBold, size: 8, color: black });
  page.drawText("THC%", { x: cols.thc, y, font: fontBold, size: 8, color: black });
  page.drawText("Total", { x: cols.total, y, font: fontBold, size: 8, color: black });

  y -= 20;
  for (const item of inv.line_items) {
    if (y < 120) {
      // Would need a new page — keep simple for now
      break;
    }
    const name = item.product_name.length > 45 ? item.product_name.slice(0, 42) + "..." : item.product_name;
    page.drawText(name, { x: cols.product, y, font: fontReg, size: 8, color: black });
    page.drawText(String(item.quantity), { x: cols.qty, y, font: fontReg, size: 8, color: black });
    page.drawText(item.unit, { x: cols.unit, y, font: fontReg, size: 8, color: black });
    page.drawText(`$${item.unit_price.toFixed(2)}`, { x: cols.price, y, font: fontReg, size: 8, color: black });
    page.drawText(item.thc_percentage != null ? `${item.thc_percentage.toFixed(1)}%` : "—", {
      x: cols.thc, y, font: fontReg, size: 8, color: black,
    });
    page.drawText(`$${item.total.toFixed(2)}`, { x: cols.total, y, font: fontReg, size: 8, color: black });

    if (item.discount > 0) {
      y -= 11;
      page.drawText(`  Discount: -$${item.discount.toFixed(2)}`, { x: cols.product, y, font: fontReg, size: 7, color: gray });
    }
    y -= 14;

    // Row separator
    page.drawLine({ start: { x: left, y: y + 2 }, end: { x: right, y: y + 2 }, thickness: 0.25, color: lightGray });
  }

  // Totals
  y -= 8;
  page.drawLine({ start: { x: 350, y }, end: { x: right, y }, thickness: 0.75, color: black });
  y -= 14;
  page.drawText("Subtotal:", { x: 350, y, font: fontBold, size: 9, color: black });
  page.drawText(`$${inv.subtotal.toFixed(2)}`, { x: right - 60, y, font: fontReg, size: 9, color: black });

  if (inv.discounts > 0) {
    y -= 13;
    page.drawText("Discounts:", { x: 350, y, font: fontBold, size: 9, color: black });
    page.drawText(`-$${inv.discounts.toFixed(2)}`, { x: right - 60, y, font: fontReg, size: 9, color: black });
  }

  y -= 13;
  page.drawText("Total:", { x: 350, y, font: fontBold, size: 11, color: black });
  page.drawText(`$${inv.grand_total.toFixed(2)}`, { x: right - 70, y, font: fontBold, size: 11, color: black });

  if (inv.notes) {
    y -= 28;
    page.drawText("Notes:", { x: left, y, font: fontBold, size: 9, color: gray });
    y -= 13;
    // Wrap notes at ~100 chars
    const words = inv.notes.split(" ");
    let line = "";
    for (const word of words) {
      if ((line + word).length > 100) {
        page.drawText(line.trim(), { x: left, y, font: fontReg, size: 8, color: gray });
        y -= 11;
        line = word + " ";
      } else {
        line += word + " ";
      }
    }
    if (line.trim()) {
      page.drawText(line.trim(), { x: left, y, font: fontReg, size: 8, color: gray });
    }
  }

  return doc.save();
}

// ---------------------------------------------------------------------------
// Recipient resolution
// ---------------------------------------------------------------------------

async function resolveRecipient(
  db: ReturnType<typeof createClient>,
  orderId: string,
  docType: DocumentType,
  recipientOverride?: string
): Promise<{ email: string; name: string; customerId: string; orderNumber: string }> {
  if (recipientOverride) {
    // Still need orderNumber and customerId for logging
    const { data: order } = await db.from("orders").select("order_number, customer_id").eq("id", orderId).single();
    return { email: recipientOverride, name: "Test Recipient", customerId: (order as any)?.customer_id, orderNumber: (order as any)?.order_number };
  }

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("order_number, customer_id, customers:customer_id(name, email)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error(`Order not found: ${orderId}`);

  const o = order as any;
  const role = DOC_ROLE[docType];

  // Try customer_contacts first
  const { data: contacts } = await db
    .from("customer_contacts")
    .select("name, email, role, title, is_primary")
    .eq("customer_id", o.customer_id);

  const contactList = (contacts || []) as any[];
  // Match by role column (post-CUL-361), then by title as fallback
  const match =
    contactList.find((c: any) => c.role === role) ||
    contactList.find((c: any) => c.title === role) ||
    contactList.find((c: any) => c.is_primary);

  if (match?.email) {
    return { email: match.email, name: match.name || role, customerId: o.customer_id, orderNumber: o.order_number };
  }

  // Fallback to customers.email
  const fallbackEmail = o.customers?.email;
  if (!fallbackEmail) throw new Error(`No email found for customer ${o.customer_id}`);
  return { email: fallbackEmail, name: o.customers?.name || "Customer", customerId: o.customer_id, orderNumber: o.order_number };
}

// ---------------------------------------------------------------------------
// COA attachment fetcher
// ---------------------------------------------------------------------------

interface CoaRecord {
  id: string;
  batch_id: string;
  pdf_file_path: string | null;
  strain: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
}

async function fetchCoaAttachments(
  db: ReturnType<typeof createClient>,
  orderId: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<Array<{ filename: string; content: Uint8Array }>> {
  // Find batches linked to this order's items
  const { data: items } = await db
    .from("order_items")
    .select("batch_id")
    .eq("order_id", orderId)
    .not("batch_id", "is", null);

  const batchIds = [...new Set((items || []).map((i: any) => i.batch_id))] as string[];
  if (batchIds.length === 0) return [];

  const { data: coas, error } = await db
    .from("certificates_of_analysis")
    .select("id, batch_id, pdf_file_path, strain, thc_percentage, cbd_percentage")
    .in("batch_id", batchIds)
    .eq("is_active", true)
    .not("pdf_file_path", "is", null);

  if (error || !coas?.length) return [];

  const attachments: Array<{ filename: string; content: Uint8Array }> = [];

  for (const coa of coas as CoaRecord[]) {
    if (!coa.pdf_file_path) continue;
    try {
      const storageUrl = `${supabaseUrl}/storage/v1/object/authenticated/coa-pdfs/${coa.pdf_file_path}`;
      const res = await fetch(storageUrl, {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const strainLabel = coa.strain ? coa.strain.replace(/\s+/g, "_") : coa.batch_id.slice(0, 8);
      attachments.push({ filename: `COA_${strainLabel}.pdf`, content: bytes });
    } catch {
      // Skip failed attachments
    }
  }

  return attachments;
}

// ---------------------------------------------------------------------------
// Log to email_send_log
// ---------------------------------------------------------------------------

async function logSend(
  db: ReturnType<typeof createClient>,
  params: {
    orderId: string;
    orderNumber: string;
    emailTo: string;
    emailFrom: string;
    subject: string;
    documentType: DocumentType;
    status: "sent" | "failed" | "pending" | "dry_run";
    errorMessage?: string;
  }
) {
  await db.from("email_send_log").insert({
    order_id: params.orderId,
    order_number: params.orderNumber,
    email_from: params.emailFrom,
    email_to: params.emailTo,
    subject: params.subject,
    sent_at: new Date().toISOString(),
    status: params.status,
    error_message: params.errorMessage ?? null,
    document_type: params.documentType,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const gmailUser = Deno.env.get("GMAIL_USER")!;

  const db = createClient(supabaseUrl, serviceKey);

  let body: SendDocumentRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { order_id, document_type, recipient_override, dry_run = false } = body;

  if (!order_id || !document_type) {
    return new Response(JSON.stringify({ error: "order_id and document_type are required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!["invoice", "coa", "manifest"].includes(document_type)) {
    return new Response(JSON.stringify({ error: "document_type must be invoice, coa, or manifest" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // --- manifest: stub only ---
    if (document_type === "manifest") {
      const { data: order } = await db.from("orders").select("order_number, customer_id").eq("id", order_id).single();
      const o = order as any;
      await logSend(db, {
        orderId: order_id,
        orderNumber: o?.order_number || order_id,
        emailTo: "",
        emailFrom: gmailUser,
        subject: `Manifest for Order ${o?.order_number}`,
        documentType: "manifest",
        status: "pending",
      });
      return new Response(
        JSON.stringify({ stub: true, pending: "trip-plan-integration" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Resolve recipient
    const recipient = await resolveRecipient(db, order_id, document_type, recipient_override);

    // Build subject
    const subjectMap: Record<DocumentType, string> = {
      invoice: `Cult Cannabis Co. — Invoice #${recipient.orderNumber.replace("ORD-", "INV-")} | Order #${recipient.orderNumber}`,
      coa: `Cult Cannabis Co. — Certificates of Analysis | Order #${recipient.orderNumber}`,
      manifest: `Manifest for Order #${recipient.orderNumber}`,
    };
    const subject = subjectMap[document_type];

    // Build attachments + body
    let mailOptions: any;

    if (document_type === "invoice") {
      const invData = await buildInvoicePdfData(db, order_id);
      const pdfBytes = await generateInvoicePdf(invData);

      const htmlBody = `
        <p>Dear ${recipient.name},</p>
        <p>Please find attached the invoice for your recent order.</p>
        <table style="font-family:sans-serif;font-size:13px;border-collapse:collapse;margin:16px 0">
          <tr><td style="color:#666;padding:4px 12px 4px 0">Invoice #</td><td><strong>${invData.invoice_number}</strong></td></tr>
          <tr><td style="color:#666;padding:4px 12px 4px 0">Order #</td><td>${invData.order_number}</td></tr>
          <tr><td style="color:#666;padding:4px 12px 4px 0">Total</td><td><strong>$${invData.grand_total.toFixed(2)}</strong></td></tr>
          ${invData.estimated_delivery_date ? `<tr><td style="color:#666;padding:4px 12px 4px 0">Est. Delivery</td><td>${invData.estimated_delivery_date}</td></tr>` : ""}
        </table>
        <p>Please remit payment within 30 days. If you have questions, reply to this email.</p>
        <p>—<br>Cult Cannabis Co.</p>
      `;

      mailOptions = {
        from: gmailUser,
        to: recipient.email,
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: `${invData.invoice_number}.pdf`,
            content: Buffer.from(pdfBytes),
            contentType: "application/pdf",
          },
        ],
      };
    } else {
      // coa
      const coaAttachments = await fetchCoaAttachments(db, order_id, supabaseUrl, serviceKey);

      // Fetch COA summary for email body
      const { data: items } = await db
        .from("order_items")
        .select("batch_id, products:product_id(name, strain)")
        .eq("order_id", order_id)
        .not("batch_id", "is", null);

      const batchIds = [...new Set((items || []).map((i: any) => i.batch_id))];
      let coaSummaryRows = "";
      if (batchIds.length > 0) {
        const { data: coas } = await db
          .from("certificates_of_analysis")
          .select("batch_id, strain, thc_percentage, cbd_percentage")
          .in("batch_id", batchIds)
          .eq("is_active", true);

        for (const c of (coas || []) as any[]) {
          coaSummaryRows += `<tr>
            <td style="padding:4px 12px 4px 0;color:#333">${c.strain || "—"}</td>
            <td style="padding:4px 12px 4px 0">${c.thc_percentage != null ? c.thc_percentage.toFixed(1) + "%" : "—"}</td>
            <td style="padding:4px 12px 4px 0">${c.cbd_percentage != null ? c.cbd_percentage.toFixed(1) + "%" : "—"}</td>
          </tr>`;
        }
      }

      const htmlBody = `
        <p>Dear ${recipient.name},</p>
        <p>Please find attached the Certificates of Analysis for Order #${recipient.orderNumber}.</p>
        ${coaSummaryRows ? `
        <table style="font-family:sans-serif;font-size:13px;border-collapse:collapse;margin:16px 0">
          <thead><tr>
            <th style="text-align:left;color:#666;padding:4px 12px 4px 0">Strain</th>
            <th style="text-align:left;color:#666;padding:4px 12px 4px 0">THC%</th>
            <th style="text-align:left;color:#666;padding:4px 12px 4px 0">CBD%</th>
          </tr></thead>
          <tbody>${coaSummaryRows}</tbody>
        </table>` : ""}
        <p>—<br>Cult Cannabis Co.</p>
      `;

      mailOptions = {
        from: gmailUser,
        to: recipient.email,
        subject,
        html: htmlBody,
        attachments: coaAttachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content),
          contentType: "application/pdf",
        })),
      };
    }

    // Dry run — return metadata without sending
    if (dry_run) {
      await logSend(db, {
        orderId: order_id,
        orderNumber: recipient.orderNumber,
        emailTo: recipient.email,
        emailFrom: gmailUser,
        subject,
        documentType: document_type,
        status: "dry_run",
      });
      return new Response(
        JSON.stringify({
          dry_run: true,
          to: recipient.email,
          subject,
          attachmentCount: mailOptions.attachments?.length ?? 0,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Send
    const transport = createTransport();
    await transport.sendMail(mailOptions);

    await logSend(db, {
      orderId: order_id,
      orderNumber: recipient.orderNumber,
      emailTo: recipient.email,
      emailFrom: gmailUser,
      subject,
      documentType: document_type,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, to: recipient.email, subject }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-document] error:", err);

    // Try to log failure (best-effort)
    try {
      const { data: order } = await db.from("orders").select("order_number").eq("id", order_id).single();
      await logSend(db, {
        orderId: order_id,
        orderNumber: (order as any)?.order_number || order_id,
        emailTo: "",
        emailFrom: gmailUser,
        subject: `[FAILED] ${document_type} for ${order_id}`,
        documentType: document_type,
        status: "failed",
        errorMessage: err?.message || String(err),
      });
    } catch {
      // ignore logging errors
    }

    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
