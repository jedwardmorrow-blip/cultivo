# QA Validation: send-document Edge Function Refactoring

**Date**: 2026-04-04
**Scope**: sendDocument service refactoring (dispatch.service.ts) + new send-document Edge Function
**Build Status**: ✅ PASSING (npm run build)

---

## 1. Critical Issues (Data Loss Risk)

### 1.1 Invoice PDF Line Item Overflow (Lines 259-261)
**Severity**: HIGH
**Impact**: Multi-page invoices truncate line items without warning

**Finding**:
```typescript
if (y < 120) {
  // Would need a new page — keep simple for now
  break;
}
```

Invoice PDFs with >15 line items will **silently drop items** from the PDF without logging warning or error.

**Expected Behavior**: Either (a) create new page, (b) log error + return error, or (c) reject invoice if too large.

**Current Behavior**: Silently truncates.

**Data Risk**: Customer receives invoice missing products; could cause payment disputes.

**Recommendation**:
- IMMEDIATE: Add error logging + status='failed' for invoices exceeding line item limit
- FUTURE: Implement multi-page PDF support or reject at order entry time if line item count > threshold

---

### 1.2 COA PDF Fetch Errors Silently Skipped (Lines 425-427)
**Severity**: MEDIUM-HIGH
**Impact**: Missing compliance attachments not flagged

**Finding**:
```typescript
try {
  const bytes = new Uint8Array(await res.arrayBuffer());
  // ... push to attachments
} catch {
  // Skip failed attachments
}
```

If Supabase Storage fetch fails for COA PDF:
- Email sends WITHOUT the COA attachment
- Status logged as 'sent' (not 'partial' or 'failed')
- Compliance recipient has no proof of analysis

**Expected Behavior**: Log to email_send_log with status='sent_incomplete' if any COAs missing, or fail the entire send if COAs are required.

**Current Behavior**: Email sends with partial attachments; status='sent' (misleading).

**Recommendation**:
- Add `attachment_count` and `missing_attachment_count` to email_send_log
- Set status='sent_incomplete' if >0 missing attachments
- Alert user in response body if COAs missing

---

## 2. High Severity Issues (Wrong Behavior)

### 2.1 Missing Environment Variable Validation
**Severity**: HIGH
**Impact**: Crashes on missing GMAIL_USER or GMAIL_APP_PASSWORD

**Finding** (Lines 42-43, 481):
```typescript
auth: {
  user: Deno.env.get("GMAIL_USER"),        // undefined if not set
  pass: Deno.env.get("GMAIL_APP_PASSWORD"),  // undefined if not set
}
```

No null checks before using env vars. If not set:
- `createTransport()` creates malformed nodemailer config
- SMTP connection fails at send time (line 656)
- Caught as generic error (line 672)
- User sees "Internal server error" instead of "Gmail credentials missing"

**Expected Behavior**: Fail fast with clear error message at handler start.

**Current Behavior**: Fails at send time with generic error.

**Recommendation**: Add validation at handler start (after line 483):
```typescript
if (!gmailUser || !Deno.env.get("GMAIL_APP_PASSWORD")) {
  return new Response(JSON.stringify({ error: "Gmail credentials not configured" }), {
    status: 500, headers: CORS_HEADERS
  });
}
```

---

### 2.2 THC% Calculation Assumes Batch Link
**Severity**: MEDIUM
**Impact**: Invoice shows "—" for THC% on items without batch_id

**Finding** (Lines 150, 268):
```typescript
thc_percentage: item.batch_id ? (coaThcMap.get(item.batch_id) ?? null) : null,
// Later:
page.drawText(item.thc_percentage != null ? `${item.thc_percentage.toFixed(1)}%` : "—", ...);
```

Orders with items missing batch_id show "—" for THC%. This is **correct behavior for invoices** (product-level, not batch-level tracking), but:
- No warning if all items lack batch_id
- Compliance staff won't know why THC% missing
- Could indicate data entry gap

**Expected Behavior**: Either (a) document that invoice THC% requires batch_id, or (b) fetch THC from product master as fallback.

**Current Behavior**: Silent fallback to "—".

**Recommendation**:
- Add comment documenting this behavior
- Consider adding product-level THC fallback if batch_id missing
- Log warning to console if >50% of line items missing batch_id

---

### 2.3 No Recipient Validation in Dry-Run Mode
**Severity**: MEDIUM
**Impact**: Dry-run succeeds with invalid recipient_override

**Finding** (Lines 334-337):
```typescript
if (recipientOverride) {
  // Still need orderNumber and customerId for logging
  const { data: order } = await db.from("orders").select("order_number, customer_id").eq("id", order_id).single();
  return { email: recipientOverride, name: "Test Recipient", customerId: ..., orderNumber: ... };
}
```

`recipient_override` is accepted without validation (no format check, no verification it's a valid email).

**Expected Behavior**: Validate email format on override.

**Current Behavior**: Accepts any string as recipient email.

**Recommendation**: Add email format validation:
```typescript
if (recipientOverride) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientOverride)) {
    throw new Error(`Invalid email format: ${recipientOverride}`);
  }
  // ... proceed
}
```

---

## 3. Medium Severity Issues (Behavior/UX)

### 3.1 Invoice Subject Line Does Not Match Order Number Format
**Severity**: MEDIUM
**Impact**: Email subject format inconsistency

**Finding** (Line 536):
```typescript
invoice: `Cult Cannabis Co. — Invoice #${recipient.orderNumber.replace("ORD-", "INV-")} | Order #${recipient.orderNumber}`,
```

Subject shows both INV-XXXX and ORD-XXXX. Email parsing systems or humans searching for "INV-" may miss the "Order #" part.

**Expected Behavior**: Consistent format (either lead with INV or both formatted identically).

**Current Behavior**: Mixed format.

**Recommendation**: Simplify to:
```typescript
invoice: `Invoice #${recipient.orderNumber.replace("ORD-", "INV-")} | Cult Cannabis Co.`,
```

---

### 3.2 Address Formatting Does Not Handle Long Addresses
**Severity**: LOW
**Impact**: Address text truncation possible

**Finding** (Lines 241-242):
```typescript
if (inv.customer_delivery_address) {
  page.drawText(inv.customer_delivery_address, { x: left, y, font: fontReg, size: 9, color: gray });
}
```

No width constraint or truncation for customer address on invoice. Long addresses (e.g., "123 Very Long Street Name, City, State, 90210") may overflow PDF margin.

**Expected Behavior**: Wrap or truncate address text.

**Current Behavior**: Text may overflow page boundary.

**Recommendation**: Add address wrapping logic similar to notes wrapping (lines 305-318).

---

### 3.3 COA Summary Table De-duplication
**Severity**: MEDIUM
**Impact**: Duplicate strain rows in email if multiple batches with same strain

**Finding** (Lines 589-601):
```typescript
for (const c of (coas || []) as any[]) {
  coaSummaryRows += `<tr>
    <td style="padding:4px 12px 4px 0;color:#333">${c.strain || "—"}</td>
    // ...
  </tr>`;
}
```

If order includes two batches of "Wedding Cake", email shows two "Wedding Cake" rows with identical THC/CBD values.

**Expected Behavior**: Either (a) de-duplicate by batch_id, or (b) acknowledge multiple batches of same strain.

**Current Behavior**: Shows all rows without de-dup.

**Recommendation**: Add batch_id to table for clarity:
```typescript
<tr>
  <td>Wedding Cake <small>(Batch: ${c.batch_id})</small></td>
  ...
</tr>
```

---

## 4. Low Severity / Future Work

### 4.1 No Attachment Size Limits
- No validation that total attachment size < Gmail limit (25MB)
- Multiple large COA PDFs could exceed limit
- **Recommendation**: Validate total attachment size, return error if exceeded

### 4.2 METRC Credential Handling Not Tested
- Edge Function uses SUPABASE_SERVICE_ROLE_KEY to create client
- Different from other functions (metrc-sync) which retrieve keys from Vault
- **Recommendation**: Document credential model; verify Vault-based approach is intended

### 4.3 No Rate Limiting
- Client can spam `sendDocument()` calls
- No throttle or queue
- **Recommendation**: Add rate limiting on Edge Function (1 per order per minute)

---

## 5. Test Plan Summary

| Category | Test | Status | Notes |
|----------|------|--------|-------|
| **Invoice PDF** | Generate PDF for 5-item order | ⏳ BLOCKED | Line item overflow issue must be fixed first |
| **Invoice PDF** | Validate math (subtotal, discount, total) | ⏳ TODO | |
| **Invoice PDF** | Test with null batch_id | ⏳ TODO | Should render "—" for THC% |
| **Recipient** | Role-based routing (AP for invoice) | ⏳ TODO | Verify customer_contacts.role matching |
| **Recipient** | Fallback to primary contact | ⏳ TODO | When no role match found |
| **COA** | Fetch COAs for order with 3 batches | ⏳ TODO | Verify all PDFs attached |
| **COA** | Handle order with no COAs | ⏳ TODO | Should send email without attachments |
| **Manifest** | Manifest returns stub=true | ⏳ TODO | Should not send email |
| **Email Log** | Verify status='sent' written for success | ⏳ TODO | |
| **Email Log** | Verify status='failed' on error | ⏳ TODO | |
| **Email Log** | Verify dry_run status | ⏳ TODO | |
| **Error Handling** | Missing GMAIL credentials | ⏳ TODO | Should fail fast with clear error |
| **Error Handling** | Invalid order_id | ⏳ TODO | Should return 400 or 404 |
| **Edge Cases** | Empty recipient email | ⏳ TODO | Should fallback or error |
| **Edge Cases** | Invoice with 100+ line items | ⏳ TODO | Currently truncates silently (BUG) |

---

## 6. Blockers Before Production

1. ✋ **CRITICAL**: Line item overflow (1.1) — invoices silently drop items
2. ✋ **HIGH**: Missing env var validation (2.1) — vague error messages
3. ✋ **HIGH**: Silent COA attachment failures (1.2) — compliance risk

**Recommendation**: File issues for Builder to address before merging.

---

## 7. Build Validation Summary

- **Build Status**: ✅ PASSING
- **TypeScript**: ✅ No type errors
- **Exports**: ✅ sendDocument, generateTripPlanPDF properly exported
- **Dependencies**: ✅ pdf-lib, nodemailer, @supabase/supabase-js present
- **Edge Function**: ✅ Syntax valid, Deno imports correct

---

**QA Validation Date**: 2026-04-04
**Next Steps**: File issues for critical/high findings; await Builder response before merging to production.
